const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;
const amountPattern = /([\d,]+\.\d{2})/g;

function parseAmount(raw) {
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

function guessCategory(description) {
  const d = description.toLowerCase();
  if (d.includes("netflix") || d.includes("spotify") || d.includes("dstv")) return "subscriptions";
  if (d.includes("uber") || d.includes("bolt") || d.includes("transport")) return "transport";
  if (d.includes("shoprite") || d.includes("supermarket") || d.includes("market")) return "food";
  if (d.includes("salary") || d.includes("payroll") || d.includes("credit alert")) return "income";
  if (d.includes("transfer") || d.includes("trf")) return "transfer";
  if (d.includes("airtime") || d.includes("data")) return "utilities";
  return "other";
}

function parsePdfText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const transactions = [];

  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    const amounts = [...line.matchAll(amountPattern)];
    if (!dateMatch || !amounts.length) continue;

    const rawDate = dateMatch[1];
    const parsedDate = new Date(rawDate.replace(/[/-]/g, "-"));
    if (isNaN(parsedDate.getTime())) continue;

    const description = line.replace(datePattern, "").replace(amountPattern, "").trim().slice(0, 100);
    const amountKobo = parseAmount(amounts[amounts.length - 1][1]);
    const isDebit = /DR|debit|debit/i.test(line) || line.toLowerCase().includes("debit");

    transactions.push({
      description: description || "PDF transaction",
      amount: isDebit ? -Math.abs(amountKobo) : amountKobo,
      date: parsedDate.toISOString().split("T")[0],
      category: guessCategory(description),
    });
  }

  return transactions;
}

const mockText = `
01/06/2026 Netflix subscription DR 4,500.00
2026-06-02 Salary payment CR 350,000.00
03/06/2026 Uber ride 3,200.00 debit
`;

console.log("Mock parsed transactions:", parsePdfText(mockText));
