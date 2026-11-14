# Learning Notebook

个人学习仓库：从目标知识反推前置知识，按依赖关系建立从基础到目标的知识金字塔。

## 目录约定

- 每个大知识点一个顶层文件夹，例如 `admm/`。
- 每个主题的 `README.md` 是入口，记录学习目标、知识地图和掌握状态。
- 小知识节点放在对应主题内，按实际需要添加讲解、交互演示和编码练习文件。
- 不同主题共用的前置知识通过链接引用，避免重复维护。

## 学习方式

- 公式与解释：理解概念、假设和推导。
- 代码交互：改变参数，观察结果，建立直觉。
- 自己编码：完成练习，并用结果验证理解。
- 掌握状态：未判断、不懂、部分懂、已懂；由学习者反馈，必要时通过小练习验证。

## 访问方式

手机和电脑均可通过 [ADMM 在线学习实验室](https://admm-learning-lab-gravity.cutetoucan2.chatgpt.site) 学习。现已包含知识地图、幻灯片讲解、掌握状态、整体迭代与细节公式模式。
网页交互在浏览器中计算；Python / NumPy 示例可阅读和下载，在自己的 Python 环境运行。线上学习记录由登录身份隔离保存；本地静态预览不提供云端同步。

## 主题

- [ADMM：图像去模糊与优化](admm/README.md) · [在线学习](https://admm-learning-lab-gravity.cutetoucan2.chatgpt.site) · [Python 实现](admm/solver.py)
- [LLM：模型训练、Agent 与 Harness](llm/README.md) · [在线 PPT 讲义](https://llm-learning-notebook-gravity.cutetoucan2.chatgpt.site) · 第一讲：Q、K、V 怎样完成一次信息汇总；其余知识点按学习进度生成

## ADMM 当前版本

- 先讲物理或算法含义、希望达到的效果，再解释计算方法；详细求导按需展开。
- x 更新、Hᵀ 与软阈值 z 更新均提供解释入口，连接公式、图像、Python 和实际数值。
- 细节模式保留三大更新公式，逐个小步定位；可选像素查看输入、中间量和结果。
- soft 函数图标出 ±λ/ρ、归零区间和所选分量，随当前参数变化。

完整源码保存在 `admm/`。在线版本使用 Sites 托管，仓库保存可继续维护的源码，不包含账户凭据和学习记录。

## 本地查看与验证

在 `admm/` 目录运行 `python -m http.server 9055`，浏览器打开 `http://localhost:9055`。需要 Node.js 才能运行 `node build.mjs`；构建所需的托管配置保存在 `.openai/hosting.json`。

运行 `node test.mjs` 可验证数值求解与 Python 等价实现；需先安装 Python、NumPy 和 Node.js。Python 示例使用 `solver.py`，并非必须使用 Jupyter Notebook。
