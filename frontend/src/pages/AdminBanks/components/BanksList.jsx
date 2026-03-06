export default function BanksList({
  banks,
  editingBankId,
  editBank,
  setEditBank,
  isSavingEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteBank
}) {
  const toBankCode = (bank) => String(bank.bankCode || bank.ifscPrefix || '').trim().toUpperCase();

  return (
    <div className="card admin-banks-card">
      <h2 className="admin-banks-section-title">Existing Banks</h2>
      {banks.length === 0 ? (
        <div className="admin-banks-empty-state">No banks added yet.</div>
      ) : (
        <ul className="admin-banks-list">
        {banks.map((bank) => (
          <li key={bank._id} className="admin-banks-item">
            {editingBankId === bank._id ? (
              <>
                <div className="admin-banks-item-main admin-banks-edit-form">
                  <input
                    type="text"
                    className="form-input admin-banks-input"
                    value={editBank.bankName}
                    placeholder="Bank name"
                    onChange={(e) => setEditBank({ ...editBank, bankName: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-input admin-banks-input"
                    value={editBank.bankCode}
                    placeholder="Bank code"
                    maxLength={4}
                    onChange={(e) => setEditBank({
                      ...editBank,
                      bankCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
                    })}
                  />
                  <input
                    type="text"
                    className="form-input admin-banks-input"
                    value={editBank.description}
                    placeholder="Description"
                    onChange={(e) => setEditBank({ ...editBank, description: e.target.value })}
                  />
                </div>
                <div className="admin-banks-actions">
                  <button
                    className="admin-banks-save-btn"
                    onClick={onSaveEdit}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    className="admin-banks-cancel-btn"
                    onClick={onCancelEdit}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="admin-banks-item-main">
                  <p className="admin-banks-item-name">{bank.bankName || bank.name}</p>
                  <p className="admin-banks-item-meta">
                    Bank Code: <span>{toBankCode(bank) || 'N/A'}</span>
                  </p>
                  <p className="admin-banks-item-ifsc">IFSC Format: {toBankCode(bank) || 'XXXX'}0001234</p>
                  <p className="admin-banks-item-description">{bank.description || 'No description provided.'}</p>
                </div>
                <div className="admin-banks-actions">
                  <button
                    onClick={() => onStartEdit(bank)}
                    className="admin-banks-edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteBank(bank._id)}
                    className="admin-banks-remove-btn"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
