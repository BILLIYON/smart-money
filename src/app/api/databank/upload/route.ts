import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import Papa from "papaparse";



// pdf-parse has no named export — use require to avoid ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");

type RawRow = Record<string, string>;

type ParsedTransaction = {
  description: string;
  amount: number;   // kobo — positive = credit, negative = debit
  date: string;     // ISO date string
  category: string;
};

function guessCategory(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("netflix") || d.includes("spotify") || d.includes("dstv")) return "subscriptions";
  if (d.includes("uber") || d.includes("bolt") || d.includes("transport")) return "transport";
  if (d.includes("shoprite") || d.includes("supermarket") || d.includes("market")) return "food";
  if (d.includes("salary") || d.includes("payroll") || d.includes("credit alert")) return "income";
  if (d.includes("transfer") || d.includes("trf")) return "transfer";
  if (d.includes("airtime") || d.includes("data")) return "utilities";
  return "other";
}

function parseAmount(raw: string): number {
  // Strip commas, currency symbols, spaces
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  // Convert naira → kobo
  return Math.round(num * 100);
}

function safeParseDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = dateStr.trim();
  if (!cleaned) return new Date().toISOString().split("T")[0];

  // Try parsing DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY first
  const parts = cleaned.split(/[/\-.]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    
    // Check if it's YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      // DD/MM/YYYY or MM/DD/YYYY
      // In Nigerian bank statements, it is almost always DD/MM/YYYY or DD/MM/YY
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      if (year < 100) {
        year += 2000;
      }
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

  // Fallback to standard Date parsing as a last resort
  let d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    try {
      return d.toISOString().split("T")[0];
    } catch {
      // ignore
    }
  }

  // Fallback to today
  return new Date().toISOString().split("T")[0];
}

/** Attempt to parse a CSV file into transactions */
function parseCsv(text: string): ParsedTransaction[] {
  const { data } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return data
    .map((row) => {
      // Normalize row keys to lowercase and trim
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

export const maxDuration = 60;

/** Extract text from PDF and apply simple line-by-line heuristics */
function parsePdfText(text: string): ParsedTransaction[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];

  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
  const amountPattern = /(?:₦\s*)?([+-]?[\d,]+\.\d{2})/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amounts = [...line.matchAll(amountPattern)];
    if (!dateMatch || !amounts.length) continue;

    const rawDate = dateMatch[1];
    const parsedDate = safeParseDate(rawDate);

    const description = line
      .replace(datePattern, "")
      .replace(amountPattern, "")
      .replace(/CR|DR|credit|debit/gi, "")
      .trim()
      .slice(0, 120);

    const amountIndex = amounts.length >= 2 ? amounts.length - 2 : 0;
    let amountKobo = parseAmount(amounts[amountIndex][1]);
    const isDebit = /DR|debit|withdrawal|outward/i.test(line) || amounts[amountIndex][1].startsWith("-");
    const isCredit = /CR|credit|deposit|inward/i.test(line);

    if (isDebit && amountKobo > 0) amountKobo = -amountKobo;
    if (isCredit && amountKobo < 0) amountKobo = Math.abs(amountKobo);

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
      let pdfText = "";
      try {
        const uint8 = new Uint8Array(buffer);
        const parser = new PDFParse(uint8);
        const parsed = await parser.getText();
        pdfText = parsed.text || "";
      } catch (pdfErr: any) {
        console.warn("[/api/databank/upload] PDFParse class instance failed, attempting fallback:", pdfErr?.message);
        try {
          const legacyPdf = require("pdf-parse");
          if (typeof legacyPdf === "function") {
            const data = await legacyPdf(buffer);
            pdfText = data.text || "";
          }
        } catch (fallbackErr: any) {
          console.error("[/api/databank/upload] Fallback PDF parse error:", fallbackErr?.message);
        }
      }

      if (pdfText) {
        transactions = parsePdfText(pdfText);
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
