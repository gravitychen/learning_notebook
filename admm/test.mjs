import assert from 'node:assert/strict';
import { SIZE, fft2, gradient, adjoint, blur, createSolver, shrink } from './solver.mjs';
const n = SIZE ** 2, a = Float64Array.from({ length: n }, (_, i) => Math.sin(i * .37));
const f = fft2(a), back = fft2(f.re, true, f.im).re;
assert.ok(Math.max(...a.map((v, i) => Math.abs(v - back[i]))) < 1e-12, 'FFT round trip');
const p = [a.map(v => v * .3), a.map((v, i) => Math.cos(i * .21))], da = gradient(a), atp = adjoint(p);
const dot = (x, y) => x.reduce((s, v, i) => s + v * y[i], 0);
assert.ok(Math.abs(dot(da[0], p[0]) + dot(da[1], p[1]) - dot(a, atp)) < 1e-9, 'adjoint identity');
assert.ok(Math.max(...blur(new Float64Array(n).fill(1)).map(v => Math.abs(v - 1))) < 1e-12, 'blur preserves DC');
assert.ok(Math.abs(shrink(-.7, .2) + .5) < 1e-12);
assert.throws(() => createSolver(-1, .5));
const solver = createSolver();
for (let i = 0; i < 150; i++) solver.step();
const initial = solver.history[0], final = solver.history.at(-1);
assert.ok(final.psnr > initial.psnr + 2, 'reconstruction improves over observation');
assert.ok(final.objective < initial.objective, 'objective improves');
assert.ok(final.converged, 'both residual tests pass');
assert.equal(solver.history[0].x[0], solver.observed[0], 'history is immutable');
console.log({ initialPSNR: initial.psnr, finalPSNR: final.psnr, primal: final.primal, dual: final.dual, converged: final.converged });
const { progress } = await import('./worker.mjs');
const objects = new Map();
const env = { BUCKET: { async list({ prefix }) { return { objects: [...objects.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; }, async put(key, value) { objects.set(key, value); }, async get(key) { return { async json() { return JSON.parse(objects.get(key)); } }; } } };
const req = (user, data, origin = 'https://example.test') => new Request('https://example.test/api/progress', { method: data ? 'PUT' : 'GET', headers: { ...(user ? { 'oai-authenticated-user-id': user } : {}), Origin: origin, 'Content-Type': 'application/json' }, ...(data ? { body: JSON.stringify(data) } : {}) });
assert.equal((await progress(req(null), env)).status, 401);
assert.equal((await progress(req('a', { id: 'image', status: 'known' }, 'https://evil.test'), env)).status, 403);
assert.equal((await progress(req('a', { id: '../invalid', status: 'known' }), env)).status, 400);
assert.equal((await progress(req('a', { id: 'image', status: 'known' }), env)).status, 200);
assert.equal((await (await progress(req('a'), env)).json()).image.status, 'known');
assert.deepEqual(await (await progress(req('b'), env)).json(), {});
console.log('Progress persistence, input validation and per-user isolation passed.');
const { visualSpec } = await import('./visuals.mjs');
for (let topic = 0; topic < 12; topic++) {
  const specs = visualSpec(topic);
  assert.equal(specs.length, 3, `three visual comparisons for topic ${topic}`);
  for (const s of specs) {
    assert.ok(s.title && s.note);
    if (s.data) { assert.equal(s.data.length, n); assert.ok(s.data.every(Number.isFinite)); }
    if (s.series) assert.ok(s.series.every(a => a.values.every(Number.isFinite)));
  }
}
console.log('All 12 lecture pages have finite data and labeled visualizations.');
const { walkthrough, walkthroughVisual, lessonPages } = await import('./walkthrough.mjs');
const order = [2, 0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11], pages = lessonPages(order);
assert.equal(pages.length, 38);
assert.equal(new Set(pages.map(p => `${p.topic}:${p.part}`)).size, pages.length);
for (const [topic, parts] of Object.entries(walkthrough)) {
  assert.ok(parts.length >= 3, `topic ${topic} must unfold in small steps`);
  for (const step of parts) {
    assert.ok(step.title && step.equation && step.caption && step.detail);
    for (const spec of walkthroughVisual(step.scene)) {
      assert.ok(spec.title && spec.note);
      if (spec.data) { assert.equal(spec.data.length, n); assert.ok(spec.data.every(Number.isFinite)); }
      if (spec.series) assert.ok(spec.series.every(s => s.values.every(Number.isFinite)));
    }
  }
}
// The first image walkthrough uses the same initial state and first update as the solver.
const { teachingStates } = await import('./visuals.mjs');
const [s0, s1] = teachingStates(), d1 = gradient(s1.x);
assert.ok(s0.u.every(a => a.every(v => v === 0)));
for (let i = 0; i < n; i++) assert.ok(Math.abs(s1.z[0][i] - shrink(d1[0][i], .15)) < 1e-12);
assert.equal(shrink(.08, .15), 0);
assert.ok(Math.abs(shrink(.3, .15) - .15) < 1e-12);
assert.ok(Math.abs(shrink(-.3, .15) + .15) < 1e-12);
console.log('38-page sequence, every substep, and first-iteration walkthrough verified.');
const { DETAIL_STEPS, detailPosition, detailFrame, detailFormulaRows } = await import('./detail.mjs');
assert.equal(DETAIL_STEPS, 6);
assert.deepEqual(detailPosition(0), { k: 0, phase: 0 });
assert.deepEqual(detailPosition(6), { k: 0, phase: 6 });
assert.deepEqual(detailPosition(7), { k: 1, phase: 1 });
const baselineFormulas = detailFormulaRows(0).map(row => row.parts.join(''));
const expectedHighlights = [null, [0, 'argminₓ'], [1, 'Dxᵏ⁺¹'], [1, 'Dxᵏ⁺¹ + uᵏ'], [1, 'soft('], [2, 'Dxᵏ⁺¹ − zᵏ⁺¹'], [2, 'uᵏ + Dxᵏ⁺¹ − zᵏ⁺¹']];
for (let phase = 0; phase <= DETAIL_STEPS; phase++) {
  const rows = detailFormulaRows(phase);
  assert.deepEqual(rows.map(row => row.parts.join('')), baselineFormulas);
  const active = rows.map((row, i) => ({ row, i })).filter(item => item.row.highlight);
  assert.equal(active.length, phase ? 1 : 0);
  if (phase) {
    const { row, i } = active[0], h = row.highlight;
    assert.equal(i, expectedHighlights[phase][0]);
    assert.ok(row.parts.slice(h.start, h.end + 1).join('').includes(expectedHighlights[phase][1]));
  }
}
assert.throws(() => detailFormulaRows(7));
const detailSolver = createSolver(.015, .1);
detailSolver.step(); detailSolver.step();
for (const direction of [0, 1]) for (let index = 0; index <= 12; index++) {
  const frame = detailFrame(detailSolver, index, .015, .1, direction);
  assert.ok(frame.formula && frame.explain && frame.specs.length === 3);
  if (!index) continue;
  const { old, next, dx, v, residual } = frame.inputs;
  for (let i = 0; i < n; i++) {
    assert.ok(Math.abs(v[i] - dx[direction][i] - old.u[direction][i]) < 1e-12);
    assert.ok(Math.abs(next.z[direction][i] - shrink(v[i], .15)) < 1e-12);
    assert.ok(Math.abs(residual[i] - dx[direction][i] + next.z[direction][i]) < 1e-12);
    assert.ok(Math.abs(next.u[direction][i] - old.u[direction][i] - residual[i]) < 1e-12);
  }
}
assert.throws(() => detailFrame(detailSolver, -1, .015, .1));
assert.throws(() => detailFrame(detailSolver, 13, .015, .1));
console.log('Detailed six-step views match both channels of the real solver for two rounds.');
const { inspectStep } = await import('./inspector.mjs');
// Check numeric substitution against stored updates, including wrapped boundary pixels.
for (const [lambda, rho] of [[.015, .1], [.04, .5]]) {
  const sample = createSolver(lambda, rho); sample.step(); sample.step();
  for (const direction of [0, 1]) for (let index = 0; index <= 12; index++) for (const [row, col] of [[20, 29], [63, 63], [0, 0]]) {
    const trace = inspectStep(sample, index, lambda, rho, direction, row, col, 2, 3);
    assert.ok(trace.code && trace.note && trace.calculation);
    assert.ok(trace.values.every(item => Number.isFinite(item.value)));
    const { phase, k } = detailPosition(index), i = row * SIZE + col;
    const state = sample.history[phase ? k + 1 : 0];
    const expected = phase === 2 ? gradient(state.x)[direction][i] : phase === 3 ? gradient(state.x)[direction][i] + sample.history[k].u[direction][i] : phase === 4 ? state.z[direction][i] : phase === 5 ? state.r[direction][i] : phase === 6 ? state.u[direction][i] : state.x[i];
    assert.ok(Math.abs(trace.result - expected) < 1e-12);
  }
  const x = sample.history[1].x, old = sample.history[0];
  const laplacian = adjoint(gradient(x));
  const left = blur(blur(x)).map((v, i) => v + rho * laplacian[i]);
  const correction = adjoint(old.z.map((a, d) => a.map((v, i) => v - old.u[d][i])));
  const right = blur(sample.observed).map((v, i) => v + rho * correction[i]);
  assert.ok(Math.max(...left.map((v, i) => Math.abs(v - right[i]))) < 1e-10, 'x solves the original spatial normal equation');
}
assert.throws(() => inspectStep(detailSolver, 1, .015, .1, 0, -1, 0));
assert.ok(Math.abs(final.psnr - 38.68657249274001) < 1e-10, 'inspector extraction preserves solver results');
console.log('Code inspector: two parameter sets, both channels, boundaries, every phase and spatial x equation passed.');
const { readFileSync } = await import('node:fs');
const { spawnSync } = await import('node:child_process');
const { pythonStep } = await import('./inspector.mjs');
const pythonSource = readFileSync(new URL('./solver.py', import.meta.url), 'utf8');
const snippets = Array.from({ length: 7 }, (_, phase) => pythonStep(pythonSource, phase));
assert.throws(() => pythonStep(pythonSource, 7));
assert.throws(() => pythonStep('', 1));
assert.ok(snippets.every(code => code.includes('import numpy as np') && !code.includes('const ')));
const cases = [], channels = arrays => arrays.map(a => Array.from(a));
for (const [lam, rho] of [[.015, .1], [.04, .5]]) {
  const sample = createSolver(lam, rho);
  for (let k = 0; k < 3; k++) {
    const old = sample.history.at(-1), next = sample.step(), dx = gradient(next.x);
    cases.push({ lam, rho, b: Array.from(sample.observed), z: channels(old.z), u: channels(old.u), expected: {
      x: Array.from(next.x), dx: channels(dx), v: channels(dx.map((a, d) => a.map((v, i) => v + old.u[d][i]))),
      z: channels(next.z), r: channels(next.r), u: channels(next.u),
    } });
  }
}
const python = spawnSync('python', ['-c', `
import json, sys
import numpy as np
payload = json.load(sys.stdin)
module = {}
exec(payload['source'], module)
for case in payload['cases']:
    image = lambda a: np.array(a, dtype=np.float64).reshape(64, 64)
    field = lambda a: np.array(a, dtype=np.float64).reshape(2, 64, 64)
    expected = {key: (image(a) if key == 'x' else field(a)) for key, a in case['expected'].items()}
    b, z, u = image(case['b']), field(case['z']), field(case['u'])
    # Run the whole Python implementation and all seven displayed snippets.
    result = module['admm_step'](b, z, u, case['lam'], case['rho'])
    for key in expected:
        np.testing.assert_allclose(result[key], expected[key], atol=1e-11, rtol=1e-10)
    for phase, code in enumerate(payload['snippets']):
        ns = dict(b=b.copy(), z=z.copy(), u=u.copy(), lam=case['lam'], rho=case['rho'],
                  x_next=expected['x'].copy(), dx=expected['dx'].copy(),
                  v=expected['v'].copy(), z_next=expected['z'].copy(), r=expected['r'].copy())
        exec(code, ns)
        if phase == 0:
            np.testing.assert_array_equal(ns['x'], b)
            np.testing.assert_array_equal(ns['z'], module['gradient'](b))
            np.testing.assert_array_equal(ns['u'], 0)
        else:
            name, key = [None, ('x_next', 'x'), ('dx', 'dx'), ('v', 'v'), ('z_next', 'z'), ('r', 'r'), ('u_next', 'u')][phase]
            np.testing.assert_allclose(ns[name], expected[key], atol=1e-11, rtol=1e-10)
    np.testing.assert_array_equal(z, field(case['z']))
    np.testing.assert_array_equal(u, field(case['u']))
print('Python/NumPy: full updates and every displayed snippet match JavaScript for 6 rounds, both channels and all pixels.')
`], { input: JSON.stringify({ source: pythonSource, snippets, cases }), encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' }, windowsHide: true });
assert.equal(python.status, 0, python.error?.message || python.stderr);
console.log(python.stdout.trim());
