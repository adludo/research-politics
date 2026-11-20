# Wiki editorial instructions

These instructions apply to all wiki prose, article metadata, infographic labels, captions, explanatory text, and code for infographics and interactive features in this repository.

## Write succinctly and impartially

- Use plain language, short paragraphs and only the detail needed to explain the subject accurately. Preserve context that changes a claim's meaning.
- Describe parties, politicians and policies without advocacy, loaded language, speculation about motives or unsupported judgments. Apply the same evidence standards to every party.
- Distinguish established facts, attributed statements, allegations, interpretations and illustrative models. Attribute opinions to their authors. Neutrality does not require equal weight for claims with unequal evidence.
- Include the country or jurisdiction and relevant dates. Distinguish a party's stated position from enacted policy, voting records and actions by individual members.

## Verify important claims about parties

- Before publishing or updating any important claim about a political party, always double-check it against the actual underlying source. This includes policies, promises, ideology, leadership, election results, votes, funding, historical conduct, controversies and allegations. Never rely on memory, search snippets, AI output or an existing wiki entry as verification.
- Open and read the source. Confirm that it directly supports the exact wording, party, jurisdiction and time period. Check its author or issuing institution, publication date, authenticity, methodology where relevant, and any corrections or newer evidence.
- Prefer authoritative primary records: electoral commissions for results, parliamentary records for votes, legislation for legal changes, official registers or audited disclosures for funding, and dated party manifestos for stated policies. A party's own material supports what it says, not independent proof that its claims are true or its policies succeeded.
- Cross-check consequential, disputed or potentially reputational claims with a second independent, credible source where available. Two reports repeating the same original allegation are not independent confirmation. Identify allegations as allegations, include the relevant response or outcome when verified, and avoid implying guilt from an accusation.
- When sources conflict, explain the disagreement and assess the evidence rather than silently choosing a preferred account. If verification or necessary corroboration is unavailable, omit or clearly qualify the claim and report the verification gap. Never invent a citation or describe an unread source as verified.

## Make evidence traceable

- Attach a citation directly to each important party claim, including claims inside infographics. Link to the specific document, page, section, table or record rather than a general homepage.
- Give enough citation detail to retrace the check: publisher or author, document title, publication or update date when available, URL, and access date. Include page numbers or section identifiers for long documents; use a stable archive when needed and identify it as archived.
- Date time-sensitive statements explicitly (for example, "As of 18 November 2026"). Preserve historical context and recheck sources whenever such claims are edited.
- Label simulated figures and assumptions clearly. Cite real data, explain units and denominators, and do not present illustrative outputs as observed political facts.

## Build clean, efficient and reusable interactive features

- Keep infographic and interactive code clean, readable and modular. Use descriptive names, focused components and explicit TypeScript interfaces for inputs and outputs.
- Separate source data, calculation logic, presentation and interaction state. Extract shared components, pure functions and hooks where they enable reuse; avoid duplicated logic and unnecessary abstractions.
- Make visualisations configurable through typed props and data rather than hard-coded topic-specific values. Keep units, assumptions and source metadata alongside the data they describe.
- Use efficient algorithms and keep client-side state and dependencies minimal. Avoid redundant calculations and renders; add memoisation or other optimisations when measurement or clear computational cost justifies them.
- Preserve keyboard access, accessible labels, responsive layouts and reduced-motion preferences when creating or reusing interactive components.
- Verify calculation correctness and meaningful interaction behaviour with appropriate tests, including relevant edge cases. Run the build and type check for code changes.
- Do not keep newly written tests in the repository unless the user explicitly asks; use temporary tests for verification and remove them before committing. Preserve pre-existing tests unless their removal is requested.

## On-demand verification subagent

- The dedicated `wiki-verifier` subagent runs only when explicitly requested for one target page. Adding or editing data does not invoke it. Normal editorial checks above remain the author's responsibility.
- Use `docs/agents/wiki-verifier.md` as its shared instructions. Cursor uses `.cursor/agents/wiki-verifier.md`; Codex uses the explicit-only `$verify-wiki-page` skill. See `docs/wiki-verification.md` for invocation and capability requirements.
- The verifier may only append dated run records to `data/verification-runs.json`, rendered at `/verification/`. Preserve earlier runs, distinguish conflicts from source-access gaps, and do not auto-correct articles or commit/push its findings without a separate request.

## Before completing an editorial change

- Review every important party claim for a supporting citation, accurate attribution, current context and impartial wording. Follow the citations again to confirm they support the final wording.
- Summarize what was verified and disclose unresolved evidence gaps. Run the repository checks appropriate to any accompanying code changes; prose-only edits do not require an application build.


## Branch and commit conventions

For branches and commits created by ChatGPT, Codex, or other coding agents:

- Use descriptive lowercase branch names with hyphens, such as `chore/agent-commit-format`.
- Follow the existing repository history: use `<TYPE>: <short lowercase description>` for commit subjects.
- Use `FEAT` for new functionality, `FIX` for bug fixes, and `CHORE` for documentation, configuration, maintenance, and agent instructions.
- Keep the type uppercase, followed by a colon and one space. Describe the concrete change without a trailing period.
- Examples: `FEAT: insects spawn every 3 seconds on frog game`, `FIX: insects do not stack up while frog game not in focus`, `CHORE: updated agent branch and commit conventions`.
- Use these conventions for new work; do not rewrite existing commits unless explicitly requested.

When tasked with a feature or bug fix, adhere to this exact 3-step process:

1. **Context & Impact Analysis:** Briefly state what files will be affected and identify any potential breaking changes or edge cases before writing code.
2. **Implementation:** Provide clean, well-formatted code blocks with explicit filenames. 
3. **Verification Checklist:** Supply a 2-3 bullet point checklist detailing exactly how to manually test or verify the changes.
