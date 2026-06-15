import crypto from "crypto";
import { connectionManager } from "../../connectionManager.js";
import { openStream, interruptActiveTTS, synthesizeStream } from "../../services/ttsService.js";
import * as responseSender from "../../services/responseSender.js";
import { recordTts, logLatency } from "../../services/latencyTracker.js";
import { CancellationError, type EventMonitor } from "../../walkthrough/eventMonitor.js";
import type { WalkthroughSession } from "../../walkthrough/sessionManager.js";
import type { IResponder } from "./IResponder.js";
import type { HandlerContext } from "../../types.js";

export class VoiceResponder implements IResponder {
  private streamInstance: ReturnType<typeof openStream> | null = null;
  private streamMessageId: string | null = null;
  private activeNarration: { interrupted: boolean } | null = null;

  // Set by executor when walkthrough starts — enables speakAndWait + interrupt of narration
  public boundSession?: WalkthroughSession;

  constructor(
    private readonly send: HandlerContext["send"],
    private readonly sessionId: string,
    private readonly lang: string,
    private readonly eventMonitor: EventMonitor
  ) {}

  // ── LLM streaming path ─────────────────────────────────────────────────────

  onTextChunk(chunk: string): void {
    if (!this.streamInstance) {
      this.streamMessageId = crypto.randomUUID();
      const mid = this.streamMessageId;
      this.streamInstance = openStream(
        this.sessionId, this.lang,
        (base64, done) => responseSender.sendTtsAudio(this.send, base64, mid, done),
        (text) => responseSender.sendRespond(this.send, text, true, mid, undefined),
        () => responseSender.sendStopAudio(this.send)
      );
    }
    this.streamInstance.push(chunk);
  }

  onComplete(text: string, messageId: string, latency?: any): void {
    if (this.streamInstance) {
      this.streamInstance.finish();
    } else if (text) {
      responseSender.sendRespond(this.send, text, true, messageId, latency);
    }
  }

  getStreamMessageId(): string | null {
    return this.streamMessageId;
  }

  // ── Known-text path (walkthrough narration) ────────────────────────────────

  // S3 cache check → live synthesis → streams audio. Returns messageId.
  async speak(text: string, messageId?: string): Promise<string> {
    if (!text) return messageId ?? crypto.randomUUID();

    const id = messageId ?? crypto.randomUUID();
    const narrationState = { interrupted: false };
    this.activeNarration = narrationState;

    const hash = getHash(text, this.lang);
    const s3Key = `walkthrough-audio/${hash}.mp3`;

    try {
      const { checkS3ObjectExists } = await import("../../services/s3Service.js");
      if (await checkS3ObjectExists(s3Key)) {
        const { getPresignedUrl } = await import("../../services/s3Service.js");
        const url = await getPresignedUrl(s3Key);
        if (!narrationState.interrupted) {
          connectionManager.send(this.sessionId, { type: "tts_audio", url, messageId: id, done: true });
        }
        return id;
      }
    } catch (e) {
      console.warn(`[VoiceResponder] S3 check failed:`, e);
    }

    try {
      const chunks: Buffer[] = [];
      await synthesizeStream(text, this.lang, (base64Chunk, isDone) => {
        if (base64Chunk) chunks.push(Buffer.from(base64Chunk, "base64"));
        if (!narrationState.interrupted) {
          connectionManager.send(this.sessionId, { type: "tts_audio", audio: base64Chunk, messageId: id, done: isDone });
        } else if (isDone) {
          connectionManager.send(this.sessionId, { type: "tts_audio", audio: "", messageId: id, done: true });
        }
        if (isDone && chunks.length > 0) {
          const buf = Buffer.concat(chunks);
          import("../../services/s3Service.js")
            .then(({ uploadToS3 }) => uploadToS3(s3Key, buf, "audio/mpeg"))
            .catch(e => console.warn(`[VoiceResponder] S3 upload failed:`, e));
        }
      }, this.sessionId);
    } catch (e) {
      console.error(`[VoiceResponder] TTS synthesis failed:`, e);
      connectionManager.send(this.sessionId, { type: "tts_audio", audio: "", messageId: id, done: true });
    }

    return id;
  }

  // speak + wait for tts_playback_complete. Returns messageId.
  async speakAndWait(text: string): Promise<string> {
    const id = await this.speak(text);
    await this.waitForPlayback(id, text);
    return id;
  }

  // Wait for a specific messageId's playback to finish.
  // Returns true if interrupted (barge-in), false on completion or timeout.
  async waitForPlayback(messageId: string, text: string, minTimeoutMs = 5000): Promise<boolean> {
    if (!this.boundSession) return false;
    const timeout = Math.max(minTimeoutMs, (text.split(/\s+/).length / 2.5) * 2000);
    try {
      await this.eventMonitor.waitForEvent(
        this.boundSession, "tts_playback_complete", timeout,
        (d) => d.messageId === messageId
      );
      return false;
    } catch (err) {
      return err instanceof CancellationError;
    }
  }

  // ── Interruption ────────────────────────────────────────────────────────────

  interrupt(): void {
    if (this.activeNarration) this.activeNarration.interrupted = true;
    if (this.streamInstance) this.streamInstance.interrupt();
    interruptActiveTTS(this.sessionId);
    connectionManager.send(this.sessionId, { type: "tool", tool: "stop_audio", args: {} });
    if (this.boundSession) {
      this.eventMonitor.rejectPending(this.boundSession, new CancellationError("Narration interrupted"));
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getHash(text: string, lang: string): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(`${normalized}_${lang}`).digest("hex");
}
