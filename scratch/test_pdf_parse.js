const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;
const amountPattern = /([\d,]+\.\d{2})/g;

function parseAmount(raw) {
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
      } catch {}
    }
  }

  let d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    try {
      return d.toISOString().split("T")[0];
    } catch {}
  }
  return new Date().toISOString().split("T")[0];
}

function parsePdfText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions = [];

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amounts = [...line.matchAll(amountPattern)];
    if (!dateMatch || !amounts.length) continue;

    const rawDate = dateMatch[1];
    const parsedDate = safeParseDate(rawDate);

    const description = line.replace(datePattern, "").replace(amountPattern, "").trim().slice(0, 100);
    const amountIndex = amounts.length >= 2 ? amounts.length - 2 : 0;
    const amountKobo = parseAmount(amounts[amountIndex][1]);
    const isDebit = /DR|debit/i.test(line);

    transactions.push({
      description: description || "PDF transaction",
      amount: isDebit ? -Math.abs(amountKobo) : amountKobo,
      date: parsedDate,
    });
  }

  return transactions;
}

const mockText = `
15/06/2026 KFC FOODS 4,500.00 145,500.00 DR
12/06/2026 INTEREST PAYMENT 120.50 145,620.50 CR
10/06/2026 TAX DEBIT 500.00 145,120.50 DR
`;

console.log("Mock PDF parsed transactions:", parsePdfText(mockText));
console.log("safeParseDate('12/06/2026'):", safeParseDate("12/06/2026"));
console.log("safeParseDate('15/06/2026'):", safeParseDate("15/06/2026"));
