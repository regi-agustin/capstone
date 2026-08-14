import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageCount, onPage, total, label }) {
  const count = Math.max(1, pageCount)
  return (
    <div className="toolbar" style={{ justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
      <span className="cell-sub">{label}</span>
      <div className="toolbar">
        <button
          className="btn btn--secondary btn--icon btn--sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        <button className="btn btn--primary btn--sm">
          {page} of {count}
        </button>
        <button
          className="btn btn--secondary btn--icon btn--sm"
          disabled={page >= count}
          onClick={() => onPage(page + 1)}
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
