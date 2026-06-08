import type { WalkthroughSession, FieldSchema, SubFormSchema } from "./sessionManager.js";

// --- Errors ---
export class FieldSkipError extends Error {
  constructor(public fieldKey: string) {
    super(`Field skipped: ${fieldKey}`);
    this.name = "FieldSkipError";
  }
}

export class WalkthroughAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalkthroughAbortError";
  }
}

export function isFieldVisible(
  session: WalkthroughSession,
  field: FieldSchema | SubFormSchema
): boolean {
  const { visibleWhen } = field;
  if (!visibleWhen) return true;
  const vw = visibleWhen as any;
  const currentValue = session.filledValues.get(vw.field);
  return currentValue === vw.value;
}

export function isConditionMet(
  session: WalkthroughSession,
  field: FieldSchema | SubFormSchema
): boolean {
  const { conditionalOn } = field as FieldSchema | SubFormSchema;
  if (!conditionalOn) return true;
  const currentValue = session.filledValues.get(conditionalOn.field);
  return conditionalOn.values.includes(String(currentValue));
}

export function resolveDemoValue(
  field: FieldSchema,
  filledValues: Map<string, unknown>,
  branchOption?: string | null
): unknown {
  const dv = field.demoValue;
  if (dv === undefined || dv === null) return undefined;
  
  if (typeof dv === "object" && dv !== null && !Array.isArray(dv)) {
    const record = dv as Record<string, unknown>;
    
    // Explicit branch option (used by planner)
    if (branchOption && branchOption in record) {
      return record[branchOption];
    }
    
    // Runtime resolution (used by driver)
    const controller = field.dependsOn;
    if (controller) {
      const currentVal = String(filledValues.get(controller) ?? "");
      if (currentVal in record) {
        return record[currentVal];
      }
    }
    
    // Fallback: first value in the record
    const firstKey = Object.keys(record)[0];
    return firstKey ? record[firstKey] : undefined;
  }
  
  return dv;
}
