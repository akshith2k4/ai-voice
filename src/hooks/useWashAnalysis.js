import { useQuery } from "@tanstack/react-query";
import { addDays, endOfDay, endOfMonth, format, startOfMonth } from "date-fns";
import { washRequestService } from "../services/washRequestService";
import { washFulfillmentService } from "../services/washFulfillmentService";

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
};

export function useWashAnalysis(monthDate) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const fulfillmentEnd = endOfDay(addDays(monthEnd, 1));

  return useQuery({
    queryKey: ["washAnalysis", format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const [requestsResponse, fulfillmentsResponse] = await Promise.all([
        washRequestService.search({
          startTime: format(monthStart, "yyyy-MM-dd"),
          endTime: format(monthEnd, "yyyy-MM-dd"),
          filterType: "CREATED_TIME",
        }),
        washFulfillmentService.search(monthStart.toISOString(), fulfillmentEnd.toISOString()),
      ]);

      return {
        washRequests: toArray(requestsResponse),
        washFulfillments: toArray(fulfillmentsResponse),
      };
    },
  });
}
