import {attention,fixture} from './math.mjs';
import {renderDiagram} from './visuals.mjs';
let query=2,q=[1,1],causal=true,phase=0;
const formulas=['s_j = qᵢ · kⱼ','sⱼ ← sⱼ / √d_k','sⱼ ← −∞（若 j > i 且开启因果掩码）','aᵢ = softmax(s)','oᵢ = Σⱼ aᵢⱼ vⱼ'];
const phases=['匹配：逐个点乘','缩放：保持分数尺度','可见范围：屏蔽未来','分配：得到权重','读取：汇总 V'];
export function renderLab(host){
  const root=document.createElement('div');root.className='lab';
  root.innerHTML='<section class="lab-controls"><p class="muted">三位置、二维、单头教学数据；不训练模型。</p><label>选一个 query 位置<select id="lab-query" aria-label="选择 query 位置"><option value="0">位置 1</option><option value="1">位置 2</option><option value="2">位置 3</option></select></label><label>q 的第 1 分量 <output id="q0-value"></output><input id="q0" aria-label="query 第 1 分量" type="range" min="-2" max="2" step="0.1"></label><label>q 的第 2 分量 <output id="q1-value"></output><input id="q1" aria-label="query 第 2 分量" type="range" min="-2" max="2" step="0.1"></label><label><input id="lab-mask" type="checkbox"> 因果掩码：只读当前位置及之前</label><div class="lab-buttons"><button id="lab-back">← 上一小步</button><button id="lab-next" class="primary">下一小步 →</button><button id="lab-reset">重置</button></div><p id="lab-position" aria-live="polite"></p><div id="lab-formulas"></div></section><section><div id="lab-visual"></div><pre id="lab-readout" class="lab-readout" aria-live="polite"></pre><p class="muted">K=[[1,0],[0,1],[1,1]]<br>V=[[2,0],[0,2],[2,2]]<br>改动 q 会重新计算；前后小步沿用相同输入。</p></section>';
  host.replaceChildren(root);const $=id=>root.querySelector('#'+id);
  formulas.forEach((s,i)=>{
    const p=document.createElement('p');p.className='lab-formula';p.dataset.phase=i;const term=document.createElement('span');term.textContent=s;p.append(term);
    const brace=document.createElementNS('http://www.w3.org/2000/svg','svg');brace.setAttribute('viewBox','0 0 200 20');brace.setAttribute('preserveAspectRatio','none');brace.setAttribute('aria-hidden','true');
    const path=document.createElementNS(brace.namespaceURI,'path');path.setAttribute('d','M1 1 C1 10 5 14 20 14 H80 C94 14 96 16 100 19 C104 16 106 14 120 14 H180 C195 14 199 10 199 1');brace.append(path);p.append(brace);$('lab-formulas').append(p);
  });
  $('lab-query').onchange=()=>{query=Number($('lab-query').value);q=[...fixture.Q[query]];phase=0;paint();};
  [0,1].forEach(d=>{$('q'+d).oninput=()=>{q[d]=Number($('q'+d).value);paint();};});
  $('lab-mask').onchange=()=>{causal=$('lab-mask').checked;paint();};
  $('lab-back').onclick=()=>{phase=Math.max(0,phase-1);paint();};$('lab-next').onclick=()=>{phase=Math.min(4,phase+1);paint();};
  $('lab-reset').onclick=()=>{query=2;q=[1,1];causal=true;phase=0;paint();};
  const fmt=x=>Number.isFinite(x)?x.toFixed(6):'−∞',vec=a=>'['+a.map(fmt).join(', ')+']';
  function paint(){
    const Q=fixture.Q.map(row=>[...row]);Q[query]=[...q];const t=attention(Q,fixture.K,fixture.V,causal);
    $('lab-query').value=query;$('lab-mask').checked=causal;
    [0,1].forEach(d=>{$('q'+d).value=q[d];$('q'+d+'-value').textContent=q[d].toFixed(1);});
    $('lab-position').textContent=`第 ${phase+1} / 5 小步 · ${phases[phase]}`;$('lab-back').disabled=phase===0;$('lab-next').disabled=phase===4;
    root.querySelectorAll('.lab-formula').forEach(p=>p.classList.toggle('active',Number(p.dataset.phase)===phase));
    renderDiagram(['score','score','mask','weights','values'][phase],$('lab-visual'),t,{query});
    const v=[`q = ${vec(q)}\n点积 = ${vec(t.dot[query])}`,`点积 / √2 = ${vec(t.scores[query])}`,`掩码后分数 = ${vec(t.masked[query])}`,`A 的第 ${query+1} 行 = ${vec(t.A[query])}`,`贡献 1 = ${vec(t.contributions[query][0])}\n贡献 2 = ${vec(t.contributions[query][1])}\n贡献 3 = ${vec(t.contributions[query][2])}\nO 的第 ${query+1} 行 = ${vec(t.O[query])}`];
    $('lab-readout').textContent=v[phase];$('lab-readout').dataset.weights=JSON.stringify(t.A[query]);$('lab-readout').dataset.output=JSON.stringify(t.O[query]);
  }
  paint();
}
export function renderQuiz(host){
  const root=document.createElement('div');root.className='quiz';const feedback=document.createElement('p');feedback.setAttribute('aria-live','polite');
  [['权重 A 会变，但汇总结果 O 一定不变',false,'A 只依赖 Q、K 和掩码。V 不参与匹配分数。'],['权重 A 不变；汇总结果 O 可能改变',true,'对。先由 Q、K 决定怎么分配，再用这些权重读取 V。若改动只发生在零权重位置，当前行的 O 也可能不变。'],['Q、K、V 是三段输入文字',false,'它们是向量矩阵。在 self-attention 中，同一组位置表示经过三组不同的学习投影产生它们。']].forEach(([label,ok,why])=>{
    const b=document.createElement('button');b.textContent=label;b.onclick=()=>{root.querySelectorAll('button').forEach(x=>{x.classList.remove('correct','incorrect');x.setAttribute('aria-pressed','false');});b.classList.add(ok?'correct':'incorrect');b.setAttribute('aria-pressed','true');feedback.textContent=why;};root.append(b);
  });root.append(feedback);host.replaceChildren(root);
}
