import { agentFormRegistry } from "./agentFormRegistry";

export function findRegistryField(form, fieldKey) {
  const mainField = (form.fields || []).find((f) => f.key === fieldKey);
  if (mainField) return mainField;

  for (const sf of form.subForms || []) {
    const subField = (sf.fields || []).find((f) => f.key === fieldKey);
    if (subField) return subField;
  }

  return null;
}

export async function fillRegistryField(formId, fieldKey, value, itemIndex) {
  const form = agentFormRegistry.get(formId);
  if (!form) return { success: false, reason: `Form not registered: ${formId}` };

  const field = findRegistryField(form, fieldKey);
  if (!field) return { success: false, reason: `Field not registered: ${fieldKey}` };

  try {
    if (itemIndex != null && field.setByIndex) {
      field.setByIndex(value, itemIndex);
    } else if (field.set) {
      field.set(value);
    } else {
      return { success: false, reason: `No setter for: ${fieldKey}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

export function searchRegistryField(formId, fieldKey, query) {
  const form = agentFormRegistry.get(formId);
  if (!form) return;

  const field = findRegistryField(form, fieldKey);
  if (field?.search) field.search(query);
}

export async function waitForRegistryOption(formId, fieldKey, searchText, timeout = 6000) {
  const start = Date.now();
  const needle = searchText.toLowerCase();

  while (Date.now() - start < timeout) {
    const form = agentFormRegistry.get(formId);
    if (!form) return null;

    const field = findRegistryField(form, fieldKey);
    if (!field?.getOptions) return null;

    const options = field.getOptions();
    if (Array.isArray(options) && options.length > 0) {
      const match = options.find((o) => {
        const label =
          typeof o === "string"
            ? o
            : o.label || o.name || o.customerName || o.productName || String(o);
        return label.toLowerCase().includes(needle);
      });
      if (match) return match;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

export function getRegistryFieldElement(formId, fieldKey, itemIndex) {
  const form = agentFormRegistry.get(formId);
  if (!form) return null;

  const field = findRegistryField(form, fieldKey);
  if (!field?.getElement) return null;

  return field.getElement(itemIndex);
}

export async function clearRegistryForm(formId) {
  const form = agentFormRegistry.get(formId);
  if (!form?.clearAll) return { success: false, reason: "No clearAll handler" };
  form.clearAll();
  return { success: true };
}

export async function addRegistryItem(formId, subFormId) {
  const form = agentFormRegistry.get(formId);
  if (!form) return { success: false, reason: `Form not registered: ${formId}` };

  const subForm = (form.subForms || []).find((s) => s.id === subFormId);
  if (!subForm?.add) return { success: false, reason: `Sub-form not found: ${subFormId}` };

  try {
    subForm.add();
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}
