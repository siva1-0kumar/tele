// websocket_client.js
import WebSocket from 'ws';
import fs from 'fs';

console.log("websocket_client.js started");

const socket = new WebSocket('ws://localhost:3000/ws');

// Simulate μ-law audio data (replace with real mic stream for production)
const FAKE_AUDIO_PATH = './test_ulaw_audio.ulaw'; // should be 8kHz, 8-bit μ-law encoded audio
let audioChunks = [];

try {
  const audioData = fs.readFileSync(FAKE_AUDIO_PATH);
  const chunkSize = 320; // 20ms for 8kHz µ-law (8-bit) = 160 bytes; using 320 = 40ms
  for (let i = 0; i < audioData.length; i += chunkSize) {
    audioChunks.push(audioData.slice(i, i + chunkSize));
  }
} catch (err) {
  console.error("⚠️ Couldn't load test audio file:", err.message);
}

socket.on('open', () => {
  console.log("🔌 Connected to ws://localhost:3000/ws");

  let index = 0;
  const interval = setInterval(() => {
    if (index >= audioChunks.length) {
      clearInterval(interval);
      console.log("✅ Finished sending test audio");
      return;
    }

    const chunk = audioChunks[index];
    socket.send(chunk);
    index++;
  }, 500); // every 500ms
});

socket.on('message', (data) => {
  console.log(`📥 Received audio from server: ${data.length} bytes`);
});

socket.on('close', () => {
  console.log("❎ Connection closed");
});

socket.on('error', (err) => {
  console.error("💥 WebSocket error:", err.message);
});
