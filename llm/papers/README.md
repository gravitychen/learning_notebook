# LLM 综述 PDF 索引

检索与下载日期：2026-11-13。6 篇 PDF 均已下载到本目录，合计 359 页；已检查 PDF 文件头、可解析页数、标题页，并抽取全文进行章节检索。重点分析见 [综述对照报告](../survey-analysis.md)。

日期区分“首发 → 最近修订”，不把老论文的新修订版称为新论文。下面记录实际下载文件的版本、页数与 SHA-256。

| 编号 | 论文与作者 | 日期 / 版本 | 页数 | 阅读用途 | PDF |
| --- | --- | --- | --- | --- | --- |
| S1 | [A Survey of Large Language Models](https://arxiv.org/abs/2303.18223)；Wayne Xin Zhao et al. | 2023-03-31 → 2026-03-18 / v19 | 144 | 范围总览 | [原站 PDF](https://arxiv.org/pdf/2303.18223)；本地文件为 `2303.18223_llm-overview.pdf` |
| S2 | [LLM Post-Training: A Deep Dive into Reasoning Large Language Models](https://arxiv.org/abs/2502.21321)；Komal Kumar et al. | 2025-02-28 → 2025-03-24 / v2 | 32 | 后训练全景（较早的补充） | [本地及仓库副本](2502.21321_post-training.pdf) |
| S3 | [Supervised Fine-Tuning for Reasoning Large Language Models: A Survey](https://arxiv.org/abs/2610.37681)；Yongcan Yu et al. | 2026-10-13 / v1 | 34 | 近期推理 SFT | [本地及仓库副本](2610.37681_reasoning-sft.pdf) |
| S4 | [The Landscape of Agentic Reinforcement Learning for LLMs: A Survey](https://arxiv.org/abs/2509.02547)；Guibin Zhang et al. | 2025-09-02 → 2026-04-17 / v5 | 95 | Agent 训练 | [本地及仓库副本](2509.02547_agentic-rl.pdf) |
| S5 | [From Question Answering to Task Completion: A Survey on Agent System and Harness Design](https://arxiv.org/abs/2606.20683)；Jianyuan Guo et al. | 2026-06-14 / v1 | 29 | Harness 组织方式 | [本地及仓库副本](2606.20683_agent-harness.pdf) |
| S6 | [A Survey on Evaluation of LLM-based Agents](https://aclanthology.org/2026.findings-acl.1330/)；Asaf Yehudai et al. | 2026-07 / ACL 正式版 | 25 | Agent 评测 | [本地及仓库副本](2026.findings-acl.1330_agent-evaluation.pdf) |

## 分类图与章节定位

- S1：书签目录中的预训练、后训练、使用、评测与高级专题；推理和压缩重点看 PDF pp83–88。
- S2：Fig.1 p1；奖励与策略优化 pp6–11，SFT pp12–13，推理时计算 pp14–19。
- S3：Fig.1 p3；方法与分析分别见 §3–4，附录补充粒度分类。
- S4：Fig.1 p4；能力 §3、任务 §4、环境与框架 §5。
- S5：Fig.1 p2；运行职责 §5 pp11–13，评测 §7 pp15–20。
- S6：Fig.1 p2；评测维度与工具见 §5–6 pp5–7。

先用 S1 看范围，再用 S3 / S4 深入训练，S5 理解运行系统，S6 设计验证；S2 提供后训练方法之间的连接。以上是学习路线，不是论文质量排名。

## 版权与文件校验

S2–S5 的 arXiv 元数据列出 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)；S6 的 ACL 页面注明 2016 年及之后材料采用同一许可。上述作者、题名与原文链接用于署名；PDF 均为原样下载，未修改。

S1 采用 [arXiv 非独占分发许可](https://arxiv.org/licenses/nonexclusive-distrib/1.0/)，本次不将其视为第三方再发布授权。因此下载文件保留本地并由 .gitignore 排除，GitHub 中保留原站链接。

```text
S1  585551fe1a17793d141f6bff3e595e63151e867a53353991c3c9891facc72377  2303.18223_llm-overview.pdf
S2  2045cafb2d4cb167faa68393abdaa24bcec58fe3e7bbc2c25b6dabeb0eeef7ff  2502.21321_post-training.pdf
S3  8a3fbd974ef62dd202ff43c9695b149f654b1f35058f5452b043a440ba14d5f1  2610.37681_reasoning-sft.pdf
S4  d95cfa7b0d708f5ddc35f87a62080277616dd5dfa529e5c002dc20867f45d849  2509.02547_agentic-rl.pdf
S5  5d21e1f25dd55857e7d17452be1bc74d14026e0bc7843d84f73f55c17856fdda  2606.20683_agent-harness.pdf
S6  2c3c80fff5735925378b99528684559e2d47f82e281957dc4b955397186560b1  2026.findings-acl.1330_agent-evaluation.pdf
```

完整提取文字与页面渲染位于临时目录 llm-survey-analysis-20261113，不作为重新分发的全文附件提交。
