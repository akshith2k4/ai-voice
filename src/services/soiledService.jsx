import api from "./apiService";

const API_BASE_URL = '/soiled-inventory';

const PRODUCT_CHECK_ENDPOINT = `/soiled-inventory/soiled-items/product-check`;

export const soiledService = {
    getAllSoiledInventory: async () => {
        try {
            const response = await api.get(API_BASE_URL);
            return response.data;
        } catch (error) {
            console.error("Error fetching soiled inventory:", error);
            throw error;
        }
    },

    /**
     * Fetch soiled quantities for a pool/vendor on a specific delivery date.
     * GET /api/soiled-inventory/soiled-quantities
     * Query params: poolId, vendorId, deliveryDate (ISO DATE: YYYY-MM-DD)
     * Returns: Array<{ productId: number, productName: string, soiledQuantity: number }>
     */
    // Accepts either (poolId, vendorId, deliveryDate) or a single payload object
    // Example payload: { poolId: number, vendorId: number, deliveryDate: 'YYYY-MM-DD' | Date }
    getSoiledQuantities: async (arg1, arg2, arg3) => {
        try {
            // Normalize arguments to support both call signatures
            let poolId, vendorId, deliveryDate;
            if (typeof arg1 === 'object' && arg1 !== null) {
                ({ poolId, vendorId, deliveryDate } = arg1);
            } else {
                poolId = arg1;
                vendorId = arg2;
                deliveryDate = arg3;
            }

            if (poolId == null || vendorId == null || !deliveryDate) {
                throw new Error("poolId, vendorId and deliveryDate are required");
            }

            // Backend expects ISO.DATE; send YYYY-MM-DD
            const toIsoDate = (val) => {
                if (!val) return null;
                if (val instanceof Date || Object.prototype.toString.call(val) === '[object Date]') {
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return null;
                    return d.toISOString().split('T')[0];
                }
                if (typeof val === 'string') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                }
                return null;
            };

            const dateOnly = toIsoDate(deliveryDate);
            if (!dateOnly) throw new Error("Invalid deliveryDate; expected Date or 'YYYY-MM-DD'");

            const response = await api.get(
                `${API_BASE_URL}/soiled-quantities`,
                {
                    params: { poolId, vendorId, deliveryDate: dateOnly },
                }
            );
            return response.data;
        } catch (error) {
            console.error("Error fetching soiled quantities:", error.response?.data || error);
            throw error;
        }
    },

    getAllProcessingRequests: async () => {
        try {
            const response = await api.get(
                `${API_BASE_URL}/processing-requests`
            );
            if (!response.data) {
                throw new Error("Empty response received from server");
            }
            return response.data;
        } catch (error) {
            if (error.code === "ECONNABORTED") {
                console.error("Request timed out");
                throw new Error("Request timed out. Please try again.");
            }
            if (error.response?.status === 200 && !error.response.data) {
                console.error("Incomplete response received");
                throw new Error(
                    "Incomplete response received. Please try again."
                );
            }
            console.error("Error fetching processing requests:", error);
            throw error;
        }
    },

    getProcessingRequestsByDate: async (startDate, endDate) => {
        try {
            console.log(
                "Fetching requests between:",
                startDate,
                "and",
                endDate
            );
            // Note: The original URL had /api/soiled/inventory/processing-requests/by-date (with /soiled/inventory)
            // But API_BASE_URL was /api/soiled-inventory (with hyphen)
            // Assuming /soiled-inventory is correct based on other endpoints, but checking original code:
            // Original: `${API_BASE_URL}/api/soiled/inventory/processing-requests/by-date`
            // Wait, API_BASE_URL was `${BASE_URL}`.
            // So it was `${BASE_URL}/api/soiled/inventory/processing-requests/by-date`
            // But getAllProcessingRequests used `${BASE_URL}/api/soiled-inventory/processing-requests`
            // There is a discrepancy in the original code: "soiled-inventory" vs "soiled/inventory".
            // I will assume "soiled-inventory" is the standard and "soiled/inventory" might be a typo or legacy.
            // However, to be safe, I should probably stick to what was there if I can't verify.
            // But "soiled/inventory" looks suspicious given "soiled-inventory" is used elsewhere.
            // Let's look at getProcessingRequestById: `${API_BASE_URL}/api/soiled/inventory/processing-requests/${id}`
            // And updateProcessingStatus: `${API_BASE_URL}/api/soiled/inventory/processing-requests/${id}/status`
            // It seems some endpoints use "soiled/inventory" and others "soiled-inventory".
            // I will preserve the path segments exactly as they were, just relative to /api.

            const response = await api.get(
                `/soiled/inventory/processing-requests/by-date`,
                {
                    params: {
                        startDate,
                        endDate,
                    },
                }
            );
            if (!response.data) {
                throw new Error("Empty response received from server");
            }
            return response.data;
        } catch (error) {
            if (error.code === "ECONNABORTED") {
                console.error("Request timed out");
                throw new Error("Request timed out. Please try again.");
            }
            console.error("Error fetching processing requests by date:", error);
            throw error;
        }
    },

    createProcessingRequest: async (requestData) => {
        try {
            console.log(
                "Sending processing request:",
                JSON.stringify(requestData, null, 2)
            );
            const response = await api.post(
                `${API_BASE_URL}/processing-requests`,
                requestData
            );
            if (!response.data) {
                throw new Error("Empty response received from server");
            }
            return response.data;
        } catch (error) {
            if (error.code === "ECONNABORTED") {
                console.error("Request timed out");
                throw new Error("Request timed out. Please try again.");
            }
            if (error.response?.status === 200 && !error.response.data) {
                console.error("Incomplete response received");
                throw new Error(
                    "Incomplete response received. Please try again."
                );
            }
            console.error("Error response:", error.response?.data);
            console.error("Full error:", error.response?.data || error);
            throw error;
        }
    },

    getProcessingRequestById: async (id) => {
        try {
            const response = await api.get(
                `/soiled/inventory/processing-requests/${id}`
            );
            return response.data;
        } catch (error) {
            console.error(
                `Error fetching processing request with ID ${id}:`,
                error
            );
            throw error;
        }
    },

    updateProcessingStatus: async (id, status) => {
        try {
            const response = await api.put(
                `/soiled/inventory/processing-requests/${id}/status`,
                null,
                {
                    params: { status },
                }
            );
            if (!response.data) {
                throw new Error("Empty response received from server");
            }
            return response.data;
        } catch (error) {
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            console.error(
                `Error updating processing status for request with ID ${id}:`,
                error
            );
            throw error;
        }
    },

    getProcessingRequests: async (filter) => {
        const response = await api.post(
            `${API_BASE_URL}/processing-requests/search`,
            filter
        );
        return response.data;
    },

    completeProcessingRequest: async (id) => {
        const response = await api.put(
            `${API_BASE_URL}/processing-requests/${id}/complete`
        );
        return response.data;
    },

    productCheck: async (payload) => {
        try {
            const response = await api.post(
                PRODUCT_CHECK_ENDPOINT,
                payload
            );
            return response.data;
        } catch (error) {
            console.error("Error in productCheck:", error);
            throw error;
        }
    },

    /**
     * Update damaged/soiled quantities for a wash fulfillment.
     * POST /api/soiled-inventory/wash-fulfillments/{fulfillmentId}/update-quantities
     * Body: { updates: [{ productId, damagedQuantity, soiledQuantity }] }
     */
    updateFulfillmentQuantities: async (fulfillmentId, updates) => {
        if (fulfillmentId == null) throw new Error("fulfillmentId is required");
        const payload = { updates: Array.isArray(updates) ? updates : [] };
        try {
            const response = await api.post(
                `${API_BASE_URL}/wash-fulfillments/${fulfillmentId}/update-quantities`,
                payload
            );
            return response.data;
        } catch (error) {
            console.error("Error updating fulfillment quantities:", error.response?.data || error);
            throw error;
        }
    },
};
