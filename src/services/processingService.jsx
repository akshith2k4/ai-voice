import api from './apiService';

const API_BASE_URL = '/processing';

export const processingService = {
    getAllProcessingRequests: async () => {
        try {
            const response = await api.get(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching processing requests:', error);
            throw error;
        }
    },

    getAllSoiledInventory: async () => {
        const response = await api.get(`${API_BASE_URL}`);
        return response.data;
    },

    createProcessingRequest: async (requestData) => {
        const response = await api.post(`${API_BASE_URL}/processing-requests`, requestData);
        return response.data;
    },

    completeProcessingRequest: async (id) => {
        const response = await api.put(`${API_BASE_URL}/processing-requests/${id}/complete`);
        return response.data;
    }
};