import { SIZE, fft2, gradient, shrink, solveXStep } from './solver.mjs';
import { detailPosition, detailFrame } from './detail.mjs';
const number = value => Number(value).toPrecision(8);
export function pythonStep(source, phase) {
  const cells = source.trim().split(/^# %%[^\n]*(?:\n|$)/m);
  if (cells.length !== 9 || !Number.isInteger(phase) || phase < 0 || phase > 6) throw new Error('Python 代码分节不完整');
  const calls = ['x, z, u = initialize(b)', 'x_next = solve_x_step(b, z, u, rho)', 'dx = gradient(x_next)', 'v = threshold_input(dx, u)', 'z_next = shrink(v, lam, rho)', 'r = primal_residual(dx, z_next)', 'u_next = update_u(u, r)'];
  return [cells[0].trim(), phase === 0 ? cells[3].trim() : '', cells[phase + 1].trim(), '# 本小步的调用；输入使用当前轮次的数据', calls[phase]].filter(Boolean).join('\n\n');
}
export function inspectStep(solver, index, lambda, rho, direction, row, col, freqRow = 2, freqCol = 3) {
  if (![row, col, freqRow, freqCol].every(v => Number.isInteger(v) && v >= 0 && v < SIZE)) throw new RangeError('坐标必须是 0–63 的整数');
  const frame = detailFrame(solver, index, lambda, rho, direction), { k, phase } = detailPosition(index);
  const i = row * SIZE + col, channel = direction ? 'y' : 'x', axis = direction ? '垂直' : '水平';
  const values = [], add = (name, value) => { values.push({ name, value }); return value; };
  if (!phase) {
    const s = solver.history[0];
    add('b[i,j]：观测亮度', solver.observed[i]); add('x⁰[i,j]：初始亮度', s.x[i]);
    add(`z_${channel}⁰[i,j]：初始${axis}梯度`, s.z[direction][i]); add(`u_${channel}⁰[i,j]：初始修正`, s.u[direction][i]);
    return { code: 'const x = observed.slice();\nconst z = gradient(x);\nconst u = [new Float64Array(SIZE * SIZE), new Float64Array(SIZE * SIZE)];', values, result: s.x[i], calculation: 'x⁰[i,j] = b[i,j] = ' + number(s.x[i]), note: '索引从 0 开始。x 是亮度；z、u 是梯度空间变量。', codeLabel: '与初始化相同的 JavaScript 操作' };
  }
  const { old, next, dx, v, residual } = frame.inputs;
  if (phase === 1) {
    const trace = solveXStep(fft2(solver.observed), old.z, old.u, rho), f = freqRow * SIZE + freqCol;
    add('b[i,j]：观测亮度', solver.observed[i]); add('z_xᵏ[i,j]−u_xᵏ[i,j]：水平目标梯度', trace.targetGradient[0][i]);
    add('z_yᵏ[i,j]−u_yᵏ[i,j]：垂直目标梯度', trace.targetGradient[1][i]); add('Dᵀ(zᵏ−uᵏ)[i,j]：图像空间修正', trace.correction[i]);
    add('ρ：当前罚参数', rho); add('FFT(b)[p,q] 实部', trace.fy.re[f]); add('FFT(b)[p,q] 虚部', trace.fy.im[f]);
    add('H 的频率响应 h[p,q]', trace.blurGain[f]); add('DᵀD 的特征值 ℓ[p,q]', trace.derivativeGain[f]);
    add('FFT(Dᵀ(zᵏ−uᵏ))[p,q] 实部', trace.d.re[f]); add('FFT(Dᵀ(zᵏ−uᵏ))[p,q] 虚部', trace.d.im[f]);
    add('分子实部', trace.numeratorRe[f]); add('分子虚部', trace.numeratorIm[f]); add('分母 h²+ρℓ', trace.denominator[f]);
    add('FFT(xᵏ⁺¹)[p,q] 实部', trace.re[f]); add('FFT(xᵏ⁺¹)[p,q] 虚部', trace.im[f]); add('逆 FFT 后 xᵏ⁺¹[i,j]', next.x[i]);
    return { code: solveXStep.toString(), codeLabel: '求解器实际调用的函数：solveXStep', values, result: next.x[i],
      calculation: `频点 [p,q]=[${freqRow},${freqCol}]：\n实部 = ${number(trace.numeratorRe[f])} / ${number(trace.denominator[f])} = ${number(trace.re[f])}\n虚部 = ${number(trace.numeratorIm[f])} / ${number(trace.denominator[f])} = ${number(trace.im[f])}\n所有频点一起逆 FFT，得到 xᵏ⁺¹[${row},${col}] = ${number(next.x[i])}`,
      note: 'h 是 H 的傅里叶响应，ℓ 是 DᵀD 的特征值；fy=FFT(b)，d=FFT(Dᵀ(zᵏ−uᵏ))。频点 [p,q] 和像素 [i,j] 属于不同空间：一个频点影响整张图。代码中的 re、im 分别是实部、虚部。' };
  }
  let code, calculation, result;
  if (phase === 2) {
    const neighborRow = direction ? (row + 1) % SIZE : row, neighborCol = direction ? col : (col + 1) % SIZE;
    const a = add(`xᵏ⁺¹[${neighborRow},${neighborCol}]：相邻亮度`, next.x[neighborRow * SIZE + neighborCol]);
    const b = add(`xᵏ⁺¹[${row},${col}]：本点亮度`, next.x[i]); result = dx[direction][i];
    code = gradient.toString(); calculation = `D_${channel}xᵏ⁺¹[i,j] = ${number(a)} − (${number(b)}) = ${number(result)}`;
  } else if (phase === 3) {
    const a = add(`D_${channel}xᵏ⁺¹[i,j]：新梯度`, dx[direction][i]), b = add(`u_${channel}ᵏ[i,j]：旧修正`, old.u[direction][i]);
    result = v[i]; code = 'const v = dx[direction][i] + old.u[direction][i];';
    calculation = `v[i,j] = ${number(a)} + (${number(b)}) = ${number(result)}`;
  } else if (phase === 4) {
    const a = add('v[i,j]：阈值输入', v[i]), threshold = add('λ / ρ：阈值', lambda / rho);
    add('λ', lambda); add('ρ', rho); add('sign(v)', Math.sign(a)); add('|v|', Math.abs(a)); add('max(|v|−λ/ρ, 0)', Math.max(Math.abs(a) - threshold, 0));
    result = next.z[direction][i]; code = shrink.toString() + '\nconst z = shrink(v, lambda / rho);';
    calculation = `z_${channel}ᵏ⁺¹[i,j] = sign(${number(a)}) × max(${number(Math.abs(a))} − ${number(threshold)}, 0) = ${number(result)}`;
  } else if (phase === 5) {
    const a = add(`D_${channel}xᵏ⁺¹[i,j]：新梯度`, dx[direction][i]), b = add(`z_${channel}ᵏ⁺¹[i,j]：新辅助梯度`, next.z[direction][i]);
    result = residual[i]; code = 'const r = dx[direction][i] - next.z[direction][i];';
    calculation = `r_${channel}ᵏ⁺¹[i,j] = ${number(a)} − (${number(b)}) = ${number(result)}`;
  } else {
    const a = add(`u_${channel}ᵏ[i,j]：旧修正`, old.u[direction][i]), b = add(`r_${channel}ᵏ⁺¹[i,j]：本轮偏差`, residual[i]);
    result = next.u[direction][i]; code = 'const u = old.u[direction][i] + dx[direction][i] - next.z[direction][i];';
    calculation = `u_${channel}ᵏ⁺¹[i,j] = ${number(a)} + (${number(b)}) = ${number(result)}`;
  }
  add('本步实际结果', result);
  return { code, values, result, calculation, codeLabel: phase === 2 ? '求解器实际调用的函数：gradient' : '当前像素的等价展开（与求解器相同运算）',
    note: `第 ${k + 1} 轮，${axis}通道。坐标从 0 开始，越过边界时回到另一侧。以下数字来自实际迭代数组，保留 8 位有效数字；计算使用完整 Float64 精度。` };
}
