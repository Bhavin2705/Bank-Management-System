import { Calendar, Download, FileText, Filter, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import CustomCalendar from '../components/UI/CustomCalendar'
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../utils/date'
import { getTransactions } from '../utils/transactions'

const Statements = ({ user }) => {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [dateRange, setDateRange] = useState({
    start: toLocalYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    end: toLocalYYYYMMDD(new Date())
  })
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date-desc')

  // Parse transaction date robustly: prefer createdAt ISO, fallback to local YYYY-MM-DD stored in `date`
  const parseTransactionDate = (transaction) => {
    if (transaction.createdAt) return new Date(transaction.createdAt)
    if (transaction.date && typeof transaction.date === 'string' && transaction.date.length === 10) {
      return fromLocalYYYYMMDD(transaction.date)
    }
    return new Date(transaction.date || transaction.createdAt)
  }

  const filterTransactions = () => {
    let filtered = [...transactions]

    filtered = filtered.filter(transaction => {
      const transactionDate = parseTransactionDate(transaction)
      const startDate = dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null
      const endDate = dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null
      if (startDate && endDate) {
        endDate.setHours(23, 59, 59, 999)
        return transactionDate >= startDate && transactionDate <= endDate
      }
      return true
    })

    if (filterType !== 'all') {
      if (filterType === 'transfer') {
        filtered = filtered.filter(transaction => {
          return transaction.type === 'transfer' || (
            transaction.sender && transaction.recipient && (!transaction.type || transaction.type === '')
          )
        })
      } else {
        filtered = filtered.filter(transaction => transaction.type === filterType)
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.sender?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'date-asc':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        default:
          return 0
      }
    })

    setFilteredTransactions(filtered)
  }

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const txs = await getTransactions({ userId: user.id || user._id })
        setTransactions(Array.isArray(txs) ? txs : [])
      } catch (error) {
        console.error('Error loading transactions:', error);
        setTransactions([])
      }
    }
    fetchTransactions()
  }, [user])

  useEffect(() => {
    filterTransactions()
  }, [transactions, dateRange, filterType, searchTerm, sortBy])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type) => {
    if (type === 'transfer') {
      return <FileText size={16} style={{ color: '#667eea' }} />
    }
    if (type === 'credit') {
      return <TrendingUp size={16} style={{ color: '#28a745' }} />
    }
    if (type === 'debit') {
      return <TrendingDown size={16} style={{ color: '#dc3545' }} />
    }
    return <FileText size={16} />
  }

  const isTransfer = (transaction) => {
    return transaction.type === 'transfer' || (transaction.sender && transaction.recipient)
  }

  const calculateTotals = () => {
    const credits = filteredTransactions
      .filter(t => t.type === 'credit' && typeof t.amount === 'number')
      .reduce((sum, t) => sum + t.amount, 0)

    const debits = filteredTransactions
      .filter(t => t.type === 'debit' && typeof t.amount === 'number')
      .reduce((sum, t) => sum + t.amount, 0)

    return { credits, debits, net: credits - debits }
  }

  const exportToCSV = () => {
    // Debugging: print dateRange and counts to help diagnose empty exports
    if (!filteredTransactions.length) {
      // Show a user-facing alert
      alert('No transactions to export for the selected period.');
      return;
    }
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
    const csvData = filteredTransactions.map(transaction => {
      // Combine date and time in one field (use robust parser)
      const dateObj = parseTransactionDate(transaction) || new Date();
      const dateStr = dateObj.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const timeStr = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
      });
      const dateTime = `${dateStr} ${timeStr}`;

      // Show type as Transfer if isTransfer
      const typeStr = isTransfer(transaction) ? 'Transfer' : (transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : '');

      // Wrap all fields in quotes to prevent comma issues
      return [
        `"${dateTime}"`,
        `"${typeStr}"`,
        `"${transaction.description || ''}"`,
        `"${typeof transaction.amount === 'number' ? transaction.amount : 0}"`,
        `"${typeof transaction.balance === 'number' ? transaction.balance : ''}"`
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  const totals = calculateTotals()

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

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} />
            <span style={{ fontWeight: '500' }}>Date Range:</span>
          </div>
          <div style={{ minWidth: '150px' }}>
            <CustomCalendar
              value={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
              onChange={(date) => setDateRange({ ...dateRange, start: date ? toLocalYYYYMMDD(date) : '' })}
              placeholder="Start date"
              maxDate={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
            />
          </div>
          <span>to</span>
          <div style={{ minWidth: '150px' }}>
            <CustomCalendar
              value={dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null}
              onChange={(date) => setDateRange({ ...dateRange, end: date ? toLocalYYYYMMDD(date) : '' })}
              placeholder="End date"
              minDate={dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null}
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
                      {formatDate(transaction.createdAt)}
                      {transaction.recipient && ` • To: ${transaction.recipient}`}
                      {transaction.sender && ` • From: ${transaction.sender}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: '600',
                    color: isTransfer(transaction)
                      ? '#667eea'
                      : transaction.type === 'credit'
                        ? '#28a745'
                        : '#dc3545',
                    fontSize: '1.1rem'
                  }}>
                    {isTransfer(transaction)
                      ? ''
                      : transaction.type === 'credit'
                        ? '+'
                        : '-'}
                    {formatCurrency(transaction.amount)}
                    {isTransfer(transaction) && <span style={{ color: '#667eea', fontWeight: '500', marginLeft: 4 }}>&nbsp;(Transfer)</span>}
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
  )
}

export default Statements
