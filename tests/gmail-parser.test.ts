import test from "node:test";
import assert from "node:assert/strict";
import { parseFinancialEmailData } from "../src/lib/gmail-parser";

test("classifies debit alerts as expenses and extracts amount (not balance)", () => {
  const parsed = parseFinancialEmailData(
    "Acct: **1234 Amt: NGN 5,000.00 Desc: POS Purchase at SHOPRITE Available Balance: NGN 45,230.50",
    "Debit Alert",
    "alerts@gtbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 5000);
  assert.equal(parsed.account_balance, 45230.5);
  assert.equal(parsed.bank, "GTBank");
  assert.equal(parsed.provider, "gtbank");
});

test("classifies credit alerts as income and captures salary", () => {
  const parsed = parseFinancialEmailData(
    "Your account has been credited with NGN 150,000.00 from salary. Avail Bal: NGN 320,000.00",
    "Credit Alert",
    "noreply@accessbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "income");
  assert.equal(parsed.amount, 150000);
  assert.equal(parsed.category, "Salary");
  assert.equal(parsed.account_balance, 320000);
  assert.equal(parsed.bank, "Access Bank");
});

test("parses OPay send money alert with available balance", () => {
  const parsed = parseFinancialEmailData(
    "You sent N2,500.00 to John Doe. Available Balance: N18,750.25 Transaction successful.",
    "Transaction Alert",
    "alerts@opayweb.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 2500);
  assert.equal(parsed.account_balance, 18750.25);
  assert.equal(parsed.provider, "opay");
  assert.equal(parsed.bank, "OPay");
});

test("parses Kuda credit with bal label", () => {
  const parsed = parseFinancialEmailData(
    "NGN 10,000.00 has been credited to your account. Bal: NGN 55,000.00",
    "Credit Alert from Kuda",
    "alerts@kuda.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "income");
  assert.equal(parsed.amount, 10000);
  assert.equal(parsed.account_balance, 55000);
  assert.equal(parsed.bank, "Kuda Bank");
});

test("ignores marketing and non-transaction emails", () => {
  const parsed = parseFinancialEmailData(
    "Get 20% off your next purchase with our special offer.",
    "Limited time promo",
    "offers@bank.com"
  );

  assert.equal(parsed, null);
});

test("does not treat balance-only marketing copy as a transaction without debit/credit signal", () => {
  const parsed = parseFinancialEmailData(
    "Your balance is looking healthy this month. Tips to grow your savings.",
    "Weekly money tip",
    "hello@fintech.com"
  );

  assert.equal(parsed, null);
});

test("correctly classifies transfer debit alert with Account Credited beneficiary as expense", () => {
  const parsed = parseFinancialEmailData(
    "Dear Customer, your account 0123456789 has been debited with NGN 15,000.00. Narration: TRF/OPAY/John Doe. Beneficiary Name: John Doe. Account Credited: 9988776655. Available Balance: NGN 145,000.00",
    "Transaction Notification",
    "alerts@gtbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 15000);
  assert.equal(parsed.account_balance, 145000);
  assert.equal(parsed.bank, "GTBank");
});

test("correctly classifies airtime top-up purchase as expense", () => {
  const parsed = parseFinancialEmailData(
    "Airtime Top-up Successful. You recharged N2,000.00 on 08012345678. Your OPay balance was debited N2,000.00. Available Balance: N14,500.00",
    "Airtime Top-up",
    "alerts@opayweb.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 2000);
  assert.equal(parsed.account_balance, 14500);
  assert.equal(parsed.bank, "OPay");
});

test("correctly classifies merchant payment receipt debit as expense", () => {
  const parsed = parseFinancialEmailData(
    "Payment Received by Merchant. Your account has been debited with NGN 5,500.00 for your purchase at Domino's Pizza. Available Balance: NGN 62,000.00",
    "Payment Successful",
    "alerts@accessbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "expense");
  assert.equal(parsed.amount, 5500);
  assert.equal(parsed.account_balance, 62000);
  assert.equal(parsed.bank, "Access Bank");
});

test("correctly classifies Zenith Bank credit alert as income", () => {
  const parsed = parseFinancialEmailData(
    "Dear Customer, Your Account 208****123 Has Been Credited With NGN 100,000.00 On 03-SEP-2026 By TRF/PAYSTACK/SALARY. Available Balance NGN 450,000.00.",
    "Zenith Bank Alert - CREDIT",
    "alerts@zenithbank.com"
  );

  assert.ok(parsed);
  assert.equal(parsed.entry_type, "income");
  assert.equal(parsed.amount, 100000);
  assert.equal(parsed.account_balance, 450000);
  assert.equal(parsed.bank, "Zenith Bank");
});

