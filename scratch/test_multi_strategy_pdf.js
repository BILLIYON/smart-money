function parseAmount(raw) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function safeParseDate(dateStr) {
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
      .replace(/[|]/g, " ")
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

const testText = `
ACCESS BANK PLC STATEMENT OF ACCOUNT
TRANS DATE | VALUE DATE | NARRATION | DEBIT | CREDIT | BALANCE
02/01/2024 | 02/01/2024 | POS PURCHASE SHOPRITE IKEJA NGA | 18,500.00 | | 481,500.00
05/01/2024 | 05/01/2024 | NIP/MB/KUNLE OLADIPO/RENT SUPPORT | | 150,000.00 | 631,500.00
12/01/2024 | 12/01/2024 | AIRTIME PURCHASE MTN 08031234567 | 2,000.00 | | 629,500.00
25/01/2024 | 25/01/2024 | SALARY CREDIT JAN 2024 TECH CORP | | 650,000.00 | 1,279,500.00
`;

console.log("Parsed Access Bank PDF transactions:", parsePdfText(testText));
