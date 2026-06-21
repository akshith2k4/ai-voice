import type { WalkthroughSession, AsyncEventWaiter } from "./sessionManager.js";

export class CancellationError extends Error {
  constructor(message: string = "Walkthrough cancelled") {
    super(message);
    this.name = "CancellationError";
  }
}

// Bridges async WebSocket events into promises — used by voiceResponder.waitForPlayback
// so the LLM response path can await TTS completion and detect barge-in.
export class EventMonitor {
  waitForEvent(
    session: any,
    expectedEvent: string,
    timeout: number,
    matcher?: (data: any) => boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const waiter: any = {
        expectedEvent,
        matcher,
        resolve: (data: any) => {
          if (session.eventWaiters) {
            session.eventWaiters = session.eventWaiters.filter((w) => w !== waiter);
          }
          resolve(data);
        },
        reject: (reason: any) => {
          if (session.eventWaiters) {
            session.eventWaiters = session.eventWaiters.filter((w) => w !== waiter);
          }
          reject(reason);
        },
        timer: null as any,
      };

      waiter.timer = setTimeout(() => {
        if (session.eventWaiters) {
          session.eventWaiters = session.eventWaiters.filter((w) => w !== waiter);
        }
        reject(new Error(`Timeout waiting for "${expectedEvent}" (${timeout}ms)`));
      }, timeout);

      if (!session.eventWaiters) {
        session.eventWaiters = [];
      }
      session.eventWaiters.push(waiter);
    });
  }

  // Notify any pending TTS waiters that an event arrived.
  notify(session: any, event: string, data?: any): void {
    if (!session.eventWaiters) return;
    const matching = session.eventWaiters.filter(
      (w: any) => w.expectedEvent === event && (!w.matcher || w.matcher(data))
    );
    session.eventWaiters = session.eventWaiters.filter((w: any) => !matching.includes(w));
    for (const waiter of matching) {
      clearTimeout(waiter.timer);
      waiter.resolve(data);
    }
  }

  rejectPending(session: any, reason: any): void {
    if (!session.eventWaiters) return;
    const list = [...session.eventWaiters];
    session.eventWaiters = [];
    for (const waiter of list) {
      clearTimeout(waiter.timer);
      waiter.reject(reason);
    }
  }
}
