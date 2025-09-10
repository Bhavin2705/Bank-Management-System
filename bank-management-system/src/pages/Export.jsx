import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTransactions } from '../utils/transactions';

const Export = ({ user }) => {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [format, setFormat] = useState('csv');
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [user.id]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const transactions = await getTransactions();
      setAllTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setAllTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    let filteredTransactions = allTransactions;

    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      filteredTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }

    if (format === 'csv') {
      exportToCSV(filteredTransactions);
    } else {
      exportToJSON(filteredTransactions);
    }
  };

  const exportToCSV = (transactions) => {
    const headers = ['Date', 'Description', 'Type', 'Amount', 'Balance'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        `"${t.description}"`,
        t.type,
        t.amount,
        '' // Balance would need to be calculated
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'transactions.csv', 'text/csv');
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
            <input
              type="date"
              className="form-input"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date</label>
            <input
              type="date"
              className="form-input"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
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
