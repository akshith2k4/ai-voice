import api from './apiService.jsx';
import { getApiHeaders } from '../utils/apiHeaders';

const API_V2_ENDPOINT = '/soiled-inventory/wash-fulfillment/v2';
const API_V3_ENDPOINT = '/soiled-inventory/wash-fulfillment/v3';
const API_V4_ENDPOINT = '/soiled-inventory/wash-fulfillment/v4';
const KNOCK_OFF_ENDPOINT = '/soiled-inventory/wash-fulfillment/match-wash-requests';
const SEARCH_ENDPOINT = '/soiled-inventory/wash-fulfillment-requests/search';
const WASH_FULFILLMENT_SUMMARY_ENDPOINT = '/soiled-inventory/wash-fulfillment-summary';

export const washFulfillmentService = {
  search: async (startTime, endTime) => {
    try {
      const response = await api.post(
        SEARCH_ENDPOINT,
        { startTime, endTime },
        { headers: getApiHeaders(), meta: { includeDcid: true } }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching wash fulfillment requests:', error);
      throw error;
    }
  },

  createV2: async (payload) => {
    try {
      const response = await api.post(
        API_V2_ENDPOINT,
        payload,
        { headers: getApiHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating wash fulfillment request:', error);
      throw error;
    }
  },

  createV3: async (payload) => {
    try {
      const response = await api.post(
        API_V3_ENDPOINT,
        payload,
        { headers: getApiHeaders(), meta: { includeDcid: true } }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating wash fulfillment request (v3):', error);
      throw error;
    }
  },

  createV4: async (payload) => {
    try {
      const response = await api.post(
        API_V4_ENDPOINT,
        payload,
        { headers: getApiHeaders(), meta: { includeDcid: true } }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating wash fulfillment request (v4):', error);
      throw error;
    }
  },

  createKnockOff: async (payload) => {
    try {
      const response = await api.post(
        KNOCK_OFF_ENDPOINT,
        payload,
        { headers: getApiHeaders(), meta: { includeDcid: true } }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating knock-off wash fulfillment:', error);
      throw error;
    }
  },

  getFulfillmentsSummaryByWashRequestId: async (washRequestId) => {
    try {
      const response = await api.get(
        `${WASH_FULFILLMENT_SUMMARY_ENDPOINT}/${washRequestId}`,
        { headers: getApiHeaders(), meta: { includeDcid: true } }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching wash fulfillment requests by washRequestId:', error);
      throw error;
    }
  },
};
