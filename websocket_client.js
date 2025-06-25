import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

// Replace this with your local or deployed WebSocket URL
const SERVER_URL = 'wss://hdyudgdfhej-1.onrender.com/ws';

const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
  console.log('🟢 Connected to WebSocket server');

  // Load a test μ-law 8000Hz audio file
  const filePath = path.resolve('./test_audio.ulaw');
  try {
    const audioBuffer = fs.readFileSync(filePath);
    console.log(📤 Sending μ-law audio (${audioBuffer.length} bytes));
    ws.send(audioBuffer);
  } catch (err) {
    console.error('❌ Failed to load test_audio.ulaw:', err.message);
  }
});

ws.on('message', (data) => {
  console.log('📥 Received audio response from ElevenLabs:', data.length, 'bytes');

  // Optionally save received output to verify
  const outputPath = path.resolve('./output_response.ulaw');
  fs.appendFileSync(outputPath, data);
});

ws.on('close', () => {
  console.log('❎ WebSocket connection closed');
});

ws.on('error', (err) => {
  console.error('💥 WebSocket error:', err.message);
});
