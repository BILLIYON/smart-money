function safeParseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  const cleaned = dateStr.trim();
  if (!cleaned) return new Date().toISOString().split("T")[0];

  const parts = cleaned.split(/[/\-. ]+/);
  if (parts.length >= 3) {
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

  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function parseAmount(raw) {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  // If the number already has decimals (e.g. 1500.50 or 45.00), scale by 100 to get kobo.
  // If it's formatted as standard kobo (e.g. 150000), keep kobo intact or scale appropriately.
  if (raw.includes(".")) {
    return Math.round(num * 100);
  }
  // No decimals provided, assume standard major currency units (e.g. N150000 -> 15000000 kobo)
  return Math.round(num * 100);
}

function extractFromChunk(chunk) {
  const dateRegex = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3,9})[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b)/i;
  const amountRegex = /(?:₦\s*)?([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/g;

  const dateMatch = chunk.match(dateRegex);
  if (!dateMatch) return null;

  // Remove date from text BEFORE matching amounts so date digits are never mistaken for amounts
  const textWithoutDate = chunk.replace(dateRegex, " ");
  const matches = [...textWithoutDate.matchAll(amountRegex)];

  const validAmounts = matches.filter((m) => {
    const val = parseFloat(m[1].replace(/,/g, ""));
    return !isNaN(val) && Math.abs(val) > 0;
  });

  if (validAmounts.length === 0) return null;

  const targetMatch = validAmounts.length >= 2 ? validAmounts[validAmounts.length - 2] : validAmounts[0];
  const rawAmount = targetMatch[1];
  let amountKobo = parseAmount(rawAmount);

  if (/DR|debit|outward|withdrawal/i.test(chunk) || rawAmount.startsWith("-")) {
    if (amountKobo > 0) amountKobo = -amountKobo;
  } else if (/CR|credit|inward|deposit/i.test(chunk)) {
    if (amountKobo < 0) amountKobo = Math.abs(amountKobo);
  }

  const desc = textWithoutDate
    .replace(amountRegex, "")
    .replace(/CR|DR|credit|debit|Date:|Amount:|Narration:|Balance:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);

  return {
    description: desc || "Bank Statement Entry",
    amount: amountKobo,
    date: safeParseDate(dateMatch[0]),
    category: "other"
  };
}

function parsePdfTextResilient(text) {
  const dateRegex = /(\b\d{1,2}[/-](?:\d{1,2}|[A-Za-z]{3,9})[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b)/gi;
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const transactions = [];

  let currentChunk = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    dateRegex.lastIndex = 0;
    const hasDate = dateRegex.test(line);

    if (hasDate && currentChunk.length > 0) {
      const tx = extractFromChunk(currentChunk.join(" "));
      if (tx) transactions.push(tx);
      currentChunk = [line];
    } else {
      currentChunk.push(line);
    }
  }

  if (currentChunk.length > 0) {
    const tx = extractFromChunk(currentChunk.join(" "));
    if (tx) transactions.push(tx);
  }

  return transactions;
}

// Test sample without decimals
const sample = `
GTBank Statement
10/01/2024 Transfer to John 150000.00 CR
12/01/2024 Uber ride 4500.00 DR
15-Jan-2024 Tech Corp Salary 450000.00 CR
`;

console.log("Resilient parse output:", parsePdfTextResilient(sample));
