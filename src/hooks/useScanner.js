import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scannerService } from "../services/scannerService";

/* =====================
 * Get Readers
 * GET /api/readers
 * ===================== */
export function useScanners() {
  return useQuery({
    queryKey: ["readers"],
    queryFn: () => scannerService.getAllReaders(),
    staleTime: 1000 * 60 * 5,
  });
}

/* =====================
 * Get Active Session for Reader (NEW CONTRACT API)
 * GET /api/rfid/readers/{readerId}/active-session
 * ===================== */
export function useActiveScanSession(readerId) {
  return useQuery({
    queryKey: ["scanSession", readerId],
    queryFn: () =>
      scannerService.getActiveSessionByReader(readerId),
    enabled: !!readerId,
  });
}

/* =====================
 * Start RFID Scan
 * POST /api/rfid/scan/start
 * ===================== */
export function useStartScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => scannerService.startScan(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readers"] });
    },
  });
}

/* =====================
 * Stop RFID Scan
 * POST /api/rfid/scan/{sessionId}/stop
 * ===================== */
export function useStopScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId }) =>
      scannerService.stopScan(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readers"] });
    },
  });
}

/* =====================
 * Cancel RFID Scan
 * POST /api/rfid/scan/{sessionId}/cancel
 * ===================== */
export function useCancelScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId }) =>
      scannerService.cancelScan(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readers"] });
    },
  });
}
