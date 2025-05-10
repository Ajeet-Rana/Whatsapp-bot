import { Client, LocalAuth, Message } from "whatsapp-web.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import WebSocket, { WebSocketServer } from "ws";
import * as dotenv from "dotenv";
const qrcode: any = require("qrcode");
import qrcodeTerminal from "qrcode-terminal";

// Load environment variables
dotenv.config();

interface Config {
  geminiApiKey: string;
  wsPort: number;
}

const config: Config = {
  geminiApiKey:
    process.env.GEMINI_API_KEY || "",
  wsPort: parseInt(process.env.WS_PORT || "8080"),
};

if (!config.geminiApiKey) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

// Initialize Gemini
const ai = new GoogleGenerativeAI(config.geminiApiKey);
const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-001" });

// WhatsApp Client
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// WebSocket Server
const wss = new WebSocketServer({ port: config.wsPort });

// Broadcast helper function
const broadcast = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// WhatsApp Events
whatsappClient.on("qr", async (qr) => {
  qrcodeTerminal.generate(qr, { small: true });
  console.log("QR RECEIVED");

  // Convert to base64 PNG
  const base64 = await qrcode.toDataURL(qr);
  broadcast({ type: "qr", qr: base64 });
});

whatsappClient.on("ready", () => {
  console.log("Client is ready!");
  broadcast({ type: "status", text: "✅ WhatsApp client is ready." });
});

whatsappClient.on("message", async (msg: Message) => {
  console.log("Received message from", msg.from, ":", msg.body);
  broadcast({
    type: "message",
    text: `📩 ${msg.from}: ${msg.body}`,
  });

  try {
    const message = msg.body;
    let responseText = "";

    if (message.toLowerCase().startsWith("summarize:")) {
      const textToSummarize = message.substring("summarize:".length).trim();
      const prompt = `Summarize this text in 2-3 sentences: ${textToSummarize}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = `📝 Summary: ${response.text()}`;
    } else if (message.toLowerCase().startsWith("translate to")) {
      const parts = message.split(":");
      if (parts.length === 2) {
        const langPart = parts[0].replace("translate to", "").trim();
        const textToTranslate = parts[1].trim();
        const prompt = `Translate this to ${langPart}: ${textToTranslate}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        responseText = `🌍 Translation (${langPart}): ${response.text()}`;
      }
    } else {
      const prompt = `You are a helpful WhatsApp assistant. Respond to this message politely and concisely: ${message}`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      responseText = response.text();
    }

    await msg.reply(responseText);
    broadcast({ type: "reply", text: `🤖 Reply: ${responseText}` });
  } catch (error) {
    console.error("Processing error:", error);
    msg.reply("Sorry, something went wrong while processing your message.");
    broadcast({
      type: "error",
      text: "❌ Error while processing message.",
    });
  }
});

// Start everything
whatsappClient
  .initialize()
  .then(() => {
    console.log(`WhatsApp client initialized`);
    console.log(`WebSocket server running on ws://localhost:${config.wsPort}`);
  })
  .catch((error) => {
    console.error("Failed to initialize WhatsApp client:", error);
    process.exit(1);
  });

// Handle shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  whatsappClient.destroy();
  wss.close();
  process.exit();
});
