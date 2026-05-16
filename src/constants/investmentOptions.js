// Investment option definitions shared across Loan Amortization and Rent & Invest pages.
//
// Key formats differ per page intentionally — AmortizationPage uses 'invest-X' to
// distinguish invest rows from prepayment rows; RentInvestmentPage uses 'fd-X/debt-X/equity-X'.
// The shared helper functions below handle both formats transparently.

export const RI_INVEST_OPTIONS = [
  { value: 'fd-7',      label: 'Invest @ 7% (FD)'      },
  { value: 'debt-9',    label: 'Invest @ 9% (Debt)'    },
  { value: 'equity-12', label: 'Invest @ 12% (Equity)' },
]

export const AMORT_INVEST_OPTIONS = [
  { value: 'invest-7',  label: 'Invest @ 7% (FD)'      },
  { value: 'invest-9',  label: 'Invest @ 9% (Debt)'    },
  { value: 'invest-12', label: 'Invest @ 12% (Equity)' },
]

// Unified rate/tax lookups — handle both 'fd-7' and 'invest-7' key formats.
const _RATE_MAP = {
  'fd-7': 7,   'debt-9': 9,   'equity-12': 12,
  'invest-7': 7, 'invest-9': 9, 'invest-12': 12,
}
const _TAX_MAP = {
  'fd-7': 0.35,   'debt-9': 0.35,   'equity-12': 0.125,
  'invest-7': 0.35, 'invest-9': 0.35, 'invest-12': 0.125,
}

export function getInvestRate(key)    { return _RATE_MAP[key] ?? 12 }
export function getInvestTaxRate(key) { return _TAX_MAP[key] ?? 0 }
export function isInvestKey(key)      { return key in _RATE_MAP }
