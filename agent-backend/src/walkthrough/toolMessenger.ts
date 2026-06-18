import { connectionManager } from "../connectionManager.js";
import type { OutgoingMessage } from "../types.js";

export class ToolMessenger {
  send(sessionId: string, message: OutgoingMessage): void {
    console.log("[ToolMessenger] send called, connectionManager.send is:", typeof connectionManager.send, connectionManager.send.toString().slice(0, 100));
    connectionManager.send(sessionId, message);
  }
}
