// index.js
import Fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import WebSocket from "ws";
import dotenv from "dotenv";
dotenv.config();

const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

const fastify = Fastify();
fastify.register(fastifyWebsocket);

// μ-law to PCM 16-bit conversion
function ulawToPcm16(buffer) {
  const MULAW_BIAS = 33;
  const pcmSamples = new Int16Array(buffer.length);

  for (let i = 0; i < buffer.length; i++) {
    let muLawByte = buffer[i] ^ 0xff;
    let sign = muLawByte & 0x80;
    let exponent = (muLawByte >> 4) & 0x07;
    let mantissa = muLawByte & 0x0f;
    let sample = ((mantissa << 4) + 0x08) << (exponent + 3);
    sample = sign ? (MULAW_BIAS - sample) : (sample - MULAW_BIAS);
    pcmSamples[i] = sample;
  }

  return Buffer.from(pcmSamples.buffer);
}

// PCM 16-bit to μ-law conversion
function pcm16ToUlaw(buffer) {
  const pcmSamples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  const MULAW_MAX = 0x1fff;
  const MULAW_BIAS = 33;
  const ulawBuffer = Buffer.alloc(pcmSamples.length);

  for (let i = 0; i < pcmSamples.length; i++) {
    let sample = pcmSamples[i];
    let sign = (sample < 0) ? 0x80 : 0;
    if (sign) sample = -sample;
    sample += MULAW_BIAS;
    if (sample > MULAW_MAX) sample = MULAW_MAX;

    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }

    let mantissa = (sample >> (exponent + 3)) & 0x0f;
    let ulawByte = ~(sign | (exponent << 4) | mantissa);
    ulawBuffer[i] = ulawByte;
  }

  return ulawBuffer;
}

fastify.get("/ws", { websocket: true }, (connection, req) => {
  const telecmiSocket = connection.socket;
  console.log("✅ TeleCMI connected");

  const elevenLabsSocket = new WebSocket(
    `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`
  );

  elevenLabsSocket.on("open", () => {
    console.log("🟢 Connected to ElevenLabs");
    elevenLabsSocket.send(
      JSON.stringify({ type: "conversation_initiation_client_data" })
    );
  });

  elevenLabsSocket.on("message", (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "ping") {
        elevenLabsSocket.send(JSON.stringify({
          type: "pong",
          event_id: msg.event_id
        }));
      } else if (msg.audio) {
        const audioBuffer = Buffer.from(msg.audio, "base64");
        const ulawBuffer = pcm16ToUlaw(audioBuffer);
        telecmiSocket.send(ulawBuffer);
      } else {
        console.log("🧠", msg);
      }
    } catch (err) {
      console.error("Invalid ElevenLabs message", err);
    }
  });

  telecmiSocket.on("message", (data) => {
    try {
      const pcm16Buffer = ulawToPcm16(data);
      const base64 = pcm16Buffer.toString("base64");
      elevenLabsSocket.send(JSON.stringify({
        user_audio_chunk: base64
      }));
    } catch (err) {
      console.error("❌ Audio conversion error", err);
    }
  });

  telecmiSocket.on("close", () => {
    console.log("❎ TeleCMI disconnected");
    if (elevenLabsSocket.readyState === WebSocket.OPEN) {
      elevenLabsSocket.close();
    }
  });

  elevenLabsSocket.on("close", () => {
    console.log("❎ ElevenLabs disconnected");
    if (telecmiSocket.readyState === WebSocket.OPEN && typeof telecmiSocket.close === 'function') {
      telecmiSocket.close();
    }
  });

  elevenLabsSocket.on("error", (err) => {
    console.error("❌ ElevenLabs error:", err);
  });

  telecmiSocket.on("error", (err) => {
    console.error("❌ TeleCMI socket error:", err);
  });
});

fastify.listen({ port: 3000 }, () => {
  console.log("🚀 WebSocket Proxy Server running on ws://localhost:3000/ws");
});

// websocket_client.js started
console.log("🟢 Connected to server");
console.log("Received from server: Echo: Hello from client!");
// 🔴 Disconnected from server
