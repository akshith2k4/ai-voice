import api from "./apiService";
import { BillingCycle } from "../models/BillingCycle";
import { BillingPreference } from "../models/BillingPreference";

const API_BASE_URL = "/invoices";

export const billingService = {
  getBillingPreferences: async (params = {}) => {
    const { data } = await api.get(
      `${API_BASE_URL}/billing-preferences`,
      {
        params: {
          billToId: params?.billToId,
          billToType: params?.billToType,
          page: params?.page,
          size: params?.size,
        },
      }
    );

    const content = Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data)
      ? data
      : [];

    return {
      items: content.map((item) =>
        BillingPreference.fromResponse(item)
      ),
      totalElements: data?.totalElements ?? content.length,
      totalPages: data?.totalPages ?? 0,
    };
  },

  createBillingPreference: async (payload) => {
    const { data } = await api.post(
      `${API_BASE_URL}/billing-preferences`,
      payload
    );

    return BillingPreference.fromResponse(data);
  },

  updateBillingPreference: async (id, payload) => {
    const { data } = await api.put(
      `${API_BASE_URL}/billing-preferences/${id}`,
      payload
    );

    return BillingPreference.fromResponse(data);
  },

  deleteBillingCycle: async (id) => {
    const response = await api.delete(`${API_BASE_URL}/billing-cycle/${id}`);
    return response.data;
  },

  getBillingCycles: async (params = {}) => {
    const { data } = await api.get(
      `${API_BASE_URL}/billing-cycles`,
      {
        params: {
          billToId: params?.billToId,
          billToType: params?.billToType,
          status: params?.status,
          invoiceStatus: params?.invoiceStatus,
          startAt: params?.startAt,
          endAt: params?.endAt,
          page: params?.page,
          size: params?.size,
        },
      }
    );

    const content = Array.isArray(data?.content)
      ? data.content
      : [];

    return {
      items: content.map((item) =>
        BillingCycle.fromResponse(item)
      ),
      totalElements: data?.totalElements || 0,
      totalPages: data?.totalPages || 0,
    };
  },

  processOrdersToBillable: async (payload) => {
    const { data } = await api.post(`${API_BASE_URL}/orders-to-billable`, payload);
    return data;
  },

  getBillingCycleDetails: async (id) => {
    const { data } = await api.get(`${API_BASE_URL}/billing-cycle/${id}`);
    return BillingCycle.fromResponse(data);
  },

  generateInvoiceForBillingCycle: async (billingCycleId) => {
    const { data } = await api.post(`${API_BASE_URL}/generate-invoice/billing-cycle/${billingCycleId}`);
    return data;
  },

  getBillingCycleAnnexureUrl: async (id) => {
    const { data } = await api.get(`${API_BASE_URL}/billing-cycle/${id}/annexure-url`);
    return data;
  },

  lockBillingCycle: async (id) => {
    const { data } = await api.post(`${API_BASE_URL}/billing-cycle/${id}/lock`);
    return data;
  },

  generateInvoices: async () => {
    const { data } = await api.post(`${API_BASE_URL}/internal/generate-invoices`);
    return data;
  },
};