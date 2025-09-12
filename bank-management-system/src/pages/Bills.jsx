import { Plus, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import CustomCalendar from '../components/UI/CustomCalendar';
import { getCurrentUser, updateUserBalance } from '../utils/auth';
import { addTransaction, getTransactions } from '../utils/transactions';

const Bills = ({ user, onUserUpdate }) => {
  const { showError } = useNotification();
  const [bills, setBills] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    category: 'utilities'
  });

  useEffect(() => {
    loadBills();
  }, [user.id]);

  const loadBills = async () => {
    try {
      const userTransactions = await getTransactions();
      const billTransactions = userTransactions.filter(t =>
        t.description.toLowerCase().includes('bill') ||
        t.description.toLowerCase().includes('payment')
      );
      setBills(billTransactions);
    } catch (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (amount <= 0) return;

    if (amount > user.balance) {
      showError('Insufficient balance for bill payment');
      return;
    }

    const newBalance = user.balance - amount;

    const transaction = {
      userId: user.id,
      type: 'debit',
      amount: amount,
      description: `Bill Payment: ${formData.name} (${formData.category})`
    };

    addTransaction(transaction);
    updateUserBalance(user.id, newBalance);

    const updatedUser = getCurrentUser();
    onUserUpdate(updatedUser);

    loadBills();
    setShowForm(false);
    setFormData({ name: '', amount: '', dueDate: '', category: 'utilities' });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      day: 'numeric'
    });
  };

  const categories = [
    'utilities', 'internet', 'phone', 'insurance', 'rent', 'credit card', 'loan', 'other'
  ];

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Bill Payments
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage and pay your bills
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Pay Bill
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Pay New Bill</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Bill Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Electricity Bill"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-input"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  className="form-input"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <CustomCalendar
                  value={formData.dueDate ? new Date(formData.dueDate) : null}
                  onChange={(date) => setFormData({ ...formData, dueDate: date ? date.toISOString().split('T')[0] : '' })}
                  placeholder="Select due date"
                  minDate={new Date()}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Pay Bill
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Receipt size={20} />
          Bill Payment History
        </h3>

        {bills.length > 0 ? (
          <div className="transaction-list">
            {bills.map((bill) => (
              <div key={bill.id} className="transaction-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    {bill.description}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {formatDate(bill.date)}
                  </div>
                </div>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--error)'
                }}>
                  -{formatCurrency(bill.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Receipt size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No bill payments found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bills;
