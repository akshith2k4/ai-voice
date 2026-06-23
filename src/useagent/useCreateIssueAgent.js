import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateIssueDialog UI component.
 */
export function useCreateIssueAgent({
  open,
  setValue,
  getValues,
  reset,
  sourceOptions,
  entityOptions,
  productOptions,
  setProductQuery,
}) {
  useAgentForm("createIssue", {
    fields: [
      {
        key: "issueDate",
        type: "date",
        set: (v) => setValue("recordedDateTime", v ? new Date(v) : new Date()),
      },
      {
        key: "sourceType",
        type: "select",
        set: (v) => {
          setValue("sourceType", v);
          setValue("sourceId", undefined);
          setValue("sourceName", "");
          setValue("triggerEntityType", "");
          setValue("triggerEntityId", undefined);
        },
      },
      {
        key: "sourceName",
        type: "autocomplete",
        set: (source) => {
          if (source) {
            const id = source.id ?? source.customerId ?? source.vendorId;
            const name = source.name || source.customerName || source.laundryName || source.companyName || '';
            setValue("sourceId", id);
            setValue("sourceName", name);
            setValue("triggerEntityId", undefined);
          } else {
            setValue("sourceId", undefined);
            setValue("sourceName", "");
          }
        },
        getOptions: () => sourceOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Source Name')) || null;
        }
      },
      {
        key: "triggerEntity",
        type: "select",
        set: (v) => setValue("triggerEntityType", v),
      },
      {
        key: "orderDate",
        type: "date",
        set: (v) => {
          if (v) {
            const d = new Date(v);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,0);
            setValue("startDate", start);
            setValue("endDate", end);
          }
        }
      },
      {
        key: "orders",
        type: "select",
        set: (v) => {
          setValue("triggerEntityId", v);
          setValue("triggerEntityType", getValues("sourceType") === 'CUSTOMER' ? 'ORDER' : 'WASH_FULFILLMENT');
        },
        getOptions: () => entityOptions,
      },
      {
        key: "washDate",
        type: "date",
        set: (v) => {
          if (v) {
            const d = new Date(v);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,0);
            setValue("startDate", start);
            setValue("endDate", end);
          }
        }
      },
      {
        key: "issueType",
        type: "select",
        set: (v) => setValue("issueType", v),
      },
      {
        key: "status",
        type: "select",
        set: (v) => setValue("status", v),
      },
      {
        key: "description",
        type: "text",
        set: (v) => setValue("description", v),
      },
      {
        key: "product",
        type: "autocomplete",
        set: (product) => {
          const item = getValues("item") || {};
          setValue("item", { ...item, product });
        },
        search: (q) => setProductQuery(q),
        getOptions: () => productOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Product')) || null;
        }
      },
      {
        key: "quantity",
        type: "number",
        set: (v) => {
          const item = getValues("item") || {};
          setValue("item", { ...item, quantity: v });
        },
      }
    ],
    clearAll: () => reset(),
  }, open);
}
