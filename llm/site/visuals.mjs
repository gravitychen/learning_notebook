import { attention } from './math.mjs';
const red='#b72930',green='#4e7458',ink='#333',gray='#777';
export function renderDiagram(kind,host,trace=attention(),options={}) {
  const w=800,h=430,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.classList.add('diagram');
  const add=(tag,attrs={},value)=>{const e=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(value!==undefined)e.textContent=value;svg.append(e);return e;};
  const text=(x,y,s,size=23,color=ink,anchor='middle')=>add('text',{x,y,'font-size':size,fill:color,'text-anchor':anchor},s);
  const line=(x1,y1,x2,y2,color='#ccc',width=2)=>add('line',{x1,y1,x2,y2,stroke:color,'stroke-width':width});
  const box=(x,y,width,height,title,sub='',color='#ddd')=>{add('rect',{x,y,width,height,rx:5,fill:'#fafaf8',stroke:color,'stroke-width':2});text(x+width/2,y+height/2+(sub?-4:8),title,26,color==='#ddd'?ink:color);if(sub)text(x+width/2,y+height/2+29,sub,19,gray);};
  const fmt=x=>Number.isFinite(x)?x.toFixed(3):'−∞';
  const vec=a=>'['+a.map(fmt).join(', ')+']';
  const titles={purpose:'当前位置汇集其他位置的信息',roles:'Q 与 K 匹配，按权重汇总 V',projection:'同一个 X 通过三组学习参数产生 Q、K、V',score:'一行 query 与所有 key 点乘',mask:'因果掩码阻止读取未来位置',weights:'一行注意力权重',values:'按注意力权重汇总信息',shapes:'矩阵形状和转置',architecture:'Self-attention 和 cross-attention 的来源'};
  const title=add('title',{},titles[kind]||'当前注意力数值');svg.setAttribute('aria-label',title.textContent);
  if(window.innerWidth<760){
    svg.setAttribute('viewBox','0 0 560 580');
    if(kind==='roles'){
      box(20,25,240,100,'Q：用什么找','当前查询的匹配特征',red);box(300,25,240,100,'K：如何被找到','各来源的匹配特征',red);
      text(280,185,'匹配 → 权重 A',29,red);line(280,200,280,250,red);
      box(40,270,480,100,'按 A 读取 V','V：各来源实际携带的信息',green);text(280,415,'↓ 加权相加',29,green);box(90,460,380,90,'O：当前 query 的汇总', '',green);
    }else if(kind==='projection'){
      box(100,20,360,85,'X：同一组位置表示');
      ['Q = XW_Q','K = XW_K','V = XW_V'].forEach((s,j)=>{const y=150+j*135;box(100,y,360,85,s,'',j===2?green:red);});
      text(280,560,'不同参数投影，产生不同职责',23,gray);
    }else if(kind==='purpose'){
      [0,1,2].forEach(j=>{const x=15+j*185;box(x,50,160,90,'位置 '+(j+1));line(x+80,145,280,350,j===2?red:green,4);});
      box(70,350,420,100,'位置 3 的新表示','汇集相关位置的信息',red);text(280,525,'先匹配，再读取，再相加',26,gray);
    }else if(kind==='score'){
      const i=options.query??2,q=trace.Q[i];text(280,35,'q'+(i+1)+' = '+vec(q),26,red);
      trace.K.forEach((k,j)=>{const y=110+j*145;box(20,y-30,210,80,'k'+(j+1)+' '+vec(k));text(390,y,'点积 = '+fmt(trace.dot[i][j]),26);text(390,y+42,'÷√2 = '+fmt(trace.scores[i][j]),25,red);});
      text(280,560,'这里还没有汇总 V',25,gray);
    }else if(kind==='mask'){
      text(280,35,'行：谁在读；列：读谁',27,gray);
      for(let j=0;j<3;j++)text(195+j*135,95,'位置 '+(j+1),23);
      for(let i=0;i<3;i++){text(65,185+i*115,'位置 '+(i+1),23);for(let j=0;j<3;j++){const x=135+j*135,y=130+i*115;box(x,y,120,90,fmt(trace.masked[i][j]),'',trace.masked[i][j]===-Infinity?'#ddd':green);}}
      text(280,535,trace.causal?'未来 → −∞ → 权重 0':'已关闭因果掩码',25,red);
    }else if(kind==='shapes'){
      [['X','N × d_model'],['Q、K','N × d_k'],['Kᵀ','d_k × N'],['A','N × N'],['V','N × d_v'],['O = AV','N × d_v']].forEach(([s,d],i)=>box(20+(i%2)*270,25+Math.floor(i/2)*170,250,120,s,d,i===3?red:'#ddd'));
      text(280,560,'位置数与特征数是两条轴',26,gray);
    }else if(kind==='architecture'){
      text(280,35,'Self-attention',30,red);box(25,75,510,100,'同一序列 X → Q、K、V');
      text(280,235,'Cross-attention',30,green);box(25,275,510,90,'Decoder 表示 → Q');box(25,405,510,90,'Encoder 输出 → K、V');text(280,560,'权重表可为 T × S',26,gray);
    }else{
      const i=options.query??2; text(280,35,'query 位置 '+(i+1),28,red);
      trace.A[i].forEach((a,j)=>{const y=105+j*145;text(25,y,'来源 '+(j+1),24,ink,'start');add('rect',{x:155,y:y-27,width:Math.max(1,a*250),height:30,fill:green});text(520,y,fmt(a),24,red,'end');
        if(kind==='values'){text(280,y+40,'V='+vec(trace.V[j]),23);text(280,y+73,'贡献 '+vec(trace.contributions[i][j]),22,gray);}
      });
      text(280,565,kind==='values'?'相加 → O'+(i+1)+' = '+vec(trace.O[i]):'权重相加 = 1',25,green);
    }
    host.replaceChildren(svg);return;
  }
  if(kind==='purpose'){
    const xs=[60,295,530];xs.forEach((x,j)=>{box(x,55,205,85,'位置 '+(j+1),'一行向量 x'+(j+1));line(x+102,143,400,280,j===2?red:'#b8c8bb',5);});
    box(240,280,320,95,'位置 3 的新表示','把相关信息加权汇集',red);
    text(400,415,'先决定读谁、读多少，再汇总内容',24,gray);
  }else if(kind==='roles'){
    box(35,40,260,85,'Q：用什么找','当前查询的匹配特征',red);
    box(505,40,260,85,'K：用什么被找到','每个来源的匹配特征',red);
    line(295,83,505,83,red);text(400,65,'匹配',23,red);
    text(400,180,'↓ 得到每个来源的权重 A',26,red);
    box(35,230,260,95,'V：取回什么','每个来源携带的信息',green);
    text(400,285,'加权 →',26,green);box(505,230,260,95,'O：汇总结果','Σ 权重 × 信息',green);
    text(400,400,'匹配的特征与被汇总的内容，职责不同',24,gray);
  }else if(kind==='projection'){
    box(270,20,260,75,'X：各位置的表示','不是 token ID');
    ['Q = XW_Q','K = XW_K','V = XW_V'].forEach((s,j)=>{const x=30+j*260;line(400,98,x+110,220);text(x+110,177,['W_Q','W_K','W_V'][j],25,j===2?green:red);box(x,230,220,90,s,'不同的学习投影',j===2?green:red);});
    text(400,385,'参数在训练中学习；一次前向计算不更新它们',23,gray);
  }else if(kind==='score'){
    const i=options.query??2,q=trace.Q[i];text(400,38,'选中 query：q'+(i+1)+' = '+vec(q),25,red);
    trace.K.forEach((k,j)=>{const y=100+j*96;box(25,y-35,225,70,'k'+(j+1)+' = '+vec(k));text(525,y,`${q[0]} × ${k[0]} + ${q[1]} × ${k[1]} = ${fmt(trace.dot[i][j])}`,25);text(525,y+32,'÷ √2 = '+fmt(trace.scores[i][j]),22,red);});
    text(400,417,'点积是匹配分数，还不是信息汇总结果',23,gray);
  }else if(kind==='mask'){
    text(400,30,'行 = 谁在读；列 = 信息来自谁',25,gray);
    for(let i=0;i<3;i++)for(let j=0;j<3;j++){const x=205+j*145,y=85+i*90,blocked=trace.causal&&j>i;add('rect',{x,y,width:135,height:78,fill:blocked?'#eee':'#f0f5ee',stroke:'#ddd'});text(x+67,y+46,fmt(trace.masked[i][j]),27,blocked?gray:green);}
    for(let j=0;j<3;j++)text(272+j*145,70,'位置 '+(j+1),21);
    for(let i=0;i<3;i++)text(130,132+i*90,'位置 '+(i+1),21);
    text(400,405,trace.causal?'未来位置置 −∞，softmax 后权重为 0':'关闭掩码：三个位置都可以相互读取',24,red);
  }else if(kind==='shapes'){
    [['X','N × d_model'],['Q、K','N × d_k'],['Kᵀ','d_k × N'],['QKᵀ → A','N × N'],['V','N × d_v'],['O = AV','N × d_v']].forEach(([s,d],i)=>{const x=35+(i%3)*260,y=35+Math.floor(i/3)*170;box(x,y,220,115,s,d,i===3?red:'#ddd');});
    text(400,408,'一行输出对应一个 query；不是词表上的概率',24,gray);
  }else if(kind==='architecture'){
    text(205,40,'Self-attention',30,red);text(595,40,'Cross-attention',30,green);
    box(45,95,320,90,'同一序列 X','Q、K、V 都由 X 投影');
    box(435,95,320,90,'Decoder 当前表示','产生 Q');
    text(205,245,'Encoder：可读全部输入',23);text(205,290,'Decoder：因果读取前缀',23);
    box(435,230,320,90,'Encoder 输出','产生 K、V');
    text(400,395,'Cross-attention：Q 可有 T 行，K/V 可有 S 行',23,gray);
  }else{
    const i=options.query??2,row=trace.A[i];text(400,33,'query 位置 '+(i+1)+' · '+(kind==='values'?'加权汇总 V':'softmax 后的权重 A'),25,red);
    row.forEach((a,j)=>{const x=100+j*245;add('rect',{x,y:230-a*155,width:110,height:Math.max(1,a*155),fill:green});text(x+55,260,'位置 '+(j+1),22);text(x+55,215-a*155,fmt(a),25,red);
      if(kind==='values'){text(x+55,310,'V = '+vec(trace.V[j]),20);text(x+55,345,'贡献 '+vec(trace.contributions[i][j]),18,gray);}
    });
    text(400,405,kind==='values'?'相加 → O'+(i+1)+' = '+vec(trace.O[i]):'三个权重相加 = 1；权重为 0 的位置不贡献信息',23,kind==='values'?green:gray);
  }
  host.replaceChildren(svg);
}
