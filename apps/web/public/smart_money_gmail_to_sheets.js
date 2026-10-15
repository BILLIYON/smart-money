/**
 * ==============================================================================
 * SMART MONEY — NATIVE GOOGLE APPS SCRIPT FOR GMAIL FINANCIAL TRANSACTIONS
 * ==============================================================================
 * 
 * This script runs 100% natively inside Google Cloud / Google Sheets.
 * It automatically searches your Gmail for bank transaction alert emails,
 * parses amounts, dates, banks, and descriptions, and appends them
 * cleanly to your "Transactions" ledger tab without duplicates.
 * 
 * HOW TO INSTALL:
 * 1. Open your "Smart Money — Financial Ledger" Google Sheet.
 * 2. In the top menu, click: Extensions > Apps Script.
 * 3. Delete any default code in Code.gs, paste this entire script, and click Save (💾).
 * 4. In the toolbar, select "syncGmailToSheet" and click "Run".
 * 5. Grant Google permissions when prompted.
 * 6. Refresh your Google Sheet — the menu "Smart Money ⚡" is ready!
 * ==============================================================================
 */

// Supported Nigerian Bank Senders & Patterns (Commercial Banks, Digital Banks, Fintechs)
const BANK_CONFIG = [
  { domain: 'zenithbank.com', name: 'Zenith Bank', aliases: ['zenith'] },
  { domain: 'gtbank.com', name: 'GTBank', aliases: ['gtbank', 'gtb', 'gtco'] },
  { domain: 'accessbankplc.com', name: 'Access Bank', aliases: ['access bank', 'accessmore', 'accessbank'] },
  { domain: 'accessbank.com', name: 'Access Bank', aliases: ['access bank'] },
  { domain: 'ubagroup.com', name: 'UBA', aliases: ['uba', 'united bank for africa'] },
  { domain: 'uba.com.ng', name: 'UBA', aliases: ['uba'] },
  { domain: 'firstbanknigeria.com', name: 'First Bank', aliases: ['first bank', 'firstmonie', 'firstbank'] },
  { domain: 'stanbicibtc.com', name: 'Stanbic IBTC', aliases: ['stanbic'] },
  { domain: 'fcmb.com', name: 'FCMB', aliases: ['fcmb'] },
  { domain: 'wemabank.com', name: 'Wema Bank', aliases: ['wema bank'] },
  { domain: 'alat.ng', name: 'ALAT by Wema', aliases: ['alat'] },
  { domain: 'sterling.ng', name: 'Sterling Bank', aliases: ['sterling'] },
  { domain: 'unionbankng.com', name: 'Union Bank', aliases: ['union bank'] },
  { domain: 'fidelitybank.ng', name: 'Fidelity Bank', aliases: ['fidelity'] },
  { domain: 'providusbank.com', name: 'Providus Bank', aliases: ['providus'] },
  { domain: 'polarisbanklimited.com', name: 'Polaris Bank', aliases: ['polaris'] },
  { domain: 'keystonebankng.com', name: 'Keystone Bank', aliases: ['keystone'] },
  { domain: 'jaizbankplc.com', name: 'Jaiz Bank', aliases: ['jaiz'] },
  { domain: 'tajbank.com', name: 'TAJBank', aliases: ['tajbank', 'taj bank'] },
  { domain: 'unitybankng.com', name: 'Unity Bank', aliases: ['unity bank'] },
  { domain: 'opay-inc.com', name: 'OPay', aliases: ['opay'] },
  { domain: 'opayweb.com', name: 'OPay', aliases: ['opay'] },
  { domain: 'opay-nigeria.com', name: 'OPay', aliases: ['opay'] },
  { domain: 'palmpay.co', name: 'PalmPay', aliases: ['palmpay'] },
  { domain: 'palmpay.com', name: 'PalmPay', aliases: ['palmpay'] },
  { domain: 'kudabank.com', name: 'Kuda Bank', aliases: ['kuda'] },
  { domain: 'kuda.com', name: 'Kuda Bank', aliases: ['kuda'] },
  { domain: 'moniepoint.com', name: 'Moniepoint', aliases: ['moniepoint', 'teamapt'] },
  { domain: 'monnify.com', name: 'Monnify', aliases: ['monnify'] },
  { domain: 'carbon.ng', name: 'Carbon', aliases: ['carbon'] },
  { domain: 'getcarbon.co', name: 'Carbon', aliases: ['carbon'] },
  { domain: 'chippercash.com', name: 'Chipper Cash', aliases: ['chipper'] },
  { domain: 'fairmoney.ng', name: 'FairMoney', aliases: ['fairmoney'] },
  { domain: 'vfdmfb.com', name: 'VFD Microfinance', aliases: ['vfd'] },
  { domain: 'vbank.ng', name: 'VBank', aliases: ['vbank'] },
  { domain: 'sparkle.ng', name: 'Sparkle', aliases: ['sparkle'] },
  { domain: 'rubies.ng', name: 'Rubies', aliases: ['rubies'] },
  { domain: 'grey.co', name: 'Grey', aliases: ['grey'] },
  { domain: 'geegpay.africa', name: 'Geegpay', aliases: ['geegpay'] },
  { domain: 'piggyvest.com', name: 'PiggyVest', aliases: ['piggyvest'] },
  { domain: 'cowrywise.com', name: 'Cowrywise', aliases: ['cowrywise'] },
  { domain: 'risevest.com', name: 'Risevest', aliases: ['risevest'] },
  { domain: 'flutterwavego.com', name: 'Flutterwave', aliases: ['flutterwave', 'barter'] },
  { domain: 'paystack.com', name: 'Paystack', aliases: ['paystack'] },
  { domain: 'taxtech.com.ng', name: 'Taxtech', aliases: ['taxtech'] },
];

/**
 * Creates custom "Smart Money ⚡" menu inside the Google Sheet toolbar.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Smart Money ⚡')
    .addItem('⚡ Sync Gmail Now (Instant)', 'syncGmailToSheet')
    .addSeparator()
    .addItem('⏰ Setup Auto-Sync (Every 15 mins)', 'setupAutoSyncTrigger')
    .addItem('⏹️ Disable Auto-Sync', 'disableAutoSyncTrigger')
    .addToUi();

  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      '👉 Click "Smart Money ⚡" in the top menu to sync your Gmail alerts!',
      'Smart Money Connected',
      8
    );
  } catch (e) {}
}

/**
 * Main Sync Function: Searches Gmail, extracts alerts, and appends to Sheet.
 * High-performance, multi-batch search designed to capture ALL transactions.
 */
function syncGmailToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Transactions');
  
  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow([
      'Date',
      'Bank',
      'Entry Type',
      'Amount (₦)',
      'Description / Counterparty',
      'Category',
      'Available Balance (₦)',
      'Reference / ID',
      'Status',
      'Idempotency Hash'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Load existing references and dedup hashes to avoid duplicates
  const existingRefs = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const refValues = sheet.getRange(2, 8, lastRow - 1, 1).getValues();
    const hashValues = sheet.getRange(2, 10, lastRow - 1, 1).getValues();
    for (let i = 0; i < refValues.length; i++) {
      if (refValues[i][0]) existingRefs.add(String(refValues[i][0]).trim());
      if (hashValues[i][0]) existingRefs.add(String(hashValues[i][0]).trim());
    }
  }

  // Broad, tuned Gmail Search Queries (covers all bank alerts & receipts)
  const searchQuery = `("debit alert" OR "credit alert" OR "transaction alert" OR "transaction notification" OR "transfer notification" OR "payment received" OR "payment successful" OR "payment receipt" OR "transfer successful" OR "money received" OR "you spent" OR "you received" OR "debit advice" OR "credit advice" OR "account debited" OR "account credited" OR "inward payment" OR "outward payment" OR subject:(receipt OR "debit alert" OR "credit alert" OR "transaction alert" OR "transfer notification" OR "payment receipt" OR opay OR kuda OR palmpay OR moniepoint OR zenith OR gtbank OR access OR uba OR firstbank OR stanbic OR fcmb OR wema OR alat OR fidelity OR union OR providus) OR from:(zenithbank.com OR gtbank.com OR accessbankplc.com OR accessbank.com OR ubagroup.com OR firstbanknigeria.com OR kudabank.com OR kuda.com OR opayweb.com OR opay-inc.com OR opay-nigeria.com OR palmpay.co OR palmpay.com OR moniepoint.com OR stanbicibtc.com OR fcmb.com OR wemabank.com OR alat.ng OR fidelitybank.ng OR unionbankng.com OR providusbank.com OR polarisbanklimited.com OR keystonebankng.com OR jaizbankplc.com OR tajbank.com OR flutterwavego.com OR paystack.com OR getcarbon.co OR chippercash.com OR fairmoney.ng OR vfdmfb.com OR grey.co OR geegpay.africa OR piggyvest.com OR cowrywise.com)) -subject:("security alert" OR "login alert" OR "password reset" OR "verification code" OR "terms of service" OR "privacy policy" OR "statement of account" OR "customer support")`;

  SpreadsheetApp.getActiveSpreadsheet().toast('Scanning Gmail inbox for bank transactions...', 'Smart Money ⚡', 5);
  Logger.log('Searching Gmail with query: ' + searchQuery);

  // Multi-batch search: Retrieve up to 300 threads in chunks of 100
  const MAX_THREADS = 300;
  let allThreads = [];
  for (let offset = 0; offset < MAX_THREADS; offset += 100) {
    try {
      const batch = GmailApp.search(searchQuery, offset, 100);
      if (!batch || batch.length === 0) break;
      allThreads = allThreads.concat(batch);
      if (batch.length < 100) break;
    } catch (e) {
      Logger.log('Search batch error at offset ' + offset + ': ' + e);
      break;
    }
  }

  Logger.log('Found total threads: ' + allThreads.length);
  const newRows = [];
  let skippedDuplicates = 0;

  for (let i = 0; i < allThreads.length; i++) {
    const messages = allThreads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const msgId = msg.getId();

      if (existingRefs.has(msgId)) {
        skippedDuplicates++;
        continue;
      }

      const parsed = parseBankEmail(msg);
      if (parsed && parsed.amount > 0) {
        const dedupHash = `${parsed.date}_${parsed.bank}_${parsed.amount}_${parsed.type}`.replace(/[^a-zA-Z0-9_]/g, '');
        
        if (existingRefs.has(dedupHash)) {
          skippedDuplicates++;
          continue;
        }

        existingRefs.add(msgId);
        existingRefs.add(dedupHash);

        newRows.push([
          parsed.date,
          parsed.bank,
          parsed.type,
          parsed.amount,
          parsed.description,
          parsed.category,
          parsed.balance !== '' ? parsed.balance : '',
          parsed.reference || msgId,
          'Auto-Synced',
          dedupHash
        ]);
      }
    }
  }

  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, 10).setValues(newRows);
    
    // Format amount column as currency (₦)
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setNumberFormat('₦#,##0.00');
    // Format balance column as currency (₦)
    sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).setNumberFormat('₦#,##0.00');

    Logger.log(`Successfully added ${newRows.length} new transactions!`);
    SpreadsheetApp.getActiveSpreadsheet().toast(`🎉 Extracted ${newRows.length} new transactions! (Total rows: ${sheet.getLastRow() - 1})`, 'Smart Money ⚡', 6);
  } else {
    Logger.log('No new transactions found. Everything up to date!');
    SpreadsheetApp.getActiveSpreadsheet().toast(`All caught up! No new transactions found. (${skippedDuplicates} already synced)`, 'Smart Money ⚡', 5);
  }
}

/**
 * Intelligent parser for Nigerian bank and fintech emails.
 * Robust multi-regex engine matching amounts with or without commas.
 */
function parseBankEmail(msg) {
  const from = (msg.getFrom() || '').toLowerCase();
  const subject = msg.getSubject() || '';
  const body = (msg.getPlainBody() || msg.getBody() || '').replace(/\s+/g, ' ');
  const combined = (subject + ' ' + body).toLowerCase();

  // 1. Identify Bank from sender domain or text
  let bankName = 'Bank Alert';
  for (let b of BANK_CONFIG) {
    if (from.includes(b.domain)) {
      bankName = b.name;
      break;
    }
    if (b.aliases && b.aliases.some(a => from.includes(a) || subject.toLowerCase().includes(a))) {
      bankName = b.name;
      break;
    }
  }

  // 2. Determine Type: Income vs Expense vs Savings
  let type = 'Expense';
  if (bankName === 'PiggyVest' || bankName === 'Cowrywise' || bankName === 'Risevest') {
    type = 'Savings & Investments';
  } else if (
    combined.includes('credit alert') ||
    combined.includes('credited with') ||
    combined.includes('has been credited') ||
    combined.includes('inward transfer') ||
    combined.includes('received from') ||
    combined.includes('money received') ||
    combined.includes('you received') ||
    combined.includes('payment received') ||
    combined.includes('direct deposit') ||
    combined.includes('salary')
  ) {
    type = 'Income';
  } else if (
    combined.includes('debit alert') ||
    combined.includes('debited with') ||
    combined.includes('has been debited') ||
    combined.includes('transferred to') ||
    combined.includes('outward transfer') ||
    combined.includes('payment to') ||
    combined.includes('you spent') ||
    combined.includes('pos purchase') ||
    combined.includes('atm withdrawal') ||
    combined.includes('airtime') ||
    combined.includes('purchase')
  ) {
    type = 'Expense';
  }

  // 3. Robust Amount Extraction (supports amounts with/without commas, e.g. 5000, 15,000.00)
  let amount = 0;
  const isLikelyYear = (num) => num >= 1990 && num <= 2040 && Number.isInteger(num);

  const amountPatterns = [
    // Pattern 1: "payment of ₦15,000.00" / "amount of NGN 5000"
    /(?:your\s+payment\s+of|payment\s+of|amount\s+of|sum\s+of|value\s+of)[:\s]*(?:₦|NGN|N|\$)?\s*([1-9]\d{0,2}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i,
    // Pattern 2: Explicit labels: "Transaction Amount: ₦50,000", "Txn Amount: 5000", "Amount Credited: ₦10,000", "Debit Amount: ₦2,500"
    /(?:Transaction\s*Amount|Txn\s*Amount|Credit\s*Amount|Debit\s*Amount|Amount\s*Credited|Amount\s*Debited|Paid|Received|Amount|Value|Sum)[:\s]*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i,
    // Pattern 3: "Debit: ₦5,000", "Credit: ₦5,000"
    /(?:Debit|Credit|Paid)[:\s]*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i,
    // Pattern 4: "₦50,000.00 has been debited" / "NGN 5000 was transferred"
    /(?:has been debited|has been credited|was transferred|was received)[:\s]*(?:with|of)?\s*(?:₦|NGN|N|\$)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i,
    // Pattern 5: Direct Naira symbol "₦ 5,000.00" or "NGN 5000"
    /(?:₦|NGN)\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i,
    // Pattern 6: Standard amount fallback
    /(?:Amount|Amt|Total)[:\s]*(?:NGN|NGN\.?|₦|N)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i
  ];

  for (let regex of amountPatterns) {
    const match = body.match(regex) || subject.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0 && !isLikelyYear(val)) {
        amount = val;
        break;
      }
    }
  }

  if (amount <= 0) return null;

  // 4. Extract Description / Beneficiary / Sender / Narration
  let description = subject;
  const descMatch = body.match(/(?:Beneficiary|Description|Narration|To|Sender|Merchant|Remarks|Receiver|Destination)[:\s]*([^\n\r,\.]{3,50})/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  // Clean trailing bank suffixes from description
  description = description
    .replace(/(?:Bank Plc|Bank Ltd|Account Number|Plc|Ltd)/gi, '')
    .trim();

  // 5. Extract Available Balance if present
  let balance = '';
  const balMatch = body.match(/(?:Available Balance|Balance|Bal|Ledger Balance)[:\s]*(?:NGN|₦|N)?\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)/i);
  if (balMatch && balMatch[1]) {
    const balVal = parseFloat(balMatch[1].replace(/,/g, ''));
    if (!isNaN(balVal)) {
      balance = balVal;
    }
  }

  // 6. Extract Reference / ID
  let reference = '';
  const refMatch = body.match(/(?:Ref(?:erence)?|Txn ID|Transaction ID|Session ID|Payment Ref)[:\s]*([a-zA-Z0-9_\-\/]{6,36})/i);
  if (refMatch && refMatch[1]) {
    reference = refMatch[1].trim();
  }

  // 7. Auto-Categorization
  let category = 'General Expense';
  const descLower = description.toLowerCase();
  if (type === 'Income') {
    category = descLower.includes('salary') ? 'Salary & Income' : 'Direct Credit';
  } else if (type === 'Savings & Investments') {
    category = 'Savings & Investments';
  } else if (descLower.includes('food') || descLower.includes('eat') || descLower.includes('restaurant') || descLower.includes('shawarma') || descLower.includes('kitchen') || descLower.includes('chowdeck')) {
    category = 'Food & Groceries';
  } else if (descLower.includes('uber') || descLower.includes('bolt') || descLower.includes('fuel') || descLower.includes('petrol') || descLower.includes('transport')) {
    category = 'Transportation';
  } else if (descLower.includes('airtime') || descLower.includes('data') || descLower.includes('mtn') || descLower.includes('airtel') || descLower.includes('glo') || descLower.includes('electricity') || descLower.includes('dstv')) {
    category = 'Utilities & Bills';
  } else {
    category = 'Bank Transfers';
  }

  const dateStr = Utilities.formatDate(msg.getDate(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd');

  return {
    date: dateStr,
    bank: bankName,
    type: type,
    amount: amount,
    description: description,
    category: category,
    balance: balance,
    reference: reference || msg.getId()
  };
}

/**
 * Sets up a Google Time-Driven Trigger to run automatically every 15 minutes.
 */
function setupAutoSyncTrigger() {
  disableAutoSyncTrigger(); // Remove existing to avoid duplicate triggers
  ScriptApp.newTrigger('syncGmailToSheet')
    .timeBased()
    .everyMinutes(15)
    .create();
    
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ Auto-sync scheduled! Google will now sync new bank emails every 15 minutes.', 'Smart Money ⚡', 6);
}

/**
 * Removes any active auto-sync triggers.
 */
function disableAutoSyncTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncGmailToSheet') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('⏸️ Auto-sync disabled.', 'Smart Money ⚡', 4);
}
