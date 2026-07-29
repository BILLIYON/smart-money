const zlib = require('zlib');

function extractTextFromPdfBuffer(buffer) {
  let fullText = "";
  const content = buffer.toString("binary");

  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;

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
    let tjMatch;
    while ((tjMatch = tjRegex.exec(decodedText)) !== null) {
      fullText += tjMatch[1] + " ";
    }

    const arrayTjRegex = /\[\s*((?:\((?:[^)]+)\)|[\d\s-]+)+)\s*\]\s*TJ/gi;
    let arrayMatch;
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

function parseAmount(raw) {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function safeParseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = dateStr.trim();
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
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    }
  }
  return new Date().toISOString().split("T")[0];
}

function guessCategory(description) {
  const d = description.toLowerCase();
  if (d.includes("netflix") || d.includes("spotify") || d.includes("dstv")) return "subscriptions";
  if (d.includes("uber") || d.includes("bolt") || d.includes("transport")) return "transport";
  if (d.includes("shoprite") || d.includes("supermarket") || d.includes("market") || d.includes("food")) return "food";
  if (d.includes("salary") || d.includes("payroll") || d.includes("credit alert") || d.includes("cr")) return "income";
  if (d.includes("transfer") || d.includes("trf")) return "transfer";
  if (d.includes("airtime") || d.includes("data")) return "utilities";
  return "other";
}

function parsePdfText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions = [];

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

// Test with mock GTBank statement stream
const mockPdfStream = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [] /Count 1 /Kids [3 0 R]>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj
4 0 obj <</Length 200>> stream
BT /F1 12 Tf 50 700 Td [(01/06/2024) - (GTBank Transfer from Mary - ₦25,000.00 CR)] TJ ET
BT /F1 12 Tf 50 680 Td [(03/06/2024) - (Uber Ride Ikoyi - ₦3,800.00 DR)] TJ ET
BT /F1 12 Tf 50 660 Td [(05/06/2024) - (Salary Credit Alert - ₦550,000.00 CR)] TJ ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000500 00000 n 
trailer <</Size 6 /Root 1 0 R>>
startxref
600
%%EOF`;

const extractedText = extractTextFromPdfBuffer(Buffer.from(mockPdfStream));
console.log("--- Extracted Raw Text ---");
console.log(extractedText);
console.log("--- Parsed Transactions ---");
console.log(parsePdfText(extractedText));
