import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle } from 'lucide-react';
import { ACTION_TYPES } from '../constants';

const PinError = ({ pinError }) => {
  if (!pinError) return null;

  return (
    <div style={{
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      padding: '0.75rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      fontSize: '0.9rem'
    }}>
      {pinError}
    </div>
  );
};

export default function ActionFormModal({
  show,
  actionType,
  onActionTypeChange,
  onClose,
  onSubmit,
  pinVerifying,
  pinError,
  pin,
  setPin,
  formData,
  setFormData,
  transferData,
  setTransferData,
  banks,
  showBankSelector,
  setShowBankSelector,
}) {
  if (!show) return null;

  const onAmountChange = (value) => {
    if (actionType === 'transfer') {
      setTransferData({ ...transferData, amount: value });
      return;
    }
    setFormData({ ...formData, amount: value });
  };

  const onDescriptionChange = (value) => {
    if (actionType === 'transfer') {
      setTransferData({ ...transferData, description: value });
      return;
    }
    setFormData({ ...formData, description: value });
  };

  return (
    <div className="transactions-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="transactions-modal card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="transactions-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>New Transaction</h2>
          <button className="transactions-modal-close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
            x
          </button>
        </div>

        <div className="transactions-action-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          {ACTION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="transactions-action-tab"
              onClick={() => onActionTypeChange(type)}
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

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              className="form-input"
              value={actionType === 'transfer' ? transferData.amount : formData.amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input
              type="text"
              className="form-input"
              value={actionType === 'transfer' ? transferData.description : formData.description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Purpose of transaction"
            />
          </div>

          <PinError pinError={pinError} />

          <div className="form-group">
            <label className="form-label">Enter PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="form-input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder="Enter 4-6 digit PIN"
              pattern="[0-9]{4,6}"
              autoComplete="off"
              style={{
                letterSpacing: '0.2em',
                fontSize: '1.2rem'
              }}
            />
          </div>

          {actionType === 'transfer' && (
            <>
              <div className="form-group">
                <label className="form-label">Transfer Method</label>
                <div className="transactions-radio-row" style={{ display: 'flex', gap: '1.5rem' }}>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      checked={transferData.transferMethod === 'phone'}
                      onChange={() => setTransferData({ ...transferData, transferMethod: 'phone' })}
                    />
                    Phone
                  </label>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                <div className="transactions-radio-row" style={{ display: 'flex', gap: '1.5rem' }}>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                      const bank = banks.find((b) => b.id === e.target.value) || { id: e.target.value, name: '' };
                      setTransferData({ ...transferData, recipientBank: bank });
                    }}
                  >
                    <option value="">Select bank</option>
                    {banks.map((b) => (
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

          <div className="transactions-modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={pinVerifying}>
              {pinVerifying ? 'Verifying...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pinVerifying}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
