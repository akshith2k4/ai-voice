import api from "./apiService";

const RFID_SCAN_DATA_API = "/rfid/scan/data";

export const helperService = {
  submitRfidScanData: async (payload) => {
    const { data } = await api.post(RFID_SCAN_DATA_API, payload);
    return data;
  },

  populateDeliveryItemsFromPacking: async (visitId) => {
    const { data } = await api.post(
      `/trips/visits/${visitId}/populate-delivery-items-from-packing`,
      {},
      {
        meta: { includeDcid: true },
      }
    );

    return data;
  },
};
