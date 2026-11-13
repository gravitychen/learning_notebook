import { SIZE, fixture, gradient, createSolver, shrink, blur } from './solver.mjs';
const sample = fixture();
let demo, variations;
function iterations() {
  if (!demo) { demo = createSolver(); for (let i = 0; i < 150; i++) demo.step(); }
  return demo.history;
}
export const teachingStates = () => iterations().slice(0, 2);
const image = (title, data, note = '亮度 0–1', signed = false, range = .5) => ({ title, data, note, signed, range });
const plot = (title, series, note, labels = ['位置', '幅度']) => ({ title, series, note, labels });
export function visualSpec(topic) {
  const { truth, observed } = sample;
  if (topic === 0) return [image('图像 x', truth), { title: '局部 6 × 6 像素', matrix: Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (_, x) => truth[(10 + y) * SIZE + 8 + x])), note: '数字就是对应位置的亮度' }, plot('按行展开', [{ values: Array.from(truth.slice(20 * SIZE, 22 * SIZE)), color: '#bd3035' }], '第 20–21 行按行连接；索引从 0 开始')];
  if (topic === 1) { const g = gradient(truth); return [image('x：亮度', truth), image('Dₓx：水平差分', g[0], '左暗右亮为红；左亮右暗为蓝', true), image('Dᵧx：垂直差分', g[1], '上暗下亮为红；上亮下暗为蓝', true)]; }
  if (topic === 2) return [image('清晰场景 x★', truth), image('模糊 Hx★', blur(truth)), image('观测 b', observed, '模糊 + 固定高斯噪声')];
  if (topic === 3) return [image('场景 x★', truth), image('梯度 Dₓx★', gradient(truth)[0], '平坦区域为白色；边缘有响应', true), plot('同一行的亮度变化', [{ values: Array.from(truth.slice(20 * SIZE, 21 * SIZE)), color: '#222' }, { values: Array.from(observed.slice(20 * SIZE, 21 * SIZE)), color: '#bd3035' }], '黑：清晰场景；红：含噪观测')];
  const states = iterations(), s = states[12], prev = states[11], dx = gradient(s.x);
  if (topic === 4) return [image('候选图像 x', states[1].x), image('候选梯度 Dₓx', gradient(states[1].x)[0], '从候选图像计算的水平梯度', true), image('候选辅助变量 zₓ', states[1].z[0], '此处只看两种变量；下一节再讲更新', true)];
  if (topic === 5) return [image('Dₓx¹ − zₓ¹', states[1].r[0], '第 1 轮：约束尚未一致', true, .1), image('Dₓx⁶⁰ − zₓ⁶⁰', states[60].r[0], '第 60 轮：同一色标 ±0.1', true, .1), image('uₓ⁶⁰', states[60].u[0], '累积修正量，不是场景亮度', true)];
  if (topic === 6) return [image('观测 b', observed), image('目标梯度 zₓ¹¹ − uₓ¹¹', prev.z[0].map((v, i) => v - prev.u[0][i]), '约束项给出的梯度目标', true), image('更新后的 x¹²', s.x)];
  if (topic === 7) {
    const v = dx[0].map((a, i) => a + prev.u[0][i]), inputs = Array.from({ length: 201 }, (_, i) => -.3 + i * .003);
    return [image('阈值前 Dₓx¹² + uₓ¹¹', v, '蓝白红：±0.5', true), plot('软阈值，κ = λ/ρ = 0.15', [{ values: inputs, color: '#bbb' }, { values: inputs.map(a => shrink(a, .15)), color: '#bd3035' }], '灰：恒等映射；红：软阈值', ['输入 v', '输出 soft(v)']), image('阈值后 zₓ¹²', s.z[0], '小差分归零；大差分收缩', true)];
  }
  if (topic === 8) return [image('第 0 轮：uₓ = 0', states[0].u[0], '水平修正量：±0.5', true), image('第 1 轮：Dₓx − zₓ', states[1].r[0], '同一色标：±0.5', true), image('第 1 轮：新 uₓ', states[1].u[0], '左图 + 中图 = 右图', true)];
  if (topic === 9) return [image('重建 x¹', states[1].x), image('重建 x¹⁵⁰', states[150].x), plot('残差 / 停止阈值', [{ values: states.slice(1).map(a => Math.log10(Math.max(a.primal / a.epsP, 1e-4))), color: '#245c4a' }, { values: states.slice(1).map(a => Math.log10(Math.max(a.dual / a.epsD, 1e-4))), color: '#bd3035' }], '绿：原始；红：对偶；都低于 0 才停止', ['迭代 k', 'log₁₀ 比值'])];
  if (topic === 10) {
    if (!variations) variations = [.001, .015, .06].map(lambda => { const a = createSolver(lambda, .1); for (let i = 0; i < 150; i++) a.step(); return a.history.at(-1); });
    return variations.map((a, i) => image(`λ = ${[.001, .015, .06][i]}`, a.x, `固定 ρ=0.1，150 轮${a.converged ? '，残差达标' : '，未达停止阈值'}`));
  }
  return [image('重建 x¹⁵⁰', states[150].x, '亮度：0–1'), image('辅助梯度 zₓ¹⁵⁰', states[150].z[0], '梯度：蓝 −0.5 / 红 +0.5', true), image('观测残差 Hx¹⁵⁰ − b', states[150].residual, '观测误差：蓝 −0.1 / 红 +0.1', true, .1)];
}
function drawImage(canvas, spec) {
  const ctx = canvas.getContext('2d'), small = document.createElement('canvas'); small.width = small.height = SIZE;
  const c = small.getContext('2d'), pixels = c.createImageData(SIZE, SIZE);
  spec.data.forEach((v, i) => {
    const t = spec.signed ? Math.min(1, Math.abs(v) / spec.range) : Math.max(0, Math.min(1, v));
    const rgb = spec.signed ? v >= 0 ? [255, 255 * (1 - t), 255 * (1 - t)] : [255 * (1 - t), 255 * (1 - t), 255] : [255 * t, 255 * t, 255 * t];
    pixels.data.set([...rgb, 255], i * 4);
  }); c.putImageData(pixels, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
}
function drawPlot(canvas, spec) {
  const ctx = canvas.getContext('2d'), all = spec.series.flatMap(s => s.values), lo = spec.ylim?.[0] ?? Math.min(0, ...all), hi = spec.ylim?.[1] ?? Math.max(1e-6, ...all);
  const x = (i, n) => 70 + i / Math.max(1, n - 1) * 460, y = v => 485 - (v - lo) / (hi - lo) * 410;
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 600, 600); ctx.font = '21px Arial'; ctx.fillStyle = '#666'; ctx.lineWidth = 1;
  for (const v of [lo, 0, hi]) { ctx.beginPath(); ctx.strokeStyle = '#ddd'; ctx.moveTo(70, y(v)); ctx.lineTo(530, y(v)); ctx.stroke(); ctx.fillText(v.toFixed(2), 0, y(v) + 5); }
  ctx.fillText(spec.labels[0], 440, 545); ctx.fillText(spec.labels[1], 70, 40);
  for (const s of spec.series) { ctx.beginPath(); ctx.strokeStyle = s.color; ctx.lineWidth = 4; s.values.forEach((v, i) => { if (!i) ctx.moveTo(x(i, s.values.length), y(v)); else ctx.lineTo(x(i, s.values.length), y(v)); }); ctx.stroke(); }
  if (spec.domain) {
    ctx.fillStyle = '#666'; ctx.fillText(spec.domain[0].toFixed(2), 70, 520); ctx.fillText(spec.domain[1].toFixed(2), 490, 520);
    for (const m of spec.markers || []) { ctx.beginPath(); ctx.fillStyle = '#222'; ctx.arc(70 + (m.x - spec.domain[0]) / (spec.domain[1] - spec.domain[0]) * 460, y(m.y), 7, 0, Math.PI * 2); ctx.fill(); }
  }
}
export function renderVisual(topic, host, specs = visualSpec(topic)) {
  const group = document.createElement('div'); group.className = 'visual-group';
  specs.forEach((spec, i) => {
    if ((topic === 2 || topic === 8) && i) { const arrow = document.createElement('span'); arrow.className = 'visual-arrow'; arrow.textContent = topic === 8 ? i === 1 ? '+' : '=' : '→'; arrow.setAttribute('aria-hidden', 'true'); group.append(arrow); }
    const fig = document.createElement('figure'), canvas = document.createElement('canvas'); canvas.width = canvas.height = 600; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', spec.title + '；' + spec.note);
    if (spec.lines) {
      const concept = document.createElement('div'); concept.className = 'concept';
      for (const text of spec.lines) { const line = document.createElement('p'); line.textContent = text; concept.append(line); } fig.append(concept);
    } else fig.append(canvas);
    if (spec.data) drawImage(canvas, spec);
    else if (spec.series) { canvas.className = 'plot'; drawPlot(canvas, spec); }
    else if (spec.matrix) {
      canvas.className = 'plot'; const ctx = canvas.getContext('2d'); ctx.font = '25px Arial'; ctx.textAlign = 'center';
      spec.matrix.forEach((row, y) => row.forEach((v, x) => { ctx.fillStyle = `rgb(${255 * v},${255 * v},${255 * v})`; ctx.fillRect(x * 100, y * 100, 100, 100); ctx.strokeStyle = '#aaa'; ctx.strokeRect(x * 100, y * 100, 100, 100); ctx.fillStyle = v > .5 ? '#111' : '#fff'; ctx.fillText(v.toFixed(2), x * 100 + 50, y * 100 + 58); }));
    }
    const caption = document.createElement('figcaption'), note = document.createElement('small'); caption.textContent = spec.title; note.textContent = spec.note; caption.append(note); fig.append(caption); group.append(fig);
  }); host.replaceChildren(group);
}
