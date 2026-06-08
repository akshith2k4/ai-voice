import type { WalkthroughSession, PendingStatus } from "./sessionManager.js";

export class CancellationError extends Error {
  constructor(message: string = "Walkthrough cancelled") {
    super(message);
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
      const pending: any = {
        expectedEvent,
        matcher,
        resolve: (data: any) => {
          session.pendingStatuses = session.pendingStatuses.filter((p) => p !== pending);
          resolve(data);
        },
        reject: (reason: any) => {
          session.pendingStatuses = session.pendingStatuses.filter((p) => p !== pending);
          reject(reason);
        },
        timer: null as any,
      };

      pending.timer = setTimeout(() => {
        session.pendingStatuses = session.pendingStatuses.filter((p) => p !== pending);
        reject(new Error(`Timeout waiting for "${expectedEvent}" (${timeout}ms)`));
      }, timeout);

      session.pendingStatuses.push(pending);
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

    // Expected confirmation → resolve pending waits
    const matching = session.pendingStatuses.filter(
      (p) =>
        p.expectedEvent === event &&
        (!p.matcher || p.matcher(data))
    );

    // Remove matched from array first
    session.pendingStatuses = session.pendingStatuses.filter(
      (p) => !matching.includes(p)
    );

    for (const match of matching) {
      clearTimeout(match.timer);
      match.resolve(data);
    }
  }

  rejectPending(session: WalkthroughSession, reason: any): void {
    const list = [...session.pendingStatuses];
    session.pendingStatuses = [];
    for (const pending of list) {
      clearTimeout(pending.timer);
      pending.reject(reason);
    }
  }
}
