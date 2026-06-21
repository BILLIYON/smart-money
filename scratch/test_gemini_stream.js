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

async function testStream() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_AI_API_KEY");
    return;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are a helpful financial assistant. Keep it to one sentence."
    });
    
    console.log("Starting stream...");
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    });

    for await (const chunk of result.stream) {
      process.stdout.write(chunk.text());
    }
    console.log("\nStream finished successfully!");
  } catch (err) {
    console.error("Gemini stream failed:", err);
  }
}

testStream();
