import { WalkthroughStateMachine } from "../state/stateMachine.js";
import {
  getSchema,
  getAvailableForms,
  type FormSchema,
  type FieldSchema,
  type SubFormSchema,
} from "../schema/loader.js";

export interface PendingStatus {
  expectedEvent: string;
  matcher?: (data: any) => boolean;
  resolve: (data: any) => void;
  reject: (reason: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface WalkthroughSession {
  sessionId: string;
  formId: string;
  schema: FormSchema;
  stateMachine: WalkthroughStateMachine;
  filledValues: Map<string, unknown>;
  cancelled: boolean;
  errorCount: number;
  pendingStatuses: PendingStatus[];
  isRegistered: boolean;
  ttsEnabled: boolean;
  languageCode: string;
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
      errorCount: 0,
      pendingStatuses: [],
      isRegistered: false,
      ttsEnabled,
      languageCode,
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

export { getSchema, getAvailableForms, type FormSchema, type FieldSchema, type SubFormSchema };
