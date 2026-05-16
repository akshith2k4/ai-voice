import api from './apiService.jsx';
import { getApiHeaders } from '../utils/apiHeaders';

const API_BASE_URL = '/soiled-inventory/wash-requests';

export const washRequestService = {
  search: async (filterDTO) => {
    const res = await api.post(`${API_BASE_URL}/search`, filterDTO, {
      headers: getApiHeaders(),
      meta: { includeDcid: true },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`${API_BASE_URL}/${id}`, {
      headers: getApiHeaders(),
    });
    return res.data;
  },

  create: async (createDTO) => {
    const res = await api.post(`${API_BASE_URL}`, createDTO, {
      headers: getApiHeaders(),
      meta: { includeDcid: true },
    });
    return res.data;
  },

  deleteById: async (id) => {
    const res = await api.delete(`${API_BASE_URL}/${id}`, {
      headers: getApiHeaders(),
      meta: { includeDcid: true },
    });
    return res.data;
  },

  getDeliveryChallanUrl: async (id) => {
    const res = await api.get(`${API_BASE_URL}/${id}/delivery-challan-url`, {
      headers: getApiHeaders(),
      meta: { includeDcid: true },
    });
    return res.data;
  },
};
