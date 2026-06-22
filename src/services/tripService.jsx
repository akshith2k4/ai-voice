import api from './apiService.jsx';

export const tripService = {
  searchTrips: async (startDate, endDate) => {
    const response = await api.get('/trips/search', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      meta: { includeDcid: true },
    });
    return response.data;
  },

  createTrip: async (tripData) => {
    const response = await api.post('/trips', tripData, {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  addVisit: async (visitData) => {
    const response = await api.post(`/trips/${visitData.tripId}/visits`, visitData, {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  getTripDetails: async (tripId) => {
    const response = await api.get(`/trips/${tripId}/details`);
    console.log("trip details", response.data)
    return response.data;
  },

  getIncompleteOrders: async (customerId) => {
    const response = await api.get(`/orders/customers/${customerId}/incomplete`, {
      meta: { includeDcid: true }, 
    });
    return response.data;
  },

  getDrivers: async () => {
    const response = await api.get('/users/active', {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  addVehicle: async (vehicleData) => {
    const response = await api.post('/trips/vehicles', vehicleData, {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  updateVisit: async (visitId, updateVisitRequest) => {
    try {
      const response = await api.put(`/trips/visits/${visitId}`, updateVisitRequest);
      return response.data;
    } catch (error) {
      console.error('Error updating visit:', error.response?.data || error);
      throw new Error(`Failed to update visit: ${error.response?.data?.message || error.message}`);
    }
  },

  getVehiclesByBranch: async (branchId) => {
    const response = await api.get(`/trips/vehicles/branch/${branchId}`, {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  deleteTripById: async (tripId) => {
    await api.delete(`/trips/${tripId}`);
  },

  assignDriverAndVehicle: async (tripId, assignData) => {
    await api.put(`/trips/${tripId}/assign`, assignData);
  },

  completeVisit: async (visitId, completeVisitDTO) => {
    try {
      const response = await api.put(`/trips/visits/${visitId}/complete`, completeVisitDTO);
      return response.data;
    } catch (error) {
      console.error('Error completing visit:', error);
      throw error;
    }
  },

  addReconciliation: async (visitId, visitOrderRequestId, reconciliationData) => {
    try {
      const response = await api.post(
        `/trips/visits/${visitId}/visitOrderRequest/${visitOrderRequestId}/reconciliation`,
        reconciliationData
      );
      return response.data;
    } catch (error) {
      console.error('Error adding reconciliation:', error);
      throw error;
    }
  },

  getProducts: async () => {
    try {
      const response = await api.get('/products', {
        meta: { includeDcid: true }, 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  removeVehicle: async (vehicleId) => {
    await api.delete(`/trips/vehicles/${vehicleId}`);
  },

  completeDeliveryRequest: async (tripId, visitId, completionData) => {
    try {
      const response = await api.post(
        `/trips/${tripId}/visits/${visitId}/complete`,
        completionData
      );
      return response.data;
    } catch (error) {
      console.error('Error in completeDeliveryRequest:', error.response?.data || error);
      throw new Error(`Failed to complete delivery request: ${error.response?.data?.message || error.message}`);
    }
  },

  completePickupRequest: async (tripId, visitId, pickupRequestId, completionData) => {
    try {
      const response = await api.post(
        `/trips/visits/${visitId}/pickup-requests/${pickupRequestId}/complete`,
        completionData
      );
      return response.data;
    } catch (error) {
      console.error('Error completing pickup request:', error.response?.data || error);
      throw new Error(`Failed to complete pickup request: ${error.response?.data?.message || error.message}`);
    }
  },

  uploadDeliveryChallan: async (visitId, file, targetLevelReferenceType, targetLevelReferenceId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetLevelReferenceType) {
      formData.append('targetLevelReferenceType', targetLevelReferenceType);
    }
    if (targetLevelReferenceId) {
      formData.append('targetLevelReferenceId', targetLevelReferenceId);
    }
    try {
      const response = await api.post(`/trips/visits/${visitId}/delivery-challans/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        meta: { includeDcid: true },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading delivery challan:', error.response?.data || error);
      throw new Error(`Failed to upload delivery challan: ${error.response?.data?.message || error.message}`);
    }
  },

  uploadDeliveryChallanWithNumber: async (visitId, file, challanNumber) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('challanNumber', challanNumber);

    try {
      const response = await api.post(
        `/trips/visits/${visitId}/delivery-challans/upload-with-number`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          meta: { includeDcid: true },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        'Error uploading delivery challan with number:',
        error.response?.data || error
      );
      throw new Error(
        `Failed to upload delivery challan with number: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  },

  updateDeliveryChallanNumber: async (visitId, request) => {
    try {
      const response = await api.put(
        `/trips/visits/${visitId}/delivery-challans/update-number`,
        request
      );
      return response.data;
    } catch (error) {
      console.error('Error updating delivery challan number:', error.response?.data || error);
      throw new Error(`Failed to update delivery challan number: ${error.response?.data?.message || error.message}`);
    }
  },

  removeDeliveryChallanFromVisit: async (visitId, challanNumber) => {
    try {
      const response = await api.delete(
        `/trips/visits/${visitId}/delivery-challans`,
        { params: { challanNumber } }
      );
      return response.data;
    } catch (error) {
      console.error('Error removing delivery challan:', error.response?.data || error);
      throw new Error(`Failed to remove delivery challan: ${error.response?.data?.message || error.message}`);
    }
  },

  createTripFromRoute: async (createRequest) => {
    try {
      const response = await api.post('/trips/create-from-route', createRequest, {
        meta: { includeDcid: true },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating trip from route:', error.response?.data || error);
      throw error;
    }
  },

  fetchOrdersByCustomerAndDate: async (customerIds, deliveryDate) => {
    try {
      const toLocalDateTimeSeconds = (val) => {
        if (!val) return null;
        const pad = (n) => String(n).padStart(2, '0');
        const build = (d) => {
          const y = d.getFullYear();
          const m = pad(d.getMonth() + 1);
          const da = pad(d.getDate());
          const h = pad(d.getHours());
          const mi = pad(d.getMinutes());
          const s = pad(d.getSeconds());
          return `${y}-${m}-${da}T${h}:${mi}:${s}`;
        };
        if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
          const d = new Date(val);
          if (isNaN(d.getTime())) return null;
          return build(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
        }
        if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [Y, M, D] = val.split('-').map(Number);
            const d = new Date(Y, M - 1, D);
            return build(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
          }
          if (/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+$/.test(val)) {
            return val.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+$/, '$1');
          }
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) return val;
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return build(d);
      };

      const dateTime = toLocalDateTimeSeconds(deliveryDate);
      const payload = { customerIds, deliveryDate: dateTime };

      const response = await api.post('/orders/by-customers-and-date', payload, {
        meta: { includeDcid: true }, 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders by customers and date:', error.response?.data || error);
      throw error;
    }
  },

  fetchWashRequestsByVendorsAndDate: async (vendorIds, deliveryDate) => {
    try {
      const toLocalDateTimeSeconds = (val) => {
        if (!val) return null;
        const pad = (n) => String(n).padStart(2, '0');
        const build = (d) => {
          const y = d.getFullYear();
          const m = pad(d.getMonth() + 1);
          const da = pad(d.getDate());
          const h = pad(d.getHours());
          const mi = pad(d.getMinutes());
          const s = pad(d.getSeconds());
          return `${y}-${m}-${da}T${h}:${mi}:${s}`;
        };
        if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
          const d = new Date(val);
          if (isNaN(d.getTime())) return null;
          return build(new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
        }
        if (typeof val === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [Y, M, D] = val.split('-').map(Number);
            const d = new Date(Y, M - 1, D);
            return build(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0));
          }
          if (/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+$/.test(val)) {
            return val.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+$/, '$1');
          }
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) return val;
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return null;
        return build(d);
      };

      const dateTime = toLocalDateTimeSeconds(deliveryDate);
      const payload = { vendorIds, deliveryDate: dateTime };

      const response = await api.post('/soiled-inventory/wash-requests/by-vendors-and-date', payload, {
        meta: { includeDcid: true }, 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching wash requests by vendors and date:', error.response?.data || error);
      throw error;
    }
  },

  fetchScheduledTasksByDate: async (customerIds, vendorIds, date) => {
    try {
      const response = await api.post('/trips/scheduled-tasks/by-date', {
        customerIds,
        vendorIds,
        date: date.toISOString().split('T')[0]
      }, {
        meta: { includeDcid: true },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error.response?.data || error);
      throw error;
    }
  },

  getRoutes: async () => {
    try {
      const response = await api.get('/trips/routes', {
        meta: { includeDcid: true }, 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching routes:', error.response?.data || error);
      throw error;
    }
  },

  assignPoints: async (routeId, pointsData) => {
    try {
      const response = await api.post(`/trips/routes/${routeId}/assign-points`, pointsData);
      return response.data;
    } catch (error) {
      console.error('Error assigning points:', error.response?.data || error);
      throw error;
    }
  },

  removePoints: async (routeId, pointsData) => {
    try {
      const response = await api.delete(`/trips/routes/${routeId}/remove-points`, { data: pointsData });
      return response.data;
    } catch (error) {
      console.error('Error removing points:', error.response?.data || error);
      throw error;
    }
  },

  deleteVisit: async (tripId, visitId) => {
    await api.delete(`/trips/${tripId}/visits/${visitId}`);
  },

  reconcileTrip: async (tripId) => {
    const response = await api.post(`/trips/${tripId}/reconcile`);
    return response.data;
  },

  completeTrip: async (tripId, completedDate) => {
    const response = await api.post(`/trips/${tripId}/complete`, null, {
      params: { completedDate },
    });
    return response.data;
  },
};

export default tripService;
