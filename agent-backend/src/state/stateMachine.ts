// ============================================
// Walkthrough State Machine (Corrected)
// ============================================

export type WalkthroughState =
  | "IDLE"
  | "FORM_SELECTED"
  | "WALKING_THROUGH"
  | "PAUSED"
  | "DETOUR_QA"
  | "SUB_FORM"
  | "COMPLETED"
  | "CANCELLED";

export type WalkthroughEvent =
  | "START_WALKTHROUGH"
  | "FORM_READY"
  | "FIELD_COMPLETE"
  | "SUB_FORM_START"
  | "SUB_FORM_FIELD_COMPLETE"
  | "SUB_FORM_NEXT_ITEM"
  | "SUB_FORM_COMPLETE"
  | "ALL_FIELDS_DONE"
  | "PAUSE"
  | "RESUME"
  | "DETOUR"
  | "DETOUR_COMPLETE"
  | "CANCEL"
  | "RESET";

export interface TransitionPayload {
  formId?: string;
  subFormId?: string;
}

export interface WalkthroughContext {
  formId: string;
  fieldIndex: number;
  subFormId: string | null;
  subFormItemIndex: number;
  subFormFieldIndex: number;
  detourOrigin: {
    state: WalkthroughState;
    fieldIndex: number;
    subFormId: string | null;
    subFormItemIndex: number;
    subFormFieldIndex: number;
  } | null;
}

export class WalkthroughStateMachine {
  private static MAX_HISTORY = 100;

  private state: WalkthroughState = "IDLE";
  private context: WalkthroughContext = {
    formId: "",
    fieldIndex: 0,
    subFormId: null,
    subFormItemIndex: 0,
    subFormFieldIndex: 0,
    detourOrigin: null,
  };
  private history: Array<{
    from: WalkthroughState;
    event: WalkthroughEvent;
    to: WalkthroughState;
    context: WalkthroughContext;
  }> = [];

  get currentState(): WalkthroughState {
    return this.state;
  }

  get currentContext(): Readonly<WalkthroughContext> {
    return this.context;
  }

  get transitionHistory(): Readonly<typeof this.history> {
    return this.history;
  }

  transition(
    event: WalkthroughEvent,
    payload?: TransitionPayload
  ): { state: WalkthroughState; context: WalkthroughContext } {
    const prev = { state: this.state, context: { ...this.context } };

    const newState = this.nextState(event);
    const newContext = this.nextContext(event, newState, payload);

    this.state = newState;
    this.context = newContext;

    this.history.push({
      from: prev.state,
      event,
      to: newState,
      context: { ...newContext },
    });

    // Limit history size
    if (this.history.length > WalkthroughStateMachine.MAX_HISTORY) {
      this.history.shift();
    }

    return { state: newState, context: newContext };
  }

  reset(state: WalkthroughState = "IDLE", context?: Partial<WalkthroughContext>) {
    this.state = state;
    this.context = {
      formId: context?.formId ?? "",
      fieldIndex: context?.fieldIndex ?? 0,
      subFormId: context?.subFormId ?? null,
      subFormItemIndex: context?.subFormItemIndex ?? 0,
      subFormFieldIndex: context?.subFormFieldIndex ?? 0,
      detourOrigin: context?.detourOrigin ?? null,
    };
    this.history = [];
  }

  private nextState(event: WalkthroughEvent): WalkthroughState {
    switch (this.state) {
      case "IDLE":
        if (event === "START_WALKTHROUGH") return "FORM_SELECTED";
        break;

      case "FORM_SELECTED":
        if (event === "FORM_READY") return "WALKING_THROUGH";        // Bug 1 fix
        break;

      case "WALKING_THROUGH":
        if (event === "FIELD_COMPLETE") return "WALKING_THROUGH";
        if (event === "PAUSE") return "PAUSED";
        if (event === "DETOUR") return "DETOUR_QA";
        if (event === "SUB_FORM_START") return "SUB_FORM";
        if (event === "ALL_FIELDS_DONE") return "COMPLETED";
        if (event === "CANCEL") return "CANCELLED";
        break;

      case "PAUSED":
        if (event === "RESUME") return "WALKING_THROUGH";
        if (event === "DETOUR") return "DETOUR_QA";                 // Bug 4 fix
        if (event === "CANCEL") return "CANCELLED";
        break;

      case "DETOUR_QA":
        // Bug 6 fix: return to originating state
        if (event === "DETOUR_COMPLETE") return this.context.detourOrigin?.state ?? "WALKING_THROUGH";
        if (event === "DETOUR") return "DETOUR_QA";
        if (event === "PAUSE") return "PAUSED";                     // Bug 5 fix
        if (event === "CANCEL") return "CANCELLED";
        break;

      case "SUB_FORM":
        if (event === "SUB_FORM_FIELD_COMPLETE") return "SUB_FORM";
        if (event === "SUB_FORM_NEXT_ITEM") return "SUB_FORM";
        if (event === "SUB_FORM_COMPLETE") return "WALKING_THROUGH";
        if (event === "DETOUR") return "DETOUR_QA";
        if (event === "PAUSE") return "PAUSED";
        if (event === "CANCEL") return "CANCELLED";
        break;

      case "COMPLETED":
      case "CANCELLED":
        if (event === "RESET") return "IDLE";
        break;
    }

    throw new Error(`Invalid transition: ${this.state} → ${event}`);
  }

  private nextContext(
    event: WalkthroughEvent,
    newState: WalkthroughState,
    payload?: TransitionPayload
  ): WalkthroughContext {
    const ctx = { ...this.context };

    switch (event) {
      case "START_WALKTHROUGH":
        // Bug 2 fix: set formId from payload
        if (payload?.formId) ctx.formId = payload.formId;
        ctx.fieldIndex = 0;
        ctx.subFormId = null;
        ctx.subFormItemIndex = 0;
        ctx.subFormFieldIndex = 0;
        ctx.detourOrigin = null;
        break;

      case "FORM_READY":
        // Bug 1 fix: no fieldIndex increment — we start at field 0
        break;

      case "FIELD_COMPLETE":
        if (newState === "WALKING_THROUGH") ctx.fieldIndex += 1;
        break;

      case "SUB_FORM_START":
        // Bug 3 fix: set subFormId from payload
        if (payload?.subFormId) ctx.subFormId = payload.subFormId;
        ctx.subFormItemIndex = 0;
        ctx.subFormFieldIndex = 0;
        break;

      case "SUB_FORM_FIELD_COMPLETE":
        ctx.subFormFieldIndex += 1;
        break;

      case "SUB_FORM_NEXT_ITEM":
        ctx.subFormItemIndex += 1;
        ctx.subFormFieldIndex = 0;
        break;

      case "SUB_FORM_COMPLETE":
        ctx.subFormId = null;
        ctx.subFormItemIndex = 0;
        ctx.subFormFieldIndex = 0;
        break;

      case "DETOUR":
        if (this.state !== "DETOUR_QA") {
          ctx.detourOrigin = {
            state: this.state,           // stores the exact state we were in (PAUSED, WALKING, etc.)
            fieldIndex: ctx.fieldIndex,
            subFormId: ctx.subFormId,
            subFormItemIndex: ctx.subFormItemIndex,
            subFormFieldIndex: ctx.subFormFieldIndex,
          };
        }
        break;

      case "DETOUR_COMPLETE":
        if (ctx.detourOrigin) {
          ctx.fieldIndex = ctx.detourOrigin.fieldIndex;
          ctx.subFormId = ctx.detourOrigin.subFormId;
          ctx.subFormItemIndex = ctx.detourOrigin.subFormItemIndex;
          ctx.subFormFieldIndex = ctx.detourOrigin.subFormFieldIndex;
          ctx.detourOrigin = null;
        }
        break;

      case "RESET":
        // Bug 7 fix: clear all context
        ctx.formId = "";
        ctx.fieldIndex = 0;
        ctx.subFormId = null;
        ctx.subFormItemIndex = 0;
        ctx.subFormFieldIndex = 0;
        ctx.detourOrigin = null;
        break;

      case "ALL_FIELDS_DONE":
      case "CANCEL":
      case "PAUSE":
      case "RESUME":
        break;
    }

    return ctx;
  }
}