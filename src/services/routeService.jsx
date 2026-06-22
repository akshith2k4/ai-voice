import api from './apiService.jsx'; 

export const routeService = {
  getRoutes: async () => {
    const response = await api.get('/trips/routes', {
      meta: { includeDcid: true },
    });
    return response.data;
  },

  createRoute: async (name) => {
    const response = await api.post(
      '/trips/routes',
      { name },
      { meta: { includeDcid: true } },
    );
    return response.data;
  },

  assignPoints: async (routeId, routePoints) => {
    const response = await api.post(
      `/trips/routes/${routeId}/assign-points`,
      { routePoints },
    );
    return response.data;
  },

  removePoints: async (routeId, routePoints) => {
    const response = await api.delete(
      `/trips/routes/${routeId}/remove-points`,
      { data: { routePoints } },
    );
    return response.data;
  },

  updatePointsSequence: async (routeId, routePoints) => {
    const response = await api.put(
      `/trips/routes/${routeId}/update-points-sequence`,
      { routePoints },
    );
    return response.data;
  },

  getAllCustomers: async () => {
    const response = await api.get('/customers', {
      meta: { includeDcid: true },
    });
    const data = response.data;
    return Array.isArray(data?.content) ? data.content : data;
  },

  deleteRoute: async (routeId) => {
    const response = await api.delete(`/trips/routes/${routeId}`);
    return response.data;
  },
};

export default routeService;
