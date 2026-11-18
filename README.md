# Polity · Research Politics

A responsive political research wiki and interactive infographic website, built with Next.js, React and TypeScript. Articles are statically generated; no database, API keys or backend are required.

## Develop

Use Node.js 22 or newer (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open port 3000. Search and filter field notes, open a topic, or adjust the electoral-system model. The model is illustrative, not empirical data. Each article includes a further-reading source.

## Validate and build

```sh
npm run build
npm run typecheck
npm test
```

`next build` generates the static site in `out/`, including all topic routes and a 404 page. Preview that output with `python3 -m http.server 3000 --directory out`. This project uses static export; `next start` is not used.

## Deploy on Vercel

1. Import `adludo/research-politics` into Vercel.
2. Select the `feat/research-wiki` branch for the initial deployment (or merge it into your chosen production branch).
3. Keep the detected **Next.js** framework preset, the repository root directory, and the default `npm run build` command. Next.js static export is supported automatically; no environment variables are needed.
4. Deploy. Future pushes create deployments through the Vercel Git integration.

This repository is deployment-ready; Vercel account linking and production deployment happen in Vercel.

## Edit the wiki

Add an entry to `lib/topics.ts` with a unique slug, summary, body, takeaway and authoritative source URL. Topic pages and category filters are generated from this data. Adjust the landing page in `app/page.tsx`, styling in `app/globals.css` and the interactive seat model in `components/VoteLab.tsx`.

The initial four articles are introductory editorial content. Review and expand them before treating this as a comprehensive research resource. The voting model uses a single nationwide 100-seat district and integer vote shares; ties in winner-takes-all mode go to the first listed party. It does not model any specific country's electoral law.

Fonts are optionally loaded from Google Fonts with local serif/sans-serif fallbacks. No analytics or tracking scripts are included.
