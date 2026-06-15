export interface IResponder {
  // Called per LLM text token — drives streaming TTS for real-time response
  onTextChunk(chunk: string): void;

  // Called when LLM finishes — closes the TTS stream, sends final respond message
  onComplete(text: string, messageId: string, latency?: { stt: number; llm: number; tts: number; total: number }): void;

  // Delivers known text to the user (S3 cache → synthesize). Returns messageId.
  speak(text: string, messageId?: string): Promise<string>;

  // speak + waits for tts_playback_complete from frontend. Returns messageId.
  speakAndWait(text: string): Promise<string>;

  // Waits for a specific messageId's playback to complete.
  // Returns true if playback was interrupted (barge-in), false on completion/timeout.
  waitForPlayback(messageId: string, text: string, minTimeoutMs?: number): Promise<boolean>;

  // Interrupts all active audio — TTS stream, active narration, sends stop_audio.
  interrupt(): void;
}
