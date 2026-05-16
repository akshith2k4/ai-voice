// ============================================
// Schema Loader
// Reads, validates, and serves form schemas
// ============================================

import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// --- Schema Type Definitions ---

export type FieldType = "text" | "date" | "select" | "autocomplete" | "toggle" | "checkbox";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readOnly?: boolean;
  autoFilled?: boolean;
  demoValue: unknown;
  options?: string[];
  visibleWhen?: { field: string; value: string } | null;
  conditionalOn?: { field: string; values: string[] } | null;
  explanation: string;
  tips?: string;
  pauseAfterExplain?: number;
  pauseAfterFill?: number;
  commonQuestions?: Array<{ question: string; answer: string }>;
}

export interface SubFormSchema {
  id: string;
  name: string;
  triggerText?: string;
  repeatable: boolean;
  autoPopulated?: boolean;
  autoPopulatedTrigger?: { field: string; description: string };
  fallbackManual?: { triggerText: string; description: string };
  demoItemCount: number;
  visibleWhen?: { field: string; value: string } | null;
  conditionalOn?: { field: string; values: string[] } | null;
  explanation?: string;
  explanationForMultiple?: string;
  fields: FieldSchema[];
}

export interface FormSchema {
  id: string;
  name: string;
  mode: string;
  route: string;
  openAction: {
    type: string;
    selector?: string;
    fallbackText?: string;
  };
  overview: string;
  fields: FieldSchema[];
  subForms: SubFormSchema[];
  wrapUp: string;
  prerequisites?: Array<{
    type: string;
    formId?: string;
    check?: string;
    field?: string;
    condition?: string;
  }>;
  fallback?: string;
}

// --- Validation Errors ---

export class SchemaValidationError extends Error {
  constructor(
    public formId: string,
    public field: string,
    message: string
  ) {
    super(`Schema validation error [${formId}.${field}]: ${message}`);
    this.name = "SchemaValidationError";
  }
}

// --- Valid field types ---

const VALID_FIELD_TYPES: FieldType[] = [
  "text",
  "date",
  "select",
  "autocomplete",
  "toggle",
  "checkbox",
];

// --- Loader ---

const schemas = new Map<string, FormSchema>();

/**
 * Load all schema JSON files from the forms directory.
 * Call once at server startup.
 * Throws on any invalid schema — fail fast.
 */
export function loadAllSchemas(formsDir?: string): void {
  const dir = formsDir ?? resolve(import.meta.dir);

  if (!existsSync(dir)) {
    console.warn(`[SchemaLoader] Forms directory not found: ${dir}`);
    return;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.warn(`[SchemaLoader] No schema files found in ${dir}`);
    return;
  }

  let loaded = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const parsed = JSON.parse(raw);
      const schema = validateSchema(parsed);

      schemas.set(schema.id, schema);
      loaded++;

      console.log(
        `[SchemaLoader] ✅ Loaded: ${schema.id} (${schema.fields.length} fields, ${schema.subForms.length} sub-forms)`
      );
    } catch (error) {
      failed++;
      if (error instanceof SchemaValidationError) {
        console.error(`[SchemaLoader] ❌ ${error.message}`);
      } else {
        console.error(`[SchemaLoader] ❌ Failed to load ${file}:`, error);
      }
    }
  }

  console.log(
    `[SchemaLoader] Done: ${loaded} loaded, ${failed} failed, ${schemas.size} total`
  );
}

/**
 * Get a schema by form ID.
 * Throws if not found — the driver should never ask for a non-existent form.
 */
export function getSchema(formId: string): FormSchema {
  const schema = schemas.get(formId);
  if (!schema) {
    throw new Error(
      `Schema not found: "${formId}". Available: [${Array.from(schemas.keys()).join(", ")}]`
    );
  }
  return schema;
}

/**
 * Get all loaded schema IDs.
 */
export function getAvailableForms(): Array<{ id: string; name: string; route: string }> {
  return Array.from(schemas.values()).map((s) => ({
    id: s.id,
    name: s.name,
    route: s.route,
  }));
}

/**
 * Get context for a specific field — used by LLM for Q&A.
 * Only returns the field's data, not the entire form.
 * Token-efficient.
 */
export function getFieldContext(
  formId: string,
  fieldKey: string
): FieldSchema | null {
  const schema = getSchema(formId);

  // Check main fields
  const mainField = schema.fields.find((f) => f.key === fieldKey);
  if (mainField) return mainField;

  // Check sub-form fields
  for (const subForm of schema.subForms) {
    const subField = subForm.fields.find((f) => f.key === fieldKey);
    if (subField) return subField;
  }

  return null;
}

// --- Validation ---

function validateSchema(parsed: unknown): FormSchema {
  if (!parsed || typeof parsed !== "object") {
    throw new SchemaValidationError("unknown", "root", "Schema must be an object");
  }

  const schema = parsed as Record<string, unknown>;

  // Required top-level fields
  if (!schema.id || typeof schema.id !== "string") {
    throw new SchemaValidationError("unknown", "id", "Missing or invalid 'id'");
  }

  const formId = schema.id;

  if (!schema.name || typeof schema.name !== "string") {
    throw new SchemaValidationError(formId, "name", "Missing or invalid 'name'");
  }

  if (!schema.route || typeof schema.route !== "string") {
    throw new SchemaValidationError(formId, "route", "Missing or invalid 'route'");
  }

  if (!schema.overview || typeof schema.overview !== "string") {
    throw new SchemaValidationError(formId, "overview", "Missing or invalid 'overview'");
  }

  if (!Array.isArray(schema.fields)) {
    throw new SchemaValidationError(formId, "fields", "Missing or invalid 'fields' array");
  }

  // Validate each field
  for (let i = 0; i < schema.fields.length; i++) {
    validateField(schema.fields[i], formId, `fields[${i}]`);
  }

  // Validate sub-forms
  if (schema.subForms && Array.isArray(schema.subForms)) {
    for (let i = 0; i < schema.subForms.length; i++) {
      validateSubForm(schema.subForms[i], formId, `subForms[${i}]`);
    }
  }

  // Warn about missing wrapUp
  if (!schema.wrapUp || typeof schema.wrapUp !== "string") {
    console.warn(
      `[SchemaLoader] ⚠️ ${formId}: Missing 'wrapUp' — agent will use default message`
    );
  }

  return parsed as FormSchema;
}

function validateField(
  field: unknown,
  formId: string,
  path: string
): void {
  if (!field || typeof field !== "object") {
    throw new SchemaValidationError(formId, path, "Field must be an object");
  }

  const f = field as Record<string, unknown>;

  if (!f.key || typeof f.key !== "string") {
    throw new SchemaValidationError(formId, `${path}.key`, "Missing or invalid 'key'");
  }

  if (!f.label || typeof f.label !== "string") {
    throw new SchemaValidationError(
      formId,
      `${path}.label`,
      `Missing or invalid 'label' for field '${f.key}'`
    );
  }

  if (!f.type || typeof f.type !== "string") {
    throw new SchemaValidationError(
      formId,
      `${path}.type`,
      `Missing or invalid 'type' for field '${f.key}'`
    );
  }

  if (!VALID_FIELD_TYPES.includes(f.type as FieldType)) {
    throw new SchemaValidationError(
      formId,
      `${path}.type`,
      `Unknown field type '${f.type}' for field '${f.key}'. Valid: ${VALID_FIELD_TYPES.join(", ")}`
    );
  }

  // Select fields with static options must have a non-empty options array.
  // Dynamic selects (populated at runtime from API) omit options entirely — that's valid.
  // Only reject if options is present but empty or not an array.
  if (f.type === "select" && f.options !== undefined && (!Array.isArray(f.options) || (f.options as unknown[]).length === 0)) {
    throw new SchemaValidationError(
      formId,
      `${path}.options`,
      `Select field '${f.key}' has an 'options' key but it is empty or not an array`
    );
  }

  // Warn about missing explanation
  if (!f.explanation || typeof f.explanation !== "string") {
    console.warn(
      `[SchemaLoader] ⚠️ ${formId}: Field '${f.key}' has no explanation — LLM will generate one`
    );
  }

  // Warn about missing demoValue for non-readonly fields
  if (f.readOnly !== true && f.demoValue === undefined) {
    console.warn(
      `[SchemaLoader] ⚠️ ${formId}: Field '${f.key}' has no demoValue — agent will skip filling`
    );
  }
}

function validateSubForm(
  subForm: unknown,
  formId: string,
  path: string
): void {
  if (!subForm || typeof subForm !== "object") {
    throw new SchemaValidationError(formId, path, "Sub-form must be an object");
  }

  const sf = subForm as Record<string, unknown>;

  if (!sf.id || typeof sf.id !== "string") {
    throw new SchemaValidationError(formId, `${path}.id`, "Missing or invalid 'id'");
  }

  if (!sf.name || typeof sf.name !== "string") {
    throw new SchemaValidationError(formId, `${path}.name`, "Missing or invalid 'name'");
  }

  if (sf.repeatable !== true && sf.repeatable !== false) {
    throw new SchemaValidationError(
      formId,
      `${path}.repeatable`,
      "Missing or invalid 'repeatable' (must be true or false)"
    );
  }

  if (typeof sf.demoItemCount !== "number" || sf.demoItemCount < 0) {
    throw new SchemaValidationError(
      formId,
      `${path}.demoItemCount`,
      "Missing or invalid 'demoItemCount' (must be >= 0)"
    );
  }

  if (!Array.isArray(sf.fields) || sf.fields.length === 0) {
    throw new SchemaValidationError(
      formId,
      `${path}.fields`,
      `Sub-form '${sf.id}' must have at least one field`
    );
  }

  // Validate each sub-form field
  for (let i = 0; i < sf.fields.length; i++) {
    validateField(sf.fields[i], formId, `${path}.fields[${i}]`);
  }

  // Non-auto-populated sub-forms need a trigger
  if (!sf.autoPopulated && !sf.triggerText) {
    throw new SchemaValidationError(
      formId,
      `${path}.triggerText`,
      `Sub-form '${sf.id}' must have 'triggerText' unless autoPopulated is true`
    );
  }
}