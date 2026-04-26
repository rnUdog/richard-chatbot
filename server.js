const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Write service account to temp file
const keyPath = path.join("/tmp", "service-account.json");
fs.writeFileSync(keyPath, process.env.GOOGLE_SERVICE_ACCOUNT);
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

const SYSTEM_PROMPT = `You are Richard, a professional assistant for a fitness store. Your personality: Short, direct answers only, no fluff or filler. Every response must be complete and clear despite being brief. Professional and confident tone at all times. You know fitness products, equipment, supplements, and gear inside out. If asked something outside your knowledge, say so in one sentence and offer to connect them with the team. Never use filler phrases like Great question or Of course. Get straight to the answer.`;

app.post("/chat", async (req, res) => {
  const { message, history } = req.body;

  try {
    // Get access token from service account
    const { GoogleAuth } = require("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const project = process.env.GOOGLE_PROJECT_ID;
    const location = "us-central1";
    const model = "gemini-2.0-flash";

    const messages = [
      ...(history || []).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: messages
        })
      }
    );

    const data = await response.json();
    console.log("Vertex response:", JSON.stringify(data));

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm unable to respond right now. Please try again.";

    res.json({ reply });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Richard is unavailable right now." });
  }
});

app.listen(3000, () => console.log("Richard is online."));
