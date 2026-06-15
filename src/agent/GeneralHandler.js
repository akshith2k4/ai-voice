import { TOOL_TYPES } from "./protocol";
import { audioQueue } from "./AudioQueue";

export function handleGeneralTool(tool, args, { addMessage, setIsProcessing, setPendingNavigation }) {
  if (tool === TOOL_TYPES.RESPOND) {
    const text = args?.message || "";
    const tts = args?.tts !== false;
    if (text.startsWith("You said:")) {
      const spoken = text.replace(/^You said:\s*"?/, "").replace(/"$/, "");
      addMessage("user", spoken);
    } else if (text) {
      addMessage("agent", text, args?.latency);
    }
    if (!tts) setIsProcessing(false);
    return;
  }
  if (tool === TOOL_TYPES.NAVIGATE) {
    if (args?.route) setPendingNavigation(args.route);
    return;
  }
  if (tool === "stop_audio") {
    audioQueue.clear();
    return;
  }
  console.log(`[GeneralHandler] Unhandled tool: ${tool}`, args);
}
