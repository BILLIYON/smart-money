import { sendMessage } from "../src/lib/ai";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  console.log("ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);
  console.log("GOOGLE_AI_API_KEY present:", !!process.env.GOOGLE_AI_API_KEY);

  try {
    console.log("\nSending message to Contrarian Investor (default model: Claude)...");
    const stream = await sendMessage({
      buddyId: "contrarian",
      messages: [
        { role: "user", content: "Hi Contrarian! What is your top advice for a young saver in Nigeria?" }
      ],
      databankContext: {
        currency: "NGN",
        monthlySummary: {
          totalIncome: 1000000,
          totalExpenses: 400000,
          savingsRate: 0.6
        }
      }
    });

    console.log("Reading response stream...");
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        process.stdout.write(decoder.decode(value));
      }
    }
    console.log("\n--- Chat success ---");
  } catch (error: any) {
    console.error("\nChat failed:", error);
  }
}

main();
