export default function Header({ onHome }) {
  return (
    <header>
      <img
        src="./assets/hirc-logo.svg"
        alt="Housing Cost Calculator"
        height="44"
        onClick={onHome}
        style={{ cursor: onHome ? 'pointer' : 'default' }}
      />
      <div className="header-badge">XIRR · CAGR · Amortisation</div>
    </header>
  )
}
