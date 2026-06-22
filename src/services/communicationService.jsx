import api from './apiService';

const API_BASE_URL = '/communication';

export const communicationService = {
  getCommunicationUsers: async (filter = 'all') => {
    try {
      const response = await api.get(`${API_BASE_URL}/users`, {
        params: { filter }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching communication users:', error);
      throw error;
    }
  },

  getCommunicationUserById: async (id) => {
    try {
      const response = await api.get(`${API_BASE_URL}/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching communication user with id ${id}:`, error);
      throw error;
    }
  },

  updateActiveStatus: async (id, active) => {
    try {
      const response = await api.put(`${API_BASE_URL}/users/${id}/active`, null, {
        params: { active }
      });
      return response.data;
    } catch (error) {
      console.error(`Error updating active status for user ${id}:`, error);
      throw error;
    }
  },

  getAddressesByUserId: async (id) => {
    try {
      const response = await api.get(`${API_BASE_URL}/users/${id}/addresses`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching addresses for user ${id}:`, error);
      throw error;
    }
  },

  createCommunicationUser: async (userData) => {
    try {
      const response = await api.post(`${API_BASE_URL}/users`, userData);
      return response.data;
    } catch (error) {
      console.error('Error creating communication user:', error);
      throw error;
    }
  },

  updateCommunicationUser: async (id, userData) => {
    try {
      const response = await api.put(`${API_BASE_URL}/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating communication user ${id}:`, error);
      throw error;
    }
  },

  addAddress: async (userId, addressData) => {
    try {
      const response = await api.post(`${API_BASE_URL}/users/${userId}/addresses`, addressData);
      return response.data;
    } catch (error) {
      console.error(`Error adding address for user ${userId}:`, error);
      throw error;
    }
  },

  updateAddress: async (addressId, addressData) => {
    try {
      const response = await api.put(`${API_BASE_URL}/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      console.error(`Error updating address ${addressId}:`, error);
      throw error;
    }
  },

  deleteAddress: async (addressId) => {
    try {
      const response = await api.delete(`${API_BASE_URL}/addresses/${addressId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting address ${addressId}:`, error);
      throw error;
    }
  },

  deleteCommunicationUser: async (id) => {
    try {
      const response = await api.delete(`${API_BASE_URL}/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting communication user ${id}:`, error);
      throw error;
    }
  }
};
