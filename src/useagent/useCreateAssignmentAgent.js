import { useAgentForm } from "../agent/useAgentForm";

/**
 * Agent Registration hook for the CreateAssignmentDialog component.
 */
export function useCreateAssignmentAgent({
  open,
  routes,
  users,
  jobs,
  setValue,
  reset,
}) {
  useAgentForm("createAssignment", {
    fields: [
      {
        key: "route",
        type: "select",
        set: (v) => {
          const found = routes.find(
            (r) =>
              r.name?.toLowerCase() === v.toLowerCase() ||
              r.routeName?.toLowerCase() === v.toLowerCase() ||
              String(r.id) === String(v)
          );
          setValue("route", found || null);
        },
      },
      {
        key: "date",
        type: "date",
        set: (v) => setValue("date", new Date(v)),
      },
      {
        key: "user",
        type: "select",
        set: (v) => {
          const found = users.find(
            (u) =>
              u.name?.toLowerCase() === v.toLowerCase() ||
              u.userName?.toLowerCase() === v.toLowerCase() ||
              String(u.id) === String(v)
          );
          setValue("user", found || null);
        },
      },
      {
        key: "selectAllJobs",
        type: "toggle",
        set: (v) => {
          if (v === true || v === "true") {
            setValue("selectedJobIds", new Set(jobs.map((j) => String(j.id))));
          } else {
            setValue("selectedJobIds", new Set());
          }
        },
      },
    ],
    clearAll: () => reset(),
  }, open);
}
