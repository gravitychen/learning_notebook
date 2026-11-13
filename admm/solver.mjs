// Periodic boundaries keep the convolution and finite differences diagonal in Fourier space.
export const SIZE = 64;
const N = SIZE * SIZE;
export function fft2(real, inverse = false, imag = new Float64Array(N)) {
  const re = Float64Array.from(real), im = Float64Array.from(imag);
  function line(start, stride) {
    for (let i = 1, j = 0; i < SIZE; i++) {
      let bit = SIZE >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { const a = start + i * stride, b = start + j * stride; [re[a], re[b]] = [re[b], re[a]]; [im[a], im[b]] = [im[b], im[a]]; }
    }
    for (let len = 2; len <= SIZE; len *= 2) {
      const angle = (inverse ? 2 : -2) * Math.PI / len;
      for (let i = 0; i < SIZE; i += len) for (let j = 0; j < len / 2; j++) {
        const a = start + (i + j) * stride, b = a + len / 2 * stride;
        const c = Math.cos(angle * j), s = Math.sin(angle * j);
        const tr = c * re[b] - s * im[b], ti = s * re[b] + c * im[b];
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
    if (inverse) for (let i = 0; i < SIZE; i++) { re[start + i * stride] /= SIZE; im[start + i * stride] /= SIZE; }
  }
  for (let i = 0; i < SIZE; i++) line(i * SIZE, 1);
  for (let i = 0; i < SIZE; i++) line(i, SIZE);
  return { re, im };
}
export function gradient(x) {
  const gx = new Float64Array(N), gy = new Float64Array(N);
  for (let y = 0; y < SIZE; y++) for (let col = 0; col < SIZE; col++) {
    const i = y * SIZE + col;
    gx[i] = x[y * SIZE + (col + 1) % SIZE] - x[i];
    gy[i] = x[((y + 1) % SIZE) * SIZE + col] - x[i];
  }
  return [gx, gy];
}
export function adjoint([px, py]) {
  return Float64Array.from(px, (_, i) => px[Math.floor(i / SIZE) * SIZE + (i % SIZE + SIZE - 1) % SIZE] - px[i] + py[(i + N - SIZE) % N] - py[i]);
}
export const norm = a => Math.hypot(...a);
export const shrink = (v, t) => Math.sign(v) * Math.max(Math.abs(v) - t, 0);
const eigen = Float64Array.from({ length: N }, (_, i) => 4 * (Math.sin(Math.PI * (i % SIZE) / SIZE) ** 2 + Math.sin(Math.PI * Math.floor(i / SIZE) / SIZE) ** 2));
const H = eigen.map(v => Math.exp(-(1.4 ** 2) * v / 2));
export function blur(x) {
  const f = fft2(x);
  return fft2(f.re.map((v, i) => v * H[i]), true, f.im.map((v, i) => v * H[i])).re;
}
export function fixture() {
  const truth = Float64Array.from({ length: N }, (_, i) => {
    const x = i % SIZE, y = Math.floor(i / SIZE);
    if ((x - 44) ** 2 + (y - 21) ** 2 < 10 ** 2) return .85;
    if (x > 10 && x < 30 && y > 12 && y < 40) return .65;
    if (x > 15 && x < 53 && y > 46 && y < 52) return .95;
    return .08;
  });
  let seed = 17;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed + 1) / 4294967297; };
  const observed = blur(truth).map(v => v + .02 * Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()));
  return { truth, observed };
}
export function solveXStep(fy, z, u, rho) {
  const targetGradient = z.map((a, j) => a.map((v, i) => v - u[j][i]));
  const correction = adjoint(targetGradient);
  const d = fft2(correction);
  const denominator = H.map((h, i) => h ** 2 + rho * eigen[i]);
  const numeratorRe = fy.re.map((v, i) => H[i] * v + rho * d.re[i]);
  const numeratorIm = fy.im.map((v, i) => H[i] * v + rho * d.im[i]);
  const re = numeratorRe.map((v, i) => v / denominator[i]);
  const im = numeratorIm.map((v, i) => v / denominator[i]);
  const x = fft2(re, true, im).re;
  return { x, fy, targetGradient, correction, d, numeratorRe, numeratorIm, denominator, re, im, blurGain: H, derivativeGain: eigen };
}
export function createSolver(lambda = .015, rho = .1) {
  if (!Number.isFinite(lambda) || lambda <= 0 || !Number.isFinite(rho) || rho <= 0) throw new Error('lambda and rho must be positive');
  const { truth, observed } = fixture(), fy = fft2(observed);
  function snapshot(x, z, u, k, previousZ = z) {
    const dx = gradient(x), r = dx.map((a, j) => a.map((v, i) => v - z[j][i]));
    const residual = blur(x).map((v, i) => v - observed[i]);
    const primal = Math.hypot(norm(r[0]), norm(r[1]));
    const dual = rho * norm(adjoint(z.map((a, j) => a.map((v, i) => v - previousZ[j][i]))));
    const epsP = Math.sqrt(2 * N) * 1e-4 + 1e-3 * Math.max(Math.hypot(norm(dx[0]), norm(dx[1])), Math.hypot(norm(z[0]), norm(z[1])));
    const epsD = Math.sqrt(N) * 1e-4 + 1e-3 * rho * norm(adjoint(u));
    const objective = .5 * norm(residual) ** 2 + lambda * (dx[0].reduce((s, v) => s + Math.abs(v), 0) + dx[1].reduce((s, v) => s + Math.abs(v), 0));
    const mse = x.reduce((s, v, i) => s + (v - truth[i]) ** 2, 0) / N;
    return { x, z, u, k, r, residual, primal, dual, epsP, epsD, objective, psnr: -10 * Math.log10(mse), converged: k > 0 && primal <= epsP && dual <= epsD };
  }
  const history = [snapshot(observed.slice(), gradient(observed), [new Float64Array(N), new Float64Array(N)], 0)];
  function step() {
    const last = history.at(-1);
    const { x } = solveXStep(fy, last.z, last.u, rho);
    const dx = gradient(x);
    const z = dx.map((a, j) => a.map((v, i) => shrink(v + last.u[j][i], lambda / rho)));
    const u = dx.map((a, j) => a.map((v, i) => last.u[j][i] + v - z[j][i]));
    const state = snapshot(x, z, u, last.k + 1, last.z);
    history.push(state); return state;
  }
  return { truth, observed, history, step };
}
