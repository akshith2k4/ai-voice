import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateReservationDialog UI component.
 */
export function useCreateReservationAgent({
  open,
  pools,
  handlePoolChange,
  setSelectedCustomer,
  setCustomerId,
  fetchCustomerOptions,
  customerOptions,
  setReservationType,
  setStartDate,
  setEndDate,
  setNotes,
  handleItemChange,
  setItems,
  setPoolProducts,
}) {
  useAgentForm("createReservation", {
    fields: [
      {
        key: "poolId",
        type: "select",
        set: (v) => {
          const pool = pools.find((p) => String(p.id) === String(v) || p.name.toLowerCase() === String(v).toLowerCase());
          if (pool) handlePoolChange(pool.id);
        },
      },
      {
        key: "customer",
        type: "autocomplete",
        set: (customer) => {
          setSelectedCustomer(customer);
          setCustomerId(customer ? customer.id : "");
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
        set: (v) => setReservationType(v),
      },
      {
        key: "startDate",
        type: "date",
        set: (v) => setStartDate(v ? v.slice(0, 16) : ""),
      },
      {
        key: "endDate",
        type: "date",
        set: (v) => setEndDate(v ? v.slice(0, 16) : ""),
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setNotes(v),
      }
    ],
    subForms: [
      {
        id: "reservationItem",
        fields: [
          {
            key: "quantity",
            type: "text",
            setByIndex: (val, idx) => handleItemChange(idx, "totalReservedQuantity", val),
          },
          {
            key: "qtyWithCustomer",
            type: "text",
            setByIndex: (val, idx) => handleItemChange(idx, "quantityAllocatedWithCustomer", val),
          }
        ]
      }
    ],
    clearAll: () => {
      setCustomerId("");
      setSelectedCustomer(null);
      setReservationType("");
      setNotes("");
      setStartDate("");
      setEndDate("");
      setItems([]);
      setPoolProducts({ id: "all", productItems: [] });
    }
  }, open);
}
