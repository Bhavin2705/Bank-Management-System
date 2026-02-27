import { Plus, Receipt } from 'lucide-react';
import CustomCalendar from '../../../components/ui';
import { fromLocalYYYYMMDD, toLocalYYYYMMDD } from '../../../utils/date';

const BillsTab = ({
  bills,
  showBillForm,
  setShowBillForm,
  billFormData,
  setBillFormData,
  handleBillSubmit,
  handleBillChange,
  billCategories,
  formatCurrency,
  formatDate,
}) => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Bill Payments</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage and pay your bills</p>
      </div>
      <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-primary">
        <Plus size={16} /> Pay Bill
      </button>
    </div>

    {showBillForm && (
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Pay New Bill</h3>
        <form onSubmit={handleBillSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Bill Name</label>
              <input type="text" name="name" className="form-input" value={billFormData.name} onChange={handleBillChange} required placeholder="Electricity Bill" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select name="category" className="form-input" value={billFormData.category} onChange={handleBillChange}>
                {billCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input type="number" step="0.01" name="amount" className="form-input" value={billFormData.amount} onChange={handleBillChange} required placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <CustomCalendar
                value={billFormData.dueDate ? fromLocalYYYYMMDD(billFormData.dueDate) : null}
                onChange={(date) => setBillFormData({ ...billFormData, dueDate: date ? toLocalYYYYMMDD(date) : '' })}
                placeholder="Select due date"
                minDate={new Date()}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary">Pay Bill</button>
            <button type="button" onClick={() => setShowBillForm(false)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    )}

    <div className="card">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Receipt size={20} />Bill Payment History</h3>
      {bills.length > 0 ? (
        <div className="transaction-list">
          {bills.map((bill) => (
            <div key={bill.id || bill._id} className="transaction-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{bill.description}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatDate(bill.createdAt || bill.paidDate || bill.date || new Date().toISOString())}</div>
              </div>
              <div style={{ fontWeight: '600', color: 'var(--error)' }}>-{formatCurrency(bill.amount)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Receipt size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No bill payments found</p>
        </div>
      )}
    </div>
  </>
);

export default BillsTab;
