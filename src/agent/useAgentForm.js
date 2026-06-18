// ============================================
// useAgentForm Hook
// Registers a form's API with the agent registry.
// Purely additive — no existing logic changed.
// ============================================

import { useEffect, useRef } from "react";
import { agentFormRegistry } from "./agentFormRegistry";
import { sendStatus } from "./wsConnection";
import { STATUS_EVENTS } from "./protocol";

export function useAgentForm(formId, formApi, enabled = true) {
  const apiRef = useRef(formApi);
  apiRef.current = formApi;

  useEffect(() => {
    if (!enabled) return;

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

    const handleFieldChange = (e) => {
      const target = e.target;
      if (!target) return;

      const name = target.name || target.id;
      const value = target.type === "checkbox" ? target.checked : target.value;

      let matchedKey = null;
      const fields = apiRef.current?.fields || [];
      for (const field of fields) {
        if (field.getElement) {
          try {
            const el = field.getElement();
            if (el && (el === target || el.contains(target))) {
              matchedKey = field.key;
              break;
            }
          } catch (err) {}
        }
        if (name) {
          const keyLower = field.key.toLowerCase();
          const nameLower = name.toLowerCase();
          if (
            field.key === name ||
            name === `${field.key}Id` ||
            name === `${field.key}Name` ||
            nameLower === keyLower ||
            nameLower === `${keyLower}id` ||
            nameLower === `${keyLower}name`
          ) {
            matchedKey = field.key;
            break;
          }
        }
      }

      if (matchedKey) {
        console.log(`[useAgentForm] Field changed: ${matchedKey} =`, value);
        sendStatus("field_changed", { fieldKey: matchedKey, value });
      }
    };

    document.addEventListener("change", handleFieldChange, true);

    return () => {
      agentFormRegistry.unregister(formId);
      document.removeEventListener("change", handleFieldChange, true);
    };
  }, [formId, enabled]);
}
