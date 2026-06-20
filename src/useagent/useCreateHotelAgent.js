import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the HotelDialog UI component.
 */
export function useCreateHotelAgent({
  open,
  handleHotelFormChange,
  handleAddressChange,
  addContactPerson,
  handleContactPersonChange,
  resetForm,
}) {
  useAgentForm("createHotel", {
    fields: [
      // Basic Information
      { key: "name", type: "text", set: (v) => handleHotelFormChange("name", v) },
      { key: "phone", type: "text", set: (v) => handleHotelFormChange("phone", v) },
      { key: "email", type: "text", set: (v) => handleHotelFormChange("email", v) },
      { key: "status", type: "select", set: (v) => handleHotelFormChange("status", v) },
      { key: "type", type: "select", set: (v) => handleHotelFormChange("type", v) },
      // Registration
      { key: "gstin", type: "text", set: (v) => handleHotelFormChange("gstin", v) },
      { key: "pan", type: "text", set: (v) => handleHotelFormChange("pan", v) },
      // Billing Address
      { key: "billingAddressLine1", type: "text", set: (v) => handleAddressChange("billingAddress", "addressLine1", v) },
      { key: "billingAddressLine2", type: "text", set: (v) => handleAddressChange("billingAddress", "addressLine2", v) },
      { key: "billingCity", type: "text", set: (v) => handleAddressChange("billingAddress", "city", v) },
      { key: "billingState", type: "text", set: (v) => handleAddressChange("billingAddress", "state", v) },
      { key: "billingPincode", type: "text", set: (v) => handleAddressChange("billingAddress", "pincode", v) },
      { key: "billingCountry", type: "text", set: (v) => handleAddressChange("billingAddress", "country", v) },
      // Shipping Address
      { key: "shippingAddressLine1", type: "text", set: (v) => handleAddressChange("shippingAddress", "addressLine1", v) },
      { key: "shippingAddressLine2", type: "text", set: (v) => handleAddressChange("shippingAddress", "addressLine2", v) },
      { key: "shippingCity", type: "text", set: (v) => handleAddressChange("shippingAddress", "city", v) },
      { key: "shippingState", type: "text", set: (v) => handleAddressChange("shippingAddress", "state", v) },
      { key: "shippingPincode", type: "text", set: (v) => handleAddressChange("shippingAddress", "pincode", v) },
      { key: "shippingCountry", type: "text", set: (v) => handleAddressChange("shippingAddress", "country", v) },
    ],
    subForms: [
      {
        id: "contactPerson",
        add: addContactPerson,
        fields: [
          { key: "contactName", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "name", v) },
          { key: "contactPhone", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "phone", v) },
          { key: "contactEmail", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "email", v) },
          { key: "contactTag", type: "text", setByIndex: (v, idx) => handleContactPersonChange(idx, "tag", v) },
        ],
      },
    ],
    clearAll: resetForm,
  }, open);
}
