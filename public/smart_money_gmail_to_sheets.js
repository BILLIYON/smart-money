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
 * 4. In the toolbar, select "onOpen" or "syncGmailToSheet" and click "Run".
 * 5. Grant Google permissions when prompted.
 * 6. Refresh your Google Sheet — a new menu "Smart Money ⚡" will appear!
 *    Click "Smart Money ⚡ > Setup 15-Minute Auto-Sync" to run 24/7 in the background.
 * ==============================================================================
 */

// Supported Nigerian Bank Senders & Patterns
const BANK_CONFIG = [
  { domain: 'zenithbank.com', name: 'Zenith Bank' },
  { domain: 'gtbank.com', name: 'GTBank' },
  { domain: 'accessbankplc.com', name: 'Access Bank' },
  { domain: 'opay-inc.com', name: 'OPay' },
  { domain: 'ubagroup.com', name: 'UBA' },
  { domain: 'kudabank.com', name: 'Kuda Bank' },
  { domain: 'firstbanknigeria.com', name: 'First Bank' },
  { domain: 'stanbicibtc.com', name: 'Stanbic IBTC' },
  { domain: 'fcmb.com', name: 'FCMB' },
  { domain: 'wemabank.com', name: 'Wema Bank' },
  { domain: 'sterling.ng', name: 'Sterling Bank' },
  { domain: 'unionbankng.com', name: 'Union Bank' },
  { domain: 'palmpay.co', name: 'PalmPay' },
  { domain: 'moniepoint.com', name: 'Moniepoint' },
  { domain: 'taxtech.com.ng', name: 'Taxtech' },
  { domain: 'piggyvest.com', name: 'PiggyVest' },
  { domain: 'cowrywise.com', name: 'Cowrywise' },
];

/**
 * Creates custom "Smart Money ⚡" menu inside the Google Sheet toolbar.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Smart Money ⚡')
    .addItem('Sync Gmail Now (Instant)', 'syncGmailToSheet')
    .addSeparator()
    .addItem('Setup Auto-Sync (Every 15 mins)', 'setupAutoSyncTrigger')
    .addItem('Disable Auto-Sync', 'disableAutoSyncTrigger')
    .addToUi();
}

/**
 * Main Sync Function: Searches Gmail, extracts alerts, and appends to Sheet.
 */
function syncGmailToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Transactions');
  
  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow([
      'Date',
      'Bank',
      'Type',
      'Amount (₦)',
      'Description',
      'Category',
      'Balance (₦)',
      'Reference / ID',
      'Status',
      'Dedup Hash'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#0f172a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Load existing references to prevent duplicates
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

  // Build Gmail Search Query for all banks
  const domainsQuery = BANK_CONFIG.map(b => 'from:' + b.domain).join(' OR ');
  const searchQuery = `(${domainsQuery}) (debit OR credit OR alert OR transfer OR paid OR received OR transaction)`;
  
  Logger.log('Searching Gmail with query: ' + searchQuery);
  
  // Search the last 50 relevant threads
  const threads = GmailApp.search(searchQuery, 0, 50);
  const newRows = [];
  let skippedDuplicates = 0;

  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
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
          parsed.balance || '',
          parsed.reference || msgId,
          'Synced from Gmail',
          dedupHash
        ]);
      }
    }
  }

  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 10).setValues(newRows);
    
    // Format amount column as currency
    sheet.getRange(2, 4, sheet.getLastRow() - 1, 1).setNumberFormat('₦#,##0.00');
    // Format balance column as currency
    sheet.getRange(2, 7, sheet.getLastRow() - 1, 1).setNumberFormat('₦#,##0.00');

    Logger.log(`Successfully added ${newRows.length} new transactions!`);
    SpreadsheetApp.getActiveSpreadsheet().toast(`Extracted ${newRows.length} transactions from Gmail!`, 'Smart Money ⚡', 5);
  } else {
    Logger.log('No new transactions found. Everything up to date!');
    SpreadsheetApp.getActiveSpreadsheet().toast('No new transactions found. Everything is up to date!', 'Smart Money ⚡', 4);
  }
}

/**
 * Intelligent parser for Nigerian bank emails.
 */
function parseBankEmail(msg) {
  const from = msg.getFrom().toLowerCase();
  const subject = msg.getSubject() || '';
  const body = (msg.getPlainBody() || msg.getBody() || '').replace(/\s+/g, ' ');

  // Identify Bank
  let bankName = 'Bank Alert';
  for (let b of BANK_CONFIG) {
    if (from.includes(b.domain)) {
      bankName = b.name;
      break;
    }
  }

  // Determine Type: Income vs Expense vs Savings
  let type = 'Expense';
  const combined = (subject + ' ' + body).toLowerCase();

  if (bankName === 'PiggyVest' || bankName === 'Cowrywise') {
    type = 'Savings & Investments';
  } else if (
    combined.includes('credit alert') ||
    combined.includes('credited') ||
    combined.includes('received') ||
    combined.includes('deposit') ||
    combined.includes('salary') ||
    combined.includes('inward transfer')
  ) {
    type = 'Income';
  } else if (
    combined.includes('debit alert') ||
    combined.includes('debited') ||
    combined.includes('transferred to') ||
    combined.includes('payment') ||
    combined.includes('outward transfer') ||
    combined.includes('purchase')
  ) {
    type = 'Expense';
  }

  // Extract Amount (₦, NGN, N)
  let amount = 0;
  const amountRegexes = [
    /(?:Amount|Amt|Total|Paid|Received)[:\s]*(?:NGN|NGN\.?|₦|N)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i,
    /(?:NGN|₦)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i,
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2}))\s*(?:has been debited|has been credited|was transferred)/i
  ];

  for (let regex of amountRegexes) {
    const match = body.match(regex) || subject.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) {
        amount = val;
        break;
      }
    }
  }

  if (amount <= 0) return null;

  // Extract Description / Beneficiary / Sender
  let description = subject;
  const descMatch = body.match(/(?:Beneficiary|Description|Narration|To|Sender|Merchant|Remarks)[:\s]*([^\n\r,\.]{3,50})/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  // Clean description
  description = description
    .replace(/(?:Bank Plc|Bank Ltd|Account Number|Plc|Ltd)/gi, '')
    .trim();

  // Extract Balance if mentioned
  let balance = '';
  const balMatch = body.match(/(?:Available Balance|Balance|Bal)[:\s]*(?:NGN|₦|N)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i);
  if (balMatch && balMatch[1]) {
    const balVal = parseFloat(balMatch[1].replace(/,/g, ''));
    if (!isNaN(balVal)) {
      balance = balVal;
    }
  }

  // Extract Reference
  let reference = '';
  const refMatch = body.match(/(?:Ref(?:erence)?|Txn ID|Transaction ID|Session ID)[:\s]*([a-zA-Z0-9_\-\/]{6,36})/i);
  if (refMatch && refMatch[1]) {
    reference = refMatch[1].trim();
  }

  // Category Guess
  let category = 'General Expense';
  const descLower = description.toLowerCase();
  if (type === 'Income') {
    category = descLower.includes('salary') ? 'Salary & Income' : 'Direct Credit';
  } else if (type === 'Savings & Investments') {
    category = 'Savings & Investments';
  } else if (descLower.includes('food') || descLower.includes('eat') || descLower.includes('restaurant') || descLower.includes('shawarma') || descLower.includes('kitchen')) {
    category = 'Food & Groceries';
  } else if (descLower.includes('uber') || descLower.includes('bolt') || descLower.includes('fuel') || descLower.includes('petrol')) {
    category = 'Transportation';
  } else if (descLower.includes('airtime') || descLower.includes('data') || descLower.includes('mtn') || descLower.includes('airtel') || descLower.includes('glo')) {
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
