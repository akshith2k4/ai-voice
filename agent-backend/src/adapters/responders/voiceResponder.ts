import crypto from "crypto";
import { connectionManager } from "../../connectionManager.js";
import { openStream, interruptActiveTTS, synthesizeStream } from "../../services/ttsService.js";
import * as responseSender from "../../services/responseSender.js";
import { recordTts, logLatency, getTurnId, startTracking } from "../../services/latencyTracker.js";
import { fireAndForget } from "../../services/observability.js";
import { CancellationError, type EventMonitor } from "../../walkthrough/eventMonitor.js";
import type { WalkthroughSession } from "../../walkthrough/sessionManager.js";
import type { IResponder } from "./IResponder.js";
import type { HandlerContext } from "../../types.js";

export class VoiceResponder implements IResponder {
  private streamInstance: ReturnType<typeof openStream> | null = null;
  private streamMessageId: string | null = null;
  private activeNarration: { interrupted: boolean } | null = null;
  private streamedText = "";

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
      this.streamedText = "";
      this.streamMessageId = crypto.randomUUID();
      const mid = this.streamMessageId;
      
      // MARK: Agent started speaking
      import("../voiceAdapter.js")
        .then(({ markAgentSpeechStart }) => markAgentSpeechStart(this.sessionId))
        .catch(() => {});

      this.streamInstance = openStream(
        this.sessionId, this.lang,
        (base64, done) => {
          responseSender.sendTtsAudio(this.send, base64, mid, done);
          if (done) {
            // MARK: Agent finished speaking
            import("../voiceAdapter.js")
              .then(({ markAgentSpeechEnd }) => markAgentSpeechEnd(this.sessionId))
              .catch(() => {});
          }
        },
        (text) => responseSender.sendRespond(this.send, text, true, mid, undefined),
        () => {
          responseSender.sendStopAudio(this.send);
          import("../voiceAdapter.js")
            .then(({ markAgentSpeechEnd }) => markAgentSpeechEnd(this.sessionId))
            .catch(() => {});
        }
      );
    }
    this.streamedText += chunk;
    this.streamInstance.push(chunk);
  }

  onComplete(text: string, messageId: string, latency?: any): void {
    if (this.streamInstance) {
      if (this.streamedText && text && !text.startsWith(this.streamedText)) {
        // Fallback occurred (LLM failed partway and stream content differs from fallback text)
        this.interrupt();
        this.speak(text, messageId);
      } else {
        this.streamInstance.finish();
      }
    } else if (text) {
      responseSender.sendRespond(this.send, text, true, messageId, latency);
      this.speak(text, messageId);
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

    // Wrap the entire narration in startTracking() so this runs in an
    // AsyncLocalStorage context — enabling responseSender to create a DB turn
    // row and logLatency() to write timings back to that row.
    return startTracking(this.sessionId, async () => {
      responseSender.sendRespond(this.send, text, true, id);

      const narrationState = { interrupted: false };
      this.activeNarration = narrationState;

      // MARK: Agent started speaking
      import("../voiceAdapter.js")
        .then(({ markAgentSpeechStart }) => markAgentSpeechStart(this.sessionId))
        .catch(() => {});

      const hash = getHash(text, this.lang);
      const s3Key = `walkthrough-audio/${hash}.mp3`;

      try {
        const { checkS3ObjectExists } = await import("../../services/s3Service.js");
        const s3CheckStart = Date.now();
        if (await checkS3ObjectExists(s3Key)) {
          const { getPresignedUrl } = await import("../../services/s3Service.js");
          const url = await getPresignedUrl(s3Key);
          recordTts(Date.now() - s3CheckStart);
          logLatency("speak-cached");
          if (!narrationState.interrupted) {
            this.send({ type: "tts_audio", url, messageId: id, done: true });
          }
          return id;
        }
      } catch (e) {
        console.warn(`[VoiceResponder] S3 check failed:`, e);
      }

      try {
        const chunks: Buffer[] = [];
        const ttsStart = Date.now();
        let firstChunk = true;
        await synthesizeStream(text, this.lang, (base64Chunk, isDone) => {
          if (firstChunk && base64Chunk) {
            firstChunk = false;
            recordTts(Date.now() - ttsStart);
            logLatency("speak");
          }
          if (base64Chunk) chunks.push(Buffer.from(base64Chunk, "base64"));
          if (!narrationState.interrupted) {
            this.send({ type: "tts_audio", audio: base64Chunk, messageId: id, done: isDone });
          } else if (isDone) {
            this.send({ type: "tts_audio", audio: "", messageId: id, done: true });
          }
          if (isDone) {
            import("../voiceAdapter.js")
              .then(({ markAgentSpeechEnd }) => markAgentSpeechEnd(this.sessionId))
              .catch(() => {});
          }
          if (isDone && chunks.length > 0) {
            const buf = Buffer.concat(chunks);
            import("../../services/s3Service.js")
              .then(({ uploadToS3 }) => {
                return uploadToS3(s3Key, buf, "audio/mpeg").then(() => {
                  const turnId = getTurnId();
                  if (turnId) {
                    fireAndForget(
                      (async () => {
                        const { db, turns } = await import("../../services/db.js");
                        const { eq } = await import("drizzle-orm");
                        await db.update(turns)
                          .set({ agentAudioUrl: s3Key })
                          .where(eq(turns.id, turnId));
                      })()
                    );
                  }
                });
              })
              .catch(e => console.warn(`[VoiceResponder] S3 upload failed:`, e));
          }
        }, this.sessionId);
      } catch (e) {
        console.error(`[VoiceResponder] TTS synthesis failed:`, e);
        import("../voiceAdapter.js")
          .then(({ markAgentSpeechEnd }) => markAgentSpeechEnd(this.sessionId))
          .catch(() => {});
        if (!narrationState.interrupted) {
          this.send({ type: "tts_audio", audio: "", messageId: id, done: true });
        }
      }

      return id;
    });
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
    
    // Cap the maximum timeout at 15 seconds regardless of text length
    // Average speaking rate is ~150 words/min = 2.5 words/sec
    const estimatedDuration = (text.split(/\s+/).length / 2.5) * 1000;
    const timeout = Math.min(Math.max(minTimeoutMs, estimatedDuration + 2000), 15000);
    
    try {
      await this.eventMonitor.waitForEvent(
        this.boundSession, "tts_playback_complete", timeout,
        (d) => d.messageId === messageId
      );
      return false;
    } catch (err) {
      return true;
    }
  }

  // ── Interruption ────────────────────────────────────────────────────────────

  interrupt(): void {
    if (this.activeNarration) this.activeNarration.interrupted = true;
    if (this.streamInstance) this.streamInstance.interrupt();
    interruptActiveTTS(this.sessionId);
    this.send({ type: "tool", tool: "stop_audio", args: {} });
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
