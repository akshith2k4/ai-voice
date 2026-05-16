import api from './apiService';


export const reservationService = {
  updateInventoryItems: async (reservationId, requestData) => {
    const response = await api.post(
      `/inventory/reservations/${reservationId}/update-inventory-items`,
      requestData
    );
    return response.data;
  }
};
