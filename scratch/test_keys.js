const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Load .env.local variables
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
} catch (e) {
  console.warn("Could not read .env.local file. Proceeding with existing env variables.");
}

async function testAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Missing ANTHROPIC_API_KEY");
    return;
  }
  console.log("\n--- Testing Anthropic Key ---");
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one sentence." }],
    });
    console.log("Anthropic success:", response.content[0].text);
  } catch (err) {
    console.error("Anthropic failed:", err.message || err);
  }
}

async function testOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    return;
  }
  console.log("\n--- Testing OpenAI Key ---");
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one sentence." }],
    });
    console.log("OpenAI success:", response.choices[0].message.content);
  } catch (err) {
    console.error("OpenAI failed:", err.message || err);
  }
}

async function testGoogleAI() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_AI_API_KEY");
    return;
  }
  console.log("\n--- Testing Google AI Key ---");
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hello in one sentence.");
    const response = await result.response;
    console.log("Google AI success:", response.text());
  } catch (err) {
    console.error("Google AI failed:", err.message || err);
  }
}

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("Missing GROQ_API_KEY");
    return;
  }
  console.log("\n--- Testing Groq Key ---");
  try {
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey });
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one sentence." }],
    });
    console.log("Groq success:", response.choices[0].message.content);
  } catch (err) {
    console.error("Groq failed:", err.message || err);
  }
}

async function runAll() {
  await testAnthropic();
  await testOpenAI();
  await testGoogleAI();
  await testGroq();
}

runAll();

