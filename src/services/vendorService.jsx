import api from './apiService';

const API_URL = '/vendors';

export const vendorService = {
    createVendor: async (vendorData) => {
        const response = await api.post(API_URL, vendorData);
        return response.data;
    },

    getAllVendors: async () => {
        const response = await api.get(API_URL);
        return response.data;
    },

    getVendorById: async (id) => {
        const response = await api.get(`${API_URL}/${id}`);
        return response.data;
    },

    searchVendors: async (name) => {
        const response = await api.get(`${API_URL}/search`, { params: { name } });
        return response.data;
    },

    updateVendor: async (id, vendorData) => {
        const response = await api.put(`${API_URL}/${id}`, vendorData);
        return response.data;
    },

    deleteVendor: async (id) => {
        await api.delete(`${API_URL}/${id}`);
    },

    getVendors: async () => {
        const response = await api.get(`${API_URL}`);
        return response.data;
    }
};