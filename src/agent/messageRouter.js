import { TOOL_TYPES, STATUS_EVENTS, MESSAGE_TYPES } from "./protocol";

export function routeIncomingMessage(
  data,
  {
    addMessage,
    setIsProcessing,
    setPendingNavigation,
    setPendingTool,
    audioQueue
  }
) {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      case MESSAGE_TYPES.TOOL: {
        if (message.tool === TOOL_TYPES.RESPOND) {
          const text = message.args?.message || "";
          const tts = message.args?.tts !== false;

          // "You said: ..." echoes go to the user bubble, not agent
          if (text.startsWith("You said:")) {
            const spoken = text.replace(/^You said:\s*"?/, "").replace(/"$/, "");
            addMessage("user", spoken);
          } else {
            addMessage("agent", text);
          }

          // If no TTS follows, clear processing state now
          if (!tts) {
            setIsProcessing(false);
          }
          // If tts=true, processing clears when audio playback ends
        } else if (message.tool === TOOL_TYPES.NAVIGATE) {
          const route = message.args?.route;
          if (route) {
            setPendingNavigation(route);
          }
        } else if (message.tool === TOOL_TYPES.START_WALKTHROUGH) {
          const formId = message.args?.formId;
          if (formId) {
            setPendingTool({ type: TOOL_TYPES.START_WALKTHROUGH, formId });
          }
        } else if (message.tool === TOOL_TYPES.RESUME_WALKTHROUGH) {
          setPendingTool({ type: TOOL_TYPES.RESUME_WALKTHROUGH });
        } else if (message.tool === TOOL_TYPES.PAUSE_WALKTHROUGH) {
          setPendingTool({ type: TOOL_TYPES.PAUSE_WALKTHROUGH });
        } else if (message.tool === TOOL_TYPES.CANCEL_WALKTHROUGH) {
          setPendingTool({ type: TOOL_TYPES.CANCEL_WALKTHROUGH });
        } else if (
          Object.values(TOOL_TYPES).includes(message.tool)
        ) {
          setPendingTool({ type: message.tool, args: message.args });
        } else {
          console.log(`[AgentBridge] Unhandled tool: ${message.tool}`, message.args);
        }
        break;
      }

      case MESSAGE_TYPES.TTS_AUDIO: {
        const { audio, messageId } = message;
        if (audio && messageId) {
          audioQueue?.enqueue(audio, messageId);
        }
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

