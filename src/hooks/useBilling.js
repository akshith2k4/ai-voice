import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingService } from "../services/billingService";

export function useBillingCycles(params) {
  return useQuery({
    queryKey: ["billingCycles", params],
    queryFn: () => billingService.getBillingCycles(params),
  });
}

export function useBillingCycleDetails(id) {
  return useQuery({
    queryKey: ["billingCycleDetails", id],
    queryFn: () => billingService.getBillingCycleDetails(id),
    enabled: !!id,
  });
}

export function useBillingPreferences(params) {
  return useQuery({
    queryKey: ["billingPreferences", params],
    queryFn: () => billingService.getBillingPreferences(params),
  });
}

export function useCreateBillingPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingService.createBillingPreference,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["billingPreferences"],
      });
    },
  });
}

export function useUpdateBillingPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) =>
      billingService.updateBillingPreference(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["billingPreferences"],
      });
    },
  });
}

export function useProcessOrdersToBillable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingService.processOrdersToBillable,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["billingCycles"],
      });
    },
  });
}

export function useGenerateInvoiceForBillingCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (billingCycleId) => billingService.generateInvoiceForBillingCycle(billingCycleId),
    onSuccess: (_, billingCycleId) => {
      queryClient.invalidateQueries({
        queryKey: ["billingCycles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["billingCycleDetails", billingCycleId],
      });
    },
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: billingService.generateInvoices,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["billingCycles"],
      });
    },
  });
}

export function useBillingCycleAnnexureUrl() {
  return useMutation({
    mutationFn: (id) => billingService.getBillingCycleAnnexureUrl(id),
  });
}

export function useLockBillingCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => billingService.lockBillingCycle(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({
        queryKey: ["billingCycles"],
      });
      queryClient.invalidateQueries({
        queryKey: ["billingCycleDetails", id],
      });
    },
  });
}