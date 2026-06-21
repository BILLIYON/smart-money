const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

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

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Missing ANTHROPIC_API_KEY in process.env.");
  process.exit(1);
}

async function test() {
  console.log("Initializing Anthropic client with the key...");
  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 100,
      messages: [{ role: "user", content: "Hello Claude, confirm you can read this message in one sentence." }],
    });

    console.log("Success! Anthropic API Response:");
    console.log(response.content[0].text);
  } catch (err) {
    console.error("Failed to connect to Anthropic API:", err.message || err);
  }
}

test();
