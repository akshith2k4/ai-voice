# Agent Backend — Architecture

## The Core Problem with Current Structure

`voicePipeline.ts` is doing too many jobs:
- Handles audio I/O (voice-specific)
- Runs LLM
- Dispatches tool calls
- Coordinates walkthrough state

`messageRouter.ts` talks to both `voicePipeline` and `driver` directly, creating two separate paths into the walkthrough.

**The right mental model:** Voice is just one way to trigger a flow. Chat would be another. The underlying flow — LLM → tool dispatch → walkthrough — should be independent of input modality.

---

## Proposed File Hierarchy

```
src/
│
├── messageRouter.ts            Route incoming WS messages by type. Nothing else.
├── connectionManager.ts        WebSocket session management.
├── config.ts                   Environment config.
├── types.ts                    Shared TypeScript types.
│
├── adapters/                   ── INPUT + OUTPUT MODALITY LAYER ──
│   ├── voiceAdapter.ts         Audio chunks → STT → calls FlowController.
│   │                           Also owns barge-in detection and filler audio.
│   │                           Creates a VoiceResponder and passes it to FlowController.
│   │
│   ├── chatAdapter.ts          (future) Direct text → calls FlowController.
│   │                           Creates a ChatResponder and passes it to FlowController.
│   │
│   └── responders/
│       ├── IResponder.ts       Interface: onTextChunk(), onComplete(), speak(), onError()
│       │
│       ├── voiceResponder.ts   Implements IResponder for voice.
│       │                       onTextChunk → pushes to TTS stream → audio chunks to frontend.
│       │                       onComplete  → sends respond message (text + messageId).
│       │                       speak(text) → full audio delivery for known text:
│       │                                     1. hash text → check S3 for cached audio
│       │                                     2. if cached   → stream from S3 / presigned URL
│       │                                     3. if not cached → synthesize via TTS
│       │                                                      → cache result to S3
│       │                                                      → stream audio to frontend
│       │                       speakAndWait(text) → speak() + waits for tts_playback_complete
│       │
│       └── chatResponder.ts    (future) Implements IResponder for chat.
│                               onComplete → sends plain text message to frontend.
│                               speak()    → no-op (no audio in chat).
│
├── core/                       ── ORCHESTRATION LAYER ──
│   │
│   ├── intentRouter.ts         Central routing decision — the single entry point for all
│   │                           processed input (text from voice, chat, or any future source).
│   │
│   │                           Two paths:
│   │
│   │                           KNOWN path — text or next action is already determined:
│   │                             → status event (field_reached etc.) → driver.handleStatus()
│   │                             → walkthrough narration (schema text) → responder.speak(text)
│   │                             → recognized command ("cancel", "start X") → direct handler
│   │                             No LLM call needed.
│   │
│   │                           UNKNOWN path — free-form user input, intent not clear:
│   │                             → flowController.process(text, sessionId, responder)
│   │                             → LLM figures out intent → tool calls → toolDispatcher
│   │
│   ├── flowController.ts       LLM execution only.
│   │                           Called only when intent is unknown (by intentRouter).
│   │                           Runs LLM, streams tokens → responder.onTextChunk().
│   │                           On finish → responder.onComplete().
│   │                           Passes tool calls to toolDispatcher.
│   │                           Has NO knowledge of voice, TTS, chat, or routing.
│   │
│   ├── toolDispatcher.ts       Routes each LLM tool call to WorkflowResolver or a direct handler.
│   │                           start_walkthrough → driver.start()
│   │                           navigate          → frontend directly
│   │                           explain_field     → WorkflowResolver.resolveField() → responder.speak()
│   │                           detour_to_field   → WorkflowResolver.resolveDetour() → driver + responder
│   │                           resume_walkthrough→ WorkflowResolver.resolveResume() → driver + responder
│   │                           answer / clarify  → responder.speak(text from LLM directly)
│   │
│   └── workflowResolver.ts     THE single file that owns all schema knowledge.
│                               Used by: Driver, SubFormProcessor, ToolDispatcher.
│                               Stateless — holds no data of its own.
│                               Takes sessionId → reads session.schema + session.filledValues
│                               + session.stateMachine as read-only context to answer questions.
│
│                               Absorbs these current files (all schema-content concerns):
│                                 evaluator.ts       → isFieldVisible, isConditionMet, resolveDemoValue
│                                 narrationTemplates → narration text strings
│                                 walkthroughExecutor→ field search, detour/resume resolution
│                                 planner.ts         → builds execution plan for branching forms
│
│                               resolveExecutionPlan(sessionId)
│                                 → returns ordered steps for driver to execute
│                                 → handles branching, visibility, conditions
│
│                               resolveFieldContent(sessionId, fieldKey)
│                                 → returns { explanation, demoValue, label, type, readOnly }
│
│                               resolveDetour(sessionId, fieldKey)
│                                 → locates field (top-level or sub-form)
│                                 → returns { fieldKey, fieldLabel, speechText, stateArgs }
│
│                               resolveResume(sessionId)
│                                 → reads state machine context to find where driver paused
│                                 → returns { speechText, goToField, stateArgs }
│
│                               All methods return plain data. No sends. No TTS. No state transitions.
│                               Callers decide what to do with the result.
│
├── walkthrough/                ── WALKTHROUGH LAYER ──
│   │
│   │   Three distinct concerns inside this layer:
│   │
│   │   1. EXECUTION — drive the browser step by step
│   │   2. STATE     — track where we are in the walkthrough
│   │   3. INFRA     — communicate with frontend, wait for events
│   │
│   ├── executor.ts             Pure browser protocol executor (replaces driver.ts + subFormProcessor.ts).
│   │                           Gets steps and content FROM WorkflowResolver — reads no schema itself.
│   │
│   │                           TWO output channels:
│   │
│   │                           1. Browser automation → ToolMessenger (direct, no Responder)
│   │                                go_to_field, fill_field, navigate, open_dialog, add_item
│   │                                These are UI commands, not speech.
│   │
│   │                           2. Speech/narration → session.responder.speak(text)
│   │                                field explanations, read-only messages, wrap-up, error messages
│   │                                Responder owns how audio is delivered (S3 cache / TTS / format).
│   │
│   │                           How Executor gets the Responder:
│   │                                Session holds a responder reference (set when walkthrough starts).
│   │                                ToolDispatcher passes the current VoiceResponder into the session.
│   │                                Executor reads session.responder — never creates its own.
│   │
│   │                           Async execution protocol (same for fields and sub-form items):
│   │                             → sendTool("go_to_field")  → wait "field_reached"   (retry 3x)
│   │                             → session.responder.speak(explanation)
│   │                             → sendTool("fill_field")   → wait "field_filled"    (retry 3x)
│   │                             → cancellation checks, yieldToInterrupts for pause/resume
│   │                             → timing waits between steps
│   │
│   ├── sessionManager.ts       Session data bag per sessionId.
│   │                           Holds: schema, stateMachine, filledValues, cancelled, errorCount.
│   │                           Also holds: responder (IResponder) — set by ToolDispatcher when
│   │                           walkthrough starts, used by Executor for all speech output.
│   │
│   ├── stateMachine.ts         Tracks walkthrough state:
│   │                           IDLE → WALKING_THROUGH → PAUSED / DETOUR_QA → COMPLETED
│   │                           Coordinates driver pause/resume with the voice pipeline.
│   │
│   ├── statusAwaiter.ts        Waits for frontend confirmation events.
│   │                           Promise-based: waitForStatus("field_reached", timeout).
│   │
│   ├── toolMessenger.ts        Sends tool messages to frontend via connectionManager.
│   │                           Single responsibility: WebSocket output for walkthrough tools.
│   │
│   └── (narrationService.ts removed — Executor calls session.responder.speak(text) directly.
│        No bridge needed when session already holds the Responder reference.)
│
├── services/                   ── INFRASTRUCTURE SERVICES ──
│   ├── ttsService.ts           TTS synthesis + LLM text streaming → sentence queue.
│   ├── sttService.ts           STT transcription (ElevenLabs / OpenAI).
│   ├── fillerService.ts        Selects pre-recorded filler audio clips.
│   ├── responseSender.ts       Formats and sends response messages to frontend.
│   ├── latencyTracker.ts       AsyncLocalStorage-based latency tracking.
│   ├── s3Service.ts            S3 read/write. Used only by VoiceResponder for audio caching.
│   ├── interfaces.ts           ITTSService / ISTTService interfaces.
│   ├── providersConfig.ts      Provider selection config.
│   └── providers/
│       ├── elevenLabsTTS.ts
│       ├── elevenLabsSTT.ts
│       ├── openAiTTS.ts
│       └── openAiSTT.ts
│
├── schema/
│   └── loader.ts               Loads and parses form schema JSON files from disk.
│                               Used only by WorkflowResolver — no other file reads schema directly.
│
└── handlers/
    └── statusHandler.ts        (to be merged into flowController — currently duplicate path)
```

---

## How the Flows Work

### 1. Voice Input Flow

```
User speaks
  │
  ▼
Frontend → audio_chunk (repeated) → messageRouter → voiceAdapter.handleChunk()
Frontend → audio_end              → messageRouter → voiceAdapter.handleEnd()
  │
  ▼
voiceAdapter
  ├── runs STT → gets transcript text
  ├── plays filler audio immediately (voice-specific, non-blocking)
  ├── creates VoiceResponder(send, sessionId, lang)
  └── calls IntentRouter.route(text, sessionId, voiceResponder)

  │
  ▼
intentRouter.route(text, sessionId, responder)
  │
  ├── KNOWN: recognized command or pattern?
  │     └── handle directly (e.g., "cancel" → driver.cancel())
  │
  └── UNKNOWN: free-form input → flowController.process(text, sessionId, responder)
        ├── calls LLM with text
        ├── on each text token  → responder.onTextChunk(chunk)
        │                               │
        │                               ▼
        │                         VoiceResponder
        │                           pushes chunk to TTS stream
        │                           TTS buffers → synthesizes sentences
        │                           streams audio chunks to frontend
        │
        ├── on LLM complete     → responder.onComplete(fullText, messageId)
        │                               │
        │                               ▼
        │                         VoiceResponder
        │                           sends "respond" message (text + messageId)
        │                           waits for tts_playback_complete
        │
        └── on tool calls       → toolDispatcher.dispatch(toolCalls, sessionId, responder)
                                  │
                                  ├── workflowResolver.resolve(tool, args, sessionId)
                                  │     → reads form schema
                                  │     → returns structured content { speechText, fieldKey, ... }
                                  │
                                  └── responder.speak(content.speechText)
                                        → S3 cache check → synthesize → stream audio

  │
  ▼
toolDispatcher.dispatch()
  ├── "start_walkthrough"  → driver.start(formId, sessionId)
  ├── "navigate"           → responseSender.sendNavigate()
  ├── "answer_question"    → responder.onComplete(answer)   ← responder handles format
  ├── "detour_to_field"    → walkthroughExecutor.resolveDetour() → driver state transition
  └── "resume_walkthrough" → walkthroughExecutor.resolveResume() → driver state transition
```

**If this was a chat request instead of voice:**
- `chatAdapter` creates a `ChatResponder` instead
- `ChatResponder.onTextChunk()` → buffers text (no TTS)
- `ChatResponder.onComplete()` → sends plain text message to frontend
- Everything else (FlowController, ToolDispatcher, Driver) is identical — they never knew it was voice or chat

### 2. Walkthrough Execution Flow

```
driver.start() called by toolDispatcher
  │
  ▼
driver runs in background (async loop)
  ├── navigate to form route
  ├── open dialog
  └── for each field in schema:
        ├── driver → "go_to_field"  → ToolMessenger → connectionManager → Frontend
        ├── driver waits           ← statusAwaiter  ← messageRouter ← Frontend "field_reached"
        ├── driver → "fill_field"  → ToolMessenger → connectionManager → Frontend
        └── driver waits           ← statusAwaiter  ← messageRouter ← Frontend "field_filled"
```

### 3. Status Event Flow (frontend confirmations)

```
Frontend → "status: field_reached" / "field_filled" / "navigation_complete" / etc.
  │
  ▼
messageRouter
  └── status → IntentRouter.handleStatus(sessionId, event, data)
                    │
                    └── KNOWN path: status events always go directly to driver
                              │
                              └── driver.handleStatus(sessionId, event, data)
                                        │
                                        └── statusAwaiter resolves the waiting promise in driver loop
```

**Key point:** messageRouter only talks to FlowController. FlowController decides whether to pass it to the driver. The router does NOT call the driver directly.

### 4. Barge-in (User Interrupts Walkthrough)

```
User speaks mid-walkthrough
  │
  ▼
voiceAdapter detects audio above threshold
  ├── calls FlowController.interrupt(sessionId)
  │     ├── interrupts active TTS stream
  │     ├── sends stop_audio to frontend
  │     └── tells driver to pause (stateMachine → PAUSED)
  │
  └── STT transcribes what user said
        │
        ▼
      FlowController.process(text, sessionId, { modality: "voice" })
        │
        LLM decides:
          ├── "detour_to_field" → walkthroughExecutor resolves → driver transitions to DETOUR_QA
          ├── "answer_question" → LLM answers → driver stays PAUSED
          └── "resume_walkthrough" → walkthroughExecutor resolves → driver transitions back to WALKING_THROUGH
```

---

## What Changes vs Current Code

| Current | Proposed | Why |
|---|---|---|
| `voicePipeline.ts` | split → `adapters/voiceAdapter.ts` + `core/flowController.ts` | voice I/O vs flow logic are separate concerns |
| TTS logic hardcoded in pipeline | `IResponder` interface + `VoiceResponder` / `ChatResponder` | response format is adapter's concern, not FlowController's |
| S3 caching in `narrationService` (walkthrough layer) | S3 caching in `VoiceResponder` (output layer) | caching is a delivery concern, not a walkthrough concern |
| `messageRouter` calls driver directly | `messageRouter` → `intentRouter` → driver (for status) | one routing decision point for all input |
| LLM always called for every input | `intentRouter` decides: known path (direct) vs unknown path (LLM) | avoid unnecessary LLM calls for known actions |
| `evaluator.ts` + `walkthroughExecutor.ts` + `planner.ts` + `narrationTemplates.ts` | merged into `core/workflowResolver.ts` | all schema content knowledge in one place |
| `driver.ts` + `subFormProcessor.ts` (separate files, duplicate protocol) | merged into `walkthrough/executor.ts` | same browser protocol, no reason to split |
| `driver.ts` reads `field.explanation`, `field.demoValue` directly | executor asks `workflowResolver.resolveFieldContent()` | executor owns protocol, not schema content |
| `handlers/statusHandler.ts` | merge into `flowController.handleStatus()` | duplicate routing path |
| `sendTool()` mixes TTS + sending | `sendTool()` sends only, `narrate()` speaks | single responsibility |

## What Does NOT Change

- `driver.ts` — its job is right, internal structure just needs the `narrate()` + phase extraction cleanup already discussed
- All services (`ttsService`, `sttService`, `latencyTracker`, etc.) — infrastructure, no changes needed
- `walkthrough/` internals — session, state machine, planner, evaluator all stay as-is
- `connectionManager.ts` — transport layer, no changes
