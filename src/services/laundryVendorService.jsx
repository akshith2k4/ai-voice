import api from './apiService.jsx'; 

export const laundryVendorService = {
  getAllVendors: async () => {
    const { data } = await api.get('/laundry-vendors', {
      meta: { includeDcid: false }, 
    });
    return data;
  },

  getVendorById: async (id) => {
    const { data } = await api.get(`/laundry-vendors/${id}`);
    return data;
  },

  createVendor: async (vendorData) => {
    const { data } = await api.post('/laundry-vendors', vendorData);
    return data;
  },

  updateVendor: async (id, vendorData) => {
    const { data } = await api.put(`/laundry-vendors/${id}`, vendorData);
    return data;
  },

  assignCustomersToVendor: async (vendorId, customerIds) => {
    const { data } = await api.post(`/laundry-vendors/${vendorId}/customers`, customerIds);
    return data;
  },

  removeCustomerFromVendor: async (vendorId, customerId) => {
    const { data } = await api.delete(`/laundry-vendors/${vendorId}/customers/${customerId}`);
    return data;
  },
};
