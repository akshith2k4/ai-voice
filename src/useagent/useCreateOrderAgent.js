import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateOrderDialog UI component.
 */
export function useCreateOrderAgent({
  open,
  products,
  customerOptions,
  handleInputChange,
  handleOrderDateChange,
  setSelectedCustomer,
  debouncedFetchCustomerOptions,
  handleAddItem,
  handleItemChange,
  resetForm,
}) {
  useAgentForm("createOrder", {
    fields: [
      {
        key: "orderReferenceId",
        type: "text",
        set: (v) => handleInputChange("orderReferenceId", v),
      },
      {
        key: "customer",
        type: "autocomplete",
        set: (customer) => {
          setSelectedCustomer(customer);
          handleInputChange("customerId", customer ? customer.id : "");
        },
        search: debouncedFetchCustomerOptions,
        getOptions: () => customerOptions,
        getElement: () =>
          document.querySelector('[name="customerId"]')?.closest('.MuiAutocomplete-root') || null,
      },
      {
        key: "orderDate",
        type: "date",
        set: (v) => handleOrderDateChange(new Date(v)),
      },
      {
        key: "orderType",
        type: "select",
        set: (v) => handleInputChange("orderType", v),
      },
      {
        key: "orderCategory",
        type: "select",
        set: (v) => handleInputChange("orderCategory", v),
      },
      {
        key: "deliveryType",
        type: "select",
        set: (v) => handleInputChange("deliveryType", v),
      },
      {
        key: "pickupDate",
        type: "date",
        set: (v) => handleInputChange("pickupDate", new Date(v)),
      },
      {
        key: "deliveryDate",
        type: "date",
        set: (v) => handleInputChange("deliveryDate", new Date(v)),
      },
    ],
    subForms: [
      {
        id: "deliveryItem",
        add: () => handleAddItem("deliveryItems"),
        fields: [
          {
            key: "product",
            type: "select",
            setByIndex: (val, idx) => {
              const productId = typeof val === 'string'
                ? (products.find(p => p.name.toLowerCase() === val.toLowerCase())?.id || val)
                : (val && val.id ? val.id : val);
              handleItemChange(idx, "productId", productId, "deliveryItems");
            },
          },
          {
            key: "quantity",
            type: "text",
            setByIndex: (val, idx) =>
              handleItemChange(idx, "quantity", val, "deliveryItems"),
          },
          {
            key: "remarks",
            type: "text",
            setByIndex: (val, idx) =>
              handleItemChange(idx, "remarks", val, "deliveryItems"),
          },
        ],
      },
      {
        id: "pickupItem",
        add: () => handleAddItem("pickupItems"),
        fields: [
          {
            key: "product",
            type: "select",
            setByIndex: (val, idx) => {
              const productId = typeof val === 'string'
                ? (products.find(p => p.name.toLowerCase() === val.toLowerCase())?.id || val)
                : (val && val.id ? val.id : val);
              handleItemChange(idx, "productId", productId, "pickupItems");
            },
          },
          {
            key: "quantity",
            type: "text",
            setByIndex: (val, idx) =>
              handleItemChange(idx, "quantity", val, "pickupItems"),
          },
          {
            key: "remarks",
            type: "text",
            setByIndex: (val, idx) =>
              handleItemChange(idx, "remarks", val, "pickupItems"),
          },
        ],
      },
    ],
    clearAll: resetForm,
  }, open);
}
