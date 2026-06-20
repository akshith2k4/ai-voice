import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateIssueDialog UI component.
 */
export function useCreateIssueAgent({
  open,
  setFormField,
  handleSourceTypeChange,
  handleSourceSelect,
  sourceOptions,
  setForm,
  entityOptions,
  setSingleItemField,
  setProductQuery,
  productOptions,
  resetState,
}) {
  useAgentForm("createIssue", {
    fields: [
      {
        key: "issueDate",
        type: "date",
        set: (v) => setFormField("recordedDateTime", v ? new Date(v) : new Date()),
      },
      {
        key: "sourceType",
        type: "select",
        set: (v) => handleSourceTypeChange(v),
      },
      {
        key: "sourceName",
        type: "autocomplete",
        set: (source) => {
          if (source) {
            const id = source.id ?? source.customerId ?? source.vendorId;
            handleSourceSelect(id);
          } else {
            setFormField("sourceId", undefined);
            setFormField("sourceName", "");
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
        set: (v) => setFormField("triggerEntityType", v),
      },
      {
        key: "orderDate",
        type: "date",
        set: (v) => {
          if (v) {
            const d = new Date(v);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,0);
            setForm((prev) => ({ ...prev, startDate: start, endDate: end }));
          }
        }
      },
      {
        key: "orders",
        type: "select",
        set: (v) => {
          setForm((prev) => ({
            ...prev,
            triggerEntityId: v,
            triggerEntityType: prev.sourceType === 'CUSTOMER' ? 'ORDER' : 'WASH_FULFILLMENT'
          }));
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
            setForm((prev) => ({ ...prev, startDate: start, endDate: end }));
          }
        }
      },
      {
        key: "issueType",
        type: "select",
        set: (v) => setFormField("issueType", v),
      },
      {
        key: "status",
        type: "select",
        set: (v) => setFormField("status", v),
      },
      {
        key: "description",
        type: "text",
        set: (v) => setFormField("description", v),
      },
      {
        key: "product",
        type: "autocomplete",
        set: (product) => setSingleItemField("product", product),
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
        set: (v) => setSingleItemField("quantity", v),
      }
    ],
    clearAll: resetState,
  }, open);
}
