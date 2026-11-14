export const fixture = {
  Q:[[1,0],[0,1],[1,1]],
  K:[[1,0],[0,1],[1,1]],
  V:[[2,0],[0,2],[2,2]]
};
export function attention(Q=fixture.Q,K=fixture.K,V=fixture.V,causal=true) {
  const matrix = (m,name) => {
    if(!Array.isArray(m)||!m.length||!Array.isArray(m[0])||!m[0].length||
      !m.every(row=>Array.isArray(row)&&row.length===m[0].length&&row.every(Number.isFinite)))
      throw new Error(name+' must be a nonempty finite rectangular matrix');
  };
  matrix(Q,'Q');matrix(K,'K');matrix(V,'V');
  if(Q[0].length!==K[0].length||K.length!==V.length)throw new Error('Incompatible Q/K/V dimensions');
  if(typeof causal!=='boolean'||(causal&&Q.length!==K.length))throw new Error('Causal example requires aligned self-attention positions');
  const dot=Q.map(q=>K.map(k=>q.reduce((sum,x,d)=>sum+x*k[d],0)));
  const scores=dot.map(row=>row.map(x=>x/Math.sqrt(Q[0].length)));
  if(!scores.flat().every(Number.isFinite))throw new Error('Attention scores overflow');
  const masked=scores.map((row,i)=>row.map((x,j)=>causal&&j>i?-Infinity:x));
  const A=masked.map(row=>{const max=Math.max(...row),e=row.map(x=>Math.exp(x-max)),sum=e.reduce((a,b)=>a+b,0);return e.map(x=>x/sum);});
  const contributions=A.map(row=>row.map((a,j)=>V[j].map(v=>a*v)));
  const O=contributions.map(row=>V[0].map((_,d)=>row.reduce((sum,v)=>sum+v[d],0)));
  if(!O.flat().every(Number.isFinite))throw new Error('Attention output overflow');
  return {Q,K,V,causal,dot,scores,masked,A,contributions,O};
}
