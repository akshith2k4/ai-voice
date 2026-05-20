// ============================================
// Walkthrough Driver
// Reads schema → drives field-by-field walkthrough
// Sends tool calls → waits for frontend confirmations
// ============================================

import { WalkthroughStateMachine } from "../state/stateMachine.js";
import {
  getSchema,
  getAvailableForms,
  type FormSchema,
  type FieldSchema,
  type SubFormSchema,
} from "../schema/loader.js";
import { connectionManager } from "../connectionManager.js";
import type { OutgoingMessage } from "../types.js";

// --- Constants ---
const TIMEOUTS = {
  NAVIGATE: 5000,
  OPEN_DIALOG: 3000,
  GO_TO_FIELD: 5000,
  FILL_FIELD: 10000,
  ADD_ITEM: 3000,
  CLEAR_FIELDS: 3000,
  CLOSE_DIALOG: 3000,
  AUTO_POPULATION_WAIT: 4000,
  COMPLETION_PAUSE: 5000,
  EXPLAIN_DISPLAY: 1000,
  FIELD_RENDER_WAIT: 500,
  RETRY_DELAY: 500,
};

const MAX_RETRIES = 3;
const MAX_ERRORS_BEFORE_ABORT = 10;
const TTS_ENABLED = true; // flip to true when ElevenLabs TTS is wired up

// --- Errors ---
class CancellationError extends Error {
  constructor() {
    super("Walkthrough cancelled");
    this.name = "CancellationError";
  }
}

class FieldSkipError extends Error {
  constructor(public fieldKey: string) {
    super(`Field skipped: ${fieldKey}`);
    this.name = "FieldSkipError";
  }
}

class WalkthroughAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalkthroughAbortError";
  }
}

// --- Session ---
interface PendingStatus {
  expectedEvent: string;
  matcher?: (data: any) => boolean;
  resolve: (data: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface WalkthroughSession {
  sessionId: string;
  formId: string;
  schema: FormSchema;
  stateMachine: WalkthroughStateMachine;
  filledValues: Map<string, unknown>;
  cancelled: boolean;
  errorCount: number;
  pendingStatus: PendingStatus | null;
  isRegistered: boolean;
}

// --- Driver ---
class WalkthroughDriver {
  private sessions: Map<string, WalkthroughSession> = new Map();

  /**
   * Start a walkthrough for a form.
   * Non-blocking — runs in the background.
   */
  async start(formId: string, sessionId: string): Promise<void> {
    // Already in a walkthrough?
    if (this.sessions.has(sessionId)) {
      this.send(sessionId, {
        type: "tool",
        tool: "respond",
        args: {
          message: "A walkthrough is already in progress. Say 'cancel' to stop it first.",
          tts: false,
        },
      });
      return;
    }

    // Load schema
    let schema: FormSchema;
    try {
      schema = getSchema(formId);
    } catch {
      const available = getAvailableForms()
        .map((f) => f.name)
        .join(", ");
      this.send(sessionId, {
        type: "tool",
        tool: "respond",
        args: {
          message: `I couldn't find the form "${formId}". Available forms: ${available}`,
          tts: false,
        },
      });
      return;
    }

    // Create session
    const session: WalkthroughSession = {
      sessionId,
      formId,
      schema,
      stateMachine: new WalkthroughStateMachine(),
      filledValues: new Map(),
      cancelled: false,
      errorCount: 0,
      pendingStatus: null,
      isRegistered: false,
    };

    this.sessions.set(sessionId, session);
    console.log(`[Driver] Session created: ${sessionId} → form: ${formId}`);

    // Run walkthrough in background
    this.run(session)
      .catch((error) => {
        if (error instanceof CancellationError) {
          console.log(`[Driver] Walkthrough cancelled: ${sessionId}`);
        } else if (error instanceof WalkthroughAbortError) {
          console.error(`[Driver] Walkthrough aborted: ${sessionId} — ${error.message}`);
        } else {
          console.error(`[Driver] Walkthrough error: ${sessionId}`, error);
          this.send(sessionId, {
            type: "tool",
            tool: "respond",
            args: {
              message: "Something went wrong during the walkthrough. Please try again.",
              tts: false,
            },
          });
        }
      })
      .finally(() => {
        // Always clean up
        const sm = session.stateMachine;
        if (
          sm.currentState !== "IDLE" &&
          sm.currentState !== "CANCELLED" &&
          sm.currentState !== "COMPLETED"
        ) {
          try { sm.transition("CANCEL"); } catch { /* ignore */ }
        }
        if (sm.currentState !== "IDLE") {
          try { sm.transition("RESET"); } catch { /* ignore */ }
        }
        this.sessions.delete(sessionId);
        console.log(`[Driver] Session cleaned up: ${sessionId}`);
      });
  }

  /**
   * Cancel an active walkthrough.
   */
  cancel(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.cancelled = true;
    console.log(`[Driver] Cancel requested: ${sessionId}`);

    // Reject any pending wait
    if (session.pendingStatus) {
      clearTimeout(session.pendingStatus.timer);
      session.pendingStatus.reject(new CancellationError());
      session.pendingStatus = null;
    }
  }

  /**
   * Handle a status event from the frontend.
   * Called by the message router when a status message arrives.
   */
  handleStatus(sessionId: string, event: string, data?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // User-initiated interruptions → cancel immediately
    if (event === "dialog_closed_by_user" || event === "page_changed") {
      console.log(`[Driver] User interruption: ${event} — cancelling ${sessionId}`);
      session.cancelled = true;
      if (session.pendingStatus) {
        clearTimeout(session.pendingStatus.timer);
        session.pendingStatus.reject(new CancellationError());
        session.pendingStatus = null;
      }
      return;
    }

    // Frontend error → reject pending wait (triggers retry)
    if (event === "error") {
      console.warn(`[Driver] Frontend error: ${data?.tool} / ${data?.fieldKey} — ${data?.reason}`);
      if (session.pendingStatus) {
        clearTimeout(session.pendingStatus.timer);
        session.pendingStatus.reject(new Error(`Frontend error: ${data?.reason || "unknown"}`));
        session.pendingStatus = null;
      }
      return;
    }

    if (event === "form_registered") {
      session.isRegistered = true;
    }

    // Expected confirmation → resolve pending wait
    if (
      session.pendingStatus &&
      session.pendingStatus.expectedEvent === event &&
      (!session.pendingStatus.matcher || session.pendingStatus.matcher(data))
    ) {
      clearTimeout(session.pendingStatus.timer);
      session.pendingStatus.resolve(data);
      session.pendingStatus = null;
    }
  }

  // ========================================
  // MAIN WALKTHROUGH LOOP
  // ========================================

  private async run(session: WalkthroughSession): Promise<void> {
    const { schema, stateMachine, sessionId } = session;

    // Step 1: Start
    stateMachine.transition("START_WALKTHROUGH", { formId: schema.id });

    // Tell frontend which form we're walking through
    this.send(sessionId, {
      type: "tool",
      tool: "begin_walkthrough",
      args: { formId: schema.id },
    });

    console.log(`[Driver] ▶ Starting walkthrough: ${schema.id}`);

    // Step 2: Navigate to the form's page
    console.log(`[Driver] Navigating to ${schema.route}`);
    await this.sendTool(
      session,
      "navigate",
      { route: schema.route },
      "navigation_complete",
      TIMEOUTS.NAVIGATE
    );
    this.checkCancelled(session);
    await this.wait(500); // Let React mount the page before interacting

    // Step 2b: Select an item (e.g. click a hotel row) if the schema requires it
    if (schema.selectItem) {
      console.log(`[Driver] Selecting item: ${schema.selectItem.label || schema.selectItem.selector}`);
      await this.sendTool(
        session,
        "select_item",
        {
          label: schema.selectItem.label,
          selector: schema.selectItem.selector,
        },
        "item_selected",
        TIMEOUTS.NAVIGATE
      );
      this.checkCancelled(session);
      await this.wait(1000); // Let sidebar / detail panel open
    }

    // Step 3: Open the dialog
    console.log(`[Driver] Opening dialog: ${schema.openAction.fallbackText}`);
    await this.sendTool(
      session,
      "open_dialog",
      {
        selector: schema.openAction.selector,
        fallbackText: schema.openAction.fallbackText,
      },
      "dialog_opened",
      TIMEOUTS.OPEN_DIALOG
    );
    this.checkCancelled(session);

    // Step 3b: Wait for form registration as a tighter timing mechanism
    let registered = session.isRegistered;
    if (!registered) {
      console.log(`[Driver] Waiting up to 1.5s for form registration: ${schema.id}`);
      for (let attempt = 0; attempt < 15; attempt++) {
        if (session.isRegistered) {
          registered = true;
          break;
        }
        await this.wait(100);
      }
    }
    if (registered) {
      console.log(`[Driver] Form is registered! Using registry-first mode.`);
    } else {
      console.log(`[Driver] Form registration event not received — assuming unregistered/fallback mode`);
    }

    // Step 4: Form ready
    stateMachine.transition("FORM_READY");

    // Step 5: Overview message
    console.log(`[Driver] Sending overview`);
    await this.sendTool(
      session,
      "respond",
      { message: schema.overview, tts: TTS_ENABLED },
      null,
      0
    );
    await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

    // Step 6: Walk through main fields
    const hasBranching = schema.fields.some(f => f.branching);
    if (hasBranching) {
      console.log(`[Driver] Form has branching fields — generating walkthrough steps using WalkthroughPlanner`);
      const { WalkthroughPlanner } = await import("./planner.js");
      const planner = new WalkthroughPlanner(schema);
      const plannedSteps = planner.build();
      console.log(`[Driver] Planned steps count: ${plannedSteps.length}`);

      for (let sIdx = 0; sIdx < plannedSteps.length; sIdx++) {
        this.checkCancelled(session);
        const step = plannedSteps[sIdx];
        const field = schema.fields.find(f => f.key === step.key);
        if (!field) continue;

        console.log(`[Driver] Planned step ${sIdx + 1}/${plannedSteps.length}: cmd=${step.cmd}, key=${step.key}`);

        switch (step.cmd) {
          case 'go_to_field': {
            await this.retryOperation(
              session,
              async () => {
                await this.sendTool(
                  session,
                  "go_to_field",
                  { fieldKey: field.key, label: field.label },
                  "field_reached",
                  TIMEOUTS.GO_TO_FIELD
                );
              },
              field.key
            );
            break;
          }
          case 'explain_field': {
            await this.sendTool(
              session,
              "explain_field",
              { fieldKey: field.key, text: step.text || field.explanation || '', tts: TTS_ENABLED },
              null,
              0
            );
            await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
            break;
          }
          case 'fill_field': {
            const val = step.value;
            if (val !== undefined && val !== null) {
              await this.retryOperation(
                session,
                async () => {
                  await this.sendTool(
                    session,
                    "fill_field",
                    { fieldKey: field.key, label: field.label, type: field.type, value: String(val) },
                    "field_filled",
                    TIMEOUTS.FILL_FIELD
                  );
                },
                field.key
              );
              session.filledValues.set(field.key, val);
              stateMachine.transition("FIELD_COMPLETE");

              const pauseAfterFill = field.pauseAfterFill || 800;
              await this.wait(pauseAfterFill);

              if (field.waitAfterFillMs) {
                await this.wait(field.waitAfterFillMs);
              }

              // Check conditional auto-load
              if (field.autoLoad) {
                console.log(`[Driver] Field "${field.key}" has autoLoad — waiting for loading to trigger...`);
                await this.wait(1000); // Allow API response to load
                try {
                  const res = await this.sendTool(
                    session,
                    "get_options_count",
                    { fieldKey: field.key, label: field.label },
                    "options_count_retrieved",
                    3000
                  );
                  if (res && typeof res.count === "number") {
                    console.log(`[Driver] Options count retrieved for "${field.key}": ${res.count}`);
                    if (res.count === 0 && field.emptyMessage) {
                      console.log(`[Driver] Options count is 0 — speaking emptyMessage: "${field.emptyMessage}"`);
                      await this.sendTool(
                        session,
                        "respond",
                        { message: field.emptyMessage, tts: TTS_ENABLED },
                        null,
                        0
                      );
                      await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
                    }
                  }
                } catch (e) {
                  console.warn(`[Driver] Failed to retrieve options count for "${field.key}":`, e);
                }
              }
            }
            break;
          }
          case 'wait': {
            if (step.ms) {
              await this.wait(step.ms);
            }
            break;
          }
        }
      }
    } else {
      for (let i = 0; i < schema.fields.length; i++) {
        this.checkCancelled(session);
        const field = schema.fields[i];

        // Check visibility
        if (!this.isFieldVisible(session, field)) {
          console.log(`[Driver] Skipping field "${field.key}" — not visible`);
          continue;
        }

        // Check condition
        if (!this.isConditionMet(session, field)) {
          console.log(`[Driver] Skipping field "${field.key}" — condition not met`);
          continue;
        }

        console.log(`[Driver] Processing field ${i + 1}/${schema.fields.length}: "${field.key}"`);
        try {
          await this.processField(session, field);
          stateMachine.transition("FIELD_COMPLETE");
          session.filledValues.set(field.key, field.demoValue);
        } catch (error) {
          if (error instanceof FieldSkipError) {
            console.log(`[Driver] Skipping field "${field.key}" — fill failed`);
            stateMachine.transition("FIELD_COMPLETE");
            continue;
          }
          throw error;
        }
      }
    }

    // Step 7: Walk through sub-forms
    for (const subForm of schema.subForms) {
      this.checkCancelled(session);

      // Check visibility
      if (!this.isFieldVisible(session, subForm)) {
        console.log(`[Driver] Skipping sub-form "${subForm.id}" — not visible`);
        continue;
      }

      // Check condition
      if (!this.isConditionMet(session, subForm)) {
        console.log(`[Driver] Skipping sub-form "${subForm.id}" — condition not met`);
        continue;
      }

      console.log(`[Driver] Processing sub-form: "${subForm.id}"`);
      await this.processSubForm(session, subForm);
    }

    // Step 8: Completion
    stateMachine.transition("ALL_FIELDS_DONE");
    console.log(`[Driver] All fields done — completing`);

    // Wrap-up message
    await this.sendTool(
      session,
      "respond",
      { message: schema.wrapUp, tts: TTS_ENABLED },
      null,
      0
    );
    await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

    // 5-second pause — let user see the completed form
    await this.sendTool(
      session,
      "respond",
      { message: "I'll clear the demo data now.", tts: TTS_ENABLED },
      null,
      0
    );
    await this.wait(TIMEOUTS.COMPLETION_PAUSE);

    // Clear all fields
    console.log(`[Driver] Clearing demo data`);
    await this.sendTool(
      session,
      "clear_all_fields",
      {},
      "fields_cleared",
      TIMEOUTS.CLEAR_FIELDS
    );

    // Close dialog
    console.log(`[Driver] Closing dialog`);
    this.sendTool(
      session,
      "close_dialog",
      {},
      null,
      0
    );
    await this.wait(500);

    // Done
    stateMachine.transition("RESET");
    console.log(`[Driver] ✅ Walkthrough complete: ${schema.id}`);
  }

  // ========================================
  // FIELD PROCESSING
  // ========================================

  private async processField(
    session: WalkthroughSession,
    field: FieldSchema
  ): Promise<void> {
    const { key, label, type, explanation, demoValue, readOnly, autoFilled } = field;

    // 1. Go to field (scroll + spotlight)
    await this.retryOperation(
      session,
      async () => {
        await this.sendTool(
          session,
          "go_to_field",
          { fieldKey: key, label },
          "field_reached",
          TIMEOUTS.GO_TO_FIELD
        );
      },
      key
    );

    // 2. Explain field
    await this.sendTool(
      session,
      "explain_field",
      { fieldKey: key, text: explanation, tts: TTS_ENABLED },
      null,
      0
    );
    await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

    // 3. Handle read-only fields
    if (readOnly) {
      await this.sendTool(
        session,
        "respond",
        {
          message: "This field is read-only. It gets filled automatically when you save.",
          tts: TTS_ENABLED,
        },
        null,
        0
      );
      await this.wait(500);
      return;
    }

    // 4. Handle auto-filled fields
    if (autoFilled) {
      await this.sendTool(
        session,
        "respond",
        {
          message: "This field was already filled automatically for you.",
          tts: TTS_ENABLED,
        },
        null,
        0
      );
      await this.wait(500);
      return;
    }

    // 5. Skip if no demo value
    if (demoValue === undefined || demoValue === null) {
      await this.sendTool(
        session,
        "respond",
        {
          message: "I'll skip filling this field — no demo value is configured.",
          tts: TTS_ENABLED,
        },
        null,
        0
      );
      await this.wait(500);
      return;
    }

    // 6. Fill the field with retry
    await this.retryOperation(
      session,
      async () => {
        await this.sendTool(
          session,
          "fill_field",
          { fieldKey: key, label, type, value: String(demoValue) },
          "field_filled",
          TIMEOUTS.FILL_FIELD
        );
      },
      key
    );

    // 7. Pause after fill
    const pauseAfterFill = field.pauseAfterFill || 800;
    await this.wait(pauseAfterFill);

    // 8. If field has a wait, pause
    if (field.waitAfterFillMs) {
      console.log(`[Driver] Waiting ${field.waitAfterFillMs}ms after filling ${key}`);
      await this.wait(field.waitAfterFillMs);
    }
  }

  // ========================================
  // SUB-FORM PROCESSING
  // ========================================

  private async processSubForm(
    session: WalkthroughSession,
    subForm: SubFormSchema
  ): Promise<void> {
    const { stateMachine } = session;
    stateMachine.transition("SUB_FORM_START", { subFormId: subForm.id });

    // Explain the sub-form
    if (subForm.explanation) {
      await this.sendTool(
        session,
        "respond",
        { message: subForm.explanation, tts: TTS_ENABLED },
        null,
        0
      );
      await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
    }

    if (subForm.autoPopulated) {
      await this.processAutoPopulatedSubForm(session, subForm);
    } else if (subForm.copyFrom) {
      const { subFormId, whenFieldEquals, checkboxLabel } = subForm.copyFrom;
      const shouldCopy = !whenFieldEquals || 
        session.filledValues.get(whenFieldEquals.field) === whenFieldEquals.value;

      if (shouldCopy) {
        await this.processCopySubForm(session, subForm, checkboxLabel);
      } else {
        await this.processManualSubForm(session, subForm);
      }
    } else {
      await this.processManualSubForm(session, subForm);
    }

    stateMachine.transition("SUB_FORM_COMPLETE");
  }

  private async processAutoPopulatedSubForm(
    session: WalkthroughSession,
    subForm: SubFormSchema
  ): Promise<void> {
    const { stateMachine } = session;
    console.log(`[Driver] Auto-populated sub-form: ${subForm.id} — items already in DOM`);

    await this.sendTool(
      session,
      "respond",
      {
        message: "The products have been loaded automatically based on the customer's agreement.",
        tts: TTS_ENABLED,
      },
      null,
      0
    );
    await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

    for (let itemIndex = 0; itemIndex < subForm.demoItemCount; itemIndex++) {
      this.checkCancelled(session);
      if (itemIndex > 0) {
        if (subForm.explanationForMultiple) {
          await this.sendTool(
            session,
            "respond",
            { message: subForm.explanationForMultiple, tts: TTS_ENABLED },
            null,
            0
          );
          await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
        }
        stateMachine.transition("SUB_FORM_NEXT_ITEM");
      }

      for (const field of subForm.fields) {
        this.checkCancelled(session);

        try {
          // Go to field with sub-form context
          await this.retryOperation(
            session,
            async () => {
              await this.sendTool(
                session,
                "go_to_field",
                {
                  fieldKey: field.key,
                  label: field.label,
                  subFormId: subForm.id,
                  itemIndex: itemIndex,
                },
                "field_reached",
                TIMEOUTS.GO_TO_FIELD
              );
            },
            field.key
          );

          // Explain field
          await this.sendTool(
            session,
            "explain_field",
            {
              fieldKey: field.key,
              text: field.explanation,
              tts: TTS_ENABLED,
            },
            null,
            0
          );
          await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

          // Skip auto-filled fields
          if (field.autoFilled) {
            await this.sendTool(
              session,
              "respond",
              {
                message: "This field was already filled automatically for you.",
                tts: TTS_ENABLED,
              },
              null,
              0
            );
            await this.wait(500);
            stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
            continue;
          }

          // Fill field with sub-form context
          await this.retryOperation(
            session,
            async () => {
              await this.sendTool(
                session,
                "fill_field",
                {
                  fieldKey: field.key,
                  label: field.label,
                  type: field.type,
                  value: String(field.demoValue),
                  subFormId: subForm.id,
                  itemIndex: itemIndex,
                },
                "field_filled",
                TIMEOUTS.FILL_FIELD
              );
            },
            field.key
          );

          const pauseAfterFill = field.pauseAfterFill || 800;
          await this.wait(pauseAfterFill);

          stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
          session.filledValues.set(
            `${subForm.id}_${itemIndex}_${field.key}`,
            field.demoValue
          );
        } catch (error) {
          if (error instanceof FieldSkipError) {
            console.log(`[Driver] Skipping sub-form field "${field.key}" — fill failed`);
            stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
            continue;
          }
          throw error;
        }
      }
    }
  }

  private async processManualSubForm(
    session: WalkthroughSession,
    subForm: SubFormSchema
  ): Promise<void> {
    const { stateMachine } = session;
    console.log(`[Driver] Manual sub-form: ${subForm.id} — adding ${subForm.demoItemCount} item(s)`);

    for (let itemIndex = 0; itemIndex < subForm.demoItemCount; itemIndex++) {
      this.checkCancelled(session);
      await this.retryOperation(
        session,
        async () => {
          await this.sendTool(
            session,
            "add_item",
            { subFormId: subForm.id, triggerText: subForm.triggerText },
            "item_added",
            TIMEOUTS.ADD_ITEM
          );
        },
        `${subForm.id}_addItem_${itemIndex}`
      );

      await this.wait(TIMEOUTS.FIELD_RENDER_WAIT);

      if (itemIndex > 0 && subForm.explanationForMultiple) {
        await this.sendTool(
          session,
          "respond",
          { message: subForm.explanationForMultiple, tts: TTS_ENABLED },
          null,
          0
        );
        await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
        stateMachine.transition("SUB_FORM_NEXT_ITEM");
      }

      for (const field of subForm.fields) {
        this.checkCancelled(session);

        try {
          // Go to field with sub-form context
          await this.retryOperation(
            session,
            async () => {
              await this.sendTool(
                session,
                "go_to_field",
                {
                  fieldKey: field.key,
                  label: field.label,
                  subFormId: subForm.id,
                  itemIndex: itemIndex,
                },
                "field_reached",
                TIMEOUTS.GO_TO_FIELD
              );
            },
            field.key
          );

          // Explain field
          await this.sendTool(
            session,
            "explain_field",
            {
              fieldKey: field.key,
              text: field.explanation,
              tts: TTS_ENABLED,
            },
            null,
            0
          );
          await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);

          // Fill field with sub-form context
          await this.retryOperation(
            session,
            async () => {
              await this.sendTool(
                session,
                "fill_field",
                {
                  fieldKey: field.key,
                  label: field.label,
                  type: field.type,
                  value: String(field.demoValue),
                  subFormId: subForm.id,
                  itemIndex: itemIndex,
                },
                "field_filled",
                TIMEOUTS.FILL_FIELD
              );
            },
            field.key
          );

          const pauseAfterFill = field.pauseAfterFill || 800;
          await this.wait(pauseAfterFill);

          stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
          session.filledValues.set(
            `${subForm.id}_${itemIndex}_${field.key}`,
            field.demoValue
          );
        } catch (error) {
          if (error instanceof FieldSkipError) {
            console.log(`[Driver] Skipping sub-form field "${field.key}" — fill failed`);
            stateMachine.transition("SUB_FORM_FIELD_COMPLETE");
            continue;
          }
          throw error;
        }
      }
    }
  }

  private async processCopySubForm(
    session: WalkthroughSession,
    subForm: SubFormSchema,
    checkboxLabel: string
  ): Promise<void> {
    console.log(`[Driver] Sub-form ${subForm.id} — using copy checkbox`);

    await this.sendTool(
      session,
      "respond",
      {
        message: subForm.copyFrom?.copyExplanation || `These items can be copied from ${subForm.copyFrom?.subFormId}.`,
        tts: TTS_ENABLED,
      },
      null,
      0
    );

    await this.retryOperation(
      session,
      async () => {
        await this.sendTool(
          session,
          "click_checkbox",
          {
            fieldKey: `copy_${subForm.copyFrom?.subFormId}`, // fallback logic mostly replaced by generic checkbox match on labelText
            labelText: checkboxLabel,
          },
          "checkbox_clicked",
          TIMEOUTS.FILL_FIELD
        );
      },
      `copy_${subForm.id}`
    );

    await this.sendTool(
      session,
      "respond",
      {
        message: "I've checked the copy option to automatically copy items.",
        tts: TTS_ENABLED,
      },
      null,
      0
    );
    await this.wait(TIMEOUTS.EXPLAIN_DISPLAY);
  }

  // ========================================
  // CONDITIONAL FIELD EVALUATION
  // ========================================

  private isFieldVisible(
    session: WalkthroughSession,
    field: FieldSchema | SubFormSchema
  ): boolean {
    const { visibleWhen } = field;
    if (!visibleWhen) return true;
    const currentValue = session.filledValues.get(visibleWhen.field);
    return currentValue === visibleWhen.value;
  }

  private isConditionMet(
    session: WalkthroughSession,
    field: FieldSchema | SubFormSchema
  ): boolean {
    const { conditionalOn } = field as FieldSchema | SubFormSchema;
    if (!conditionalOn) return true;
    const currentValue = session.filledValues.get(conditionalOn.field);
    return conditionalOn.values.includes(String(currentValue));
  }

  // ========================================
  // TOOL SENDING & STATUS WAITING
  // ========================================

  private async sendTool(
    session: WalkthroughSession,
    tool: string,
    args: Record<string, unknown>,
    expectedEvent: string | null,
    timeout: number
  ): Promise<any> {
    this.checkCancelled(session);

    let messageId: string | null = null;
    if (args.tts === true) {
      messageId = String(args.messageId || crypto.randomUUID());
      args.messageId = messageId;
    }

    console.log(`[Driver] → ${tool}(${Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})`);

    this.send(session.sessionId, { type: "tool", tool, args });

    // If TTS is enabled, we wait for TTS playback complete first
    if (args.tts === true && messageId) {
      try {
        await this.waitForStatus(
          session,
          "tts_playback_complete",
          15000,
          (data) => data.messageId === messageId
        );
      } catch (err) {
        console.warn(`[Driver] TTS playback timeout for ${messageId}, continuing...`);
      }
    }

    if (!expectedEvent || timeout === 0) return null;

    return this.waitForStatus(session, expectedEvent, timeout);
  }

  private waitForStatus(
    session: WalkthroughSession,
    expectedEvent: string,
    timeout: number,
    matcher?: (data: any) => boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        session.pendingStatus = null;
        reject(new Error(`Timeout waiting for "${expectedEvent}" (${timeout}ms)`));
      }, timeout);

      session.pendingStatus = {
        expectedEvent,
        matcher,
        resolve: (data) => {
          session.pendingStatus = null;
          resolve(data);
        },
        reject: (reason) => {
          session.pendingStatus = null;
          reject(reason);
        },
        timer,
      };
    });
  }

  // ========================================
  // ERROR HANDLING WITH RETRY
  private async retryOperation(
    session: WalkthroughSession,
    operation: () => Promise<void>,
    fieldKey: string
  ): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        this.checkCancelled(session);
        await operation();
        return;
      } catch (error) {
        if (error instanceof CancellationError) throw error;
        console.warn(`[Driver] Retry ${attempt}/${MAX_RETRIES} for "${fieldKey}": ${(error as Error).message}`);

        if (attempt === MAX_RETRIES) {
          session.errorCount++;
          console.error(`[Driver] Failed after ${MAX_RETRIES} attempts: "${fieldKey}"`);

          await this.sendTool(
            session,
            "respond",
            {
              message: `I had trouble with the ${fieldKey} field. I'll skip it and continue.`,
              tts: TTS_ENABLED,
            },
            null,
            0
          );
          await this.wait(500);

          if (session.errorCount >= MAX_ERRORS_BEFORE_ABORT) {
            await this.sendTool(
              session,
              "respond",
              {
                message: "I'm having trouble with this form. The walkthrough will stop now. Please try again later.",
                tts: TTS_ENABLED,
              },
              null,
              0
            );
            throw new WalkthroughAbortError(`${session.errorCount} errors — aborting`);
          }
          throw new FieldSkipError(fieldKey);
        }
        await this.wait(TIMEOUTS.RETRY_DELAY);
      }
    }
  }

  private checkCancelled(session: WalkthroughSession): void {
    if (session.cancelled) throw new CancellationError();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private send(sessionId: string, message: OutgoingMessage): void {
    // If this is a tool message requiring TTS, we should synthesize and send the audio alongside it!
    if (message.type === "tool" && message.args?.tts === true) {
      const textToSpeak = String(message.args.message || message.args.text || "");
      if (textToSpeak) {
        const messageId = String(message.args.messageId || crypto.randomUUID());
        message.args.messageId = messageId; // Ensure it is attached so frontend matches it

        // Run synthesis in the background
        import("../services/elevenLabsTTS.js")
          .then(({ synthesize }) => synthesize(textToSpeak, "en"))
          .then((audioDataUrl) => {
            const base64 = audioDataUrl.split(",")[1];
            connectionManager.send(sessionId, {
              type: "tts_audio",
              audio: base64,
              messageId,
            });
          })
          .catch((err) => {
            console.error("[Driver TTS] Automatic synthesis failed:", err);
          });
      }
    }

    connectionManager.send(sessionId, message);
  }
}

export const walkthroughDriver = new WalkthroughDriver();
