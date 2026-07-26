import test from "node:test";
import assert from "node:assert/strict";
import { parseFinancialEmailData } from "../src/lib/gmail-parser";

test("classifies debit alerts as expenses", () => {
  const parsed = parseFinancialEmailData(
    "Your account has been debited with N5,000.00 at POS. Transaction was successful.",
    "Debit Alert",
    "alerts@gtbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 500000);
  assert.equal(parsed.category, "General Expense");
});

test("classifies credit alerts as income", () => {
  const parsed = parseFinancialEmailData(
    "Credit Alert: Your account has been credited with NGN 150,000.00 from salary.",
    "Salary Credit",
    "payroll@accessbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "income");
  assert.equal(parsed.amount, 15000000);
  assert.equal(parsed.category, "Salary");
});

test("ignores marketing and non-transaction emails", () => {
  const parsed = parseFinancialEmailData(
    "Get 20% off your next purchase with our special offer.",
    "Limited time promo",
    "offers@bank.com"
  );

  assert.equal(parsed, null);
});
