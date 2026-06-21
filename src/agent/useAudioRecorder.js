import { useRef, useState, useCallback, useEffect } from "react";

function float32To16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

let sharedAudioContext = null;
let workletReady = null;

function getAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    workletReady = sharedAudioContext.audioWorklet.addModule("/audio-processor.js");
  }
  if (sharedAudioContext.state === "suspended") {
    sharedAudioContext.resume().catch(() => {});
  }
  return { ctx: sharedAudioContext, workletReady };
}

export function useAudioRecorder({ onChunk, onEnd, enabled, isAgentSpeaking }) {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState("prompt");

  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const workletNodeRef = useRef(null);
  const activeRef = useRef(false);

  const agentIsSpeakingRef = useRef(isAgentSpeaking);
  useEffect(() => {
    agentIsSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  const start = useCallback(async () => {
    if (activeRef.current || !enabled) return;
    try {
      const { ctx, workletReady } = getAudioContext();
      await workletReady;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;
      setMicPermission("granted");

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(ctx, "audio-recorder-processor");
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (!activeRef.current) return;
        if (agentIsSpeakingRef.current) return;
        const chunk = arrayBufferToBase64(float32To16BitPCM(e.data));
        if (chunk && onChunk) onChunk(chunk);
      };

      source.connect(workletNode);
      workletNode.connect(ctx.destination);
      activeRef.current = true;
      setIsRecording(true);
    } catch (err) {
      if (err.name === "NotAllowedError") setMicPermission("denied");
      console.error("[useAudioRecorder] start failed:", err);
      setIsRecording(false);
      activeRef.current = false;
    }
  }, [enabled, onChunk]);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setIsRecording(false);

    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } catch (e) {
      console.error("[useAudioRecorder] stop failed:", e);
    }

    if (onEnd) onEnd();
  }, [onEnd]);

  useEffect(() => {
    if (!enabled && activeRef.current) {
      stop();
    }
  }, [enabled, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        stop();
      }
    };
  }, [stop]);

  return { isRecording, micPermission, start, stop };
}

