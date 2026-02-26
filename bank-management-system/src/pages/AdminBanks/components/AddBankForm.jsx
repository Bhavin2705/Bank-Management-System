export default function AddBankForm({ newBank, setNewBank, onAddBank }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Add New Bank</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <input
          type="text"
          placeholder="Bank Name"
          value={newBank.name}
          onChange={(e) => setNewBank({ ...newBank, name: e.target.value })}
          className="form-input"
        />
        <input
          type="text"
          placeholder="IFSC Prefix"
          value={newBank.ifscPrefix}
          onChange={(e) => setNewBank({ ...newBank, ifscPrefix: e.target.value })}
          className="form-input"
        />
        <input
          type="text"
          placeholder="Description"
          value={newBank.description}
          onChange={(e) => setNewBank({ ...newBank, description: e.target.value })}
          className="form-input"
        />
      </div>
      <button
        onClick={onAddBank}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Add Bank
      </button>
    </div>
  );
}
