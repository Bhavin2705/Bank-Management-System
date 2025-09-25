// Authentication utilities using API

import api from './api.js';

export const AUTH_KEY = 'bank_auth_user';
export const TOKEN_KEY = 'bank_auth_token';
export const REFRESH_TOKEN_KEY = 'bank_auth_refresh_token';

// Initialize - no longer needed with API
export const initializeUsers = () => {
  // API handles user initialization
  return Promise.resolve();
};

export const login = async (identifier, password) => {
  try {
    const response = await api.auth.login({ identifier, password });

    if (response.success) {
      // Store both token and refresh token
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);

      return { success: true, user: response.data.user };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    // Handle multiple accounts case
    if (error.status === 300 && error.data && error.data.needsAccountSelection) {
      return {
        success: false,
        error: error.data.error,
        needsAccountSelection: true,
        accounts: error.data.accounts,
        message: error.data.message
      };
    }

    // Return the actual error message from the API instead of generic message
    return { success: false, error: error.message };
  }
};

export const loginWithAccount = async (identifier, password, accountId) => {
  try {
    const response = await api.auth.loginWithAccount({ identifier, password, accountId });

    if (response.success) {
      // Store both token and refresh token
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);

      return { success: true, user: response.data.user };
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
      // Store both token and refresh token
      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.data.refreshToken);

      return { success: true, user: response.data.user };
    }

    return { success: false, error: 'Registration failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logout = async () => {
  try {
    // Add timeout to logout API call
    await Promise.race([
      api.auth.logout(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000))
    ]);
  } catch (error) {
    console.warn('Logout API error:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const getCurrentUser = () => {
  // Always fetch user from backend, not localStorage
  return null;
};

export const updateUserBalance = async (userId, newBalance) => {
  try {
    // Get current user data
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser._id !== userId) {
      throw new Error('User not found or unauthorized');
    }

    // Do not update localStorage for user balance. Always fetch from backend for accuracy.
    // Optionally, trigger a UI refresh or refetch user data from backend here.
    return { ...currentUser, balance: newBalance };
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};

export const refreshUserData = async () => {
  try {
    const response = await api.auth.getMe();
    if (response.success) {
      // Only update UI state, not persistent user details in localStorage
      return response.data;
    }
  } catch (error) {
    // If token is expired (401), try to refresh it
    if (error.message && error.message.includes('Authentication required')) {
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const refreshResponse = await api.auth.refreshToken(refreshToken);
          if (refreshResponse.success) {
            // Store new token
            localStorage.setItem(TOKEN_KEY, refreshResponse.data.token);
            // Retry getMe with new token
            const retryResponse = await api.auth.getMe();
            if (retryResponse.success) {
              return retryResponse.data;
            }
          } else {
            // Refresh failed, clear tokens and force logout
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            return null;
          }
        } else {
          // No refresh token, clear tokens and force logout
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          return null;
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and force logout
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return null;
      }
    }
    // Other error, just return null
    return null;
  }
  return null;
};

export const getAllUsers = async () => {
  try {
    const response = await api.users.getAll();
    return response.success ? response.data : [];
  } catch (error) {
    // Silently handle authorization errors - this is expected for non-admin users
    if (error.message && error.message.includes('not authorized')) {
      return [];
    }
    console.error('Error fetching users:', error);
    return [];
  }
};

export const getNonAdminUsers = async () => {
  try {
    // Use the new transfer recipients endpoint instead of the admin-only users endpoint
    const response = await api.users.getTransferRecipients();
    return response.success ? response.data : [];
  } catch (error) {
    console.error('Error fetching transfer recipients:', error);
    // Return empty array on error to prevent UI crashes
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
      // Only update UI state, not persistent user details in localStorage
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
