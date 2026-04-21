import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import Papa from "papaparse";

// pdf-parse has no named export — use require to avoid ESM issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

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

/** Attempt to parse a CSV file into transactions */
function parseCsv(text: string): ParsedTransaction[] {
  const { data } = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return data
    .map((row) => {
      // Normalise common CSV column naming conventions from Nigerian banks
      const description =
        row["Narration"] ?? row["Description"] ?? row["Details"] ?? row["Remark"] ?? "";
      const amountStr =
        row["Amount"] ?? row["Debit"] ?? row["Credit"] ?? row["Transaction Amount"] ?? "0";
      const dateStr =
        row["Date"] ?? row["Transaction Date"] ?? row["Value Date"] ?? "";
      const isDebit = !!row["Debit"] && !row["Credit"];
      let amount = parseAmount(amountStr);
      if (isDebit) amount = -Math.abs(amount);

      return {
        description: String(description).trim(),
        amount,
        date: dateStr ? new Date(dateStr).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        category: guessCategory(String(description)),
      } satisfies ParsedTransaction;
    })
    .filter((t) => t.description && t.amount !== 0);
}

/** Extract text from PDF and apply simple line-by-line heuristics */
function parsePdfText(text: string): ParsedTransaction[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];

  // Very simplified: look for lines that contain a date pattern and a numeric amount
  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;
  const amountPattern = /([\d,]+\.\d{2})/g;

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amounts = [...line.matchAll(amountPattern)];
    if (!dateMatch || !amounts.length) continue;

    const rawDate = dateMatch[1];
    const parsedDate = new Date(rawDate.replace(/[/-]/g, "-"));
    if (isNaN(parsedDate.getTime())) continue;

    const description = line.replace(datePattern, "").replace(amountPattern, "").trim().slice(0, 100);
    const amountKobo = parseAmount(amounts[amounts.length - 1][1]);
    const isDebit = /DR|debit/i.test(line);

    transactions.push({
      description: description || "PDF transaction",
      amount: isDebit ? -Math.abs(amountKobo) : amountKobo,
      date: parsedDate.toISOString().split("T")[0],
      category: guessCategory(description),
    });
  }

  return transactions;
}

export async function POST(req: Request) {
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

  try {
    if (fileName.endsWith(".pdf")) {
      const parsed = await pdfParse(buffer);
      transactions = parsePdfText(parsed.text as string);
    } else if (fileName.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      transactions = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or CSV." },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("[/api/databank/upload] parse error:", e);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 422 });
  }

  if (!transactions.length) {
    return NextResponse.json(
      { error: "No transactions found in file. Check the format." },
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
    console.error("[/api/databank/upload] DB insert:", dbError);
    return NextResponse.json({ error: "Failed to save transactions" }, { status: 500 });
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
}
