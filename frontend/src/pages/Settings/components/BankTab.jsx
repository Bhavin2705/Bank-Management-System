import { Building2 } from 'lucide-react';

const BankTab = ({ user, bankData, handleFormKeyDown, handleBankChange, handleBankUpdate, loading }) => (
  <div>
    <h3 className="settings-section-title">
      <Building2 size={20} />
      Bank Information
    </h3>

    <form onKeyDown={handleFormKeyDown} onSubmit={handleBankUpdate}>
      <div className="settings-grid-300">
        <div className="form-group">
          <label className="form-label">Bank</label>
          <div className="settings-bank-row">
            <input
              type="text"
              name="bankName"
              className="form-input settings-flex-input"
              value={bankData.bankName}
              onChange={handleBankChange}
            />
            <input
              type="text"
              name="ifscCode"
              className="form-input settings-flex-input"
              value={bankData.ifscCode}
              onChange={handleBankChange}
            />
          </div>
          <small className="settings-help-text">
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

      <div className="form-group settings-top-gap">
        <label className="form-label">Account Number</label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={user.accountNumber || 'Not assigned'}
          disabled
        />
      </div>

      <div className="info-box">
        <strong>Important:</strong> Your bank information is used for transfers and transactions. Make sure the
        details are accurate for successful transactions.
      </div>
      <button type="submit" className="btn btn-primary settings-top-gap" disabled={loading}>
        {loading ? 'Saving...' : 'Save Bank Details'}
      </button>
    </form>
  </div>
);

export default BankTab;
