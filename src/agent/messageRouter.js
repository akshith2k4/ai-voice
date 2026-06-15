import { MESSAGE_TYPES } from "./protocol";
import { dispatchTool } from "./ToolRouter";
import { walkthroughEngine } from "./WalkthroughEngine";

export function routeIncomingMessage(data, { addMessage, setIsProcessing, setPendingNavigation }) {
  let message;
  try {
    message = JSON.parse(data);
  } catch {
    console.error("[messageRouter] JSON parse error");
    return;
  }

  if (!message || typeof message.type !== "string") {
    console.warn("[messageRouter] Missing or invalid message type");
    return;
  }

  switch (message.type) {
    case MESSAGE_TYPES.TOOL: {
      if (typeof message.tool !== "string") {
        console.warn("[messageRouter] Tool message missing 'tool' string");
        break;
      }
      dispatchTool(message.tool, message.args || {}, { addMessage, setIsProcessing, setPendingNavigation });
      break;
    }

    case MESSAGE_TYPES.TTS_AUDIO: {
      const { audio, url, messageId, done } = message;
      if (typeof messageId !== "string" && typeof messageId !== "number") {
        console.warn("[messageRouter] tts_audio missing messageId");
        break;
      }
      if (url) {
        walkthroughEngine.receiveAudio({ url, messageId });
      } else if (typeof audio === "string") {
        walkthroughEngine.receiveAudio({ base64: audio, messageId, done });
      } else {
        console.warn("[messageRouter] tts_audio: no url or audio payload");
      }
      break;
    }

    case MESSAGE_TYPES.ERROR:
      console.error(`[messageRouter] Backend error: ${message.message}`);
      addMessage("agent", `Error: ${message.message}`);
      setIsProcessing(false);
      break;

    case MESSAGE_TYPES.STATUS_ACK:
      console.log(`[messageRouter] Status ack: ${message.event}`);
      break;

    default:
      console.warn(`[messageRouter] Unknown message type: ${message.type}`);
  }
}
