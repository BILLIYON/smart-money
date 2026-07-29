const zlib = require('zlib');

function parseAmount(raw) {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₦,\s()]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function safeParseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = dateStr.trim();
  if (!cleaned) return new Date().toISOString().split("T")[0];

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = cleaned.split(/[/\-.]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else if (!isNaN(parseInt(parts[1], 10))) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
    }
    if (year > 2000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yy}-${mm}-${dd}`;
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

/**
 * Universal Multi-Pass Bank Statement Parser.
 * Handles single-line, multi-line, and tokenized PDF text streams.
 */
function universalParsePdfText(text) {
  const transactions = [];

  // Date regex matching DD/MM/YYYY, DD-MM-YYYY, DD/Jan/YYYY, YYYY-MM-DD
  const dateRegex = /(\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/g;
  // Amount regex matching 1,500.00, ₦50,000.00, 1500.00
  const amountRegex = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g;

  // Pass 1: Line by line scanning
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/(\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
    const amounts = [...line.matchAll(/(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g)];

    if (dateMatch && amounts.length > 0) {
      const rawDate = dateMatch[1];
      const parsedDate = safeParseDate(rawDate);

      const description = line
        .replace(/(\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/gi, "")
        .replace(/(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g, "")
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
        description: description || "Bank Transaction",
        amount: amountKobo,
        date: parsedDate,
        category: guessCategory(description),
      });
      continue;
    }

    // Pass 2: Multi-line window (If date is on line i and amount is on line i+1 or i+2)
    if (dateMatch && amounts.length === 0 && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextAmounts = [...nextLine.matchAll(/(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g)];
      if (nextAmounts.length > 0) {
        const combined = `${line} ${nextLine}`;
        const rawDate = dateMatch[1];
        const parsedDate = safeParseDate(rawDate);
        const description = combined
          .replace(/(\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/gi, "")
          .replace(/(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g, "")
          .replace(/CR|DR|credit|debit/gi, "")
          .replace(/[|]/g, " ")
          .trim()
          .slice(0, 120);

        let amountKobo = parseAmount(nextAmounts[0][1]);
        const isDebit = /DR|debit|withdrawal|outward/i.test(combined) || nextAmounts[0][1].startsWith("-");
        if (isDebit && amountKobo > 0) amountKobo = -amountKobo;

        transactions.push({
          description: description || "Bank Transaction",
          amount: amountKobo,
          date: parsedDate,
          category: guessCategory(description),
        });
      }
    }
  }

  // Deduplicate entries by date + description + amount
  const uniqueMap = new Map();
  for (const t of transactions) {
    const key = `${t.date}_${t.amount}_${t.description.slice(0, 20)}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, t);
  }

  return Array.from(uniqueMap.values());
}

// Test multi-line PDF text format (Kuda, Moniepoint, OPay, GTBank statement format)
const multilineText = `
GTBank Statement
Date: 10-Jan-2024
Narration: Transfer from John Doe
Amount: ₦25,000.00 CR
Balance: ₦125,000.00

Date: 12-Jan-2024
Narration: Uber Trip Lagos
Amount: ₦4,200.00 DR
Balance: ₦120,800.00
`;

console.log("Universal Parser output:", universalParsePdfText(multilineText));
