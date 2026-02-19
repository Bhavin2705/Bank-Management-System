import { Calendar, Download, FileText, Filter, TrendingDown, TrendingUp, Printer, Receipt } from 'lucide-react'
import { generateAccountStatementPDF, generateMiniStatementPDF } from '../utils/pdfGenerator';
import { useEffect, useState } from 'react'
import CustomCalendar from '../components/UI/CustomCalendar'
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../utils/date'
import { getTransactions } from '../utils/transactions'

const Statements = ({ user }) => {
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [miniStatement, setMiniStatement] = useState(null)
    // Mini Statement logic: last 10 transactions summary
    useEffect(() => {
      if (!transactions.length) return;
      const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        .slice(0, 10);
      const credits = recentTransactions.filter(t => t.type === 'credit').length;
      const debits = recentTransactions.filter(t => t.type === 'debit').length;
      const totalCredits = recentTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalDebits = recentTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      setMiniStatement({
        accountHolder: user.name,
        accountNumber: user.accountNumber || '****1234',
        generatedAt: new Date().toISOString(),
        period: {
          from: recentTransactions.length > 0 ? (recentTransactions[recentTransactions.length - 1].createdAt || recentTransactions[recentTransactions.length - 1].timestamp) : new Date().toISOString(),
          to: recentTransactions.length > 0 ? (recentTransactions[0].createdAt || recentTransactions[0].timestamp) : new Date().toISOString()
        },
        summary: {
          totalTransactions: recentTransactions.length,
          credits,
          debits,
          totalCredits,
          totalDebits,
          netChange: totalCredits - totalDebits
        },
        transactions: recentTransactions
      });
    }, [transactions, user]);
    // Mini Statement actions
    const printMiniStatement = () => {
      if (!miniStatement) return;
      const printWindow = window.open('', '_blank');
      const statementHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Mini Statement - ${miniStatement.accountHolder}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .account-info { margin-bottom: 20px; }
              .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
              .transaction { border-bottom: 1px solid #eee; padding: 10px 0; }
              .transaction:last-child { border-bottom: none; }
              .credit { color: #28a745; font-weight: bold; }
              .debit { color: #dc3545; font-weight: bold; }
              .total { font-weight: bold; font-size: 1.1em; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🏦 BankPro</h1>
              <h2>Mini Statement</h2>
            </div>
            <div class="account-info">
              <p><strong>Account Holder:</strong> ${miniStatement.accountHolder}</p>
              <p><strong>Account Number:</strong> ${miniStatement.accountNumber}</p>
              <p><strong>Generated:</strong> ${formatDate(miniStatement.generatedAt)}</p>
              <p><strong>Period:</strong> ${formatDate(miniStatement.period.from)} - ${formatDate(miniStatement.period.to)}</p>
            </div>
            <div class="summary">
              <h3>Summary</h3>
              <p><strong>Total Transactions:</strong> ${miniStatement.summary.totalTransactions}</p>
              <p><strong>Credits:</strong> ${miniStatement.summary.credits} (${formatCurrency(miniStatement.summary.totalCredits)})</p>
              <p><strong>Debits:</strong> ${miniStatement.summary.debits} (${formatCurrency(miniStatement.summary.totalDebits)})</p>
              <p class="total"><strong>Net Change:</strong>
                <span class="${miniStatement.summary.netChange >= 0 ? 'credit' : 'debit'}">
                  ${formatCurrency(miniStatement.summary.netChange)}
                </span>
              </p>
            </div>
            <h3>Recent Transactions</h3>
            ${miniStatement.transactions.map(transaction => `
              <div class="transaction">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <div style="font-weight: 500;">${transaction.description}</div>
                    <div style="font-size: 0.9em; color: #666;">${formatDate(transaction.createdAt || transaction.timestamp)}</div>
                  </div>
                  <div class="${transaction.type === 'credit' ? 'credit' : 'debit'}">
                    ${transaction.type === 'credit' ? '+' : '-'}${formatCurrency(transaction.amount)}
                  </div>
                </div>
              </div>
            `).join('')}
            <div style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #666;">
              <p>This is a computer-generated statement and does not require a signature.</p>
              <p>For any queries, please contact customer support.</p>
            </div>
          </body>
        </html>
      `;
      printWindow.document.write(statementHTML);
      printWindow.document.close();
      printWindow.print();
    };

    const downloadMiniStatement = async () => {
      if (!miniStatement) return;
      await generateMiniStatementPDF(
        miniStatement.transactions,
        { name: miniStatement.accountHolder, accountType: 'Savings' },
        miniStatement.accountNumber,
        new Date(miniStatement.period.from),
        new Date(miniStatement.period.to)
      );
    };
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
      {/* Mini Statement Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Account Statements
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          View and download your transaction history and account statements
        </p>
      </div>

      {/* Mini Statement Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={20} /> Mini Statement</h3>
          <div>
            <button onClick={printMiniStatement} className="btn btn-secondary" style={{ marginRight: '1rem' }}><Printer size={16} style={{ marginRight: '0.5rem' }} />Print</button>
            <button onClick={downloadMiniStatement} className="btn btn-secondary"><Download size={16} style={{ marginRight: '0.5rem' }} />Download</button>
          </div>
        </div>
        {miniStatement ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Account Holder</div>
                <div style={{ fontWeight: '500' }}>{miniStatement.accountHolder}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Account Number</div>
                <div style={{ fontWeight: '500' }}>{miniStatement.accountNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Period</div>
                <div style={{ fontWeight: '500' }}>{formatDate(miniStatement.period.from)} - {formatDate(miniStatement.period.to)}</div>
              </div>
            </div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Transactions</div>
                  <div style={{ fontWeight: '600', fontSize: '1.2rem' }}>{miniStatement.summary.totalTransactions}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Credits</div>
                  <div style={{ fontWeight: '600', color: '#28a745' }}>{miniStatement.summary.credits} ({formatCurrency(miniStatement.summary.totalCredits)})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Debits</div>
                  <div style={{ fontWeight: '600', color: '#dc3545' }}>{miniStatement.summary.debits} ({formatCurrency(miniStatement.summary.totalDebits)})</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Net Change</div>
                  <div style={{ fontWeight: '600', fontSize: '1.2rem', color: miniStatement.summary.netChange >= 0 ? '#28a745' : '#dc3545' }}>{formatCurrency(miniStatement.summary.netChange)}</div>
                </div>
              </div>
            </div>
            <h4 style={{ marginBottom: '1rem' }}>Recent Transactions</h4>
            {miniStatement.transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No transactions found</div>
            ) : (
              <div className="transaction-list">
                {miniStatement.transactions.map((transaction, index) => (
                  <div key={index} className="transaction-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-tertiary)' }}>{getTransactionIcon(transaction.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{transaction.description}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(transaction.createdAt || transaction.timestamp)}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: '600', color: transaction.type === 'credit' ? '#28a745' : '#dc3545', fontSize: '1.1rem' }}>{transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Receipt size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>Generate Your Mini Statement</h3>
            <p>Recent transactions summary will appear here.</p>
          </div>
        )}
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


      {/* Full Statement Actions */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Transaction History</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                // Custom printout for full statement
                const printWindow = window.open('', '_blank');
                const statementHTML = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Account Statement - ${user.name}</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .account-info { margin-bottom: 20px; }
                        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                        .transaction { border-bottom: 1px solid #eee; padding: 10px 0; }
                        .transaction:last-child { border-bottom: none; }
                        .credit { color: #28a745; font-weight: bold; }
                        .debit { color: #dc3545; font-weight: bold; }
                        .total { font-weight: bold; font-size: 1.1em; }
                        @media print { body { margin: 0; } }
                      </style>
                    </head>
                    <body>
                      <div class="header">
                        <h1>🏦 BankPro</h1>
                        <h2>Account Statement</h2>
                      </div>
                      <div class="account-info">
                        <p><strong>Account Holder:</strong> ${user.name}</p>
                        <p><strong>Account Number:</strong> ${user.accountNumber || '****1234'}</p>
                        <p><strong>Generated:</strong> ${new Date().toLocaleString('en-US')}</p>
                        <p><strong>Period:</strong> ${dateRange.start} - ${dateRange.end}</p>
                      </div>
                      <div class="summary">
                        <h3>Summary</h3>
                        <p><strong>Total Transactions:</strong> ${filteredTransactions.length}</p>
                        <p><strong>Credits:</strong> ${filteredTransactions.filter(t => t.type === 'credit').length} (₹${filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)})</p>
                        <p><strong>Debits:</strong> ${filteredTransactions.filter(t => t.type === 'debit').length} (₹${filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0).toFixed(2)})</p>
                        <p class="total"><strong>Net Change:</strong>
                          <span class="${filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) - filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0) >= 0 ? 'credit' : 'debit'}">
                            ₹${(filteredTransactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0) - filteredTransactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <h3>Transactions</h3>
                      ${filteredTransactions.length === 0 ? `<div style="text-align:center; color:#888; padding:2rem;">No transactions found</div>` : filteredTransactions.map(transaction => `
                        <div class="transaction">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                              <div style="font-weight: 500;">${transaction.description}</div>
                              <div style="font-size: 0.9em; color: #666;">${transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('en-US') : ''}</div>
                            </div>
                            <div class="${transaction.type === 'credit' ? 'credit' : 'debit'}">
                              ${transaction.type === 'credit' ? '+' : '-'}₹${transaction.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      `).join('')}
                      <div style="margin-top: 30px; text-align: center; font-size: 0.8em; color: #666;">
                        <p>This is a computer-generated statement and does not require a signature.</p>
                        <p>For any queries, please contact customer support.</p>
                      </div>
                    </body>
                  </html>
                `;
                printWindow.document.write(statementHTML);
                printWindow.document.close();
                printWindow.print();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                await generateAccountStatementPDF(
                  filteredTransactions,
                  user,
                  user.accountNumber || '****1234',
                  dateRange.start ? new Date(dateRange.start) : new Date(),
                  dateRange.end ? new Date(dateRange.end) : new Date()
                );
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Showing {filteredTransactions.length} of {transactions.length} transactions
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
