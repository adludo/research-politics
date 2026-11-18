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
