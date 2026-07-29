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

  const parts = cleaned.split(/[/\-.]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = monthNames.indexOf(parts[1].toLowerCase());
      if (mIdx !== -1) {
        day = parseInt(parts[0], 10);
        month = mIdx;
        year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
      }
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
 * Robust Date-Block Bank Statement Parser.
 * Segments statements into transaction chunks by date occurrences.
 */
function robustBankStatementParse(text) {
  const dateRegex = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b)/gi;
  const amountRegex = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g;

  // Split text by lines
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const transactions = [];

  let currentChunk = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasDate = dateRegex.test(line);
    dateRegex.lastIndex = 0; // reset state

    if (hasDate && currentChunk.length > 0) {
      // Process accumulated chunk
      const chunkStr = currentChunk.join(" ");
      const chunkTx = processChunk(chunkStr);
      if (chunkTx) transactions.push(chunkTx);
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0) {
    const chunkStr = currentChunk.join(" ");
    const chunkTx = processChunk(chunkStr);
    if (chunkTx) transactions.push(chunkTx);
  }

  return transactions;
}

function processChunk(chunkStr) {
  const datePattern = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3})[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b)/i;
  const amountPattern = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})/g;

  const dateMatch = chunkStr.match(datePattern);
  const amounts = [...chunkStr.matchAll(amountPattern)];

  if (!dateMatch || amounts.length === 0) return null;

  const rawDate = dateMatch[1];
  const parsedDate = safeParseDate(rawDate);

  // Take the primary transaction amount (usually last or second to last before balance)
  const amountIndex = amounts.length >= 2 ? amounts.length - 2 : 0;
  let amountKobo = parseAmount(amounts[amountIndex][1]);

  const isDebit = /DR|debit|withdrawal|outward/i.test(chunkStr) || amounts[amountIndex][1].startsWith("-");
  const isCredit = /CR|credit|deposit|inward/i.test(chunkStr);

  if (isDebit && amountKobo > 0) amountKobo = -amountKobo;
  if (isCredit && amountKobo < 0) amountKobo = Math.abs(amountKobo);

  const description = chunkStr
    .replace(datePattern, "")
    .replace(amountPattern, "")
    .replace(/CR|DR|credit|debit|Date:|Amount:|Narration:|Balance:/gi, "")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return {
    description: description || "Bank Statement Transaction",
    amount: amountKobo,
    date: parsedDate,
    category: guessCategory(description),
  };
}

// Test with multi-line GTBank / Moniepoint / OPay / Kuda statement text
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

Date: 15-Jan-2024
Narration: Salary Credit Jan 2024 Tech Corp
Amount: ₦450,000.00 CR
Balance: ₦570,800.00
`;

console.log("Block Parser output:", robustBankStatementParse(multilineText));
