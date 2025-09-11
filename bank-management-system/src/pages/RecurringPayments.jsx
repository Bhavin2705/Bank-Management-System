import { Calendar, Plus, Repeat, Trash2, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import CustomCalendar from '../components/UI/CustomCalendar';
import { useNotification } from '../components/NotificationProvider';
import { getNonAdminUsers } from '../utils/auth';

const RecurringPayments = ({ user }) => {
  const { showError, showSuccess } = useNotification();
  const [payments, setPayments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    recipientId: '',
    amount: '',
    frequency: 'monthly', // daily, weekly, monthly, yearly
    description: '',
    nextPaymentDate: '',
    endDate: ''
  });

  // Safe notification functions
  const safeShowError = (message) => {
    if (showError) {
      showError(message);
    } else {
      console.error('Recurring payment error:', message);
    }
  };

  const safeShowSuccess = (message) => {
    if (showSuccess) {
      showSuccess(message);
    } else {
      console.log('Recurring payment success:', message);
    }
  };

  // Get user ID safely
  const getUserId = useCallback(() => user?._id || user?.id || '', [user]);

  // Get user balance safely
  const getUserBalance = useCallback(() => user?.balance || 0, [user]);

  const loadUsers = useCallback(async () => {
    try {
      const allUsers = await getNonAdminUsers();
      const userId = getUserId();
      setUsers(allUsers.filter(u => (u._id !== userId && u.id !== userId)));
    } catch (error) {
      console.error('Error loading users:', error);
      // Silently handle the error - this is expected for non-admin users
      setUsers([]);
    }
  }, [getUserId]);

  const loadPayments = useCallback(() => {
    const userId = getUserId();
    const userPayments = JSON.parse(localStorage.getItem(`recurring_payments_${userId}`) || '[]');
    setPayments(userPayments);
  }, [getUserId]);

  useEffect(() => {
    if (user) {
      loadPayments();
      loadUsers();
    }
  }, [user, loadPayments, loadUsers]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      safeShowError('Amount must be greater than 0');
      return;
    }

    if (amount > getUserBalance()) {
      safeShowError('Insufficient balance for recurring payment');
      return;
    }

    const recipient = users.find(u => u._id === formData.recipientId || u.id === formData.recipientId);
    if (!recipient) {
      safeShowError('Recipient not found');
      return;
    }

    const nextPayment = new Date(formData.nextPaymentDate);
    if (nextPayment <= new Date()) {
      safeShowError('Next payment date must be in the future');
      return;
    }

    const newPayment = {
      id: Date.now().toString(),
      recipientId: formData.recipientId,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      amount: amount,
      frequency: formData.frequency,
      description: formData.description || 'Recurring payment',
      nextPaymentDate: formData.nextPaymentDate,
      endDate: formData.endDate || null,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const updatedPayments = [...payments, newPayment];
    setPayments(updatedPayments);
    const userId = getUserId();
    localStorage.setItem(`recurring_payments_${userId}`, JSON.stringify(updatedPayments));

    safeShowSuccess('Recurring payment created successfully!');

    setFormData({
      recipientId: '',
      amount: '',
      frequency: 'monthly',
      description: '',
      nextPaymentDate: '',
      endDate: ''
    });
    setShowAddForm(false);
  };

  const deletePayment = (paymentId) => {
    const updatedPayments = payments.filter(p => p.id !== paymentId);
    setPayments(updatedPayments);
    localStorage.setItem(`recurring_payments_${user._id}`, JSON.stringify(updatedPayments));
    safeShowSuccess('Recurring payment deleted successfully!');
  };

  const togglePaymentStatus = (paymentId) => {
    const updatedPayments = payments.map(payment =>
      payment.id === paymentId
        ? { ...payment, status: payment.status === 'active' ? 'paused' : 'active' }
        : payment
    );
    setPayments(updatedPayments);
    localStorage.setItem(`recurring_payments_${user._id}`, JSON.stringify(updatedPayments));
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

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[frequency] || frequency;
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Recurring Payments
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Set up automatic recurring payments and standing orders
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{payments.length}</div>
              <div className="stat-label">Total Payments</div>
            </div>
            <Repeat size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{payments.filter(p => p.status === 'active').length}</div>
              <div className="stat-label">Active Payments</div>
            </div>
            <Calendar size={32} style={{ color: '#28a745' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(
                payments.filter(p => p.status === 'active')
                  .reduce((sum, p) => sum + p.amount, 0)
              )}</div>
              <div className="stat-label">Monthly Total</div>
            </div>
            <User size={32} style={{ color: '#ffc107' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} />
          {showAddForm ? 'Cancel' : 'Add Recurring Payment'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add Recurring Payment</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Recipient</label>
              <select
                name="recipientId"
                className="form-input"
                value={formData.recipientId}
                onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                required
              >
                <option value="">Select recipient</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                name="amount"
                step="0.01"
                className="form-input"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Frequency</label>
              <select
                name="frequency"
                className="form-input"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Next Payment Date</label>
              <CustomCalendar
                value={formData.nextPaymentDate ? new Date(formData.nextPaymentDate) : null}
                onChange={(date) => setFormData({ ...formData, nextPaymentDate: date ? date.toISOString().split('T')[0] : '' })}
                placeholder="Select next payment date"
                minDate={new Date()}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date (Optional)</label>
              <CustomCalendar
                value={formData.endDate ? new Date(formData.endDate) : null}
                onChange={(date) => setFormData({ ...formData, endDate: date ? date.toISOString().split('T')[0] : '' })}
                placeholder="Select end date"
                minDate={formData.nextPaymentDate ? new Date(formData.nextPaymentDate) : new Date()}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                name="description"
                className="form-input"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Payment description"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Create Recurring Payment
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem' }}>Your Recurring Payments</h3>

        {payments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            <Repeat size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
            <div>No recurring payments set up</div>
            <small>Create your first recurring payment to get started</small>
          </div>
        ) : (
          <div className="transaction-list">
            {payments.map((payment) => (
              <div key={payment.id} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    background: payment.status === 'active' ? '#e8f5e8' : '#f5f5f5',
                    border: `2px solid ${payment.status === 'active' ? '#28a745' : '#6c757d'}`
                  }}>
                    <Repeat size={20} style={{ color: payment.status === 'active' ? '#28a745' : '#6c757d' }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {payment.description}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      To: {payment.recipientName} ({payment.recipientPhone})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {getFrequencyLabel(payment.frequency)} • Next: {formatDate(payment.nextPaymentDate)}
                      {payment.endDate && ` • Ends: ${formatDate(payment.endDate)}`}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: payment.status === 'active' ? '#28a745' : '#dc3545',
                      fontWeight: '500',
                      textTransform: 'uppercase'
                    }}>
                      {payment.status}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#28a745', marginBottom: '0.5rem' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => togglePaymentStatus(payment.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: payment.status === 'active' ? '#dc3545' : '#28a745',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {payment.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => deletePayment(payment.id)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#dc3545',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringPayments;
