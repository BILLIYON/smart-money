const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

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

const { GoogleGenAI } = require("@google/generative-ai");
const { Groq } = require("groq-sdk");

async function askAIWithEngine(prompt, aiEngine = "groq") {
  const engine = (aiEngine || "groq").toLowerCase();

  if (engine === "groq" || engine === "llama") {
    if (process.env.GROQ_API_KEY) {
      try {
        const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const response = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0]?.message?.content || "";
      } catch (err) {
        console.error("Groq error:", err);
      }
    }
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error("Gemini error:", err);
    }
  }

  return "";
}

async function translateNaturalLanguageQuery(query, engine = "groq") {
  const prompt = `You are a query translation agent. Convert a user's natural language filter instruction into a clean Gmail search query and local filter rules.
User instruction: "${query}"

Return a JSON object exactly matching this structure (do not output any markdown or commentary):
{
  "gmail_query": "<optimized Gmail search query string using standard terms and negation operators like -term. Do not include conversational words. Use subject: or from: if applicable, otherwise keep it general, e.g. 'opay -paystack'>",
  "filter_rules": "<comma-separated list of include:X or exclude:Y instructions for post-extraction filtering, e.g. 'include:opay,exclude:paystack'>"
}

Example:
Input: "only kuda bank and no uba alerts"
Output:
{
  "gmail_query": "kuda -uba",
  "filter_rules": "include:kuda,exclude:uba"
}

Example:
Input: "do not include paystack or any other transaction except from opay please use opay only"
Output:
{
  "gmail_query": "opay -paystack",
  "filter_rules": "include:opay,exclude:paystack"
}`;

  try {
    const raw = await askAIWithEngine(prompt, engine);
    console.log("Raw LLM response:", raw);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.gmail_query) {
        return {
          query: String(parsed.gmail_query).trim(),
          filter: String(parsed.filter_rules || "").trim()
        };
      }
    }
  } catch (e) {
    console.error("AI translation parse failed:", e);
  }

  return { query, filter: "" };
}

async function run() {
  const query = "Ignore Atlas MongoDB Emails";
  console.log("Translating query:", query);
  const result = await translateNaturalLanguageQuery(query);
  console.log("Result:", result);
}

run();
