import { Eye, EyeOff } from 'lucide-react';

const AddCardForm = ({ formData, setFormData, showPin, setShowPin, handleSubmit, isSubmitting = false }) => (
  <div className="card" style={{ marginBottom: '2rem' }}>
    <h3 style={{ marginBottom: '1.5rem' }}>Add New Card</h3>
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Card Type</label>
        <select
          name="cardType"
          className="form-input"
          value={formData.cardType}
          onChange={(e) => setFormData({ ...formData, cardType: e.target.value })}
          required
        >
          <option value="debit">Debit Card</option>
          <option value="credit">Credit Card</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Card Name</label>
        <input
          type="text"
          name="cardName"
          className="form-input"
          value={formData.cardName}
          onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
          placeholder="Enter card name"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Set 4-Digit PIN</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPin ? 'text' : 'password'}
            name="pin"
            className="form-input"
            value={formData.pin}
            onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
            placeholder="Enter 4-digit PIN"
            maxLength="4"
            inputMode="numeric"
            required
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '40px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
            title={showPin ? 'Hide PIN' : 'Show PIN'}
            disabled={isSubmitting}
          >
            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Card...' : 'Create Card'}
      </button>
    </form>
  </div>
);

export default AddCardForm;
