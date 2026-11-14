// Boxes use normalized coordinates on the unmodified original paper figures.
export const locations={
  decoder:{label:'Decoder · Masked Multi-Head Attention',box:[.553,.568,.249,.096],input:'Output Embedding + Positional Encoding（更高层则来自上一层 Decoder）',output:'多头拼接与输出投影 → Add & Norm → Cross-attention',meaning:'从已经可见的前缀中读取信息。当前带因果掩码的数值实验，固定对应这个框。'},
  encoder:{label:'Encoder · Multi-Head Attention',box:[.197,.591,.249,.075],input:'Input Embedding + Positional Encoding（更高层则来自上一层 Encoder）',output:'多头拼接与输出投影 → Add & Norm → Feed Forward',meaning:'输入序列内部交换信息，通常可以双向读取。关闭实验掩码能说明可见范围变化，但不等于运行完整 Encoder。'},
  cross:{label:'Decoder · 中间的 Multi-Head Attention',box:[.553,.402,.249,.075],input:'Q 来自 Decoder 的下方 Add & Norm；K/V 来自 Encoder 最后一层输出',output:'多头拼接与输出投影 → Add & Norm → Feed Forward',meaning:'Decoder 带着当前需要，在 Encoder 的表示中查找和读取；左右两条输入路径在这里会合。'}
};
export const stages=[
  {label:'MatMul · 匹配',formula:'QKᵀ',box:[.025,.728,.68,.11],page:'score'},
  {label:'Scale · 缩放',formula:'÷ √d_k',box:[.12,.559,.50,.11],page:'score'},
  {label:'Mask · 可见范围',formula:'未来分数 → −∞',box:[.002,.395,.746,.112],page:'mask'},
  {label:'SoftMax · 权重',formula:'A = softmax(s + M)',box:[.025,.238,.68,.111],page:'weights'},
  {label:'MatMul · 汇总',formula:'O = AV',box:[.272,.071,.725,.11],page:'values'}
];
export const pageSteps={purpose:null,roles:null,projection:'projection',score:0,mask:2,weights:3,values:4,shapes:null,architecture:null,lab:0,check:null};
let mapOpen=typeof window!=='undefined'&&window.innerWidth>980;
let innerOpen=false;
let comparisonLocation='encoder';
const ns='http://www.w3.org/2000/svg';
function figure(file,alt,box,highlight=true){
  const frame=document.createElement('div');frame.className='paper-figure';
  const img=document.createElement('img');img.src='assets/'+file+'.png';img.alt=alt;frame.append(img);
  const overlay=document.createElementNS(ns,'svg');overlay.setAttribute('viewBox','0 0 100 100');overlay.setAttribute('preserveAspectRatio','none');overlay.setAttribute('aria-hidden','true');
  const rect=document.createElementNS(ns,'rect');rect.setAttribute('vector-effect','non-scaling-stroke');overlay.append(rect);frame.append(overlay);
  const setBox=value=>{overlay.toggleAttribute('hidden',!value);if(value)['x','y','width','height'].forEach((key,i)=>rect.setAttribute(key,value[i]*100));};
  setBox(highlight?box:null);return {frame,setBox};
}
export function renderArchitecture(host,slideId){
  const step=pageSteps[slideId];let location=slideId==='architecture'?comparisonLocation:'decoder';
  host.innerHTML='<p class="eyebrow">原论文 / 架构导航</p><h2 id="architecture-position"></h2><p id="architecture-step" class="architecture-step" aria-live="polite"></p><details class="architecture-map"><summary>在原论文主图中定位（Figure 1）</summary><div id="architecture-main"></div><div id="architecture-choices" class="architecture-choices"></div><p id="architecture-meaning"></p><dl><dt>从哪里来</dt><dd id="architecture-input"></dd><dt>往哪里去</dt><dd id="architecture-output"></dd></dl><details id="architecture-inner"><summary>进入红框内部：原论文 Figure 2</summary><div id="architecture-detail"></div><p id="architecture-detail-note"></p></details><p class="architecture-boundary">单头 O 还需多头拼接与输出投影，才到达 Figure 1 大框的出口。主图 N× 表示层数；本讲公式 N 表示位置数。</p><p class="paper-credit">Vaswani et al., Attention Is All You Need (2017), Figures 1–2；红框为本讲添加。<a href="https://arxiv.org/html/1706.03762v7#S3" target="_blank" rel="noopener">原论文 ↗</a> · <a href="assets/transformer-figure1.png" target="_blank" rel="noopener">主图大图 ↗</a></p></details>';
  const $=id=>host.querySelector('#'+id),map=host.querySelector('.architecture-map');map.open=mapOpen;map.ontoggle=()=>{mapOpen=map.open;};
  const main=figure('transformer-figure1','Transformer 原论文 Figure 1：左侧 Encoder，右侧 Decoder；红框标注当前 Attention 模块。',locations[location].box);$('architecture-main').append(main.frame);
  const projected=step==='projection';
  const detail=figure(projected?'multihead-figure2':'attention-figure2',projected?'原论文 Figure 2 右图：三个 Linear 投影与多个注意力头。':'原论文 Figure 2 左图：自下向上是 MatMul、Scale、Mask、SoftMax、MatMul。',projected?[.005,.499,.91,.146]:Number.isInteger(step)?stages[step].box:null);
  $('architecture-detail').append(detail.frame);$('architecture-inner').open=innerOpen;$('architecture-inner').ontoggle=()=>{innerOpen=$('architecture-inner').open;};
  $('architecture-detail-note').textContent=projected?'原图右侧三个底部 Linear 对应 W_Q/W_K/W_V。注意原图底部 V/K/Q 是投影前的来源；本讲 Q=XW_Q 等指投影后的单头向量。原图从左到右是 V、K、Q，并非 Q、K、V。':'从下往上看：先 QKᵀ，再缩放、掩码、softmax，最后用右侧直达的 V 做加权和。这里的 SoftMax 分配来源位置权重，不是 Figure 1 顶部的词表概率。';
  function locate(){const data=locations[location];main.setBox(data.box);$('architecture-position').textContent=data.label;$('architecture-meaning').textContent=data.meaning;$('architecture-input').textContent=data.input;$('architecture-output').textContent=data.output;host.dataset.location=location;
    host.querySelectorAll('#architecture-choices button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.location===location)));
  }
  if(slideId==='architecture')Object.entries(locations).forEach(([key,value])=>{const b=document.createElement('button');b.textContent=key==='encoder'?'Encoder Self':key==='decoder'?'Decoder Self':'Cross';b.dataset.location=key;b.setAttribute('aria-label','定位 '+value.label);b.onclick=()=>{location=key;comparisonLocation=key;locate();};$('architecture-choices').append(b);});
  const setStep=value=>{host.dataset.step=String(value??'overview');
    $('architecture-step').textContent=value==='projection'?'Figure 1 大框 → Figure 2 右图底部 Linear 投影':Number.isInteger(value)?'Figure 1 大框内部 → Figure 2 左图 → '+stages[value].label+'：'+stages[value].formula:'Figure 1 大框 → Figure 2 内部的单头信息汇总';
    if(!projected)detail.setBox(Number.isInteger(value)?stages[value].box:null);
  };
  locate();setStep(step);host.setStep=setStep;
  if(slideId==='score'){$('architecture-step').textContent+=' → Scale · ÷ √d_k';detail.setBox([.025,.559,.68,.28]);}
}
export function locateLabStep(phase){
  const host=document.getElementById('architecture');if(host?.setStep)host.setStep(phase);
}
