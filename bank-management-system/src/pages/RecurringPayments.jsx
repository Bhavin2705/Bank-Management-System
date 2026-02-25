import { Plus, Repeat, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { api } from '../utils/api';

const RecurringPayments = ({ user }) => {
  const { showError, showSuccess } = useNotification();
  const [payments, setPayments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bill_payment',
    amount: '',
    frequency: 'monthly',
    startDate: '',
    toAccount: '',
    beneficiaryName: '',
    description: ''
  });

  const safeShowError = (message) => {
    if (showError) showError(message);
    else console.error('Recurring payment error:', message);
  };

  const safeShowSuccess = (message) => {
    if (showSuccess) showSuccess(message);
    else console.log('Recurring payment success:', message);
  };

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.recurring.getAll();
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      setError('Failed to load recurring payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user, loadPayments]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      safeShowError('Amount must be greater than 0');
      return;
    }

    if (amount > (user?.balance || 0)) {
      safeShowError('Insufficient balance for recurring payment');
      return;
    }

    try {
      const submitData = {
        name: formData.name,
        type: formData.type,
        amount: amount,
        frequency: formData.frequency,
        startDate: formData.startDate || new Date().toISOString(),
        toAccount: formData.toAccount,
        beneficiaryName: formData.beneficiaryName,
        description: formData.description,
        isAutoPay: true,
        status: 'active'
      };

      if (editingId) {
        const response = await api.recurring.update(editingId, submitData);
        if (response.success) {
          setPayments(payments.map(p => p._id === editingId ? response.data : p));
          safeShowSuccess('Recurring payment updated successfully!');
        }
      } else {
        const response = await api.recurring.create(submitData);
        if (response.success) {
          setPayments([...payments, response.data]);
          safeShowSuccess('Recurring payment created successfully!');
        }
      }

      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        type: 'bill_payment',
        amount: '',
        frequency: 'monthly',
        startDate: '',
        toAccount: '',
        beneficiaryName: '',
        description: ''
      });
    } catch (err) {
      console.error('Error saving recurring payment:', err);
      safeShowError('Failed to save recurring payment');
    }
  };

  const handleEdit = (payment) => {
    setEditingId(payment._id);
    setFormData({
      name: payment.name,
      type: payment.type,
      amount: payment.amount.toString(),
      frequency: payment.frequency,
      startDate: payment.startDate,
      toAccount: payment.toAccount,
      beneficiaryName: payment.beneficiaryName,
      description: payment.description
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recurring payment?')) return;
    try {
      await api.recurring.delete(id);
      setPayments(payments.filter(p => p._id !== id));
      safeShowSuccess('Recurring payment deleted successfully');
    } catch (err) {
      console.error('Error deleting recurring payment:', err);
      safeShowError('Failed to delete recurring payment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const paymentTypes = [
    'bill_payment', 'subscription', 'loan_payment', 'insurance', 'investment', 'savings', 'other'
  ];

  const frequencies = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'];

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Recurring Payments
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Set up and manage automatic payments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              type: 'bill_payment',
              amount: '',
              frequency: 'monthly',
              startDate: '',
              toAccount: '',
              beneficiaryName: '',
              description: ''
            });
            setShowAddForm(true);
          }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          New Payment
        </button>
      </div>

      {error && (
        <div style={{
          background: 'var(--error-bg)',
          color: 'var(--error)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>{editingId ? 'Edit Recurring Payment' : 'Add New Recurring Payment'}</h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Netflix Subscription"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {paymentTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
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
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  className="form-input"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  {frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq.replace(/_|-/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Beneficiary Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.beneficiaryName}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  placeholder="Netflix Inc."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Beneficiary Account</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.toAccount}
                  onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                  placeholder="Account number or phone"
                  required
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any additional notes"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                {editingId ? 'Update' : 'Create'} Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading recurring payments...</div>
      ) : payments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Repeat size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
          <h3>No recurring payments set up</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Set up automatic payments to simplify your finances</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
          >
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Create Payment
          </button>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
          {payments.map((payment) => (
            <div key={payment._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{payment.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {payment.type?.replace(/_/g, ' ')} • {payment.frequency}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(payment)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(payment._id)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', background: '#dc3545' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{
                padding: '1rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Amount</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '600' }}>
                    {formatCurrency(payment.amount)}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>To: {payment.beneficiaryName}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <p style={{ margin: '0.5rem 0' }}>
                  <strong>Status:</strong> <span style={{ color: payment.status === 'active' ? '#28a745' : '#dc3545' }}>
                    {payment.status}
                  </span>
                </p>
                <p style={{ margin: '0.5rem 0' }}>
                  <strong>Next Date:</strong> {payment.nextDueDate ? new Date(payment.nextDueDate).toLocaleDateString() : 'Pending'}
                </p>
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                <Repeat size={14} style={{ marginRight: '0.5rem' }} />
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecurringPayments;
    });
    setShowAddForm(false);
  };

  const deletePayment = (paymentId) => {
    const updatedPayments = payments.filter((p) => p.id !== paymentId);
    setPayments(updatedPayments);
    clientData.setSection('recurringPayments', updatedPayments).catch((err) => console.error('Save recurring payments failed', err));
    safeShowSuccess('Recurring payment deleted successfully!');
  };

  const togglePaymentStatus = (paymentId) => {
    const updatedPayments = payments.map((payment) =>
      payment.id === paymentId
        ? { ...payment, status: payment.status === 'active' ? 'paused' : 'active' }
        : payment
    );
    setPayments(updatedPayments);
    clientData.setSection('recurringPayments', updatedPayments).catch((err) => console.error('Save recurring payments failed', err));
    safeShowSuccess(
      `Recurring payment ${updatedPayments.find((p) => p.id === paymentId).status === 'active' ? 'resumed' : 'paused'} successfully!`
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
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
              <div className="stat-value">{payments.filter((p) => p.status === 'active').length}</div>
              <div className="stat-label">Active Payments</div>
            </div>
            <User size={32} style={{ color: '#ffc107' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{formatCurrency(
                payments.filter((p) => p.status === 'active').reduce((sum, p) => {
                  switch (p.frequency) {
                    case 'daily':
                      return sum + p.amount * 30;
                    case 'weekly':
                      return sum + p.amount * 4;
                    case 'monthly':
                      return sum + p.amount;
                    case 'yearly':
                      return sum + p.amount / 12;
                    default:
                      return sum + p.amount;
                  }
                }, 0)
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
              <label htmlFor="recipientId" className="form-label">Recipient</label>
              <select
                id="recipientId"
                name="recipientId"
                className="form-input"
                value={formData.recipientId}
                onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                required
              >
                <option value="">Select recipient</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}{u.phone ? ` (${u.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount" className="form-label">Amount</label>
              <input
                id="amount"
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
              <label htmlFor="frequency" className="form-label">Frequency</label>
              <select
                id="frequency"
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
              <label htmlFor="description" className="form-label">Description</label>
              <input
                id="description"
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
                      {getFrequencyLabel(payment.frequency)}
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
                      aria-label={payment.status === 'active' ? 'Pause payment' : 'Resume payment'}
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
                      aria-label="Delete payment"
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