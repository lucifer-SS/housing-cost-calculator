# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

```sh
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
```

Requires Node.js 18+. Run `npm install` first.

## Architecture

React 18 + Vite 6 project. All source lives under `src/`. Static assets (SVG icons/logos) are in `public/assets/` and served verbatim by Vite.

### Component tree

```
App.jsx                        # Root: all state + calculate()
├── Header.jsx
├── inputs/PropertyDetails.jsx
├── inputs/LoanDetails.jsx
├── inputs/RentSavings.jsx
├── inputs/ExtraExpenses.jsx
└── results/Results.jsx
    └── results/GrowthChart.jsx   # Chart.js canvas wrapper
```

**`src/App.jsx`** — holds all form state (`useState`), the dynamic extra-expense events list, and the `calculate()` function which builds XIRR cash flows and passes the results object down to `Results`.

**`src/utils/finance.js`** — pure financial math, no React:
- `monthsBetween(d1, d2)` — integer month delta
- `xirr(cfs, dates, guess)` — Newton-Raphson XIRR solver
- `solveRate(P, E, O, m, guess)` — solves for monthly interest rate from loan principal, EMI, outstanding balance, and months elapsed
- `computeLoanParams(form)` — derives the "other pair" of loan parameters depending on `loanMode`

**`src/utils/format.js`** — formatting helpers for Indian Rupees: `fmtL`, `fmtCr`, `fmtINR`, `fmtDate`

**`src/index.css`** — all styles as CSS custom properties on `:root`. No CSS modules or Tailwind.

### Cash-flow construction in `calculate()`

1. Down payment on `purchaseDate` (negative).
2. One entry per month from EMI-start through `valuationDate`. From `movedInDate` onward the net monthly outflow is `-(emi - rent)` (rent is netted in, not a separate inflow).
3. Extra expense events (negative, dated individually).
4. Terminal inflow: `currentValue - outstandingLoan` on `valuationDate`.

**Chart:** `GrowthChart` receives a `chartData` prop and manages a Chart.js instance via `useRef`/`useEffect`, destroying and recreating on each prop change to avoid canvas reuse errors.

## Design tokens

All colours and radii are CSS custom properties on `:root` in `src/index.css`. Key accents:

| Variable | Use |
|---|---|
| `--accent` (`#c8f064`) | Primary highlight, XIRR value, "you" benchmarks |
| `--accent2` (`#7dd6a8`) | Positive / inflow values |
| `--accent3` (`#f0a05a`) | Neutral-warning values (e.g. effective outflow) |
| `--red` (`#f06464`) | Outflows and negative values |

## Currency and locale

All monetary helpers format in Indian Rupees with Indian locale:

- `fmtL(v)` — formats as lakhs (e.g. `₹21.00L`)
- `fmtCr(v)` — formats as crores when ≥ 1Cr, otherwise delegates to `fmtL`
- `fmtINR(v)` — full integer with `en-IN` thousand separators
