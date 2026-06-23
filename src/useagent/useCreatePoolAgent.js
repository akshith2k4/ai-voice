import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreatePoolDialog UI component.
 */
export function useCreatePoolAgent({
  open,
  products,
  setValue,
  getValues,
  reset,
}) {
  useAgentForm("createInventoryPool", {
    fields: [
      {
        key: "name",
        type: "text",
        set: (v) => setValue("name", v),
      },
      {
        key: "description",
        type: "text",
        set: (v) => setValue("description", v),
      },
      {
        key: "products",
        type: "autocomplete",
        set: (prod) => {
          if (!prod) return;
          const prev = getValues("products") || [];
          const list = Array.isArray(prod) ? prod : [prod];
          const merged = [...prev];
          list.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          setValue("products", merged);
        },
        getOptions: () => products,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Products')) || null;
        }
      }
    ],
    clearAll: () => reset(),
  }, open);
}
