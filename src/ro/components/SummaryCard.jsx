export default function SummaryCard({ icon, label, value, note, tone }) {
  return (
    <div className={`stat-card stat-card--${tone || 'primary'}`}>
      <div className="stat-card__icon">{icon}</div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {note && <div className="stat-card__note">{note}</div>}
      </div>
    </div>
  );
}