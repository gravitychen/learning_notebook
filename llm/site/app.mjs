import { lesson, catalog } from './course.mjs';
import { renderDiagram } from './visuals.mjs';
import { renderLab, renderQuiz } from './labs.mjs';
import { renderArchitecture } from './architecture.mjs';
const $ = id => document.getElementById(id);
let page = 0, records = {}, pending = {}, scope = null, syncing = false;
const statuses = ['unjudged','review','learn','partial','known'];
const cacheKey = value => 'llm-notebook-v1:' + value;
function readCache(key) {
  try { const data=JSON.parse(localStorage.getItem(cacheKey(key))||'{}'); return data && typeof data==='object' ? data : {}; } catch { return {}; }
}
function saveCache() {
  try { localStorage.setItem(cacheKey(scope||'local-only'),JSON.stringify({records,pending})); } catch { $('sync-status').textContent='浏览器未允许本机存储；仍会尝试云端同步。'; }
}
function restorePage() {
  const match = new RegExp('^#'+lesson.node+'/(\\d+)$').exec(location.hash);
  page = match ? Math.min(lesson.slides.length-1,Number(match[1])) : 0;
}
function paragraph(host, text, className) {
  const p=document.createElement('p');p.textContent=text;if(className)p.className=className;host.append(p);return p;
}
function renderRecords() {
  const status=records[lesson.node]?.status;
  $('mastery').value=statuses.includes(status)?status:'unjudged';
  $('tree-count').textContent=`19 个主节点 · ${catalog.reduce((n,m)=>n+m.nodes.length,0)} 个目录知识点 · 已生成 1 个 · 当前标记：${$('mastery').selectedOptions[0].textContent}`;
}
function renderPage(scroll = false) {
  const slide=lesson.slides[page];
  $('lesson-id').textContent=lesson.node+' / '+lesson.title;
  $('slide-kicker').textContent=slide.kicker;$('slide-title').textContent=slide.title;$('slide-lead').textContent=slide.lead;
  $('slide-equation').textContent=slide.equation;$('slide-caption').textContent=slide.caption;
  $('slide-topic').textContent='LLM / Q、K、V';$('page-number').textContent=`${page+1} / ${lesson.slides.length}`;
  renderArchitecture($('architecture'),slide.id);
  if(slide.visual==='lab')renderLab($('slide-visual'));else if(slide.visual==='quiz')renderQuiz($('slide-visual'));else renderDiagram(slide.visual,$('slide-visual'));
  $('previous').disabled=page===0;$('next').disabled=page===lesson.slides.length-1;
  $('next').textContent=page===lesson.slides.length-1?'本讲结束':'下一页 →';
  $('page-dots').replaceChildren(...lesson.slides.map((s,i)=>{const b=document.createElement('button');b.setAttribute('aria-label',`第 ${i+1} 页：${s.title}`);if(i===page)b.setAttribute('aria-current','page');b.onclick=()=>go(i);return b;}));
  const host=$('details-content');host.replaceChildren();
  slide.notes.forEach(([title,text])=>{const h=document.createElement('h3');h.textContent=title;host.append(h);paragraph(host,text,'meaning');});
  const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='查看数学依据与符号对应';detail.append(summary);paragraph(detail,slide.derivation);paragraph(detail,lesson.notation,'muted');host.append(detail);
  if(slide.python){const h=document.createElement('h3');h.textContent='Python / NumPy 对照';host.append(h);const pre=document.createElement('pre'),code=document.createElement('code');code.textContent=slide.python;pre.append(code);host.append(pre);paragraph(host,'代码可在自己的 Python 环境运行；网页数值演示使用相同数学运算，并已对照核验。','muted');}
  const link=document.createElement('a');link.href=lesson.source.url;link.target='_blank';link.rel='noopener';link.textContent='参考：'+lesson.source.title+' ↗';host.append(link);
  renderRecords();
  if(scroll){$('details').open=false;$('slide').scrollIntoView({block:'start'});$('slide').focus({preventScroll:true});}
}
function go(index) {page=Math.max(0,Math.min(lesson.slides.length-1,index));history.replaceState(null,'','#'+lesson.node+'/'+page);renderPage(true);}
$('previous').onclick=()=>go(page-1);$('next').onclick=()=>go(page+1);
window.addEventListener('hashchange',()=>{restorePage();renderPage();});
window.addEventListener('resize',()=>renderPage());
document.addEventListener('keydown',event=>{
  if($('tree-dialog').open || event.target.closest('button,input,select,textarea,summary,dialog'))return;
  if(event.key==='ArrowRight'||event.key==='PageDown'){event.preventDefault();go(page+1);}
  if(event.key==='ArrowLeft'||event.key==='PageUp'){event.preventDefault();go(page-1);}
});
const groupTitles={A:'A / 模型怎样学会能力？',B:'B / Agent 怎样完成任务？',C:'C / 系统怎样稳定发挥？'};
for(const group of ['A','B','C']){
  const section=document.createElement('section');section.className='tree-group';const h=document.createElement('h3');h.textContent=groupTitles[group];section.append(h);
  catalog.filter(m=>m.id.startsWith(group)).forEach(module=>{
    const details=document.createElement('details');details.className='tree-module';details.open=module.nodes.some(n=>n.id===lesson.node);
    const summary=document.createElement('summary');summary.textContent=module.id+' · '+module.title;details.append(summary);
    module.nodes.forEach(node=>{const row=document.createElement('div');row.className='tree-node';const text=node.id+' · '+node.title;
      if(node.id===lesson.node){const button=document.createElement('button');button.textContent=text;button.onclick=()=>{$('tree-dialog').close();go(0);};row.append(button);}
      else {const label=document.createElement('span');label.className='not-yet';label.textContent=text;row.append(label);}
      const status=document.createElement('span');status.textContent=node.id===lesson.node?'QKV 入门已生成':'尚未生成';row.append(status);details.append(row);
    });section.append(details);
  });$('tree').append(section);
}
$('open-tree').onclick=()=>$('tree-dialog').showModal();$('close-tree').onclick=()=>$('tree-dialog').close();
$('mastery').onchange=()=>{const value={status:$('mastery').value,updatedAt:Date.now()};records[lesson.node]=value;pending[lesson.node]=value;saveCache();renderRecords();sync();};
async function sync() {
  if(syncing)return;syncing=true;$('sync-status').textContent='正在同步学习记录…';
  try {
    const response=await fetch('/api/progress',{cache:'no-store'});
    if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw new Error('offline');
    const remote=await response.json();if(!remote.records||typeof remote.scope!=='string')throw new Error('invalid');
    const local=readCache(remote.scope);
    // Scope caches by server-verified account; never upload another account's cached edits.
    const ownPending=scope===null||scope===remote.scope?pending:{};
    pending={...(local.pending||{}),...ownPending};scope=remote.scope;
    records={...remote.records,...pending};renderRecords();
    while(Object.keys(pending).length){const [id,value]=Object.entries(pending)[0];if(id!==lesson.node||!value||!statuses.includes(value.status)){delete pending[id];continue;}
      const result=await fetch('/api/progress',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:value.status})});
      if(!result.ok)throw new Error('save failed');if(pending[id]===value)delete pending[id];saveCache();
    }
    saveCache();$('sync-status').textContent='掌握状态已同步 · 手机电脑使用同一账号';
  } catch {if(scope===null&&!Object.keys(records).length){const local=readCache('local-only');records=local.records||{};renderRecords();}saveCache();$('sync-status').textContent='本机暂存 · 云端未连接；本地预览不提供跨设备同步';}
  finally {syncing=false;}
}
window.addEventListener('online',sync);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
restorePage();renderPage();sync();
