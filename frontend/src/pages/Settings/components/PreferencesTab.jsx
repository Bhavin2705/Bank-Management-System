import { Bell } from 'lucide-react';

const PreferencesTab = ({ preferencesData, handlePreferencesChange, handlePreferencesUpdate, loading }) => (
  <div>
    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Bell size={20} />
      Preferences & Notifications
    </h3>

    <form onSubmit={handlePreferencesUpdate}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div className="form-group">
          <label className="form-label">Currency</label>
          <select name="currency" className="form-input" value={preferencesData.currency} onChange={handlePreferencesChange}>
            <option value="INR">INR (Rs)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (Euro)</option>
            <option value="GBP">GBP (Pound)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Language</label>
          <select name="language" className="form-input" value={preferencesData.language} onChange={handlePreferencesChange}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Theme</label>
          <select name="theme" className="form-input" value={preferencesData.theme} onChange={handlePreferencesChange}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div
        style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      >
        <h4 style={{ marginBottom: '1rem', fontWeight: '600' }}>Notification Channels</h4>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500' }}>Email Notifications</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive updates via email</div>
            </div>
            <input
              type="checkbox"
              name="email"
              checked={preferencesData.notifications.email}
              onChange={handlePreferencesChange}
              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500' }}>SMS Notifications</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive updates via SMS</div>
            </div>
            <input
              type="checkbox"
              name="sms"
              checked={preferencesData.notifications.sms}
              onChange={handlePreferencesChange}
              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '500' }}>Push Notifications</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive real-time alerts</div>
            </div>
            <input
              type="checkbox"
              name="push"
              checked={preferencesData.notifications.push}
              onChange={handlePreferencesChange}
              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  </div>
);

export default PreferencesTab;
