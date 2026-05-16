import { useQuery, useMutation } from "@tanstack/react-query";
import { damageAssessmentService } from "../services/damageAssessmentService";
import { useQueryClient } from "@tanstack/react-query";

export function useDamageRequests(params) {
    return useQuery({
        queryKey: ["damageRequests", params],
        queryFn: () => damageAssessmentService.getDamageRequests(params),
    });
}

export function useDamageRequest(id) {
    return useQuery({
        queryKey: ["damageRequests", id],
        queryFn: () => damageAssessmentService.getDamageRequestById(id),
        enabled: !!id,
    });
}

export function useCreateDamageRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: damageAssessmentService.createDamageRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["damageRequests"] });
        },
    });
}

export function useUpdateDamageRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }) =>
            damageAssessmentService.updateDamageRequest(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["damageRequests"] });
        },
    });
}

export function useApproveDamageRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: damageAssessmentService.approveDamageRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["damageRequests"] });
        },
    });
}

export function useRejectDamageRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: damageAssessmentService.rejectDamageRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["damageRequests"] });
        },
    });
}
// Search Customers
export const useSearchCustomers = (query) => {
    return useQuery({
        queryKey: ["customers", "search", query],
        queryFn: async () => {
            if (!query || query.length < 2) return [];
            // Dynamic import to avoid cycles if simplified, or assume customerService is available
            const { customerService } = await import("../services/customerService");
            return customerService.searchCustomersByName(query);
        },
        enabled: !!query && query.length >= 2,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

// Search Orders
export const useSearchOrders = ({ customerId, startDate, endDate }, enabled) => {
    return useQuery({
        queryKey: ["orders", "search", customerId, startDate, endDate],
        queryFn: async () => {
            const { orderService } = await import("../services/orderService");
            return orderService.searchOrders({ customerId, startDate, endDate });
        },
        enabled: enabled && !!customerId && !!startDate && !!endDate,
    });
};

// Search Wash Fulfillments
export const useSearchWashFulfillments = ({ startDate, endDate }, enabled) => {
    return useQuery({
        queryKey: ["washFulfillments", "search", startDate, endDate],
        queryFn: async () => {
            const { washFulfillmentService } = await import("../services/washFulfillmentService");
            return washFulfillmentService.search(startDate, endDate);
        },
        enabled: enabled && !!startDate && !!endDate,
    });
};

// Search Laundry Vendors
export const useSearchLaundryVendors = () => {
    return useQuery({
        queryKey: ["laundryVendors", "all"],
        queryFn: async () => {
            const { laundryVendorService } = await import("../services/laundryVendorService");
            return laundryVendorService.getAllVendors();
        },
        staleTime: 1000 * 60 * 30, // 30 minutes
    });
};

export function useDeleteDamageRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: damageAssessmentService.deleteDamageRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["damageRequests"] });
        },
    });
}
