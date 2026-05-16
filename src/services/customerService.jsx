import api from './apiService.jsx';

const API_BASE_URL = '/customers';

export const customerService = {
  getAllCustomers: async (params = {}) => {
    const { data } = await api.get(API_BASE_URL, {
      params,
      meta: { includeDcid: true },
    });
    return data;
  },

  searchCustomers: async (searchTerm) => {
    const { data } = await api.get(API_BASE_URL, {
      params: { name: searchTerm, page: 0, size: 10 },
      meta: { includeDcid: true },
    });
    return data;
  },

  getCustomers: async (params = {}) => {
    const { data } = await api.get(API_BASE_URL, {
      params,
      meta: { includeDcid: true },
    });
    return data;
  },

  getCustomerById: async (id) => {
    const { data } = await api.get(`${API_BASE_URL}/${id}`);
    return data;
  },

  createCustomer: async (customerData) => {
    const { data } = await api.post(API_BASE_URL, customerData, {
      meta: { includeDcid: true },
    });
    return data;
  },

  updateCustomer: async (customerId, customerData) => {
    const { data } = await api.put(`${API_BASE_URL}/${customerId}`, customerData, {
      meta: { includeDcid: true },
    });
    return data;
  },

  deleteCustomer: async (id) => {
    await api.delete(`${API_BASE_URL}/${id}`, {
      meta: { includeDcid: true },
    });
  },

  getCustomerTypes: async () => {
    const { data } = await api.get(`${API_BASE_URL}/types`);
    return data;
  },

  searchCustomersByName: async (name) => {
    const { data } = await api.get(`${API_BASE_URL}/search`, {
      params: { name },
      meta: { includeDcid: true },
    });
    return data;
  },
};
