# Budget tracker

Local-first personal budget tracker for tracking monthly spending, category budgets, and CSV imports. Built as a portfolio project with Vue 3 and TypeScript.

**Live demo:** https://salemvelic.github.io/budget-tracker/

## Features (planned)

- Calendar-month budgets and spending summaries
- Manual transactions and CSV import (bank + Revolut)
- Category rules, emergency fund progress, card bill estimate
- Croatian and English UI (`vue-i18n`)
- All data stays in the browser (IndexedDB via Dexie)

## Tech stack

- Vue 3, TypeScript, Vite, Pinia, Vue Router (hash history for GitHub Pages)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Dexie, Vitest, ESLint, Prettier

## Privacy

Financial data is stored only in your browser (IndexedDB). Nothing is sent to a server. Do not commit real bank exports; `.gitignore` blocks CSV/XLSX and backup files.

## Development

Requires Node.js **22+** (see `.nvmrc`).

```bash
npm install
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
```

## Deploy (GitHub Pages)

1. Push to GitHub (`main` branch).
2. Repository **Settings → Pages → Build and deployment → Source:** GitHub Actions.
3. After the `deploy` workflow succeeds, the site is at `https://<user>.github.io/budget-tracker/`.

`vite.config.ts` uses `base: '/budget-tracker/'`. Rename the repo if you use a different path.

## License

MIT — see [LICENSE](./LICENSE).
