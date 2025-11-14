import { Bell, Building2, Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import CustomCalendar from '../components/UI/CustomCalendar';
import { api } from '../utils/api';
import { toLocalYYYYMMDD } from '../utils/date';

const Settings = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  // Bank is fixed to BankPro for this application
  const [loading, setLoading] = useState(false);
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // No bank list loading: Bank is fixed to BankPro for this site

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
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0' }}
          >
            <User size={16} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`btn ${activeTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0' }}
          >
            <Building2 size={16} />
            Bank
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ marginRight: '1rem', borderRadius: '8px 8px 0 0' }}
          >
            <Lock size={16} />
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px 8px 0 0' }}
          >
            <Bell size={16} />
            Notifications
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

        {activeTab === 'security' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={20} />
              Change Password
            </h3>

            <form onSubmit={handlePasswordChange}>
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
                    minLength="6"
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
                    minLength="6"
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

              <button type="submit" className="btn btn-primary">
                Change Password
              </button>
            </form>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={20} />
              Notification Preferences
            </h3>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>Email Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive notifications via email</div>
                </div>
                <input type="checkbox" defaultChecked style={{ transform: 'scale(1.2)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>SMS Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive notifications via SMS</div>
                </div>
                <input type="checkbox" style={{ transform: 'scale(1.2)' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: '500' }}>Marketing Communications</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receive promotional offers and updates</div>
                </div>
                <input type="checkbox" style={{ transform: 'scale(1.2)' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
