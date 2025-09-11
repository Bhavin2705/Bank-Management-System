import { Calendar, Download, FileText, Filter, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import CustomCalendar from '../components/UI/CustomCalendar';

const Statements = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0]
  });
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    loadTransactions();
  }, [user]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, dateRange, filterType, searchTerm, sortBy]);

  const loadTransactions = () => {
    const allTransactions = JSON.parse(localStorage.getItem(`transactions_${user.id}`) || '[]');
    setTransactions(allTransactions);
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Date range filter
    filtered = filtered.filter(transaction => {
      const transactionDate = new Date(transaction.timestamp);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      return transactionDate >= startDate && transactionDate <= endDate;
    });

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.sender?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'date-asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return <TrendingUp size={16} style={{ color: '#28a745' }} />;
      case 'debit':
        return <TrendingDown size={16} style={{ color: '#dc3545' }} />;
      case 'transfer':
        return <FileText size={16} style={{ color: '#667eea' }} />;
      default:
        return <FileText size={16} />;
    }
  };

  const calculateTotals = () => {
    const credits = filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    const debits = filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    return { credits, debits, net: credits - debits };
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
    const csvData = filteredTransactions.map(transaction => [
      formatDate(transaction.timestamp),
      transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
      transaction.description,
      transaction.amount,
      transaction.balance || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = calculateTotals();

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Account Statements
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          View and download your transaction history and account statements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{filteredTransactions.length}</div>
              <div className="stat-label">Transactions</div>
            </div>
            <FileText size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(totals.credits)}</div>
              <div className="stat-label">Total Credits</div>
            </div>
            <TrendingUp size={32} style={{ color: '#28a745' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(totals.debits)}</div>
              <div className="stat-label">Total Debits</div>
            </div>
            <TrendingDown size={32} style={{ color: '#dc3545' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value" style={{ color: totals.net >= 0 ? '#28a745' : '#dc3545' }}>
                {formatCurrency(totals.net)}
              </div>
              <div className="stat-label">Net Change</div>
            </div>
            {totals.net >= 0 ?
              <TrendingUp size={32} style={{ color: '#28a745' }} /> :
              <TrendingDown size={32} style={{ color: '#dc3545' }} />
            }
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} />
            <span style={{ fontWeight: '500' }}>Date Range:</span>
          </div>
          <div style={{ minWidth: '150px' }}>
            <CustomCalendar
              value={dateRange.start ? new Date(dateRange.start) : null}
              onChange={(date) => setDateRange({ ...dateRange, start: date ? date.toISOString().split('T')[0] : '' })}
              placeholder="Start date"
              maxDate={dateRange.end ? new Date(dateRange.end) : null}
            />
          </div>
          <span>to</span>
          <div style={{ minWidth: '150px' }}>
            <CustomCalendar
              value={dateRange.end ? new Date(dateRange.end) : null}
              onChange={(date) => setDateRange({ ...dateRange, end: date ? date.toISOString().split('T')[0] : '' })}
              placeholder="End date"
              minDate={dateRange.start ? new Date(dateRange.start) : null}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} />
            <span style={{ fontWeight: '500' }}>Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="all">All Types</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="transfer">Transfers</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '140px' }}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>

          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '200px' }}
          />

          <button onClick={exportToCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Transaction History</h3>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            No transactions found for the selected period
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.map((transaction, index) => (
              <div key={index} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)'
                  }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {transaction.description}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formatDate(transaction.timestamp)}
                      {transaction.recipient && ` • To: ${transaction.recipient}`}
                      {transaction.sender && ` • From: ${transaction.sender}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: '600',
                    color: transaction.type === 'credit' ? '#28a745' : '#dc3545',
                    fontSize: '1.1rem'
                  }}>
                    {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                  {transaction.balance && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Balance: {formatCurrency(transaction.balance)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Statements;
