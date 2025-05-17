"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_web_js_1 = require("whatsapp-web.js");
const ws_1 = __importStar(require("ws"));
const dotenv = __importStar(require("dotenv"));
const qrcode = require("qrcode");
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const openai_1 = __importDefault(require("openai"));
// Load env
dotenv.config();
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
// WhatsApp Client
const whatsappClient = new whatsapp_web_js_1.Client({
    authStrategy: new whatsapp_web_js_1.LocalAuth(),
    puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});
// WebSocket Server
const wss = new ws_1.WebSocketServer({ port: 8080 });
// Broadcast helper
const broadcast = (data) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(payload);
        }
    });
};
// Define OpenAI Functions
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
whatsappClient.on("qr", (qr) => __awaiter(void 0, void 0, void 0, function* () {
    qrcode_terminal_1.default.generate(qr, { small: true });
    const base64 = yield qrcode.toDataURL(qr);
    broadcast({ type: "qr", qr: base64 });
}));
whatsappClient.on("ready", () => {
    console.log("✅ WhatsApp client is ready.");
    broadcast({ type: "status", text: "✅ WhatsApp client is ready." });
});
whatsappClient.on("message", (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.from !== "916000256023@c.us")
        return;
    console.log("📨", msg.from, ":", msg.body);
    broadcast({ type: "message", text: `📩 ${msg.from}: ${msg.body}` });
    try {
        const userPrompt = msg.body;
        const response = yield openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userPrompt }],
            functions,
            function_call: "auto",
        });
        const choice = response.choices[0];
        // Case 1: Function call triggered
        if (choice.finish_reason === "function_call") {
            const { name, arguments: args } = choice.message.function_call;
            const parsedArgs = JSON.parse(args || "{}");
            let finalText = "";
            if (name === "summarizeText") {
                const result = yield openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "user",
                            content: `Summarize this text in 2-3 lines:\n\n${parsedArgs.text}`,
                        },
                    ],
                });
                finalText = `📝 Summary:\n${result.choices[0].message.content}`;
            }
            if (name === "translateText") {
                const result = yield openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "user",
                            content: `Translate this to ${parsedArgs.targetLanguage}:\n\n${parsedArgs.text}`,
                        },
                    ],
                });
                finalText = `🌍 Translation:\n${result.choices[0].message.content}`;
            }
            yield msg.reply(finalText);
            broadcast({ type: "reply", text: `🤖 Reply: ${finalText}` });
            return;
        }
        const aiReply = choice.message.content;
        yield msg.reply(aiReply || "🤖 No response");
        broadcast({ type: "reply", text: `🤖 Reply: ${aiReply}` });
    }
    catch (error) {
        console.error("❌ Error processing message:", error);
        yield msg.reply("⚠️ Sorry, something went wrong.");
        broadcast({ type: "error", text: "❌ Error while processing message." });
    }
}));
// Start
whatsappClient
    .initialize()
    .then(() => {
    console.log(`🚀 WhatsApp client initialized`);
    console.log(`📡 WebSocket server running on ws://localhost:${process.env.WS_PORT}`);
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
