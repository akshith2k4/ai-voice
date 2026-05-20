// ============================================
// useAgentForm Hook
// Registers a form's API with the agent registry.
// Purely additive — no existing logic changed.
// ============================================

import { useEffect, useRef } from "react";
import { agentFormRegistry } from "./agentFormRegistry";
import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

export function useAgentForm(formId, formApi) {
  const apiRef = useRef(formApi);
  apiRef.current = formApi;

  useEffect(() => {
    const proxy = {
      get fields() { return apiRef.current.fields; },
      get subForms() {
        if (!apiRef.current.subForms) return undefined;
        return apiRef.current.subForms.map((sf) => ({
          id: sf.id,
          add: () => sf.add?.(),
          fields: sf.fields ? sf.fields.map((f) => ({ ...f })) : [],
        }));
      },
      clearAll: () => apiRef.current.clearAll?.(),
    };
    agentFormRegistry.register(formId, proxy);
    sendStatus(STATUS_EVENTS.FORM_REGISTERED, { formId });
    return () => agentFormRegistry.unregister(formId);
  }, [formId]);
}
