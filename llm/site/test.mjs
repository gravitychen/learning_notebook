import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {attention,fixture} from './math.mjs';
import {lesson,catalog} from './course.mjs';
import {progress} from './worker.mjs';
import {locations,stages,pageSteps} from './architecture.mjs';
for(const slide of lesson.slides)assert.ok(Object.hasOwn(pageSteps,slide.id),'Missing architecture mapping: '+slide.id);
for(const box of [...Object.values(locations).map(x=>x.box),...stages.map(x=>x.box)]){assert.equal(box.length,4);assert.ok(box.every(v=>v>=0&&v<=1));assert.ok(box[0]+box[2]<=1&&box[1]+box[3]<=1);}
assert.equal(stages.length,5);assert.deepEqual(['mask','weights','values'].map(id=>pageSteps[id]),[2,3,4]);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
const t=attention();
assert.deepEqual(t.dot[2],[1,1,2]);
assert.deepEqual(t.A[0],[1,0,0]);
assert.deepEqual(t.O[0],[2,0]);
t.A.forEach((row,i)=>{near(row.reduce((a,b)=>a+b,0),1);row.forEach((v,j)=>{assert.ok(v>=0);if(j>i)assert.equal(v,0);});});
const denom=2+Math.exp(1/Math.sqrt(2));near(t.A[2][0],1/denom);near(t.O[2][0],2*(1-1/denom));
const changed=attention(fixture.Q,fixture.K,[[9,9],[0,2],[2,2]]);
assert.deepEqual(changed.A,t.A);assert.notDeepEqual(changed.O,t.O);
const unmasked=attention(fixture.Q,fixture.K,fixture.V,false);assert.ok(unmasked.A[0][2]>0);
const cross=attention([[1,1]],fixture.K,fixture.V,false);assert.equal(cross.O.length,1);assert.equal(cross.A[0].length,3);
const large=attention([[1000,1000]],[[1000,1000],[999,999]],[[1],[2]],false);assert.ok(large.O.flat().every(Number.isFinite));
for(const args of [[[],fixture.K,fixture.V],[[[1,2]],fixture.K,fixture.V],[[[NaN,1]],fixture.K,fixture.V,false],[[[1]],fixture.K,fixture.V,false],[fixture.Q,fixture.K,[[1]],false]])assert.throws(()=>attention(...args));
assert.equal(catalog.length,19);assert.equal(catalog.flatMap(m=>m.nodes).length,70);assert.equal(lesson.node,'A1-2');assert.equal(new Set(lesson.slides.map(s=>s.id)).size,lesson.slides.length);
// Execute the actual displayed snippets, not a separate Python reconstruction.
for(const slide of lesson.slides.filter(s=>s.python)){
  const check=slide.id==='projection'?'':`\nimport json\nassert np.allclose(A, np.array(${JSON.stringify(t.A)}), atol=1e-12)\nassert np.allclose(O, np.array(${JSON.stringify(t.O)}), atol=1e-12)`;
  const result=spawnSync('python',['-c',slide.python+check],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
}
const entries=new Map();
const env={BUCKET:{list:async({prefix})=>({objects:[...entries.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),get:async key=>entries.has(key)?{json:async()=>JSON.parse(entries.get(key))}:null,put:async(key,value)=>entries.set(key,value)}};
const req=(user,method='GET',data,headers={})=>new Request('https://lesson.test/api/progress',{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),Origin:'https://lesson.test','Content-Type':'application/json',...headers},...(method==='PUT'?{body:typeof data==='string'?data:JSON.stringify(data)}:{})});
assert.equal((await progress(req(null),env)).status,401);
assert.equal((await progress(req('alice'),{})).status,503);
assert.equal((await progress(req('alice','PUT',{id:'A1-2',status:'partial'}),env)).status,200);
const alice=await (await progress(req('alice'),env)).json(),bob=await (await progress(req('bob'),env)).json();
assert.equal(alice.records['A1-2'].status,'partial');assert.deepEqual(bob.records,{});assert.notEqual(alice.scope,bob.scope);
for(const [request,status] of [[req('alice','PUT',{id:'A2-2',status:'known'}),400],[req('alice','PUT',{id:'A1-2',status:'known'},{Origin:'https://evil.test'}),403],[req('alice','PUT','{'),400],[req('alice','PUT','x'.repeat(513)),413],[req('alice','PUT','x',{'Content-Type':'text/plain'}),415],[req('alice','POST'),405]])assert.equal((await progress(request,env)).status,status);
console.log('Attention math, masks, shapes, displayed Python snippets, catalog and authenticated storage checks passed.');
