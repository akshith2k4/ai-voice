import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the ItemDamageRequestDialog UI component.
 */
export function useCreateDamageRequestAgent({
  open,
  setValue,
  setCustomerSearchQuery,
  customerData,
  setSearchDate,
  sourceOptions,
  productOptions,
  reset,
  DAMAGE_SOURCE,
}) {
  useAgentForm("createDamageRequest", {
    fields: [
      {
        key: "requestDate",
        type: "date",
        set: (v) => setValue("requestDate", v ? new Date(v) : new Date()),
      },
      {
        key: "sourceType",
        type: "select",
        set: (v) => {
          setValue("sourceType", v);
          setValue("reportedBy", "");
          setValue("sourceId", "");
          setValue("productId", "");
        },
      },
      {
        key: "customer",
        type: "autocomplete",
        set: (customer) => {
          setValue("reportedBy", customer ? customer.id : "");
          setValue("sourceId", "");
          setValue("productId", "");
        },
        search: (q) => setCustomerSearchQuery(q),
        getOptions: () => customerData,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Customer')) || null;
        }
      },
      {
        key: "orderDate",
        type: "date",
        set: (v) => {
          if (v) {
            setSearchDate(new Date(v));
            setValue("sourceId", "");
          }
        }
      },
      {
        key: "sourceId",
        type: "select",
        set: (v) => {
          setValue("sourceId", v);
          setValue("productId", "");
        },
        getOptions: () => sourceOptions,
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setValue("notes", v),
      },
      {
        key: "product",
        type: "autocomplete",
        set: (product) => setValue("productId", product ? product.productId : ""),
        getOptions: () => productOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Product')) || null;
        }
      },
      {
        key: "quantity",
        type: "number",
        set: (v) => setValue("quantity", v),
      },
      {
        key: "price",
        type: "number",
        set: (v) => setValue("price", v),
      }
    ],
    clearAll: () => {
      reset({
        reportedBy: "",
        sourceType: DAMAGE_SOURCE.ORDER,
        sourceId: "",
        productId: "",
        quantity: "",
        price: "",
        notes: "",
        images: [],
        requestDate: new Date(),
      });
      setCustomerSearchQuery("");
      setSearchDate(new Date());
    }
  }, open);
}
