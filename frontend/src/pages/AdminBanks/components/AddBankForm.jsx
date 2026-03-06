export default function AddBankForm({ newBank, setNewBank, onAddBank }) {
  const bankCode = String(newBank.bankCode || '').trim().toUpperCase();
  const normalizedCode = bankCode.replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const sampleIfscPrimary = `${normalizedCode.padEnd(4, 'X')}0001234`;
  const sampleIfscSecondary = `${normalizedCode.padEnd(4, 'X')}0005678`;

  const isDisabled = (
    !String(newBank.bankName || '').trim()
    || !String(newBank.bankCode || '').trim()
    || !String(newBank.description || '').trim()
    || !/^[A-Z0-9]{4}$/.test(normalizedCode)
  );

  return (
    <div className="card admin-banks-card">
      <h2 className="admin-banks-section-title">Add New Bank</h2>
      <div className="admin-banks-form-grid">
        <div className="admin-banks-field">
          <label className="admin-banks-label">Bank Name</label>
          <input
            type="text"
            placeholder="Enter bank name"
            value={newBank.bankName}
            onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
            className="form-input admin-banks-input"
          />
        </div>
        <div className="admin-banks-field">
          <label className="admin-banks-label">Bank Code (4 chars)</label>
          <input
            type="text"
            placeholder="Example: HDFC"
            value={newBank.bankCode}
            onChange={(e) => setNewBank({ ...newBank, bankCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) })}
            className="form-input admin-banks-input"
            maxLength={4}
          />
          <p className="admin-banks-helper">Used as IFSC prefix. Example: `SBIN`, `HDFC`</p>
        </div>
        <div className="admin-banks-field admin-banks-field-wide">
          <label className="admin-banks-label">Description</label>
          <input
            type="text"
            placeholder="Optional description"
            value={newBank.description}
            onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
            className="form-input admin-banks-input"
          />
        </div>
      </div>
      <div className="admin-banks-ifsc-preview">
        <div className="admin-banks-preview-label">Generated IFSC examples</div>
        <div className="admin-banks-preview-row">
          <span>{sampleIfscPrimary}</span>
          <span>{sampleIfscSecondary}</span>
        </div>
      </div>
      <button
        onClick={onAddBank}
        className="btn btn-primary admin-banks-add-btn"
        disabled={isDisabled}
      >
        Add Bank
      </button>
    </div>
  );
}
