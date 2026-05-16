const ws = new WebSocket("ws://localhost:3001");

ws.onopen = () => {
  console.log("✅ Connected");
  
  // Send a voice message with dummy audio
  ws.send(
    JSON.stringify({
      type: "voice",
      audio: Buffer.from("fake-audio-data").toString("base64"),
    })
  );
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data as string);
  console.log("📩 Received:", JSON.stringify(data, null, 2));
};

ws.onerror = (error) => {
  console.error("❌ Error:", error);
};

ws.onclose = () => {
  console.log("🔌 Disconnected");
  process.exit(0);
};

// Close after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);
