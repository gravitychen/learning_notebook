import { readFile, mkdir, writeFile } from 'node:fs/promises';
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'], '/app.mjs': ['app.mjs', 'text/javascript; charset=utf-8'], '/solver.mjs': ['solver.mjs', 'text/javascript; charset=utf-8'] };
const assets = {};
files['/visuals.mjs'] = ['visuals.mjs', 'text/javascript; charset=utf-8'];
files['/walkthrough.mjs'] = ['walkthrough.mjs', 'text/javascript; charset=utf-8'];
files['/detail.mjs'] = ['detail.mjs', 'text/javascript; charset=utf-8'];
files['/inspector.mjs'] = ['inspector.mjs', 'text/javascript; charset=utf-8'];
files['/solver.py'] = ['solver.py', 'text/plain; charset=utf-8'];
for (const [url, [path, type]] of Object.entries(files)) assets[url] = { body: await readFile(new URL(path, import.meta.url), 'utf8'), type };
const worker = await readFile(new URL('worker.mjs', import.meta.url), 'utf8');
const output = worker + '\nconst assets = ' + JSON.stringify(assets) + `;
export default { async fetch(request, env) {
  const path = new URL(request.url).pathname;
  try {
    if (path === '/api/progress') return await progress(request, env);
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', { status:405 });
    const asset = assets[path];
    if (!asset) return new Response('Not found', { status:404 });
    return new Response(request.method === 'HEAD' ? null : asset.body, { headers: { 'Content-Type': asset.type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'" } });
  } catch { return Response.json({ error:'Cloud request failed; try again later' }, { status:503, headers:{'Cache-Control':'no-store'} }); }
} };
`;
await mkdir(new URL('dist/server/', import.meta.url), { recursive: true });
await mkdir(new URL('dist/.openai/', import.meta.url), { recursive: true });
await writeFile(new URL('dist/server/index.js', import.meta.url), output);
await writeFile(new URL('dist/.openai/hosting.json', import.meta.url), await readFile(new URL('.openai/hosting.json', import.meta.url)));
console.log('Built self-contained Worker with learning records in R2.');
