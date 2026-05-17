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

  get(formId) {
    return this.forms.get(formId);
  }
}

export const agentFormRegistry = new AgentFormRegistry();
