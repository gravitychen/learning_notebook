import { gradient, shrink } from './solver.mjs';
import { teachingStates, visualSpec } from './visuals.mjs';
const step = (title, equation, caption, detail, scene) => ({ title, equation, caption, detail, scene });
export const walkthrough = {
  2: [
    step('第一步：图像是怎样变模糊的？', 'b = Hx★ + ε', '清晰场景 x★ 经过模糊 H，再叠加噪声 ε，得到观测 b。', 'x★是合成示例中用于产生观测的真值。真实逆问题通常不知道真值，算法只能使用观测b和已知模糊模型H。', 'forward'),
    step('逆问题：从 b 猜测 x', '已知 b、H　　→　寻找 x', '我们希望找到一个 x，使 Hx 看起来像观测 b。', 'x是待恢复的图像；Hx是按成像模型模拟的观测。H通常会压制细节，噪声也使得直接反演不稳定。', 'forward'),
    step('如何衡量预测和观测的差别？', 'f(x) = ½ ‖Hx − b‖₂²', 'Hx−b 是观测空间的误差；平方后求和，得到数据项。', '这里的误差和后面约束偏差r=Dx−z是两个不同的量：前者比较预测与观测，后者比较两种梯度。', 'forward')
  ],
  3: [
    step('从图像 x 到梯度 Dx', 'Dx = (Dₓx, Dᵧx)', 'D 计算相邻像素的亮度差；平坦区域差值小，边缘差值大。', 'Dx包含水平和垂直两个通道。Dₓ中的下标是方向，区别于后面乘子y；它不是把D乘以x两次。', 'gradients'),
    step('希望什么样的图像？', '‖Dx‖₁ = Σᵢ (|Dₓxᵢ| + |Dᵧxᵢ|)', '平坦区域多、边缘较少的图像，通常有比较稀疏的梯度。', '这是本例采用的各向异性TV先验，不是所有图像都必然满足。过强的先验也可能抹去细节。', 'gradients'),
    step('把两个要求放在一起', 'minₓ f(x) + λ‖Dx‖₁', '数据项要求解释观测；TV 项表达对梯度的偏好。', 'λ控制两项的权衡。这个目标同时涉及x和它的梯度Dx，接下来将引入z，让两项分别处理。', 'gradients')
  ],
  4: [
    step('为什么复制一份梯度？', 'z = Dx', 'z 与 Dx 有相同的两个通道，暂时让它代表图像梯度。', 'z不是第二张亮度图，而是一组辅助梯度变量。等式在最终解处成立，迭代过程中可以暂时不一致。', 'split-example'),
    step('把 TV 项中的 Dx 换成 z', 'minₓ,z f(x) + λ‖z‖₁　　条件：Dx = z', '数据项交给 x，梯度先验交给 z；等式让两份描述相互关联。', '由于条件Dx=z，把z代回便恢复上一页原目标。只有包含等式约束时，两种写法才描述同一个问题。', 'split-example'),
    step('用一个符号记录不一致', 'r = Dx − z', 'r 是梯度约束的偏差；r = 0 就表示 Dx 和 z 一致。', 'r有水平、垂直两个通道。它与观测残差Hx−b不同；前者在梯度空间，后者在观测图像空间。', 'residual'),
    step('接下来为什么需要额外方法？', 'minₓ,z f(x) + λ‖z‖₁　　且 r = 0', '优化两部分的同时，还要让偏差 r 趋近于零。', '下一节先用平方罚项说明如何处理约束，再解释乘子y为何可以帮助持续修正偏差。', 'residual')
  ],
  5: [
    step('先说清楚：什么是不一致？', 'r = Dx − z', '两边相等时 r = 0；红蓝表示偏差的正负。', 'D 把图像变成水平和垂直梯度；z 与 Dx 形状相同。这里仅画水平通道，实际约束同时包含两个通道。', 'residual'),
    step('用平方惩罚偏差', 'F(x,z) + <mark>ρ/2 ‖r‖₂²</mark>，其中 F = f(x) + λ‖z‖₁', '偏离零越远，罚得越重；ρ 决定罚项的强度。', '先暂时不引入乘子。把等式约束变成平方罚项，有利于求解，但有限的罚项仍允许数据项与约束之间存在取舍。', 'penalty'),
    step('为什么只加罚项还不够？', 'minᵣ ½(r − 1)² + ½r²　⇒　r = 0.5 ≠ 0', '把 r 看成一个偏差分量：构造的目标希望 r=1，约束要求 r=0。', '这里用标量r说明偏差如何被纠正，r对应图像问题Dx−z的一个分量；½(r−1)²是人为构造的示意目标，并非真实图像目标的精确降维。设ρ=1，求导(r−1)+r=0，得r=0.5。', 'compromise'),
    step('引入乘子 y：给偏差一个方向', 'Lρ = F + <mark>yᵀr</mark> + ρ/2 ‖r‖₂²', 'y 改变下一次最小化的方向；y 是由算法更新的乘子。', 'y 是与残差同维的向量，yᵀr 是逐元素乘积之和。乘子从拉格朗日对偶而来：先对原变量最小化，再沿残差方向更新 y，并非把 y 也一起最小化。', 'multiplier'),
    step('乘子怎样纠正持续的偏差？', 'y⁺ = y + ρr⁺', '正偏差使 y 上升；下一次最小化就更不愿保持正偏差。', '继续同一个标量示意，ρ=1，y初始为0。交替执行r=(1−y)/2、y←y+r，得到r=0.5、0.25、0.125……，趋向约束r=0。图中横轴为迭代次数；这里的标量示意不替代图像问题的x、z交替更新。', 'dual-path'),
    step('把 y 换一个尺度，得到 u', 'u = y/ρ　⇒　yᵀr = ρuᵀr', 'u 和 y 表达同一份修正信息，只是相差固定比例 ρ。', '本例ρ固定为0.1。例如乘子的某个分量y=0.02时，同一分量u=0.2。这是算法量的缩放，不是图像亮度的换算。', 'scale'),
    step('配方之前，先展开一个平方', '‖r + u‖₂² = ‖r‖₂² + <mark>2uᵀr</mark> + ‖u‖₂²', '向量的平方展开，和标量 (a+b)² 的规则相同。', '‖r+u‖²=(r+u)ᵀ(r+u)，逐项相乘得到rᵀr+rᵀu+uᵀr+uᵀu。两个交叉项相等，所以合为2uᵀr。下一页再乘ρ/2并移项。', 'complete-square'),
    step('配方：u 为什么进入平方里？', 'ρuᵀr + ρ/2 ‖r‖₂² = <mark>ρ/2 ‖r + u‖₂²</mark> − ρ/2 ‖u‖₂²', '先展开右边，再消去多加的 u²，就能回到左边。', '用 ‖r+u‖²=‖r‖²+2uᵀr+‖u‖²。乘ρ/2后，多出ρ‖u‖²/2，所以要减掉。固定u更新x或z时，最后一项是常数，可以不写进该子问题。', 'complete-square')
  ],
  6: [
    step('第 1 轮：先固定 z 和 u', 'x¹ = argminₓ ½‖Hx − b‖₂² + ρ/2 ‖Dx − z⁰ + u⁰‖₂²', '此步只改变 x；b、z⁰、u⁰ 都保持不动。', '上标是迭代编号：0表示初始化，1表示第一次更新。本例x⁰=b、z⁰=Dx⁰、u⁰=0。argmin表示“找到让后面表达式最小的x”。', 'freeze'),
    step('x 要同时满足哪两个要求？', 'Edata = ½‖Hx − b‖₂²　　Egrad = ρ/2‖Dx − (z⁰ − u⁰)‖₂²', '左边要求解释观测；右边要求靠近当前梯度目标。', '两个目标都约束同一个x。z⁰−u⁰是水平和垂直梯度组成的目标，不是一张亮度图。下图分别显示初始图像对应的观测误差和水平梯度误差。', 'two-errors'),
    step('先复习标量的链式法则', 'd[½(ax − c)²]/dx = (ax − c) · a', '先对外层平方求导，再乘内层 ax−c 对 x 的导数。', '令q=ax−c，外层½q²对q的导数为q，内层q对x的导数为a，相乘得到a(ax−c)。这里的a是固定系数，不是上一节标量约束例子的未知量。', 'scalar-chain'),
    step('对平方误差求导', '∇ₓ ½‖Ax − c‖₂² = <mark>Aᵀ(Ax − c)</mark>', '先算残差，再通过 Aᵀ 把误差送回 x 的空间。', '标量时链式法则给出 d[½(ax−c)²]/dx=a(ax−c)。向量时，½消去平方求导产生的2，外层残差再乘线性映射的伴随Aᵀ。', 'chain-rule'),
    step('让两个梯度的和等于零', 'Hᵀ(Hx − b) + <mark>ρDᵀ(Dx − z⁰ + u⁰)</mark> = 0', '把上一页的求导规则分别用在两项上，再相加。', '数据项取A=H、c=b。梯度项取A=D、c=z⁰−u⁰，并乘ρ。此x子问题是凸二次问题，梯度为零给出最小化条件。', 'stationary'),
    step('先把两个括号展开', 'HᵀHx − Hᵀb<br>+ ρDᵀDx − ρDᵀz⁰ + ρDᵀu⁰ = 0', '左乘矩阵分配到括号里的每一项，保留各项原来的正负号。', '运用A(v+w)=Av+Aw。注意最后的u⁰在原括号中为正，所以展开后也是正。下一页才移项和提取x。', 'stationary'),
    step('展开括号，收集所有含 x 的项', '(HᵀH + ρDᵀD)x¹ = Hᵀb + ρDᵀ(z⁰ − u⁰)', '先展开，再把不含 x 的项移到右边；这就是正规方程。', '展开得HᵀHx−Hᵀb+ρDᵀDx−ρDᵀz⁰+ρDᵀu⁰=0。把两项含x的表达式合并，其余移项。本页图片是求解该方程得到的真实第1轮结果。', 'normal'),
    step('代码怎样解这个方程？', 'x̂¹ = [Ĥ* b̂ + ρ · FFT(Dᵀ(z⁰−u⁰))] / [|Ĥ|² + ρℓ]', '相同的周期边界使方程在频域变成逐点除法。', '帽子表示傅里叶变换，*表示复共轭；ℓ是DᵀD的频域特征值。本例用对称热扩散模糊，Ĥ为实数。除法后做逆FFT得到x¹；不需要真的创建4096×4096矩阵。', 'normal')
  ],
  7: [
    step('接下来固定 x¹ 和 u⁰，更新 z', 'v = Dx¹ + u⁰　　z¹ = argmin_z λ‖z‖₁ + ρ/2‖z − v‖₂²', '先把已经知道的两项合成 v；此步只改变 z。', 'x¹来自刚完成的x更新，u⁰仍是本轮开始时的修正量。范数平方不受整体负号影响，因此‖Dx¹−z+u⁰‖²=‖z−v‖²。', 'v'),
    step('先只看一个梯度分量', 'min_ζ λ|ζ| + ρ/2(ζ − v)²', 'ζ 是 z 中的一个数：绝对值偏好零，平方项偏好 v。', 'L1范数与平方L2范数都可以按分量求和，各分量互不耦合，所以能逐个求解。此页取v=0.30，λ=0.015，ρ=0.1。', 'scalar'),
    step('输出为正或为负时，分别求导', 'ζ > 0：ζ = v − λ/ρ　　ζ < 0：ζ = v + λ/ρ', '把 |ζ| 分别写成 ζ 或 −ζ，求导并令其为零。', '正分支：λ+ρ(ζ−v)=0；负分支：−λ+ρ(ζ−v)=0。结果还必须满足假设的符号：v>λ/ρ时正分支有效，v<−λ/ρ时负分支有效。', 'branches'),
    step('中间这一段，为什么输出是零？', 'ζ = 0 的最优条件：0 ∈ λ[−1,1] − ρv　⇔　|v| ≤ λ/ρ', '零点的次梯度是一段区间，它能抵消较小的二次项梯度。', '绝对值在零处没有单个导数，但有次梯度区间[-1,1]。当v=0.08、λ/ρ=0.15时，v位于阈值内，所以最优ζ是0。并不是把小值保留为0.08。', 'zero'),
    step('把三个分支合起来：软阈值', 'soft(v,κ) = sign(v) max(|v| − κ, 0)，κ = λ/ρ = 0.15', '试算三个数：−0.30 → −0.15；0.08 → 0；0.30 → 0.15。', '当v>κ时减κ，当v<−κ时加κ；当|v|≤κ时取零，包括恰好落在阈值上的情况。对图像的两个梯度通道，每个分量都执行同一规则。', 'examples'),
    step('回到整张梯度图：得到第 1 轮 z', 'z¹ = soft(Dx¹ + u⁰, λ/ρ)', '现在再看图：小梯度归零，大梯度缩小，但保留正负方向。', '这次图像比较是第0→1轮的真实数据。红色表示正水平梯度，蓝色表示负水平梯度，白色表示零；左右两图使用同一个±0.5色标。下一步才更新u。', 'threshold-image')
  ]
};
const concept = (title, lines, note) => ({ title, lines, note });
const image = (title, data, note, range = .5) => ({ title, data, note, signed: true, range });
const xs = Array.from({ length: 161 }, (_, i) => -.6 + i * 1.2 / 160);
const curve = (title, series, note, domain = [-.6, .6], markers = []) => ({ title, series, note, domain, markers, labels: ['变量值', '函数值'] });
const line = (f, color = '#bd3035', domain = xs) => ({ values: domain.map(f), color });
export const lessonPages = order => order.flatMap(topic => Array.from({ length: walkthrough[topic]?.length || 1 }, (_, part) => ({ topic, part })));
export function walkthroughVisual(scene) {
  const [initial, first] = teachingStates(), dx = gradient(first.x);
  const r = first.r[0], v = dx[0].map((a, i) => a + initial.u[0][i]);
  const cost = (z, a) => .015 * Math.abs(z) + .05 * (z - a) ** 2;
  switch (scene) {
    case 'forward': return visualSpec(2);
    case 'gradients': return visualSpec(3);
    case 'split-example': return visualSpec(4);
    case 'residual': return [image('候选梯度 Dₓx', dx[0], '红正、蓝负、白零'), image('候选辅助梯度 zₓ', first.z[0], '同一色标 ±0.5'), image('偏差 rₓ = Dₓx − zₓ', r, '相减得到偏差；同一色标')];
    case 'penalty': return [curve('较弱罚项：ρ = 1', [line(a => .5 * a * a)], 'r = 0 时罚项最小'), curve('较强罚项：ρ = 4', [line(a => 2 * a * a)], '相同横轴与纵轴范围，便于比较')].map(s => ({ ...s, ylim: [0, .75] }));
    case 'compromise': {
      const domain = Array.from({ length: 161 }, (_, i) => -.5 + i * 2 / 160);
      return [curve('示意目标：偏好 r = 1', [line(r => .5 * (r - 1) ** 2, '#555', domain)], '标量示意；约束要求 r = 0', [-.5, 1.5]), curve('加罚项后的折中', [line(r => .5 * (r - 1) ** 2 + .5 * r * r, '#bd3035', domain)], 'ρ = 1，最小值在 r = 0.5', [-.5, 1.5], [{ x: .5, y: .25 }])];
    }
    case 'multiplier': return [concept('原目标 F', ['拟合观测', '+', '梯度先验'], '先让解符合任务'), concept('乘子项 yᵀr', ['y 的正负', '改变偏差的代价'], '乘子提供方向信息'), concept('平方罚项 ρ‖r‖²/2', ['偏差越大', '代价越高'], '罚项提供偏差强度')];
    case 'dual-path': return [curve('偏差 r 逐渐靠近 0', [{ values: [.5, .25, .125, .0625, .03125, .015625], color: '#bd3035' }], '标量示意，ρ = 1；每次先更新 r 再更新 y', [1, 6]), curve('乘子 y 逐渐靠近 1', [{ values: [.5, .75, .875, .9375, .96875, .984375], color: '#245c4a' }], 'y 累积每次的偏差 r', [1, 6])].map(s => ({ ...s, labels: ['迭代 k', '当前值'] }));
    case 'scale': return [concept('未缩放乘子', ['y = 0.02'], '仅举一个分量的数值'), concept('除以 ρ = 0.1', ['0.02 ÷ 0.1'], '定义：u = y/ρ'), concept('缩放乘子', ['u = 0.2'], '同一份信息，换一个尺度')];
    case 'complete-square': return [concept('展开平方', ['‖r+u‖²', '= ‖r‖² + 2uᵀr + ‖u‖²'], '逐项展开，没有新增约束'), concept('消去多出的项', ['减去 ρ‖u‖²/2'], '固定 u 时，它与 x、z 无关')];
    case 'freeze': return [concept('已知观测', ['b：固定'], '整个迭代过程中不变'), concept('第 0 轮状态', ['z⁰ = Dx⁰', 'u⁰ = 0'], '本步暂时固定'), concept('本步未知量', ['只求 x¹'], '上标 1 表示第 1 轮')];
    case 'two-errors': return [image('初始观测误差 Hx⁰ − b', initial.residual, '观测空间，色标 ±0.1', .1), image('初始水平梯度误差', initial.r[0], '初始化 z⁰=Dx⁰，所以这里为零', .1)];
    case 'chain-rule': return [concept('先算残差', ['x → Ax − c'], '残差在 A 的输出空间'), concept('平方求和', ['½ ‖Ax − c‖²'], '对残差求导得到残差本身'), concept('链式法则', ['Aᵀ(Ax − c)'], '再映回 x 所在的空间')];
    case 'scalar-chain': return [concept('内层', ['q = ax − c', 'dq/dx = a'], '系数 a 和 c 保持固定'), concept('外层', ['½q²', '对 q 求导 = q'], '平方产生的 2 与 ½ 抵消'), concept('两层相乘', ['q · a', '= a(ax − c)'], '这就是链式法则')];
    case 'stationary': return [concept('数据项的梯度', ['Hᵀ(Hx − b)'], '把观测误差映回 x'), concept('梯度项的梯度', ['ρDᵀ(Dx − z⁰ + u⁰)'], '把梯度误差映回 x'), concept('最小化条件', ['两项相加 = 0'], '本例是凸二次子问题')];
    case 'normal': return [{ title: '更新前：x⁰ = b', data: initial.x, note: '第 0 轮；亮度 0–1' }, { title: '求解方程得到 x¹', data: first.x, note: '第 1 轮；亮度 0–1' }];
    case 'v': return [image('刚算出的梯度 Dₓx¹', dx[0], '第 1 轮；色标 ±0.5'), image('仍固定的 uₓ⁰', initial.u[0], '第 0 轮初始化为 0'), image('相加得到 vₓ', v, '此时 vₓ = Dₓx¹')];
    case 'scalar': return [curve('绝对值项', [line(z => .015 * Math.abs(z))], '最小点在 0'), curve('二次项', [line(z => .05 * (z - .3) ** 2, '#555')], '最小点在 v = 0.30'), curve('两项相加', [line(z => cost(z, .3))], '最小点在 ζ = 0.15', [-.6,.6], [{ x: .15, y: cost(.15, .3) }])];
    case 'branches': return [curve('v = 0.30', [line(z => cost(z, .3))], '正分支：ζ = 0.30 − 0.15', [-.6,.6], [{ x: .15, y: cost(.15,.3) }]), curve('v = −0.30', [line(z => cost(z, -.3))], '负分支：ζ = −0.30 + 0.15', [-.6,.6], [{ x: -.15, y: cost(-.15,-.3) }])];
    case 'zero': return [curve('v = 0.08，位于阈值内', [line(z => cost(z, .08))], '最低点在绝对值的折角 ζ = 0', [-.6,.6], [{ x: 0, y: cost(0,.08) }]), concept('零点的平衡', ['次梯度区间：±0.015', '二次项梯度：−0.008'], '0.008 落在 ±0.015 内，能够抵消')];
    case 'examples': return [-.3, .08, .3].map(a => concept(`输入 v = ${a.toFixed(2)}`, [`soft(v,0.15)`, `= ${shrink(a,.15).toFixed(2)}`], Math.abs(a) <= .15 ? '在阈值内 → 归零' : '在阈值外 → 向零收缩 0.15'));
    case 'threshold-image': return [image('输入：第 1 轮 vₓ', v, '红正、蓝负、白零；±0.5'), curve('软阈值映射', [line(a => a, '#bbb'), line(a => shrink(a, .15))], '横轴输入 v；纵轴输出 ζ'), image('输出：第 1 轮 zₓ', first.z[0], '同一色标 ±0.5')];
    default: throw new Error('Unknown walkthrough scene: ' + scene);
  }
}
