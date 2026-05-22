import type { VoiceMessage, HandlerContext } from "../types.js";
import { orchestrate, orchestrateStream } from "../../llm/orchestrator.js";
import { walkthroughDriver } from "../walkthrough/driver.js";
import * as sttService from "./sttService.js";
import * as ttsService from "./ttsService.js";
import * as responseSender from "./responseSender.js";

class SentenceStreamer {
  private buffer: string = "";

  public feed(chunk: string): string[] {
    this.buffer += chunk;
    const sentences: string[] = [];

    while (true) {
      let foundIdx = -1;
      let foundPuncLen = 1;

      for (let i = 0; i < this.buffer.length; i++) {
        const char = this.buffer[i];
        if (char === '\n') {
          foundIdx = i;
          foundPuncLen = 1;
          break;
        }
        if (char === '.' || char === '?' || char === '!') {
          const nextChar = this.buffer[i + 1];
          if (!nextChar || /\s/.test(nextChar)) {
            const prevText = this.buffer.slice(0, i);
            const words = prevText.trim().split(/\s+/);
            const lastWord = words[words.length - 1]?.toLowerCase()?.replace(/[^a-z]/g, "");
            
            const abbreviations = ["mr", "ms", "mrs", "dr", "st", "eg", "ie", "vs"];
            if (char === '.' && lastWord && abbreviations.includes(lastWord)) {
              if (nextChar === '\n') {
                foundIdx = i;
                foundPuncLen = 1;
                break;
              }
              continue;
            }

            foundIdx = i;
            foundPuncLen = 1;
            break;
          }
        }
      }

      if (foundIdx === -1) {
        break;
      }

      const sentence = this.buffer.slice(0, foundIdx + foundPuncLen).trim();
      this.buffer = this.buffer.slice(foundIdx + foundPuncLen);

      if (sentence.length > 0) {
        sentences.push(sentence);
      }
    }

    return sentences;
  }

  public flush(): string[] {
    const sentences: string[] = [];
    const remaining = this.buffer.trim();
    if (remaining.length > 0) {
      sentences.push(remaining);
    }
    this.buffer = "";
    return sentences;
  }
}

export async function handleVoiceMessage(
  message: VoiceMessage,
  context: HandlerContext
): Promise<void> {
  const { sessionId, send } = context;

  const tracker = {
    startTime: Date.now(),
    sttDuration: 0,
    llmDuration: 0,
    ttsDuration: 0,
  };

  // Test command fast path
  if (message.text && message.text.startsWith("test:")) {
    const formId = message.text.slice(5).trim();
    walkthroughDriver.start(formId, sessionId, false);
    return;
  }

  // Text path for dev testing
  if (message.text && !message.audio) {
    await handleText(message.text, undefined, context, tracker);
    return;
  }

  // Audio path
  if (!message.audio) return;

  try {
    const sttStart = Date.now();
    const stt = await sttService.transcribeAudio(message.audio);
    tracker.sttDuration = Date.now() - sttStart;

    if (!stt.text) {
      const count = sttService.incrementRetry(sessionId);

      if (count <= sttService.getMaxRetries()) {
        const totalDuration = Date.now() - tracker.startTime;
        responseSender.sendRespond(
          send,
          "I didn't catch that, could you repeat?",
          true,
          undefined,
          {
            stt: tracker.sttDuration,
            llm: 0,
            tts: 0,
            total: totalDuration,
          }
        );
        console.log(
          `[Latency] 🎙️ No speech detected. STT: ${tracker.sttDuration}ms | Total: ${totalDuration}ms`
        );
      } else {
        sttService.resetRetry(sessionId);
      }
      return;
    }

    sttService.resetRetry(sessionId);

    // Echo what we heard for UI
    responseSender.sendRespond(send, `You said: "${stt.text}"`, false);

    await handleText(stt.text, stt.languageCode, context, tracker);
  } catch (error) {
    console.error("[VoiceHandler] STT error:", error);
    const totalDuration = Date.now() - tracker.startTime;
    responseSender.sendRespond(
      send,
      "Sorry, I had trouble hearing you. Please try again.",
      true,
      undefined,
      {
        stt: tracker.sttDuration,
        llm: 0,
        tts: 0,
        total: totalDuration,
      }
    );
  }
}

async function handleText(
  text: string,
  languageCode: string | undefined,
  context: HandlerContext,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  }
): Promise<void> {
  const { send, sessionId } = context;
  const lang = languageCode || "en";

  const llmStart = Date.now();
  const responseMessageId = crypto.randomUUID();
  const sentenceStreamer = new SentenceStreamer();

  let accumulatedText = "";
  const ttsPromises: Promise<void>[] = [];
  let isFirstSentence = true;
  const ttsStart = Date.now();

  const handleCompletedSentence = (sentence: string) => {
    if (accumulatedText) {
      accumulatedText += " " + sentence;
    } else {
      accumulatedText = sentence;
    }

    const currentAccumulated = accumulatedText;

    const p = new Promise<void>((resolve, reject) => {
      let isFirstChunk = true;
      ttsService.synthesizeStream(sentence, lang, (chunkBase64, isFinal) => {
        if (isFirstChunk) {
          isFirstChunk = false;
          if (isFirstSentence) {
            isFirstSentence = false;
            if (tracker) {
              tracker.ttsDuration = Date.now() - ttsStart;
            }
            const totalDuration = tracker ? (Date.now() - tracker.startTime) : 0;
            const latency = tracker ? {
              stt: tracker.sttDuration,
              llm: tracker.llmDuration,
              tts: tracker.ttsDuration,
              total: totalDuration,
            } : undefined;

            responseSender.sendRespond(send, currentAccumulated, true, responseMessageId, latency);

            if (tracker) {
              console.log(
                `[Latency Breakdown] 🔊 Speech Response (Stream Started): "${sentence}"
-----------------------------------------
🎙️ STT:   ${tracker.sttDuration}ms
🧠 LLM:   ${tracker.llmDuration}ms
🔊 TTS (TTFB): ${tracker.ttsDuration}ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
              );
            }
          } else {
            responseSender.sendRespond(send, currentAccumulated, true, responseMessageId);
          }
        }

        if (chunkBase64) {
          responseSender.sendTtsAudio(send, chunkBase64, responseMessageId, false);
        }
      }, sessionId).then(resolve).catch(reject); // Session ID isolated
    });

    ttsPromises.push(p);
  };

  const { toolCalls, rawContent } = await orchestrateStream(
    text,
    sessionId,
    languageCode,
    (chunk) => {
      if (tracker && tracker.llmDuration === 0) {
        tracker.llmDuration = Date.now() - llmStart;
      }

      const sentences = sentenceStreamer.feed(chunk);
      for (const sentence of sentences) {
        handleCompletedSentence(sentence);
      }
    }
  );

  const finalSentences = sentenceStreamer.flush();
  for (const sentence of finalSentences) {
    handleCompletedSentence(sentence);
  }

  await Promise.all(ttsPromises);

  if (ttsPromises.length > 0) {
    responseSender.sendTtsAudio(send, "", responseMessageId, true);
  }

  let spoke = false;
  for (const tc of toolCalls) {
    switch (tc.name) {
      case "navigate": {
        responseSender.sendNavigate(send, tc.args);
        if (tracker && !spoke) {
          const totalDuration = Date.now() - tracker.startTime;
          console.log(
            `[Latency Breakdown] 🚀 Navigate (No Speech)
-----------------------------------------
🎙️ STT:   ${tracker.sttDuration}ms
🧠 LLM:   ${tracker.llmDuration}ms
🔊 TTS:   0ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
          );
        }
        break;
      }
      case "start_walkthrough": {
        const msg = String(tc.args.message || "Starting walkthrough");
        const formId = String(tc.args.formId);
        spoke = true;
        // Suppress static speech synthesis if dynamic content was already streamed
        if (!accumulatedText) {
          await speakAndSend(send, msg, lang, tracker);
        }
        walkthroughDriver.start(formId, context.sessionId);
        break;
      }
      case "answer_question": {
        spoke = true;
        // Suppress redundancy: do not re-speak if dynamic content was already streamed
        if (!accumulatedText) {
          await speakAndSend(send, String(tc.args.response), lang, tracker);
        }
        break;
      }
      case "detour_to_field": {
        const session = walkthroughDriver.getSession(sessionId);
        if (session) {
          // Interrupt any active wait in status awaiter so driver thread pauses instantly
          walkthroughDriver.interrupt(sessionId);

          session.stateMachine.transition("DETOUR");
          const targetFieldKey = String(tc.args.fieldKey);
          let matchedField = session.schema.fields.find(f => f.key === targetFieldKey);
          if (!matchedField) {
            for (const subForm of session.schema.subForms) {
              const f = subForm.fields.find(field => field.key === targetFieldKey);
              if (f) {
                matchedField = f;
                break;
              }
            }
          }
          context.send({ type: "tool", tool: "detour_start", args: { fieldKey: targetFieldKey } });
          context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetFieldKey, label: matchedField?.label } });

          const narrationText = matchedField?.explanation || "Let me highlight that field on your form.";
          spoke = true;
          // Only speak static narration if dynamic explanation wasn't already streamed
          if (!accumulatedText) {
            await speakAndSend(send, narrationText, lang, tracker);
          }
        }
        break;
      }
      case "resume_walkthrough": {
        const session = walkthroughDriver.getSession(sessionId);
        if (session) {
          walkthroughDriver.interrupt(sessionId);
        }
        spoke = true;
        await executeAutoResume(context, tracker);
        break;
      }
      case "ask_clarification": {
        spoke = true;
        if (!accumulatedText) {
          await speakAndSend(send, String(tc.args.message), lang, tracker);
        }
        break;
      }
    }
  }

  if (toolCalls.length === 0 && rawContent && ttsPromises.length === 0) {
    spoke = true;
    await speakAndSend(send, rawContent, lang, tracker);
  }
}

async function speakAndSend(
  send: HandlerContext["send"],
  text: string,
  languageCode: string,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  }
): Promise<void> {
  const ttsStart = Date.now();
  let messageId: string | undefined = undefined;
  let isFirstChunk = true;

  try {
    await ttsService.synthesizeStream(text, languageCode, (chunkBase64, isFinal) => {
      if (isFirstChunk) {
        isFirstChunk = false;
        if (tracker) {
          tracker.ttsDuration = Date.now() - ttsStart;
        }
        const totalDuration = tracker ? (Date.now() - tracker.startTime) : 0;
        const latency = tracker ? {
          stt: tracker.sttDuration,
          llm: tracker.llmDuration,
          tts: tracker.ttsDuration,
          total: totalDuration,
        } : undefined;

        messageId = responseSender.sendRespond(send, text, true, undefined, latency);

        if (tracker) {
          console.log(
            `[Latency Breakdown] 🔊 Speech Response (Stream Started): "${text}"
-----------------------------------------
🎙️ STT:   ${tracker.sttDuration}ms
🧠 LLM:   ${tracker.llmDuration}ms
🔊 TTS (TTFB): ${tracker.ttsDuration}ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
          );
        }
      }

      if (messageId) {
        responseSender.sendTtsAudio(send, chunkBase64, messageId, isFinal);
      }
    });
  } catch (e) {
    console.error("[VoiceHandler] TTS stream failed:", e);
    if (isFirstChunk) {
      const totalDuration = tracker ? (Date.now() - tracker.startTime) : 0;
      const latency = tracker ? {
        stt: tracker.sttDuration,
        llm: tracker.llmDuration,
        tts: Date.now() - ttsStart,
        total: totalDuration,
      } : undefined;
      responseSender.sendRespond(send, text, false, undefined, latency);
    }
  }
}

/**
 * Recovers execution states back down to original tracking coordinates seamlessly.
 */
export async function executeAutoResume(
  context: HandlerContext,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  }
): Promise<void> {
  const session = walkthroughDriver.getSession(context.sessionId);
  if (session && session.stateMachine.currentState === "DETOUR_QA") {
    session.stateMachine.transition("DETOUR_COMPLETE");
    context.send({ type: "tool", tool: "detour_end", args: {} });

    const originalCtx = session.stateMachine.currentContext;
    let targetField = session.schema.fields[originalCtx.fieldIndex];

    if (originalCtx.subFormId) {
      const subForm = session.schema.subForms.find(sf => sf.id === originalCtx.subFormId);
      if (subForm) {
        targetField = subForm.fields[originalCtx.subFormFieldIndex];
        if (targetField) {
          context.send({
            type: "tool",
            tool: "go_to_field",
            args: {
              fieldKey: targetField.key,
              label: targetField.label,
              subFormId: originalCtx.subFormId,
              itemIndex: originalCtx.subFormItemIndex,
            },
          });
          await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en", tracker);
          return;
        }
      }
    }

    if (targetField) {
      context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetField.key, label: targetField.label } });
      await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en", tracker);
    }
  }
}
