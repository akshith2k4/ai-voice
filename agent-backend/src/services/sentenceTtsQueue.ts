import * as ttsService from "./ttsService.js";
import * as responseSender from "./responseSender.js";
import type { HandlerContext } from "../types.js";

export class SentenceTTSQueue {
  private queue: Array<{ text: string; isLast: boolean }> = [];
  private processing = false;
  private sessionId: string;
  private send: HandlerContext["send"];
  private languageCode: string;
  private messageId: string;
  private tracker?: any;
  private ttsStart: number;
  private firstChunkReceived = false;
  private allPushed = false;
  private hasToolCalls = false;
  public interrupted = false;

  constructor(sessionId: string, send: HandlerContext["send"], languageCode: string, messageId: string, tracker?: any) {
    this.sessionId = sessionId;
    this.send = send;
    this.languageCode = languageCode;
    this.messageId = messageId;
    this.tracker = tracker;
    this.ttsStart = Date.now();
  }
  
  interrupt() {
    this.interrupted = true;
    this.queue = [];
    responseSender.sendStopAudio(this.send);
  }

  push(text: string, isLast: boolean) {
    this.queue.push({ text, isLast });
    this.process();
  }

  markAllPushed(hasToolCalls = false) {
    this.allPushed = true;
    this.hasToolCalls = hasToolCalls;
    if (this.queue.length > 0) {
      this.queue[this.queue.length - 1].isLast = true;
    }
    this.process();
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (this.interrupted) {
         this.queue = [];
         break;
      }
      if (!this.allPushed && this.queue.length === 1) {
        break;
      }

      const item = this.queue.shift()!;
      await this.synthesizeSentence(item.text, item.isLast);
    }

    if (this.allPushed && this.queue.length === 0) {
      if (!this.firstChunkReceived && !this.hasToolCalls) {
        responseSender.sendRespond(this.send, "", true, this.messageId, undefined);
        responseSender.sendTtsAudio(this.send, "", this.messageId, true);
      }
    }

    this.processing = false;
  }

  private synthesizeSentence(text: string, isLast: boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      ttsService.synthesizeStream(text, this.languageCode, (base64Chunk, chunkDone) => {
        if (!this.firstChunkReceived) {
          this.firstChunkReceived = true;
          if (this.tracker) {
            this.tracker.ttsDuration = Date.now() - this.ttsStart;
            const totalDuration = Date.now() - this.tracker.startTime;
            console.log(
              `[Latency Breakdown] 🔊 Speech Response (First Chunk): "${text}"
-----------------------------------------
🎙️ STT:   ${this.tracker.sttDuration}ms
🧠 LLM:   ${this.tracker.llmDuration}ms
🔊 TTS:   ${this.tracker.ttsDuration}ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
            );
          }
        }

        if (!this.interrupted) {
          const sendDone = isLast && chunkDone;
          responseSender.sendTtsAudio(this.send, base64Chunk, this.messageId, sendDone);
        }

        if (chunkDone || this.interrupted) {
          resolve();
        }
      }, this.sessionId).catch(err => {
        console.error("[SentenceTTSQueue] Synthesis failed for:", text, err);
        resolve();
      });
    });
  }
}
