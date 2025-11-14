import api from './api.js';

// Helpers to get and set client-persisted data stored in backend `user.clientData`
export const getClientData = async () => {
    try {
        const res = await api.userData.getClientData();
        return res.success ? res.data : {};
    } catch (error) {
        console.error('Failed to fetch client data:', error);
        return {};
    }
};

export const setClientData = async (data) => {
    try {
        const res = await api.userData.updateClientData(data);
        return res.success ? res.data : null;
    } catch (error) {
        console.error('Failed to update client data:', error);
        throw error;
    }
};

export const getSection = async (sectionName) => {
    const all = await getClientData();
    return all && all[sectionName] !== undefined ? all[sectionName] : null;
};

export const setSection = async (sectionName, value) => {
    const payload = {};
    payload[sectionName] = value;
    return await setClientData(payload);
};

export default {
    getClientData,
    setClientData,
    getSection,
    setSection
};
