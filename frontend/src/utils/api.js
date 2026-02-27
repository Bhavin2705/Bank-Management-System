const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bank-management-system-1-mf4e.onrender.com/api';
const AUTH_TOKEN_KEY = 'bank_auth_token';

export const getAuthToken = () => {
    try {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch (storageError) {
        console.debug('Unable to read auth token:', storageError?.message || 'unknown error');
        return null;
    }
};

export const setAuthToken = (token) => {
    if (!token) return;
    try {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    } catch (storageError) {
        console.debug('Unable to persist auth token:', storageError?.message || 'unknown error');
    }
};

export const clearAuthToken = () => {
    try {
        localStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (storageError) {
        console.debug('Unable to clear auth token:', storageError?.message || 'unknown error');
    }
};
const handleResponse = async (response, isLoginRequest = false) => {
    let data = {};
    try {
        data = await response.json();
    } catch (parseError) {
        console.debug('Response body is not JSON:', parseError?.message || 'unknown error');
    }

    if (!response.ok) {
        const serverMessage = data?.error || null;
        const error = new Error(serverMessage || (isLoginRequest ? 'Invalid credentials' : `Request failed with status ${response.status}`));
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
};

const apiRequest = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const authToken = getAuthToken();
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        credentials: 'include',
        ...options
    };

    if (options.headers) {
        config.headers = {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...options.headers
        };
    }

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
    );

    const response = await Promise.race([fetch(url, config), timeoutPromise]);
    const isLoginRequest = endpoint === '/auth/login';
    const result = await handleResponse(response, isLoginRequest);

    if (endpoint === '/auth/logout') {
        clearAuthToken();
    }

    if (result && result.data && result.data.token) {
        setAuthToken(result.data.token);
    }

    return result;
};

export const checkBackendHealth = async () => {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 20000)
    );

    try {
        const response = await Promise.race([
            fetch(`${API_BASE_URL.replace('/api', '')}/health`),
            timeoutPromise
        ]);
        return response.ok;
    } catch {
        return false;
    }
};

export const api = {
    auth: {
        register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
        loginWithAccount: (data) => apiRequest('/auth/login-account', { method: 'POST', body: JSON.stringify(data) }),
        logout: () => apiRequest('/auth/logout', { method: 'POST' }),
        getMe: () => apiRequest('/auth/me', { method: 'GET' }),
        refreshToken: () => apiRequest('/auth/refresh', { method: 'POST' }),
        updateDetails: (data) => apiRequest('/auth/updatedetails', { method: 'PUT', body: JSON.stringify(data) }),
        updatePassword: (data) => apiRequest('/auth/updatepassword', { method: 'PUT', body: JSON.stringify(data) }),
        forgotPassword: (data) => apiRequest('/auth/forgotpassword', { method: 'POST', body: JSON.stringify(data) }),
        resetPassword: (token, data) => apiRequest(`/auth/resetpassword/${token}`, { method: 'PUT', body: JSON.stringify(data) }),
        verifyResetToken: (token) => apiRequest(`/auth/resetpassword/${token}`, { method: 'GET' })
    },

    cards: {
        getAll: () => apiRequest('/cards'),
        create: (data) => apiRequest('/cards', { method: 'POST', body: JSON.stringify(data) }),
        updatePin: (id, data) => apiRequest(`/cards/${id}/pin`, { method: 'PUT', body: JSON.stringify(data) }),
        updateStatus: (id, data) => apiRequest(`/cards/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
        revealCvv: (id, data) => apiRequest(`/cards/${id}/reveal-cvv`, { method: 'POST', body: JSON.stringify(data) })
    },

    userData: {
        getClientData: () => apiRequest('/users/me/client-data'),
        updateClientData: (data) => apiRequest('/users/me/client-data', { method: 'PUT', body: JSON.stringify(data) })
    },

    banks: {
        getAll: () => apiRequest('/banks'),
        addBank: (data) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(data) }),
        add: (data) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(data) }), // Legacy alias
        delete: (id) => apiRequest(`/banks/${id}`, { method: 'DELETE' }), // Legacy alias
        deleteBank: (id) => apiRequest(`/banks/${id}`, { method: 'DELETE' })
    },

    bills: {
        getAll: () => apiRequest('/bills'),
        create: (data) => apiRequest('/bills', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/bills/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/bills/${id}`, { method: 'DELETE' })
    },

    recurring: {
        getAll: () => apiRequest('/recurring'),
        create: (data) => apiRequest('/recurring', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/recurring/${id}`, { method: 'DELETE' })
    },

    budgets: {
        getAll: () => apiRequest('/budgets'),
        getSummary: () => apiRequest('/budgets/summary'),
        create: (data) => apiRequest('/budgets', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/budgets/${id}`, { method: 'DELETE' })
    },

    goals: {
        getAll: () => apiRequest('/goals'),
        getStats: () => apiRequest('/goals/stats'),
        create: (data) => apiRequest('/goals', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/goals/${id}`, { method: 'DELETE' })
    },

    investments: {
        getAll: () => apiRequest('/investments'),
        getSummary: () => apiRequest('/investments/portfolio/summary'),
        create: (data) => apiRequest('/investments', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/investments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/investments/${id}`, { method: 'DELETE' })
    },

    transactions: {
        getAll: (params = {}) => apiRequest(`/transactions?${new URLSearchParams(params)}`),
        getById: (id) => apiRequest(`/transactions/${id}`),
        create: (data) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
        getStats: () => apiRequest('/transactions/stats'),
        getCategories: () => apiRequest('/transactions/categories'),
        transfer: (data) => apiRequest('/transactions/transfer', { method: 'POST', body: JSON.stringify(data) })
    },

    notifications: {
        getAll: () => apiRequest('/notifications'),
        getById: (id) => apiRequest(`/notifications/${id}`),
        markAsRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
        markAllAsRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),
        delete: (id) => apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
        deleteAll: () => apiRequest('/notifications', { method: 'DELETE' })
    },

    exchange: {
        getRates: () => apiRequest('/exchange/rates'),
        convert: (data) => apiRequest('/exchange/convert', { method: 'POST', body: JSON.stringify(data) })
    },

    users: {
        getAll: (params = {}) => apiRequest(`/users?${new URLSearchParams(params)}`),
        getTransferRecipients: () => apiRequest('/users/transfer-recipients'),
        getById: (id) => apiRequest(`/users/${id}`),
        update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
        getStats: () => apiRequest('/users/stats'),
        getBanks: () => apiRequest('/banks'),
        updateRole: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        updateStatus: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        checkEmail: (email) => apiRequest(`/users/check-email?email=${encodeURIComponent(email)}`),
        checkPhone: (phone) => apiRequest(`/users/check-phone?phone=${encodeURIComponent(phone)}`),
        verifyPin: (pin) => apiRequest('/users/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) })
    },

    settings: {
        getAll: () => apiRequest('/settings'),
        updatePreferences: (data) => apiRequest('/settings/preferences', { method: 'PUT', body: JSON.stringify(data) }),
        updateTwoFactor: (data) => apiRequest('/settings/two-factor', { method: 'PUT', body: JSON.stringify(data) }),
        getLinkedAccounts: () => apiRequest('/settings/linked-accounts'),
        getSessions: () => apiRequest('/settings/sessions')
    }
};

export default api;
