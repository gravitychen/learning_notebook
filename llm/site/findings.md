# Design and content findings

- User approved ADMM's white slides, large diagrams, restrained red emphasis, physical/computational meaning before formula, expandable derivations, Python examples and real numerical inspection.
- Latest steering narrows scope from 19 modules to a single knowledge point per requested lesson.
- Keep the complete 19-node tree as navigation, but never render ungenerated nodes as completed lessons.
- The existing authenticated R2 progress pattern can be reused with an explicit LLM node whitelist; no live AI API is needed for the lesson.
- The learner remembers encoder/decoder and softmax but forgot QKV; use information flow before equations, then a hand-computable example. The first topic is explicitly QKV, replacing an unpublished pretraining draft.
- Original Transformer paper section 3.2 grounds scaled dot products, learned projections and self/cross-attention sources. Teaching matrices are untrained; Q=K is an intentional fixture choice, not a model constraint.
- Mobile SVGs need reflow into taller diagrams; reducing the desktop figure made labels too small. Page dots use explicit circles rather than shrinking to narrow bars.
- Progress caches must be scoped to verified user identity; discard in-memory pending edits on an account switch and retain the original account's cache for retry.
- Learner requests the original Transformer architecture as the persistent reference. Use Figure 1 for module location, Figure 2 for nested computation; keep the causal example anchored to Decoder masked self-attention and expose encoder/cross comparison on its existing slide.
- Distinguish Figure 2's pre-projection input labels from this lesson's projected single-head Q/K/V; distinguish attention SoftMax from the vocabulary Softmax atop Figure 1. Single-head O still needs concatenation/output projection before leaving the large attention block.
