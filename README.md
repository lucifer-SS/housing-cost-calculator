# Housing Cost Calculator

A browser-based tool with two tabs:

1. **House Investment** — compute the true XIRR on a residential property investment, accounting for every EMI, rent saving, and one-off expense month by month.
2. **Loan Amortization** — generate a full amortization schedule with rate changes, prepayments, top-ups, and invest-instead analysis including tax and effective rate.

## Live demo

Hosted on GitHub Pages: https://lucifer-ss.github.io/housing-cost-calculator/

---

## Tab 1 — House Investment

Most property ROI calculators compare only purchase price vs. current value. This tab accounts for:

- Monthly EMI outflows, dated individually for accurate XIRR
- Rent savings netted against EMI from move-in date, with configurable annual rent increase (compounded)
- Down payment and one-off expenses (registration, interiors, etc.)
- Outstanding loan balance at valuation date
- Two loan input modes: supply EMI & outstanding **or** interest rate & tenure — the other pair is computed
- Two valuation modes: enter the actual market value **or** an annual appreciation % — current value is auto-computed

The result is a **true XIRR** — the same metric used for mutual fund and SIP performance, making property returns directly comparable to financial assets.

### XIRR methodology

Newton-Raphson solver. Cash flows:
1. Down payment on purchase date (negative)
2. Monthly EMIs — net of rent savings from move-in date (negative). Rent compounds annually: `rent × (1 + annualIncrease%)^yearsElapsed`
3. One-off expenses at their dates (negative)
4. `currentValue − outstandingLoan` at valuation date (positive)

### Valuation modes
- **Actual value**: enter the current market value directly
- **Appreciation %**: `currentValue = purchaseValue × (1 + appreciation%)^(months/12)`

### Loan input modes
- **EMI & Outstanding**: supply monthly EMI and current outstanding balance — implied rate and tenure are computed via Newton-Raphson on the amortisation identity
- **Rate & Tenure**: supply interest rate and tenure — EMI and outstanding are computed via standard amortisation formulas

---

## Tab 2 — Loan Amortization

### Inputs

**Loan Details**
- Loan amount, annual interest rate, tenure (years or months)
- Optional EMI start date (enables date labels in schedule and date-based entries)
- Prepayment mode: Reduce Tenure or Reduce EMI

**Rate Changes**
- Add floating-rate adjustments at any date; each change takes effect from that EMI onward

**Investments & Top-ups**
- **Prepayment**: reduces principal, closes loan early (or lowers EMI)
- **Top-up**: increases outstanding, raises total interest
- **Invest @ 7% (FD)**: treat amount as an investment instead of prepaying — profit at loan closure offsets interest cost
- **Invest @ 9% (Debt)**: same, at 9% annual return
- **Invest @ 12% (Equity)**: same, at 12% annual return

Investments grow from the entered date until the loan closes (compounded annually). No withdrawal date needed.

### Results — Row 1 (always shown)

| Tile | Description |
|---|---|
| Monthly EMI | Starting EMI at the input rate |
| Total Interest | Actual interest paid per the schedule |
| Loan Closes | Date (or month number) when balance reaches zero |
| Tenure Saved / Full Tenure | Months saved by prepayments, and interest saved |

### Results — Row 2 (shown when prepayments or investments exist)

| Tile | Description |
|---|---|
| Estimated Tax | Flat tax on investment profits: FD/Debt 35%, Equity 12.5% |
| Interest Earned | Gross profit from all invest-instead entries |
| Net Interest | Total interest − investment profit + estimated tax |
| Effective Rate | Implied reducing-balance rate that explains net interest paid on original principal/tenure |

### Effective Rate methodology

Given **Net Interest**, **Original Principal (P)**, and **Original Tenure (n months)**:

1. Derive an implied EMI: `effectiveEmi = (netInterest + P) / n`
2. Solve for monthly rate `r` via Newton-Raphson:
   `f(r) = P·r·(1+r)^n − effectiveEmi·((1+r)^n − 1) = 0`
3. Annualise: `effectiveRate = r × 12 × 100`

At baseline (no modifications) this returns exactly the input loan rate. Prepayments reduce net interest → lower effective rate. Investments offset interest → lower effective rate. Top-ups increase interest → higher effective rate.

### Schedule table

Toggle between **Yearly** (summarised) and **Monthly** (full) views. Columns: opening balance, EMI, interest, principal, part payment, closing balance. Rate-change months are highlighted.

---

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

## Project structure

```
src/
├── App.jsx                         # Root: all state + calculate() for House Investment tab
├── main.jsx
├── index.css                       # All styles (dark theme, CSS custom properties)
├── components/
│   ├── Header.jsx
│   ├── inputs/
│   │   ├── PropertyDetails.jsx
│   │   ├── LoanDetails.jsx         # EMI & Outstanding / Rate & Tenure toggle
│   │   ├── RentSavings.jsx
│   │   └── ExtraExpenses.jsx
│   ├── results/
│   │   ├── Results.jsx
│   │   └── GrowthChart.jsx         # Chart.js wrapper
│   ├── amortization/
│   │   ├── AmortizationPage.jsx    # Full amortization tab: inputs, schedule, investment analysis
│   │   └── AmortizationChart.jsx   # Balance vs principal chart
│   └── shared/
│       ├── InfoTip.jsx
│       └── CurrencyInput.jsx       # Live comma-formatted ₹ input (en-IN locale)
└── utils/
    ├── finance.js                  # xirr(), solveRate(), monthsBetween(), computeLoanParams()
    ├── amortization.js             # buildSchedule(), calcEmi()
    └── format.js                   # fmtL(), fmtCr(), fmtINR(), fmtDate()
```

## Notes

- All amounts are in Indian Rupees (₹)
- Valuation date can be in the future (for projected returns)
- LTCG tax and broker commission are not deducted from House Investment results — see the footnote in the calculator
- Benchmark figures (Nifty 50, FD rates) are approximate historical averages
- Investment tax rates (35% FD/Debt, 12.5% Equity) are flat estimates — actual tax may vary based on holding period and slab
