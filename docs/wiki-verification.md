# On-demand wiki verifier

The verifier's only job is to compare statements on one requested page with the references attached to them. It reports findings; it does not rewrite the article or automatically mark it verified. The shared instructions are in `docs/agents/wiki-verifier.md`.

## Cursor

The repository defines `.cursor/agents/wiki-verifier.md` for Cursor versions supporting project subagents. Open the repository in Agent mode and explicitly request:

> Use the wiki-verifier subagent to audit only /elections/victoria-2026/. Follow docs/agents/wiki-verifier.md and append this run to data/verification-runs.json. Do not edit the article.

For another page, replace the route with its local route or source path. Confirm Cursor actually delegates to the named subagent. If your Cursor version does not support/discover `.cursor/agents/`, update/use a version with subagent support; merely mentioning a name does not create an isolated agent. Do not use an always-applied rule to trigger this workflow.

## Codex

The repository supplies an explicit-only skill at `.agents/skills/verify-wiki-page/`. In a Codex session with skills and subagents available, invoke:

```text
$verify-wiki-page /elections/victoria-2026/
```

The skill tells the parent to spawn one subagent with the shared instructions and target, then review its run record. Its `agents/openai.yaml` sets `allow_implicit_invocation: false`. No native custom-role registration, CLI flags or global configuration changes are assumed. If the skill is not listed, reopen the repository/session to refresh discovery, or use this explicit prompt:

> Spawn one subagent to audit only /elections/victoria-2026/. Give it the complete instructions in docs/agents/wiki-verifier.md. Its only allowed repository edit is appending a run to data/verification-runs.json. Review its output; do not change the article.

This requires a Codex client/session that exposes delegation. If subagents are unavailable, report that fact and switch to a supported session; do not claim an ordinary parent-thread audit was delegated. Web access is separately required for live evidence. Do not enable or configure either capability silently.

## No automatic runs

No Git hook, CI workflow, watcher, startup script or build hook invokes the verifier. Neither article edits nor adding data requests an audit. The normal editorial responsibilities in `AGENTS.md` still apply to authors; they do not automatically invoke this subagent. Creating these definitions does not perform an initial verification run.

## Dedicated history and conflicts page

The wiki page `/verification/` renders `data/verification-runs.json`. The homepage and election article link to it. It starts empty with an explicit “not audited” message, not a manufactured successful run. Each requested run appears with Melbourne-local completion time, raw ISO timestamps, research-as-of date, target, Git revision, reviewed file hashes, all claim outcomes, quotes, source metadata and suggested corrections. Claim evidence retrieval dates are shown separately from source publication/update/crawl dates.

`contradicted`, `partial` and `outdated` findings are conflicts. `inaccessible`, `missing-reference` and `unverifiable` are gaps, not proof of factual falsity. A run with only supported claims is still recorded. Historical conflicts remain visible and do not establish the current article is still wrong. Later runs can link an earlier same-page run via `supersedesRunId`; old records must not be deleted or rewritten. Prior findings must be explicitly reassessed, not silently treated as resolved.

## Run record contract

See the complete interfaces in `data/verification-types.ts`. Append to the `runs` array in chronological append order:

- `id`: unique URL-safe `run-*` ID, incorporating a timestamp and unique suffix.
- `target`: the exact requested local page route or source path.
- `startedAt`, `completedAt`: ISO 8601 timestamps with explicit offsets. `researchAsOf`: `YYYY-MM-DD` in Australia/Melbourne.
- `revision`: full Git commit; `dirty`: whether uncommitted changes were included; `reviewedFiles`: repository paths and SHA-256 hashes for the page and contributing content/data.
- `status`: `complete` or `incomplete`; `supersedesRunId`: earlier same-page run ID or null; `summary`: concise coverage/limitations.
- `findings`: one record per atomic statement, including supported statements. Each has `claimId`, `location`, exact `statement`, supplied `sourceUrls`, `status`, `explanation`, `suggestedCorrection` (or null) and an `evidence` array.
- Each evidence item has `url`, actual `publisher` and `title` (or null), `retrievedAt`, `method` (`direct-http`, `extracted-page`, `search-snippet` or `supplied-document`), `publicationDate`, `updateDate`, `crawlDate`, short exact `quote`, `locator` and `accessNote`. Unknown metadata uses null; failed access uses no invented quote. Record actual errors in `accessNote`.

Use `supported`, `contradicted`, `partial`, `outdated`, `missing-reference`, `inaccessible` or `unverifiable` for finding status. Claims without readable/full enough evidence must not be marked supported. Compound statements must be split, and every factual statement—including page dates and scope/ranking claims—must be accounted for. If access prevents completion, record what was attempted and what remains unchecked, with `status: incomplete`.

After appending, run:

```sh
python3 scripts/validate-verification-log.py
npm run build
npm run typecheck
```

The validator checks structure, required provenance, unique IDs, timestamps and minimum evidence requirements. It cannot establish that quotes are authentic, claims are exhaustive or conclusions correct; the parent must inspect the actual evidence and review the diff. Re-read the latest log before appending and serialise concurrent writes. Commit/push only when requested separately.
