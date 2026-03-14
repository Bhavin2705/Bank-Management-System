import { Plus, Receipt } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';
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
  submittingBill = false,
  billBalanceWarning = ''
}) => (
  <>
    <div className="bills-header">
      <div>
        <h1 className="payments-page-title">Bill Payments</h1>
        <p className="payments-page-subtitle">Manage and pay your bills</p>
      </div>
      <button onClick={() => setShowBillForm(!showBillForm)} className="btn btn-primary" disabled={submittingBill}>
        <Plus size={16} /> {submittingBill ? 'Processing...' : 'Pay Bill'}
      </button>
    </div>

    {showBillForm && (
      <div className="card bills-form-card">
        <h3 className="payments-section-title">Pay New Bill</h3>
        <form onSubmit={handleBillSubmit}>
          <div className="bills-form-grid">
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
          <div className="bills-form-actions">
            <button type="submit" className="btn btn-primary" disabled={submittingBill}>
              {submittingBill ? 'Paying Bill...' : 'Pay Bill'}
            </button>
            <button type="button" onClick={() => setShowBillForm(false)} className="btn btn-secondary" disabled={submittingBill}>Cancel</button>
          </div>
          {billBalanceWarning && (
            <div className="bills-balance-warning">{billBalanceWarning}</div>
          )}
        </form>
      </div>
    )}

    <div className="card">
      <h3 className="payments-section-title payments-history-title"><Receipt size={20} />Bill Payment History</h3>
      {bills.length > 0 ? (
        <div className="transaction-list">
          {bills.map((bill) => (
            <div key={bill.id || bill._id} className="transaction-item">
              <div className="payments-transaction-main">
                <div className="payments-transaction-description">{bill.description}</div>
                <div className="payments-transaction-date">
                  {formatDate(bill.createdAt || bill.paidDate || bill.date || new Date().toISOString())}
                  {bill.dueDate && ` • Due ${formatDate(bill.dueDate)}`}
                </div>
              </div>
              <div className="payments-transaction-status">
                <span className={`payments-status-badge is-${bill.status || bill.paymentStatus || 'pending'}`}>
                  {(bill.status || bill.paymentStatus || 'pending').replace('_', ' ')}
                </span>
              </div>
              <div className="payments-transaction-amount">-{formatCurrency(bill.amount)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="payments-empty-state">
          <Receipt size={48} className="payments-empty-icon" />
          <p>No bill payments found</p>
        </div>
      )}
    </div>
  </>
);

export default BillsTab;
