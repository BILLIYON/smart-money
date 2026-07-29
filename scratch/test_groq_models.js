const Groq = require('groq-sdk');

async function testGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("No GROQ_API_KEY environment variable set locally.");
    return;
  }

  const client = new Groq({ apiKey });

  try {
    console.log("Testing Groq llama-3.3-70b-versatile...");
    const res70b = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "Hello! Summarize in 5 words why Llama 3.3 is great." }],
      max_tokens: 100,
    });
    console.log("70B Result:", res70b.choices[0]?.message?.content);

    console.log("Testing Groq llama-3.1-8b-instant...");
    const res8b = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: "Hello! Say hi in 3 words." }],
      max_tokens: 50,
    });
    console.log("8B Result:", res8b.choices[0]?.message?.content);

  } catch (err) {
    console.error("Groq test error:", err.message);
  }
}

testGroq();
