import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the FulfillmentDialog UI component.
 */
export function useCreateWashFulfillmentAgent({
  open,
  setWashType,
  setPoolId,
  setVendorId,
  setFulfilledDateTime,
  setRequestNumber,
  setNotes,
  effectiveRows,
  updateWashedQty,
  updateDamagedQty,
  updateSoiledQty,
  pools,
  vendors,
  resetFulfillmentDialogState,
}) {
  useAgentForm("createWashFulfillment", {
    fields: [
      {
        key: "washRequestType",
        type: "select",
        set: (v) => setWashType(v),
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
          setPoolId(match ? String(match.id) : v);
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
          setVendorId(match ? String(match.id) : v);
        },
      },
      {
        key: "fulfilledDateTime",
        type: "date",
        set: (v) => setFulfilledDateTime(v),
      },
      {
        key: "requestNumber",
        type: "text",
        set: (v) => setRequestNumber(v),
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setNotes(v),
      },
    ],
    subForms: [
      {
        id: "fulfillmentItem",
        fields: [
          {
            key: "washedQuantity",
            type: "text",
            setByIndex: (val, idx) => {
              const row = effectiveRows[idx];
              if (row) {
                updateWashedQty(row._referenceId, row.productId, val);
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-fulfillment]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="washed"] input') || row?.querySelector('[data-agent-field="washed"]') || null;
            }
          },
          {
            key: "damagedQuantity",
            type: "text",
            setByIndex: (val, idx) => {
              const row = effectiveRows[idx];
              if (row) {
                updateDamagedQty(row._referenceId, row.productId, val);
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-fulfillment]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="damaged"] input') || row?.querySelector('[data-agent-field="damaged"]') || null;
            }
          },
          {
            key: "soiledQuantity",
            type: "text",
            setByIndex: (val, idx) => {
              const row = effectiveRows[idx];
              if (row) {
                updateSoiledQty(row._referenceId, row.productId, val);
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-fulfillment]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="soiled"] input') || row?.querySelector('[data-agent-field="soiled"]') || null;
            }
          }
        ]
      }
    ],
    clearAll: resetFulfillmentDialogState,
  }, open);
}
