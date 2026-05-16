import api from "./apiService";

/**
 * Reader + RFID Scan APIs
 * NOTE:
 * - WebSocket handled separately (scannerSocketService)
 * - Session-based RFID flow (start → socket/results → stop/cancel)
 * - Backend contract: /api/readers, /api/rfid/*
 */

export const scannerService = {
  /* =======================
   * Readers APIs
   * ======================= */

  // Get all readers
  getAllReaders: async () => {
    const { data } = await api.get("/readers");
    return data;
  },

  // Get reader by readerId (NOT machineId as per new contract)
  getReaderByReaderId: async (readerId) => {
    const { data } = await api.get(`/readers/${readerId}`);
    return data;
  },

  // Create new reader
  createReader: async (payload) => {
    const { data } = await api.post("/readers", payload);
    return data;
  },

  // Delete reader by DB id (long)
  deleteReader: async (id) => {
    await api.delete(`/readers/${id}`);
  },

  // Update reader status (ONLINE | OFFLINE | SCANNING)
  updateReaderStatus: async (readerId, status) => {
    const { data } = await api.post(`/readers/${readerId}/status`, {
      status,
    });
    return data;
  },

  // Get active session for a reader (very useful for page refresh recovery)
  getActiveSessionByReader: async (readerId) => {
    const { data } = await api.get(
      `/rfid/readers/${readerId}/active-session`
    );
    return data;
  },

  /* =======================
   * RFID Scan Session APIs
   * ======================= */

  /**
   * Start Scan Session
   * payload example:
   * {
   *   readerId: "RDR-001",
   *   userId: 123,
   *   scanType: "PICKUP",
   *   quantityType: "OVERALL",
   *   referenceId: 456
   * }
   */
  startScan: async (payload) => {
    const { data } = await api.post("/rfid/scan/start", payload);
    return data;
  },

  /**
   * Stop Scan Session
   * Backend: POST /rfid/scan/{sessionId}/stop
   * (NO body required)
   */
  stopScan: async (sessionId) => {
    const { data } = await api.post(
      `/rfid/scan/${sessionId}/stop`
    );
    return data;
  },

  /**
   * Cancel Scan Session
   * Backend: POST /rfid/scan/{sessionId}/cancel
   */
  cancelScan: async (sessionId) => {
    const { data } = await api.post(
      `/rfid/scan/${sessionId}/cancel`
    );
    return data;
  },

  /**
   * Get Scan Session Status
   * Backend: GET /rfid/scan/{sessionId}/status
   */
  getScanStatus: async (sessionId) => {
    const { data } = await api.get(
      `/rfid/scan/${sessionId}/status`
    );
    return data;
  },

  /**
   * Get Scan Results (Fallback if websocket not used)
   * Backend: GET /rfid/scan/{sessionId}/results
   */
  getScanResults: async (sessionId) => {
    const { data } = await api.get(
      `/rfid/scan/${sessionId}/results`
    );
    return data;
  },
};
