import { Eye, EyeOff, Key, Lock, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import api from '../utils/api';

const Security = ({ user }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('password');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
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
  const [cards, setCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
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

    // Use backend API for password update
    api.auth.updatePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
      .then((result) => {
        if (result.success) {
          showSuccess(result.message || 'Password updated successfully! 🔒');
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        } else {
          showError(result.error || 'Password update failed.');
        }
      })
      .catch((err) => {
        showError(err.message || 'Password update failed.');
      });
  };

  const handlePinChange = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!selectedCardId) {
      showError('Please select a card to change its PIN.');
      return;
    }

    // Prevent PIN changes on locked cards
    const targetCard = cards.find((c) => String(c.id) === selectedCardId);
    if (targetCard && targetCard.status === 'locked') {
      showError('The selected card is locked. Unlock the card before changing its PIN.');
      return;
    }

    if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
      showError('PIN must be exactly 4 digits');
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      showError('New PINs do not match');
      return;
    }

    // Call backend to update PIN securely
    api.cards.updatePin(selectedCardId, { currentPin: pinForm.currentPin, newPin: pinForm.newPin })
      .then((res) => {
        if (res.success) {
          showSuccess(res.message || 'PIN updated successfully for the selected card! 🔑');
          setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
          // reload cards to reflect any status changes
          loadCards();
        } else {
          showError(res.error || 'Failed to update PIN');
        }
      })
      .catch((err) => {
        console.error('Update PIN error:', err);
        showError(err.message || 'Failed to update PIN');
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

  // Load user's cards so they can pick which card's PIN to change
  const loadCards = () => {
    api.cards.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCards(res.data);
          if (res.data.length > 0 && !selectedCardId) setSelectedCardId(String(res.data[0].id));
        } else {
          setCards([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load cards:', err);
        setCards([]);
      });
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

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
          <div className="tab-buttons">
            <button
              onClick={() => setActiveTab('password')}
              className={"tab-btn" + (activeTab === 'password' ? ' active' : '')}
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('pin')}
              className={"tab-btn" + (activeTab === 'pin' ? ' active' : '')}
            >
              Change PIN
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={"tab-btn" + (activeTab === 'security' ? ' active' : '')}
            >
              Security Questions
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={"tab-btn" + (activeTab === 'history' ? ' active' : '')}
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
              <label className="form-label">Select Card</label>
              {cards.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No cards found. Add a card first.</div>
              ) : (
                <div className="card-selection">
                  {cards.map((c, idx) => (
                    <div
                      key={c.id}
                      className={"card-tile" + (String(c.id) === selectedCardId ? ' selected' : '')}
                    >
                      <div className="card-index">{idx + 1}</div>
                      <div className="card-meta">
                        <div className="card-name">{c.cardName}</div>
                        <div className="card-last4">**** {c.cardNumber.slice(-4)}</div>
                      </div>
                      <div className="card-choose">
                        <button
                          type="button"
                          className="choose-btn"
                          onClick={() => setSelectedCardId(String(c.id))}
                          disabled={c.status === 'locked'}
                          title={c.status === 'locked' ? 'This card is locked and cannot be selected for PIN changes' : (String(c.id) === selectedCardId ? 'Selected' : 'Choose this card')}
                        >
                          {c.status === 'locked' ? 'Locked' : (String(c.id) === selectedCardId ? 'Chosen' : 'Choose')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Current PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  className="form-input"
                  value={pinForm.currentPin}
                  onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                  title={showCurrentPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showCurrentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New PIN (4 digits)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  className="form-input"
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                  title={showNewPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  className="form-input"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                  maxLength="4"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                  title={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
