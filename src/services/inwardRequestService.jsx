import api from './apiService';

const API_BASE_URL = '/inventory/inward';

export const createInwardRequest = async (requestData) => {
  try {
    const response = await api.post(API_BASE_URL, requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating inward request:', error);
    throw error;
  }
};