const Anthropic = require('@anthropic-ai/sdk');

async function testClaudePdfParse() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("No ANTHROPIC_API_KEY environment variable set locally.");
    return;
  }

  const anthropic = new Anthropic({ apiKey });
  const samplePdfText = `
GTBANK STATEMENT OF ACCOUNT
02/01/2024 Transfer from KUNLE ADEBAYO ₦150,000.00 CR 1,250,000.00
14/01/2024 UBER RIDE LAGOS ₦4,500.00 DR 1,245,500.00
20/01/2024 SALARY JAN 2024 TECH CORP ₦450,000.00 CR 1,695,500.00
  `;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Extract all transactions into a JSON array:
[
  {
    "description": "string",
    "amount": number_in_kobo,
    "date": "YYYY-MM-DD",
    "category": "string"
  }
]
Bank text:
${samplePdfText}`
        }
      ]
    });

    console.log("Claude response:", response.content[0].text);
  } catch (err) {
    console.error("Claude API error:", err.message);
  }
}

testClaudePdfParse();
