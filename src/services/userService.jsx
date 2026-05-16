import api from './apiService';

const API_URL = '/users';

export const userService = {
  getActiveUsers: async (branchId) => {
    const response = await api.get(`${API_URL}/active`, {
      params: { branchId }
    });
    return response.data;
  },
  // Add other user-related methods if needed
};