
import { useState, useEffect, useCallback } from 'react';
import { Plus, Receipt, Repeat, Trash2, User } from 'lucide-react';
import CustomCalendar from '../components/UI/CustomCalendar';
import { useNotification } from '../components/NotificationProvider';
import { getCurrentUser, updateUserBalance, getNonAdminUsers } from '../utils/auth';
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../utils/date';
import { addTransaction, getTransactions } from '../utils/transactions';
import api from '../utils/api';

const Payments = ({ user, onUserUpdate }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('bills');

  // Bill Payments state
  const { showError: showBillError } = useNotification();
  const [bills, setBills] = useState([]);
  const [showBillForm, setShowBillForm] = useState(false);
  const [billFormData, setBillFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    category: 'utilities'
  });

  // Recurring Payments state
  const { showError: showRecurringError, showSuccess: showRecurringSuccess } = useNotification();
  const [recurringPayments, setRecurringPayments] = useState([]);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [recurringFormData, setRecurringFormData] = useState({
    recipientName: '',
    recipientAccount: '',
    recipientPhone: '',
    amount: '',
    frequency: 'monthly',
    description: '',
    startDate: '',
  });
  const [balanceWarning, setBalanceWarning] = useState('');

  // Bill Payments logic
  useEffect(() => { loadBills(); }, [user?.id]);
  const loadBills = async () => {
    try {
      const res = await api.bills.getAll();
      setBills(res.success ? res.data : []);
    } catch (error) {
      setBills([]);
    }
  };
  const handleBillSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(billFormData.amount);
    if (amount <= 0) return;
    if (amount > user.balance) {
      showBillError('Insufficient balance for bill payment');
      return;
    }
    // Create Bill in backend
    const billPayload = {
      name: billFormData.name,
      type: billFormData.category,
      amount: amount,
      dueDate: billFormData.dueDate,
      billNumber: 'BILL-' + Date.now(),
      accountNumber: user.accountNumber || 'N/A',
      status: 'paid',
      paidAmount: amount,
      paidDate: new Date(),
      paymentMethod: 'online',
      description: `Bill Payment: ${billFormData.name} (${billFormData.category})`
    };
    let billRes;
    try {
      billRes = await api.bills.create(billPayload);
    } catch (err) {
      showBillError('Failed to create bill');
      return;
    }
    // Create transaction referencing the bill
    const transaction = {
      userId: user.id,
      type: 'debit',
      amount: amount,
      description: `Bill Payment: ${billFormData.name} (${billFormData.category})`,
      billId: billRes && billRes.data ? billRes.data._id : undefined
    };
    await addTransaction(transaction);
    updateUserBalance(user.id, user.balance - amount);
    const updatedUser = getCurrentUser();
    onUserUpdate(updatedUser);
    loadBills();
    setShowBillForm(false);
    setBillFormData({ name: '', amount: '', dueDate: '', category: 'utilities' });
  };
  const handleBillChange = (e) => {
    setBillFormData({ ...billFormData, [e.target.name]: e.target.value });
  };
  const billCategories = [
    'utilities', 'internet', 'phone', 'insurance', 'rent', 'credit card', 'loan', 'other'
  ];

  // Recurring Payments logic
  const getUserBalance = useCallback(() => user?.balance || 0, [user]);
  const loadRecurringPayments = useCallback(async () => {
    try {
      const res = await api.recurring.getAll();
      setRecurringPayments(res.success ? res.data : []);
    } catch (error) {
      setRecurringPayments([]);
    }
  }, []);
  useEffect(() => {
    if (user) {
      loadRecurringPayments();
    }
  }, [user, loadRecurringPayments]);

  const handleRecurringAmountChange = (e) => {
    const newAmount = parseFloat(e.target.value) || 0;
    setRecurringFormData({ ...recurringFormData, amount: e.target.value });
    
    // Show balance warning if amount exceeds or is high compared to balance
    if (newAmount > 0 && newAmount > user.balance) {
      setBalanceWarning(`⚠️ INSUFFICIENT BALANCE: Amount (₹${newAmount.toFixed(2)}) exceeds your balance (₹${user.balance.toFixed(2)})`);
    } else if (newAmount > 0 && newAmount > user.balance * 0.8) {
      setBalanceWarning(`⚠️ HIGH AMOUNT: This is ${Math.round((newAmount / user.balance) * 100)}% of your current balance`);
    } else {
      setBalanceWarning('');
    }
  };

  const handleRecurringSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(recurringFormData.amount);
    if (amount <= 0) {
      showRecurringError('Amount must be greater than 0');
      return;
    }
    if (!recurringFormData.startDate) {
      showRecurringError('Start date is required');
      return;
    }
    if (amount > getUserBalance()) {
      showRecurringError('Insufficient balance for recurring payment');
      return;
    }
    if (!recurringFormData.recipientName.trim()) {
      showRecurringError('Recipient name is required');
      return;
    }
    if (!recurringFormData.recipientAccount.trim() && !recurringFormData.recipientPhone.trim()) {
      showRecurringError('Enter recipient account number or phone number');
      return;
    }
    
    // Calculate next due date based on frequency
    const startDate = new Date(recurringFormData.startDate);
    const nextDueDate = new Date(startDate);
    const frequencyMap = {
      daily: { days: 1 },
      weekly: { days: 7 },
      'bi-weekly': { days: 14 },
      monthly: { months: 1 },
      quarterly: { months: 3 },
      'half-yearly': { months: 6 },
      yearly: { years: 1 }
    };
    const freq = frequencyMap[recurringFormData.frequency];
    if (freq.days) nextDueDate.setDate(nextDueDate.getDate() + freq.days);
    if (freq.months) nextDueDate.setMonth(nextDueDate.getMonth() + freq.months);
    if (freq.years) nextDueDate.setFullYear(nextDueDate.getFullYear() + freq.years);

    // Create RecurringPayment in backend
    const recurringPayload = {
      name: recurringFormData.recipientName,
      beneficiaryName: recurringFormData.recipientName,
      toAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone,
      fromAccount: user._id,
      amount: amount,
      frequency: recurringFormData.frequency,
      description: recurringFormData.description || 'Recurring payment',
      type: 'other',
      startDate: startDate,
      nextDueDate: nextDueDate,
      status: 'active'
    };
    
    let recRes;
    try {
      recRes = await api.recurring.create(recurringPayload);
    } catch (err) {
      showRecurringError('Failed to create recurring payment');
      return;
    }

    // Create initial transaction for the first payment
    try {
      await addTransaction({
        type: 'debit',
        amount: amount,
        description: `Recurring Payment: ${recurringFormData.recipientName}`,
        category: 'bills',
        transferType: 'external',
        recipientName: recurringFormData.recipientName,
        recipientAccount: recurringFormData.recipientAccount || recurringFormData.recipientPhone
      });
      onUserUpdate({ ...user, balance: user.balance - amount });
    } catch (err) {
      console.error('Error creating transaction:', err);
    }

    showRecurringSuccess('Recurring payment created successfully! First payment deducted from your account.');
    setRecurringFormData({ recipientName: '', recipientAccount: '', recipientPhone: '', amount: '', frequency: 'monthly', description: '', startDate: '' });
    setBalanceWarning('');
    setShowRecurringForm(false);
    loadRecurringPayments();
  };
  const deleteRecurringPayment = async (paymentId) => {
    try {
      await api.recurring.delete(paymentId);
      showRecurringSuccess('Recurring payment deleted successfully!');
      loadRecurringPayments();
    } catch (err) {
      showRecurringError('Failed to delete recurring payment');
    }
  };
  const toggleRecurringStatus = async (paymentId) => {
    const payment = recurringPayments.find((p) => p._id === paymentId);
    if (!payment) return;
    const newStatus = payment.status === 'active' ? 'paused' : 'active';
    try {
      await api.recurring.update(paymentId, { status: newStatus });
      showRecurringSuccess(`Recurring payment ${newStatus === 'active' ? 'resumed' : 'paused'} successfully!`);
      loadRecurringPayments();
    } catch (err) {
      showRecurringError('Failed to update recurring payment');
    }
  };
  const getFrequencyLabel = (frequency) => {
    const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
    return labels[frequency] || frequency;
  };

  // Shared formatting
  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="container">
      <div className="payments-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button className={activeTab === 'bills' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('bills')}>One-time Bills</button>
        <button className={activeTab === 'recurring' ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setActiveTab('recurring')}>Recurring Payments</button>
      </div>

      {activeTab === 'bills' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Bill Payments</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Manage and pay your bills</p>
            </div>
            <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-primary">
              <Plus size={16} /> Pay Bill
            </button>
          </div>
          {showBillForm && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Pay New Bill</h3>
              <form onSubmit={handleBillSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bill Name</label>
                    <input type="text" name="name" className="form-input" value={billFormData.name} onChange={handleBillChange} required placeholder="Electricity Bill" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select name="category" className="form-input" value={billFormData.category} onChange={handleBillChange}>
                      {billCategories.map(cat => (<option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount</label>
                    <input type="number" step="0.01" name="amount" className="form-input" value={billFormData.amount} onChange={handleBillChange} required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <CustomCalendar value={billFormData.dueDate ? fromLocalYYYYMMDD(billFormData.dueDate) : null} onChange={(date) => setBillFormData({ ...billFormData, dueDate: date ? toLocalYYYYMMDD(date) : '' })} placeholder="Select due date" minDate={new Date()} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary">Pay Bill</button>
                  <button type="button" onClick={() => setShowBillForm(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={20} />Bill Payment History</h3>
            {bills.length > 0 ? (
              <div className="transaction-list">
                {bills.map((bill) => (
                  <div key={bill.id} className="transaction-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{bill.description}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(bill.date)}</div>
                    </div>
                    <div style={{ fontWeight: '600', color: 'var(--error)' }}>-{formatCurrency(bill.amount)}</div>
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
        </>
      )}

      {activeTab === 'recurring' && (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Recurring Payments</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Set up automatic recurring payments and standing orders</p>
          </div>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{recurringPayments.length}</div>
                  <div className="stat-label">Total Payments</div>
                </div>
                <Repeat size={32} style={{ color: '#667eea' }} />
              </div>
            </div>
            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{recurringPayments.filter((p) => p.status === 'active').length}</div>
                  <div className="stat-label">Active Payments</div>
                </div>
                <User size={32} style={{ color: '#ffc107' }} />
              </div>
            </div>
            <div className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-value">{formatCurrency(
                    recurringPayments.filter((p) => p.status === 'active').reduce((sum, p) => {
                      switch (p.frequency) {
                        case 'daily': return sum + p.amount * 30;
                        case 'weekly': return sum + p.amount * 4;
                        case 'monthly': return sum + p.amount;
                        case 'yearly': return sum + p.amount / 12;
                        default: return sum + p.amount;
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
            <button onClick={() => setShowRecurringForm(!showRecurringForm)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} />{showRecurringForm ? 'Cancel' : 'Add Recurring Payment'}
            </button>
          </div>
          {showRecurringForm && (
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Add Recurring Payment</h3>
              <form onSubmit={handleRecurringSubmit}>
                <div className="form-group">
                  <label htmlFor="recipientName" className="form-label">Recipient Name</label>
                  <input id="recipientName" type="text" name="recipientName" className="form-input" value={recurringFormData.recipientName} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientName: e.target.value })} placeholder="Recipient name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="recipientAccount" className="form-label">Recipient Account Number</label>
                  <input id="recipientAccount" type="text" name="recipientAccount" className="form-input" value={recurringFormData.recipientAccount} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientAccount: e.target.value })} placeholder="Account number" />
                </div>
                <div className="form-group">
                  <label htmlFor="recipientPhone" className="form-label">Recipient Phone Number</label>
                  <input id="recipientPhone" type="text" name="recipientPhone" className="form-input" value={recurringFormData.recipientPhone} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientPhone: e.target.value })} placeholder="Phone number" />
                </div>
                <div className="form-group">
                  <label htmlFor="amount" className="form-label">Amount</label>
                  <input id="amount" type="number" name="amount" step="0.01" className="form-input" value={recurringFormData.amount} onChange={handleRecurringAmountChange} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label htmlFor="startDate" className="form-label">Start Date</label>
                  <CustomCalendar value={recurringFormData.startDate} onChange={(date) => setRecurringFormData({ ...recurringFormData, startDate: date })} placeholder="Select start date" minDate={new Date()} compact={true} />
                </div>
                <div className="form-group">
                  <label htmlFor="frequency" className="form-label">Frequency</label>
                  <select id="frequency" name="frequency" className="form-input" value={recurringFormData.frequency} onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })} required>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="description" className="form-label">Description</label>
                  <input id="description" type="text" name="description" className="form-input" value={recurringFormData.description} onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })} placeholder="Payment description" required />
                </div>
                {balanceWarning && (
                  <div style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '6px', background: balanceWarning.includes('INSUFFICIENT') ? '#ffebee' : '#fff3cd', border: `1px solid ${balanceWarning.includes('INSUFFICIENT') ? '#ef5350' : '#ffc107'}`, color: balanceWarning.includes('INSUFFICIENT') ? '#c62828' : '#856404', fontSize: '0.9rem' }}>
                    {balanceWarning}
                  </div>
                )}
                <button type="submit" className="btn btn-primary" disabled={balanceWarning.includes('INSUFFICIENT')}>Create Recurring Payment</button>
              </form>
            </div>
          )}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Your Recurring Payments</h3>
            {recurringPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                <Repeat size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                <div>No recurring payments set up</div>
                <small>Create your first recurring payment to get started</small>
              </div>
            ) : (
              <div className="transaction-list">
                {recurringPayments.map((payment) => (
                  <div key={payment._id} className="transaction-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                      <div style={{ padding: '12px', borderRadius: '50%', background: payment.status === 'active' ? '#e8f5e8' : '#f5f5f5', border: `2px solid ${payment.status === 'active' ? '#28a745' : '#6c757d'}` }}>
                        <Repeat size={20} style={{ color: payment.status === 'active' ? '#28a745' : '#6c757d' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{payment.description}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To: {payment.beneficiaryName}{payment.toAccount ? ` (A/C: ${payment.toAccount})` : ''}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{getFrequencyLabel(payment.frequency)}</div>
                        <div style={{ fontSize: '0.75rem', color: payment.status === 'active' ? '#28a745' : '#dc3545', fontWeight: '500', textTransform: 'uppercase' }}>{payment.status}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#28a745', marginBottom: '0.5rem' }}>{formatCurrency(payment.amount)}</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => toggleRecurringStatus(payment._id)} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', background: payment.status === 'active' ? '#dc3545' : '#28a745', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label={payment.status === 'active' ? 'Pause payment' : 'Resume payment'}>{payment.status === 'active' ? 'Pause' : 'Resume'}</button>
                        <button onClick={() => deleteRecurringPayment(payment._id)} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', background: '#dc3545', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Delete payment"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Payments;
