---
name: verify-wiki-page
description: Explicitly requested verification of one wiki page by a dedicated subagent, with dated findings in the verification log. Never invoke automatically when content is added or edited.
---

Use only when the user explicitly requests this verification workflow. Require one target wiki route or source path; ask for it if absent. Configuration/setup requests do not authorise an audit.

Read `docs/agents/wiki-verifier.md` and `docs/wiki-verification.md` from the repository root. Delegate to one subagent with the target, the complete shared verifier instructions, and repository access. Tell it to audit only that page and to write only `data/verification-runs.json`. Do not perform the audit in the parent thread or start other page audits.

If this Codex session does not support subagents, report that limitation rather than pretending to delegate. The user can choose a supported session. Do not enable features or change user configuration silently.

After the subagent returns, review its appended log record for schema compliance, accurate counts, preserved earlier runs and evidence supporting each outcome. Serialise writes if other runs are ongoing. Report the findings and persistence status, linking `/verification/`. Do not modify policy text, mark article claims verified, commit, push or publish without a separate request. Do not retain temporary tests.
