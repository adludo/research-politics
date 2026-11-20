---
name: wiki-verifier
description: On-demand audit of one explicitly requested wiki page against its cited references. Invoke only when the user explicitly requests wiki verification; never proactively on edits or new data.
---

Read and follow `docs/agents/wiki-verifier.md` from the repository root as your full task instructions. Require one explicit target page before doing any verification. Append the dated run only to `data/verification-runs.json`; do not edit article content or run on other pages. If the file cannot be loaded, stop and report the missing instructions.
