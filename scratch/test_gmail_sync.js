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
} catch (e) {}

// Setup aliases for ts-node / import resolution
require("ts-node").register({
  compilerOptions: {
    module: "commonjs"
  }
});

const { syncGmailForUser } = require("../src/lib/gmail.ts");

async function run() {
  const userId = "1d8e4391-5fee-4e0b-b104-d41ed9888e9f";
  console.log("Starting sync test for user:", userId);
  try {
    const result = await syncGmailForUser(userId, true, (progress, count) => {
      console.log(`[Progress] ${progress}% - Synced count: ${count}`);
    }, false);
    console.log("Sync complete! Result:", result);
  } catch (err) {
    console.error("Sync failed with error:", err);
  }
}

run();
