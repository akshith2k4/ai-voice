import type { WalkthroughSession, PendingStatus } from "./sessionManager.js";

export class CancellationError extends Error {
  constructor() {
    super("Walkthrough cancelled");
    this.name = "CancellationError";
  }
}

export class StatusAwaiter {
  waitForStatus(
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

  handleIncomingStatus(session: WalkthroughSession, event: string, data?: any): void {
    // User-initiated interruptions → cancel immediately
    if (event === "dialog_closed_by_user" || event === "page_changed") {
      console.log(`[StatusAwaiter] User interruption: ${event} — cancelling ${session.sessionId}`);
      session.cancelled = true;
      this.rejectPending(session, new CancellationError());
      return;
    }

    // Frontend error → reject pending wait (triggers retry)
    if (event === "error") {
      console.warn(`[StatusAwaiter] Frontend error: ${data?.tool} / ${data?.fieldKey} — ${data?.reason}`);
      this.rejectPending(session, new Error(`Frontend error: ${data?.reason || "unknown"}`));
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

  rejectPending(session: WalkthroughSession, reason: any): void {
    if (session.pendingStatus) {
      clearTimeout(session.pendingStatus.timer);
      session.pendingStatus.reject(reason);
      session.pendingStatus = null;
    }
  }
}
