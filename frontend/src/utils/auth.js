import api, { clearAuthToken } from './api.js';

export const AUTH_KEY = 'bank_auth_user';

const TWO_FACTOR_DEFAULT_MESSAGE = 'Enter the OTP sent to your registered email.';

const withOptionalOtp = (payload, otp) => (otp ? { ...payload, otp } : payload);

const mapAuthResponse = (response) => {
  if (response?.success) {
    return { success: true, user: response.data.user };
  }

  if (response?.requiresTwoFactor) {
    return {
      success: false,
      requiresTwoFactor: true,
      message: response.message || TWO_FACTOR_DEFAULT_MESSAGE,
    };
  }

  return { success: false, error: 'Login failed' };
};

const handleAccountSelectionError = (error) => {
  if (error?.status === 300 && error?.data?.needsAccountSelection) {
    return {
      success: false,
      error: error.data.error,
      needsAccountSelection: true,
      accounts: error.data.accounts,
      message: error.data.message,
    };
  }

  return null;
};

const readStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStoredUser = (user) => {
  if (typeof window === 'undefined') return null;
  try {
    if (!user) {
      window.sessionStorage.removeItem(AUTH_KEY);
      return null;
    }
    window.sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
};

const clearStoredUser = () => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTH_KEY);
  } catch {
    // no-op
  }
};

export const initializeUsers = () => Promise.resolve(getCurrentUser());

export const login = async (identifier, password, otp) => {
  try {
    const payload = withOptionalOtp({ identifier, password }, otp);
    const response = await api.auth.login(payload);
    if (response?.success && response?.data?.user) {
      writeStoredUser(response.data.user);
    }
    return mapAuthResponse(response);
  } catch (error) {
    const accountSelection = handleAccountSelectionError(error);
    if (accountSelection) return accountSelection;
    return { success: false, error: error?.message || 'Login failed' };
  }
};

export const loginWithAccount = async (identifier, password, accountId, otp) => {
  try {
    const payload = withOptionalOtp({ identifier, password, accountId }, otp);
    const response = await api.auth.loginWithAccount(payload);
    if (response?.success && response?.data?.user) {
      writeStoredUser(response.data.user);
    }
    return mapAuthResponse(response);
  } catch (error) {
    return { success: false, error: error?.message || 'Login failed' };
  }
};

export const register = async (userData) => {
  try {
    const response = await api.auth.register(userData);

    if (response.success) {
      writeStoredUser(response.data.user);
      return { success: true, user: response.data.user };
    }

    return { success: false, error: 'Registration failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logout = async () => {
  try {
    await Promise.race([
      api.auth.logout(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000)),
    ]);
  } catch (error) {
    console.warn('Logout API error:', error);
  } finally {
    try {
      clearAuthToken();
      clearStoredUser();
      document.cookie = 'bank_auth_token=; path=/; max-age=0';
      document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
      document.cookie = 'token=; path=/; max-age=0';
      document.cookie = 'refreshToken=; path=/; max-age=0';
    } catch (clearError) {
      console.debug('Failed to clear auth cookies:', clearError?.message || 'unknown error');
    }
  }
};

export const getCurrentUser = () => readStoredUser();

export const updateUserBalance = async (userId, newBalance) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn('No current user found in localStorage');
      return { balance: newBalance };
    }

    const currentUserId = String(currentUser._id || currentUser.id || '');
    const providedUserId = String(userId || '');

    if (!currentUserId || !providedUserId || currentUserId !== providedUserId) {
      console.warn('User ID mismatch or missing - current:', currentUserId, 'provided:', providedUserId);
      const nextUser = { ...currentUser, balance: newBalance };
      writeStoredUser(nextUser);
      return nextUser;
    }

    const nextUser = { ...currentUser, balance: newBalance };
    writeStoredUser(nextUser);
    return nextUser;
  } catch (error) {
    console.error('Error updating user balance:', error);
    return { balance: newBalance };
  }
};

export const refreshUserData = async () => {
  try {
    const response = await api.auth.getMe();
    if (response.success) {
      writeStoredUser(response.data);
      return response.data;
    }
  } catch (error) {
    const msg = (error && error.message) ? error.message : '';
    const shouldTryRefresh = msg.includes('Authentication required') || msg.includes('No user found') || msg.includes('Not authorized') || msg.toLowerCase().includes('invalid refresh');

    if (shouldTryRefresh) {
      try {
        const refreshResponse = await api.auth.refreshToken();
        if (refreshResponse && refreshResponse.success) {
          const retryResponse = await api.auth.getMe();
          if (retryResponse.success) {
            writeStoredUser(retryResponse.data);
            return retryResponse.data;
          }
          return null;
        }
        return null;
      } catch (refreshError) {
        if (import.meta.env && import.meta.env.DEV) {
          console.error('Token refresh error:', refreshError);
        }
        return null;
      }
    }

    return null;
  }
  return null;
};

export const getAllUsers = async (params = {}) => {
  const fallback = {
    users: [],
    pagination: { page: 1, limit: 20, total: 0, pages: 1 }
  };

  try {
    const response = await api.users.getAll(params);
    if (!response?.success) {
      return fallback;
    }

    return {
      users: response.data || [],
      pagination: response.pagination || fallback.pagination
    };
  } catch (error) {
    if (error.message && error.message.includes('not authorized')) {
      return fallback;
    }
    console.error('Error fetching users:', error);
    return fallback;
  }
};

export const getNonAdminUsers = async () => {
  try {
    const response = await api.users.getTransferRecipients();
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching transfer recipients:', error);
    return [];
  }
};

export const isAdmin = (user) => user && user.role === 'admin';

export const canAccessAdminFeatures = (user) => isAdmin(user);

export const updateUserDetails = async (userData) => {
  try {
    const response = await api.auth.updateDetails(userData);
    if (response.success) {
      writeStoredUser(response.data);
      return { success: true, user: response.data };
    }
    return { success: false, error: 'Update failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePassword = async (passwordData) => {
  try {
    const response = await api.auth.updatePassword(passwordData);
    return response;
  } catch (error) {
    return { success: false, error: error.message };
  }
};
