const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const Anthropic = require("@anthropic-ai/sdk");
const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testAnthropic() {
  console.log("\n--- Testing Anthropic (Claude) ---");
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.log("No ANTHROPIC_API_KEY set");
    return;
  }
  const start = Date.now();
  try {
    const anthropic = new Anthropic({ apiKey: key });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say 'Hello' in 1 word." }],
    });
    console.log(`Success! Time: ${Date.now() - start}ms`);
    console.log("Response:", response.content[0].text);
  } catch (err) {
    console.error(`Failed after ${Date.now() - start}ms:`, err.message);
  }
}

async function testOpenAI() {
  console.log("\n--- Testing OpenAI (GPT-4o) ---");
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log("No OPENAI_API_KEY set");
    return;
  }
  const start = Date.now();
  try {
    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say 'Hello' in 1 word." }],
    });
    console.log(`Success! Time: ${Date.now() - start}ms`);
    console.log("Response:", response.choices[0].message.content);
  } catch (err) {
    console.error(`Failed after ${Date.now() - start}ms:`, err.message);
  }
}

async function testGemini(modelName) {
  console.log(`\n--- Testing Google AI (Gemini: ${modelName}) ---`);
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    console.log("No GOOGLE_AI_API_KEY set");
    return;
  }
  const start = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Say 'Hello' in 1 word." }] }],
    });
    console.log(`Success! Time: ${Date.now() - start}ms`);
    console.log("Response:", response.response.text());
  } catch (err) {
    console.error(`Failed after ${Date.now() - start}ms:`, err.message);
  }
}

async function main() {
  console.log("Starting AI Client Tests...");
  console.log("Keys loaded:");
  console.log("- ANTHROPIC_API_KEY:", process.env.ANTHROPIC_API_KEY ? "Present" : "Missing");
  console.log("- OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Present" : "Missing");
  console.log("- GOOGLE_AI_API_KEY:", process.env.GOOGLE_AI_API_KEY ? "Present" : "Missing");

  await testAnthropic();
  await testOpenAI();
  await testGemini("gemini-2.5-flash");
  await testGemini("gemini-1.5-flash");
  await testGemini("gemini-1.5-pro");
}

main();
