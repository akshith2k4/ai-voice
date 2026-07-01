export interface LLMToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface LLMResult {
  toolCalls: LLMToolCall[];
  rawContent: string | null;
}

export interface LLMStreamChunk {
  type: "text" | "tool_call";
  text?: string;
  toolCall?: LLMToolCall;
}

export interface SttResult {
  text: string;
  languageCode: string;
  confidence: number;
  wavBuffer?: Buffer;
}

export interface ISTTService {
  transcribe(wavBuffer: Buffer): Promise<SttResult>;
}

export interface ILLMService {
  generateStream(
    systemPrompt: string,
    userPrompt: string,
    languageHint?: string,
    signal?: AbortSignal,
    history?: { role: "user" | "assistant"; content: string }[]
  ): AsyncGenerator<LLMStreamChunk, LLMResult, unknown>;
}

export interface ITTSService {
  synthesizeStream(
    text: string,
    languageCode: string,
    onChunk: (base64Chunk: string, isDone: boolean) => void,
    sessionId?: string
  ): Promise<void>;
  interruptActiveTTS(sessionId?: string): void;
  cleanupSession(sessionId: string): void;
}
