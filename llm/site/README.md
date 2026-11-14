# Q、K、V 怎样完成一次信息汇总

LLM 第一讲：11 页 PPT 风格讲义，仅生成 A1-2 中的 QKV 入门部分；词表输出概率等其余内容等待学习者请求。知识树保留 19 个模块、70 个目录知识点，目录不代表课程已经生成。

先说明信息处理含义与希望达到的效果，再介绍实现计算：投影 → 点积与缩放 → 因果掩码 → 逐行 softmax → 加权汇总。包含形状、self/cross-attention 对照、五小步实验、下括号定位和 Python / NumPy 对照。

所有二维矩阵均为手选教学数据，无训练模型的语义结论；Q=K 是示例参数的特例。浏览器计算交互，Python 代码在自己的环境运行。

本地预览：在本目录执行 `python -m http.server 9056 --bind 127.0.0.1`，打开 `http://127.0.0.1:9056`。本地静态服务器没有云端同步。

验证：`node test.mjs`（需本机 Python 与 NumPy），`node build.mjs`。构建产物在 `dist/`，不提交。

线上学习记录通过 Sites 的可信登录身份隔离保存至 R2；只记录本知识点掌握状态，不上传实验输入。缓存按服务端验证的身份分区；同步失败时显示本机暂存状态。

来源：[Attention Is All You Need §3.2](https://arxiv.org/html/1706.03762v7#S3.SS2)。图解与教学代码为本项目编写；没有复制其他项目的实现。

原图导航：每页对照原论文 Figure 1 标出当前模块，说明输入、输出与前后关系；Figure 2 对应投影和五个计算小步。默认定位 Decoder 的 Masked Multi-Head Attention，与因果实验保持一致。在 Self/Cross 页可比较三处 Attention 的来源。手机端可展开原图；实验小步会同步定位 Figure 2。红框是网页覆盖层，原图未修改。

`assets/` 保存 Vaswani et al. 原论文 Figures 1–2，来源为 arXiv HTML v7 的 ModalNet-21/19/20.png。论文页面声明 Google 允许署名的学术与新闻用途复制图表；此处用于个人学习讲义，不将这些图声明为本项目原创或项目许可覆盖内容。
