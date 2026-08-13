import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api.js';
import { Search, Download, Eye, Wallet, X } from 'lucide-react';

const Payroll = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [filteredPayroll, setFilteredPayroll] = useState([]);
  const [viewRecord, setViewRecord] = useState(null);

  useEffect(() => {
    apiFetch('payroll.php')
      .then((rows) => {
        setRecords(rows);
        setFilteredPayroll(rows);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    filterPayroll(term, monthFilter);
  };

  const handleMonthFilter = (e) => {
    const month = e.target.value;
    setMonthFilter(month);
    filterPayroll(searchTerm, month);
  };

  const filterPayroll = (term, month) => {
    let filtered = records;

    if (term) {
      filtered = filtered.filter(
        (payroll) =>
          payroll.date.toLowerCase().includes(term) ||
          payroll.status.toLowerCase().includes(term)
      );
    }

    if (month) {
      filtered = filtered.filter((payroll) => payroll.date.startsWith(month));
    }

    setFilteredPayroll(filtered);
  };

  const statusClass = (status) => (status === 'Paid' ? 'available' : 'unavailable');

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  const months = [...new Set(records.map((p) => p.date.slice(0, 7)))].sort().reverse();
  const paidCount = records.filter((r) => r.status === 'Paid').length;
  const totalNet = records.reduce((s, p) => s + p.netAmount, 0);

  const downloadPayslip = (p) => {
    const csv = [
      ['Payroll Date', p.date],
      ['Status', p.status],
      ['Basic Salary', p.basicSalary ?? ''],
      ['Allowances', p.allowances ?? ''],
      ['Gross Pay', p.grossAmount],
      ['Cash Advance (loan)', p.cashAdvance],
      ['Other Deductions', p.deductions],
      ['Net Amount', p.netAmount],
    ]
      .map(([k, v]) => `${k},${String(v).replace(/,/g, '')}`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payslip-${p.date}-${p.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="stats" style={{ marginBottom: 18 }}>
        <div className="stat">
          <span className="label">Payroll Records</span>
          <div className="value">{records.length}</div>
        </div>
        <div className="stat">
          <span className="label">Paid</span>
          <div className="value"><span className="dot" style={{ background: 'var(--green)' }} />{paidCount}</div>
        </div>
        <div className="stat">
          <span className="label">Net Take-Home</span>
          <div className="value">{formatCurrency(totalNet)}</div>
        </div>
        <div className="stat">
          <span className="label">Latest Status</span>
          <div className="value">{records.length ? records[0].status : '—'}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="search" style={{ width: 'min(320px, 100%)' }}>
              <Search width={15} height={15} />
              <input
                type="text"
                placeholder="Search by date or status..."
                value={searchTerm}
                onChange={handleSearch}
                style={{ width: '100%' }}
              />
            </span>
            <select
              className="input-std"
              style={{ width: 190 }}
              value={monthFilter}
              onChange={handleMonthFilter}
            >
              <option value="">All Months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
            <button
              className="btn sm"
              onClick={() => {
                setSearchTerm('');
                setMonthFilter('');
                setFilteredPayroll(records);
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Payroll Records <span className="badge count" style={{ marginLeft: 8 }}>{filteredPayroll.length}</span></h3>
          <span className="meta">Gross pay, deductions, and net amount per pay period.</span>
        </div>
        {loading ? (
          <div className="empty"><div className="help">Loading payroll records...</div></div>
        ) : error ? (
          <div className="empty"><div className="error-msg" style={{ display: 'inline-block' }}>{error}</div></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Payroll Date</th>
                  <th>Gross Amount</th>
                  <th>Cash Advance</th>
                  <th>Deductions</th>
                  <th>Net Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((payroll) => (
                  <tr key={payroll.id}>
                    <td>{payroll.date}</td>
                    <td>{formatCurrency(payroll.grossAmount)}</td>
                    <td>{formatCurrency(payroll.cashAdvance)}</td>
                    <td style={{ color: 'var(--red)' }}>-{formatCurrency(payroll.deductions)}</td>
                    <td className="cell-strong">{formatCurrency(payroll.netAmount)}</td>
                    <td><span className={`status ${statusClass(payroll.status)}`}>{payroll.status}</span></td>
                    <td>
                      <div className="actions-row">
                        <button className="btn sm" onClick={() => setViewRecord(payroll)}>
                          <Eye width={14} height={14} /> View
                        </button>
                        {payroll.status === 'Paid' && (
                          <button className="btn sm" style={{ color: 'var(--green)' }} onClick={() => downloadPayslip(payroll)}>
                            <Download width={14} height={14} /> Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredPayroll.length === 0 && (
          <div className="empty">
            <Wallet width={40} height={40} />
            <div className="help" style={{ marginTop: 6 }}>No payroll records found.</div>
          </div>
        )}
      </div>

      {viewRecord && (
        <div className="overlay" onClick={() => setViewRecord(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Payslip — {viewRecord.date}</h3>
              <button className="x" onClick={() => setViewRecord(null)} aria-label="Close">
                <X width={16} height={16} />
              </button>
            </div>
            <div className="modal-body">
              {[
                ['Payroll Date', viewRecord.date],
                ['Basic Salary', formatCurrency(viewRecord.basicSalary ?? 0)],
                ['Allowances', formatCurrency(viewRecord.allowances ?? 0)],
                ['Gross Pay', formatCurrency(viewRecord.grossAmount)],
                ['Cash Advance (loan)', `-${formatCurrency(viewRecord.cashAdvance)}`],
                ['Other Deductions', `-${formatCurrency(viewRecord.deductions)}`],
                ['Net Amount', formatCurrency(viewRecord.netAmount)],
              ].map(([label, value]) => (
                <div className="assign-card" key={label}>
                  <span className="cell-sub" style={{ flex: 1 }}>{label}</span>
                  <span className="cell-strong" style={{ textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              <div className="assign-card" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="cell-sub" style={{ flex: 1 }}>Status</span>
                <span className={`status ${statusClass(viewRecord.status)}`}>{viewRecord.status}</span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setViewRecord(null)}>Close</button>
              {viewRecord.status === 'Paid' && (
                <button className="btn btn-primary" onClick={() => downloadPayslip(viewRecord)}>
                  <Download width={14} height={14} /> Download Payslip
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;