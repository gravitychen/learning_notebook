# LLM survey audit findings

- The original tree is a learning outline, not evidence of comprehensive coverage.
- Search candidates include the broad Zhao et al. survey, post-training surveys, Agentic RL, agent harness design, and agent evaluation.
- Candidate first-release and revision dates must be verified against primary pages and actual PDF contents.
- Full extracted text will be kept in temporary analysis storage; repository notes will contain concise original synthesis and page locators.

- Downloaded six valid PDFs (S1–S6), 144 / 32 / 34 / 95 / 29 / 25 pages respectively; title pages verified against the requested survey topics.
- S3 is a 2026-10 reasoning-SFT survey; S5 is a 2026-06 harness survey; S4 was revised in 2026-04. S1 was revised in 2026-03, despite its 2023 first release.
- S1 carries arXiv's nonexclusive distribution license; keep its downloaded copy local rather than republishing it to GitHub. S2–S5 list CC BY 4.0; verify S6's article-specific license before public synchronization.
- Initial actual-PDF inspection: S3 distinguishes methods and analyses; S5 decomposes runtime responsibilities, rather than organizing everything as one training pipeline.

- Verified PDF bookmarks and taxonomy figures: S3 Fig.1 p3 separates data/algorithm methods and data/optimization/mechanistic analyses; S4 Fig.1 p4 separates RL foundations, capabilities, tasks, environments and challenges; S5 Fig.1 p2 and §5 pp11–13 cover six runtime responsibilities.
- S1 bookmarks include utilization, capability/evaluation and advanced topics, including inference efficiency, compression, retrieval, hallucination and multimodality. Original tree's inference/deployment coverage was thin.
- S6 Fig.1 p2 organizes evaluation by capability, application, generalist agents and evaluation tooling, with benchmark dimensions discussed separately. Original B4 was present but too coarse.
- S2 Fig.1 p1 and its bookmarks separate fine-tuning, reward/policy optimization, and test-time scaling. S1 §§9.4–9.7 pp83–92 cover inference, compression, retrieval and hallucination. S6 Table 1 p6 distinguishes task data, environment, interface, metric and safety.
- License verified: ACL's page states materials published in/after 2016 are CC BY 4.0, covering S6 (July 2026). S2–S6 can be synchronized with original attribution; S1 is locally downloaded and specifically ignored by Git.
- Final comparison records ten coverage dimensions with original status, PDF evidence and destination node. Six new main nodes cover inference/deployment, cross-task analysis, capabilities, task/environments, model-harness co-improvement and trust/governance; former IDs remain unchanged.
- This is a six-survey coverage audit, not an exhaustive systematic review or a claim that all LLM concepts have been included.
- Treat missing vs partially-covered concepts separately: memory, retrieval and forgetting were mentioned already; the gap is their training/evaluation decomposition, not total absence.
