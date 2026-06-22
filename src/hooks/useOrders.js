import { useQuery } from "@tanstack/react-query";
import { format, endOfDay, startOfDay } from "date-fns";
import { orderService } from "../services/orderService";

const toLocalDateTimeString = (d, isEnd = false) => {
  if (!d) return null;
  const dt = isEnd ? endOfDay(d) : startOfDay(d);
  return format(dt, "yyyy-MM-dd'T'HH:mm:ss");
};

export const useRejectionOrders = () => {
  return useQuery({
    queryKey: ["rejectionOrders14Days"],
    queryFn: async () => {
      const getTwoWeeksAgoDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        return d;
      };
      const filter = {
        startDate: toLocalDateTimeString(getTwoWeeksAgoDate(), false),
        endDate: toLocalDateTimeString(new Date(), true),
        status: null,
        orderType: null,
        customerId: null,
        branchId: null,
      };
      const ordersData = await orderService.searchOrders(filter);
      return Array.isArray(ordersData) ? ordersData : (ordersData?.content ?? []);
    },
    staleTime: 60 * 1000,
  });
};
