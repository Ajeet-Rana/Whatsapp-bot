# 🤖 WhatsApp Bot with Gemini AI Frontend 🌟

![Project Banner](https://placehold.co/1200x400/1e40af/white?text=WhatsApp+Bot+with+Gemini+AI) <!-- Replace with actual banner -->

This project integrates a WhatsApp bot using `whatsapp-web.js` with Google's cutting-edge Gemini Generative AI. It features a sleek frontend to display the QR code for WhatsApp authentication and real-time message logs using WebSockets.

[![Demo Video](https://img.youtube.com/vi/5rxrDVG0cvQ/0.jpg)](https://youtu.be/5rxrDVG0cvQ)

## ✨ Features

| Feature | Description | Icon |
|---------|------------|------|
| **WhatsApp Integration** | Connects to WhatsApp Web to send and receive messages | 📱 |
| **Gemini AI** | Processes messages using Google's Gemini AI for summarization, translation, and smart responses | 🧠 |
| **Real-time Updates** | WebSocket server enables live communication between backend and frontend | 🔌 |
| **User-Friendly UI** | Clean interface displaying QR code and message logs | 🖥️ |

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher) [![Node.js](https://img.shields.io/badge/Node.js-≥14-green?logo=node.js)](https://nodejs.org/)
- npm (comes with Node.js)
- [Gemini API Key](https://ai.google.dev/) (set in `.env`)
- Active WhatsApp account

### Installation

1. **Clone the Repository**
```bash
   git clone https://github.com/Ajeet-Rana/Whatsapp-bot.git
   cd Whatsapp-bot
```
Install Dependencies
```bash
npm install
```
Configure Environment
Create .env file:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```
Launch the Bot
```bash
    npx ts-node bot.ts
```
💡 Supported Commands
📝 Summarize Text
```bash
summarize: <your text>
```
Example:
```
summarize: The quick brown fox jumps over the lazy dog...
```
🌍 Translate Text
```
translate to <language>: <your text>
```
```
translate to Spanish: Hello, how are you?
```
🤖 Generic AI Response
```
<any message>
```
The bot will respond intelligently to any input
📊 Project Structure
```
Whatsapp-bot/
├── public/            # Frontend assets
├── src/               # Source files
│   ├── bot.ts         # Main bot logic
├── .env               # Environment template
├── package.json       # Dependencies
└── README.md          # This file
```
🛠️ Tech Stack

WhatsApp Web.js
Gemini AI
TypeScript
WebSockets
🤝 Contributing

We welcome contributions! Please follow these steps:

    Fork the project

    Create your feature branch (git checkout -b feature/AmazingFeature)

    Commit your changes (git commit -m 'Add some AmazingFeature')

    Push to the branch (git push origin feature/AmazingFeature)

    Open a Pull Request
