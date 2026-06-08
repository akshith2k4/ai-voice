import { TOOL_TYPES, STATUS_EVENTS, MESSAGE_TYPES } from "./protocol";

const TOOL_HANDLERS = {
  [TOOL_TYPES.RESPOND]: (args, { addMessage, setIsProcessing }) => {
    const text = args?.message || "";
    const tts = args?.tts !== false;
    const latency = args?.latency;

    // "You said: ..." echoes go to the user bubble, not agent
    if (text.startsWith("You said:")) {
      const spoken = text.replace(/^You said:\s*"?/, "").replace(/"$/, "");
      addMessage("user", spoken);
    } else {
      addMessage("agent", text, latency);
    }

    // If no TTS follows, clear processing state now
    if (!tts) {
      setIsProcessing(false);
    }
  },
  [TOOL_TYPES.NAVIGATE]: (args, { setPendingNavigation }) => {
    const route = args?.route;
    if (route) {
      setPendingNavigation(route);
    }
  },
  [TOOL_TYPES.START_WALKTHROUGH]: (args, { setPendingTool }) => {
    const formId = args?.formId;
    if (formId) {
      setPendingTool({ type: TOOL_TYPES.START_WALKTHROUGH, formId, uuid: crypto.randomUUID() });
    }
  },
  [TOOL_TYPES.RESUME_WALKTHROUGH]: (_, { setPendingTool }) => {
    setPendingTool({ type: TOOL_TYPES.RESUME_WALKTHROUGH, uuid: crypto.randomUUID() });
  },
  [TOOL_TYPES.PAUSE_WALKTHROUGH]: (_, { setPendingTool }) => {
    setPendingTool({ type: TOOL_TYPES.PAUSE_WALKTHROUGH, uuid: crypto.randomUUID() });
  },
  [TOOL_TYPES.CANCEL_WALKTHROUGH]: (_, { setPendingTool }) => {
    setPendingTool({ type: TOOL_TYPES.CANCEL_WALKTHROUGH, uuid: crypto.randomUUID() });
  },
  "stop_audio": (_, { audioQueue }) => {
    if (audioQueue) {
      audioQueue.clear(true);
    }
  }
};

export function routeIncomingMessage(
  data,
  {
    addMessage,
    setIsProcessing,
    setPendingNavigation,
    setPendingTool,
    setIsWalkthroughActive,
    audioQueue
  }
) {
  try {
    const message = JSON.parse(data);

    if (!message || typeof message.type !== "string") {
      console.warn("[AgentBridge] Invalid message payload: missing or non-string 'type'.");
      return;
    }

    switch (message.type) {
      case MESSAGE_TYPES.TOOL: {
        if (typeof message.tool !== "string") {
          console.warn("[AgentBridge] Invalid tool message: 'tool' must be a string.");
          break;
        }
        if (message.args !== undefined && (typeof message.args !== "object" || message.args === null)) {
          console.warn("[AgentBridge] Invalid tool message: 'args' must be an object.");
          break;
        }

        if (setIsWalkthroughActive) {
          if (message.tool === TOOL_TYPES.START_WALKTHROUGH || message.tool === TOOL_TYPES.BEGIN_WALKTHROUGH) {
            setIsWalkthroughActive(true);
          } else if (message.tool === TOOL_TYPES.CANCEL_WALKTHROUGH || message.tool === "walkthrough_finished") {
            setIsWalkthroughActive(false);
          }
        }

        const handler = TOOL_HANDLERS[message.tool];
        const context = { addMessage, setIsProcessing, setPendingNavigation, setPendingTool, audioQueue };

        if (handler) {
          handler(message.args, context);
        } else if (Object.values(TOOL_TYPES).includes(message.tool)) {
          setPendingTool({ type: message.tool, args: message.args, uuid: crypto.randomUUID() });
        } else {
          console.log(`[AgentBridge] Unhandled tool: ${message.tool}`, message.args);
        }
        break;
      }

      case MESSAGE_TYPES.TTS_AUDIO: {
        const { audio, url, messageId, done } = message;
        if (typeof messageId !== 'string' && typeof messageId !== 'number') {
          console.warn("[AgentBridge] Invalid tts_audio message: 'messageId' must be a string or number.");
          break;
        }

        if (url) {
          if (typeof url !== 'string') {
            console.warn("[AgentBridge] Invalid tts_audio message: 'url' must be a string.");
            break;
          }
          audioQueue?.enqueueUrl(url, messageId);
          break;
        }

        if (typeof audio !== 'string') {
          console.warn("[AgentBridge] Invalid tts_audio message: 'audio' must be a string.");
          break;
        }
        if (audio.length === 0 && !done) {
          console.warn("[AgentBridge] Invalid tts_audio message: empty audio chunk but not done.");
          break;
        }
        audioQueue?.enqueue(audio, messageId, done);
        break;
      }

      case MESSAGE_TYPES.STATUS_ACK:
        console.log(`[AgentBridge] Status ack: ${message.event}`);
        break;

      case MESSAGE_TYPES.ERROR:
        console.error(`[AgentBridge] Error: ${message.message}`);
        addMessage("agent", `Error: ${message.message}`);
        setIsProcessing(false);
        break;

      default:
        console.warn(`[AgentBridge] Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error("[AgentBridge] Parse error:", error);
  }
}

