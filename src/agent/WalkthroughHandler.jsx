import { useEffect } from "react";
import { useAgent } from "./AgentBridge";
import { walkthroughEngine } from "./WalkthroughEngine";

export default function WalkthroughHandler() {
  const { addMessage, clearMessages, stopAudio, setIsPaused, setIsWalkthroughActive } = useAgent();

  useEffect(() => {
    walkthroughEngine.init({ setIsPaused, setIsWalkthroughActive, addMessage, clearMessages, stopAudio });
    return walkthroughEngine.wireAudio();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
