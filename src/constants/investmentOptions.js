// Investment option definitions shared across Loan Amortization and Rent & Invest pages.
// AmortizationPage uses 'invest-X' keys; RentInvestmentPage uses 'fd-X/debt-X/equity-X' keys.
// Both pages surface identical user-facing labels so the UI stays consistent.

export const RI_INVEST_OPTIONS = [
  { value: 'fd-7',      label: 'Invest @ 7% (FD)'     },
  { value: 'debt-9',    label: 'Invest @ 9% (Debt)'   },
  { value: 'equity-12', label: 'Invest @ 12% (Equity)' },
]

export const RI_INVEST_RATES = { 'fd-7': 7, 'debt-9': 9, 'equity-12': 12 }

export const AMORT_INVEST_OPTIONS = [
  { value: 'invest-7',  label: 'Invest @ 7% (FD)'     },
  { value: 'invest-9',  label: 'Invest @ 9% (Debt)'   },
  { value: 'invest-12', label: 'Invest @ 12% (Equity)' },
]

export const AMORT_INVEST_RATES = { 'invest-7': 7, 'invest-9': 9, 'invest-12': 12 }
export const AMORT_TAX_RATES   = { 'invest-7': 0.35, 'invest-9': 0.35, 'invest-12': 0.125 }
