import { Plus, Repeat, Trash2, User } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';

const getWarningClass = (balanceWarning) => (
  balanceWarning.includes('INSUFFICIENT')
    ? 'recurring-warning recurring-warning-insufficient'
    : 'recurring-warning recurring-warning-high'
);

const RecurringTab = ({
  recurringPayments,
  showRecurringForm,
  setShowRecurringForm,
  recurringFormData,
  setRecurringFormData,
  handleRecurringAmountChange,
  handleRecurringSubmit,
  toggleRecurringStatus,
  deleteRecurringPayment,
  balanceWarning,
  formatCurrency,
  getFrequencyLabel,
  monthlyTotal,
  submittingRecurring = false,
  updatingRecurringId = null,
  deletingRecurringId = null,
}) => (
  <>
    <div className="recurring-header recurring-header-wrap">
      <h1 className="payments-page-title">Recurring Payments</h1>
      <p className="payments-page-subtitle">Set up automatic recurring payments and standing orders</p>
    </div>

    <div className="dashboard-grid recurring-stats-grid">
      <div className="stat-card">
        <div className="recurring-stats-row">
          <div>
            <div className="stat-value">{recurringPayments.length}</div>
            <div className="stat-label">Total Payments</div>
          </div>
          <Repeat size={32} className="recurring-stats-icon recurring-stats-icon-repeat" />
        </div>
      </div>
      <div className="stat-card">
        <div className="recurring-stats-row">
          <div>
            <div className="stat-value">{recurringPayments.filter((p) => p.status === 'active').length}</div>
            <div className="stat-label">Active Payments</div>
          </div>
          <User size={32} className="recurring-stats-icon recurring-stats-icon-user" />
        </div>
      </div>
      <div className="stat-card">
        <div className="recurring-stats-row">
          <div>
            <div className="stat-value">{formatCurrency(monthlyTotal)}</div>
            <div className="stat-label">Monthly Total</div>
          </div>
          <User size={32} className="recurring-stats-icon recurring-stats-icon-user" />
        </div>
      </div>
    </div>

    <div className="recurring-add-wrap">
      <button
        onClick={() => setShowRecurringForm(!showRecurringForm)}
        className="btn btn-primary recurring-add-btn"
        disabled={submittingRecurring}
      >
        <Plus size={20} />{submittingRecurring ? 'Processing...' : (showRecurringForm ? 'Cancel' : 'Add Recurring Payment')}
      </button>
    </div>

    {showRecurringForm && (
      <div className="card recurring-form-card">
        <h3 className="payments-section-title">Add Recurring Payment</h3>
        <form onSubmit={handleRecurringSubmit}>
          <div className="form-group">
            <label htmlFor="recipientName" className="form-label">Recipient Name</label>
            <input id="recipientName" type="text" name="recipientName" className="form-input" value={recurringFormData.recipientName} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientName: e.target.value })} placeholder="Recipient name" required />
          </div>
          <div className="form-group">
            <label htmlFor="recipientAccount" className="form-label">Recipient Account Number</label>
            <input id="recipientAccount" type="text" name="recipientAccount" className="form-input" value={recurringFormData.recipientAccount} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientAccount: e.target.value })} placeholder="Account number" />
          </div>
          <div className="form-group">
            <label htmlFor="recipientPhone" className="form-label">Recipient Phone Number</label>
            <input id="recipientPhone" type="text" name="recipientPhone" className="form-input" value={recurringFormData.recipientPhone} onChange={(e) => setRecurringFormData({ ...recurringFormData, recipientPhone: e.target.value })} placeholder="Phone number" />
          </div>
          <div className="form-group">
            <label htmlFor="amount" className="form-label">Amount</label>
            <input id="amount" type="number" name="amount" step="0.01" className="form-input" value={recurringFormData.amount} onChange={handleRecurringAmountChange} placeholder="0.00" required />
          </div>
          <div className="form-group">
            <label htmlFor="startDate" className="form-label">Start Date</label>
            <CustomCalendar value={recurringFormData.startDate} onChange={(date) => setRecurringFormData({ ...recurringFormData, startDate: date })} placeholder="Select start date" minDate={new Date()} compact={true} />
          </div>
          <div className="form-group">
            <label htmlFor="frequency" className="form-label">Frequency</label>
            <select id="frequency" name="frequency" className="form-input" value={recurringFormData.frequency} onChange={(e) => setRecurringFormData({ ...recurringFormData, frequency: e.target.value })} required>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <input id="description" type="text" name="description" className="form-input" value={recurringFormData.description} onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })} placeholder="Payment description" required />
          </div>

          {balanceWarning && <div className={getWarningClass(balanceWarning)}>{balanceWarning}</div>}

          <button type="submit" className="btn btn-primary" disabled={balanceWarning.includes('INSUFFICIENT') || submittingRecurring}>
            {submittingRecurring ? 'Creating Recurring Payment...' : 'Create Recurring Payment'}
          </button>
        </form>
      </div>
    )}

    <div className="card">
      <h3 className="payments-section-title">Your Recurring Payments</h3>
      {recurringPayments.length === 0 ? (
        <div className="recurring-empty-state">
          <Repeat size={48} className="recurring-empty-icon" />
          <div>No recurring payments set up</div>
          <small>Create your first recurring payment to get started</small>
        </div>
      ) : (
        <div className="transaction-list">
          {recurringPayments.map((payment) => {
            const isUpdating = updatingRecurringId === payment._id;
            const isDeleting = deletingRecurringId === payment._id;
            return (
              <div key={payment._id} className="transaction-item">
                <div className="recurring-item-main">
                  <div className={`recurring-item-icon-wrap ${payment.status === 'active' ? 'is-active' : 'is-inactive'}`}>
                    <Repeat size={20} className={`recurring-item-icon ${payment.status === 'active' ? 'is-active' : 'is-inactive'}`} />
                  </div>
                  <div className="recurring-item-details">
                    <div className="recurring-item-description">{payment.description}</div>
                    <div className="recurring-item-meta">To: {payment.beneficiaryName}{payment.toAccount ? ` (A/C: ${payment.toAccount})` : ''}</div>
                    <div className="recurring-item-meta">{getFrequencyLabel(payment.frequency)}</div>
                    <div className={`recurring-item-status ${payment.status === 'active' ? 'is-active' : 'is-inactive'}`}>{payment.status}</div>
                  </div>
                </div>
                <div className="recurring-item-actions-wrap">
                  <div className="recurring-item-amount">{formatCurrency(payment.amount)}</div>
                  <div className="recurring-item-actions">
                    <button
                      onClick={() => toggleRecurringStatus(payment._id)}
                      className={`recurring-action-btn ${payment.status === 'active' ? 'is-pause' : 'is-resume'}`}
                      aria-label={payment.status === 'active' ? 'Pause payment' : 'Resume payment'}
                      disabled={isUpdating || isDeleting}
                    >
                      {isUpdating ? 'Updating...' : (payment.status === 'active' ? 'Pause' : 'Resume')}
                    </button>
                    <button
                      onClick={() => deleteRecurringPayment(payment._id)}
                      className="recurring-action-btn recurring-action-delete"
                      aria-label="Delete payment"
                      disabled={isUpdating || isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </>
);

export default RecurringTab;
