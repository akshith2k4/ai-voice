import { WalkthroughStateMachine } from "./stateMachine.js";
import {
  getSchema,
  getAvailableForms,
  type FormSchema,
  type FieldNode,
  type SchemaNode,
} from "../schema/loader.js";
import type { IResponder } from "../adapters/responders/IResponder.js";

// Backward-compat aliases
export type FieldSchema = FieldNode;
export type SubFormSchema = import("../schema/loader.js").RepeatingNode;

export interface AsyncEventWaiter {
  expectedEvent: string;
  matcher?: (data: any) => boolean;
  resolve: (data: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface WalkthroughCommand {
  tools: Array<{ tool: string; args: Record<string, unknown> }>;
  waitFor: string;
  fill?: { key: string; value: unknown };
  navContext?: { fieldKey: string; label: string; repeatingId?: string; itemIndex?: number };
}

export interface WalkthroughSession {
  sessionId: string;
  formId: string;
  schema: FormSchema;
  stateMachine: WalkthroughStateMachine;
  filledValues: Map<string, unknown>;
  cancelled: boolean;
  eventWaiters: AsyncEventWaiter[];
  isRegistered: boolean;
  ttsEnabled: boolean;
  languageCode: string;
  treeWalker: Generator<WalkthroughCommand, void, unknown>;
  waitingFor: string | null;
  lastCommand: WalkthroughCommand | null;
  currentNav: { fieldKey: string; label: string; repeatingId?: string; itemIndex?: number } | null;
  responder?: IResponder;
}

export class SessionManager {
  private sessions: Map<string, WalkthroughSession> = new Map();

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  get(sessionId: string): WalkthroughSession | undefined {
    return this.sessions.get(sessionId);
  }

  create(sessionId: string, formId: string, ttsEnabled: boolean = true, languageCode: string = "en"): WalkthroughSession {
    const schema = getSchema(formId);
    const session: WalkthroughSession = {
      sessionId,
      formId,
      schema,
      stateMachine: new WalkthroughStateMachine(),
      filledValues: new Map(),
      cancelled: false,
      eventWaiters: [],
      isRegistered: false,
      ttsEnabled,
      languageCode,
      treeWalker: null as any, // set by executor after creating the session
      waitingFor: null,
      lastCommand: null,
      currentNav: null,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  cancel(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.cancelled = true;
  }

  delete(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export { getSchema, getAvailableForms, type FormSchema, type FieldNode, type SchemaNode };
