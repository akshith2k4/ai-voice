import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the WRUnifiedDialog UI component.
 */
export function useCreateWashRequestAgent({
  open,
  setFormData,
  setInfo,
  setError,
  setRewashRows,
  setWashRows,
  buildRewashRowsFromProducts,
  vendors,
  pools,
  wrDateTouched,
  setWrDateTouched,
  normalizeQtyInput,
  _updateRewashRow,
  resetAll,
}) {
  useAgentForm("createWashRequest", {
    fields: [
      {
        key: "washRequestType",
        type: "select",
        set: (v) => {
          setFormData((prev) => ({ ...prev, washRequestType: v }));
          setInfo("");
          setError("");
          if (v === "WASH") {
            setRewashRows([]);
          } else {
            setWashRows([]);
            setRewashRows((prev) => buildRewashRowsFromProducts(prev));
          }
        },
      },
      {
        key: "vendor",
        type: "select",
        set: (v) => {
          const match = vendors.find(
            (vend) =>
              String(vend.name).toLowerCase() === String(v).toLowerCase() ||
              String(vend.id) === String(v)
          );
          setFormData((prev) => ({ ...prev, vendorId: match ? match.id : v }));
        },
      },
      {
        key: "pool",
        type: "select",
        set: (v) => {
          const match = pools.find(
            (p) =>
              String(p.name).toLowerCase() === String(v).toLowerCase() ||
              String(p.id) === String(v)
          );
          setFormData((prev) => ({ ...prev, poolId: match ? match.id : v }));
        },
      },
      {
        key: "deliveryDate",
        type: "date",
        set: (v) => {
          setFormData((prev) => {
            const updated = { ...prev, deliveryDate: v };
            if (!wrDateTouched) {
              updated.washRequestRecordedDateTime = v;
            }
            return updated;
          });
        },
      },
      {
        key: "washRequestRecordedDateTime",
        type: "datetime-local",
        set: (v) => {
          setFormData((prev) => ({ ...prev, washRequestRecordedDateTime: v }));
          setWrDateTouched(true);
        },
      },
      {
        key: "manual",
        type: "checkbox",
        set: (v) => setFormData((prev) => ({ ...prev, manual: v === true || v === "true" })),
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setFormData((prev) => ({ ...prev, notes: v })),
      },
    ],
    subForms: [
      {
        id: "washItem",
        fields: [
          {
            key: "requested",
            type: "text",
            setByIndex: (val, idx) => {
              setWashRows((prev) =>
                prev.map((r, i) =>
                  i === idx ? { ...r, requested: normalizeQtyInput(val) } : r,
                ),
              );
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-wash]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="requested"]') || null;
            }
          },
          {
            key: "heavySoiled",
            type: "text",
            setByIndex: (val, idx) => {
              setWashRows((prev) =>
                prev.map((r, i) =>
                  i === idx ? { ...r, heavySoiled: normalizeQtyInput(val) } : r,
                ),
              );
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-wash]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="heavySoiled"]') || null;
            }
          }
        ]
      },
      {
        id: "rewashItem",
        fields: [
          {
            key: "requested",
            type: "text",
            setByIndex: (val, idx) => {
              _updateRewashRow(idx, { requested: normalizeQtyInput(val) });
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-rewash]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="requested"]') || null;
            }
          }
        ]
      }
    ],
    clearAll: resetAll,
  }, open);
}
