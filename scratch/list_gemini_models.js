const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

try {
  const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
      process.env[key] = val;
    }
  });
} catch (e) {}

async function listModels() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_AI_API_KEY");
    return;
  }
  try {
    // List models using fetch and the API key directly
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      console.log("Success! Available models:");
      data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
      console.error("Failed to list models:", data);
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
