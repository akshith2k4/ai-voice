// damageAssessmentService.jsx
import api from "./apiService";
import { ItemDamageRequest } from "../models/ItemDamageRequest";

const API_BASE_URL = "/damage-assessment/item-damage-request";

export const damageAssessmentService = {
  getDamageRequests: async (params) => {
    const { data } = await api.get(`${API_BASE_URL}/list`, {
      params,
      meta: { includeDcid: true },
    });
    if (Array.isArray(data)) {
      return data.map((item) => ItemDamageRequest.fromResponse(item));
    }
    return [];
  },

  getDamageRequestById: async (id) => {
    const { data } = await api.get(`${API_BASE_URL}/${id}`, {
      meta: { includeDcid: true },
    });
    return ItemDamageRequest.fromResponse(data);
  },

  createDamageRequest: async (payload) => {
    const apiPayload = ItemDamageRequest.toCreatePayload(payload);
    const { data } = await api.post(`${API_BASE_URL}/create`, apiPayload, {
      meta: { includeDcid: true },
    });
    return ItemDamageRequest.fromResponse(data);
  },

  updateDamageRequest: async (id, payload) => {
    const apiPayload = ItemDamageRequest.toUpdatePayload(payload);
    const { data } = await api.put(`${API_BASE_URL}/${id}`, apiPayload, {
      meta: { includeDcid: true },
    });
    return ItemDamageRequest.fromResponse(data);
  },

  approveDamageRequest: async (id) => {
    const { data } = await api.post(
      `${API_BASE_URL}/${id}/approve`,
      {},
      { meta: { includeDcid: true } }
    );
    return ItemDamageRequest.fromResponse(data);
  },

  rejectDamageRequest: async (id) => {
    const { data } = await api.post(
      `${API_BASE_URL}/${id}/reject`,
      {},
      { meta: { includeDcid: true } }
    );
    return ItemDamageRequest.fromResponse(data);
  },

  deleteDamageRequest: async (id) => {
    await api.delete(`${API_BASE_URL}/${id}`, {
      meta: { includeDcid: true },
    });
  },
};
