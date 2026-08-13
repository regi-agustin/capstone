import { useEffect, useState } from 'react';
import { CreditCard, SearchX } from 'lucide-react';
import { useBilling } from '../context/BillingContext.jsx';
import { fetchPayments } from '../services/billingService.js';
import SearchBar from '../../ro/components/SearchBar.jsx';
import StatusBadge from '../../ro/components/StatusBadge.jsx';
import SummaryCard from '../../ro/components/SummaryCard.jsx';
import Notification from '../components/Notification.jsx';
import { formatMoney, formatDate } from '../../ro/utils/format.js';

const METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  check: 'Check',
  online: 'Online',
};

export default function PaymentsPage() {
  const { notify } = useBilling();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchPayments()
      .then((rows) => { if (mounted) setPayments(rows); })
      .catch((e) => { if (mounted) notify('error', e.message || 'Unable to load payments.'); })
      .finally(() => { if (mounted) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = payments.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.invoiceNumber, p.client, p.reference, METHOD_LABELS[p.method] || p.method]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const total = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <Notification />

      <div className="stats-grid">
        <SummaryCard icon={<CreditCard size={22} />} label="Payments Recorded" value={payments.length} note="All recorded payments" tone="primary" />
        <SummaryCard icon={<CreditCard size={22} />} label="Total Collected" value={formatMoney(total)} note="Across all invoices" tone="available" />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <div className="card__title">
              Payment History
              <span className="badge badge--neutral">{filtered.length}</span>
            </div>
            <div className="card__subtitle">Every payment recorded against client invoices.</div>
          </div>
        </div>

        <div className="card__body">
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <SearchBar value={query} onChange={setQuery} placeholder="Search invoice #, client, reference, method…" />
          </div>

          {loading ? (
            <div className="loading-state">
              <span className="spinner" /> Loading payments…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <SearchX size={36} />
              <div className="empty-state__title">No payments recorded yet</div>
              <div className="empty-state__sub">
                Payments appear here once a Billing Officer records them against an invoice.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.date?.slice(0, 10))}</td>
                      <td className="cell-main">{p.invoiceNumber}</td>
                      <td>{p.client}</td>
                      <td>{METHOD_LABELS[p.method] || p.method}</td>
                      <td>{p.reference || '—'}</td>
                      <td className="cell-main">{formatMoney(p.amount)}</td>
                      <td><StatusBadge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
