const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");
const crypto = require("crypto");

const supabaseUrl = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c"; // service role key

const supabase = createClient(supabaseUrl, supabaseKey);

// Decryption helper matching crypto.ts
const ALGO = "aes-256-gcm";
const KEY = Buffer.from("aed4bb42de9a81fbf7703bbc5a472fc316af534829b66800cf596528d6740ada", "hex");

function decrypt(stored) {
  const [ivB64, tagB64, encB64] = stored.split(":");
  const iv        = Buffer.from(ivB64,  "base64");
  const tag       = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher  = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

async function run() {
  const { data: integration } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", "3058d2b8-ed30-44f0-b914-58045748ebdd")
    .eq("provider", "gmail")
    .single();

  if (!integration) {
    console.log("No integration found.");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(
    "64971754557-dt5ldg3u1vrvbns4k7venkvvcdtajfhl.apps.googleusercontent.com",
    "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",
    "http://localhost:3000/api/auth/gmail/callback"
  );

  oauth2Client.setCredentials({
    access_token: decrypt(integration.access_token),
    refresh_token: decrypt(integration.refresh_token),
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const detail = await gmail.users.messages.get({
    userId: "me",
    id: "19e99a871a864f40",
    format: "full",
  });

  const headers = detail.data.payload.headers || [];
  const subject = headers.find(h => h.name === "Subject")?.value || "";
  const from = headers.find(h => h.name === "From")?.value || "";
  const date = headers.find(h => h.name === "Date")?.value || "";

  function extractText(payload) {
    if (payload?.mimeType === "text/plain" && payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }
    if (payload?.mimeType === "text/html" && payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }
    if (payload?.parts) {
      return payload.parts.map(extractText).join(" ");
    }
    return "";
  }

  function stripHtml(html) {
    if (!html) return "";
    return html
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, " ")
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  const body = extractText(detail.data.payload);
  const cleanBody = stripHtml(body);

  function parseFinancialEmail(email) {
    const text = (email.subject + " " + email.body).toLowerCase();
    const raw  =  email.subject + " " + email.body;

    const amountPattern =
      /(?:\$|USD|₦|NGN)[\s]*([\d,]+(?:\.\d{2})?)|([\d,]+(?:\.\d{2})?)[\s]*(?:USD|dollars?|naira|ngn)/gi;
    const matches = [...raw.matchAll(amountPattern)];
    let amount = 0;
    for (const match of matches) {
      const val = parseFloat((match[1] || match[2]).replace(/,/g, ""));
      if (isNaN(val) || val <= 0) continue;
      
      const matchIndex = match.index || 0;
      const context = raw.substring(Math.max(0, matchIndex - 25), matchIndex).toLowerCase();
      if (/balance|avail|bal/i.test(context)) {
        if (amount === 0) amount = val;
        continue;
      }
      amount = val;
      break;
    }

    const isCredit = /\b(?:credit|received|deposit|direct deposit|salary|payment received|payout)\b/i.test(text);
    const isDebit  = /\b(?:debit|withdrawal|transfer|purchase|payment made|charged|payment completed)\b/i.test(text);
    const isSubs   = /\b(?:subscription|renewal|recurring|monthly plan)\b/i.test(text);

    let entry_type = "expense";
    if (isCredit && !isDebit) {
      entry_type = "income";
    } else if (isDebit && !isCredit) {
      entry_type = "expense";
    } else if (isCredit && isDebit) {
      if (/transfer|debit|payment|charge/i.test(email.subject)) {
        entry_type = "expense";
      } else if (/received|deposit|credit/i.test(email.subject)) {
        entry_type = "income";
      } else {
        entry_type = "expense";
      }
    }

    if (!isCredit && !isDebit && !isSubs) return null;
    if (amount === 0) return null;

    let description = email.subject;
    const merchantMatch = raw.match(
      /(?:at|to|from|merchant):\s*([A-Z][A-Za-z0-9\s&'.,-]{2,40})/i
    );
    if (merchantMatch) description = merchantMatch[1].trim();

    const category = isSubs
      ? "Subscriptions"
      : /salary|payroll|pay ?day|direct deposit/i.test(text)
      ? "Salary"
      : /electric|gas|water|utility|con ?ed|pg&?e|utility/i.test(text)
      ? "Utilities"
      : /\b(?:phone bill|wireless bill|at&?t|verizon|t-mobile|sprint|recharge|airtime|data bundle|internet bill)\b/i.test(text)
      ? "Phone & Data"
      : /restaurant|food|grubhub|doordash|uber eat|starbucks|mcdonald/i.test(text)
      ? "Food & Dining"
      : /uber|lyft|transit|parking|transport/i.test(text)
      ? "Transport"
      : /amazon|walmart|target|shopping|order|jumia|aliexpress/i.test(text)
      ? "Shopping"
      : entry_type === "income"
      ? "Income"
      : "General Expense";

    return {
      source:     "gmail",
      entry_type,
      amount:     Math.round(amount * 100),
      description,
      category,
      entry_date: new Date(email.date).toISOString().split("T")[0],
    };
  }

    const result = parseFinancialEmail({ subject, from, date, body: cleanBody });
    console.log("=== PARSED RESULT ===");
    console.log(result);
    
    // Additional diagnostic logs
    const amountPattern =
      /(?:\$|USD|₦|NGN)[\s]*([\d,]+(?:\.\d{2})?)|([\d,]+(?:\.\d{2})?)[\s]*(?:USD|dollars?|naira|ngn)/gi;
    const matches = [...(subject + " " + cleanBody).matchAll(amountPattern)];
    console.log("=== MATCHES ===");
    matches.forEach(m => console.log(`Matched: ${m[0]} -> group1: ${m[1]}, group2: ${m[2]}`));
    
    console.log("isCredit matched word:", (subject + " " + cleanBody).match(/\b(?:credit|received|deposit|direct deposit|salary|payment received|payout)\b/i)?.[0]);
    console.log("isDebit matched word:", (subject + " " + cleanBody).match(/\b(?:debit|withdrawal|transfer|purchase|payment made|charged|payment completed)\b/i)?.[0]);
}

run().catch(console.error);
