import api from './apiService';

const API_BASE_URL = '/products';
const API_URL = '/api'; // This seems redundant if we use apiService which has baseURL /api

export const productService = {
    getAllProducts: async () => {
        try {
            const response = await api.get(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    searchProducts: async (name) => {
        const response = await api.get(`${API_BASE_URL}/search`, {
            params: { name }
        });
        return response.data;
    },

    createProduct: async (productData) => {
        const response = await api.post(API_BASE_URL, productData);
        return response.data;
    },

    updateProduct: async (id, productData) => {
        const response = await api.put(`${API_BASE_URL}/${id}`, productData);
        return response.data;
    },

    deleteProduct: async (id) => {
        const response = await api.delete(`${API_BASE_URL}/${id}`);
        return response.data;
    },

    getProductCategories: async () => {
        const response = await api.get(`${API_BASE_URL}/categories`);
        return response.data;
    },

    getProducts: async () => {
        try {
            const response = await api.get('/products');
            return response.data;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    getReservedProductsByCustomerId: async (customerId) => {
        try {
            const response = await api.get(
                `/inventory/customers/${customerId}/reserved-products`
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching reserved products:", error);
            throw error;
        }
    },

};

export default productService;