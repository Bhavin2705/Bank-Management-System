import { Download, FileText, Printer, Receipt, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const MiniStatement = ({ user }) => {
    const [transactions, setTransactions] = useState([]);
    const [miniStatement, setMiniStatement] = useState(null);

    useEffect(() => {
        loadTransactions();
    }, [user]);

    const loadTransactions = () => {
        const allTransactions = JSON.parse(localStorage.getItem(`transactions_${user.id}`) || '[]');
        setTransactions(allTransactions);
    };

    const generateMiniStatement = () => {
        // Get last 10 transactions
        const recentTransactions = transactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        // Calculate summary
        const credits = recentTransactions.filter(t => t.type === 'credit').length;
        const debits = recentTransactions.filter(t => t.type === 'debit').length;
        const totalCredits = recentTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalDebits = recentTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);

        const statement = {
            accountHolder: user.name,
            accountNumber: user.accountNumber || '****1234',
            generatedAt: new Date().toISOString(),
            period: {
                from: recentTransactions.length > 0 ? recentTransactions[recentTransactions.length - 1].timestamp : new Date().toISOString(),
                to: recentTransactions.length > 0 ? recentTransactions[0].timestamp : new Date().toISOString()
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
        };

        setMiniStatement(statement);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
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

    const printStatement = () => {
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
                  <div style="font-size: 0.9em; color: #666;">${formatDate(transaction.timestamp)}</div>
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

    const downloadStatement = () => {
        if (!miniStatement) return;

        const statementText = `
BANKPRO MINI STATEMENT
======================

Account Holder: ${miniStatement.accountHolder}
Account Number: ${miniStatement.accountNumber}
Generated: ${formatDate(miniStatement.generatedAt)}
Period: ${formatDate(miniStatement.period.from)} - ${formatDate(miniStatement.period.to)}

SUMMARY
=======
Total Transactions: ${miniStatement.summary.totalTransactions}
Credits: ${miniStatement.summary.credits} (${formatCurrency(miniStatement.summary.totalCredits)})
Debits: ${miniStatement.summary.debits} (${formatCurrency(miniStatement.summary.totalDebits)})
Net Change: ${formatCurrency(miniStatement.summary.netChange)}

RECENT TRANSACTIONS
===================
${miniStatement.transactions.map((transaction, index) =>
            `${index + 1}. ${formatDate(transaction.timestamp)} - ${transaction.description}
   ${transaction.type === 'credit' ? '+' : '-'}${formatCurrency(transaction.amount)}`
        ).join('\n')}

---
This is a computer-generated statement.
For any queries, please contact customer support.
    `;

        const blob = new Blob([statementText], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mini_statement_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="container">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                    Mini Statement
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Generate a quick summary of your recent transactions
                </p>
            </div>

            {/* Action Buttons */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={generateMiniStatement}
                    className="btn btn-primary"
                    style={{ marginRight: '1rem' }}
                >
                    <Receipt size={18} style={{ marginRight: '0.5rem' }} />
                    Generate Mini Statement
                </button>

                {miniStatement && (
                    <>
                        <button
                            onClick={printStatement}
                            className="btn btn-secondary"
                            style={{ marginRight: '1rem' }}
                        >
                            <Printer size={18} style={{ marginRight: '0.5rem' }} />
                            Print Statement
                        </button>

                        <button
                            onClick={downloadStatement}
                            className="btn btn-secondary"
                        >
                            <Download size={18} style={{ marginRight: '0.5rem' }} />
                            Download Statement
                        </button>
                    </>
                )}
            </div>

            {/* Mini Statement Display */}
            {miniStatement && (
                <div className="card">
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Receipt size={20} />
                            Mini Statement
                        </h3>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Generated on {formatDate(miniStatement.generatedAt)}
                        </div>
                    </div>

                    {/* Account Info */}
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
                            <div style={{ fontWeight: '500' }}>
                                {formatDate(miniStatement.period.from)} - {formatDate(miniStatement.period.to)}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                        <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Transactions</div>
                                <div style={{ fontWeight: '600', fontSize: '1.2rem' }}>{miniStatement.summary.totalTransactions}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Credits</div>
                                <div style={{ fontWeight: '600', color: '#28a745' }}>
                                    {miniStatement.summary.credits} ({formatCurrency(miniStatement.summary.totalCredits)})
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Debits</div>
                                <div style={{ fontWeight: '600', color: '#dc3545' }}>
                                    {miniStatement.summary.debits} ({formatCurrency(miniStatement.summary.totalDebits)})
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Net Change</div>
                                <div style={{
                                    fontWeight: '600',
                                    fontSize: '1.2rem',
                                    color: miniStatement.summary.netChange >= 0 ? '#28a745' : '#dc3545'
                                }}>
                                    {formatCurrency(miniStatement.summary.netChange)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <h4 style={{ marginBottom: '1rem' }}>Recent Transactions</h4>
                    {miniStatement.transactions.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic'
                        }}>
                            No transactions found
                        </div>
                    ) : (
                        <div className="transaction-list">
                            {miniStatement.transactions.map((transaction, index) => (
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
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        fontWeight: '600',
                                        color: transaction.type === 'credit' ? '#28a745' : '#dc3545',
                                        fontSize: '1.1rem'
                                    }}>
                                        {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!miniStatement && (
                <div className="card">
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <Receipt size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3>Generate Your Mini Statement</h3>
                        <p>Click the button above to generate a summary of your recent transactions</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiniStatement;
