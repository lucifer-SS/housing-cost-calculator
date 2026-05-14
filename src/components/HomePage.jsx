export default function HomePage({ onNavigate }) {
  return (
    <div className="home-page">
      <p className="home-tagline">Select a calculator to get started</p>
      <div className="home-tiles">
        <button className="home-tile" onClick={() => onNavigate('housing')}>
          <div className="home-tile-inner">
            <div className="home-tile-label">XIRR · CAGR · Ledger</div>
            <div className="home-tile-title">House Investment</div>
            <p className="home-tile-desc">
              Compute the true annualised return on your property — EMIs, rent saved,
              extra expenses and today's value, all dated month by month.
            </p>
          </div>
          <span className="home-tile-arrow">→</span>
        </button>

        <button className="home-tile" onClick={() => onNavigate('amortization')}>
          <div className="home-tile-inner">
            <div className="home-tile-label">EMI · Prepayment · Invest</div>
            <div className="home-tile-title">Loan Amortization</div>
            <p className="home-tile-desc">
              Full EMI schedule with part payments, floating rate changes and
              invest-instead analysis to find your effective borrowing cost.
            </p>
          </div>
          <span className="home-tile-arrow">→</span>
        </button>

        <button className="home-tile" onClick={() => onNavigate('rent-invest')}>
          <div className="home-tile-inner">
            <div className="home-tile-label">SIP · SWP · XIRR</div>
            <div className="home-tile-title">Rent &amp; Invest</div>
            <p className="home-tile-desc">
              See how your wealth grows renting and investing — lump sum compounded,
              monthly SIP from EMI surplus, and corpus evolution over your chosen tenure.
            </p>
          </div>
          <span className="home-tile-arrow">→</span>
        </button>
      </div>
    </div>
  )
}
