# Research Politics

A minimal Next.js, React and TypeScript shell for a wiki and interactive infographics. No articles, sample data or interactive models are included. No database, API keys or backend are required.

## Develop

Use Node.js 22 or newer (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open port 3000 to view the empty wiki homepage.

## Validate and build

```sh
npm run build
npm run typecheck
```

`next build` generates the static site in `out/`, including the homepage and a 404 page. Preview that output with `python3 -m http.server 3000 --directory out`. This project uses static export; `next start` is not used.

## Deploy on Vercel

1. Import `adludo/research-politics` into Vercel.
2. Select the branch you want to deploy, or merge it into your chosen production branch.
3. Keep the detected **Next.js** framework preset, the repository root directory, and the default `npm run build` command. Next.js static export is supported automatically; no environment variables are needed.
4. Deploy. Future pushes create deployments through the Vercel Git integration.

This repository is deployment-ready; Vercel account linking and production deployment happen in Vercel.

## Build the wiki

Start with `app/page.tsx` for the homepage and `app/globals.css` for styling. Add article routes and reusable infographic components as material is developed. Follow `AGENTS.md` for editorial verification, code quality and commit conventions.

The former sample articles and voting model have been removed, including their topic URLs. The project uses system fonts and has no external font requests, analytics or tracking scripts.

## Victorian election comparison draft

`/elections/victoria-2026/` organises the contributor's 18 November 2026 summary into nine policy areas. `data/victoria-2026.json` stores the claims, supplied citations and verification metadata separately from presentation. The draft is marked `noindex` and prominently labelled as unverified; citations and current-election relevance could not be checked because all 34 source requests returned proxy 403 errors. Source labels derived from URLs are not authenticated document titles. Null publication and verification dates are intentional.

Before marking claims verified, read the exact source, record authentic document metadata and a successful access date, confirm eligibility, amounts, timelines and election relevance, distinguish new commitments from existing programs, and corroborate consequential or disputed claims. Do not treat a successful URL request alone as factual verification. See `AGENTS.md` for the full editorial rules.

## Reusable policy sections

`components/ui/ExpandableSection.tsx` provides a native, keyboard-accessible disclosure with a title, description, optional index and arbitrary children. Give each panel a unique, URL-safe `id`; following a matching hash opens it when JavaScript is available. Native toggling works without JavaScript, and multiple panels can stay open.

`components/policies/PolicyComparison.tsx` renders typed policy-area data into disclosures and responsive party cards. Its props supply `sections`, a `sources` map, `verificationNotice` and `referenceStatus`; the components do not import election-specific data. `PartyPolicyCard` and `SourceReference` are also reusable individually. Keep reference-status labels accurate for the dataset being displayed. Missing source IDs fail rendering rather than silently dropping a citation.

The Victoria comparison uses these components with its existing data and verification notices. The underlying source verification status is unchanged.

Party cards are also independently expandable. `PartyPolicyCard` takes a unique `id`, and the comparison supplies IDs such as `budget-party-1`. Linking to a party ID opens both that party and its enclosing policy area. The generic `ExpandableSection` supports `variant="compact"` and `headingLevel={3}` for nested disclosures; its defaults remain suitable for top-level policy areas. Party panels start closed, retain native keyboard controls, and keep their state when the enclosing area is closed and reopened.

For secondary article context, use `ExpandableSection` with `variant="subtle"`. The Victoria article uses it for the disclaimer and scope: both start collapsed, while the draft-status title remains visible. Their original text, citations and hash targets are retained.

## Victorian budget source data

[Official Victorian budget and historical financial datasets](data/victorian-budget/README.md) are stored in `data/victorian-budget/`: 15 original workbooks and the November 2026 Pre-Election Budget Update PDF, with source URLs, retrieval dates, checksums and coverage notes. Original budget-paper PDFs hosted on S3 are listed separately as not downloaded.
