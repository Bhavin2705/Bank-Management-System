// Authentication utilities using API

import api from './api.js';

export const AUTH_KEY = 'bank_auth_user';
export const TOKEN_KEY = 'bank_auth_token';

// Initialize - no longer needed with API
export const initializeUsers = () => {
  // API handles user initialization
  return Promise.resolve();
};

export const login = async (identifier, password) => {
  try {
    const response = await api.auth.login({ identifier, password });

    if (response.success) {
      // Store user data and token
      localStorage.setItem(AUTH_KEY, JSON.stringify(response.data.user));
      localStorage.setItem(TOKEN_KEY, response.data.token);

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
      // Store user data and token
      localStorage.setItem(AUTH_KEY, JSON.stringify(response.data.user));
      localStorage.setItem(TOKEN_KEY, response.data.token);

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
      // Store user data and token
      localStorage.setItem(AUTH_KEY, JSON.stringify(response.data.user));
      localStorage.setItem(TOKEN_KEY, response.data.token);

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
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getCurrentUser = () => {
  const user = localStorage.getItem(AUTH_KEY);
  return user ? JSON.parse(user) : null;
};

export const updateUserBalance = async (userId, newBalance) => {
  try {
    // Get current user data
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser._id !== userId) {
      throw new Error('User not found or unauthorized');
    }

    // Update user data locally (balance will be updated via API responses)
    const updatedUser = { ...currentUser, balance: newBalance };
    localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));

    return updatedUser;
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};

export const refreshUserData = async () => {
  try {
    const response = await api.auth.getMe();
    if (response.success) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(response.data));
      return response.data;
    }
  } catch (error) {
    console.warn('Error refreshing user data:', error);
    // If refresh fails, just return null - don't logout automatically
    // The user will be prompted to login again if needed
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
      // Update local storage with new user data
      localStorage.setItem(AUTH_KEY, JSON.stringify(response.data));
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
