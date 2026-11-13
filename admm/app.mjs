import { SIZE, createSolver, shrink } from './solver.mjs';
import { renderVisual } from './visuals.mjs';
import { walkthrough, walkthroughVisual, lessonPages } from './walkthrough.mjs';
import { DETAIL_STEPS, detailPosition, detailFrame, detailFormulaRows } from './detail.mjs';
import { inspectStep, pythonStep } from './inspector.mjs';
const $ = id => document.getElementById(id);
// Each pair is one code-grounded topic: intuition, equation, derivation and implementation.
const topics = [
  ['image','图像也是向量','一张灰度图是 4096 个亮度值组成的向量；矩阵排布只是在显示时保留空间关系。','x ∈ ℝ⁴⁰⁹⁶；i = y × 64 + col','把每行接到下一行，就能用向量范数度量整张图的误差。像素值约定为 0–1，计算时不裁剪。','const i = y * SIZE + col;'],
  ['operators','卷积、差分与伴随','H 把清晰图变模糊；D 把亮度变为水平、垂直的相邻像素差。Dᵀ 把梯度空间的修正送回图像空间。','(Dₓx)ᵢⱼ = xᵢ,ⱼ₊₁ − xᵢⱼ；⟨Dx,p⟩ = ⟨x,Dᵀp⟩','将差分内积中的索引平移，可得 (Dₓᵀp)ᵢⱼ = pᵢ,ⱼ₋₁ − pᵢⱼ。此处图像左右、上下首尾相连。','const dx = gradient(x);\nconst correction = adjoint(z);'],
  ['model','观测模型与数据项','传感器看到的是模糊后叠加噪声的 b。重建图 x 应经过同一成像模型后，能够解释 b。','b = Hx★ + ε；f(x) = ½ ‖Hx − b‖₂²','独立等方差高斯噪声的负对数似然与平方误差成正比。对 x 求导得到 Hᵀ(Hx − b)。','const residual = blur(x).map((v, i) => v - observed[i]);'],
  ['tv','TV 正则与凸优化复习','本例假设物体由平坦区域和清晰边缘构成：大部分相邻差应接近零，少量大差表示边界。','g(Dx) = λ Σᵢ (|Dₓxᵢ| + |Dᵧxᵢ|)','线性映射后的平方范数和绝对值之和都是凸函数，二者相加仍凸。TV 会保边，但也会压低对比度、产生阶梯效应。','const tv = dx.reduce((s, a) => s + a.reduce((t, v) => t + Math.abs(v), 0), 0);'],
  ['split','为什么引入 z','数据项在亮度空间好处理，TV 在梯度空间好处理。让 z 暂时代替 Dx，再逐步迫使二者一致。','min f(x) + λ‖z‖₁，约束 Dx − z = 0','当等式约束满足时，把 z 代回原目标便得到同一个问题。z 是两通道梯度辅助变量，不是另一张亮度图。','const z = gradient(x);'],
  ['lagrangian','增广拉格朗日与 u','二次罚项惩罚当前不一致，对偶变量累积不一致，避免只靠增大罚参数来逼近约束。','Lρ = f(x) + λ‖z‖₁ + yᵀ(Dx − z) + ρ/2 ‖Dx − z‖₂²','令 u = y/ρ，配方得到 ρ/2 ‖Dx − z + u‖₂² − ρ/2 ‖u‖₂²。固定 u 时最后一项与 x、z 无关。u 不是场景的物理亮度。','const u = [new Float64Array(N), new Float64Array(N)];'],
  ['xstep','x 更新：解释观测','x 同时靠近观测要求和当前梯度共识。ρ 较大时，本轮会更重视 z − u 给出的梯度目标。','(HᵀH + ρDᵀD)x⁺ = Hᵀb + ρDᵀ(z − u)','对 x 子问题求导并令其为零，即得正规方程。H、D 使用相同的周期边界，才能一起被离散傅里叶变换对角化。','const d = fft2(adjoint(z.map((a, j) => a.map((v, i) => v - u[j][i]))));'],
  ['shrink','z 更新：软阈值与近端','对很小的梯度直接置零，对大梯度缩小幅度。这是 TV 先验进入每轮迭代的位置。','z⁺ = soft(Dx⁺ + u, λ/ρ)','标量问题 min_z λ|z| + ρ/2(z−v)²，分别对 z>0、z<0 求导，再补上零点次梯度条件，得到 sign(v)max(|v|−λ/ρ,0)。','const z = dx.map((a, j) => a.map((v, i) => shrink(v + u[j][i], lambda / rho)));'],
  ['ustep','u 更新：累积约束偏差','若某处 Dx 持续大于 z，u 在该处积累正修正，影响下一轮协商。它服务于等式约束。','u⁺ = u + Dx⁺ − z⁺','未缩放乘子更新为 y⁺ = y + ρ(Dx⁺−z⁺)；ρ 固定时除以 ρ 即得到此式。','const u = dx.map((a, j) => a.map((v, i) => last.u[j][i] + v - z[j][i]));'],
  ['stop','残差与停止条件','原始残差检查梯度共识；对偶残差检查 z 的变化引起的驻点偏差。图像看起来稳定并不等于满足停止条件。','r = Dx − z；s = ρDᵀ(z⁺ − z)','本页报告 s 的范数，所以与采用负号的定义一致。εpri=√(2n)εabs+εrel max(‖Dx‖,‖z‖)，εdual=√n εabs+εrel‖ρDᵀu‖。','const converged = primal <= epsP && dual <= epsD;'],
  ['parameters','λ 与 ρ 的区别','λ 决定数据拟合和先验的取舍；ρ 决定两块变量如何协调。比较不同 ρ 时，要确认都已充分收敛。','目标含 λ；增广罚项含 ρ','虽然阈值是 λ/ρ，ρ 也同时改变 x 步和 u 的动态。不能只根据阈值变小推断最终结果会更少正则化。','const threshold = lambda / rho;'],
  ['interpret','读懂图像与指标','x 是重建亮度；zₓ 是水平梯度；uₓ 是对应的对偶修正量。残差图 Hx−b 是观测空间误差，不是与真值的误差。','PSNR = 10 log₁₀(1 / MSE(x,x★))','真值仅用于合成观测及事后评估，不参与求解器的 x、z、u 更新。目标值不保证逐轮单调；残差与图像质量需要分别判断。','const mse = x.reduce((s, v, i) => s + (v - truth[i]) ** 2, 0) / N;']
];
const levels = ['数学与算子','逆问题与优化','变量分裂与对偶','交替更新','修正与停止','调参与读图'];
const colors = ['#e6e9d7','#d7e0c7','#c1d1b2','#9fb99a','#65866d','#335d4c'];
let selected = 2, current = 0, timer = null, solver = createSolver(.015, .1);
let part = 0;
let detailIndex = 0, detailDirection = 0, detailMode = false;
let inspectionVisible = false;
const order = [2, 0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const pages = lessonPages(order);
const pageIndex = () => pages.findIndex(p => p.topic === selected && p.part === part);
const captions = ['一张图像，每个位置对应一个亮度值。', '差分把亮度变成边缘；伴随把修正送回图像。', '成像让细节变模糊，噪声让逆过程更困难。', 'TV 偏好稀疏梯度：大部分平坦，少量边缘。', '把梯度交给 z 处理，再要求它与 Dx 一致。', '罚项约束当前偏差，u 累积过去的偏差。', 'x 同时解释观测，靠近当前的目标梯度。', '小梯度归零，大梯度收缩。', '把本轮约束偏差加到上一轮修正量。', '图像稳定与残差达标，需要分别检查。', 'λ 决定先验强度；ρ 决定协调过程。', '亮度、梯度、观测误差：三个不同的空间。'];
const equations = ['x ∈ ℝ⁴⁰⁹⁶', 'Dₓx[i,j] = x[i,j+1] − x[i,j]', 'b = Hx★ + ε', 'minₓ ½ ‖Hx − b‖₂² + <mark>λ ‖Dx‖₁</mark>', 'minₓ,z f(x) + λ ‖z‖₁　　<mark>Dx = z</mark>', 'Lρ = f(x) + λ‖z‖₁ + <mark>ρ/2 ‖Dx − z + u‖₂²</mark> − ρ/2 ‖u‖₂²', '(HᵀH + ρDᵀD)x⁺ = Hᵀb + ρDᵀ(z − u)', 'z⁺ = <mark>soft(Dx⁺ + u, λ/ρ)</mark>', 'u⁺ = u + <mark>Dx⁺ − z⁺</mark>', '‖r‖₂ ≤ εpri　且　‖s‖₂ ≤ εdual', 'λ：改变优化目标　　ρ：改变迭代路径', 'Hx − b ≠ x − x★'];
let records = {}, pending = {}, syncing = false;
try { const saved = JSON.parse(localStorage.getItem('admm-learning-v1') || '{}'); records = saved.records || {}; pending = saved.pending || {}; } catch { /* A blocked browser store still permits learning for this session. */ }
function saveLocal() {
  try { localStorage.setItem('admm-learning-v1', JSON.stringify({ records, pending })); } catch { $('sync').textContent = '浏览器未允许保存；本次状态仅在当前页面保留'; }
}
function renderLesson() {
  const level = Math.floor(selected / 2), t = topics[selected], substep = walkthrough[selected]?.[part];
  $('lesson-path').textContent = `LEVEL 0${level + 1} / ${levels[level]}` + (substep ? ` · 第 ${part + 1} / ${walkthrough[selected].length} 小步` : '');
  $('nodes').replaceChildren(...topics.slice(level * 2, level * 2 + 2).map((topic, j) => {
    const b = document.createElement('button'); b.textContent = topic[1]; b.setAttribute('aria-pressed', String(selected === level * 2 + j));
    b.onclick = () => { selected = level * 2 + j; part = 0; $('map-dialog').close(); showLesson(); renderLesson(); }; return b;
  }));
  $('lesson-title').textContent = substep?.title || t[1]; $('mastery').value = records[t[0]]?.status || 'review';
  $('lesson-content').innerHTML = `<h3>物理意义与直觉</h3><p>${t[2]}</p><div class="equation">${t[3]}</div><h3>推导桥梁</h3><p>${t[4]}</p><h3>对应代码</h3><pre><code></code></pre>`;
  $('lesson-content').querySelector('code').textContent = t[5];
  if (substep) { const detail = document.createElement('p'); detail.textContent = substep.detail; $('lesson-content').prepend(detail); }
  $('slide-equation').innerHTML = substep?.equation || equations[selected];
  $('slide-caption').textContent = substep?.caption || captions[selected];
  $('slide-number').textContent = `${pageIndex() + 1} / ${pages.length}`;
  $('previous-node').disabled = pageIndex() === 0;
  $('next-node').textContent = pageIndex() === pages.length - 1 ? '进入实验 →' : '下一小步 →';
  document.querySelectorAll('#slide-dots button').forEach((b, i) => { if (i === order.indexOf(selected)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (substep) renderVisual(null, $('slide-visual'), walkthroughVisual(substep.scene));
  else renderVisual(selected, $('slide-visual'));
  $('progress').textContent = `${topics.filter(t => records[t[0]]?.status === 'known').length} / 12 已掌握`;
  document.querySelectorAll('.level').forEach(b => b.setAttribute('aria-expanded', String(Number(b.dataset.level) === level)));
}
for (let l = 5; l >= 0; l--) {
  const b = document.createElement('button'); b.className = 'level'; b.dataset.level = l; b.style = `--w:${44 + (5 - l) * 11.2}%;--bg:${colors[l]};--fg:${l > 3 ? 'white' : '#294b3e'}`;
  b.setAttribute('aria-controls', 'nodes'); b.innerHTML = `<b>0${l + 1} · ${levels[l]}</b><small>${l === 5 ? '读懂结果与实验取舍' : '展开 2 个具体知识点'}</small>`;
  b.onclick = () => { selected = l * 2; part = 0; renderLesson(); };
  $('pyramid').append(b);
}
function showLesson() { pause(); $('lecture').hidden = false; $('experiment').hidden = true; $('open-lesson').setAttribute('aria-pressed', 'true'); $('open-lab').setAttribute('aria-pressed', 'false'); }
function showLab() { $('lecture').hidden = true; $('experiment').hidden = false; $('open-lesson').setAttribute('aria-pressed', 'false'); $('open-lab').setAttribute('aria-pressed', 'true'); }
function changePage(delta) {
  const i = pageIndex() + delta;
  if (i >= pages.length) { showLab(); return; }
  if (i < 0) return;
  selected = pages[i].topic; part = pages[i].part; $('lesson-details').open = false; renderLesson();
}
for (const [i, id] of order.entries()) {
  const b = document.createElement('button'); b.setAttribute('aria-label', `知识点 ${i + 1}：${topics[id][1]}`);
  b.onclick = () => { selected = id; part = 0; $('lesson-details').open = false; renderLesson(); }; $('slide-dots').append(b);
}
$('open-map').onclick = () => $('map-dialog').showModal();
$('close-map').onclick = () => $('map-dialog').close();
$('open-lesson').onclick = showLesson; $('open-lab').onclick = showLab;
$('previous-node').onclick = () => changePage(-1); $('next-node').onclick = () => changePage(1);
document.addEventListener('keydown', e => {
  if ($('lecture').hidden || $('map-dialog').open || ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); changePage(e.key === 'ArrowRight' ? 1 : -1); }
});
$('mastery').onchange = () => {
  const id = topics[selected][0], value = { status: $('mastery').value, updatedAt: Date.now() };
  records[id] = value; pending[id] = value; saveLocal(); renderLesson(); sync();
};
async function sync() {
  if (syncing) return; syncing = true;
  try {
    const response = await fetch('/api/progress', { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('unavailable');
    const remote = await response.json(); records = { ...remote, ...pending }; renderLesson();
    while (Object.keys(pending).length) {
      const [id, value] = Object.entries(pending)[0];
      const result = await fetch('/api/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: value.status }) });
      if (!result.ok) throw new Error('write failed');
      if (pending[id] === value) delete pending[id];
      saveLocal();
    }
    saveLocal(); $('sync').textContent = '学习状态已同步 · 手机电脑使用同一账号';
  } catch { $('sync').textContent = '已在本机暂存 · 云端未连接，联网后重试'; }
  finally { syncing = false; }
}
window.addEventListener('online', sync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); else pause(); });
setInterval(sync, 30000);
const panels = [
  ['truth','参考真值 x★','固定亮度 [0,1]','合成的清晰场景，仅供对照，不参与重建更新。'],
  ['observed','观测 b = Hx★ + ε','固定亮度 [0,1]','已知热扩散模糊 + 标准差 0.02 的固定高斯噪声。'],
  ['x','重建 xᵏ','固定亮度 [0,1]','当前估计的场景亮度；显示裁剪到 0–1，数值计算不裁剪。'],
  ['z','辅助梯度 zₓᵏ','蓝 −0.5 / 白 0 / 红 +0.5','只显示水平通道：正值表示右侧更亮，负值表示右侧更暗。垂直通道也参与计算。'],
  ['u','对偶修正 uₓᵏ','蓝 −0.5 / 白 0 / 红 +0.5','水平通道的累积约束修正，是算法变量，不是亮度或直接物理测量。'],
  ['residual','观测残差 Hxᵏ − b','蓝 −0.1 / 白 0 / 红 +0.1','红色表示预测观测偏亮，蓝色表示偏暗。不要将其当作与真值的误差。']
];
for (const [id, title, scale, caption] of panels) {
  const fig = document.createElement('figure'); fig.className = 'image-card';
  fig.innerHTML = `<h3>${title}</h3><canvas id="image-${id}" width="64" height="64" role="img" aria-label="${title}"></canvas><div class="scale">${scale}</div><figcaption>${caption}</figcaption>`; $('images').append(fig);
}
function paint(id, values, signed = false, range = .5) {
  const ctx = $(`image-${id}`).getContext('2d'), image = ctx.createImageData(SIZE, SIZE);
  values.forEach((v, i) => {
    let rgb;
    if (signed) { const t = Math.min(Math.abs(v) / range, 1); rgb = v >= 0 ? [255, 255 * (1 - t), 255 * (1 - t)] : [255 * (1 - t), 255 * (1 - t), 255]; }
    else { const t = 255 * Math.max(0, Math.min(1, v)); rgb = [t, t, t]; }
    image.data.set([...rgb, 255], i * 4);
  }); ctx.putImageData(image, 0, 0);
}
function drawChart() {
  const c = $('chart'), ctx = c.getContext('2d'), states = solver.history.slice(1, current + 1); ctx.clearRect(0, 0, c.width, c.height);
  const vals = states.flatMap(s => [s.primal / s.epsP, s.dual / s.epsD]).map(v => Math.log10(Math.max(v, 1e-4)));
  const low = Math.min(-1, ...vals), high = Math.max(1, ...vals), y = v => 175 - (v - low) / (high - low) * 150;
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#657b6d';
  for (const v of [low, 0, high]) { ctx.fillText(v.toFixed(1), 3, y(v)); ctx.beginPath(); ctx.strokeStyle = '#d4ddce'; ctx.setLineDash(v === 0 ? [5, 4] : []); ctx.moveTo(40, y(v)); ctx.lineTo(890, y(v)); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const [field, eps, color] of [['primal', 'epsP', '#335d4c'], ['dual', 'epsD', '#bb793c']]) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    states.forEach((s, i) => { const x = 45 + i / Math.max(1, states.length - 1) * 830, yy = y(Math.log10(Math.max(s[field] / s[eps], 1e-4))); if (!i) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }); ctx.stroke();
  }
  ctx.fillText('k = 1', 45, 195); ctx.fillText(`k = ${current}`, 830, 195);
}
function renderState() {
  const s = solver.history[current];
  paint('truth', solver.truth); paint('observed', solver.observed); paint('x', s.x); paint('z', s.z[0], true); paint('u', s.u[0], true); paint('residual', s.residual, true, .1);
  $('iteration').textContent = `第 ${current} 轮`;
  $('back').disabled = current === 0; $('step').disabled = current >= 150;
  $('timeline').max = solver.history.length - 1; $('timeline').value = current;
  $('stop-status').textContent = current === 0 ? '初始化：x⁰=b，z⁰=Dx⁰，u⁰=0' : s.converged ? '已满足两项停止条件' : current >= 150 ? '达到演示上限；尚未满足停止条件' : '尚未满足两项停止条件';
  for (const id of ['primal','dual','objective']) $(id).textContent = s[id].toExponential(3);
  $('psnr').textContent = `${s.psnr.toFixed(2)} dB`; drawChart();
  if (detailMode) renderDetail();
}
function renderFormulaBoard(phase) {
  const board = $('formula-board'); board.replaceChildren();
  for (const row of detailFormulaRows(phase)) {
    const line = document.createElement('div'); line.className = 'formula-row';
    const name = document.createElement('span'); name.className = 'formula-name'; name.textContent = row.name; line.append(name);
    const scroll = document.createElement('div'); scroll.className = 'formula-scroll';
    const expression = document.createElement('div'); expression.className = 'formula-expression';
    for (let i = 0; i < row.parts.length; i++) {
      if (row.highlight && i === row.highlight.start) {
        const term = document.createElement('span'); term.className = 'brace-term';
        const text = document.createElement('span'); text.className = 'brace-text';
        text.textContent = row.parts.slice(i, row.highlight.end + 1).join(''); term.append(text);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 20'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M1 1 C1 10 5 14 20 14 H80 C94 14 96 16 100 19 C104 16 106 14 120 14 H180 C195 14 199 10 199 1');
        svg.append(path); term.append(svg);
        const label = document.createElement('span'); label.className = 'brace-label'; label.textContent = row.highlight.label; term.append(label);
        expression.append(term); i = row.highlight.end;
      } else {
        const part = document.createElement('span'); part.textContent = row.parts[i]; expression.append(part);
      }
    }
    scroll.append(expression); line.append(scroll); board.append(line);
  }
}
function renderDetail() {
  const frame = detailFrame(solver, detailIndex, Number($('lambda').value), Number($('rho').value), detailDirection);
  const position = detailPosition(detailIndex);
  renderFormulaBoard(position.phase);
  $('detail-title').textContent = frame.title; $('detail-formula').textContent = frame.formula;
  $('detail-extra').textContent = frame.extra; $('detail-explain').textContent = frame.explain;
  $('x-derivation').hidden = position.phase !== 1;
  if (position.phase !== 1) $('x-derivation').open = false;
  $('z-derivation').hidden = position.phase !== 4;
  if (position.phase !== 4) $('z-derivation').open = false;
  $('detail-position').textContent = position.phase ? `第 ${position.k + 1} 轮 · 第 ${position.phase} / ${DETAIL_STEPS} 步` : '第 0 轮 · 初始化';
  $('detail-back').disabled = detailIndex === 0; $('detail-next').disabled = detailIndex === 150 * DETAIL_STEPS;
  renderVisual(null, $('detail-visual'), frame.specs);
  renderInspector();
  for (const canvas of $('detail-visual').querySelectorAll('canvas')) {
    canvas.onclick = event => {
      const box = canvas.getBoundingClientRect();
      $('inspect-row').value = Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientY - box.top) / box.height * SIZE)));
      $('inspect-col').value = Math.min(SIZE - 1, Math.max(0, Math.floor((event.clientX - box.left) / box.width * SIZE)));
      inspectionVisible = true; renderDetail();
    };
    const row = Number($('inspect-row').value), col = Number($('inspect-col').value);
    if ([row, col].every(v => Number.isInteger(v) && v >= 0 && v < SIZE)) {
      const ctx = canvas.getContext('2d'), cell = canvas.width / SIZE;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(col * cell, row * cell, cell, cell);
      ctx.strokeStyle = '#b72930'; ctx.lineWidth = 2; ctx.strokeRect(col * cell, row * cell, cell, cell);
    }
  }
}
let codeLanguage = 'python', pythonSource = '', pythonError = '';
function renderSoftPlot(threshold, input, result) {
  const svg = $('soft-function'), range = Math.max(.5, threshold * 1.5, Math.abs(input || 0) * 1.15);
  const x = v => 72 + (v + range) / (2 * range) * 520, y = z => 268 - (z + range) / (2 * range) * 220;
  const format = v => Number(v.toPrecision(3)).toString();
  svg.replaceChildren(); svg.dataset.threshold = threshold;
  const add = (tag, attrs, text) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text; svg.append(node); return node;
  };
  add('title', {}, '软阈值函数：输入 v，输出 z，阈值 λ/ρ = ' + format(threshold));
  for (const tick of [-range, -range / 2, 0, range / 2, range]) {
    add('line', { x1:x(tick), y1:48, x2:x(tick), y2:268, class:'soft-grid' });
    add('line', { x1:72, y1:y(tick), x2:592, y2:y(tick), class:'soft-grid' });
    add('text', { x:x(tick), y:291, 'text-anchor':'middle' }, format(tick));
    add('text', { x:62, y:y(tick) + 6, 'text-anchor':'end' }, format(tick));
  }
  add('rect', { x:x(-threshold), y:48, width:x(threshold)-x(-threshold), height:220, fill:'#e5efcf', opacity:'.45' });
  add('line', { x1:72, y1:y(0), x2:592, y2:y(0), class:'soft-axis' });
  add('line', { x1:x(0), y1:48, x2:x(0), y2:268, class:'soft-axis' });
  add('path', { d:`M${x(-range)},${y(-range)} L${x(range)},${y(range)}`, class:'soft-identity' });
  for (const sign of [-1, 1]) {
    add('line', { x1:x(sign*threshold), y1:48, x2:x(sign*threshold), y2:268, class:'soft-threshold' });
    add('text', { x:x(sign*threshold)+sign*6, y:321, 'text-anchor':sign < 0 ? 'end' : 'start', class:'soft-threshold-label' }, sign < 0 ? '−λ/ρ' : '+λ/ρ');
  }
  const points = [-range, -threshold, threshold, range].map(v => `${x(v)},${y(shrink(v, threshold))}`);
  add('path', { d:'M'+points.join(' L'), class:'soft-curve' });
  if (Number.isFinite(input)) add('circle', { cx:x(input), cy:y(result), r:6, class:'soft-point', 'data-v':input, 'data-z':result });
  add('text', { x:72, y:25 }, '输出 z = soft(v, λ/ρ)');
  add('text', { x:592, y:351, 'text-anchor':'end' }, '输入 v');
  $('soft-function-note').textContent = `红线：soft；灰虚线：z=v。当前 λ/ρ=${format(threshold)}；绿色区间内输出为 0。${Number.isFinite(input) ? `黑点：所选分量 v=${format(input)} → z=${format(result)}。` : ''}坐标范围随阈值及选中值自动调整。`;
}
function renderInspector() {
  const { k, phase } = detailPosition(detailIndex);
  $('frequency-controls').hidden = phase !== 1;
  const ids = ['inspect-row', 'inspect-col', 'inspect-freq-row', 'inspect-freq-col'];
  try {
    if (ids.some(id => $(id).value.trim() === '')) throw new Error('请输入 0–63 的整数坐标。');
    const [row, col, p, q] = ids.map(id => Number($(id).value));
    const trace = inspectStep(solver, detailIndex, Number($('lambda').value), Number($('rho').value), detailDirection, row, col, p, q);
    renderSoftPlot(Number($('lambda').value) / Number($('rho').value), phase === 4 ? trace.values[0].value : undefined, trace.result);
    const python = codeLanguage === 'python';
    $('inspect-code').textContent = python ? (pythonSource ? pythonStep(pythonSource, phase) : pythonError || '正在加载 Python 代码…') : trace.code;
    $('inspect-code-label').textContent = python ? 'Python / NumPy 等价实现：x_next、z_next、u_next 表示 k+1 轮，z、u 是 k 轮；lam=λ。x、b 为二维图像，dx、z、u 为 [方向, 行, 列] 两通道数组。右侧数值由网页求解器计算，已与此 Python 实现核对。' : trace.codeLabel;
    $('inspect-note').textContent = python && phase === 1 ? 'h_hat 对应 H 的频率响应 h，ell 对应 DᵀD 的特征值 ℓ；numerator、denominator、x_hat 分别对应右侧的复数分子、分母和商。NumPy 直接计算复数。像素 [i,j] 与频点 [p,q] 属于不同空间：一个频点影响整张图，代码中的 p、q 网格覆盖全部频点。' : trace.note;
    $('inspect-context').textContent = `${phase ? `第 ${k + 1} 轮 · 第 ${phase} 步` : '初始化'} · 像素 [${row},${col}] · ${detailDirection ? '垂直 Dᵧ' : '水平 Dₓ'}${phase === 1 ? ` · 频点 [${p},${q}]` : ''}`;
    $('inspect-output').hidden = !inspectionVisible;
    $('inspect-values').replaceChildren(...trace.values.map(({ name, value }) => {
      const row = document.createElement('tr'), label = document.createElement('td'), number = document.createElement('td');
      label.textContent = name; number.textContent = value.toPrecision(8); row.append(label, number); return row;
    }));
    $('inspect-calculation').textContent = trace.calculation;
  } catch (error) { $('inspect-output').hidden = true; $('inspect-context').textContent = error.message; }
}
const codeTabs = [$('code-python'), $('code-javascript')];
for (const tab of codeTabs) {
  tab.onclick = () => {
    codeLanguage = tab.dataset.language;
    for (const item of codeTabs) { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }
    $('inspect-code-panel').setAttribute('aria-labelledby', tab.id); renderInspector();
  };
  tab.onkeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = codeTabs[event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - codeTabs.indexOf(tab)]; next.click(); next.focus();
  };
}
fetch('solver.py').then(response => { if (!response.ok) throw new Error(); return response.text(); }).then(source => {
  pythonStep(source, 0); pythonSource = source; renderInspector();
}).catch(() => { pythonError = 'Python 代码加载失败，请刷新重试，或点击下方链接下载。'; renderInspector(); });
for (const id of ['inspect-row', 'inspect-col', 'inspect-freq-row', 'inspect-freq-col']) $(id).onchange = () => { inspectionVisible = true; renderDetail(); };
$('inspect-calculate').onclick = () => { inspectionVisible = true; renderDetail(); };
function setDetailMode(enabled) {
  pause();
  if (enabled && !detailMode) detailIndex = current * DETAIL_STEPS;
  if (!enabled && detailMode) current = Math.floor(detailIndex / DETAIL_STEPS);
  detailMode = enabled; $('overview-panel').hidden = enabled; $('detail-panel').hidden = !enabled;
  $('overview-mode').setAttribute('aria-pressed', String(!enabled)); $('detail-mode').setAttribute('aria-pressed', String(enabled));
  renderState();
}
$('overview-mode').onclick = () => setDetailMode(false); $('detail-mode').onclick = () => setDetailMode(true);
$('detail-next').onclick = () => {
  if (detailIndex >= 150 * DETAIL_STEPS) return;
  const nextIndex = detailIndex + 1, { k } = detailPosition(nextIndex);
  if (solver.history.length <= k + 1) solver.step();
  detailIndex = nextIndex; current = Math.floor(detailIndex / DETAIL_STEPS); renderState();
};
$('detail-back').onclick = () => { if (!detailIndex) return; detailIndex--; current = Math.floor(detailIndex / DETAIL_STEPS); renderState(); };
for (const [id, direction] of [['dir-x', 0], ['dir-y', 1]]) $(id).onclick = () => {
  detailDirection = direction; $('dir-x').setAttribute('aria-pressed', String(direction === 0)); $('dir-y').setAttribute('aria-pressed', String(direction === 1)); renderDetail();
};
function pause() { clearInterval(timer); timer = null; $('play').textContent = '播放'; }
function advance() {
  if (current >= 150) { pause(); return; }
  if (current === solver.history.length - 1) solver.step(); current++; renderState();
}
$('step').onclick = () => { pause(); advance(); };
$('back').onclick = () => { pause(); current = Math.max(0, current - 1); renderState(); };
$('play').onclick = () => {
  if (timer) { pause(); return; }
  if (current >= 150) return;
  $('play').textContent = '暂停'; timer = setInterval(() => { advance(); if (solver.history[current].converged || current >= 150) pause(); }, 140);
};
$('timeline').oninput = () => { pause(); current = Number($('timeline').value); renderState(); };
function reset() {
  pause(); const lambda = Number($('lambda').value), rho = Number($('rho').value);
  $('lambda-value').textContent = lambda.toFixed(3); $('rho-value').textContent = rho.toFixed(2);
  solver = createSolver(lambda, rho); current = 0; detailIndex = 0; renderState();
}
$('reset').onclick = reset; $('lambda').oninput = reset; $('rho').oninput = reset;
$('detail-reset').onclick = reset;
$('updates').innerHTML = '<div><h3>1 / x：拟合观测与梯度目标</h3><code>(HᵀH+ρDᵀD)x⁺=Hᵀb+ρDᵀ(z−u)</code></div><div><h3>2 / z：梯度软阈值</h3><code>z⁺=soft(Dx⁺+u, λ/ρ)</code></div><div><h3>3 / u：积累不一致</h3><code>u⁺=u+Dx⁺−z⁺</code></div>';
fetch('solver.mjs').then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(s => { $('source').textContent = s; }).catch(() => { $('source').textContent = '代码加载失败，请通过上方链接查看。'; });
renderLesson(); reset(); sync();
