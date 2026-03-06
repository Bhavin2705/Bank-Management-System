import { Eye, EyeOff, Lock } from 'lucide-react';

const PasswordInput = ({ label, name, value, onChange, show, toggleShow }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="settings-input-icon-wrap">
      <input
        type={show ? 'text' : 'password'}
        name={name}
        className="form-input settings-input-icon-pad"
        value={value}
        onChange={onChange}
        required
        minLength={name === 'currentPassword' ? undefined : '8'}
      />
      <button type="button" onClick={toggleShow} className="settings-password-toggle">
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const SecurityTab = ({
  loading,
  twoFactorEnabled,
  handleTwoFactorToggle,
  handlePasswordChange,
  passwordData,
  handlePasswordChangeInput,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword
}) => (
  <div>
    <h3 className="settings-section-title">
      <Lock size={20} />
      Security Settings
    </h3>

    <div className="settings-security-panel settings-top-gap-lg">
      <div className="settings-row-between settings-security-header">
        <div>
          <div className="settings-security-title">Two-Factor Authentication</div>
          <div className="settings-security-subtitle">Add an extra layer of security to your account</div>
        </div>
        <button
          onClick={handleTwoFactorToggle}
          disabled={loading}
          className={`settings-2fa-btn ${twoFactorEnabled ? 'is-enabled' : 'is-disabled'}`}
        >
          {twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div className="settings-security-note">
        {twoFactorEnabled
          ? 'Your account is protected with two-factor authentication.'
          : 'Enable two-factor authentication for enhanced security.'}
      </div>
    </div>

    <form onSubmit={handlePasswordChange}>
      <h4 className="settings-password-title">Change Password</h4>
      <PasswordInput
        label="Current Password"
        name="currentPassword"
        value={passwordData.currentPassword}
        onChange={handlePasswordChangeInput}
        show={showCurrentPassword}
        toggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
      />
      <PasswordInput
        label="New Password"
        name="newPassword"
        value={passwordData.newPassword}
        onChange={handlePasswordChangeInput}
        show={showNewPassword}
        toggleShow={() => setShowNewPassword(!showNewPassword)}
      />
      <PasswordInput
        label="Confirm New Password"
        name="confirmPassword"
        value={passwordData.confirmPassword}
        onChange={handlePasswordChangeInput}
        show={showConfirmPassword}
        toggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
      />

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  </div>
);

export default SecurityTab;
