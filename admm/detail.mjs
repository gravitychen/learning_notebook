import { gradient } from './solver.mjs';
export const DETAIL_STEPS = 6;
export function detailFormulaRows(phase) {
  if (!Number.isInteger(phase) || phase < 0 || phase > DETAIL_STEPS) throw new RangeError('Invalid detail phase');
  const rows = [
    { name: '① x 更新', parts: ['xᵏ⁺¹ = ', 'argminₓ {½‖Hx − b‖₂² + ρ/2 ‖Dx − zᵏ + uᵏ‖₂²}'] },
    { name: '② z 更新', parts: ['zᵏ⁺¹ = ', 'soft(', 'Dxᵏ⁺¹', ' + uᵏ', ', λ/ρ)'] },
    { name: '③ u 更新', parts: ['uᵏ⁺¹ = ', 'uᵏ + ', 'Dxᵏ⁺¹ − zᵏ⁺¹'] }
  ];
  // Ranges select existing terms; concatenating every row always recovers the same formula.
  const highlights = [null, [0, 1, 1, '求新图像 x'], [1, 2, 2, '计算新梯度 Dx'], [1, 2, 3, '阈值输入 v'], [1, 1, 4, '软阈值得到新 z'], [2, 2, 2, '约束偏差 r'], [2, 1, 2, '用偏差更新 u']];
  if (highlights[phase]) {
    const [row, start, end, label] = highlights[phase];
    rows[row].highlight = { start, end, label };
  }
  return rows;
}
export const detailPosition = index => index === 0 ? { k: 0, phase: 0 } : { k: Math.floor((index - 1) / DETAIL_STEPS), phase: (index - 1) % DETAIL_STEPS + 1 };
export function detailFrame(solver, index, lambda, rho, direction = 0) {
  if (!Number.isInteger(index) || index < 0 || index > 150 * DETAIL_STEPS || ![0, 1].includes(direction)) throw new RangeError('Invalid detail position');
  const { k, phase } = detailPosition(index), old = solver.history[k], next = phase ? solver.history[k + 1] : null;
  if (!old || (phase && !next)) throw new Error('Iteration has not been computed');
  const d = direction === 0 ? 'ₓ' : 'ᵧ', axis = direction === 0 ? '水平' : '垂直';
  const image = (title, data, signed = false) => ({ title, data, signed, range: .5, note: signed ? `${axis}通道；蓝 −0.5 / 白 0 / 红 +0.5` : '固定亮度范围 0–1，显示时裁剪' });
  if (!phase) return { title: '初始化：准备第 0 轮', formula: 'x⁰ = b，z⁰ = Dx⁰，u⁰ = 0', extra: '上标 0 表示初始化；x 与 z、u 所在的空间不同。', explain: 'x 是图像亮度；z、u 是两个方向的梯度空间变量。选择水平或垂直查看对应通道。', specs: [image('初始图像 x⁰', old.x), image(`初始梯度 z${d}⁰`, old.z[direction], true), image(`初始乘子 u${d}⁰`, old.u[direction], true)] };
  const dx = gradient(next.x), v = dx[direction].map((value, i) => value + old.u[direction][i]);
  const residual = dx[direction].map((value, i) => value - next.z[direction][i]);
  const inputs = { old, next, dx, v, residual };
  if (phase === 1) return { title: '① 更新图像 x', formula: `xᵏ⁺¹ = argminₓ {½‖Hx − b‖₂² + ρ/2 ‖Dx − zᵏ + uᵏ‖₂²}`, extra: `(HᵀH + ρDᵀD)xᵏ⁺¹ = Hᵀb + ρDᵀ(zᵏ − uᵏ)　｜　本轮 k = ${k}，ρ = ${rho.toFixed(2)}`, explain: `固定第 ${k} 轮的 z 和 u，求新的 x；中图仅展示目标梯度的${axis}分量，计算使用两个方向。`, inputs, specs: [image('固定观测 b', solver.observed), image(`目标梯度 z${d}ᵏ − u${d}ᵏ`, old.z[direction].map((a, i) => a - old.u[direction][i]), true), image(`第 ${k + 1} 轮新图像 x`, next.x)] };
  if (phase === 2) return { title: '② 计算新图像的梯度 Dx', formula: 'Dₓx[i,j] = x[i,j+1] − x[i,j]；Dᵧx[i,j] = x[i+1,j] − x[i,j]', extra: `D 使用周期边界；对新图像 xᵏ⁺¹ 同时计算水平与垂直通道。`, explain: `本页显示第 ${k + 1} 轮的${axis}相邻像素差；旧的 zᵏ 还没有更新。`, inputs, specs: [image('新图像 xᵏ⁺¹', next.x), image(`新梯度 D${d}xᵏ⁺¹`, dx[direction], true), image(`旧辅助梯度 z${d}ᵏ`, old.z[direction], true)] };
  if (phase === 3) return { title: '③ 形成软阈值输入 v', formula: 'vᵏ⁺¹ = Dxᵏ⁺¹ + uᵏ', extra: 'v 只是本步的临时输入；它与 Dx、z、u 在同一个梯度空间。', explain: `新梯度加上第 ${k} 轮的旧 u；此时 z 仍是旧值，接下来才计算新 z。`, inputs, specs: [image(`新梯度 D${d}xᵏ⁺¹`, dx[direction], true), image(`旧修正量 u${d}ᵏ`, old.u[direction], true), image(`阈值输入 v${d}ᵏ⁺¹`, v, true)] };
  if (phase === 4) return { title: '④ 用软阈值更新 z', formula: 'zᵏ⁺¹ = soft(vᵏ⁺¹, λ/ρ) = sign(vᵏ⁺¹) · max(|vᵏ⁺¹| − λ/ρ, 0)', extra: `本轮 λ = ${lambda.toFixed(3)}，ρ = ${rho.toFixed(2)}，阈值 λ/ρ = ${(lambda / rho).toFixed(3)}。`, explain: '每个方向的每个分量独立计算：小于阈值的归零，较大的向零收缩；左右图使用同一色标。', inputs, specs: [image(`阈值输入 v${d}ᵏ⁺¹`, v, true), image(`旧辅助梯度 z${d}ᵏ`, old.z[direction], true), image(`新辅助梯度 z${d}ᵏ⁺¹`, next.z[direction], true)] };
  if (phase === 5) return { title: '⑤ 计算约束偏差 r', formula: 'rᵏ⁺¹ = Dxᵏ⁺¹ − zᵏ⁺¹', extra: '这是梯度空间中 Dx 与 z 的偏差；与观测误差 Hx−b 不同。', explain: '比较刚更新的新梯度和新辅助梯度；偏差 r 将在下一步用于更新 u。', inputs, specs: [image(`新梯度 D${d}xᵏ⁺¹`, dx[direction], true), image(`新辅助梯度 z${d}ᵏ⁺¹`, next.z[direction], true), image(`约束偏差 r${d}ᵏ⁺¹`, residual, true)] };
  return { title: '⑥ 更新缩放乘子 u', formula: 'uᵏ⁺¹ = uᵏ + rᵏ⁺¹ = uᵏ + Dxᵏ⁺¹ − zᵏ⁺¹', extra: '未缩放乘子 yᵏ⁺¹ = ρuᵏ⁺¹；等价于 yᵏ⁺¹ = yᵏ + ρrᵏ⁺¹。', explain: `将本轮偏差加到旧 u；至此第 ${k + 1} 轮完成。u、y 是算法变量，不是图像亮度。`, inputs, specs: [image(`旧修正量 u${d}ᵏ`, old.u[direction], true), image(`本轮偏差 r${d}ᵏ⁺¹`, residual, true), image(`新修正量 u${d}ᵏ⁺¹`, next.u[direction], true)] };
}
