import api from './apiService';

const API_BASE_URL = '/hotels';

export const hotelService = {
    getAllHotels: async () => {
        try {
            const response = await api.get(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching hotels:', error);
            throw error;
        }
    },

    getHotels: async (params = {}) => {
        try {
            const response = await api.get(API_BASE_URL, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching hotels:', error);
            throw error;
        }
    },

    searchHotels: async (name) => {
        const response = await api.get(`${ API_BASE_URL }/search`, {
params: { name }
        });
return response.data;
    },

createHotel: async (hotelData) => {
    try {
        const response = await api.post(API_BASE_URL, hotelData);
        return response.data;
    } catch (error) {
        console.error('Error creating hotel:', error);
        throw error;
    }
},

    updateHotel: async (id, hotelData) => {
        const response = await api.put(`${API_BASE_URL}/${id}`, hotelData);
        return response.data;
    },

        deleteHotel: async (id) => {
            await api.delete(`${API_BASE_URL}/${id}`);
        },

            updateCustomer: async (customerId, customerData) => {
                const response = await api.put(`${API_BASE_URL}/${customerId}`, customerData);
                return response.data;
            }
};
