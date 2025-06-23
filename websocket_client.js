// websocket_client.js
import WebSocket from "ws";

// Replace with your deployed WebSocket server URL
const WS_URL = "wss://tele-1-rds5.onrender.com/ws";

// Connect to the WebSocket proxy server
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("✅ Connected to WebSocket server:", WS_URL);

  // Simulate sending μ-law audio (fake silence bytes for test)
  const interval = setInterval(() => {
    const silentULawFrame = Buffer.alloc(320, 0xff); // 320 bytes of μ-law silence
    ws.send(silentULawFrame);
    console.log("📤 Sent fake μ-law audio frame");
  }, 100);

  // Stop after 10 seconds
  setTimeout(() => {
    clearInterval(interval);
    ws.close();
    console.log("🛑 Closed test client after 10s");
  }, 10000);
});

ws.on("message", (data) => {
  console.log("📥 Received audio from ElevenLabs (μ-law):", data.length, "bytes");
});

ws.on("close", () => {
  console.log("❎ WebSocket connection closed");
});

ws.on("error", (err) => {
  console.error("💥 WebSocket error:", err.message);
});
