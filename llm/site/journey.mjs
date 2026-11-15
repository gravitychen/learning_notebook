export const tokens=['I','like','cats'];
export const embedding=[[.2,-.4,.7,.1],[.6,.1,-.2,.5],[-.3,.8,.4,-.1]];
export const position=tokens.map((_,p)=>[Math.sin(p),Math.cos(p),Math.sin(p/100),Math.cos(p/100)]);
export const positioned=embedding.map((row,i)=>row.map((v,d)=>v+position[i][d]));
export const generationFrames=[
  {prefix:['起始'],candidates:[['我',.8],['猫',.12],['你',.08]]},
  {prefix:['起始','我'],candidates:[['喜欢',.76],['看见',.14],['是',.1]]},
  {prefix:['起始','我','喜欢'],candidates:[['猫',.84],['狗',.1],['书',.06]]},
  {prefix:['起始','我','喜欢','猫'],candidates:[['结束',.9],['和',.07],['也',.03]]}
];
export const journeyLocations={
  'journey-task':{label:'完整 Encoder → Decoder',box:null,input:'左下角 Inputs：I like cats',output:'右上方 Output Probabilities；选择 token 后逐步组成中文',meaning:'先知道整张图要完成什么，再沿着特征走。左边处理原文，右边根据原文和已有输出继续生成。'},
  'journey-embedding':{label:'左下角 · Input Embedding',box:[.198,.808,.247,.071],input:'分好的 token，先对应到词表 ID',output:'每个 token 一行数字；本例是 3 行 × 4 个特征',meaning:'ID 用来查表，Embedding 把离散编号变成网络可以处理的数字向量。'},
  'journey-position':{label:'左侧 · Positional Encoding 与加号',box:[.177,.738,.32,.067],input:'token 向量 + 对应位置的向量',output:'仍是 3 行 × 4 个特征，接着送入 Encoder',meaning:'用相加把位置信息加入特征；序列长度和特征宽度都不变。'},
  'journey-context':{label:'左侧 · Multi-Head Attention',box:[.197,.591,.249,.075],input:'带位置的特征（更高层则是前一层的输出）',output:'每个位置汇集到的上下文信息，继续进入 Add & Norm',meaning:'让输入各位置相互读取信息。本页只看信息流，QKV 计算留到细节讲义。'},
  'journey-encoder':{label:'左侧 · Encoder 层与横向连线',box:[.107,.371,.397,.355],input:'Attention 输出，连同原来的特征',output:'Encoder 最后一层的整串向量，沿横线送入 Decoder',meaning:'Attention、残差与归一化、Feed Forward 反复加工特征。原论文重复 6 层，N× 表示层的重复次数。'},
  'journey-prefix':{label:'右下角 · 已有输出进入 Decoder',box:[.552,.568,.25,.311],input:'起始标记，以及到目前为止已经生成的 token',output:'只结合可见前缀的 Decoder 特征，向上进入 Cross-attention',meaning:'Embedding 与位置信息之后，通过 Masked Self-Attention 读取前缀；不能偷看未来答案。'},
  'journey-cross':{label:'右侧中部 · Multi-Head Attention',box:[.553,.402,.249,.075],input:'下方 Decoder 的表示，以及左侧 Encoder 的最终输出',output:'结合原文信息后的 Decoder 特征，再经过 Add & Norm 与 Feed Forward 等模块',meaning:'这块 Cross-attention 是两条信息路径的会合处，让生成过程能够参考输入原文。'},
  'journey-output':{label:'右上角 · Linear → Softmax',box:[.552,.088,.25,.105],input:'Decoder 经过其余子层和所有层后的最终特征',output:'词表上各个下一 token 的分数与概率',meaning:'Linear 将特征转换成词表分数，Softmax 将分数转换为概率。这和 Attention 内部的来源权重不同。'},
  'journey-generate':{label:'右侧 · 选出 token，再回到右下角',box:[.526,.08,.357,.919],input:'Encoder 表示保持供读取；Decoder 接收增长的前缀',output:'我 → 喜欢 → 猫 → 结束',meaning:'每次选择一个 token，把它接到前缀后，再计算下一次预测。图中的 Outputs (shifted right) 是已有输出这一侧的入口。'}
};
const slides=[
  ['task','英文怎么一步步变成中文？','跟着一句 I like cats，看看文字怎样变成特征，最后生成“我喜欢猫”。','左边处理原文；右边参考原文，逐步生成中文。','我们要理解什么？','先建立一条完整路线，不要求现在理解 Attention 的公式。原论文是 Encoder–Decoder 架构；这里演示一次生成过程，不涉及训练更新参数。'],
  ['embedding','文字怎样变成一行行数字？','把文字拆成模型的文字小块（token），为每块查编号，再取出一行数字。','一个 token 一行向量；这里用 I / like / cats 示意，真实切分由分词器决定。','数字表示什么？','token 可以是词、词的一部分或其他片段。词表 ID 是查表编号，不是特征本身。向量是一组学习得到的数字；不把某一列预先解释成“动物”或“动作”。本页 ID 和 Embedding 数值是手选示例，切词也只是示意。'],
  ['position','怎样把“第几个位置”告诉模型？','给每个 token 的向量，加上它所在位置的向量。','内容向量 + 位置向量 → 仍然是同样大小的一张数字表。','希望达到什么效果？','后续模块能利用内容和位置信息，区分顺序。本页四维位置向量按原论文正弦、余弦方式实际计算；为便于阅读，显示保留两位小数。无需现在记住具体公式。'],
  ['context','每个词怎样结合上下文？','Attention 让一个位置读取其他位置的信息，再为它产生新的特征。','从“各自的向量”，走向“结合上下文的向量”。','图上的箭头表示什么？','选择一个接收位置，连线表示它可以从哪些位置读取信息。原论文 Encoder 的输入 self-attention 可双向读取。这里的连线只表示信息可达，不表示训练模型的真实注意力权重。'],
  ['encoder','Encoder 最后交给 Decoder 什么？','读过上下文的特征，还要经过相加、归一化和 Feed Forward，再重复多层。','Encoder 输出仍是一串数字向量，此时还没有生成中文。','如何连接到主图？','Attention 输出先与残差相加并归一化，再经逐位置的 Feed Forward，然后再次相加并归一化。原论文堆叠 6 层；最后保留每个输入位置的表示，沿横向连线供 Decoder 读取。'],
  ['prefix','Decoder 先知道已经生成了什么','刚开始只有起始标记；之后每轮都带上已经生成的前缀。','先读已有内容，再预测下一个 token；未来答案不能提前读。','Masked 的作用是什么？','它限制每个位置只能读取自身及之前的位置。在生成时未来内容尚不存在；训练时即使整段目标文本一起计算，也用掩码阻止偷看后面的答案。'],
  ['cross','生成中文时，怎样参考英文原文？','Decoder 的当前特征与 Encoder 的原文表示，在 Cross-attention 中会合。','已有中文前缀的信息 + 可读取的英文表示 → 继续加工 Decoder 特征。','两条输入分别从哪里来？','一条来自 Decoder 下方的 Masked Self-Attention 与 Add & Norm，另一条来自 Encoder 最后一层。前者决定当前怎样读取，后者提供原文信息。接着还有残差、归一化、Feed Forward 和其他 Decoder 层。'],
  ['output','数字特征怎样变回一个 token？','Decoder 的最终特征先变成词表分数，再变成候选概率，最后按策略选出一个 token。','特征 → Linear 分数 → Softmax 概率 → 选择 token。','Softmax 本身会输出文字吗？','不会。它输出概率；选择步骤才确定 token，再由词表解码为文字。此处仅画少量候选并使用固定教学概率，真实词表更大。本页顶层 Softmax 与 Attention 内部 softmax 的作用对象不同。'],
  ['generate','点一下，生成下一个 token','Encoder 的英文表示留在左边；右边每生成一个 token，就把它加入前缀继续预测。','从起始标记开始，走到结束标记；每一轮都参考原文和已有前缀。','这个实验计算了什么？','这是固定候选概率驱动的生成流程示意，不运行真实翻译模型。为方便观察，每次选择当前最高概率候选。真实系统可使用不同选择策略，结束标记一般不显示为正文。']
].map(([id,title,lead,caption,heading,note],i)=>({id:'journey-'+id,kicker:String(i+1).padStart(2,'0')+' / 跟着一句话走',title,lead,caption,visual:'journey',equation:'',notes:[[heading,note]],derivation:'当前位置：'+journeyLocations['journey-'+id].label+'。'+journeyLocations['journey-'+id].meaning}));
export const introLesson={node:'A1-1',title:'Transformer：从文字到输出',subtitle:'先走完一遍，再深入 QKV',source:{title:'Attention Is All You Need · Figure 1 / §3',url:'https://arxiv.org/html/1706.03762v7#S3'},notation:'本讲只建立流程：token 是词表中的离散单位；向量是一组数字；特征表的一行对应一个位置。四维和三行是教学尺寸，不是原论文模型尺寸。',slides};
let embeddingPhase=0,selectedToken=0,receiver=2,generation=0;
export function renderJourney(host,id){
  const kind=id.replace('journey-',''),root=document.createElement('div');root.className='journey-visual journey-'+kind;
  const add=(tag,text,cls,parent=root)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;parent.append(el);return el;};
  const card=(parent,label,text,cls='')=>{const el=add('div',undefined,'journey-card '+cls,parent);add('span',label,'journey-label',el);add('div',text,'journey-big',el);return el;};
  const arrow=parent=>add('div','↓','journey-arrow',parent);
  const table=(parent,labels,data)=>{const t=add('div',undefined,'feature-table',parent);labels.forEach((label,i)=>{const row=add('div',undefined,'feature-row'+(i===selectedToken?' selected':''),t);add('span',label,'feature-label',row);const cells=add('div',undefined,'feature-cells',row);for(let d=0;d<4;d++){const v=data?.[i]?.[d];const c=add('span',v===undefined?'·':v.toFixed(2),'feature-cell',cells);if(v!==undefined)c.classList.add(v<0?'negative':'positive');}});return t;};
  const note=text=>add('p',text,'journey-note');
  const flow=()=>add('div',undefined,'journey-flow');
  if(kind==='task'){
    const f=flow();card(f,'输入原文','I like cats');arrow(f);card(f,'Transformer','Encoder → Decoder','model');arrow(f);card(f,'逐步输出','我 → 喜欢 → 猫','result');
    note('这一讲的问题：中间的特征，怎样一步步变化？');
  }else if(kind==='embedding'){
    const tabs=add('div',undefined,'journey-buttons');tokens.forEach((token,i)=>{const b=add('button',token,'',tabs);b.setAttribute('aria-pressed',String(i===selectedToken));b.onclick=()=>{selectedToken=i;renderJourney(host,id);};});
    const f=flow();card(f,'文字中的 token',tokens[selectedToken]);
    if(embeddingPhase>=1){arrow(f);card(f,'教学词表 ID',[17,42,9][selectedToken]+'（查表编号）');}
    if(embeddingPhase>=2){arrow(f);const c=card(f,'查 Embedding 表：取出一行','');table(c,[tokens[selectedToken]],[embedding[selectedToken]]);}
    const controls=add('div',undefined,'journey-buttons');const b=add('button',['下一小步：查词表 ID','下一小步：取出向量','从文字重新看'][embeddingPhase],'primary',controls);b.id='embedding-next';b.onclick=()=>{embeddingPhase=(embeddingPhase+1)%3;renderJourney(host,id);host.querySelector('#embedding-next').focus({preventScroll:true});};
    note('第 '+(embeddingPhase+1)+' / 3 小步 · ID 和四维向量为手选教学数据。');
  }else if(kind==='position'){
    const grid=add('div',undefined,'journey-grid');const a=card(grid,'内容向量','');table(a,tokens,embedding);const p=card(grid,'对应位置的向量','');table(p,['位置 1','位置 2','位置 3'],position);
    const out=card(root,'逐项相加后的输入特征','3 行 × 4 个特征','result');table(out,tokens,positioned);note('同一行、同一列相加。颜色区分正负，不给特征列指定语义。');
  }else if(kind==='context'){
    const controls=add('div',undefined,'journey-buttons');tokens.forEach((token,i)=>{const b=add('button','看 '+token+' 这一行','',controls);b.setAttribute('aria-pressed',String(i===receiver));b.onclick=()=>{receiver=i;renderJourney(host,id);};});
    const f=flow(),source=card(f,'三个位置都可以作为信息来源','I　 like　 cats');table(source,tokens,positioned);arrow(f);card(f,'Attention：从这些位置汇集信息','→ '+tokens[receiver]+' 位置','model');arrow(f);const out=card(f,'结合上下文后的向量','');table(out,[tokens[receiver]+' 的新特征']);note('点上方按钮切换接收位置。圆点代表尚未展开的特征数字，不是真实模型的计算值。');
  }else if(kind==='encoder'){
    const f=flow();['Attention：各位置交换信息','Add & Norm：加回原特征，再归一化','Feed Forward：逐位置加工特征','Add & Norm：再相加、归一化'].forEach((s,i)=>{if(i)arrow(f);card(f,'一层 Encoder 内部',s);});
    arrow(f);const out=card(f,'原论文重复 6 层之后','Encoder 输出','result');table(out,['I 的表示','like 的表示','cats 的表示']);note('仍然是三行向量：保留输入位置，不是在这里选出中文。主图 N× 表示层数。');
  }else if(kind==='prefix'){
    const f=flow();card(f,'第一轮已有的前缀','[起始]');arrow(f);card(f,'Output Embedding ＋ 位置信息','数字向量');arrow(f);card(f,'Masked Self-Attention','只读已经可见的内容','model');
    const grid=add('div',undefined,'journey-grid');card(grid,'后续某一轮：可以读','起始　我　喜欢','result');card(grid,'尚未生成：不能偷看','猫　结束','future');note('这里“猫”只用于标出将来的目标，并未作为当前可见输入送入 Decoder。');
  }else if(kind==='cross'){
    const grid=add('div',undefined,'journey-grid');const left=card(grid,'Encoder 交出的原文表示','I　 like　 cats','memory');table(left,['I 的表示','like 的表示','cats 的表示']);const right=card(grid,'Decoder 当前特征','已经结合可见前缀');table(right,['当前的位置']);
    arrow(root);card(root,'Cross-attention：两条输入在这里会合','Decoder 读取原文信息','model');arrow(root);card(root,'继续经过后续子层与 Decoder 层','结合原文的 Decoder 特征','result');
  }else if(kind==='output'){
    const f=flow();const c=card(f,'Decoder 最终特征','');table(c,['用于预测的向量']);arrow(f);card(f,'Linear：给词表里的候选打分','我　猫　你');arrow(f);const dist=card(f,'Softmax：分数转为概率','');generationFrames[0].candidates.forEach(([word,p])=>probability(dist,word,p));arrow(f);card(f,'选择步骤：本例取最高概率','我','result');note('这里只显示三个教学候选。选出“我”以后，下一轮的前缀会包含它。');
  }else if(kind==='generate'){
    const grid=add('div',undefined,'journey-grid');const memory=card(grid,'保持供读取的 Encoder 表示','I　 like　 cats','memory');table(memory,['I 的表示','like 的表示','cats 的表示']);
    const current=card(grid,'Decoder：当前已有前缀',generation<4?generationFrames[generation].prefix.join('　'):'起始　我　喜欢　猫','model');
    if(generation<4){add('p','结合原文与前缀 → 预测下一个 token','journey-note',current);generationFrames[generation].candidates.forEach(([word,p])=>probability(current,word,p));}else add('p','已选到结束标记，停止继续生成。','journey-note',current);
    card(root,'已经生成的正文',['我','喜欢','猫'].slice(0,Math.min(generation,3)).join('')||'等待第一个 token','result');
    const controls=add('div',undefined,'journey-buttons');const next=add('button',generation<4?'选最高概率 → '+generationFrames[generation].candidates[0][0]:'已完成','primary',controls);next.id='generate-next';next.disabled=generation===4;next.onclick=()=>{generation=Math.min(4,generation+1);renderJourney(host,id);host.querySelector(generation<4?'#generate-next':'#generate-reset').focus({preventScroll:true});};const reset=add('button','从起始重新看','',controls);reset.id='generate-reset';reset.onclick=()=>{generation=0;renderJourney(host,id);host.querySelector('#generate-next').focus({preventScroll:true});};root.dataset.generation=generation;note('固定教学概率驱动的流程示意；不运行真实翻译网络，不更新模型权重。');
  }
  function probability(parent,word,p){const row=add('div',undefined,'candidate-row',parent);add('span',word,'',row);const track=add('span',undefined,'candidate-track',row);const bar=add('span',undefined,'candidate-bar',track);bar.style.width=(p*100)+'%';add('span',(p*100).toFixed(0)+'%','',row);}
  host.replaceChildren(root);
}
