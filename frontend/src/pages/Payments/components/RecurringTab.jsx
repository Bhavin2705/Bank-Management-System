import { Plus, Repeat, Trash2, User } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';

const warningStyles = (balanceWarning) => ({
  padding: '1rem',
  marginBottom: '1rem',
  borderRadius: '6px',
  background: balanceWarning.includes('INSUFFICIENT') ? 'rgba(220, 53, 69, 0.14)' : 'rgba(255, 193, 7, 0.14)',
  border: `1px solid ${balanceWarning.includes('INSUFFICIENT') ? 'rgba(220, 53, 69, 0.45)' : 'rgba(255, 193, 7, 0.5)'}`,
  color: balanceWarning.includes('INSUFFICIENT') ? 'var(--error)' : '#b78900',
  fontSize: '0.9rem',
});

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
    <div className="recurring-header" style={{ marginBottom: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Recurring Payments</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Set up automatic recurring payments and standing orders</p>
    </div>

    <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-value">{recurringPayments.length}</div>
            <div className="stat-label">Total Payments</div>
          </div>
          <Repeat size={32} style={{ color: '#667eea' }} />
        </div>
      </div>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-value">{recurringPayments.filter((p) => p.status === 'active').length}</div>
            <div className="stat-label">Active Payments</div>
          </div>
          <User size={32} style={{ color: '#ffc107' }} />
        </div>
      </div>
      <div className="stat-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-value">{formatCurrency(monthlyTotal)}</div>
            <div className="stat-label">Monthly Total</div>
          </div>
          <User size={32} style={{ color: '#ffc107' }} />
        </div>
      </div>
    </div>

    <div style={{ marginBottom: '2rem' }}>
      <button
        onClick={() => setShowRecurringForm(!showRecurringForm)}
        className="btn btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        disabled={submittingRecurring}
      >
        <Plus size={20} />{submittingRecurring ? 'Processing...' : (showRecurringForm ? 'Cancel' : 'Add Recurring Payment')}
      </button>
    </div>

    {showRecurringForm && (
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Add Recurring Payment</h3>
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

          {balanceWarning && <div style={warningStyles(balanceWarning)}>{balanceWarning}</div>}

          <button type="submit" className="btn btn-primary" disabled={balanceWarning.includes('INSUFFICIENT') || submittingRecurring}>
            {submittingRecurring ? 'Creating Recurring Payment...' : 'Create Recurring Payment'}
          </button>
        </form>
      </div>
    )}

    <div className="card">
      <h3 style={{ marginBottom: '1.5rem' }}>Your Recurring Payments</h3>
      {recurringPayments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          <Repeat size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{ padding: '12px', borderRadius: '50%', background: payment.status === 'active' ? 'rgba(40, 167, 69, 0.14)' : 'rgba(108, 117, 125, 0.16)', border: `2px solid ${payment.status === 'active' ? 'var(--success)' : 'var(--text-secondary)'}` }}>
                  <Repeat size={20} style={{ color: payment.status === 'active' ? 'var(--success)' : 'var(--text-secondary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{payment.description}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To: {payment.beneficiaryName}{payment.toAccount ? ` (A/C: ${payment.toAccount})` : ''}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{getFrequencyLabel(payment.frequency)}</div>
                  <div style={{ fontSize: '0.75rem', color: payment.status === 'active' ? 'var(--success)' : 'var(--error)', fontWeight: '500', textTransform: 'uppercase' }}>{payment.status}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--success)', marginBottom: '0.5rem' }}>{formatCurrency(payment.amount)}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => toggleRecurringStatus(payment._id)} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', background: payment.status === 'active' ? 'var(--error)' : 'var(--success)', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label={payment.status === 'active' ? 'Pause payment' : 'Resume payment'} disabled={isUpdating || isDeleting}>{isUpdating ? 'Updating...' : (payment.status === 'active' ? 'Pause' : 'Resume')}</button>
                  <button onClick={() => deleteRecurringPayment(payment._id)} style={{ padding: '0.25rem 0.5rem', border: 'none', borderRadius: '4px', background: 'var(--error)', color: 'white', cursor: 'pointer', fontSize: '0.8rem' }} aria-label="Delete payment" disabled={isUpdating || isDeleting}>{isDeleting ? 'Deleting...' : <Trash2 size={14} />}</button>
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

