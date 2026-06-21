import { connectionManager } from "../connectionManager.js";
import type { OutgoingMessage } from "../types.js";

export class ToolMessenger {
  send(sessionId: string, message: OutgoingMessage): void {
    connectionManager.send(sessionId, message);
  }
}
