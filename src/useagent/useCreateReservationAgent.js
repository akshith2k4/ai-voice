import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateReservationDialog UI component.
 */
export function useCreateReservationAgent({
  open,
  pools,
  customerOptions,
  fetchCustomerOptions,
  setValue,
  getValues,
  reset,
}) {
  useAgentForm("createReservation", {
    fields: [
      {
        key: "poolId",
        type: "select",
        set: (v) => {
          const pool = pools.find((p) => String(p.id) === String(v) || p.name.toLowerCase() === String(v).toLowerCase());
          if (pool) setValue("poolId", pool.id);
        },
      },
      {
        key: "customer",
        type: "autocomplete",
        set: (customer) => {
          setValue("customer", customer);
        },
        search: fetchCustomerOptions,
        getOptions: () => customerOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Customer')) || null;
        }
      },
      {
        key: "reservationType",
        type: "select",
        set: (v) => setValue("reservationType", v),
      },
      {
        key: "startDate",
        type: "date",
        set: (v) => setValue("startDate", v ? v.slice(0, 16) : ""),
      },
      {
        key: "endDate",
        type: "date",
        set: (v) => setValue("endDate", v ? v.slice(0, 16) : ""),
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setValue("notes", v),
      }
    ],
    subForms: [
      {
        id: "reservationItem",
        fields: [
          {
            key: "quantity",
            type: "text",
            setByIndex: (val, idx) => {
              setValue(`items.${idx}.totalReservedQuantity`, val);
              const total = Number(val) || 0;
              const withCustomer = Number(getValues(`items.${idx}.quantityAllocatedWithCustomer`) || 0);
              setValue(`items.${idx}.quantityAllocatedWithDC`, Math.max(0, total - withCustomer));
            },
          },
          {
            key: "qtyWithCustomer",
            type: "text",
            setByIndex: (val, idx) => {
              setValue(`items.${idx}.quantityAllocatedWithCustomer`, val);
              const total = Number(getValues(`items.${idx}.totalReservedQuantity`) || 0);
              const withCustomer = Number(val) || 0;
              setValue(`items.${idx}.quantityAllocatedWithDC`, Math.max(0, total - withCustomer));
            },
          }
        ]
      }
    ],
    clearAll: () => reset(),
  }, open);
}
