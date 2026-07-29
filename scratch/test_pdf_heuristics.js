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

function parseAmount(raw) {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
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
    const description = line.replace(datePattern, "").replace(amountPattern, "").trim().slice(0, 120);
    
    // Pick the most plausible transaction amount (usually last or second to last before balance)
    const amountIndex = amounts.length >= 2 ? amounts.length - 2 : 0;
    let amountKobo = parseAmount(amounts[amountIndex][1]);
    const isDebit = /DR|debit|withdrawal|outward/i.test(line) || amounts[amountIndex][1].startsWith("-");
    const isCredit = /CR|credit|deposit|inward/i.test(line);

    if (isDebit && amountKobo > 0) amountKobo = -amountKobo;
    if (isCredit && amountKobo < 0) amountKobo = Math.abs(amountKobo);

    transactions.push({
      description: description || "Bank Statement Transaction",
      amount: amountKobo,
      date: rawDate,
      category: guessCategory(description),
    });
  }

  return transactions;
}

const samplePdfText = `
GTBANK STATEMENT OF ACCOUNT
Date | Narration | Amount | Balance
12/05/2024 Transfer from KUNLE ADEBAYO ₦150,000.00 CR 1,250,000.00
14/05/2024 UBER RIDE LAGOS ₦4,500.00 DR 1,245,500.00
16/05/2024 SHOPRITE VI ₦32,000.00 DR 1,213,500.00
20/05/2024 SALARY MAY 2024 ₦450,000.00 CR 1,663,500.00
`;

console.log("Parsed sample PDF transactions:", parsePdfText(samplePdfText));
