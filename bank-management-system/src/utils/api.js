// API Configuration and Base Service
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to get auth token
const getAuthToken = () => {
    return localStorage.getItem('bank_auth_token');
};

// Helper function to handle API responses
const handleResponse = async (response) => {
    const data = await response.json();

    if (!response.ok) {
        // Handle unauthorized access
        if (response.status === 401) {
            // Clear auth data but don't redirect - let React handle routing
            localStorage.removeItem('bank_auth_token');
            localStorage.removeItem('bank_auth_user');
            // Instead of redirecting, throw error to be handled by components
            throw new Error('Authentication required');
        }

        throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        }
    };

    const config = { ...defaultOptions, ...options };

    // Merge headers if both exist
    if (options.headers) {
        config.headers = { ...defaultOptions.headers, ...options.headers };
    }

    try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
        });

        // Race between fetch and timeout
        const response = await Promise.race([
            fetch(url, config),
            timeoutPromise
        ]);

        return await handleResponse(response);
    } catch (error) {
        console.error('API Request Error:', error);
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
        })
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
        })
    }
};

export default api;
