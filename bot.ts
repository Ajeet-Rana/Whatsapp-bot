import { Client, LocalAuth, Message } from "whatsapp-web.js";
import WebSocket, { WebSocketServer } from "ws";
import * as dotenv from "dotenv";
const qrcode: any = require("qrcode");
import qrcodeTerminal from "qrcode-terminal";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const whatsappClient = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// WebSocket Server
const wss = new WebSocketServer({ port: 8080 });

const broadcast = (data: any) => {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

// Functions
const functions = [
  {
    name: "summarizeText",
    description: "Summarizes a long message in 2-3 lines.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to summarize" },
      },
      required: ["text"],
    },
  },
  {
    name: "translateText",
    description: "Translates text to a specific language.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to translate" },
        targetLanguage: {
          type: "string",
          description: "Target language (e.g., Hindi, Spanish, etc.)",
        },
      },
      required: ["text", "targetLanguage"],
    },
  },
];

// Function : summarize text
const summarizeText = async (text: string) => {
  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Summarize this text in 2-3 lines:\n\n${text}`,
      },
    ],
  });
  return `Summary:\n${result.choices[0].message.content}`;
};

// Function : translate text
const translateText = async (text: string, targetLanguage: string) => {
  const result = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `Translate this to ${targetLanguage}:\n\n${text}`,
      },
    ],
  });
  return `Translation:\n${result.choices[0].message.content}`;
};

whatsappClient.on("qr", async (qr) => {
  qrcodeTerminal.generate(qr, { small: true });
  const base64 = await qrcode.toDataURL(qr);
  broadcast({ type: "qr", qr: base64 });
});

whatsappClient.on("ready", () => {
  console.log("WhatsApp client is ready.");
  broadcast({ type: "status", text: "WhatsApp client is ready." });
});

whatsappClient.on("message", async (msg: Message) => {
  if (msg.from !== "916000256023@c.us") return;
  console.log("📨", msg.from, ":", msg.body);
  broadcast({ type: "message", text: ` ${msg.from}: ${msg.body}` });

  try {
    const userPrompt = msg.body;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userPrompt }],
      functions,
      function_call: "auto",
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "function_call") {
      const { name, arguments: args } = choice.message.function_call!;
      const parsedArgs = JSON.parse(args || "{}");
      let finalText = "";

      // Call the appropriate function based on the function name
      switch (name) {
        case "summarizeText":
          finalText = await summarizeText(parsedArgs.text);
          break;
        case "translateText":
          finalText = await translateText(
            parsedArgs.text,
            parsedArgs.targetLanguage
          );
          break;
      }

      await msg.reply(finalText);
      broadcast({ type: "reply", text: `🤖 Reply: ${finalText}` });
      return;
    }

    const aiReply = choice.message.content;
    await msg.reply(aiReply || "🤖 No response");
    broadcast({ type: "reply", text: `🤖 Reply: ${aiReply}` });
  } catch (error) {
    console.error("❌ Error processing message:", error);
    await msg.reply("Sorry, something went wrong.");
    broadcast({ type: "error", text: "❌ Error while processing message." });
  }
});

// Start
whatsappClient
  .initialize()
  .then(() => {
    console.log(` WhatsApp client initialized`);
    console.log(
      `📡 WebSocket server running on ws://localhost:${process.env.WS_PORT}`
    );
  })
  .catch((error) => {
    console.error("❌ Failed to initialize WhatsApp client:", error);
    process.exit(1);
  });

// Shutdown
process.on("SIGINT", () => {
  console.log("👋 Shutting down...");
  whatsappClient.destroy();
  wss.close();
  process.exit();
});
