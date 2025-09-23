import { AlertTriangle, ArrowRightLeft, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { api } from '../utils/api';
import { getNonAdminUsers } from '../utils/auth';

const Transfer = ({ user, onUserUpdate }) => {
  const { showSuccess } = useNotification();
  const [formData, setFormData] = useState({
    transferMethod: 'phone', // 'phone' or 'account'
    recipientPhone: '',
    recipientAccount: '',
    recipientName: '',
    recipientBank: { id: 'bankpro', name: 'BankPro', ifscCode: 'BANK0001234' },
    amount: '',
    description: ''
  });
  const [banks, setBanks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  // Safe notification functions
  const safeShowSuccess = (message) => {
    if (showSuccess) {
      showSuccess(message);
    } else {
      console.log('Transfer success:', message);
      setSuccess(message);
    }
  };

  // Get user ID safely
  const getUserId = useCallback(() => user?._id || user?.id || '', [user]);

  // Get user balance safely
  const getUserBalance = useCallback(() => user?.balance || 0, [user]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const result = await api.users.getBanks();
        if (result.success) {
          setBanks(result.data);
        }
      } catch (error) {
        console.error('Error loading banks:', error);
      }
    };

    loadBanks();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Load transfer recipients - this endpoint is available to all authenticated users
        const transferRecipients = await getNonAdminUsers();
        if (Array.isArray(transferRecipients)) {
          const userId = getUserId();
          // Filter out current user if somehow included
          setUsers(transferRecipients.filter(u => (u._id !== userId && u.id !== userId)));
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error('Error loading transfer recipients:', error);
        setUsers([]);
      }
    };

    if (user) {
      loadUsers();
    }
  }, [user, getUserId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTransferring(true);

    const amount = parseFloat(formData.amount);
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      setTransferring(false);
      return;
    }

    if (amount > getUserBalance()) {
      setError('Insufficient balance');
      setTransferring(false);
      return;
    }

    try {
      let transferData;

      // Determine if this is an external transfer
      const isExternalTransfer = formData.recipientBank && formData.recipientBank.id !== 'bankpro';

      if (formData.transferMethod === 'phone') {
        // Validate phone number format
        if (!formData.recipientPhone || !/^\d{10}$/.test(formData.recipientPhone)) {
          setError('Please enter a valid 10-digit phone number');
          setTransferring(false);
          return;
        }

        if (isExternalTransfer) {
          // External transfer with phone
          if (!formData.recipientName || !formData.recipientBank.name || !formData.recipientBank.ifscCode) {
            setError('Recipient name and bank details are required for external transfers');
            setTransferring(false);
            return;
          }
          transferData = {
            recipientPhone: formData.recipientPhone,
            recipientName: formData.recipientName,
            recipientBank: {
              bankName: formData.recipientBank.name,
              ifscCode: formData.recipientBank.ifscCode,
              branchName: formData.recipientBank.branchName || ''
            },
            amount,
            description: formData.description || 'Money transfer'
          };
        } else {
          // Internal transfer with phone
          transferData = {
            recipientPhone: formData.recipientPhone,
            amount,
            description: formData.description || 'Money transfer'
          };
        }
      } else {
        // Account number transfer
        if (!formData.recipientAccount) {
          setError('Please enter a valid account number');
          setTransferring(false);
          return;
        }

        if (isExternalTransfer) {
          // External transfer with account
          if (!formData.recipientName || !formData.recipientBank.name || !formData.recipientBank.ifscCode) {
            setError('Recipient name and bank details are required for external transfers');
            setTransferring(false);
            return;
          }
          transferData = {
            recipientAccount: formData.recipientAccount,
            recipientName: formData.recipientName,
            recipientBank: {
              bankName: formData.recipientBank.name,
              ifscCode: formData.recipientBank.ifscCode,
              branchName: formData.recipientBank.branchName || ''
            },
            amount,
            description: formData.description || 'Money transfer'
          };
        } else {
          // Internal transfer with account
          transferData = {
            recipientAccount: formData.recipientAccount,
            amount,
            description: formData.description || 'Money transfer'
          };
        }
      }

      // Perform the transfer
      const result = await api.transactions.transfer(transferData);

      if (result.success) {
        safeShowSuccess(result.data.message || 'Transfer completed successfully!');

        // Update user balance in parent component
        const processingFee = result.data.processingFee || 0;
        const newBalance = user.balance - amount - processingFee;
        onUserUpdate({ ...user, balance: newBalance });

        // Reset form
        setFormData({
          transferMethod: 'phone',
          recipientPhone: '',
          recipientAccount: '',
          recipientName: '',
          recipientBank: { id: 'bankpro', name: 'BankPro', ifscCode: 'BANK0001234' },
          amount: '',
          description: ''
        });
        setShowBankSelector(false);
      } else {
        setError(result.error || 'Transfer failed');
      }
    } catch (error) {
      setError('Transfer failed. Please try again.');
      console.error('Transfer error:', error);
    } finally {
      setTransferring(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Transfer Money
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Send money to other users instantly via phone number or account number
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowRightLeft size={20} />
          New Transfer
        </h3>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Transfer Method</label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="transferMethod"
                  value="phone"
                  checked={formData.transferMethod === 'phone'}
                  onChange={handleChange}
                />
                Phone Number
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="transferMethod"
                  value="account"
                  checked={formData.transferMethod === 'account'}
                  onChange={handleChange}
                />
                Account Number
              </label>
            </div>
          </div>

          {/* Bank Selection */}
          <div className="form-group">
            <label className="form-label">Recipient Bank</label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="bankType"
                  checked={!formData.recipientBank || formData.recipientBank?.id === 'bankpro'}
                  onChange={() => {
                    setFormData({
                      ...formData,
                      recipientBank: { id: 'bankpro', name: 'BankPro', ifscCode: 'BANK0001234' }
                    });
                    setShowBankSelector(false);
                  }}
                />
                BankPro (Internal)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="bankType"
                  checked={formData.recipientBank && formData.recipientBank.id !== 'bankpro'}
                  onChange={() => setShowBankSelector(true)}
                />
                Other Bank (External)
              </label>
            </div>

            {showBankSelector && (
              <div style={{ marginTop: '1rem' }}>
                <select
                  className="form-input"
                  value={formData.recipientBank?.id || ''}
                  onChange={(e) => {
                    const selectedBank = banks.find(bank => bank.id === e.target.value);
                    setFormData({
                      ...formData,
                      recipientBank: selectedBank || null
                    });
                  }}
                  style={{ marginBottom: '1rem' }}
                >
                  <option value="">Select a bank</option>
                  {banks.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.logo} {bank.name}
                    </option>
                  ))}
                </select>

                {formData.recipientBank && formData.recipientBank.id !== 'bankpro' && (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                      <strong>External Transfer Fee: ₹{Math.max(10, parseFloat(formData.amount || 0) * 0.005).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      External transfers incur a processing fee of ₹10 or 0.5% of the transfer amount, whichever is higher.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recipient Name for External Transfers */}
          {formData.recipientBank && formData.recipientBank.id !== 'bankpro' && (
            <div className="form-group">
              <label className="form-label">Recipient Name</label>
              <input
                type="text"
                name="recipientName"
                className="form-input"
                value={formData.recipientName}
                onChange={handleChange}
                placeholder="Enter recipient's full name"
                required
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                Required for external bank transfers
              </small>
            </div>
          )}

          {formData.transferMethod === 'phone' ? (
            <div className="form-group">
              <label className="form-label">Recipient Phone Number</label>
              <input
                type="tel"
                name="recipientPhone"
                className="form-input"
                value={formData.recipientPhone}
                onChange={handleChange}
                placeholder="Enter phone number (e.g., 9876543210)"
                required
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                Enter the recipient's phone number to transfer money
              </small>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Recipient Account Number</label>
              <input
                type="text"
                name="recipientAccount"
                className="form-input"
                value={formData.recipientAccount}
                onChange={handleChange}
                placeholder="Enter account number (e.g., ACC001234)"
                required
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                Enter the recipient's account number to transfer money
              </small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              name="amount"
              step="0.01"
              className="form-input"
              value={formData.amount}
              onChange={handleChange}
              required
              placeholder="0.00"
            />
            {/* Fee and total debit preview for external transfers */}
            {formData.recipientBank && formData.recipientBank.id !== 'bankpro' && formData.amount && parseFloat(formData.amount) > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>Transfer Preview:</strong><br />
                Amount: <span style={{ color: 'var(--primary)' }}>{formatCurrency(parseFloat(formData.amount))}</span><br />
                Processing Fee: <span style={{ color: 'var(--warning)' }}>{formatCurrency(Math.max(10, parseFloat(formData.amount) * 0.005))}</span><br />
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Total to be debited: {formatCurrency(parseFloat(formData.amount) + Math.max(10, parseFloat(formData.amount) * 0.005))}</span>
                <br />
                <span style={{ fontSize: '0.85rem' }}>This is the total amount that will be deducted from your account for this transfer.</span>
              </div>
            )}
            {/* Preview for internal transfers by account number */}
            {formData.recipientBank && formData.recipientBank.id === 'bankpro' && formData.amount && parseFloat(formData.amount) > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>Transfer Preview:</strong><br />
                Amount: <span style={{ color: 'var(--primary)' }}>{formatCurrency(parseFloat(formData.amount))}</span><br />
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>No processing fee. Total to be debited: {formatCurrency(parseFloat(formData.amount))}</span>
                <br />
                <span style={{ fontSize: '0.85rem' }}>Internal transfers to BankPro accounts do not incur any fees.</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <input
              type="text"
              name="description"
              className="form-input"
              value={formData.description}
              onChange={handleChange}
              placeholder="What's this transfer for?"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={transferring}>
            {transferring ? 'Processing Transfer...' : 'Transfer Money'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={20} />
          Available Recipients
        </h3>

        <div className="transaction-list">
          {users.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <div style={{ marginBottom: '1rem' }}>
                <strong>Secure Transfer System</strong>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                For security and privacy reasons, the list of all users is only available to administrators.
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                You can still transfer money by entering the recipient's phone number or account number manually in the form above.
              </div>
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)'
                  }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{u.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Phone: {u.phone} | Account: {u.accountNumber}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: '600', color: 'var(--success)' }}>
                  {typeof u.balance === 'number' && !isNaN(u.balance) ? formatCurrency(u.balance) : formatCurrency(0)}
                </div>
              </div>
            ))
          )}
          {users.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              <strong>Tip:</strong> You can also enter phone numbers or account numbers manually in the transfer form above, even if they're not shown in this list.
            </div>
          )}
          {users.length === 0 && (
            <div className="info-box" style={{
              marginTop: '1rem',
              fontSize: '0.9rem'
            }}>
              <strong>💡 How to Transfer Money:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Choose transfer method: Phone Number or Account Number</li>
                <li>Select recipient bank: BankPro (internal) or other banks (external)</li>
                <li>Enter the recipient's phone number or account number</li>
                <li>For external transfers, enter recipient's name</li>
                <li>Specify the transfer amount</li>
                <li>Add an optional description</li>
                <li>Click "Transfer Money" to complete the transaction</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transfer;
