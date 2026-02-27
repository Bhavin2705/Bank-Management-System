import { Calendar, Download, FileText, Filter, Printer, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CustomCalendar from '../../components/ui/Calendar/CustomCalendar';
import { formatCurrencyByPreference } from '../../utils/currency';
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../../utils/date';
import { generateAccountStatementPDF, generateMiniStatementPDF } from '../../utils/pdfGenerator';
import { getTransactions } from '../../utils/transactions';
import {
  buildAccountStatementPrintHtml,
  buildCsvContent,
  buildMiniStatement,
  buildMiniStatementPrintHtml,
  calculateTransactionTotals,
  filterAndSortTransactions,
  isTransferTransaction,
  parseTransactionDate
} from './utils';

const Statements = ({ user }) => {
  const [transactions, setTransactions] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: toLocalYYYYMMDD(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    end: toLocalYYYYMMDD(new Date())
  });
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const txs = await getTransactions({ userId: user.id || user._id });
        setTransactions(Array.isArray(txs) ? txs : []);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [user]);

  const filteredTransactions = useMemo(() => filterAndSortTransactions({
    transactions,
    dateRange,
    filterType,
    searchTerm,
    sortBy,
    fromLocalYYYYMMDD
  }), [transactions, dateRange, filterType, searchTerm, sortBy]);

  const miniStatement = useMemo(() => buildMiniStatement(transactions, user), [transactions, user]);
  const totals = useMemo(() => calculateTransactionTotals(filteredTransactions), [filteredTransactions]);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getTransactionIcon = (type) => {
    if (type === 'transfer') return <FileText size={16} style={{ color: '#667eea' }} />;
    if (type === 'credit') return <TrendingUp size={16} style={{ color: '#28a745' }} />;
    if (type === 'debit') return <TrendingDown size={16} style={{ color: '#dc3545' }} />;
    return <FileText size={16} />;
  };

  const printMiniStatement = () => {
    if (!miniStatement) return;
    const printWindow = window.open('', '_blank');
    const statementHtml = buildMiniStatementPrintHtml({
      miniStatement,
      formatDate,
      formatCurrency
    });
    printWindow.document.write(statementHtml);
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

  const exportToCsv = () => {
    if (!filteredTransactions.length) {
      alert('No transactions to export for the selected period.');
      return;
    }
    const csvContent = buildCsvContent(filteredTransactions, (transaction) => parseTransactionDate(transaction, fromLocalYYYYMMDD));
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `statement_${dateRange.start}_to_${dateRange.end}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const printAccountStatement = () => {
    const printWindow = window.open('', '_blank');
    const statementHtml = buildAccountStatementPrintHtml({
      user,
      dateRange,
      filteredTransactions,
      formatCurrency
    });
    printWindow.document.write(statementHtml);
    printWindow.document.close();
    printWindow.print();
  };

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
                  <div style={{ fontWeight: '600', fontSize: '1.2rem', color: miniStatement.summary.netChange >= 0 ? '#28a745' : '#dc3545' }}>
                    {formatCurrency(miniStatement.summary.netChange)}
                  </div>
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
                    <div style={{ fontWeight: '600', color: transaction.type === 'credit' ? '#28a745' : '#dc3545', fontSize: '1.1rem' }}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
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
            {totals.net >= 0 ? <TrendingUp size={32} style={{ color: '#28a745' }} /> : <TrendingDown size={32} style={{ color: '#dc3545' }} />}
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
          <select value={filterType} onChange={(event) => setFilterType(event.target.value)} className="form-input" style={{ width: 'auto', minWidth: '120px' }}>
            <option value="all">All Types</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="transfer">Transfers</option>
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="form-input" style={{ width: 'auto', minWidth: '140px' }}>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
          </select>
          <input type="text" placeholder="Search transactions..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="form-input" style={{ width: 'auto', minWidth: '200px' }} />
          <button onClick={exportToCsv} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Transaction History</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={printAccountStatement} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            No transactions found for the selected period
          </div>
        ) : (
          <div className="transaction-list">
            {filteredTransactions.map((transaction, index) => (
              <div key={index} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-tertiary)' }}>
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{transaction.description}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {formatDate(transaction.createdAt)}
                      {transaction.recipient && ` â€¢ To: ${transaction.recipient}`}
                      {transaction.sender && ` â€¢ From: ${transaction.sender}`}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: '600',
                    color: isTransferTransaction(transaction)
                      ? '#667eea'
                      : transaction.type === 'credit'
                        ? '#28a745'
                        : '#dc3545',
                    fontSize: '1.1rem'
                  }}>
                    {isTransferTransaction(transaction) ? '' : transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                    {isTransferTransaction(transaction) && <span style={{ color: '#667eea', fontWeight: '500', marginLeft: 4 }}>(Transfer)</span>}
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


