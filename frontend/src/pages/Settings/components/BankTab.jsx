import { Building2 } from 'lucide-react';

const BankTab = ({ user, bankData, handleFormKeyDown, handleBankChange, handleBankUpdate, loading }) => (
  <div>
    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Building2 size={20} />
      Bank Information
    </h3>

    <form onKeyDown={handleFormKeyDown} onSubmit={handleBankUpdate}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Bank</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text"
              name="bankName"
              className="form-input"
              value={bankData.bankName}
              onChange={handleBankChange}
              style={{ flex: 1, minWidth: 0 }}
            />
            <input
              type="text"
              name="ifscCode"
              className="form-input"
              value={bankData.ifscCode}
              onChange={handleBankChange}
              style={{ flex: 1, minWidth: 0 }}
            />
          </div>
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
            Keep these details accurate to avoid transfer and settlement issues.
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Branch Name</label>
          <input
            type="text"
            name="branchName"
            className="form-input"
            value={bankData.branchName}
            onChange={handleBankChange}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label className="form-label">Account Number</label>
        <input
          type="text"
          className="form-input"
          value={user.accountNumber || 'Not assigned'}
          disabled
          style={{ background: 'var(--bg-tertiary)' }}
        />
      </div>

      <div className="info-box">
        <strong>Important:</strong> Your bank information is used for transfers and transactions. Make sure the
        details are accurate for successful transactions.
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
        {loading ? 'Saving...' : 'Save Bank Details'}
      </button>
    </form>
  </div>
);

export default BankTab;
