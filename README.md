# Housing Cost Calculator

A browser-based tool to compute the **true XIRR (annualised return)** on a residential property investment — accounting for every EMI, rent saving, and one-off expense, month by month.

## What it does

Most property ROI calculators compare only purchase price vs. current value. This calculator accounts for:

- Monthly EMI outflows (dated individually for accurate XIRR)
- Rent savings netted against EMI from move-in date
- Down payment and one-off expenses (registration, interiors, etc.)
- Outstanding loan balance at valuation date
- Two input modes: supply EMI & outstanding **or** interest rate & tenure — the other pair is computed

The result is a **true XIRR** — the same metric used for mutual fund and SIP performance, making property returns directly comparable to financial assets.

## Live demo

Hosted on GitHub Pages: `https://<username>.github.io/housing-cost-calculator/`

## Getting started

### Prerequisites
- Node.js 18+

### Development
```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production
```bash
npm run build
```

Output goes to `dist/`. All asset paths are relative, so the build works when hosted at any subdirectory.

### Preview production build
```bash
npm run preview
```

## Deploying to GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

**First-time setup:**
1. Push this repository to GitHub
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. Push a commit to `main` — the workflow will build and publish automatically

The live URL will be `https://<your-username>.github.io/<repo-name>/`.

## Project structure

```
src/
├── App.jsx                   # Root component: all state + calculate logic
├── main.jsx                  # React entry point
├── index.css                 # All styles (dark theme, CSS custom properties)
├── components/
│   ├── Header.jsx
│   ├── inputs/
│   │   ├── PropertyDetails.jsx
│   │   ├── LoanDetails.jsx
│   │   ├── RentSavings.jsx
│   │   └── ExtraExpenses.jsx
│   ├── results/
│   │   ├── Results.jsx       # Orchestrates all result sub-sections
│   │   └── GrowthChart.jsx   # Chart.js wrapper
│   └── shared/
│       └── InfoTip.jsx
└── utils/
    ├── finance.js            # xirr(), solveRate(), monthsBetween(), computeLoanParams()
    └── format.js             # fmtL(), fmtCr(), fmtINR(), fmtDate()
```

## Calculation methodology

### XIRR
Newton-Raphson solver. Cash flows:
1. Down payment on purchase date (negative)
2. Monthly EMIs — net of rent savings from move-in date (negative)
3. One-off expenses at their dates (negative)
4. `currentValue − outstandingLoan` at valuation date (positive)

### Loan mode: EMI & Outstanding → implied rate & tenure
Solves for monthly rate `r` using Newton-Raphson on the amortisation identity:
`outstandingLoan = P·(1+r)^m − EMI·((1+r)^m − 1)/r`

Total tenure: `n = ln(EMI / (EMI − P·r)) / ln(1+r)`

### Loan mode: Rate & Tenure → EMI & outstanding
Standard amortisation formulas:
- `EMI = P·r·(1+r)^n / ((1+r)^n − 1)`
- `outstanding = P·(1+r)^m − EMI·((1+r)^m − 1)/r`

where `m` = months elapsed between purchase date and valuation date.

## Notes

- All amounts are in Indian Rupees (₹)
- Valuation date can be in the future (for projected returns)
- LTCG tax and broker commission are not deducted — see the footnote in the calculator
- Benchmark figures (Nifty 50, FD rates) are approximate historical averages
