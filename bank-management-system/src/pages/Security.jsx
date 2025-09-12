import { Eye, EyeOff, Key, Lock, Shield } from 'lucide-react';
import { useState } from 'react';
import { useNotification } from '../components/NotificationProvider';

const Security = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('password');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [securityQuestions, setSecurityQuestions] = useState({
    question1: '',
    answer1: '',
    question2: '',
    answer2: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    // In a real app, you'd verify the current password against the stored hash
    // For demo purposes, we'll just update it
    const users = JSON.parse(localStorage.getItem('bank_users') || '[]');
    const userIndex = users.findIndex(u => u.id === user.id);

    if (userIndex !== -1) {
      users[userIndex].password = passwordForm.newPassword;
      localStorage.setItem('bank_users', JSON.stringify(users));

      showSuccess('Password updated successfully! 🔒');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  const handlePinChange = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
      showError('PIN must be exactly 4 digits');
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      showError('New PINs do not match');
      return;
    }

    // Store PIN in localStorage (in real app, this would be encrypted)
    localStorage.setItem(`user_pin_${user.id}`, pinForm.newPin);

    showSuccess('PIN updated successfully! 🔑');
    setPinForm({
      currentPin: '',
      newPin: '',
      confirmPin: ''
    });
  };

  const handleSecurityQuestions = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!securityQuestions.question1 || !securityQuestions.answer1) {
      showError('Please fill in at least one security question');
      return;
    }

    localStorage.setItem(`security_questions_${user.id}`, JSON.stringify(securityQuestions));
    showSuccess('Security questions updated successfully! 🛡️');
  };

  const getLoginHistory = () => {
    const history = JSON.parse(localStorage.getItem(`login_history_${user.id}`) || '[]');
    return history.slice(-10); // Last 10 logins
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loginHistory = getLoginHistory();

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Account Security
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your account security settings and preferences
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">Strong</div>
              <div className="stat-label">Password Strength</div>
            </div>
            <Shield size={32} style={{ color: '#28a745' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">{loginHistory.length}</div>
              <div className="stat-label">Recent Logins</div>
            </div>
            <Lock size={32} style={{ color: '#667eea' }} />
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="stat-value">Active</div>
              <div className="stat-label">Account Status</div>
            </div>
            <Key size={32} style={{ color: '#28a745' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button
              onClick={() => setActiveTab('password')}
              style={{
                padding: '1rem',
                border: 'none',
                background: activeTab === 'password' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'password' ? 'white' : 'var(--text-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              style={{
                padding: '1rem',
                border: 'none',
                background: activeTab === 'pin' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'pin' ? 'white' : 'var(--text-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Change PIN
            </button>
            <button
              onClick={() => setActiveTab('security')}
              style={{
                padding: '1rem',
                border: 'none',
                background: activeTab === 'security' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'security' ? 'white' : 'var(--text-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Security Questions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              style={{
                padding: '1rem',
                border: 'none',
                background: activeTab === 'history' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'history' ? 'white' : 'var(--text-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Login History
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange}>
            <h3 style={{ marginBottom: '1.5rem' }}>Change Password</h3>

            <div className="form-group">
              <label className="form-label">Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
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
                    cursor: 'pointer'
                  }}
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
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
                    cursor: 'pointer'
                  }}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
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
                    cursor: 'pointer'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              Update Password
            </button>
          </form>
        )}

        {activeTab === 'pin' && (
          <form onSubmit={handlePinChange}>
            <h3 style={{ marginBottom: '1.5rem' }}>Change PIN</h3>

            <div className="form-group">
              <label className="form-label">Current PIN</label>
              <input
                type="password"
                className="form-input"
                value={pinForm.currentPin}
                onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                maxLength="4"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New PIN (4 digits)</label>
              <input
                type="password"
                className="form-input"
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                maxLength="4"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New PIN</label>
              <input
                type="password"
                className="form-input"
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                maxLength="4"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Update PIN
            </button>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handleSecurityQuestions}>
            <h3 style={{ marginBottom: '1.5rem' }}>Security Questions</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Set up security questions to help recover your account if needed.
            </p>

            <div className="form-group">
              <label className="form-label">Security Question 1</label>
              <select
                className="form-input"
                value={securityQuestions.question1}
                onChange={(e) => setSecurityQuestions({ ...securityQuestions, question1: e.target.value })}
              >
                <option value="">Select a question</option>
                <option value="What was your first pet's name?">What was your first pet's name?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What was your first car?">What was your first car?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Answer 1</label>
              <input
                type="text"
                className="form-input"
                value={securityQuestions.answer1}
                onChange={(e) => setSecurityQuestions({ ...securityQuestions, answer1: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Security Question 2</label>
              <select
                className="form-input"
                value={securityQuestions.question2}
                onChange={(e) => setSecurityQuestions({ ...securityQuestions, question2: e.target.value })}
              >
                <option value="">Select a question</option>
                <option value="What was your first pet's name?">What was your first pet's name?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="What was your first car?">What was your first car?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Answer 2</label>
              <input
                type="text"
                className="form-input"
                value={securityQuestions.answer2}
                onChange={(e) => setSecurityQuestions({ ...securityQuestions, answer2: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Save Security Questions
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div>
            <h3 style={{ marginBottom: '1.5rem' }}>Login History</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Your recent login activity
            </p>

            {loginHistory.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-secondary)',
                fontStyle: 'italic'
              }}>
                No login history available
              </div>
            ) : (
              <div className="transaction-list">
                {loginHistory.map((login, index) => (
                  <div key={index} className="transaction-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        padding: '8px',
                        borderRadius: '50%',
                        background: 'var(--bg-tertiary)'
                      }}>
                        <Shield size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '500' }}>Login</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatDate(login.timestamp)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {login.ip || 'Local'} • {login.device || 'Web Browser'}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: '#28a745',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      SUCCESS
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;
