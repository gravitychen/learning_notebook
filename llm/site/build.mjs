import { readFile, mkdir, writeFile } from 'node:fs/promises';
const files={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
for(const name of ['app','course','visuals','labs','math','architecture'])files['/'+name+'.mjs']=[name+'.mjs','text/javascript; charset=utf-8'];
const assets={};for(const [url,[file,type]]of Object.entries(files))assets[url]={body:await readFile(new URL(file,import.meta.url),'utf8'),type};
for(const name of ['transformer-figure1','attention-figure2','multihead-figure2'])assets['/assets/'+name+'.png']={body:(await readFile(new URL('assets/'+name+'.png',import.meta.url))).toString('base64'),type:'image/png',binary:true};
const source=await readFile(new URL('worker.mjs',import.meta.url),'utf8');
const output=source+'\nconst assets='+JSON.stringify(assets)+`;\nexport default { async fetch(request,env) {
  const path=new URL(request.url).pathname;
  try {
    if(path==='/api/progress')return await progress(request,env);
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
    const asset=assets[path];if(!asset)return new Response('Not found',{status:404});
    const body=asset.binary?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body;
    return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'"}});
  }catch{return Response.json({error:'Service unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
} };`;
await mkdir(new URL('dist/server/',import.meta.url),{recursive:true});await mkdir(new URL('dist/.openai/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/server/index.js',import.meta.url),output);await writeFile(new URL('dist/.openai/hosting.json',import.meta.url),await readFile(new URL('.openai/hosting.json',import.meta.url)));
console.log('Built one-lesson Worker and authenticated learning records.');
