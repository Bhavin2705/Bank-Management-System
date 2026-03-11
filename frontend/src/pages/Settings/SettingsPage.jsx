import { useEffect, useState } from 'react';
import { useNotification } from '../../components/providers/NotificationProvider';
import { api } from '../../utils/api';
import AccountsTab from './components/AccountsTab';
import BankTab from './components/BankTab';
import PreferencesTab from './components/PreferencesTab';
import ProfileTab from './components/ProfileTab';
import SecurityTab from './components/SecurityTab';
import SessionsTab from './components/SessionsTab';
import SettingsTabs from './components/SettingsTabs';
import {
  getInitialBankData,
  getInitialPasswordData,
  getInitialPreferencesData,
  getInitialProfileData
} from './utils';

const Settings = ({ user, onUserUpdate }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    preferences: false,
    twoFactor: false,
    bank: false,
    accounts: false,
    sessions: false,
    bootstrap: false
  });
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [sessions, setSessions] = useState(null);
  const [profileData, setProfileData] = useState(getInitialProfileData(user));
  const [bankData, setBankData] = useState(getInitialBankData(user));
  const [passwordData, setPasswordData] = useState(getInitialPasswordData());
  const [preferencesData, setPreferencesData] = useState(getInitialPreferencesData(user));
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.security?.twoFactorEnabled || false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setProfileData(getInitialProfileData(user));
    setBankData(getInitialBankData(user));
    setPreferencesData(getInitialPreferencesData(user));
    setTwoFactorEnabled(user.security?.twoFactorEnabled || false);
  }, [user]);

  useEffect(() => {
    const loadSettingsData = async () => {
      setLoading((prev) => ({ ...prev, bootstrap: true }));

      try {
        const [settingsRes, accountsRes, sessionsRes] = await Promise.all([
          api.settings.getAll(),
          api.settings.getLinkedAccounts(),
          api.settings.getSessions()
        ]);

        if (settingsRes?.success && settingsRes?.data) {
          const settings = settingsRes.data;

          setProfileData((prev) => ({
            ...prev,
            name: settings.profile?.name ?? prev.name,
            email: settings.profile?.email ?? prev.email,
            phone: settings.profile?.phone ?? prev.phone,
            dateOfBirth: settings.profile?.dateOfBirth
              ? new Date(settings.profile.dateOfBirth).toISOString().slice(0, 10)
              : '',
            occupation: settings.profile?.occupation ?? prev.occupation,
            address: typeof settings.profile?.address === 'object'
              ? settings.profile.address?.street || ''
              : settings.profile?.address || ''
          }));

          setBankData((prev) => ({
            ...prev,
            bankName: settings.bank?.bankName ?? prev.bankName,
            ifscCode: settings.bank?.ifscCode ?? prev.ifscCode,
            branchName: settings.bank?.branchName ?? prev.branchName
          }));

          setPreferencesData((prev) => ({
            ...prev,
            currency: settings.preferences?.currency ?? prev.currency,
            language: settings.preferences?.language ?? prev.language,
            theme: settings.preferences?.theme ?? prev.theme,
            notifications: {
              email: settings.preferences?.notifications?.email ?? prev.notifications.email,
              sms: settings.preferences?.notifications?.sms ?? prev.notifications.sms,
              push: settings.preferences?.notifications?.push ?? prev.notifications.push
            }
          }));

          setTwoFactorEnabled(settings.security?.twoFactorEnabled || false);
        }

        if (accountsRes?.success) {
          setLinkedAccounts(accountsRes.data || []);
        }

        if (sessionsRes?.success) {
          setSessions(sessionsRes.data || null);
        }
      } catch (loadError) {
        console.error('Error loading settings data:', loadError);
        setError('Failed to load settings. Please refresh.');
        showError('Failed to load settings. Please refresh.');
      } finally {
        setLoading((prev) => ({ ...prev, bootstrap: false }));
      }
    };

    loadSettingsData();
  }, []);

  const handleFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      const target = e.target;
      if (target.type !== 'submit' && target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }
    return true;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading((prev) => ({ ...prev, profile: true }));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      showError('Please enter a valid email address');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    const phoneRegex = /^\d{10}$/;
    if (profileData.phone && !phoneRegex.test(profileData.phone.replace(/\D/g, ''))) {
      showError('Please enter a valid 10-digit phone number');
      setLoading((prev) => ({ ...prev, profile: false }));
      return;
    }

    try {
      const result = await api.auth.updateDetails({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        address: profileData.address,
        dateOfBirth: profileData.dateOfBirth,
        occupation: profileData.occupation
      });

      if (result.success) {
        onUserUpdate(result.data);
        showSuccess('Profile updated successfully!');
      } else {
        showError(result.error || 'Failed to update profile');
      }
    } catch (profileError) {
      console.error('Profile update error:', profileError);
      showError('Failed to update profile. Please try again.');
    }

    setLoading((prev) => ({ ...prev, profile: false }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading((prev) => ({ ...prev, password: true }));

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match!');
      setLoading((prev) => ({ ...prev, password: false }));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Password must be at least 8 characters long!');
      setLoading((prev) => ({ ...prev, password: false }));
      return;
    }
    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!strongPassword.test(passwordData.newPassword)) {
      showError('Password must include uppercase, lowercase, number, and special character');
      setLoading((prev) => ({ ...prev, password: false }));
      return;
    }

    try {
      const result = await api.auth.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (result.success) {
        showSuccess('Password changed successfully!');
        setPasswordData(getInitialPasswordData());
      } else {
        showError(result.error || 'Failed to change password');
      }
    } catch (passwordError) {
      console.error('Password change error:', passwordError);
      showError('Failed to change password. Please try again.');
    }

    setLoading((prev) => ({ ...prev, password: false }));
  };

  const handlePreferencesUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading((prev) => ({ ...prev, preferences: true }));

    try {
      const result = await api.settings.updatePreferences(preferencesData);
      if (result.success) {
        onUserUpdate({
          ...user,
          preferences: result.data
        });
        showSuccess('Preferences updated successfully!');
      } else {
        showError(result.error || 'Failed to update preferences');
      }
    } catch (preferencesError) {
      console.error('Preferences update error:', preferencesError);
      showError('Failed to update preferences. Please try again.');
    }

    setLoading((prev) => ({ ...prev, preferences: false }));
  };

  const handleTwoFactorToggle = async () => {
    setLoading((prev) => ({ ...prev, twoFactor: true }));

    try {
      const result = await api.settings.updateTwoFactor({ enable: !twoFactorEnabled });
      if (result.success) {
        setTwoFactorEnabled(!twoFactorEnabled);
        showSuccess(`Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'} successfully!`);
      } else {
        showError(result.error || 'Failed to update two-factor settings');
      }
    } catch (twoFactorError) {
      console.error('Two-factor toggle error:', twoFactorError);
      showError('Failed to update two-factor settings. Please try again.');
    }

    setLoading((prev) => ({ ...prev, twoFactor: false }));
  };

  const handleBankChange = (e) => {
    const { name, value } = e.target;
    setBankData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBankUpdate = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, bank: true }));

    try {
      const result = await api.auth.updateDetails({
        bankName: bankData.bankName,
        ifscCode: bankData.ifscCode,
        branchName: bankData.branchName
      });

      if (result?.success) {
        onUserUpdate(result.data);
        showSuccess('Bank details updated successfully!');
      } else {
        showError(result?.error || 'Failed to update bank details');
      }
    } catch (bankError) {
      console.error('Bank update error:', bankError);
      showError('Failed to update bank details. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, bank: false }));
    }
  };

  const refreshSessions = async (showToast = false) => {
    setLoading((prev) => ({ ...prev, sessions: true }));
    try {
      const result = await api.settings.getSessions();
      if (result?.success) {
        setSessions(result.data || null);
        if (showToast) showSuccess('Session data refreshed');
      } else if (showToast) {
        showError(result?.error || 'Failed to refresh session data');
      }
    } catch (sessionError) {
      console.error('Session refresh error:', sessionError);
      if (showToast) showError('Failed to refresh session data');
    } finally {
      setLoading((prev) => ({ ...prev, sessions: false }));
    }
  };

  const refreshLinkedAccounts = async (showToast = false) => {
    setLoading((prev) => ({ ...prev, accounts: true }));
    try {
      const result = await api.settings.getLinkedAccounts();
      if (result?.success) {
        setLinkedAccounts(result.data || []);
        if (showToast) showSuccess('Linked accounts refreshed');
      } else if (showToast) {
        showError(result?.error || 'Failed to refresh linked accounts');
      }
    } catch (accountsError) {
      console.error('Accounts refresh error:', accountsError);
      if (showToast) showError('Failed to refresh linked accounts');
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
  };

  const handleCardStatusToggle = async (card) => {
    const cardId = card?._id || card?.id;
    const currentStatus = card?.status;
    if (!cardId) return;

    if (currentStatus === 'closed') {
      showError('Closed cards cannot be reopened');
      return;
    }

    if (currentStatus === 'blocked') {
      showError('This card is blocked by bank. Please contact bank support.');
      return;
    }
    if (currentStatus === 'lost' || currentStatus === 'expired') {
      showError('This card status cannot be changed.');
      return;
    }
    if (card?.statusRequest?.status === 'pending') {
      showError('A lock/unlock request is already pending review.');
      return;
    }

    setLoading((prev) => ({ ...prev, accounts: true }));

    try {
      const result = await api.cards.requestStatusChange(cardId);
      if (result?.success) {
        showSuccess(result.message || 'Request submitted. Bank will review your card status change.');
        await refreshLinkedAccounts(false);
      } else {
        showError(result?.error || 'Failed to submit card status request');
      }
    } catch (cardStatusError) {
      console.error('Card status update error:', cardStatusError);
      showError('Failed to submit card status request. Please try again.');
    } finally {
      setLoading((prev) => ({ ...prev, accounts: false }));
    }
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
      return;
    }

    setPreferencesData({
      ...preferencesData,
      [name]: value
    });
  };

  return (
    <div className="container settings-page">
      <div className="settings-page-header">
        <h1 className="settings-page-title">Account Settings</h1>
        <p className="settings-page-subtitle">Manage your account preferences and security</p>
      </div>

      <div className="card">
        <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {error && (
          <div className="error-message settings-flash">
            {error}
          </div>
        )}

        {message && (
          <div className="success-message settings-flash">
            {message}
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            profileData={profileData}
            setProfileData={setProfileData}
            handleProfileChange={handleProfileChange}
            handleProfileUpdate={handleProfileUpdate}
            handleFormKeyDown={handleFormKeyDown}
          />
        )}
        {activeTab === 'bank' && (
          <BankTab
            user={user}
            bankData={bankData}
            handleFormKeyDown={handleFormKeyDown}
            handleBankChange={handleBankChange}
            handleBankUpdate={handleBankUpdate}
            loading={loading.bank}
          />
        )}
        {activeTab === 'preferences' && (
          <PreferencesTab
            preferencesData={preferencesData}
            handlePreferencesChange={handlePreferencesChange}
            handlePreferencesUpdate={handlePreferencesUpdate}
            loading={loading.preferences}
          />
        )}
        {activeTab === 'security' && (
          <SecurityTab
            loading={loading.password || loading.twoFactor}
            twoFactorEnabled={twoFactorEnabled}
            handleTwoFactorToggle={handleTwoFactorToggle}
            handlePasswordChange={handlePasswordChange}
            passwordData={passwordData}
            handlePasswordChangeInput={handlePasswordChangeInput}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountsTab
            linkedAccounts={linkedAccounts}
            loading={loading.accounts || loading.bootstrap}
            onRefresh={refreshLinkedAccounts}
            onToggleCardStatus={handleCardStatusToggle}
          />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            loading={loading.sessions || loading.bootstrap}
            onRefresh={refreshSessions}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;


