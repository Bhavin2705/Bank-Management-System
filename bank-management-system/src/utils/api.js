// API Configuration and Base Service
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cookies are used for auth (httpOnly cookies set by backend). Do not read tokens from localStorage.

// Helper function to handle API responses
const handleResponse = async (response, isLoginRequest = false, isGetMeRequest = false) => {
    let data = {};
    try {
        data = await response.json();
    } catch (e) {
        // no JSON body
    }

    if (!response.ok) {
        // Prefer server-provided error message when available
        const serverMessage = data && data.error ? data.error : null;

        // Handle unauthorized access
        if (response.status === 401) {
            // For login attempts, return explicit 'Invalid credentials' when server doesn't provide a message
            const message = serverMessage || (isLoginRequest ? 'Invalid credentials' : 'Authentication required');
            throw new Error(message);
        }

        throw new Error(serverMessage || `Request failed with status ${response.status}`);
    }

    return data;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Ensure cookies are sent for cross-origin requests (backend sets httpOnly cookies)
    defaultOptions.credentials = 'include';

    const config = { ...defaultOptions, ...options };

    // Merge headers if both exist
    if (options.headers) {
        config.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        // Create a timeout promise
        // Increase timeout to allow server-side email sending to complete
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
        });

        // Race between fetch and timeout
        const response = await Promise.race([
            fetch(url, config),
            timeoutPromise
        ]);

        // Check if this is a login request or getMe request to handle 401 differently
        const isLoginRequest = endpoint === '/auth/login';
        const isGetMeRequest = endpoint === '/auth/me';
        return await handleResponse(response, isLoginRequest, isGetMeRequest);
    } catch (error) {
        // Only log API request errors during development to avoid noisy console output in production
        if (import.meta.env && import.meta.env.DEV) {
            console.error('API Request Error:', error);
        }
        throw error;
    }
};

// Health check function (doesn't use /api prefix)
export const checkBackendHealth = async () => {
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Health check timeout')), 3000);
        });

        const response = await Promise.race([
            fetch('http://localhost:5000/health'),
            timeoutPromise
        ]);

        return response.ok;
    } catch (error) {
        console.warn('Backend health check failed:', error);
        return false;
    }
};

// API Methods
export const api = {
    // Authentication
    auth: {
        register: (userData) => apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        }),

        login: (credentials) => apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),

        loginWithAccount: (credentials) => apiRequest('/auth/login-account', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),

        logout: () => apiRequest('/auth/logout', {
            method: 'POST'
        }),

        getMe: () => apiRequest('/auth/me'),

        updateDetails: (userData) => apiRequest('/auth/updatedetails', {
            method: 'PUT',
            body: JSON.stringify(userData)
        }),

        updatePassword: (passwordData) => apiRequest('/auth/updatepassword', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        }),

        refreshToken: () => apiRequest('/auth/refresh', {
            method: 'POST'
        }),

        forgotPassword: (emailData) => apiRequest('/auth/forgotpassword', {
            method: 'POST',
            body: JSON.stringify(emailData)
        }),

        resetPassword: (resetToken, passwordData) => apiRequest(`/auth/resetpassword/${resetToken}`, {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        })
        ,
        verifyResetToken: (resetToken) => apiRequest(`/auth/resetpassword/${resetToken}`, {
            method: 'GET'
        }),
    },

    // Transactions
    transactions: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return apiRequest(`/transactions?${queryString}`);
        },

        getById: (id) => apiRequest(`/transactions/${id}`),

        create: (transactionData) => apiRequest('/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        }),

        update: (id, transactionData) => apiRequest(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(transactionData)
        }),

        delete: (id) => apiRequest(`/transactions/${id}`, {
            method: 'DELETE'
        }),

        getStats: () => apiRequest('/transactions/stats'),

        getCategories: () => apiRequest('/transactions/categories'),

        transfer: (transferData) => apiRequest('/transactions/transfer', {
            method: 'POST',
            body: JSON.stringify(transferData)
        })
    },

    // Users (Admin only)
    users: {
        getAll: (params = {}) => {
            const queryString = new URLSearchParams(params).toString();
            return apiRequest(`/users?${queryString}`);
        },

        // Get transfer recipients (authenticated users only)
        getTransferRecipients: () => apiRequest('/users/transfer-recipients'),

        getById: (id) => apiRequest(`/users/${id}`),

        update: (id, userData) => apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        }),

        delete: (id) => apiRequest(`/users/${id}`, {
            method: 'DELETE'
        }),

        getStats: () => apiRequest('/users/stats'),

        getBanks: () => apiRequest('/users/banks'),

        updateRole: (id, roleData) => apiRequest(`/users/${id}/role`, {
            method: 'PUT',
            body: JSON.stringify(roleData)
        }),

        updateStatus: (id, statusData) => apiRequest(`/users/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify(statusData)
        }),

        checkEmail: (email) => apiRequest(`/users/check-email?email=${encodeURIComponent(email)}`),

        checkPhone: (phone) => apiRequest(`/users/check-phone?phone=${encodeURIComponent(phone)}`)
    }
};

export default api;

// Cards API
api.cards = {
    getAll: () => apiRequest('/cards'),
    create: (cardData) => apiRequest('/cards', { method: 'POST', body: JSON.stringify(cardData) }),
    updatePin: (id, data) => apiRequest(`/cards/${id}/pin`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id, data) => apiRequest(`/cards/${id}/status`, { method: 'PUT', body: JSON.stringify(data) })
};

