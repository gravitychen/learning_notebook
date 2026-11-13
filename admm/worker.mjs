export async function progress(request, env) {
  const user = request.headers.get('oai-authenticated-user-id');
  const json = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
  if (!user) return json({ error: 'Sign in required' }, 401);
  if (!env.BUCKET) return json({ error: 'Cloud storage unavailable' }, 503);
  const prefix = `progress/${encodeURIComponent(user)}/`;
  if (request.method === 'GET') {
    const items = await env.BUCKET.list({ prefix, limit: 20 });
    const values = await Promise.all(items.objects.map(async item => [item.key.slice(prefix.length), await (await env.BUCKET.get(item.key)).json()]));
    return json(Object.fromEntries(values));
  }
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Invalid origin' }, 403);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Expected JSON' }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'Body required' }, 400);
  let size = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 512) { await reader.cancel(); return json({ error: 'Body too large' }, 413); } chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let data; try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const ids = ['image','operators','model','tv','split','lagrangian','xstep','shrink','ustep','stop','parameters','interpret'];
  if (!data || !ids.includes(data.id) || !['review','known','partial','learn'].includes(data.status)) return json({ error: 'Invalid topic or status' }, 400);
  const record = { status: data.status, updatedAt: Date.now() };
  await env.BUCKET.put(prefix + data.id, JSON.stringify(record));
  return json(record);
}
