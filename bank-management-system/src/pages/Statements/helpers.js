export const parseTransactionDate = (transaction, fromLocalYYYYMMDD) => {
  if (transaction.createdAt) return new Date(transaction.createdAt);
  if (transaction.date && typeof transaction.date === 'string' && transaction.date.length === 10) {
    return fromLocalYYYYMMDD(transaction.date);
  }
  return new Date(transaction.date || transaction.createdAt);
};

export const buildMiniStatement = (transactions, user) => {
  if (!transactions.length) return null;

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
    .slice(0, 10);

  const credits = recentTransactions.filter((t) => t.type === 'credit').length;
  const debits = recentTransactions.filter((t) => t.type === 'debit').length;
  const totalCredits = recentTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = recentTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    accountHolder: user.name,
    accountNumber: user.accountNumber || '****1234',
    generatedAt: new Date().toISOString(),
    period: {
      from: recentTransactions.length > 0
        ? (recentTransactions[recentTransactions.length - 1].createdAt || recentTransactions[recentTransactions.length - 1].timestamp)
        : new Date().toISOString(),
      to: recentTransactions.length > 0
        ? (recentTransactions[0].createdAt || recentTransactions[0].timestamp)
        : new Date().toISOString()
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
};

export const isTransferTransaction = (transaction) => (
  transaction.type === 'transfer' || (transaction.sender && transaction.recipient)
);

export const filterAndSortTransactions = ({
  transactions,
  dateRange,
  filterType,
  searchTerm,
  sortBy,
  fromLocalYYYYMMDD
}) => {
  let filtered = [...transactions];

  filtered = filtered.filter((transaction) => {
    const transactionDate = parseTransactionDate(transaction, fromLocalYYYYMMDD);
    const startDate = dateRange.start ? fromLocalYYYYMMDD(dateRange.start) : null;
    const endDate = dateRange.end ? fromLocalYYYYMMDD(dateRange.end) : null;
    if (startDate && endDate) {
      endDate.setHours(23, 59, 59, 999);
      return transactionDate >= startDate && transactionDate <= endDate;
    }
    return true;
  });

  if (filterType !== 'all') {
    if (filterType === 'transfer') {
      filtered = filtered.filter((transaction) =>
        transaction.type === 'transfer' || (
          transaction.sender && transaction.recipient && (!transaction.type || transaction.type === '')
        ));
    } else {
      filtered = filtered.filter((transaction) => transaction.type === filterType);
    }
  }

  if (searchTerm) {
    const normalizedTerm = searchTerm.toLowerCase();
    filtered = filtered.filter((transaction) =>
      transaction.description.toLowerCase().includes(normalizedTerm)
      || transaction.recipient?.toLowerCase().includes(normalizedTerm)
      || transaction.sender?.toLowerCase().includes(normalizedTerm));
  }

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'date-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      default:
        return 0;
    }
  });

  return filtered;
};

export const calculateTransactionTotals = (filteredTransactions) => {
  const credits = filteredTransactions
    .filter((t) => t.type === 'credit' && typeof t.amount === 'number')
    .reduce((sum, t) => sum + t.amount, 0);

  const debits = filteredTransactions
    .filter((t) => t.type === 'debit' && typeof t.amount === 'number')
    .reduce((sum, t) => sum + t.amount, 0);

  return { credits, debits, net: credits - debits };
};

export const buildCsvContent = (filteredTransactions, parseDateFn) => {
  const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance'];
  const csvData = filteredTransactions.map((transaction) => {
    const dateObj = parseDateFn(transaction) || new Date();
    const dateStr = dateObj.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
    const dateTime = `${dateStr} ${timeStr}`;

    const typeStr = isTransferTransaction(transaction)
      ? 'Transfer'
      : (transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : '');

    return [
      `"${dateTime}"`,
      `"${typeStr}"`,
      `"${transaction.description || ''}"`,
      `"${typeof transaction.amount === 'number' ? transaction.amount : 0}"`,
      `"${typeof transaction.balance === 'number' ? transaction.balance : ''}"`
    ];
  });

  return [headers, ...csvData]
    .map((row) => row.join(','))
    .join('\n');
};

export const buildMiniStatementPrintHtml = ({ miniStatement, formatDate, formatCurrency }) => `
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
        <h1>BankPro</h1>
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
      ${miniStatement.transactions.map((transaction) => `
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

export const buildAccountStatementPrintHtml = ({
  user,
  dateRange,
  filteredTransactions,
  formatCurrency
}) => {
  const totalCredits = filteredTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = filteredTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
  const net = totalCredits - totalDebits;

  return `
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
          <h1>BankPro</h1>
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
          <p><strong>Credits:</strong> ${filteredTransactions.filter((t) => t.type === 'credit').length} (${formatCurrency(totalCredits)})</p>
          <p><strong>Debits:</strong> ${filteredTransactions.filter((t) => t.type === 'debit').length} (${formatCurrency(totalDebits)})</p>
          <p class="total"><strong>Net Change:</strong>
            <span class="${net >= 0 ? 'credit' : 'debit'}">${formatCurrency(net)}</span>
          </p>
        </div>
        <h3>Transactions</h3>
        ${filteredTransactions.length === 0
      ? '<div style="text-align:center; color:#888; padding:2rem;">No transactions found</div>'
      : filteredTransactions.map((transaction) => `
            <div class="transaction">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">${transaction.description}</div>
                  <div style="font-size: 0.9em; color: #666;">${transaction.createdAt ? new Date(transaction.createdAt).toLocaleString('en-US') : ''}</div>
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
};
