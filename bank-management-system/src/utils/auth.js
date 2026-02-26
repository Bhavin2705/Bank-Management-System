
import api, { clearAuthToken } from './api.js';

export const AUTH_KEY = 'bank_auth_user';

export const initializeUsers = () => {
  return Promise.resolve();
};

export const login = async (identifier, password, otp) => {
  try {
    const payload = { identifier, password };
    if (otp) payload.otp = otp;
    const response = await api.auth.login(payload);

    if (response.success) {
      return { success: true, user: response.data.user };
    }

    if (response.requiresTwoFactor) {
      return {
        success: false,
        requiresTwoFactor: true,
        message: response.message || 'Enter the OTP sent to your registered email.'
      };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    if (error.status === 300 && error.data && error.data.needsAccountSelection) {
      return {
        success: false,
        error: error.data.error,
        needsAccountSelection: true,
        accounts: error.data.accounts,
        message: error.data.message
      };
    }

    return { success: false, error: error.message };
  }
};

export const loginWithAccount = async (identifier, password, accountId, otp) => {
  try {
    const payload = { identifier, password, accountId };
    if (otp) payload.otp = otp;
    const response = await api.auth.loginWithAccount(payload);

    if (response.success) {
      return { success: true, user: response.data.user };
    }

    if (response.requiresTwoFactor) {
      return {
        success: false,
        requiresTwoFactor: true,
        message: response.message || 'Enter the OTP sent to your registered email.'
      };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const register = async (userData) => {
  try {
    const response = await api.auth.register(userData);

    if (response.success) {
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
      new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000))
    ]);
  } catch (error) {
    console.warn('Logout API error:', error);
  } finally {
    try {
      clearAuthToken();
      document.cookie = 'bank_auth_token=; path=/; max-age=0';
      document.cookie = 'bank_auth_refresh_token=; path=/; max-age=0';
    } catch (clearError) {
      console.debug('Failed to clear auth cookies:', clearError?.message || 'unknown error');
    }
  }
};

export const getCurrentUser = () => {
  return null;
};

export const updateUserBalance = async (userId, newBalance) => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      console.warn('No current user found in localStorage');
      return { balance: newBalance };
    }

    const currentUserId = String(currentUser._id || currentUser.id || '');
    const providedUserId = String(userId || '');
    
    console.debug('Comparing IDs - current:', currentUserId, 'provided:', providedUserId);
    
    if (!currentUserId || !providedUserId || currentUserId !== providedUserId) {
      console.warn('User ID mismatch or missing - current:', currentUserId, 'provided:', providedUserId);
      return { ...currentUser, balance: newBalance };
    }

    return { ...currentUser, balance: newBalance };
  } catch (error) {
    console.error('Error updating user balance:', error);
    return { balance: newBalance };
  }
};

export const refreshUserData = async () => {
  try {
    const response = await api.auth.getMe();
    if (response.success) {
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
          if (retryResponse.success) return retryResponse.data;
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

export const getAllUsers = async () => {
  try {
    const response = await api.users.getAll();
    return response.success ? response.data : [];
  } catch (error) {
    if (error.message && error.message.includes('not authorized')) {
      return [];
    }
    console.error('Error fetching users:', error);
    return [];
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

export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

export const canAccessAdminFeatures = (user) => {
  return isAdmin(user);
};

export const updateUserDetails = async (userData) => {
  try {
    const response = await api.auth.updateDetails(userData);
    if (response.success) {
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
