import api from './apiService';

const API_BASE_URL = '/users';

export const laundryUserService = {
    getAllUsers: async () => {
        try {
            const response = await api.get(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching laundry users:', error);
            throw error;
        }
    },

    getUsersByBranch: async (branchId) => {
        const response = await api.get(`${API_BASE_URL}/branch/${branchId}`);
        return response.data;
    },

    getRoles: async () => {
        const response = await api.get(`${API_BASE_URL}/roles`);
        return response.data;
    },

    searchUsers: async (searchTerm) => {
        const response = await api.get(API_BASE_URL, {
            params: { search: searchTerm }
        });
        return response.data;
    },

    createUser: async (userData) => {
        const response = await api.post(API_BASE_URL, userData);
        return response.data;
    },

    updateUser: async (id, userData) => {
        const response = await api.put(`${API_BASE_URL}/${id}`, userData);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await api.delete(`${API_BASE_URL}/${id}`);
        return response.data;
    }
};