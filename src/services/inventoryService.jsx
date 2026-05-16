import api from './apiService.jsx';
const branchId = localStorage.getItem('branchId') || 'default-branch-id';

export const inventoryService = {
  searchInventoryItems: async (filterDTO) => {
    const cleanDTO = { ...filterDTO };

    Object.entries(cleanDTO).forEach(([key, value]) => {
      if (
        value === null ||
        value === '' ||
        (typeof value === 'object' && Object.keys(value).length === 0)
      ) {
        delete cleanDTO[key];
      }
    });

    const { data } = await api.post(
      '/inventory/items_search',
      cleanDTO,
      { meta: { includeDcid: true } } // <-- injects dcId
    );
    return data;
  },

  searchInventoryItemsById: async (id) => {
    const { data } = await api.get(`/inventory/items/${id}`, {
      meta: { includeDcid: false },
    });
    return data;
  },

  bulkFetchInventoryItems: async (inventoryItemIds) => {
    const { data } = await api.post('/inventory/items/bulk-fetch', {
      inventoryItemIds,
    });
    return data;
  },

  getWarehouses: async () => {
    const { data: payload } = await api.get('/dc/fetch-all');
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.records)
          ? payload.records
          : Array.isArray(payload?.content)
            ? payload.content
            : [];

    return list.map((w) => ({
      id: w?.id ?? w?.dcId ?? w?.dc_id ?? w?.warehouseId ?? null,
      name: w?.name ?? w?.dcName ?? w?.warehouseName ?? w?.title ?? '',
      ...w,
    }));
  },

  getAllInventoryItems: async (warehouseId) => {
    const { data } = await api.get('/inventory/items', {
      params: { warehouseId },
      meta: { includeDcid: true },
    });
    return data;
  },

  getCurrentInventory: async (branchId) => {
    const { data } = await api.get('/inventory/current', {
      params: { branchId },
      meta: { includeDcid: true },
    });
    return data;
  },

  getReservationsByBranchAndPoolId: async (branchId, poolId) => {
    const { data } = await api.get('/inventory/reservations', {
      params: { branchId, poolId },
      meta: { includeDcid: true },
    });
    return data;
  },

  createReservation: async (requestData, customerId) => {
    const { data } = await api.post(`/inventory/customers/${customerId}/reservations`, requestData);
    return data;
  },

  updateReservation: async (reservationId, requestData) => {
    try {
      const { data } = await api.put(
        `/inventory/customer-reservations/${reservationId}`,
        requestData
      );
      return data;
    } catch (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  },

  updateReservationItems: async (reservationId, requestData) => {
    const { data } = await api.put(
      `/inventory/reservations/${reservationId}/update-items`,
      requestData
    );
    return data;
  },

  getProducts: async () => {
    const { data } = await api.get('/inventory/products', {
      // meta: { includeDcid: true }, // <-- usually products are global
    });
    return data;
  },

  getCustomerInventoryItems: async (customerId, body) => {
    try {
      const { data } = await api.post(
        `/inventory/customers/${customerId}/inventory-items`,
        body,
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error fetching customer inventory items:', error);
      throw error;
    }
  },

  saveOrderInventoryReservation: async (requestData) => {
    try {
      const { data } = await api.post(
        '/inventory/reservations/order',
        requestData
      );
      return data;
    } catch (error) {
      console.error('Error saving order inventory reservation:', error);
      throw error;
    }
  },

  saveOrderPacking: async (requestData) => {
    try {
      const { data } = await api.post(
        '/inventory/packing',
        requestData,
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error saving order packing:', error);
      throw error;
    }
  },

  getPools: async () => {
    const { data } = await api.get('/inventory/pools', {
      meta: { includeDcid: true },
    });
    return data;
  },

  getPoolTransactions: async (poolId, productId, page = 0, size = 20) => {
    try {
      const { data } = await api.get(`/inventory/pools/${poolId}/transactions`, {
        params: { page, size, productId },
        meta: { includeDcid: true },
      });
      return data;
    } catch (error) {
      console.error('Error fetching pool transactions:', error);
      throw error;
    }
  },

  // Create a new inventory pool
  createPool: async (poolData) => {
    try {
      const { data } = await api.post('/inventory/pools',
        poolData,
        {
          meta: { includeDcid: true },
        });
      return data;
    } catch (error) {
      console.error('Error creating pool:', error);
      throw error;
    }
  },

  createPoolTransaction: async (poolId, payload) => {
    try {
      const { data } = await api.post(
        `/inventory/pools/${poolId}/transactions`,
        payload,
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error creating pool transaction:', error);
      throw error;
    }
  },

  inwardPoolItems: async (poolId, inventoryItemIds) => {
    try {
      const { data } = await api.post(
        `/inventory/pools/${poolId}/items/inward`,
        { inventoryItemIds },
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error inwarding pool items:', error);
      throw error;
    }
  },

  getCustomerReservationItems: async (poolId, productId) => {
    try {
      const { data } = await api.get(
        `/inventory/pools/${poolId}/products/${productId}/customer-reservation-items`,
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error fetching customer reservation items:', error);
      throw error;
    }
  },

  // Delete all reservations for a specific customer
  deleteReservationsByCustomer: async (customerId) => {
    await api.delete(`/inventory/reservations/customer/${customerId}`);
  },

  // Get paginated transactions for a reservation
  getReservationTransactions: async (
    reservationId,
    productId = null,
    page = 0,
    size = 10,
    startDate = null,
    endDate = null
  ) => {
    try {
      const params = { page, size, productId, startDate, endDate };
      const { data } = await api.get(
        `/inventory/reservations/${reservationId}/transactions`,
        {
          params,
          meta: { includeDcid: true },
        }
      );
      return data;
    } catch (error) {
      console.error('Error fetching reservation transactions:', error);
      throw error;
    }
  },

  // Create a transaction for a reservation
  createReservationTransaction: async (reservationId, payload) => {
    try {
      const { data } = await api.post(
        `/inventory/reservations/${reservationId}/transactions`,
        payload,
        { meta: { includeDcid: true } }
      );
      return data;
    } catch (error) {
      console.error('Error creating reservation transaction:', error);
      throw error;
    }
  },


  getTransactionTypes: async () => {
    const TRANSACTION_TYPES = [
      "INWARD_ITEMS",
      "DELIVERY_FRESH",
      "PICKUP_SOILED",
      "PICKUP_HEAVY_SOILED",
      "PICKUP_DAMAGED",
      "SEND_SOILED_TO_LAUNDRY",
      "SEND_HEAVY_SOILED_TO_LAUNDRY",
      "RECEIVE_FROM_LAUNDRY_FRESH",
      "RECEIVE_FROM_LAUNDRY_SOILED",
      "RECEIVE_FROM_LAUNDRY_HEAVY_SOILED",
      "RECEIVE_FROM_LAUNDRY_DAMAGED",
      "OUTWARD_ITEMS",
      "OTHER",
    ];

    // For now return static list; later replace with API call
    return Promise.resolve(TRANSACTION_TYPES);
  },

  getInventoryItemTransactions: async (inventoryItemId, params = {}) => {
    try {
      const { startDate, endDate } = params;
      const queryParams = {};
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;

      const { data } = await api.get(
        `/inventory/items/${inventoryItemId}/transactions`,
        {
          params: queryParams,
          meta: { includeDcid: true },
        }
      );
      return data;
    } catch (error) {
      console.error("Error fetching inventory item transactions:", error);
      throw error;
    }
  },

  getPoolItemTransactions: async (poolItemId, params = {}) => {
    try {
      const { startDate, endDate } = params;
      const queryParams = {};
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;

      const { data } = await api.get(
        `/inventory/pool-items/${poolItemId}/status-transitions/date-range`,
        {
          params: queryParams,
          meta: { includeDcid: true },
        }
      );
      return data;
    } catch (error) {
      console.error("Error fetching pool item status transitions:", error);
      throw error;
    }
  },
};
