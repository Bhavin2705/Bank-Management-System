import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import CustomCalendar from '../components/UI/CustomCalendar';
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../utils/date';
import { getTransactions } from '../utils/transactions';

const Export = ({ user }) => {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [format, setFormat] = useState('csv');
  const [allTransactions, setAllTransactions] = useState([]);

  useEffect(() => {
    // Only load transactions when we have a valid user object (avoid accessing undefined.id)
    if (user && (user.id || user._id)) {
      loadTransactions();
    } else {
      // Clear transactions if user is not available
      setAllTransactions([]);
    }
  }, [user]);

  // Robust parser for transaction dates (prefer createdAt ISO, fallback to local YYYY-MM-DD stored in `date`)
  const parseTransactionDate = (t) => {
    if (!t) return null;
    if (t.createdAt) return new Date(t.createdAt);
    if (t.date && typeof t.date === 'string' && t.date.length === 10) return fromLocalYYYYMMDD(t.date);
    return t.date ? new Date(t.date) : null;
  }

  const loadTransactions = async () => {
    try {
      const transactions = await getTransactions();
      setAllTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setAllTransactions([]);
    }
  };

  const handleExport = () => {
    // (debug logs removed) — export will run normally

    let filteredTransactions = allTransactions;

    if (dateRange.start && dateRange.end) {
      const startDate = fromLocalYYYYMMDD(dateRange.start);
      const endDate = fromLocalYYYYMMDD(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      filteredTransactions = allTransactions.filter(t => {
        const transactionDate = parseTransactionDate(t);
        return transactionDate && transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    // (debug logs removed)

    if (format === 'csv') {
      exportToCSV(filteredTransactions);
    } else {
      exportToJSON(filteredTransactions);
    }
  };

  const exportToCSV = (transactions) => {
    if (!transactions || !transactions.length) {
      alert('No transactions to export.');
      return;
    }

    const headers = ['Date', 'Description', 'Type', 'Amount', 'Balance'];
    const rows = transactions.map(t => {
      const d = parseTransactionDate(t) || new Date();
      const dateStr = d.toLocaleDateString('en-GB'); // DD/MM/YYYY style
      const desc = (t.description || '').replace(/"/g, '""');
      const type = t.type || '';
      const amount = typeof t.amount === 'number' ? t.amount : '';
      const balance = typeof t.balance === 'number' ? t.balance : '';
      return [`"${dateStr}"`, `"${desc}"`, `"${type}"`, `"${amount}"`, `"${balance}"`].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `transactions_${dateRange.start || 'all'}.csv`, 'text/csv');
  };

  const exportToJSON = (transactions) => {
    const jsonContent = JSON.stringify(transactions, null, 2);
    downloadFile(jsonContent, 'transactions.json', 'application/json');
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Export Transactions
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Download your transaction history
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={20} />
          Export Options
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <CustomCalendar
              value={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
              onChange={(date) => setDateRange({ ...dateRange, start: date ? toLocalYYYYMMDD(date) : '' })}
              placeholder="Select start date"
              maxDate={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <CustomCalendar
              value={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
              onChange={(date) => setDateRange({ ...dateRange, end: date ? toLocalYYYYMMDD(date) : '' })}
              placeholder="Select end date"
              minDate={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Format</label>
            <select
              className="form-input"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        <button onClick={handleExport} className="btn btn-primary">
          <Download size={16} />
          Export Transactions
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} />
          Export Summary
        </h3>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card">
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-accent)', marginBottom: '0.5rem' }}>
              {allTransactions.length}
            </div>
            <div className="stat-label">Total Transactions</div>
          </div>

          <div className="stat-card">
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--success)', marginBottom: '0.5rem' }}>
              {formatCurrency(allTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0))}
            </div>
            <div className="stat-label">Total Deposits</div>
          </div>

          <div className="stat-card">
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--error)', marginBottom: '0.5rem' }}>
              {formatCurrency(allTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0))}
            </div>
            <div className="stat-label">Total Withdrawals</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Export;
