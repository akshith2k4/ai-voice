import api from './apiService';

const API_BASE_URL = '/invoices';

export const invoiceService = {
  /**
   * GET /api/invoices — paginated, filterable
   * @param {Object} filters - { billToId, billToType, status, invoiceDirection, startDate, endDate, invoiceNumber, page, size }
   */
  getInvoices: async (filters = {}) => {
    try {
      const toDateStr = (d) => d instanceof Date ? d.toISOString().split('T')[0] : d;

      const params = Object.fromEntries(
        Object.entries({
          billToId: filters.billToId,
          billToType: filters.billToType,
          status: filters.status,
          invoiceDirection: filters.invoiceDirection,
          invoiceNumber: filters.invoiceNumber,
          startAt: filters.startAt,
          endAt: filters.endAt,
          page: filters.page ?? 0,
          size: filters.size ?? 20,
        }).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );

      const response = await api.get(API_BASE_URL, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  getInvoiceById: async (id) => {
    const response = await api.get(`${API_BASE_URL}/${id}`);
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await api.post(API_BASE_URL, invoiceData);
    return response.data;
  },

  updateInvoice: async (id, invoiceData) => {
    const response = await api.put(`${API_BASE_URL}/${id}`, invoiceData);
    return response.data;
  },

  deleteInvoice: async (id) => {
    const response = await api.delete(`${API_BASE_URL}/${id}`);
    return response.data;
  },

  addPayment: async (invoiceId, paymentData) => {
    const response = await api.post(`${API_BASE_URL}/${invoiceId}/payments`, paymentData);
    return response.data;
  },

  issueInvoice: async (id) => {
    const response = await api.post(`${API_BASE_URL}/issue-invoice/${id}`);
    return response.data;
  },

  refreshInvoiceByBillingCycle: async (billingCycleId) => {
    const response = await api.post(`${API_BASE_URL}/refresh-invoice/billing-cycle/${billingCycleId}`);
    return response.data;
  },
};