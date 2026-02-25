import { Bell, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, User, CreditCard, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import CustomCalendar from '../components/UI/CustomCalendar';
import { api } from '../utils/api';
import { toLocalYYYYMMDD } from '../utils/date';

const Settings = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [sessions, setSessions] = useState(null);
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.profile?.address?.street || '',
    dateOfBirth: user.profile?.dateOfBirth ? toLocalYYYYMMDD(new Date(user.profile.dateOfBirth)) : '',
    occupation: user.profile?.occupation || ''
  });
  const [bankData, setBankData] = useState({
    bankName: 'BankPro',
    ifscCode: 'BANK0001234',
    branchName: user.bankDetails?.branchName || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferencesData, setPreferencesData] = useState({
    currency: user.preferences?.currency || 'INR',
    language: user.preferences?.language || 'en',
    theme: user.preferences?.theme || 'light',
    notifications: {
      email: user.preferences?.notifications?.email !== false,
      sms: user.preferences?.notifications?.sms !== false,
      push: user.preferences?.notifications?.push !== false
    }
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.security?.twoFactorEnabled || false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Load linked accounts and sessions on mount
  useEffect(() => {
    const loadAdditionalData = async () => {
      try {
        const [accountsRes, sessionsRes] = await Promise.all([
          api.settings.getLinkedAccounts(),
          api.settings.getSessions()
        ]);
        if (accountsRes.success) setLinkedAccounts(accountsRes.data);
        if (sessionsRes.success) setSessions(sessionsRes.data);
      } catch (err) {
        console.error('Error loading additional data:', err);
      }
    };
    loadAdditionalData();
  }, []);

  const handleFormKeyDown = (e) => {
    // Prevent form submission on Enter key press for all inputs except submit buttons
    if (e.key === 'Enter') {
      const target = e.target;
      // Only allow Enter on submit buttons and textareas
      if (target.type !== 'submit' && target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      showError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10}$/;
    if (profileData.phone && !phoneRegex.test(profileData.phone.replace(/\D/g, ''))) {
      showError('Please enter a valid 10-digit phone number');
      setLoading(false);
      return;
    }

    try {
      const updateData = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        dateOfBirth: profileData.dateOfBirth,
        occupation: profileData.occupation
      };

      const result = await api.auth.updateDetails(updateData);

      if (result.success) {
        onUserUpdate(result.data);
        showSuccess('Profile updated successfully! 🎉');
      } else {
        showError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showError('Failed to update profile. Please try again.');
    }

    setLoading(false);
  };

  // Bank updates are not allowed from the user settings (fixed to BankPro)

  // No-op: branch name is not editable by users in this app

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match!');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Password must be at least 8 characters long!');
      setLoading(false);
      return;
    }

    try {
      const result = await api.auth.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (result.success) {
        showSuccess('Password changed successfully! 🔒');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showError(result.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      showError('Failed to change password. Please try again.');
    }

    setLoading(false);
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await api.settings.updatePreferences(preferencesData);
      if (result.success) {
        showSuccess('Preferences updated successfully! ✨');
      } else {
        showError(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      console.error('Preferences update error:', error);
      showError('Failed to update preferences. Please try again.');
    }
    setLoading(false);
  };

  const handleTwoFactorToggle = async () => {
    setLoading(true);
    try {
      const result = await api.settings.updateTwoFactor({ enable: !twoFactorEnabled });
      if (result.success) {
        setTwoFactorEnabled(!twoFactorEnabled);
        showSuccess(`Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'} successfully! 🔐`);
      } else {
        showError(result.error || 'Failed to update two-factor settings');
      }
    } catch (error) {
      console.error('Two-factor toggle error:', error);
      showError('Failed to update two-factor settings. Please try again.');
    }
    setLoading(false);
  };

  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChangeInput = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setPreferencesData({
        ...preferencesData,
        notifications: {
          ...preferencesData.notifications,
          [name]: checked
        }
      });
    } else {
      setPreferencesData({
        ...preferencesData,
        [name]: value
      });
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Account Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your account preferences and security
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <User size={16} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`btn ${activeTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <Building2 size={16} />
            Bank
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <Lock size={16} />
            Security
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`btn ${activeTab === 'preferences' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <Bell size={16} />
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <CreditCard size={16} />
            Accounts
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`btn ${activeTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0', marginBottom: '0.5rem' }}
          >
            <Clock size={16} />
            Sessions
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {message && (
          <div className="success-message" style={{ marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} />
              Profile Information
            </h3>

            <form onSubmit={handleProfileUpdate} onKeyDown={handleFormKeyDown}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      required
                      style={{ paddingRight: '40px' }}
                    />
                    <Mail size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="Enter 10-digit phone number"
                      style={{ paddingRight: '40px' }}
                    />
                    <Phone size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <div
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                  >
                    <CustomCalendar
                      value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null}
                      onChange={(date) => {
                        setProfileData({ ...profileData, dateOfBirth: date ? toLocalYYYYMMDD(date) : '' });
                      }}
                      placeholder="Select date of birth (DD/MM/YYYY)"
                      maxDate={new Date()}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input
                    type="text"
                    name="occupation"
                    className="form-input"
                    value={profileData.occupation}
                    onChange={handleProfileChange}
                    placeholder="Enter your occupation"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="address"
                      className="form-input"
                      value={profileData.address}
                      onChange={handleProfileChange}
                      placeholder="Enter your address"
                      style={{ paddingRight: '40px' }}
                    />
                    <MapPin size={18} style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={user.accountNumber || 'Not assigned'}
                  disabled
                  style={{ background: 'var(--bg-tertiary)' }}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Update Profile
              </button>
            </form>
          </div>
        )}

        {activeTab === 'bank' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} />
              Bank Information
            </h3>

            <div onKeyDown={handleFormKeyDown}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Bank</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="bankName"
                      className="form-input"
                      value={bankData.bankName || user.bankDetails?.bankName || 'BankPro'}
                      readOnly={true}
                      style={{ background: 'var(--bg-tertiary)', marginRight: '0.5rem' }}
                    />
                    <input
                      type="text"
                      name="ifscCode"
                      className="form-input"
                      value={bankData.ifscCode || user.bankDetails?.ifscCode || ''}
                      readOnly={true}
                      style={{ background: 'var(--bg-tertiary)' }}
                    />
                  </div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    Bank cannot be changed on this site. For bank account changes contact support.
                  </small>
                </div>

                {/* Bank name and IFSC are fixed to BankPro and read-only */}

                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    className="form-input"
                    value={bankData.branchName || user.bankDetails?.branchName || ''}
                    readOnly={true}
                    disabled={true}
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={user.accountNumber || 'Not assigned'}
                  disabled
                  style={{ background: 'var(--bg-tertiary)' }}
                />
              </div>

              <div className="info-box">
                <strong>💡 Important:</strong> Your bank information is used for transfers and transactions.
                Make sure the details are accurate for successful transactions.
              </div>

            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} />
              Preferences & Notifications
            </h3>

            <form onSubmit={handlePreferencesUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select
                    name="currency"
                    className="form-input"
                    value={preferencesData.currency}
                    onChange={handlePreferencesChange}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select
                    name="language"
                    className="form-input"
                    value={preferencesData.language}
                    onChange={handlePreferencesChange}
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Theme</label>
                  <select
                    name="theme"
                    className="form-input"
                    value={preferencesData.theme}
                    onChange={handlePreferencesChange}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
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
        )}

        {activeTab === 'security' && (
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
                  {twoFactorEnabled ? 'Enabled ✓' : 'Disabled'}
                </button>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                {twoFactorEnabled ? '✓ Your account is protected with two-factor authentication.' : 'Enable two-factor authentication for enhanced security.'}
              </div>
            </div>

            <form onSubmit={handlePasswordChange}>
              <h4 style={{ marginBottom: '1rem', fontWeight: '600' }}>Change Password</h4>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    className="form-input"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChangeInput}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    className="form-input"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChangeInput}
                    required
                    minLength="8"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
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
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    className="form-input"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChangeInput}
                    required
                    minLength="8"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} />
              Linked Accounts & Cards
            </h3>

            {linkedAccounts && linkedAccounts.length > 0 ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {linkedAccounts.map((card) => (
                  <div key={card._id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: '600' }}>{card.cardHolder || 'Card'}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                          {card.cardType || 'Credit Card'} • ••••{card.cardNumber?.slice(-4)}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          Expires: {card.expiryMonth}/{card.expiryYear}
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: card.status === 'active' ? '#10b981' : '#ef4444',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {card.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  No linked cards found. Add a card from the Cards section.
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} />
              Account & Session Information
            </h3>

            {sessions ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Created</div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                    {new Date(sessions.accountCreated).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Account Age</div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                    {sessions.accountAge} days
                  </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Login</div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                    {sessions.lastLogin ? new Date(sessions.lastLogin).toLocaleDateString() : 'First login'}
                  </div>
                </div>

                <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Current Session</div>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                    Active Now
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Loading session information...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
