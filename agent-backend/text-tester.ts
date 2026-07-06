import WebSocket from 'ws';
import readline from 'readline';
import crypto from 'crypto';

const sessionId = crypto.randomUUID();
const ws = new WebSocket(`ws://localhost:3001?sessionId=${sessionId}&username=akshith&tts=false`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

ws.on('open', () => {
  console.log('✅ Connected to backend!');
  console.log('👉 Type "start order" and press Enter to begin.');
  console.log('👉 When a field appears, type "next" and press Enter to advance.');
  console.log('👉 Or type a question (e.g., "what is this?") to interrupt.\n');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'tool') {
    switch(msg.tool) {
      case 'respond':
        console.log(`\n🤖 Krish: ${msg.args.message}`);
        // ✅ FIX: Simulate TTS finishing for text responses so flowController can proceed
        if (msg.args.messageId) {
          setTimeout(() => {
            ws.send(JSON.stringify({ type: "event", name: "tts_playback_complete", messageId: msg.args.messageId }));
          }, 500);
        }
        break;
        
      case 'navigate':
        console.log(`\n🛠️ [Tool] navigate -> ${msg.args.route}`);
        ws.send(JSON.stringify({ type: "event", name: "navigation_complete", newRoute: msg.args.route }));
        break;
        
      case 'open_dialog':
        console.log(`\n🛠️ [Tool] open_dialog`);
        ws.send(JSON.stringify({ type: "event", name: "form_registered" }));
        break;
        
      case 'field_step':
        console.log(`\n🛠️ [Tool] field_step -> ${msg.args.label}`);
        console.log('   ⏳ Type "next" to fill this field and continue...');
        break;

      case 'add_item':
        console.log(`\n🛠️ [Tool] add_item -> ${msg.args.repeatingId}`);
        console.log('   ⏳ Type "next" to add this item and continue...');
        break;

      case 'click_checkbox':
        console.log(`\n🛠️ [Tool] click_checkbox -> ${msg.args.fieldKey}`);
        console.log('   ⏳ Type "next" to click and continue...');
        break;

      case 'speak':
        // Simulate TTS finishing
        setTimeout(() => {
          ws.send(JSON.stringify({ type: "event", name: "tts_playback_complete", messageId: msg.args.messageId }));
        }, 500);
        break;
        
      case 'detour_start':
         ws.send(JSON.stringify({ type: "event", name: "field_reached", fieldKey: msg.args.fieldKey }));
         break;

      case 'walkthrough_finished':
        console.log(`\n✅ Walkthrough Finished!`);
        break;
        
      default:
        console.log(`\n🛠️ [Tool] ${msg.tool} ->`, JSON.stringify(msg.args).substring(0, 100));
    }
  } else if (msg.type === 'error') {
    console.log(`❌ ERROR: ${msg.message}`);
  }
});

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  
  // Secret commands to simulate frontend UI actions
  if (cmd === 'next') {
    console.log('🗣️ You: [advancing walkthrough]');
    ws.send(JSON.stringify({ type: "event", name: "field_done" }));
    ws.send(JSON.stringify({ type: "event", name: "item_added" }));
    ws.send(JSON.stringify({ type: "event", name: "checkbox_clicked" }));
  } else if (cmd === 'leave') {
    // SIMULATE USER CLOSING THE FORM OR NAVIGATING AWAY
    console.log('🗣️ You: [closing the form / navigating away]');
    ws.send(JSON.stringify({ type: "event", name: "dialog_closed_by_user" }));
  } else if (input.trim()) {
    // Send text to LLM
    ws.send(JSON.stringify({ type: "voice", text: input }));
    console.log(`🗣️ You: ${input}`);
  }
});