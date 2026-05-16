import api from "./apiService.jsx";
const PATH = "/orders";

export const orderService = {
  getAllOrders: async () => {
    const { data } = await api.get(PATH, { meta: { includeDcid: true } });
    return data;
  },

  searchOrders: async (filter) => {
    const { data } = await api.post(`${PATH}/search`, filter, {
      meta: { includeDcid: true },
    });
    return data;
  },

  createOrder: async (orderData) => {
    const { data } = await api.post(PATH, orderData);
    return data;
  },

  getIncompleteOrders: async (customerId) => {
    const { data } = await api.get(
      `${PATH}/customers/${customerId}/incomplete`,
      {
        meta: { includeDcid: true },
      }
    );
    return data;
  },

  updateOrder: async (orderData) => {
    const { data } = await api.put(`${PATH}/${orderData.id}`, orderData);
    return data;
  },

  deleteOrderById: async (orderId) => {
    await api.delete(`${PATH}/${orderId}`);
  },

  recordCompleteOrder: async (orderReferenceId, completedTime) => {
    const payload = { orderReferenceId, completedTime };
    const { data } = await api.post(`${PATH}/record/complete`, payload);
    return data;
  },
  //Rejection Apis
  createRejectionRequest: async (orderId, rejectionData) => {
    const { data } = await api.post(
      `/orders/leasing-orders/${orderId}/rejection-requests`,
      rejectionData
    );
    return data;
  },

  deleteRejectionRequest: async (rejectionRequestId) => {
    await api.delete(
      `/orders/leasing-orders/rejection-requests/${rejectionRequestId}`
    );
  },

  updateRejectionRequestStatus: async (rejectionRequestId, newStatus) => {
    const { data } = await api.post(
      `/orders/leasing-orders/rejection-requests/${rejectionRequestId}/status`,
      { status: newStatus }
    );
    return data;
  },

  // ------------------ LEASING ORDER GET ONE ------------------

  getLeasingOrderById: async (orderId) => {
    const { data } = await api.get(`/orders/leasing-orders/${orderId}`);
    return data;
  },
};
