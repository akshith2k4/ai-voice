import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the HotelDialog UI component.
 */
export function useCreateHotelAgent({
  open,
  setValue,
  getValues,
  reset,
  append,
}) {
  useAgentForm("createHotel", {
    fields: [
      // Basic Information
      { key: "name", type: "text", set: (v) => setValue("name", v) },
      { key: "phone", type: "text", set: (v) => setValue("phone", v) },
      { key: "email", type: "text", set: (v) => setValue("email", v) },
      { key: "status", type: "select", set: (v) => setValue("status", v) },
      { key: "type", type: "select", set: (v) => setValue("type", v) },
      // Registration
      { key: "gstin", type: "text", set: (v) => setValue("gstin", v) },
      { key: "pan", type: "text", set: (v) => setValue("pan", v) },
      // Billing Address
      { key: "billingAddressLine1", type: "text", set: (v) => setValue("billingAddress.addressLine1", v) },
      { key: "billingAddressLine2", type: "text", set: (v) => setValue("billingAddress.addressLine2", v) },
      { key: "billingCity", type: "text", set: (v) => setValue("billingAddress.city", v) },
      { key: "billingState", type: "text", set: (v) => setValue("billingAddress.state", v) },
      { key: "billingPincode", type: "text", set: (v) => setValue("billingAddress.pincode", v) },
      { key: "billingCountry", type: "text", set: (v) => setValue("billingAddress.country", v) },
      // Shipping Address
      { key: "shippingAddressLine1", type: "text", set: (v) => setValue("shippingAddress.addressLine1", v) },
      { key: "shippingAddressLine2", type: "text", set: (v) => setValue("shippingAddress.addressLine2", v) },
      { key: "shippingCity", type: "text", set: (v) => setValue("shippingAddress.city", v) },
      { key: "shippingState", type: "text", set: (v) => setValue("shippingAddress.state", v) },
      { key: "shippingPincode", type: "text", set: (v) => setValue("shippingAddress.pincode", v) },
      { key: "shippingCountry", type: "text", set: (v) => setValue("shippingAddress.country", v) },
    ],
    subForms: [
      {
        id: "contactPerson",
        add: () => append({ name: '', phone: '', email: '', tag: '' }),
        fields: [
          { key: "contactName", type: "text", setByIndex: (v, idx) => setValue(`contactPersons.${idx}.name`, v) },
          { key: "contactPhone", type: "text", setByIndex: (v, idx) => setValue(`contactPersons.${idx}.phone`, v) },
          { key: "contactEmail", type: "text", setByIndex: (v, idx) => setValue(`contactPersons.${idx}.email`, v) },
          { key: "contactTag", type: "text", setByIndex: (v, idx) => setValue(`contactPersons.${idx}.tag`, v) },
        ],
      },
    ],
    clearAll: () => reset(),
  }, open);
}
