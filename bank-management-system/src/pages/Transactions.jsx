import { Activity, ArrowDownLeft, ArrowUpRight, Calendar, Download, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import CustomCalendar from '../components/UI/CustomCalendar';
import { generateAccountStatementPDF, generateMiniStatementPDF } from '../utils/pdfGenerator';
import { addTransaction, getTransactions } from '../utils/transactions';

const Transactions = ({ user, onUserUpdate }) => {
  const { showError, showSuccess } = useNotification();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStatementOptions, setShowStatementOptions] = useState(false);
  const [statementPeriod, setStatementPeriod] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date()
  });
  const [formData, setFormData] = useState({
    type: 'debit',
    amount: '',
    description: '',
    // Default to a sensible category so the select has a value when the form is shown
    category: 'food',
  });

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const userTransactions = await getTransactions(user.id);
      setTransactions(userTransactions);
    } catch (error) {
      showError('Failed to load transactions');
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!formData.type || !formData.description || isNaN(amount) || amount <= 0) {
      showError('Please fill in all required fields with valid values.');
      return;
    }
    if (formData.type === 'debit' && (!formData.category || formData.category === '')) {
      showError('Please select a category for withdrawals.');
      return;
    }
    if (formData.type === 'debit' && amount > user.balance) {
      showError('Insufficient balance for this transaction');
      return;
    }

    try {
      setSubmitting(true);

      const transaction = {
        type: formData.type,
        amount: amount,
        description: formData.description || `${formData.type === 'credit' ? 'Deposit' : 'Withdrawal'}`,
        category: formData.type === 'debit' ? formData.category : undefined
      };

      const result = await addTransaction(transaction);

      // addTransaction returns the created transaction object (or throws). Treat a truthy result as success.
      if (result) {
        showSuccess('Transaction added successfully!');

        // Update user balance in parent component
        const newBalance = formData.type === 'credit'
          ? user.balance + amount
          : user.balance - amount;

        onUserUpdate({ ...user, balance: newBalance });
        await loadTransactions();
        setShowForm(false);
        // Reset form to defaults (category back to default)
        setFormData({ type: 'debit', amount: '', description: '', category: 'food' });
      } else {
        showError('Failed to add transaction');
      }
    } catch (error) {
      showError('Failed to add transaction. Please try again.');
      console.error('Error adding transaction:', error);
    } finally {
      setSubmitting(false);
    }
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

  const handleDownloadMiniStatement = async () => {
    try {
      const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt || transaction.date);
        return transactionDate >= statementPeriod.startDate && transactionDate <= statementPeriod.endDate;
      });

      const userIdStr = (user.id || user._id || '').toString();
      await generateMiniStatementPDF(
        filteredTransactions,
        user,
        `ACC${userIdStr.padStart(6, '0')}`,
        statementPeriod.startDate,
        statementPeriod.endDate
      );

      showSuccess('Mini statement downloaded successfully!');
    } catch (error) {
      console.error('Error generating mini statement:', error);
      showError('Failed to generate mini statement. Please try again.');
    }
  };

  const handleDownloadAccountStatement = async () => {
    try {
      const filteredTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.createdAt || transaction.date);
        return transactionDate >= statementPeriod.startDate && transactionDate <= statementPeriod.endDate;
      });

      await generateAccountStatementPDF(
        filteredTransactions,
        user,
        `ACC${user.id.toString().padStart(6, '0')}`,
        statementPeriod.startDate,
        statementPeriod.endDate
      );

      showSuccess('Account statement downloaded successfully!');
    } catch (error) {
      console.error('Error generating account statement:', error);
      showError('Failed to generate account statement. Please try again.');
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Transactions</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowStatementOptions(!showStatementOptions)}
            className="btn btn-secondary"
          >
            <Download size={16} />
            Download Statement
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            New Transaction
          </button>
        </div>
      </div>

      {showStatementOptions && (
        <div className="statement-options">
          <h3>
            <FileText size={18} />
            Download Statement
          </h3>

          <div className="statement-period-selector">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <CustomCalendar
                value={statementPeriod.startDate}
                onChange={(date) => setStatementPeriod({
                  ...statementPeriod,
                  startDate: date || new Date()
                })}
                placeholder="Select start date"
                maxDate={statementPeriod.endDate}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <CustomCalendar
                value={statementPeriod.endDate}
                onChange={(date) => setStatementPeriod({
                  ...statementPeriod,
                  endDate: date || new Date()
                })}
                placeholder="Select end date"
                minDate={statementPeriod.startDate}
              />
            </div>
          </div>

          <div className="statement-buttons">
            <button
              onClick={handleDownloadMiniStatement}
              className="btn btn-primary"
              disabled={transactions.length === 0}
            >
              <FileText size={16} />
              Mini Statement (PDF)
            </button>
            <button
              onClick={handleDownloadAccountStatement}
              className="btn btn-secondary"
              disabled={transactions.length === 0}
            >
              <Calendar size={16} />
              Full Statement (PDF)
            </button>
            <button
              onClick={() => setShowStatementOptions(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>

          <div className="statement-info">
            <p>• Mini Statement: Summary with recent transactions</p>
            <p>• Full Statement: Detailed transaction history with balances</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Transaction</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="debit">Withdrawal</option>
                  <option value="credit">Deposit</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Transaction description"
                />
              </div>

              {formData.type === 'debit' && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="food">Food & Dining</option>
                    <option value="transportation">Transportation</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="utilities">Utilities</option>
                    <option value="shopping">Shopping</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="salary">Salary</option>
                    <option value="transfer">Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Adding Transaction...' : 'Add Transaction'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Transaction History</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
            <div>Loading transactions...</div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: transaction.type === 'credit' ? '#d4edda' : '#f8d7da'
                  }}>
                    {transaction.type === 'credit' ?
                      <ArrowDownLeft size={16} style={{ color: '#28a745' }} /> :
                      <ArrowUpRight size={16} style={{ color: '#dc3545' }} />
                    }
                  </div>

                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {transaction.description}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {transaction.date ? formatDate(transaction.date) : ''}
                      {transaction.type === 'debit' && transaction.category ? ` • ${transaction.category}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  color: transaction.type === 'credit' ? '#28a745' : '#dc3545'
                }}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6c757d' }}>
            <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No transactions found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
