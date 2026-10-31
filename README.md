# Budget tracker

Local-first personal budget tracker for monthly spending, category budgets and bank statement imports. Built as a portfolio project with Vue 3 and TypeScript.

**Live demo:** https://salemvelic.github.io/budget-tracker/

## Features

- Calendar-month dashboard: spend vs. limit (sum of category limits, or a global limit), fixed costs set aside up front, daily allowance for variable spending, savings this month, spend by category, emergency fund progress, and the latest imported date per bank so incomplete months are visible
- Monthly budget per category with progress, overspend warnings and a "fixed cost" flag (e.g. loans)
- Subcategories that roll up into their parent: Food (groceries, restaurants & delivery) and Going out (bars & cafés, entertainment & culture), plus Travel; limits are set on the top-level category
- Manual transactions (Erste card, Revolut, ZABA account, cash); change the category inline and optionally remember it for the merchant (creates a rule and updates the merchant's other transactions)
- Statement import, parsed entirely in the browser; several PDFs at once, with per-row category choice before import:
  - **Erste card statement PDF** ("Obavijest o troškovima"): purchases, refunds, installments, membership fee, foreign-currency notes
  - **Revolut statement PDF**: card payments, cash withdrawals (Cash category, Revolut fee included), refunds and plan fees; Robo portfolio, investment account and crypto transfers are recorded as Savings & investments (one row per day, not counted as spending); top-ups, transfers, pending and reversed rows are skipped
  - **Zagrebačka banka PDF** ("Jedinstveni izvadak građana", current account in EUR): card purchases, installments, cash withdrawals, loan instalments (Loans category), bills, transfers to others, fees and card refunds; salary and other incoming payments, Revolut top-ups and Erste card bill payments are skipped (they are already counted from those statements), loan sub-account sections are ignored
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
