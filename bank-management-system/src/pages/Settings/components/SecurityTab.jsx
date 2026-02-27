import { Eye, EyeOff, Lock } from 'lucide-react';

const PasswordInput = ({ label, name, value, onChange, show, toggleShow }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        name={name}
        className="form-input"
        value={value}
        onChange={onChange}
        required
        minLength={name === 'currentPassword' ? undefined : '8'}
        style={{ paddingRight: '40px' }}
      />
      <button
        type="button"
        onClick={toggleShow}
        style={{
          position: 'absolute',
          right: '10px',
          top: '40px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          padding: '4px'
        }}
      >
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
    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Lock size={20} />
      Security Settings
    </h3>

    <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>Two-Factor Authentication</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
            Add an extra layer of security to your account
          </div>
        </div>
        <button
          onClick={handleTwoFactorToggle}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: twoFactorEnabled ? '#10b981' : '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        {twoFactorEnabled
          ? 'Your account is protected with two-factor authentication.'
          : 'Enable two-factor authentication for enhanced security.'}
      </div>
    </div>

    <form onSubmit={handlePasswordChange}>
      <h4 style={{ marginBottom: '1rem', fontWeight: '600' }}>Change Password</h4>
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
