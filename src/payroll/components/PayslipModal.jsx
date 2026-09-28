import { useEffect, useState } from 'react'
import { Printer, Pencil } from 'lucide-react'
import Modal from '../../ro/components/Modal.jsx'
import StatusBadge from '../../ro/components/StatusBadge.jsx'
import {
  EARNINGS_META,
  DEDUCTIONS_META,
  statusLabel,
  formatDate,
  formatPeso,
  fetchCompanySettings,
} from '../services/payrollService.js'

const TRACK = ['draft', 'for_review', 'approved', 'paid']

export default function PayslipModal({ detail, onClose, onEditDraft }) {
  const [companyName, setCompanyName] = useState('FleetOps Car Rental')

  useEffect(() => {
    fetchCompanySettings()
      .then((s) => {
        if (s && s.companyName) setCompanyName(s.companyName)
      })
      .catch(() => {})
  }, [])

  if (!detail) return null
  const idx = TRACK.indexOf(detail.status)
  const isCancelled = detail.status === 'cancelled'
  const earnings = detail.earnings || {}
  const deductions = detail.deductions || {}

  return (
    <Modal
      open
      onClose={onClose}
      title={`Payslip — ${detail.driverName}`}
      subtitle={`#${detail.id} · Cut-off ${formatDate(detail.cutoffStart)} – ${formatDate(detail.cutoffEnd)}`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print / PDF
          </button>
          {detail.status === 'draft' && onEditDraft && (
            <button type="button" className="btn btn--primary" onClick={() => onEditDraft(detail)}>
              <Pencil size={15} /> Edit Draft
            </button>
          )}
          <button type="button" className="btn btn--neutral" onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      <div className="payslip">
        <div className="payslip__head">
          <div className="payslip__company">{companyName}</div>
          <div className="payslip__title">
            DRIVER PAYSLIP · {cutoffTitle(detail)} · Payroll Date {formatDate(detail.payrollDate)}
          </div>
          <div style={{ marginTop: 10 }}>
            <StatusBadge status={statusLabel(detail.status)} />
          </div>
        </div>

        {isCancelled ? (
          <p className="form-hint" style={{ marginBottom: 12 }}>
            This payroll record was cancelled and was not paid.
          </p>
        ) : (
          <div className="status-track">
            {TRACK.map((s, i) => (
              <span key={s} className="status-track__node" style={{ display: 'inline-flex' }}>
                <div
                  className={[
                    'status-track__line',
                    i > 0 && i <= idx ? ' is-reached' : '',
                  ].join('')}
                  style={i > 0 ? undefined : { display: 'none' }}
                />
                <span className={['status-track__node', i <= idx ? ' is-reached' : '', i === idx ? ' is-current' : ''].join(' ')}>
                  <span className="status-track__dot" />
                  {statusLabel(s)}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="payslip__meta">
          <MetaCell label="Driver" value={detail.driverName} />
          <MetaCell label="Car Owner" value={detail.carOwner || '—'} />
          <MetaCell label="Plate Number" value={detail.plateNumber || '—'} />
          <MetaCell label="Car Code" value={detail.carCode || '—'} />
          <MetaCell label="Vehicle Type" value={detail.vehicleType || '—'} />
          <MetaCell label="Trips Included" value={String(detail.tripCount)} />
          <MetaCell label="Submitted By" value={detail.submittedByName || '—'} />
          <MetaCell label="Approved By" value={detail.approvedByName || '—'} />
          <MetaCell label="Approved At" value={detail.approvedAt ? String(detail.approvedAt).slice(0, 10) : '—'} />
        </div>

        <div className="payslip__grid">
          <div className="payslip__col">
            <div className="payslip__col-title">Earnings</div>
            {EARNINGS_META.map((m) => (
              <div className="payslip__row" key={m.key}>
                <span>{m.label}</span>
                <span className="nowrap">{formatPeso(earnings[m.key])}</span>
              </div>
            ))}
            <div className="payslip__row" style={{ fontWeight: 800 }}>
              <span>Total Earnings</span>
              <span className="nowrap">{formatPeso(detail.totalEarnings)}</span>
            </div>
          </div>
          <div className="payslip__col">
            <div className="payslip__col-title">Deductions</div>
            {DEDUCTIONS_META.map((m) => (
              <div className="payslip__row" key={m.key}>
                <span>{m.label}</span>
                <span className="nowrap">{formatPeso(deductions[m.key])}</span>
              </div>
            ))}
            <div className="payslip__row" style={{ fontWeight: 800 }}>
              <span>Total Deductions</span>
              <span className="nowrap">{formatPeso(detail.totalDeductions)}</span>
            </div>
          </div>
        </div>

        <div className="payslip__total">
          <span>NET RECEIVABLE</span>
          <span>{formatPeso(detail.totalReceivable)}</span>
        </div>

        {detail.status === 'paid' && (
          <div className="payslip__footer">
            <div>
              <div className="payslip__row"><span>Payment Method</span><span className="nowrap">{detail.paymentMethod || '—'}</span></div>
              <div className="payslip__row"><span>Reference Number</span><span className="nowrap">{detail.referenceNumber || '—'}</span></div>
            </div>
            <div>
              <div className="payslip__row"><span>Amount Paid</span><span className="nowrap">{formatPeso(detail.amountPaid)}</span></div>
              <div className="payslip__row"><span>Date Paid</span><span className="nowrap">{detail.datePaid ? formatDate(detail.datePaid) : '—'}</span></div>
            </div>
          </div>
        )}

        {detail.remarks ? (
          <div className="payslip__footer" style={{ marginTop: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <div className="payslip__col-title">Remarks</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{detail.remarks}</div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function cutoffTitle(detail) {
  const s = detail.cutoffStart ? formatDate(detail.cutoffStart) : ''
  const e = detail.cutoffEnd ? formatDate(detail.cutoffEnd) : ''
  return s && e ? `${s} – ${e}` : '—'
}

function MetaCell({ label, value }) {
  return (
    <div className="payslip__col">
      <div className="payslip__col-title">{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  )
}