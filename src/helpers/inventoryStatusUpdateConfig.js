export const NEW_STATUS_OPTIONS = [
  "ACTIVE",
  "INACTIVE",
];

export const NEW_CONDITION_OPTIONS = [
  "FRESH",
  "SOILED",
  "DAMAGED",
];

export const TO_LOCATION_TYPE_OPTIONS = [
  "CUSTOMER",
  "WAREHOUSE",
  "LAUNDRY",
];

export function parseInventoryIds(value) {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const validIds = [];
  const invalidEntries = [];

  entries.forEach((entry) => {
    if (/^\d+$/.test(entry)) {
      validIds.push(Number(entry));
      return;
    }

    invalidEntries.push(entry);
  });

  return { validIds, invalidEntries };
}

export function validateForm(formValues) {
  const { validIds, invalidEntries } = parseInventoryIds(
    formValues.inventoryItemIds
  );

  const errors = {};

  if (validIds.length === 0) {
    errors.inventoryItemIds = "Enter at least one inventory item ID.";
  } else if (invalidEntries.length > 0) {
    errors.inventoryItemIds = `Invalid entries: ${invalidEntries.join(", ")}`;
  }

  if (!formValues.transactionReferenceId.trim()) {
    errors.transactionReferenceId = "Transaction reference ID is required.";
  } else if (!/^\d+$/.test(formValues.transactionReferenceId.trim())) {
    errors.transactionReferenceId =
      "Transaction reference ID must be numeric.";
  }

  if (!formValues.newStatus) {
    errors.newStatus = "Select a new status.";
  }

  if (!formValues.newCondition) {
    errors.newCondition = "Select a new condition.";
  }

  if (!formValues.toLocationType) {
    errors.toLocationType = "Select a location type.";
  }

  if (!formValues.toLocationReferenceId.trim()) {
    errors.toLocationReferenceId = "Location reference ID is required.";
  } else if (!/^\d+$/.test(formValues.toLocationReferenceId.trim())) {
    errors.toLocationReferenceId =
      "Location reference ID must be numeric.";
  }

  return {
    errors,
    parsedInventoryIds: validIds,
    invalidEntries,
    isValid: Object.keys(errors).length === 0,
  };
}

export function buildPayload(formValues, parsedInventoryIds) {
  return {
    inventoryItemIds: parsedInventoryIds,
    transactionReferenceId: Number(formValues.transactionReferenceId.trim()),
    newStatus: formValues.newStatus,
    newCondition: formValues.newCondition,
    toLocationType: formValues.toLocationType,
    toLocationReferenceId: Number(formValues.toLocationReferenceId.trim()),
  };
}
