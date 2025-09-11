import { Bell, Building2, Calendar, Eye, EyeOff, Lock, Mail, MapPin, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import CustomCalendar from '../components/UI/CustomCalendar';
import { api } from '../utils/api';

const Settings = ({ user, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    address: user.profile?.address?.street || '',
    dateOfBirth: user.profile?.dateOfBirth ? new Date(user.profile.dateOfBirth).toISOString().split('T')[0] : '',
    occupation: user.profile?.occupation || ''
  });
  const [bankData, setBankData] = useState({
    bankName: user.bankDetails?.bankName || 'BankPro',
    ifscCode: user.bankDetails?.ifscCode || 'BANK0001234',
    branchName: user.bankDetails?.branchName || 'Main Branch',
    selectedBank: user.bankDetails?.bankName === 'BankPro' ? 'bankpro' : ''
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

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const result = await api.users.getBanks();
        if (result.success) {
          setBanks(result.data);
        }
      } catch (error) {
        console.error('Error loading banks:', error);
      }
    };

    loadBanks();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\d{10}$/;
    if (profileData.phone && !phoneRegex.test(profileData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
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
        setMessage('Profile updated successfully!');
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    }

    setLoading(false);
  };

  const handleBankUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Get selected bank details
      const selectedBankData = banks.find(bank => bank.id === bankData.selectedBank) || {
        name: bankData.bankName,
        ifscCode: bankData.ifscCode
      };

      const updateData = {
        bankName: selectedBankData.name || bankData.bankName,
        ifscCode: selectedBankData.ifscCode || bankData.ifscCode,
        branchName: bankData.branchName
      };

      const result = await api.auth.updateDetails(updateData);

      if (result.success) {
        onUserUpdate(result.data);
        setMessage('Bank information updated successfully!');
      } else {
        setError(result.error || 'Failed to update bank information');
      }
    } catch (error) {
      setError('Failed to update bank information. Please try again.');
    }

    setLoading(false);
  };

  const handleBankChange = (e) => {
    const selectedBank = banks.find(bank => bank.id === e.target.value);
    if (selectedBank) {
      setBankData({
        ...bankData,
        selectedBank: e.target.value,
        bankName: selectedBank.name,
        ifscCode: selectedBank.ifscCode,
        branchName: selectedBank.branchName || 'Main Branch'
      });
    } else {
      setBankData({
        ...bankData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match!');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long!');
      setLoading(false);
      return;
    }

    try {
      const result = await api.auth.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (result.success) {
        setMessage('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Failed to change password. Please try again.');
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

            <form onSubmit={handleProfileUpdate}>
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
                  <CustomCalendar
                    value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null}
                    onChange={(date) => setProfileData({ ...profileData, dateOfBirth: date ? date.toISOString().split('T')[0] : '' })}
                    placeholder="Select date of birth"
                    maxDate={new Date()}
                  />
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

            <form onSubmit={handleBankUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Your Bank</label>
                  <select
                    name="selectedBank"
                    className="form-input"
                    value={bankData.selectedBank}
                    onChange={handleBankChange}
                    required
                  >
                    {banks.length > 0 ? (
                      banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.logo} {bank.name}
                        </option>
                      ))
                    ) : (
                      <option value="bankpro">🏦 BankPro</option>
                    )}
                  </select>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    Choose the bank where you hold your account
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    className="form-input"
                    value={bankData.bankName}
                    onChange={handleBankChange}
                    required
                    readOnly
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    name="ifscCode"
                    className="form-input"
                    value={bankData.ifscCode}
                    onChange={handleBankChange}
                    required
                    readOnly
                    style={{ background: 'var(--bg-tertiary)' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    name="branchName"
                    className="form-input"
                    value={bankData.branchName}
                    onChange={handleBankChange}
                    placeholder="Enter branch name"
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

              <div style={{
                padding: '1rem',
                background: 'var(--info-bg, #e3f2fd)',
                border: '1px solid var(--info-border, #2196f3)',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <strong>💡 Important:</strong> Your bank information is used for transfers and transactions.
                Make sure the details are accurate for successful transactions.
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Updating...' : 'Update Bank Information'}
              </button>
            </form>
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
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                      top: '50%',
                      transform: 'translateY(-50%)',
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
