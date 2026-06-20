import { connectionManager } from "./src/connectionManager.js";
import { cleanupSession } from "./src/adapters/voiceAdapter.js";
import { routeMessage, parseMessage } from "./src/messageRouter.js";
import type { ClientData, OutgoingMessage } from "./src/types.js";

// ============================================
// Agent Backend — Bun WebSocket Server
// ============================================
import { loadAllSchemas, getAvailableForms } from "./src/schema/loader";
import { resolve } from "path";
import { initializeFillers } from "./src/services/fillerService.js";

loadAllSchemas(resolve(import.meta.dir, "src/schema/forms"));
console.log("Available forms:", getAvailableForms());
await initializeFillers();
const PORT = parseInt(process.env.PORT || "3001");
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

console.log(`[Config] PORT: ${PORT}`);
console.log(`[Config] CORS_ORIGIN: ${CORS_ORIGIN}`);

const server = Bun.serve<ClientData>({
  port: PORT,

  fetch(req, server) {
    const origin = req.headers.get("origin") || "";

    // Handle WebSocket upgrade
    const upgradeHeader = req.headers.get("upgrade");
    if (upgradeHeader && upgradeHeader.toLowerCase() === "websocket") {
      const isDev = process.env.NODE_ENV !== "production";
      if (origin && origin !== CORS_ORIGIN) {
        console.warn(
          `[Server] Rejected WebSocket upgrade from origin: ${origin}`
        );
        return new Response("Forbidden", { status: 403 });
      }
      if (!origin && !isDev) {
        console.warn(`[Server] Rejected WebSocket upgrade: missing origin in production`);
        return new Response("Forbidden", { status: 403 });
      }

      // Generate session ID and upgrade
      const sessionId = crypto.randomUUID();
      const success = server.upgrade(req, {
        data: {
          sessionId,
          connectedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
      });

      if (success) {
        console.log(
          `[Server] WebSocket upgrade accepted: ${sessionId} from ${origin}`
        );
        return; // Bun handles the response
      }

      console.error(`[Server] WebSocket upgrade failed for ${sessionId}`);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    // Health check endpoint
    if (req.url.endsWith("/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          connections: connectionManager.size,
          sessions: connectionManager.getSessionIds(),
          uptime: process.uptime(),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": CORS_ORIGIN,
          },
        }
      );
    }

    // Default response for non-WebSocket requests
    return new Response("Agent Backend — use WebSocket to connect", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": CORS_ORIGIN,
      },
    });
  },

  websocket: {
    open(ws) {
      const { sessionId } = ws.data;
      connectionManager.add(sessionId, ws);
    },

    // Called when a message is received from a client
    message(ws, message) {
      const { sessionId } = ws.data;

      // Update activity timestamp
      connectionManager.touch(sessionId);

      // Parse the message
      const parsed = parseMessage(message);
      if (!parsed) {
        console.warn(`[Server] Invalid message from ${sessionId}, ignoring`);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format. Expected JSON with 'type' field.",
            code: "INVALID_FORMAT",
          })
        );
        return;
      }

      // Log message type only (not content)
      console.log(
        `[Server] Message received: type="${parsed.type}" from ${sessionId}`
      );

      // Create handler context
      const context = {
        sessionId,
        send: (msg: OutgoingMessage) => {
          connectionManager.send(sessionId, msg);
        },
      };

      // Route to the appropriate handler
      routeMessage(parsed, context);
    },

    // Called when a WebSocket connection is closed
    close(ws, code, reason) {
      const { sessionId } = ws.data;
      console.log(
        `[Server] Connection closed: ${sessionId} (code: ${code}, reason: ${reason || "none"})`
      );
      cleanupSession(sessionId);
      connectionManager.remove(sessionId);
    },

    // Send ping every 30 seconds to keep connections alive
    idleTimeout: 300, // 5 minutes — longer to account for STT/LLM/TTS latency
  },
});

console.log(`\n🚀 Agent backend running on ws://localhost:${PORT}`);
console.log(`   Health check: http://localhost:${PORT}/health`);
console.log(`   Allowed origin: ${CORS_ORIGIN}`);
console.log(`   Press Ctrl+C to stop\n`);
