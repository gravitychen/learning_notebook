// Only the QKV introduction within A1-2 is authored; other topics await the learner.
export const lesson = {
  "node": "A1-2",
  "title": "Q、K、V 怎样完成一次信息汇总",
  "subtitle": "先看信息怎样流动，再把每个小步算出来",
  "source": {
    "title": "Attention Is All You Need · §3.2（2017）",
    "url": "https://arxiv.org/html/1706.03762v7#S3.SS2"
  },
  "notation": "X：位置表示；W_Q/W_K/W_V：学习参数；Q：查询，K：键，V：值；s：缩放后的匹配分数；M：掩码（允许为0，屏蔽为−∞）；A：按行归一化的注意力权重；O：单头汇总结果。N：序列位置数，d_k：Q/K特征数，d_v：V特征数。小写 qᵢ/kⱼ/vⱼ/oᵢ 表示对应矩阵的一行。",
  "slides": [
    {
      "id": "purpose",
      "kicker": "01 / 先看信息流",
      "title": "一个位置，怎样读到其他位置的信息？",
      "lead": "每个位置原本有自己的表示。注意力把其他位置的信息汇集过来，形成这个位置的新表示。",
      "visual": "purpose",
      "equation": "每个来源的信息 × 读取权重 → 相加 → 当前 query 的汇总结果",
      "caption": "这里的“信息”是向量特征。图用三个位置示意，不把一个汉字固定当作一个 token。",
      "notes": [
        [
          "我们希望发生什么？",
          "让当前表示能够结合上下文：需要读取哪些位置、每个位置占多少份额，由输入表示与学习参数共同决定。这里说的是信息处理含义，没有图像亮度之类的物理单位。"
        ],
        [
          "怎样达到这个效果？",
          "先计算各位置与当前查询的匹配程度，再将分数转成权重，最后按权重相加各位置的信息。接下来分别认识负责匹配的 Q、K 和携带信息的 V。"
        ]
      ],
      "derivation": "只看 query 位置 i：oᵢ = Σⱼ aᵢⱼ vⱼ。先理解这个加权和，再解释权重 aᵢⱼ 从哪里来。"
    },
    {
      "id": "roles",
      "kicker": "02 / 分清职责",
      "title": "Q、K 决定怎么找，V 决定取回什么",
      "lead": "Q 是当前查询的匹配特征，K 是各来源的匹配特征；V 是各来源实际交给汇总步骤的内容。",
      "visual": "roles",
      "equation": "Q 与 K → 权重 A；A 与 V → 汇总 O",
      "caption": "“查询”和“键”是功能类比；它们不是写出来的问题句，也没有预先指定的自然语言含义。",
      "notes": [
        [
          "为什么把匹配和内容分开？",
          "匹配时需要突出的特征，不一定等于希望传递的全部内容。分别投影，让模型能够学习用一种特征决定读取比例，再读取另一种特征。"
        ],
        [
          "怎么检验自己理解了？",
          "固定 Q、K 和掩码，只修改 V，权重 A 保持不变；加权和 O 可能改变。下一页说明三组向量怎样从输入表示产生。"
        ]
      ],
      "derivation": "A=softmax((QKᵀ)/√d_k + M)，O=AV。V 没有出现在 A 的计算中。"
    },
    {
      "id": "projection",
      "kicker": "03 / 从你记得的 Transformer 接过来",
      "title": "同一组表示，经过三种投影",
      "lead": "Self-attention 的 Q、K、V 来自同一个 X，但用不同的学习参数。Q 不等于 K，也不等于 V。",
      "visual": "projection",
      "equation": "Q = XW_Q　 K = XW_K　 V = XW_V",
      "caption": "输入 token ID 先变成向量；这里的 X 是向量表示，可能已经经过前面的层。",
      "notes": [
        [
          "学习参数在做什么？",
          "三组投影重新组合 X 的特征，分别服务于查询、匹配与内容传递。训练通过梯度更新这些参数；聊天时的一次前向计算通常不更新它们。"
        ],
        [
          "下面的数字从哪里来？",
          "我们选 X=[[1,0],[0,1],[1,1]]，W_Q=W_K=I，W_V=2I，得到 Q=K=X、V=2X。这只是为了可手算而特意选的参数，真实模型不会要求 Q=K。"
        ]
      ],
      "derivation": "X 的形状为 N×d_model。W_Q、W_K 为 d_model×d_k；W_V 为 d_model×d_v。因此 Q、K 有 N 行，V 也有 N 行，特征宽度可不同。",
      "python": "import numpy as np\n# Three positions, two features; illustrative, untrained projections.\nX = np.array([[1., 0.], [0., 1.], [1., 1.]])\nW_Q = np.eye(2)\nW_K = np.eye(2)\nW_V = 2 * np.eye(2)\nQ, K, V = X @ W_Q, X @ W_K, X @ W_V\nassert Q.shape == K.shape == V.shape == (3, 2)"
    },
    {
      "id": "score",
      "kicker": "04 / 先算读取比例的依据",
      "title": "拿一个 q，逐个与 k 匹配",
      "lead": "先选位置 3：q₃=[1,1]。它分别与三个 key 点乘，再除以 √2。",
      "visual": "score",
      "equation": "s₃ⱼ = q₃ · kⱼ / √d_k，d_k = 2",
      "caption": "三个点积是 [1, 1, 2]；缩放后约为 [0.707, 0.707, 1.414]。这还不是概率，也还没有汇总 V。",
      "notes": [
        [
          "点积表达什么？",
          "在模型学习到的特征坐标中，q 和 k 的分量相乘再相加，得到匹配分数。数值高意味着后面的 softmax 倾向分配更大权重；手选的二维数值不证明任何语义关系。"
        ],
        [
          "为什么除以 √d_k？",
          "维度增加时，点积的典型波动可能变大，让 softmax 过于集中。若各分量独立、零均值、方差为1，点积方差为 d_k；除以 √d_k 后方差回到1。这是尺度解释，不是对所有训练表示都成立的分布定律。"
        ]
      ],
      "derivation": "q₃·k₁=1×1+1×0=1；q₃·k₂=1；q₃·k₃=2。下一步先限制哪些来源可以读取，再把分数转换为权重。"
    },
    {
      "id": "mask",
      "kicker": "05 / 先决定能读谁",
      "title": "预测下一 token，不能偷看未来",
      "lead": "Decoder 的因果 self-attention 只允许读取当前位置和之前的位置。灰色格子在 softmax 前设为 −∞。",
      "visual": "mask",
      "equation": "A = softmax(s + M)，Mᵢⱼ = −∞（j > i）；其余为 0",
      "caption": "位置 2 不能读取位置 3。位置 3 没有后续位置，因此这一行不会被遮掉。",
      "notes": [
        [
          "为什么要挡住未来？",
          "训练时一整段文本往往一起进入网络。若预测位置能够读取后面的真实文本，就会获得生成时并不存在的信息。因果掩码让训练时和生成时的可见范围一致。"
        ],
        [
          "怎样让一个位置完全不贡献？",
          "把它的分数设为 −∞。exp(−∞)=0，所以 softmax 给它的权重为0。每一行必须至少保留一个可读位置；这个示例保留对角线。Encoder 的双向 self-attention 通常不采用这种因果限制。"
        ]
      ],
      "derivation": "若 i=2，第三个来源的分数被屏蔽。索引在公式中从1开始；Python 数组从0开始。不是把 V 的内容删除，而是把当前行读取它的权重设为0。"
    },
    {
      "id": "weights",
      "kicker": "06 / 用你接触过的 softmax",
      "title": "把匹配分数变成读取份额",
      "lead": "沿着同一个 query 的一整行做 softmax，让可读来源的权重非负、总和为 1。",
      "visual": "weights",
      "equation": "a₃ⱼ = exp(s₃ⱼ) / Σₗ exp(s₃ₗ)",
      "caption": "位置 3 的权重约为 [0.248, 0.248, 0.503]。它们是来源位置上的权重，不是下一个词的词表概率。",
      "notes": [
        [
          "这些权重意味着什么？",
          "当前 query 从每个来源读取多少份额。第三个来源得到更大权重，但另外两个来源仍参与加权和。它不等于硬选择一个位置。"
        ],
        [
          "怎样稳定地计算？",
          "先把一行分数都减去这一行的最大值，再做指数与归一化。减去共同常数不改变比值，能降低指数溢出的风险。接下来用这些份额汇总 V。"
        ]
      ],
      "derivation": "exp(sⱼ−c)/Σₗexp(sₗ−c)=exp(sⱼ)/Σₗexp(sₗ)。对位置3取 c=√2；掩码位置仍为−∞。"
    },
    {
      "id": "values",
      "kicker": "07 / 真正汇总信息",
      "title": "用同一组份额，对 V 的每一维相加",
      "lead": "V₁=[2,0]，V₂=[0,2]，V₃=[2,2]。每个权重乘以对应的整个向量，再把贡献相加。",
      "visual": "values",
      "equation": "o₃ = a₃₁v₁ + a₃₂v₂ + a₃₃v₃ ≈ [1.503, 1.503]",
      "caption": "输出仍是向量表示；它没有直接变成一句文字。后续网络继续处理这个表示。",
      "notes": [
        [
          "输出表示什么？",
          "当前 query 依照匹配结果，从可读来源汇集到的信息。输出的特征数由 V 的宽度决定；两个坐标没有人为指定的物理单位或词义。"
        ],
        [
          "如何把三项算出来？",
          "用未四舍五入的权重计算，三个贡献约为 [0.497,0]、[0,0.497]、[1.007,1.007]。相加得到 [1.503,1.503]。界面显示值会舍入，实际计算保留精度。"
        ]
      ],
      "derivation": "对输出坐标 d：oᵢ,d=Σⱼ aᵢⱼ Vⱼ,d。矩阵写法就是 O=AV。softmax 给出的非负且和为1的权重，使单头输出是各 vⱼ 的凸组合。",
      "python": "import numpy as np\n# Three positions, two features; illustrative, untrained projections.\nX = np.array([[1., 0.], [0., 1.], [1., 1.]])\nW_Q = np.eye(2)\nW_K = np.eye(2)\nW_V = 2 * np.eye(2)\nQ, K, V = X @ W_Q, X @ W_K, X @ W_V\nscores = Q @ K.T / np.sqrt(K.shape[1])\nmask = np.triu(np.ones((3, 3), dtype=bool), k=1)\nscores = np.where(mask, -np.inf, scores)\ne = np.exp(scores - scores.max(axis=-1, keepdims=True))\nA = e / e.sum(axis=-1, keepdims=True)\nO = A @ V\nassert np.allclose(A.sum(axis=-1), 1)\nassert np.all(A[mask] == 0)\nprint(A)\nprint(O)"
    },
    {
      "id": "shapes",
      "kicker": "08 / 把一行推广到所有位置",
      "title": "Kᵀ 让每个 query 都能遇到每个 key",
      "lead": "一次矩阵乘法把所有 query–key 点积排成表：行表示“谁在读”，列表示“读谁”。",
      "visual": "shapes",
      "equation": "O = softmax(QKᵀ / √d_k + M) V",
      "caption": "QKᵀ 的每格是一对位置的匹配分数；转置用于对齐点积的特征轴，不是求逆。",
      "notes": [
        [
          "为什么这里需要转置？",
          "Q 是 N×d_k，K 也是 N×d_k。把 K 转成 d_k×N，Q 的每一行才能与 K 的每一行做点积，产生 N×N 的位置关系表。直接 QK 通常连维度都不匹配。"
        ],
        [
          "输入输出的维度一样吗？",
          "单头 O 的形状是 N×d_v，保留 query 的位置数。完整多头层还会拼接多个头并经过输出投影，通常回到 d_model，以便残差连接。这不意味着 token ID 的 N 个整数等于 N×d_model 的表示。"
        ]
      ],
      "derivation": "Q[N,d_k] @ Kᵀ[d_k,N] → s[N,N]；逐行 softmax → A[N,N]；A[N,N] @ V[N,d_v] → O[N,d_v]。本讲演示单头，不包含残差、归一化或 FFN 的完整层。"
    },
    {
      "id": "architecture",
      "kicker": "09 / 对照你记得的两座堆栈",
      "title": "Self 与 Cross，差在 Q/K/V 从哪里来",
      "lead": "你记得的 Decoder 有两种读取：读取自己的前缀，以及读取 Encoder 的输出。",
      "visual": "architecture",
      "equation": "Self：同源 X → Q/K/V；Cross：Decoder → Q，Encoder → K/V",
      "caption": "Cross-attention 可以有 T 个 query、S 个来源；权重表形状是 T×S，不必是方阵。",
      "notes": [
        [
          "怎样连接 Encoder 与 Decoder？",
          "Cross-attention 中，Decoder 的当前位置表示产生 Q，用它在 Encoder 输出产生的 K 中匹配，再汇总对应 V。Encoder 的输出是供读取的向量序列，不是直接输出答案文字。"
        ],
        [
          "和 Decoder-only 有什么关系？",
          "Decoder-only 模型通常没有原始 Encoder–Decoder 架构中的独立 cross-attention 子层，而是在同一因果序列中处理上下文。本讲只用这个区别定位 QKV，不提前展开其他架构知识点。"
        ]
      ],
      "derivation": "Cross：Q[T,d_k]、K[S,d_k]、V[S,d_v] → A[T,S] → O[T,d_v]。因果掩码在这里不能机械照搬 self-attention 的方阵下三角；它的可见范围由任务决定。"
    },
    {
      "id": "lab",
      "kicker": "10 / 每一步都能核对",
      "title": "自己改一个 q，看信息怎样重新分配",
      "lead": "选位置、改 query 分量、切换因果掩码。用“下一小步”依次看到点积、缩放、掩码、权重和加权和。",
      "visual": "lab",
      "equation": "Q/K → 匹配 → 可见范围 → A → 读取 V → O",
      "caption": "红色下括号定位当前计算。Python 示例与默认教学数据一致；滑块改变的是本次 Q 的一行，不是训练参数。",
      "notes": [
        [
          "先做一个有预期的实验",
          "选择位置1并保持因果掩码：它只能读自己，因此权重为[1,0,0]。改变 q 也不会改变这一行的权重。关闭掩码之后，再改变 q，观察其他位置开始参与。"
        ],
        [
          "如何对应到 Python？",
          "默认使用第三个 query 的[1,1]。若修改滑块，在 Python 的 Q[i] 处写入同样的两个数字；若关闭因果掩码，去掉 np.where 那一行。i 使用从0开始的索引。"
        ]
      ],
      "derivation": "界面和 Python 都先计算完整表，再显示选中 query 的一行。K、V 固定，Q 只改一行；可回退的小步仅用于观察同一次前向计算，不更新权重。",
      "python": "import numpy as np\n# Three positions, two features; illustrative, untrained projections.\nX = np.array([[1., 0.], [0., 1.], [1., 1.]])\nW_Q = np.eye(2)\nW_K = np.eye(2)\nW_V = 2 * np.eye(2)\nQ, K, V = X @ W_Q, X @ W_K, X @ W_V\nscores = Q @ K.T / np.sqrt(K.shape[1])\nmask = np.triu(np.ones((3, 3), dtype=bool), k=1)\nscores = np.where(mask, -np.inf, scores)\ne = np.exp(scores - scores.max(axis=-1, keepdims=True))\nA = e / e.sum(axis=-1, keepdims=True)\nO = A @ V\nassert np.allclose(A.sum(axis=-1), 1)\nassert np.all(A[mask] == 0)\nprint(A)\nprint(O)"
    },
    {
      "id": "check",
      "kicker": "11 / 用一个反事实检查理解",
      "title": "固定 Q、K 和掩码，只改 V，会发生什么？",
      "lead": "先想清楚匹配和信息传递的职责，再选答案。",
      "visual": "quiz",
      "equation": "本讲到此；学完后告诉我，再决定下一个知识点",
      "caption": "翻到最后不会自动标记“已掌握”。你可以按自己的理解标记，再和我继续问答。",
      "notes": [
        [
          "本讲应该能串起什么？",
          "表示 X 通过学习投影产生 Q、K、V；Q/K 计算匹配分数，掩码决定可见范围，逐行 softmax 分配权重，最后加权汇总 V。"
        ],
        [
          "接下来还有哪些问题？",
          "注意力输出怎样连接残差、FFN 和词表预测，以及训练怎样更新这些参数，都留待后续按需生成。本讲不把注意力权重当作模型推理的完整解释。"
        ]
      ],
      "derivation": "A 的表达式不含 V；O=AV 含 V。改动在零权重来源中，或多个改动相互抵消时，O 也可能不变，所以应说“可能改变”。"
    }
  ]
};

export const catalog = [
  {
    "id": "A1",
    "title": "从 Transformer 接到现代 LLM（按需复习）",
    "nodes": [
      {
        "id": "A1-1",
        "title": "Tokenizer、Embedding、位置编码与 Decoder-only"
      },
      {
        "id": "A1-2",
        "title": "因果注意力、输出概率：一次预测到底算了什么？"
      },
      {
        "id": "A1-3",
        "title": "RoPE、长上下文、MoE：架构变化影响什么？"
      }
    ]
  },
  {
    "id": "A2",
    "title": "预训练：为什么预测下一个 token 能学到能力？",
    "nodes": [
      {
        "id": "A2-1",
        "title": "文本与代码数据：清洗、去重、配比、数据泄漏"
      },
      {
        "id": "A2-2",
        "title": "Next-token prediction、交叉熵、反向传播"
      },
      {
        "id": "A2-3",
        "title": "参数量、训练 token、算力与 scaling laws"
      },
      {
        "id": "A2-4",
        "title": "预训练与继续预训练：知识、能力和遗忘"
      }
    ]
  },
  {
    "id": "A3",
    "title": "训练实作：怎样把目标变成一次权重更新？",
    "nodes": [
      {
        "id": "A3-1",
        "title": "batch、序列打包、loss mask、梯度累积"
      },
      {
        "id": "A3-2",
        "title": "AdamW、学习率、混合精度、checkpoint"
      },
      {
        "id": "A3-3",
        "title": "全量微调、LoRA、QLoRA：哪些参数在变？"
      },
      {
        "id": "A3-4",
        "title": "显存去向与分布式：DP / FSDP / TP / PP"
      }
    ]
  },
  {
    "id": "A4",
    "title": "后训练：从续写文本到遵循指令与偏好",
    "nodes": [
      {
        "id": "A4-1",
        "title": "SFT：指令数据、对话格式、只监督哪些 token？"
      },
      {
        "id": "A4-2",
        "title": "偏好数据与奖励模型：好回答如何被定义？"
      },
      {
        "id": "A4-3",
        "title": "人类反馈与 AI 反馈；结果奖励、过程奖励与评分器偏差"
      },
      {
        "id": "A4-4",
        "title": "RLHF / PPO：奖励、策略、KL 约束如何配合？"
      },
      {
        "id": "A4-5",
        "title": "DPO：直接利用偏好对，不必先拟合显式奖励模型"
      }
    ]
  },
  {
    "id": "A5",
    "title": "推理训练：怎样学会更有效地解题？",
    "nodes": [
      {
        "id": "A5-1",
        "title": "推理轨迹、冷启动 SFT、合成数据与蒸馏"
      },
      {
        "id": "A5-2",
        "title": "推理 SFT：数据扩充与筛选；token / 样本权重及分布约束"
      },
      {
        "id": "A5-3",
        "title": "RLVR：用数学答案、程序测试等可验证信号给奖励"
      },
      {
        "id": "A5-4",
        "title": "GRPO：多条采样、组内比较、优势与策略更新"
      },
      {
        "id": "A5-5",
        "title": "推理时计算：Best-of-N、自一致性、树搜索、验证与预算分配"
      }
    ]
  },
  {
    "id": "A6",
    "title": "推理与部署：怎样在资源约束下生成？",
    "nodes": [
      {
        "id": "A6-1",
        "title": "Prefill / Decode、KV cache：延迟与显存分别花在哪里？"
      },
      {
        "id": "A6-2",
        "title": "批处理、注意力计算与系统吞吐优化"
      },
      {
        "id": "A6-3",
        "title": "量化、剪枝、蒸馏与推测解码：效率和质量如何权衡？"
      }
    ]
  },
  {
    "id": "A7",
    "title": "跨任务与分析视角（选修，不是额外必经训练阶段）",
    "nodes": [
      {
        "id": "A7-1",
        "title": "多模态：视觉语言对齐、感知与 GUI 操作的连接"
      },
      {
        "id": "A7-2",
        "title": "继续训练、持续学习、灾难遗忘：怎样保留已有能力？"
      },
      {
        "id": "A7-3",
        "title": "数据、优化动态与机制分析：为什么学会，还是只记住模式？"
      }
    ]
  },
  {
    "id": "B1",
    "title": "最小 Agent：一项任务怎样被完成？",
    "nodes": [
      {
        "id": "B1-1",
        "title": "Prompting / ICL 与权重更新的区别"
      },
      {
        "id": "B1-2",
        "title": "观察 → 决策 → 调工具 → 接收结果 → 再决策"
      },
      {
        "id": "B1-3",
        "title": "工具调用的结构化参数与真实执行分别由谁负责？"
      },
      {
        "id": "B1-4",
        "title": "工作流与自主 Agent；何时继续、停止或请求帮助？"
      }
    ]
  },
  {
    "id": "B2",
    "title": "工具能力怎样训练？",
    "nodes": [
      {
        "id": "B2-1",
        "title": "工具说明、调用示范、参数与返回结果的数据格式"
      },
      {
        "id": "B2-2",
        "title": "SFT / 模仿学习：何时调用、调用什么、怎样用结果"
      },
      {
        "id": "B2-3",
        "title": "无效参数、工具报错、失败恢复与新工具泛化"
      }
    ]
  },
  {
    "id": "B3",
    "title": "多步 Agent 怎样训练？",
    "nodes": [
      {
        "id": "B3-1",
        "title": "MDP / POMDP：状态、观察、动作、转移和奖励分别是什么？"
      },
      {
        "id": "B3-2",
        "title": "可执行任务环境：初始状态、工具、测试、重置"
      },
      {
        "id": "B3-3",
        "title": "rollout 轨迹：观察、动作、反馈、最终产物"
      },
      {
        "id": "B3-4",
        "title": "轨迹筛选、成功示范 SFT、偏好与交互式 RL"
      },
      {
        "id": "B3-5",
        "title": "稀疏奖励、信用分配、长程任务与 reward hacking"
      }
    ]
  },
  {
    "id": "B4",
    "title": "怎样判断它真的学会了？",
    "nodes": [
      {
        "id": "B4-1",
        "title": "留出任务与代码库、数据污染、跨环境泛化"
      },
      {
        "id": "B4-2",
        "title": "能力评测、应用评测、通用 Agent 与过程诊断"
      },
      {
        "id": "B4-3",
        "title": "数据来源、静态 / 动态环境、接口、指标与安全维度"
      },
      {
        "id": "B4-4",
        "title": "成功率、成本、延迟、重试预算、评分器偏差与复现配置"
      },
      {
        "id": "B4-5",
        "title": "固定模型比较 harness；固定 harness 比较模型"
      }
    ]
  },
  {
    "id": "B5",
    "title": "按能力观察 Agent：每项能力怎样学习与验证？",
    "nodes": [
      {
        "id": "B5-1",
        "title": "规划与重规划；工具选择与调用"
      },
      {
        "id": "B5-2",
        "title": "记忆写入、读取、更新；反思与自我改进"
      },
      {
        "id": "B5-3",
        "title": "推理与感知：各自如何影响多步决策？"
      }
    ]
  },
  {
    "id": "B6",
    "title": "按任务与训练设施观察 Agent",
    "nodes": [
      {
        "id": "B6-1",
        "title": "编码 / 终端、搜索 / 研究、数学 / 形式验证"
      },
      {
        "id": "B6-2",
        "title": "Web / GUI、视觉 / 具身、多 Agent 协作"
      },
      {
        "id": "B6-3",
        "title": "环境重置与任务课程、并行 rollout、同步 / 异步训练"
      }
    ]
  },
  {
    "id": "C1",
    "title": "Harness：包围模型的运行系统",
    "nodes": [
      {
        "id": "C1-1",
        "title": "观察接口、上下文管理、控制循环：模型究竟看见什么？"
      },
      {
        "id": "C1-2",
        "title": "行动接口、状态 / 产物存储、验证 / 治理：怎样落地和验收？"
      },
      {
        "id": "C1-3",
        "title": "检索 / RAG、压缩、记忆、进度交接与失败恢复"
      },
      {
        "id": "C1-4",
        "title": "skills、hooks、MCP、子 Agent：分别扩展哪一层？"
      }
    ]
  },
  {
    "id": "C2",
    "title": "Codex：沿公开运行机制理解一次编码任务",
    "nodes": [
      {
        "id": "C2-1",
        "title": "模型、CLI / IDE / App、harness 的职责边界"
      },
      {
        "id": "C2-2",
        "title": "读仓库 → 修改 → 执行测试 → 根据反馈继续"
      },
      {
        "id": "C2-3",
        "title": "AGENTS.md、上下文、工具与公开 harness 源码阅读"
      }
    ]
  },
  {
    "id": "C3",
    "title": "Claude Code：用同一组问题对照观察",
    "nodes": [
      {
        "id": "C3-1",
        "title": "收集上下文 → 采取行动 → 验证结果的循环"
      },
      {
        "id": "C3-2",
        "title": "CLAUDE.md、skills、MCP、hooks 与子 Agent"
      },
      {
        "id": "C3-3",
        "title": "长任务的上下文压缩、持久进度与会话恢复"
      }
    ]
  },
  {
    "id": "C4",
    "title": "串起来做最小实验",
    "nodes": [
      {
        "id": "C4-1",
        "title": "从一次真实工具调用追踪到模型输入输出"
      },
      {
        "id": "C4-2",
        "title": "用小模型 / 小数据观察 SFT 或 LoRA 的权重变化"
      },
      {
        "id": "C4-3",
        "title": "保存编码轨迹，设计测试反馈与留出评测"
      },
      {
        "id": "C4-4",
        "title": "同一模型更换 harness，分析提升来自哪一层"
      }
    ]
  },
  {
    "id": "C5",
    "title": "模型与 Harness 怎样共同改进？",
    "nodes": [
      {
        "id": "C5-1",
        "title": "冻结权重改运行系统；收集轨迹后再训练模型"
      },
      {
        "id": "C5-2",
        "title": "验证器、记忆、规划与恢复：哪些行为可以成为学习目标？"
      },
      {
        "id": "C5-3",
        "title": "训练环境与部署环境的差异、联合优化和独立消融"
      }
    ]
  },
  {
    "id": "C6",
    "title": "可信、安全与治理：能完成之外还要满足什么？",
    "nodes": [
      {
        "id": "C6-1",
        "title": "幻觉、事实依据、检索证据与不确定性"
      },
      {
        "id": "C6-2",
        "title": "提示注入、越权工具调用、隐私与数据边界"
      },
      {
        "id": "C6-3",
        "title": "沙箱、权限、审批、审计；鲁棒性与安全评测"
      }
    ]
  }
];
