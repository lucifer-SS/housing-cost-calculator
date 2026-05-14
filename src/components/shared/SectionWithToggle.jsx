export default function SectionWithToggle({ title, enabled, onToggle, offMessage, children }) {
  return (
    <div className="input-section">
      <div className="section-label">
        {title}
        <div className="section-toggle-pill">
          <button
            className={`section-toggle-btn${enabled ? ' active' : ''}`}
            onClick={() => !enabled && onToggle()}
          >Included</button>
          <button
            className={`section-toggle-btn${!enabled ? ' active' : ''}`}
            onClick={() => enabled && onToggle()}
          >Excluded</button>
        </div>
      </div>
      {!enabled && offMessage && <p className="section-off-note">{offMessage}</p>}
      {enabled && children}
    </div>
  )
}
