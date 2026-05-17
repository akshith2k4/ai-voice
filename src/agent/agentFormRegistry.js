// ============================================
// Agent Form Registry
// Global registry where form components expose
// their state setters. No DOM manipulation.
// ============================================

class AgentFormRegistry {
  constructor() {
    this.forms = new Map();
  }

  register(formId, api) {
    this.forms.set(formId, api);
    console.log(`[AgentRegistry] Registered: ${formId} (${api.fields?.length || 0} fields)`);
  }

  unregister(formId) {
    this.forms.delete(formId);
    console.log(`[AgentRegistry] Unregistered: ${formId}`);
  }

  has(formId) {
    return this.forms.has(formId);
  }

  /**
   * Fill a field using the form's own state setter.
   */
  async fillField(formId, fieldKey, value, itemIndex) {
    const form = this.forms.get(formId);
    if (!form) return { success: false, reason: `Form not registered: ${formId}` };

    const field = this.findField(form, fieldKey);
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

  /**
   * Trigger search for an autocomplete field.
   */
  searchField(formId, fieldKey, query) {
    const form = this.forms.get(formId);
    if (!form) return;

    const field = this.findField(form, fieldKey);
    if (field?.search) field.search(query);
  }

  /**
   * Poll getOptions() until a match appears.
   */
  async waitForOption(formId, fieldKey, searchText, timeout = 6000) {
    const form = this.forms.get(formId);
    if (!form) return null;

    const field = this.findField(form, fieldKey);
    if (!field?.getOptions) return null;

    const start = Date.now();
    const needle = searchText.toLowerCase();

    while (Date.now() - start < timeout) {
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

  /**
   * Get the DOM element for spotlight (if the form provided refs).
   */
  getFieldElement(formId, fieldKey, itemIndex) {
    const form = this.forms.get(formId);
    if (!form) return null;

    const field = this.findField(form, fieldKey);
    if (!field?.getElement) return null;

    return field.getElement(itemIndex);
  }

  /**
   * Clear all fields using the form's own reset function.
   */
  async clearForm(formId) {
    const form = this.forms.get(formId);
    if (!form?.clearAll) return { success: false, reason: "No clearAll handler" };
    form.clearAll();
    return { success: true };
  }

  /**
   * Add a sub-form item using the form's own add function.
   */
  async addItem(formId, subFormId) {
    const form = this.forms.get(formId);
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

  // --- Private ---

  findField(form, fieldKey) {
    // Check main fields
    const mainField = (form.fields || []).find((f) => f.key === fieldKey);
    if (mainField) return mainField;

    // Check sub-form fields
    for (const sf of form.subForms || []) {
      const subField = (sf.fields || []).find((f) => f.key === fieldKey);
      if (subField) return subField;
    }

    return null;
  }
}

export const agentFormRegistry = new AgentFormRegistry();
