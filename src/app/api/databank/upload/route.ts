import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import Papa from "papaparse";
import zlib from "zlib";

type RawRow = Record<string, string>;

type ParsedTransaction = {
  description: string;
  amount: number;   // kobo — positive = credit, negative = debit
  date: string;     // ISO date string
  category: string;
};

/**
 * Pure JS PDF Text Extraction.
 * Decodes PDF streams using zlib decompresion & Tj/TJ text operators.
 * Has ZERO external npm file dependencies and never crashes on Vercel Serverless.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  let fullText = "";
  const content = buffer.toString("binary");

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = match[1];
    let decodedText = "";

    try {
      const streamBuf = Buffer.from(rawStream, "binary");
      const decompressed = zlib.inflateSync(streamBuf);
      decodedText = decompressed.toString("utf-8");
    } catch {
      decodedText = rawStream;
    }

    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(decodedText)) !== null) {
      fullText += tjMatch[1] + " ";
    }

    const arrayTjRegex = /\[\s*((?:\((?:[^)]+)\)|[\d\s-]+)+)\s*\]\s*TJ/gi;
    let arrayMatch: RegExpExecArray | null;
    while ((arrayMatch = arrayTjRegex.exec(decodedText)) !== null) {
      const inner = arrayMatch[1];
      const strMatches = [...inner.matchAll(/\(([^)]+)\)/g)];
      const lineStr = strMatches.map((m) => m[1]).join("");
      fullText += lineStr + "\n";
    }
  }

  if (!fullText.trim()) {
    const rawMatches = [...content.matchAll(/\(([^)]+)\)/g)];
    fullText = rawMatches.map((m) => m[1]).join(" ");
  }

  return fullText
    .replace(/\\([()])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ");
}

function guessCategory(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("netflix") || d.includes("spotify") || d.includes("dstv")) return "subscriptions";
  if (d.includes("uber") || d.includes("bolt") || d.includes("transport")) return "transport";
  if (d.includes("shoprite") || d.includes("supermarket") || d.includes("market") || d.includes("food")) return "food";
  if (d.includes("salary") || d.includes("payroll") || d.includes("credit alert")) return "income";
  if (d.includes("transfer") || d.includes("trf")) return "transfer";
  if (d.includes("airtime") || d.includes("data")) return "utilities";
  return "other";
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function safeParseDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = dateStr.trim();
  if (!cleaned) return new Date().toISOString().split("T")[0];

  const parts = cleaned.split(/[/\-.]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      try {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
      } catch {
        // ignore
      }
    }
  }

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    try {
      return d.toISOString().split("T")[0];
    } catch {
      // ignore
    }
  }

  return new Date().toISOString().split("T")[0];
}

/** Attempt to parse a CSV file into transactions */
function parseCsv(text: string): ParsedTransaction[] {
  const { data } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return data
    .map((row) => {
      const normalizedRow: Record<string, string> = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.toLowerCase().trim()] = row[key] ?? "";
      }

      const getNonEmpty = (...vals: (string | undefined)[]) => {
        for (const v of vals) {
          if (v !== undefined && v !== null && v.trim() !== "") {
            return v.trim();
          }
        }
        return undefined;
      };

      const description = getNonEmpty(
        normalizedRow["narration"],
        normalizedRow["description"],
        normalizedRow["details"],
        normalizedRow["remark"],
        normalizedRow["memo"]
      ) ?? "";

      const debitStr = getNonEmpty(normalizedRow["debit"]);
      const creditStr = getNonEmpty(normalizedRow["credit"]);
      const amountStr = getNonEmpty(normalizedRow["amount"], normalizedRow["transaction amount"]);
      const dateStr = getNonEmpty(
        normalizedRow["date"],
        normalizedRow["transaction date"],
        normalizedRow["value date"]
      );

      let amount = 0;
      if (debitStr) {
        amount = -Math.abs(parseAmount(debitStr));
      } else if (creditStr) {
        amount = Math.abs(parseAmount(creditStr));
      } else if (amountStr) {
        amount = parseAmount(amountStr);
      }

      return {
        description: description.trim(),
        amount,
        date: safeParseDate(dateStr),
        category: guessCategory(description),
      } satisfies ParsedTransaction;
    })
    .filter((t) => t.description && t.amount !== 0);
}

import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const maxDuration = 60;

/** AI Fallback Parser supporting configurable Primary Engine and explicit Fallback control */
async function parsePdfWithAI(
  pdfText: string,
  preferredEngine = "nvidia",
  rawBuffer?: Buffer,
  options?: { enableFallback?: boolean; fallbackEngine?: string }
): Promise<ParsedTransaction[]> {
  const hasText = pdfText && pdfText.trim().length > 50;

  const textPrompt = `Extract ALL bank transaction entries from this bank statement. Return ONLY a valid JSON array with no extra text:
[
  {
    "description": "narration or details of transaction",
    "amount_naira": number (POSITIVE for credits/deposits/income, NEGATIVE for debits/withdrawals/expenses. Use the actual naira value from the statement e.g. 50000 for ₦50,000 credit, -15000 for ₦15,000 debit),
    "date": "YYYY-MM-DD",
    "category": "Food|Transport|Utilities|Income|Transfer|Entertainment|Healthcare|Education|Shopping|Investment|Personal Care|Other"
  }
]

Statement text:
${pdfText.slice(0, 14000)}`;

  const pdfPrompt = `You are a Nigerian banking statement parser. Extract ALL transaction records from this attached bank statement.
Return ONLY a valid JSON array of objects with keys: "description" (string), "amount_naira" (number: positive for credits, negative for debits), "date" (YYYY-MM-DD), "category" (string). No markdown, no commentary.`;

  const prompt = hasText ? textPrompt : pdfPrompt;

  const parseAIResponse = (text: string): ParsedTransaction[] => {
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const raw = JSON.parse(match[0]);
        if (!Array.isArray(raw)) return [];
        return raw.map((item: any) => {
          let amountKobo = 0;
          if (typeof item.amount_naira === "number") {
            amountKobo = Math.round(item.amount_naira * 100);
          } else if (typeof item.amount === "number") {
            const rawAmt = item.amount;
            amountKobo = Math.abs(rawAmt) < 50000 ? Math.round(rawAmt * 100) : Math.round(rawAmt);
          }
          return {
            description: String(item.description || "Bank Transaction").slice(0, 120),
            amount: amountKobo,
            date: safeParseDate(item.date),
            category: String(item.category || guessCategory(item.description || "")),
          };
        }).filter((t) => t.amount !== 0);
      }
    } catch { /* invalid JSON */ }
    return [];
  };

  const executeEngine = async (engineName: string): Promise<ParsedTransaction[]> => {
    const engine = (engineName || "nvidia").toLowerCase();

    // 1. NVIDIA Build / NIM API (Gemma 2 27B / Llama 3.3 70B)
    if (engine.includes("nvidia") || engine.includes("gemma") || engine.includes("nim")) {
      const nvidiaKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY;
      if (!nvidiaKey) {
        throw new Error("NVIDIA Build API key (NVIDIA_API_KEY) is not configured in environment variables.");
      }
      const nvidiaClient = new OpenAI({
        apiKey: nvidiaKey,
        baseURL: "https://integrate.api.nvidia.com/v1",
      });
      const modelName = engine.includes("gemma") ? "google/gemma-4-31b-it" : "meta/llama-3.3-70b-instruct";
      const response = await nvidiaClient.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.2,
      });
      const results = parseAIResponse(response.choices[0]?.message?.content || "");
      if (results.length > 0) {
        console.log(`[/api/databank/upload] NVIDIA NIM (${modelName}) extracted ${results.length} transactions`);
        return results;
      }
      return [];
    }

    // 2. Groq (Llama 3.3 70B / 3.1 8B)
    if (engine.includes("groq") || engine.includes("llama")) {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        throw new Error("Groq API key is not configured in environment variables.");
      }
      const groq = new Groq({ apiKey: groqKey });
      const modelName = engine.includes("8b") ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile";
      const response = await groq.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      });
      const results = parseAIResponse(response.choices[0]?.message?.content || "");
      if (results.length > 0) {
        console.log(`[/api/databank/upload] Groq (${modelName}) extracted ${results.length} transactions`);
        return results;
      }
      return [];
    }

    // 3. Anthropic Claude 3.5 Sonnet
    if (engine.includes("claude") || engine.includes("anthropic")) {
      const claudeKey = process.env.ANTHROPIC_API_KEY;
      if (!claudeKey) {
        throw new Error("Anthropic API key is not configured in environment variables.");
      }
      const anthropic = new Anthropic({ apiKey: claudeKey });
      let messageContent: Anthropic.MessageParam["content"];

      if (hasText) {
        messageContent = prompt;
      } else if (rawBuffer) {
        messageContent = [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: rawBuffer.toString("base64"),
            },
          },
          { type: "text" as const, text: pdfPrompt },
        ];
      } else {
        messageContent = prompt;
      }

      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: messageContent }],
      });
      const responseText = response.content[0]?.type === "text" ? response.content[0].text : "";
      const results = parseAIResponse(responseText);
      if (results.length > 0) {
        console.log(`[/api/databank/upload] Claude extracted ${results.length} transactions`);
        return results;
      }
      return [];
    }

    // 4. Google Gemini 2.0 Flash
    if (engine.includes("gemini") || engine.includes("google")) {
      const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        throw new Error("Google AI (Gemini) API key is not configured in environment variables.");
      }
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      let geminiContent: Parameters<typeof model.generateContent>[0];
      if (!hasText && rawBuffer) {
        geminiContent = {
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: rawBuffer.toString("base64") } },
              { text: pdfPrompt },
            ],
          }],
        };
      } else {
        geminiContent = prompt;
      }

      const result = await model.generateContent(geminiContent);
      const text = result.response.text();
      const results = parseAIResponse(text);
      if (results.length > 0) {
        console.log(`[/api/databank/upload] Gemini extracted ${results.length} transactions`);
        return results;
      }
      return [];
    }

    // 5. OpenAI
    if (engine.includes("openai") || engine.includes("gpt")) {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        throw new Error("OpenAI API key is not configured in environment variables.");
      }
      const client = new OpenAI({ apiKey: openaiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
      });
      const results = parseAIResponse(response.choices[0]?.message?.content || "");
      if (results.length > 0) {
        console.log(`[/api/databank/upload] OpenAI extracted ${results.length} transactions`);
        return results;
      }
      return [];
    }

    throw new Error(`Unsupported AI engine: ${engineName}`);
  };

  // Try primary requested engine
  try {
    const results = await executeEngine(preferredEngine);
    if (results.length > 0) return results;
  } catch (primaryErr: any) {
    console.warn(`[/api/databank/upload] Primary AI engine (${preferredEngine}) error:`, primaryErr?.message || primaryErr);
    if (options?.enableFallback === false) {
      throw primaryErr;
    }
  }

  // If fallback is explicitly disabled, do NOT failover
  if (options?.enableFallback === false) {
    return [];
  }

  // If fallback is enabled, try designated fallback engine
  const fallback = options?.fallbackEngine || (preferredEngine.includes("groq") ? "gemini" : "groq-70b");
  if (fallback && fallback !== preferredEngine) {
    try {
      console.log(`[/api/databank/upload] Executing designated fallback AI engine (${fallback})`);
      const fallbackResults = await executeEngine(fallback);
      if (fallbackResults.length > 0) return fallbackResults;
    } catch (fbErr: any) {
      console.warn(`[/api/databank/upload] Fallback AI engine (${fallback}) error:`, fbErr?.message || fbErr);
    }
  }

  return [];
}

function processChunk(chunkStr: string): ParsedTransaction | null {
  const dateRegex = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3,9})[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b)/i;
  const amountRegex = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/g;

  const dateMatch = chunkStr.match(dateRegex);
  if (!dateMatch) return null;

  // Remove date string from chunk text BEFORE matching amounts to avoid matching date digits as amounts
  const textWithoutDate = chunkStr.replace(dateRegex, " ");
  const matches = [...textWithoutDate.matchAll(amountRegex)];

  const validAmounts = matches.filter((m) => {
    const val = parseFloat(m[1].replace(/,/g, ""));
    return !isNaN(val) && Math.abs(val) > 0;
  });

  if (validAmounts.length === 0) return null;

  const targetMatch = validAmounts.length >= 2 ? validAmounts[validAmounts.length - 2] : validAmounts[0];
  const rawAmount = targetMatch[1];
  let amountKobo = parseAmount(rawAmount);

  const isDebit = /DR|debit|withdrawal|outward/i.test(chunkStr) || rawAmount.startsWith("-");
  const isCredit = /CR|credit|deposit|inward/i.test(chunkStr);

  if (isDebit && amountKobo > 0) amountKobo = -amountKobo;
  if (isCredit && amountKobo < 0) amountKobo = Math.abs(amountKobo);

  const description = textWithoutDate
    .replace(amountRegex, "")
    .replace(/CR|DR|credit|debit|Date:|Amount:|Narration:|Balance:/gi, "")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return {
    description: description || "Bank Statement Entry",
    amount: amountKobo,
    date: safeParseDate(dateMatch[0]),
    category: guessCategory(description),
  };
}

/** Extract text from PDF and apply multi-pass date-block bank statement parsing */
function parsePdfText(text: string): ParsedTransaction[] {
  const dateRegex = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3,9})[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b)/gi;
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];

  let currentChunk: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    dateRegex.lastIndex = 0;
    const hasDate = dateRegex.test(line);

    if (hasDate && currentChunk.length > 0) {
      const chunkTx = processChunk(currentChunk.join(" "));
      if (chunkTx) transactions.push(chunkTx);
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0) {
    const chunkTx = processChunk(currentChunk.join(" "));
    if (chunkTx) transactions.push(chunkTx);
  }

  if (transactions.length > 0) {
    const uniqueMap = new Map();
    for (const t of transactions) {
      const key = `${t.date}_${t.amount}_${t.description.slice(0, 20)}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, t);
    }
    return Array.from(uniqueMap.values());
  }

  // Pass 2: Line-by-line fallback
  const amountRegex = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/g;
  for (const line of lines) {
    dateRegex.lastIndex = 0;
    const dateMatch = dateRegex.exec(line);
    if (!dateMatch) continue;

    const lineWithoutDate = line.replace(dateRegex, " ");
    const matches = [...lineWithoutDate.matchAll(amountRegex)];
    const validAmounts = matches.filter((m) => {
      const val = parseFloat(m[1].replace(/,/g, ""));
      return !isNaN(val) && Math.abs(val) > 0;
    });
    if (!validAmounts.length) continue;

    const rawDate = dateMatch[0];
    const parsedDate = safeParseDate(rawDate);

    const rawAmount = validAmounts[validAmounts.length >= 2 ? validAmounts.length - 2 : 0][1];
    let amountKobo = parseAmount(rawAmount);

    const isDebit = /DR|debit|withdrawal|outward/i.test(line) || rawAmount.startsWith("-");
    const isCredit = /CR|credit|deposit|inward/i.test(line);

    if (isDebit && amountKobo > 0) amountKobo = -amountKobo;
    if (isCredit && amountKobo < 0) amountKobo = Math.abs(amountKobo);

    const description = lineWithoutDate
      .replace(amountRegex, "")
      .replace(/CR|DR|credit|debit/gi, "")
      .replace(/[|]/g, " ")
      .trim()
      .slice(0, 120);

    transactions.push({
      description: description || "Bank Statement Transaction",
      amount: amountKobo,
      date: parsedDate,
      category: guessCategory(description),
    });
  }

  return transactions;
}

export async function POST(req: Request) {
  try {
    const { supabase, userId, error } = await requireAuth();
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let transactions: ParsedTransaction[] = [];

    if (fileName.endsWith(".pdf")) {
      // Tier 1: Try pdf-parse (most reliable for text-based PDFs)
      let pdfText = "";
      try {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        pdfText = data.text || "";
        console.log(`[/api/databank/upload] pdf-parse extracted ${pdfText.length} chars`);
      } catch (pdfErr: any) {
        console.warn("[/api/databank/upload] pdf-parse failed:", pdfErr?.message);
      }

      // Tier 2: Fallback to our custom zlib extractor
      if (!pdfText.trim()) {
        pdfText = extractTextFromPdfBuffer(buffer);
        console.log(`[/api/databank/upload] Custom extractor got ${pdfText.length} chars`);
      }

      // Tier 3: Try local regex parsing on extracted text
      if (pdfText.trim()) {
        transactions = parsePdfText(pdfText);
        console.log(`[/api/databank/upload] Regex parser found ${transactions.length} transactions`);
      }

      // Tier 4 (AI): Always fire AI if regex found 0 results.
      // Pass raw buffer as base64 so Gemini File API / Claude can read the actual PDF bytes.
      if (!transactions.length) {
        const preferredEngine = (formData.get("aiEngine") as string) || "nvidia";
        const enableFallback = formData.get("enableFallback") !== "false";
        const fallbackEngine = (formData.get("fallbackEngine") as string) || "groq-70b";
        console.log(`[/api/databank/upload] Triggering AI PDF Parser (Primary: ${preferredEngine}, Fallback: ${enableFallback ? fallbackEngine : "DISABLED"}). pdfText length: ${pdfText.length}`);
        transactions = await parsePdfWithAI(pdfText, preferredEngine, buffer, { enableFallback, fallbackEngine });
      }
    } else if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      transactions = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or CSV bank statement." },
        { status: 400 }
      );
    }

    if (!transactions.length) {
      return NextResponse.json(
        { error: "No structured transactions could be extracted from this statement. Please check the file format or upload a CSV version." },
        { status: 422 }
      );
    }

    // Insert all parsed transactions
    const rows = transactions.map((t) => ({
      user_id: userId,
      source: "upload",
      entry_type: t.amount > 0 ? "income" : "expense",
      amount: t.amount,
      description: t.description,
      category: t.category,
      entry_date: t.date,
      metadata: { fileName: file.name },
    }));

    const { error: dbError } = await supabase.from("databank_entries").insert(rows);
    if (dbError) {
      console.error("[/api/databank/upload] DB insert error:", dbError);
      return NextResponse.json({ error: "Failed to save bank statement transactions to database." }, { status: 500 });
    }

    const totalIncome = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    return NextResponse.json({
      ok: true,
      parsed: transactions.length,
      totalIncome,
      totalExpenses,
      categories: [...new Set(transactions.map((t) => t.category))],
    });
  } catch (err: any) {
    console.error("[/api/databank/upload] Unexpected exception:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while processing the statement." },
      { status: 500 }
    );
  }
}
