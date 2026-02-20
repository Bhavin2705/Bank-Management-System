const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const handleResponse = async (response, isLoginRequest = false) => {
    let data = {};
    try {
        data = await response.json();
    } catch { }

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
    const config = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...options
    };

    if (options.headers) {
        config.headers = { 'Content-Type': 'application/json', ...options.headers };
    }

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
    );

    const response = await Promise.race([fetch(url, config), timeoutPromise]);
    const isLoginRequest = endpoint === '/auth/login';
    return handleResponse(response, isLoginRequest);
};

export const checkBackendHealth = async () => {
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 3000)
    );

    try {
        const response = await Promise.race([
            fetch('http://localhost:5000/health'),
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
        updatePassword: (data) => apiRequest('/auth/updatepassword', { method: 'PUT', body: JSON.stringify(data) })
    },

    cards: {
        getAll: () => apiRequest('/cards'),
        create: (data) => apiRequest('/cards', { method: 'POST', body: JSON.stringify(data) }),
        updatePin: (id, data) => apiRequest(`/cards/${id}/pin`, { method: 'PUT', body: JSON.stringify(data) }),
        updateStatus: (id, data) => apiRequest(`/cards/${id}/status`, { method: 'PUT', body: JSON.stringify(data) })
    },

    userData: {
        getClientData: () => apiRequest('/users/me/client-data'),
        updateClientData: (data) => apiRequest('/users/me/client-data', { method: 'PUT', body: JSON.stringify(data) })
    },

    banks: {
        add: (data) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/banks/${id}`, { method: 'DELETE' })
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

    users: {
        getAll: (params = {}) => apiRequest(`/users?${new URLSearchParams(params)}`),
        getTransferRecipients: () => apiRequest('/users/transfer-recipients'),
        getById: (id) => apiRequest(`/users/${id}`),
        update: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
        getStats: () => apiRequest('/users/stats'),
        getBanks: () => apiRequest('/banks'),
        updateRole: (id, data) => apiRequest(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify(data) }),
        updateStatus: (id, data) => apiRequest(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
        checkEmail: (email) => apiRequest(`/users/check-email?email=${encodeURIComponent(email)}`),
        checkPhone: (phone) => apiRequest(`/users/check-phone?phone=${encodeURIComponent(phone)}`)
    }
};

export default api;
