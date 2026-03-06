import { Bell } from 'lucide-react';

const PreferencesTab = ({ preferencesData, handlePreferencesChange, handlePreferencesUpdate, loading }) => (
  <div>
    <h3 className="settings-section-title">
      <Bell size={20} />
      Preferences & Notifications
    </h3>

    <form onSubmit={handlePreferencesUpdate}>
      <div className="settings-grid-250 settings-preferences-grid">
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

      <div className="settings-panel settings-top-gap-lg">
        <h4 className="settings-panel-title">Notification Channels</h4>
        <div className="settings-list-grid">
          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">Email Notifications</div>
              <div className="settings-item-subtitle">Receive updates via email</div>
            </div>
            <input
              type="checkbox"
              name="email"
              checked={preferencesData.notifications.email}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
            />
          </div>

          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">SMS Notifications</div>
              <div className="settings-item-subtitle">Receive updates via SMS</div>
            </div>
            <input
              type="checkbox"
              name="sms"
              checked={preferencesData.notifications.sms}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
            />
          </div>

          <div className="settings-row-between">
            <div>
              <div className="settings-item-title">Push Notifications</div>
              <div className="settings-item-subtitle">Receive real-time alerts</div>
            </div>
            <input
              type="checkbox"
              name="push"
              checked={preferencesData.notifications.push}
              onChange={handlePreferencesChange}
              className="settings-checkbox"
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
