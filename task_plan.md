# LLM survey coverage audit — 2026-11-13

Goal: download recent, relevant survey PDFs into llm/papers, inspect their actual organization, and audit the learning tree without claiming exhaustive coverage.

- Complete: verify candidate titles, dates, versions and primary download sources.
- Complete: downloaded and extracted all six PDFs; inspected bookmarks, taxonomy figures and relevant sections.
- Complete: wrote paper index, coverage comparison and evidence-based tree additions (13 → 19 main nodes).
- Complete: verified PDF signatures, page totals, SHA-256 hashes, extracted page coverage, topic IDs and local links.
- Final handoff: synchronize selected files and send HD Feishu reviews; authoritative completion receipts live in the operation audit directories, rather than being reconstructed here.

Known limits: “latest” is limited to this search; older broad surveys may complement recent specialized surveys. Public paper availability does not by itself establish redistribution rights.

Errors: local PDF parsers were absent, so installed them only in temporary dependency storage. An inline index-generation command had a quote-delimiter error before execution; corrected quoting and generated the index successfully. The known bundled diff renderer fails in this installation; use the verified deterministic HD fallback and per-page send receipts.

Final packaging fixes: Pygments has no lexer for .gitignore in this installation, so render pattern-only Git metadata as exact plain text. Git initially detected one PDF as text; explicitly mark PDFs binary before staging and compare staged PDF bytes against download hashes to prevent line-ending conversion.
