import numpy as np


# %% 0 初始化
def initialize(b):
    b = np.asarray(b, dtype=np.float64)
    if b.ndim != 2 or b.size == 0 or not np.isfinite(b).all():
        raise ValueError("b must be a finite, nonempty 2D image")
    x = b.copy()
    z = gradient(x)
    u = np.zeros_like(z)
    return x, z, u


# %% 1 更新图像 x
def adjoint(p):
    # D 的伴随：把两通道梯度送回图像空间；首尾相连。
    px, py = p
    return (np.roll(px, 1, axis=1) - px
            + np.roll(py, 1, axis=0) - py)


def solve_x_step(b, z, u, rho):
    # 对应 (HᵀH + ρDᵀD)x_next = Hᵀb + ρDᵀ(z-u)。
    height, width = b.shape
    p = np.arange(height)[:, None]
    q = np.arange(width)[None, :]
    ell = 4 * (np.sin(np.pi * p / height)**2
               + np.sin(np.pi * q / width)**2)
    # 本例 H 是对称热扩散模糊，h_hat 是它的实数频率响应。
    h_hat = np.exp(-(1.4**2) * ell / 2)
    target_gradient = z - u
    correction = adjoint(target_gradient)
    numerator = (h_hat * np.fft.fft2(b)
                 + rho * np.fft.fft2(correction))
    denominator = h_hat**2 + rho * ell
    x_hat = numerator / denominator
    x_next = np.fft.ifft2(x_hat).real
    return x_next


# %% 2 计算新梯度 Dx
def gradient(x):
    # 通道 0：水平 Dₓ；通道 1：垂直 Dᵧ；周期边界。
    dx = np.roll(x, -1, axis=1) - x
    dy = np.roll(x, -1, axis=0) - x
    return np.stack([dx, dy])


# %% 3 计算阈值输入 v
def threshold_input(dx, u):
    # dx = D x_next，u 仍然是上一轮的 uᵏ。
    return dx + u


# %% 4 软阈值更新 z
def shrink(v, lam, rho):
    # lam 是公式中的 λ；正负大梯度都朝 0 收缩。
    threshold = lam / rho
    return np.sign(v) * np.maximum(np.abs(v) - threshold, 0)


# %% 5 计算约束偏差 r
def primal_residual(dx, z_next):
    return dx - z_next


# %% 6 累积偏差更新 u
def update_u(u, r):
    return u + r


# %% 一整轮：与上面的六个小步一一对应
def admm_step(b, z, u, lam=0.015, rho=0.1):
    if not (np.isfinite(lam) and lam > 0
            and np.isfinite(rho) and rho > 0):
        raise ValueError("lam and rho must be finite and positive")
    x_next = solve_x_step(b, z, u, rho)
    dx = gradient(x_next)
    v = threshold_input(dx, u)
    z_next = shrink(v, lam, rho)
    r = primal_residual(dx, z_next)
    u_next = update_u(u, r)
    return dict(x=x_next, dx=dx, v=v, z=z_next, r=r, u=u_next)
