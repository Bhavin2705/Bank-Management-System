import { AlertTriangle, ArrowRightLeft, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../components/providers';
import { api } from '../../utils/api';
import { getNonAdminUsers } from '../../utils/auth';
import { formatCurrencyByPreference } from '../../utils/currency';
import {
  BANKPRO_BANK,
  buildTransferPayload,
  calculateExternalTransferFee,
  createInitialTransferForm,
  getTransferValidationError,
  isExternalBank
} from './utils';

const Transfer = ({ user, onUserUpdate }) => {
  const { showSuccess } = useNotification();
  const [formData, setFormData] = useState(createInitialTransferForm);
  const [banks, setBanks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  const safeShowSuccess = (message) => {
    if (showSuccess) {
      showSuccess(message);
      return;
    }
    console.log('Transfer success:', message);
    setSuccess(message);
  };

  const getUserId = useCallback(() => user?._id || user?.id || '', [user]);

  const getUserBalance = useCallback(() => user?.balance || 0, [user]);

  const formatCurrency = (amount) => formatCurrencyByPreference(amount, user);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const result = await api.users.getBanks();
        if (result.success) {
          setBanks(result.data);
        }
      } catch (loadBanksError) {
        console.error('Error loading banks:', loadBanksError);
      }
    };

    loadBanks();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const transferRecipients = await getNonAdminUsers();
        if (Array.isArray(transferRecipients)) {
          const userId = getUserId();
          setUsers(transferRecipients.filter((listedUser) => (listedUser._id !== userId && listedUser.id !== userId)));
        } else {
          setUsers([]);
        }
      } catch (loadUsersError) {
        console.error('Error loading transfer recipients:', loadUsersError);
        setUsers([]);
      }
    };

    if (user) {
      loadUsers();
    }
  }, [user, getUserId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setTransferring(true);

    const validationError = getTransferValidationError(formData, getUserBalance());
    if (validationError) {
      setError(validationError);
      setTransferring(false);
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      const transferData = buildTransferPayload(formData);
      const result = await api.transactions.transfer(transferData);

      if (result.success) {
        safeShowSuccess(result.data.message || 'Transfer completed successfully!');

        const processingFee = result.data.processingFee || 0;
        const newBalance = user.balance - amount - processingFee;
        onUserUpdate({ ...user, balance: newBalance });

        setFormData(createInitialTransferForm());
        setShowBankSelector(false);
      } else {
        setError(result.error || 'Transfer failed');
      }
    } catch (transferError) {
      setError('Transfer failed. Please try again.');
      console.error('Transfer error:', transferError);
    } finally {
      setTransferring(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value
    }));
  };

  const isExternalTransfer = isExternalBank(formData.recipientBank);
  const enteredAmount = parseFloat(formData.amount || 0);

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

          <div className="form-group">
            <label className="form-label">Recipient Bank</label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="bankType"
                  checked={!formData.recipientBank || formData.recipientBank?.id === 'bankpro'}
                  onChange={() => {
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      recipientBank: { ...BANKPRO_BANK }
                    }));
                    setShowBankSelector(false);
                  }}
                />
                BankPro (Internal)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="radio"
                  name="bankType"
                  checked={isExternalTransfer}
                  onChange={() => {
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      recipientBank: { id: '', name: '' },
                      recipientName: ''
                    }));
                    setShowBankSelector(true);
                  }}
                />
                Other Bank (External)
              </label>
            </div>

            {showBankSelector && (
              <div style={{ marginTop: '1rem' }}>
                <select
                  className="form-input"
                  value={formData.recipientBank?.id || ''}
                  onChange={(event) => {
                    const selectedBank = banks.find((bank) => bank.id === event.target.value);
                    setFormData((currentFormData) => ({
                      ...currentFormData,
                      recipientBank: selectedBank || null
                    }));
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

                {isExternalTransfer && (
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                      <strong>
                        External Transfer Fee: {formatCurrency(calculateExternalTransferFee(enteredAmount))}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      External transfers incur a processing fee of {formatCurrency(10)} or 0.5% of the transfer amount, whichever is higher.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isExternalTransfer && (
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
            {isExternalTransfer && formData.amount && enteredAmount > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>Transfer Preview:</strong><br />
                Amount: <span style={{ color: 'var(--primary)' }}>{formatCurrency(enteredAmount)}</span><br />
                Processing Fee: <span style={{ color: 'var(--warning)' }}>{formatCurrency(calculateExternalTransferFee(enteredAmount))}</span><br />
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                  Total to be debited: {formatCurrency(enteredAmount + calculateExternalTransferFee(enteredAmount))}
                </span>
                <br />
                <span style={{ fontSize: '0.85rem' }}>This is the total amount that will be deducted from your account for this transfer.</span>
              </div>
            )}
            {!isExternalTransfer && formData.amount && enteredAmount > 0 && (
              <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                <strong>Transfer Preview:</strong><br />
                Amount: <span style={{ color: 'var(--primary)' }}>{formatCurrency(enteredAmount)}</span><br />
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>No processing fee. Total to be debited: {formatCurrency(enteredAmount)}</span>
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
            users.map((listedUser) => (
              <div key={listedUser.id} className="transaction-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)'
                  }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '500' }}>{listedUser.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Phone: {listedUser.phone} | Account: {listedUser.accountNumber}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: '600', color: 'var(--success)' }}>
                  {typeof listedUser.balance === 'number' && !isNaN(listedUser.balance) ? formatCurrency(listedUser.balance) : formatCurrency(0)}
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
              <strong>How to Transfer Money:</strong>
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

