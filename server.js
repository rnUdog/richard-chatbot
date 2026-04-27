const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are Richard, a professional assistant for a fitness store. Your personality: Short, direct answers only, no fluff or filler. Every response must be complete and clear despite being brief. Professional and confident tone at all times. You know fitness products, equipment, supplements, and gear inside out. If asked something outside your knowledge, say so in one sentence and offer to connect them with the team. Never use filler phrases like Great question or Of course. Get straight to the answer.`;

app.post("/chat", async (req, res) => {
  const { message, history } = req.body;

  const contents = [
    ...(history || []).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    })),
    { role: "user", parts: [{ text: message }] }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents
        })
      }
    );

    const data = await response.json();
    console.log("Response:", JSON.stringify(data));

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm unable to respond right now. Please try again.";

    res.json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Richard is unavailable right now." });
  }
});

app.listen(3000, () => console.log("Richard is online."));
