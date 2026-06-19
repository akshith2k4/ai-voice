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

export function useAudioRecorder({ onChunk, onEnd, enabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState("prompt");

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current || !enabled) return;
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission("granted");
      }
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(streamRef.current);
      sourceRef.current = source;

      await audioContext.audioWorklet.addModule("/audio-processor.js");
      const workletNode = new AudioWorkletNode(audioContext, "audio-recorder-processor");
      processorRef.current = workletNode;

      workletNode.port.onmessage = (e) => {
        if (!activeRef.current) return;
        const chunk = arrayBufferToBase64(float32To16BitPCM(e.data));
        if (chunk) onChunk(chunk);
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      activeRef.current = true;
      setIsRecording(true);
    } catch (err) {
      if (err.name === "NotAllowedError") setMicPermission("denied");
      console.error("[useAudioRecorder] start failed:", err);
    }
  }, [enabled, onChunk]);

  const stop = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setIsRecording(false);
    try {
      if (processorRef.current) {
        if (processorRef.current.port) {
          processorRef.current.port.onmessage = null;
        } else {
          processorRef.current.onaudioprocess = null;
        }
        processorRef.current.disconnect();
      }
      sourceRef.current?.disconnect();
      if (audioContextRef.current?.state !== "closed") audioContextRef.current?.close();
    } catch (e) {}
    onEnd();
  }, [onEnd]);

  useEffect(() => {
    if (!enabled && activeRef.current) {
      stop();
    }
  }, [enabled, stop]);

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  return { isRecording, micPermission, start, stop };
}
