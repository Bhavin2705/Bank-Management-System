const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bank-management-system-1-mf4e.onrender.com/api';
const ACCESS_TOKEN_KEY = 'bank_auth_access_token';
let inMemoryAccessToken = null;

const readSessionValue = (key) => {
    if (typeof window === 'undefined') return null;
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
};

const writeSessionValue = (key, value) => {
    if (typeof window === 'undefined') return;
    try {
        if (!value) {
            window.sessionStorage.removeItem(key);
            return;
        }
        window.sessionStorage.setItem(key, value);
    } catch {
        // no-op
    }
};

export const getAuthToken = () => {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    inMemoryAccessToken = readSessionValue(ACCESS_TOKEN_KEY);
    return inMemoryAccessToken;
};

export const setAuthToken = (token) => {
    inMemoryAccessToken = token || null;
    writeSessionValue(ACCESS_TOKEN_KEY, inMemoryAccessToken);
    return token;
};

export const clearAuthToken = () => {
    inMemoryAccessToken = null;
    writeSessionValue(ACCESS_TOKEN_KEY, null);
    return true;
};

const shouldAttemptRefresh = (endpoint) => {
    if (endpoint === '/auth/refresh') return false;
    if (endpoint === '/auth/login') return false;
    if (endpoint === '/auth/login-account') return false;
    if (endpoint === '/auth/register') return false;
    return true;
};

const requestNewAccessToken = async () => {
    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include'
    });

    if (!refreshResponse.ok) {
        return null;
    }

    let refreshData = {};
    try {
        refreshData = await refreshResponse.json();
    } catch {
        refreshData = {};
    }

    const nextAccessToken = refreshData?.data?.token || null;
    if (nextAccessToken) {
        setAuthToken(nextAccessToken);
    }

    return nextAccessToken;
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
    const accessToken = getAuthToken();
    const config = {
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        ...options
    };

    if (options.headers) {
        config.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
    }
    if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
    );

    let response = await Promise.race([fetch(url, config), timeoutPromise]);

    if (response.status === 401 && shouldAttemptRefresh(endpoint)) {
        const refreshedAccessToken = await requestNewAccessToken();
        if (refreshedAccessToken) {
            const retryConfig = {
                ...config,
                headers: {
                    ...config.headers,
                    Authorization: `Bearer ${refreshedAccessToken}`
                }
            };
            response = await Promise.race([fetch(url, retryConfig), timeoutPromise]);
        } else {
            clearAuthToken();
        }
    }

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
        getByUserAdmin: (userId) => apiRequest(`/cards/admin/user/${userId}`),
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
        updateBank: (id, data) => apiRequest(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        add: (data) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(data) }), // Legacy alias
        update: (id, data) => apiRequest(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }), // Legacy alias
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

    transactions: {
        getAll: (params = {}) => apiRequest(`/transactions?${new URLSearchParams(params)}`),
        getByUserAdmin: (userId, params = {}) => apiRequest(`/transactions/admin/user/${userId}?${new URLSearchParams(params)}`),
        getById: (id) => apiRequest(`/transactions/${id}`),
        create: (data) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => apiRequest(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
        getStats: (period = 'month') => apiRequest(`/transactions/stats?period=${period}`),
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
        getStats: () => apiRequest('/users/stats'),
        getBankMetrics: () => apiRequest('/users/bank-metrics'),
        getBanks: () => apiRequest('/banks'),
        updateStatus: (id, data) => apiRequest(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
        checkEmail: (email) => apiRequest(`/users/check-email?email=${encodeURIComponent(email)}`),
        checkPhone: (phone) => apiRequest(`/users/check-phone?phone=${encodeURIComponent(phone)}`),
        verifyPin: (pin) => apiRequest('/users/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),
        getSelfTransferAccounts: () => apiRequest('/users/transfer-recipients?scope=self'),
        updatePin: (data) => apiRequest('/users/update-pin', { method: 'PUT', body: JSON.stringify(data) })
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
