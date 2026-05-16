import apiService from './apiService';

export const agreementService = {
  createAgreement: async (agreement) => {
    try {
      const response = await apiService.post('/agreements', agreement);
      return response.data;
    } catch (error) {
      console.error('Error creating agreement:', error);
      throw error;
    }
  },

  updateAgreement: async (id, agreement) => {
    try {
      const response = await apiService.put(`/agreements/${id}`, agreement);
      return response.data;
    } catch (error) {
      console.error('Error updating agreement:', error);
      throw error;
    }
  },

  updatePriceList: async (agreementId, prices) => {
    try {
      const response = await apiService.put(`/agreements/${agreementId}/prices`, prices);
      return response.data;
    } catch (error) {
      console.error('Error updating price list:', error);
      throw error;
    }
  },

  getHotelAgreements: async (hotelId) => {
    try {
      const response = await apiService.get(`/agreements/hotel/${hotelId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching hotel agreements:', error);
      throw error;
    }
  },

  getActiveAgreement: async (customerId) => {
    try {
      const response = await apiService.get(`/agreements/customer/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active agreement:', error);
      throw error;
    }
  },

  getCustomerAgreements: async (customerId) => {
    try {
      const response = await apiService.get(`/agreements/customer/${customerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer agreements:', error);
      throw error;
    }
  },
  
  getActiveProductsForCustomer: async (customerId) => {
    try {
      const response = await apiService.get(`/agreements/customer/${customerId}/active/products`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active products for customer:', error);
      throw error;
    }
  },

  deleteAgreementPrice: async (agreementId, priceId) => {
    try {
      await apiService.delete(`/agreements/${agreementId}/prices/${priceId}`);
    } catch (error) {
      console.error('Error deleting agreement price:', error);
      throw error;
    }
  },
};
