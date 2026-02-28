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
  isProcessing,
  processingText,
  pinVerifying,
  pinError,
  pin,
  setPin,
  formData,
  setFormData,
  transferData,
  setTransferData,
  selfAccounts,
  currentAccountNumber,
  banks,
  showBankSelector,
  setShowBankSelector,
}) {
  if (!show) return null;
  const safeTransfer = transferData || {};
  const safeForm = formData || {};
  const safeRecipientBank = safeTransfer.recipientBank || { id: 'bankpro', name: 'BankPro' };

  const onAmountChange = (value) => {
    if (actionType === 'transfer') {
      setTransferData({ ...safeTransfer, amount: value });
      return;
    }
    setFormData({ ...safeForm, amount: value });
  };

  const onDescriptionChange = (value) => {
    if (actionType === 'transfer') {
      setTransferData({ ...safeTransfer, description: value });
      return;
    }
    setFormData({ ...safeForm, description: value });
  };

  const preventAmountAutoAdjust = (event) => {
    // Prevent mouse wheel from silently changing numeric values while scrolling modal content.
    if (event.type === 'wheel') {
      event.currentTarget.blur();
    }
    if (event.type === 'keydown' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
    }
  };

  return (
    <div className="transactions-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="transactions-modal card" style={{ width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="transactions-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>New Transaction</h2>
          <button className="transactions-modal-close-btn" onClick={onClose} disabled={isProcessing || pinVerifying} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: isProcessing || pinVerifying ? 0.6 : 1 }}>
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
              disabled={isProcessing || pinVerifying}
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
                opacity: isProcessing || pinVerifying ? 0.6 : 1,
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
              value={actionType === 'transfer' ? (safeTransfer.amount || '') : (safeForm.amount || '')}
              onChange={(e) => onAmountChange(e.target.value)}
              onWheel={preventAmountAutoAdjust}
              onKeyDown={preventAmountAutoAdjust}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <input
              type="text"
              className="form-input"
              value={actionType === 'transfer' ? (safeTransfer.description || '') : (safeForm.description || '')}
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
              value={pin || ''}
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
                      checked={safeTransfer.transferMethod === 'phone'}
                      onChange={() => setTransferData({ ...safeTransfer, transferMethod: 'phone', selfTransfer: false, selfRecipientAccount: '' })}
                      disabled={!!safeTransfer.selfTransfer}
                    />
                    Phone
                  </label>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      checked={safeTransfer.transferMethod === 'account'}
                      onChange={() => setTransferData({ ...safeTransfer, transferMethod: 'account' })}
                    />
                    Account
                  </label>
                </div>
              </div>

              {safeRecipientBank.id === 'bankpro' && (
                <div className="form-group">
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={!!safeTransfer.selfTransfer}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setTransferData({
                          ...safeTransfer,
                          selfTransfer: checked,
                          transferMethod: checked ? 'account' : safeTransfer.transferMethod,
                          recipientPhone: checked ? '' : (safeTransfer.recipientPhone || ''),
                          selfRecipientAccount: checked ? safeTransfer.selfRecipientAccount : ''
                        });
                      }}
                    />
                    Self transfer (my other account)
                  </label>
                  {!!safeTransfer.selfTransfer && (
                    <div style={{ marginTop: '0.65rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Current account: {currentAccountNumber || 'N/A'}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Recipient Bank</label>
                <div className="transactions-radio-row" style={{ display: 'flex', gap: '1.5rem' }}>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      checked={safeRecipientBank.id === 'bankpro'}
                      onChange={() => {
                        setTransferData({
                          ...safeTransfer,
                          recipientBank: { id: 'bankpro', name: 'BankPro' },
                          recipientName: '',
                        });
                        setShowBankSelector(false);
                      }}
                    />
                    BankPro
                  </label>
                  <label className="transactions-radio-option" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="radio"
                      checked={safeRecipientBank.id !== 'bankpro'}
                      onChange={() => {
                        setTransferData({
                          ...safeTransfer,
                          recipientBank: { id: '', name: '' },
                          selfTransfer: false,
                          selfRecipientAccount: '',
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
                    value={safeRecipientBank.id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const bank = banks.find((b) => String(b.id || b._id || '') === selectedId) || { id: selectedId, name: '' };
                      setTransferData({ ...safeTransfer, recipientBank: { ...bank, id: String(bank.id || bank._id || selectedId || '') } });
                    }}
                  >
                    <option value="">Select bank</option>
                    {banks.map((b) => (
                      <option key={String(b.id || b._id || b.name)} value={String(b.id || b._id || '')}>{b.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {safeRecipientBank.id !== 'bankpro' && (
                <div className="form-group">
                  <label className="form-label">Recipient Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={safeTransfer.recipientName || ''}
                    onChange={e => setTransferData({ ...safeTransfer, recipientName: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
              )}

              {safeTransfer.selfTransfer ? (
                <div className="form-group">
                  <label className="form-label">Select Your Account</label>
                  <select
                    className="form-input"
                    value={safeTransfer.selfRecipientAccount || ''}
                    onChange={(e) => setTransferData({ ...safeTransfer, selfRecipientAccount: e.target.value, recipientAccount: e.target.value })}
                    required
                  >
                    <option value="">Select account</option>
                    {(selfAccounts || []).map((account) => (
                      <option key={account._id || account.accountNumber} value={account.accountNumber}>
                        {account.name} - {account.accountNumber}
                      </option>
                    ))}
                  </select>
                </div>
              ) : safeTransfer.transferMethod === 'phone' ? (
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={safeTransfer.recipientPhone || ''}
                    onChange={e => setTransferData({ ...safeTransfer, recipientPhone: e.target.value })}
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
                    value={safeTransfer.recipientAccount || ''}
                    onChange={e => setTransferData({ ...safeTransfer, recipientAccount: e.target.value })}
                    placeholder="Enter account number"
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="transactions-modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" disabled={pinVerifying || isProcessing}>
              {isProcessing
                ? (processingText || 'Processing...')
                : (pinVerifying ? 'Verifying...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`)}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pinVerifying || isProcessing}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
