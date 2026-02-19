// src/pages/Transactions.jsx
import {
  Activity,
  ArrowDownCircle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpCircle,
  ArrowUpRight,
  CreditCard,
  Plus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { api } from '../utils/api';
import { getNonAdminUsers } from '../utils/auth';
import { addTransaction, getTransactions } from '../utils/transactions'; // keep if still used, otherwise remove

export default function Transactions({ user, onUserUpdate }) {
  const { showError, showSuccess } = useNotification();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');           // main tabs
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionType, setActionType] = useState('deposit');     // deposit / withdraw / transfer

  // ── Generic transaction form state ──────────────────────────────────────
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'other', // only used for debit/withdraw
  });

  // ── Transfer-specific state ─────────────────────────────────────────────
  const [transferData, setTransferData] = useState({
    transferMethod: 'phone',
    recipientPhone: '',
    recipientAccount: '',
    recipientName: '',
    recipientBank: { id: 'bankpro', name: 'BankPro' },
    description: '',
  });
  const [banks, setBanks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showBankSelector, setShowBankSelector] = useState(false);

  const isSubmitting = false; // can add per-action loading later

  // ── Load data ───────────────────────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const txs = await getTransactions(user.id);
      setTransactions(txs || []);
    } catch (err) {
      showError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id, showError]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    // Load banks for external transfers
    const loadBanks = async () => {
      try {
        const res = await api.users.getBanks();
        if (res?.success) setBanks(res.data || []);
      } catch (error) {
        showError('Failed to load banks');
        console.error(error);
      }
    };
    loadBanks();
  }, []);

  useEffect(() => {
    // Load possible internal recipients (optional UX)
    const loadRecipients = async () => {
      try {
        const recipients = await getNonAdminUsers();
        if (Array.isArray(recipients)) {
          const myId = user._id || user.id;
          setUsers(recipients.filter(u => (u._id || u.id) !== myId));
        }
      } catch { }
    };
    if (user) loadRecipients();
  }, [user]);

  // ── Common submit handler ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (actionType === 'transfer') {
      await handleTransfer();
    } else {
      await handleDepositOrWithdraw();
    }
  };

  const handleDepositOrWithdraw = async () => {
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount greater than 0');
      return;
    }

    const isDeposit = actionType === 'deposit';

    if (!isDeposit && amount > user.balance) {
      showError('Insufficient balance');
      return;
    }

    try {
      const payload = {
        type: isDeposit ? 'credit' : 'debit',
        amount,
        description: formData.description.trim() || (isDeposit ? 'Cash Deposit' : 'Cash Withdrawal'),
        category: isDeposit ? 'deposit' : (formData.category || 'withdrawal'),
      };

      // You can keep using addTransaction or switch to api.transactions.create
      const result = await addTransaction(payload); // or api.transactions.create(payload)

      if (!result) throw new Error('No result returned');

      showSuccess(isDeposit ? 'Deposit successful!' : 'Withdrawal successful!');

      const newBalance = isDeposit
        ? user.balance + amount
        : user.balance - amount;

      onUserUpdate({ ...user, balance: newBalance });
      await loadTransactions();

      resetForms();
    } catch (err) {
      showError('Operation failed. Please try again.');
      console.error(err);
    }
  };

  const handleTransfer = async () => {
    const amount = parseFloat(transferData.amount || formData.amount);
    if (isNaN(amount) || amount <= 0) {
      showError('Please enter a valid amount');
      return;
    }
    if (amount > user.balance) {
      showError('Insufficient balance');
      return;
    }

    const isExternal = transferData.recipientBank?.id !== 'bankpro';

    if (isExternal && !transferData.recipientName) {
      showError('Recipient name is required for external transfers');
      return;
    }

    let payload = {
      amount,
      description: (transferData.description || formData.description).trim() || 'Money transfer',
    };

    if (transferData.transferMethod === 'phone') {
      if (!transferData.recipientPhone || !/^\d{10}$/.test(transferData.recipientPhone)) {
        showError('Enter a valid 10-digit phone number');
        return;
      }
      payload.recipientPhone = transferData.recipientPhone;
    } else {
      if (!transferData.recipientAccount) {
        showError('Enter a valid account number');
        return;
      }
      payload.recipientAccount = transferData.recipientAccount;
    }

    if (isExternal) {
      payload.recipientName = transferData.recipientName;
      payload.recipientBank = {
        bankName: transferData.recipientBank.name,
        branchName: transferData.recipientBank.branchName || '',
      };
    }

    try {
      const result = await api.transactions.transfer(payload);

      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      showSuccess(result.data?.message || 'Transfer completed!');

      const fee = result.data?.processingFee || 0;
      const newBalance = user.balance - amount - fee;
      onUserUpdate({ ...user, balance: newBalance });

      await loadTransactions();
      resetForms();
    } catch (err) {
      showError('Transfer failed. Please try again.');
      console.error(err);
    }
  };

  const resetForms = () => {
    setShowActionForm(false);
    setFormData({ amount: '', description: '', category: 'other' });
    setTransferData({
      transferMethod: 'phone',
      recipientPhone: '',
      recipientAccount: '',
      recipientName: '',
      recipientBank: { id: 'bankpro', name: 'BankPro' },
      description: '',
    });
    setShowBankSelector(false);
  };

  const formatCurrency = (amt) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);

  const formatDate = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter & sort transactions
  const visibleTxs = transactions
    .filter((tx) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'deposit') return tx.type === 'credit';
      if (activeTab === 'withdraw') return tx.type === 'debit' && tx.category !== 'transfer';
      if (activeTab === 'transfer') return tx.category === 'transfer' || tx.description?.toLowerCase().includes('transfer');
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  return (
    <div className="container">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Transactions & Transfers</h1>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none"
          onClick={() => setShowActionForm(true)}
        >
          <Plus size={18} /> New Action
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-2xl font-bold">{formatCurrency(user.balance)}</div>
            <div className="text-gray-500">Available Balance</div>
          </div>
          <CreditCard size={40} className="text-blue-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 mb-6">
        <div className="flex gap-8">
          {['all', 'deposit', 'withdraw', 'transfer'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-sm font-medium focus:outline-none ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              {tab === 'all' ? 'All' :
                tab === 'deposit' ? 'Deposits' :
                  tab === 'withdraw' ? 'Withdrawals' : 'Transfers'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : visibleTxs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Activity size={64} className="opacity-40 mb-4 mx-auto" />
          <p>No transactions found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTxs.map((tx) => (
            <div
              key={tx._id || tx.id}
              className="flex items-center gap-4 p-4 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <div
                className={`p-2 rounded-full ${
                  tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {tx.type === 'credit' ? (
                  <ArrowDownLeft className="text-green-600" />
                ) : (
                  <ArrowUpRight className="text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{tx.description || 'Transaction'}</div>
                <div className="text-sm text-gray-500">
                  {formatDate(tx.createdAt || tx.date)}
                  {tx.category && ` • ${tx.category}`}
                </div>
              </div>
              <div
                className={`font-semibold ${
                  tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Form (Deposit / Withdraw / Transfer) ────────────────────── */}
      {showActionForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>New Transaction</h2>
              <button onClick={resetForms} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {/* Mini tabs inside form */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              {['deposit', 'withdraw', 'transfer'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActionType(type)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: actionType === type ? 'var(--primary)' : 'transparent',
                    color: actionType === type ? 'white' : 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {type === 'deposit' && <ArrowUpCircle size={18} />}
                  {type === 'withdraw' && <ArrowDownCircle size={18} />}
                  {type === 'transfer' && <ArrowRightLeft size={18} />}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  className="form-input"
                  value={actionType === 'transfer' ? transferData.amount : formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (actionType === 'transfer') {
                      setTransferData({ ...transferData, amount: val });
                    } else {
                      setFormData({ ...formData, amount: val });
                    }
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Common description */}
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={actionType === 'transfer' ? transferData.description : formData.description}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (actionType === 'transfer') {
                      setTransferData({ ...transferData, description: val });
                    } else {
                      setFormData({ ...formData, description: val });
                    }
                  }}
                  placeholder="Purpose of transaction"
                />
              </div>

              {/* Deposit / Withdraw extra fields */}
              {actionType !== 'transfer' && actionType === 'withdraw' && (
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="food">Food & Dining</option>
                    <option value="transportation">Transportation</option>
                    <option value="utilities">Utilities</option>
                    <option value="shopping">Shopping</option>
                    <option value="withdrawal">Cash Withdrawal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}

              {/* Transfer-specific fields */}
              {actionType === 'transfer' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Transfer Method</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={transferData.transferMethod === 'phone'}
                          onChange={() => setTransferData({ ...transferData, transferMethod: 'phone' })}
                        />
                        Phone
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={transferData.transferMethod === 'account'}
                          onChange={() => setTransferData({ ...transferData, transferMethod: 'account' })}
                        />
                        Account
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recipient Bank</label>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={transferData.recipientBank.id === 'bankpro'}
                          onChange={() => {
                            setTransferData({
                              ...transferData,
                              recipientBank: { id: 'bankpro', name: 'BankPro' },
                            });
                            setShowBankSelector(false);
                          }}
                        />
                        BankPro
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="radio"
                          checked={transferData.recipientBank.id !== 'bankpro'}
                          onChange={() => {
                            setTransferData({
                              ...transferData,
                              recipientBank: { id: '', name: '' },
                              recipientName: '',
                            });
                            setShowBankSelector(true);
                          }}
                        />
                        Other Bank
                      </label>
                    </div>

                    {showBankSelector && (
                      <select
                        className="form-input"
                        style={{ marginTop: '0.75rem' }}
                        value={transferData.recipientBank.id}
                        onChange={(e) => {
                          const bank = banks.find(b => b.id === e.target.value) || { id: e.target.value, name: '' };
                          setTransferData({ ...transferData, recipientBank: bank });
                        }}
                      >
                        <option value="">Select bank</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {transferData.recipientBank.id !== 'bankpro' && (
                    <div className="form-group">
                      <label className="form-label">Recipient Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={transferData.recipientName}
                        onChange={e => setTransferData({ ...transferData, recipientName: e.target.value })}
                        placeholder="Full name"
                        required
                      />
                    </div>
                  )}

                  {transferData.transferMethod === 'phone' ? (
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={transferData.recipientPhone}
                        onChange={e => setTransferData({ ...transferData, recipientPhone: e.target.value })}
                        placeholder="9876543210"
                        pattern="\d{10}"
                        required
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={transferData.recipientAccount}
                        onChange={e => setTransferData({ ...transferData, recipientAccount: e.target.value })}
                        placeholder="Enter account number"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForms}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}