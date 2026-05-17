// ============================================
// useAgentForm Hook
// Registers a form's API with the agent registry.
// Purely additive — no existing logic changed.
// ============================================

import { useEffect, useRef } from "react";
import { agentFormRegistry } from "./agentFormRegistry";

/**
 * Default element finder: tries name attribute, then label text.
 * Returns the MUI wrapper for a nicer spotlight target.
 */
function defaultGetElement(fieldKey) {
  // 1. Try by name attribute (exact match)
  let el = document.querySelector(`[name="${fieldKey}"]`);

  // 2. Try common MUI data attributes
  if (!el) {
    el = document.querySelector(`[data-agent-field="${fieldKey}"]`);
  }

  if (!el) return null;

  // Return the MUI wrapper for better spotlight styling
  return (
    el.closest(
      ".MuiFormControl-root, .MuiAutocomplete-root, .MuiFormControlLabel-root"
    ) || el
  );
}

/**
 * Default element finder for sub-form fields (by item index).
 * Uses nth-of-type-like logic within the dialog.
 */
function defaultGetElementForSubField(fieldKey, itemIndex) {
  // Sub-form fields often share the same name/label — use index
  const all = document.querySelectorAll(`[name="${fieldKey}"]`);
  const el = itemIndex != null ? all[itemIndex] : all[0];

  if (!el) return null;

  return (
    el.closest(
      ".MuiFormControl-root, .MuiAutocomplete-root, .MuiFormControlLabel-root"
    ) || el
  );
}

export function useAgentForm(formId, formApi) {
  // Always holds the latest formApi (with current state closures)
  const apiRef = useRef(formApi);
  apiRef.current = formApi;

  useEffect(() => {
    // Build stable wrappers that read from apiRef on every call.
    // This means they always see the latest state, even though
    // the wrapper functions themselves never change identity.

    const stableApi = {
      clearAll: () => apiRef.current.clearAll?.(),
    };

    // Fields
    if (formApi.fields) {
      stableApi.fields = formApi.fields.map((field) => ({
        key: field.key,
        type: field.type,
        set: field.set
          ? (...args) =>
              apiRef.current.fields?.find((f) => f.key === field.key)?.set(...args)
          : undefined,
        setByIndex: field.setByIndex
          ? (...args) =>
              apiRef.current.fields
                ?.find((f) => f.key === field.key)
                ?.setByIndex(...args)
          : undefined,
        search: field.search
          ? (...args) =>
              apiRef.current.fields?.find((f) => f.key === field.key)?.search(...args)
          : undefined,
        getOptions: field.getOptions
          ? () =>
              apiRef.current.fields?.find((f) => f.key === field.key)?.getOptions()
          : undefined,
        getElement: field.getElement
          ? (...args) =>
              apiRef.current.fields
                ?.find((f) => f.key === field.key)
                ?.getElement(...args)
          : () => defaultGetElement(field.key),
      }));
    }

    // Sub-forms
    if (formApi.subForms) {
      stableApi.subForms = formApi.subForms.map((sf) => ({
        id: sf.id,
        add: sf.add
          ? (...args) =>
              apiRef.current.subForms?.find((s) => s.id === sf.id)?.add(...args)
          : undefined,
        fields: sf.fields
          ? sf.fields.map((field) => ({
              key: field.key,
              type: field.type,
              set: field.set
                ? (...args) => {
                    const sub = apiRef.current.subForms?.find(
                      (s) => s.id === sf.id
                    );
                    sub?.fields?.find((f) => f.key === field.key)?.set(...args);
                  }
                : undefined,
              setByIndex: field.setByIndex
                ? (...args) => {
                    const sub = apiRef.current.subForms?.find(
                      (s) => s.id === sf.id
                    );
                    sub?.fields
                      ?.find((f) => f.key === field.key)
                      ?.setByIndex(...args);
                  }
                : undefined,
              search: field.search
                ? (...args) => {
                    const sub = apiRef.current.subForms?.find(
                      (s) => s.id === sf.id
                    );
                    sub?.fields
                      ?.find((f) => f.key === field.key)
                      ?.search(...args);
                  }
                : undefined,
              getOptions: field.getOptions
                ? () => {
                    const sub = apiRef.current.subForms?.find(
                      (s) => s.id === sf.id
                    );
                    return sub?.fields
                      ?.find((f) => f.key === field.key)
                      ?.getOptions();
                  }
                : undefined,
              getElement: field.getElement
                ? (...args) => {
                    const sub = apiRef.current.subForms?.find(
                      (s) => s.id === sf.id
                    );
                    return sub?.fields
                      ?.find((f) => f.key === field.key)
                      ?.getElement(...args);
                  }
                : (itemIndex) => defaultGetElementForSubField(field.key, itemIndex),
            }))
          : undefined,
      }));
    }

    agentFormRegistry.register(formId, stableApi);
    return () => agentFormRegistry.unregister(formId);
  }, [formId]);
}
