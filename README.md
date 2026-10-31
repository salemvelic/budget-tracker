# Budget tracker

Local-first personal budget tracker for monthly spending, category budgets and bank statement imports. Built as a portfolio project with Vue 3 and TypeScript.

**Live demo:** https://salemvelic.github.io/budget-tracker/

## Features

- Calendar-month dashboard: spend vs. monthly limit, daily allowance, spend by category, emergency fund progress
- Monthly budget per category with progress and overspend warnings
- Manual transactions (card, Revolut, cash)
- Statement import, parsed entirely in the browser:
  - **Erste card statement PDF** ("Obavijest o troškovima"): purchases, refunds, installments, membership fee, foreign-currency notes
  - **Revolut statement PDF** and **Revolut CSV**: card payments, refunds and plan fees; top-ups, transfers, investments, cash withdrawals, pending and reversed rows are skipped
  - Re-importing the same statement adds nothing; deleted imported rows stay deleted
- Category rules (yours first, then built-in), with one-click recategorisation of "Other"
- JSON backup export/restore and a persistent-storage request
- Croatian and English UI (`vue-i18n`)
- All data stays in the browser (IndexedDB via Dexie)

## Tech stack

- Vue 3, TypeScript, Vite, Pinia, Vue Router (hash history for GitHub Pages)
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Dexie, Vitest, ESLint, Prettier

## Privacy

Financial data is stored only in your browser (IndexedDB). Nothing is sent to a server; PDFs are read locally with pdf.js. Do not commit real bank exports: `.gitignore` blocks `data/`, PDF, CSV, XLSX and backup files, and all test fixtures are fictional.

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
