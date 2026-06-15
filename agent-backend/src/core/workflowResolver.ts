import type { FieldNode } from "../schema/loader.js";

export function resolveDemoValue(
  field: FieldNode,
  filledValues: Map<string, unknown>,
  branchOption?: string | null
): unknown {
  const dv = field.demoValue;
  if (dv === undefined || dv === null) return undefined;

  if (typeof dv === "object" && dv !== null && !Array.isArray(dv)) {
    const record = dv as Record<string, unknown>;
    if (branchOption && branchOption in record) return record[branchOption];
    const controller = field.dependsOn;
    if (controller) {
      const currentVal = String(filledValues.get(controller) ?? "");
      if (currentVal in record) return record[currentVal];
    }
    const firstKey = Object.keys(record)[0];
    return firstKey ? record[firstKey] : undefined;
  }

  return dv;
}
