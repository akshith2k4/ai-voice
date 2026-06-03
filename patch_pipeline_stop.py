import re

file_path = "agent-backend/src/services/voicePipeline.ts"
with open(file_path, "r") as f:
    content = f.read()

# Add import if missing
if 'import { connectionManager }' not in content:
    content = content.replace('import * as responseSender from "./responseSender.js";', 'import * as responseSender from "./responseSender.js";\nimport { connectionManager } from "../connectionManager.js";')

# Update interruptTTS
old_func = """export function interruptTTS(sessionId: string) {
  interruptNarration(sessionId);
  
  const queue = activeTTSQueues.get(sessionId);"""

new_func = """export function interruptTTS(sessionId: string) {
  interruptNarration(sessionId);
  
  // Send stop_audio immediately to the frontend so it cuts off any playing audio
  connectionManager.send(sessionId, { type: "tool", tool: "stop_audio", args: {} });
  
  const queue = activeTTSQueues.get(sessionId);"""

content = content.replace(old_func, new_func)

with open(file_path, "w") as f:
    f.write(content)

print("Patched voicePipeline.ts with direct stop_audio")
