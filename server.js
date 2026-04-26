const express = require("express");
const cors = require("cors");
const { VertexAI } = require("@google-cloud/vertexai");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Write service account JSON from environment variable
const keyPath = path.join("/tmp", "service-account.json");
fs.writeFileSync(keyPath, process.env.GOOGLE_SERVICE_ACCOUNT);
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

const SYSTEM_PROMPT = `You are Richard, a professional assistant for a fitness store.

Your personality:
- Short, direct answers only — no fluff or filler
- Every response must be complete and clear despite being brief
- Professional and confident tone at all times
- You know fitness products, equipment, supplements, and gear inside out
- If asked something outside your knowledge, say so in one sentence and offer to connect them with the team

Never use filler phrases like "Great question!" or "Of course!". Get straight to the answer.`;

app.post("/chat", async (req, res) => {
  const { message, history } = req.body;

  try {
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_PROJECT_ID,
      location: "us-central1"
    });

    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.0-flash-001",
      systemInstruction: SYSTEM_PROMPT
    });

    const formattedHistory = (history || []).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.candidates[0].content.parts[0].text;

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Richard is unavailable right now." });
  }
});

app.listen(3000, () => console.log("Richard is online."));
