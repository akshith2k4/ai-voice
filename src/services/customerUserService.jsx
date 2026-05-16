import api from './apiService.jsx';
const API_BASE_URL = '/customers';

export const customerUserService = {
  createCustomerUser: async (customerId, userData) => {
    const { data } = await api.post(`${API_BASE_URL}/${customerId}/users`, userData);
    return data;
  },

  getCustomerUsers: async (customerId) => {
    const { data } = await api.get(`${API_BASE_URL}/${customerId}/users`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  updateCustomerUser: async (customerId, userId, userData) => {
    const { data } = await api.put(`${API_BASE_URL}/${customerId}/users/${userId}`, userData);
    return data;
  },

  deleteCustomerUser: async (customerId, userId) => {
    await api.delete(`${API_BASE_URL}/${customerId}/users/${userId}`);
  },
};
