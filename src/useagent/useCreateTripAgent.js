import { useAgentForm } from "../agent/useAgentForm";

/**
 * Extracts the Agent Registration logic from the CreateTripFromRouteDialog UI component.
 */
export function useCreateTripAgent({
  open,
  routes,
  drivers,
  vehicles,
  setResolvedTripType,
  setSelectedRoute,
  setDeliveryDate,
  setSelectedDriverIds,
  rolesByUserId,
  setRolesByUserId,
  setVehicle,
  setNotes,
  customersWithOrders,
  enabledCustomers,
  toggleCustomerEnabled,
  setSequenceByCustomer,
  setVisitNotesByCustomer,
  resetStateAndClose,
  normalizeString,
  WASH_TRIP,
  ORDER_TRIP,
}) {
  useAgentForm("createTrip", {
    fields: [
      {
        key: "tripType",
        type: "select",
        set: (v) => setResolvedTripType(v === "WASH_TRIP" ? WASH_TRIP : ORDER_TRIP),
        getElement: () => document.querySelector('[data-agent-field="tripType"]') || null,
      },
      {
        key: "route",
        type: "select",
        set: (v) => {
          const normV = normalizeString(v);
          const r = routes.find(route => 
            normalizeString(route.id) === normV ||
            normalizeString(route.name) === normV ||
            normalizeString(route.name).includes(normV) ||
            normV.includes(normalizeString(route.name))
          );
          setSelectedRoute(r || null);
        },
        getOptions: () => routes,
        getElement: () => document.querySelector('[data-agent-field="route"] [role="combobox"]') || document.querySelector('[data-agent-field="route"]') || null,
      },
      {
        key: "deliveryDate",
        type: "date",
        set: (v) => setDeliveryDate(v ? new Date(v) : new Date()),
        getElement: () => document.querySelector('[data-agent-field="deliveryDate"] input') || document.querySelector('[data-agent-field="deliveryDate"]') || null,
      },
      {
        key: "deliveryTeam",
        type: "autocomplete",
        set: (users) => {
          const list = Array.isArray(users) ? users : [users];
          const ids = list.map(u => u.id);
          setSelectedDriverIds(ids);
          const next = { ...rolesByUserId };
          ids.forEach((uid, idx) => {
            if (!next[uid]) next[uid] = idx === 0 ? 'DRIVER' : 'HELPER';
          });
          Object.keys(next).forEach((uid) => {
            if (!ids.includes(Number(uid)) && !ids.includes(uid)) delete next[uid];
          });
          setRolesByUserId(next);
        },
        getOptions: () => drivers,
        getElement: () => document.querySelector('[data-agent-field="deliveryTeam"] [role="combobox"]') || document.querySelector('[data-agent-field="deliveryTeam"] input') || document.querySelector('[data-agent-field="deliveryTeam"]') || null,
      },
      {
        key: "vehicle",
        type: "select",
        set: (v) => {
          const normV = normalizeString(v);
          const veh = vehicles.find(veh => {
            const label = `${veh.vehicleNumber}${veh.type ? ` — ${veh.type}` : ""}`;
            return normalizeString(veh.id) === normV ||
                   normalizeString(veh.vehicleNumber) === normV ||
                   normalizeString(label) === normV ||
                   normV.includes(normalizeString(veh.vehicleNumber)) ||
                   normalizeString(veh.vehicleNumber).includes(normV);
          });
          setVehicle(veh || null);
        },
        getOptions: () => vehicles,
        getElement: () => document.querySelector('[data-agent-field="vehicle"] [role="combobox"]') || document.querySelector('[data-agent-field="vehicle"]') || null,
      },
      {
        key: "notes",
        type: "text",
        set: (v) => setNotes(v),
        getElement: () => document.querySelector('[data-agent-field="notes"] input') || document.querySelector('[data-agent-field="notes"] textarea') || document.querySelector('[data-agent-field="notes"]') || null,
      }
    ],
    subForms: [
      {
        id: "visitItem",
        fields: [
          {
            key: "selected",
            type: "checkbox",
            setByIndex: (val, idx) => {
              const cust = customersWithOrders[idx];
              if (cust) {
                const customerId = Number(cust.id);
                const shouldBeEnabled = val === true || val === "true";
                const currentlyEnabled = enabledCustomers.has(customerId);
                if (shouldBeEnabled !== currentlyEnabled) {
                  toggleCustomerEnabled(customerId);
                }
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-customer]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="selected"]') || null;
            }
          },
          {
            key: "sequence",
            type: "text",
            setByIndex: (val, idx) => {
              const cust = customersWithOrders[idx];
              if (cust) {
                const customerId = Number(cust.id);
                setSequenceByCustomer((prev) => ({
                  ...prev,
                  [customerId]: val ? Number(val) : ""
                }));
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-customer]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="sequence"]') || null;
            }
          },
          {
            key: "visitNotes",
            type: "text",
            setByIndex: (val, idx) => {
              const cust = customersWithOrders[idx];
              if (cust) {
                const customerId = Number(cust.id);
                setVisitNotesByCustomer((prev) => ({
                  ...prev,
                  [customerId]: val || ""
                }));
              }
            },
            getElement: (idx) => {
              const rows = document.querySelectorAll('[data-agent-row-customer]');
              const row = rows[idx];
              return row?.querySelector('[data-agent-field="visitNotes"]') || null;
            }
          }
        ]
      }
    ],
    clearAll: resetStateAndClose,
  }, open);
}
