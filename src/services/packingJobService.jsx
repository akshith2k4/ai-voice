import api from "./apiService.jsx";

const PATH = "/packing/jobs";

export const packingJobService = {
  getJobs: async (params = {}) => {
    const { data } = await api.get(PATH, {
      params,
      meta: { includeDcid: true },
    });
    return data;
  },

  getJobsByRouteAndDate: async ({ routeId, date }) => {
    const { data } = await api.get("/packing/jobs/order-fulfillments/by-route", {
      params: { routeId, date },
      meta: { includeDcid: true },
    });
    return data;
  },

  getJob: async (jobId) => {
    const { data } = await api.get(`${PATH}/${jobId}`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  getJobBySource: async (referenceType, referenceId) => {
    const { data } = await api.get(`/packing/sources/${referenceType}/${referenceId}`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  createJob: async (payload) => {
    const { data } = await api.post(PATH, payload, {
      meta: { includeDcid: true },
    });
    return data;
  },

  replaceProductItems: async (jobId, payload) => {
    const { data } = await api.put(`${PATH}/${jobId}/product-items`, payload, {
      meta: { includeDcid: true },
    });
    return data;
  },

  assignPacker: async (payload) => {
    const { data } = await api.post("/packing/assignments", payload, {
      meta: { includeDcid: true },
    });
    return data;
  },

  assignBulk: async (payload) => {
    const { data } = await api.post("/packing/assignments/assign-bulk", payload, {
      meta: { includeDcid: true },
    });
    return data;
  },

  getAssignments: async (jobId) => {
    const { data } = await api.get(`${PATH}/${jobId}/assignments`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  getSessions: async (jobId) => {
    const { data } = await api.get(`${PATH}/${jobId}/sessions`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  unassignAssignment: async (assignmentId) => {
    const { data } = await api.patch(`/packing/assignments/${assignmentId}/unassign`, null, {
      meta: { includeDcid: true },
    });
    return data;
  },
  
  clearSessions: async (assignmentId) => {
    const { data } = await api.delete(`/packing/assignments/${assignmentId}/clear-sessions`, {
      meta: { includeDcid: true },
    });
    return data;
  },

  createSession: async (jobId, payload) => {
    const { data } = await api.post(`${PATH}/${jobId}/sessions`, payload, {
      meta: { includeDcid: true },
    });
    return data;
  },

  getActiveAssignmentForSource: async (sourceType, sourceId) => {
    const { data } = await api.get(`/packing/assignments/active/source/${sourceType}/${sourceId}`, {
      meta: { includeDcid: true },
    });
    return data;
  },
};
