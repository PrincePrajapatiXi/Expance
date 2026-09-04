import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType, PaymentMethod } from './types';
import { CURRENT_USER } from './db';

export interface ImportSummary {
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
  incomeCount: number;
  expenseCount: number;
  dateRange: { start: string; end: string } | null;
  categories: string[];
}

export interface ImportResult {
  addedCount: number;
  transactions: Transaction[];
  errors: string[];
  summary: ImportSummary;
}

// Generate unique UUID for imported records
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Clean string for header matching (lowercase, no spaces, no special characters)
function normalizeKey(key: any): string {
  return String(key ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Expanded Amount Regex as requested:
// /^(amount|amt|rupees|inr|price|cost|spend|paid|value|total|debit|credit|dr|cr|withdrawal|deposit|expense|income)/i
const AMOUNT_ALIAS_REGEX =
  /^(amount|amt|rupees|rs|inr|price|cost|spend|paid|value|total|debit|credit|dr|cr|withdrawal|deposit|expense|income)/i;

const DEBIT_REGEX =
  /^(debit|dr|withdrawal|withdrawals|expense|expenses|spent|paid|outflow|dr_amt|debitamt|debitamount|withdrawalamount)/i;

const CREDIT_REGEX =
  /^(credit|cr|deposit|deposits|income|incomes|received|inflow|cr_amt|creditamt|creditamount|depositamount)/i;

const SUMMARY_LABEL_REGEX =
  /(^|\b)(grand\s*total|net\s*balance|sub\s*total|subtotal|ending\s*balance|closing\s*balance|opening\s*balance|total\s*(expenses?|amount|income|spend|paid|payout)?|balance\s*c\/f|balance\s*b\/f|brought\s*forward|carried\s*forward)($|\b|:)/i;

// Strictly identify summary/footer rows to ignore:
// Matches rows where description or cell text contains 'Total', 'Grand Total', 'Net Balance', 'Subtotal', or 'Ending Balance'.
export function isSummaryRow(desc: string, rowValues: any[]): boolean {
  const descClean = String(desc || '').trim().toLowerCase();

  const summaryKeywords = [
    'grand total',
    'net balance',
    'ending balance',
    'subtotal',
    'sub total',
    'closing balance',
    'opening balance',
    'balance c/f',
    'balance b/f',
    'brought forward',
    'carried forward',
    'total expenses',
    'total expense',
    'total amount',
    'total income',
    'total paid',
    'total spend',
    'net total',
  ];

  for (const kw of summaryKeywords) {
    if (descClean.includes(kw)) {
      return true;
    }
  }

  // Exact or prefixed Total (e.g. 'Total', 'Total:', 'Total -')
  if (/^total(?:\s*[:=-].*)?$/i.test(descClean)) {
    return true;
  }

  // Also check if any cell in the row explicitly contains summary markers
  for (const cell of rowValues) {
    const s = String(cell ?? '').trim().toLowerCase();
    if (!s) continue;
    if (
      s === 'total' ||
      s.startsWith('total:') ||
      s.startsWith('total -') ||
      s.includes('grand total') ||
      s.includes('net balance') ||
      s.includes('ending balance') ||
      s.includes('subtotal') ||
      s.includes('closing balance')
    ) {
      return true;
    }
  }

  return false;
}

// Extract Description column dynamically:
// Prioritizes: Description, Particulars, Item, Name, Expense Details, Remarks
export function findDescriptionCol(headerRow: any[]): number {
  let primaryCol = -1;
  let secondaryCol = -1;
  let fallbackCol = -1;

  headerRow.forEach((cell, idx) => {
    const norm = normalizeKey(cell);
    if (!norm) return;

    // 1. High priority: Particulars, Description, Item, Expense Details, Details, Narration
    if (
      norm.includes('particular') ||
      norm.includes('description') ||
      norm.includes('item') ||
      norm.includes('expensedetail') ||
      norm === 'details' ||
      norm === 'detail' ||
      norm.includes('narration')
    ) {
      if (primaryCol === -1) primaryCol = idx;
    }
    // 2. Secondary priority: Name, Payee, Merchant, Party, Title
    else if (
      norm === 'name' ||
      norm.includes('itemname') ||
      norm.includes('payee') ||
      norm.includes('merchant') ||
      norm.includes('party') ||
      norm.includes('title')
    ) {
      if (secondaryCol === -1) secondaryCol = idx;
    }
    // 3. Fallback: Remarks, Memo, Comment
    else if (norm.includes('remark') || norm.includes('memo') || norm.includes('comment')) {
      if (fallbackCol === -1) fallbackCol = idx;
    }
  });

  if (primaryCol !== -1) return primaryCol;
  if (secondaryCol !== -1) return secondaryCol;
  return fallbackCol;
}

// Identify the field type a cell header text might represent
function identifyHeaderType(cellVal: any): string | null {
  if (cellVal == null) return null;
  const str = String(cellVal).trim();
  if (!str) return null;
  const norm = normalizeKey(str);
  if (!norm) return null;

  // Date
  if (
    /^(date|time|timestamp|datetime|txndate|transactiondate|bookingdate|valuedate|createdat)/i.test(norm) ||
    norm.includes('date') ||
    norm.includes('timestamp')
  ) {
    return 'date';
  }

  // Split Debit
  if (DEBIT_REGEX.test(norm) || norm.includes('debit') || norm.includes('withdrawal')) {
    return 'debit';
  }

  // Split Credit
  if (CREDIT_REGEX.test(norm) || norm.includes('credit') || norm.includes('deposit')) {
    return 'credit';
  }

  // Amount / General Amount
  if (AMOUNT_ALIAS_REGEX.test(norm) || norm.includes('amount') || norm.includes('rupee')) {
    return 'amount';
  }

  // Description / Title / Particulars / Narration / Item / Name / Expense Details
  if (
    /^(description|title|item|particulars|narration|desc|details|payee|merchant|party|name|expensedetail|expensedetails)/i.test(norm) ||
    norm.includes('description') ||
    norm.includes('particular') ||
    norm.includes('narration') ||
    norm.includes('item') ||
    norm.includes('expensedetail') ||
    norm === 'details' ||
    norm === 'name'
  ) {
    return 'description';
  }

  // Category
  if (/^(category|tag|tags|cat)/i.test(norm) || norm.includes('category')) {
    return 'category';
  }

  // Payment Mode / Method
  if (
    /^(paymentmode|paymentmethod|paymenttype|paymode|payment|mode|channel)/i.test(norm) ||
    norm.includes('paymentmode') ||
    norm.includes('paymode')
  ) {
    return 'mode';
  }

  // Type (Cr/Dr or Income/Expense)
  if (/^(txntype|transactiontype|type|crdr|drcr)/i.test(norm)) {
    return 'type';
  }

  // Notes
  if (/^(notes|memo|remarks|comment|comments)/i.test(norm) || norm.includes('remarks') || norm.includes('memo')) {
    return 'notes';
  }

  return null;
}

// Convert 2D array or array of objects into uniform 2D array
function normalizeToMatrix(input: any[]): any[][] {
  if (!input || !input.length) return [];
  if (Array.isArray(input[0])) {
    return input as any[][];
  }
  // Array of objects
  if (typeof input[0] === 'object' && input[0] !== null) {
    const keys = Object.keys(input[0]);
    const matrix: any[][] = [keys];
    for (const item of input) {
      matrix.push(keys.map((k) => item[k]));
    }
    return matrix;
  }
  return [];
}

// Robust date parser for strings, numbers (Excel serial), and Date objects.
// Guaranteed to return an ISO string, defaulting to new Date().toISOString() if invalid or missing.
function parseDateValue(val: any): string {
  if (!val) return new Date().toISOString();

  try {
    // 1. If already a Date object
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
    }

    // 2. If Excel numerical serial date (e.g. 45200 ~ 2023, or float like 45200.5)
    let numVal: number | null = null;
    if (typeof val === 'number') {
      numVal = val;
    } else if (typeof val === 'string' && /^\d{5}(?:\.\d+)?$/.test(val.trim())) {
      numVal = parseFloat(val.trim());
    }

    if (numVal !== null && numVal > 10000 && numVal < 90000) {
      try {
        if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
          const code = XLSX.SSF.parse_date_code(numVal);
          if (code && code.y && code.m && code.d) {
            const dt = new Date(Date.UTC(code.y, code.m - 1, code.d, code.H || 0, code.M || 0, Math.floor(code.S || 0)));
            if (!isNaN(dt.getTime())) return dt.toISOString();
          }
        }
      } catch {
        // Fallback below
      }
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + numVal * 86400000);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }

    const str = String(val).trim();
    if (!str) return new Date().toISOString();

    // 3. Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (dmyMatch) {
      const [, d, m, y, h = '0', min = '0', s = '0'] = dmyMatch;
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);

      if (day <= 12 && month > 12) {
        // MM/DD/YYYY
        const parsed = new Date(Date.UTC(year, day - 1, month, parseInt(h, 10), parseInt(min, 10), parseInt(s, 10)));
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
      } else {
        // DD/MM/YYYY
        const parsed = new Date(Date.UTC(year, month - 1, day, parseInt(h, 10), parseInt(min, 10), parseInt(s, 10)));
        if (!isNaN(parsed.getTime())) return parsed.toISOString();
      }
    }

    // 4. Match YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (ymdMatch) {
      const [, y, m, d, h = '0', min = '0', s = '0'] = ymdMatch;
      const parsed = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), parseInt(h, 10), parseInt(min, 10), parseInt(s, 10)));
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }

    // 5. Standard Date parse fallback (handles ISO, '04 Sep 2026', 'September 4, 2026', etc.)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // If any parsing error occurs, default to current date
  }

  return new Date().toISOString();
}

// Clean and extract numeric amount
// Strips spaces, currency signs (₹, $, Rs., etc.), and commas before converting to Number.
function parseNumericAmount(val: any): { amount: number; isNegative: boolean; isCredit?: boolean; isDebit?: boolean } {
  if (val == null || val === '') {
    return { amount: 0, isNegative: false };
  }

  if (typeof val === 'number') {
    return {
      amount: Math.abs(val),
      isNegative: val < 0,
    };
  }

  let str = String(val).trim();
  if (!str) return { amount: 0, isNegative: false };

  // Detect explicit CR / DR markers
  const isCredit = /\b(cr|credit)\b/i.test(str);
  const isDebit = /\b(dr|debit)\b/i.test(str);

  // Check negative formatted like -100 or (100) or 100-
  const isNegative =
    str.startsWith('-') ||
    str.endsWith('-') ||
    (str.startsWith('(') && str.endsWith(')')) ||
    isDebit;

  // 1. Strip currency signs: ₹, $, €, £, Rs., Rs, INR, USD
  let cleaned = str.replace(/(?:₹|\$|€|£|Rs\.?|INR|USD)/gi, '');

  // 2. Strip whitespace, commas, quotes, parentheses
  cleaned = cleaned.replace(/[\s,()"'`]/g, '');

  // 3. Keep only numeric digits and decimal point
  cleaned = cleaned.replace(/[^0-9.]/g, '');

  const parsed = parseFloat(cleaned);

  return {
    amount: isNaN(parsed) ? 0 : Math.abs(parsed),
    isNegative,
    isCredit,
    isDebit,
  };
}

// Standardize Payment Method
function normalizePaymentMode(val: any): PaymentMethod {
  if (!val) return 'UPI';
  const str = String(val).trim().toLowerCase();

  if (/cash/i.test(str)) return 'Cash';
  if (/card|credit|debit|visa|master|amex|rupay/i.test(str)) return 'Card';
  if (/bank|net|neft|imps|rtgs|transfer|wire/i.test(str)) return 'Net Banking';
  if (/upi|gpay|google\s*pay|phonepe|paytm|bhim|qr/i.test(str)) return 'UPI';

  return 'UPI';
}

// Process raw rows (from either PapaParse or XLSX) into standardized Transactions
export function processRawRows(rawInput: any[]): ImportResult {
  const matrix = normalizeToMatrix(rawInput);

  if (!matrix.length) {
    return {
      addedCount: 0,
      transactions: [],
      errors: ['No data rows found in uploaded file.'],
      summary: {
        totalCount: 0,
        totalIncome: 0,
        totalExpense: 0,
        incomeCount: 0,
        expenseCount: 0,
        dateRange: null,
        categories: [],
      },
    };
  }

  // 1. Smart Header Row Scan:
  // Scan the first 10 rows. Find the row that contains at least 2 keywords matching our known field aliases.
  let bestHeaderRowIndex = -1;
  let maxMatchedCount = 0;
  const scanLimit = Math.min(10, matrix.length);

  for (let i = 0; i < scanLimit; i++) {
    const row = matrix[i];
    if (!row || !Array.isArray(row)) continue;

    const matchedTypes = new Set<string>();
    for (const cell of row) {
      const type = identifyHeaderType(cell);
      if (type) {
        matchedTypes.add(type);
      }
    }

    if (matchedTypes.size >= 2 && matchedTypes.size > maxMatchedCount) {
      maxMatchedCount = matchedTypes.size;
      bestHeaderRowIndex = i;
    }
  }

  // Fallback: If no row had >= 2 keywords, use row 0
  if (bestHeaderRowIndex === -1) {
    bestHeaderRowIndex = 0;
  }

  const headerRow = matrix[bestHeaderRowIndex] || [];

  // Prioritize Description column detection across Particulars, Item, Description, Name, Expense Details, Remarks
  let descCol = findDescriptionCol(headerRow);
  let dateCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;
  let catCol = -1;
  let modeCol = -1;
  let typeCol = -1;
  let notesCol = -1;

  headerRow.forEach((cellVal: any, colIdx: number) => {
    const norm = normalizeKey(cellVal);
    if (!norm) return;

    // Date
    if (dateCol === -1 && (norm.includes('date') || norm.includes('timestamp') || norm.includes('time'))) {
      dateCol = colIdx;
      return;
    }

    // Debit / Expense / Withdrawal
    if (debitCol === -1 && (DEBIT_REGEX.test(norm) || norm.includes('debit') || norm.includes('withdrawal'))) {
      debitCol = colIdx;
    }

    // Credit / Income / Deposit
    if (creditCol === -1 && (CREDIT_REGEX.test(norm) || norm.includes('credit') || norm.includes('deposit'))) {
      creditCol = colIdx;
    }

    // Amount column (Amount / Rupees / Price / Cost / Spend / Paid / Total / Value / etc.)
    if (
      amountCol === -1 &&
      (AMOUNT_ALIAS_REGEX.test(norm) || norm.includes('amount') || norm.includes('rupee')) &&
      !DEBIT_REGEX.test(norm) &&
      !CREDIT_REGEX.test(norm)
    ) {
      amountCol = colIdx;
    }

    // Category
    if (catCol === -1 && (norm.includes('category') || norm.includes('tag') || norm.includes('cat'))) {
      catCol = colIdx;
      return;
    }

    // Payment Mode
    if (
      modeCol === -1 &&
      (norm.includes('paymode') || norm.includes('paymentmode') || norm.includes('payment') || norm === 'mode')
    ) {
      modeCol = colIdx;
      return;
    }

    // Type (Cr/Dr or Income/Expense)
    if (typeCol === -1 && (norm.includes('type') || norm === 'crdr' || norm === 'drcr')) {
      typeCol = colIdx;
      return;
    }

    // Notes / Remarks
    if (colIdx !== descCol && notesCol === -1 && (norm.includes('note') || norm.includes('remark') || norm.includes('comment') || norm.includes('memo'))) {
      notesCol = colIdx;
      return;
    }
  });

  // Dual Debit/Credit Support:
  // If separate Debit and Credit columns exist
  const hasSplitDebitCredit = debitCol !== -1 && creditCol !== -1;

  // If no general amount column found, but single debit or credit column exists, use it
  if (!hasSplitDebitCredit && amountCol === -1) {
    if (debitCol !== -1) {
      amountCol = debitCol;
    } else if (creditCol !== -1) {
      amountCol = creditCol;
    } else {
      // Look for any column matching AMOUNT_ALIAS_REGEX
      headerRow.forEach((cellVal: any, colIdx: number) => {
        if (amountCol === -1 && AMOUNT_ALIAS_REGEX.test(normalizeKey(cellVal))) {
          amountCol = colIdx;
        }
      });
    }
  }

  const errors: string[] = [];

  // Check if Amount column could be identified
  if (!hasSplitDebitCredit && amountCol === -1) {
    return {
      addedCount: 0,
      transactions: [],
      errors: ['Could not find Amount column in the uploaded spreadsheet.'],
      summary: {
        totalCount: 0,
        totalIncome: 0,
        totalExpense: 0,
        incomeCount: 0,
        expenseCount: 0,
        dateRange: null,
        categories: [],
      },
    };
  }

  const parsedTransactions: Transaction[] = [];
  const categorySet = new Set<string>();

  // Process subsequent rows as transaction records
  const dataRows = matrix.slice(bestHeaderRowIndex + 1);

  dataRows.forEach((row) => {
    // Skip completely empty rows
    if (!row || !Array.isArray(row) || row.every((c: any) => c == null || String(c).trim() === '')) {
      return;
    }

    // 1. Description / Title extraction
    let rawDesc = descCol !== -1 && row[descCol] != null ? String(row[descCol]).trim() : '';
    if (!rawDesc) {
      // Check other text cells that are not amount, date, or category
      for (let c = 0; c < row.length; c++) {
        if (c !== amountCol && c !== debitCol && c !== creditCol && c !== dateCol && c !== catCol) {
          const val = String(row[c] ?? '').trim();
          if (val && isNaN(Number(val)) && !val.match(/^\d{1,4}[-/.]/)) {
            rawDesc = val;
            break;
          }
        }
      }
    }

    // Strictly ignore summary/footer rows:
    // If the description/item text contains 'Total', 'Grand Total', 'Net Balance', 'Subtotal', or 'Ending Balance', SKIP that row entirely.
    if (isSummaryRow(rawDesc, row)) {
      return; // Skip summary footer row
    }

    // 2. Amount & Type calculation
    let amount = 0;
    let detectedType: TransactionType = 'expense';

    if (hasSplitDebitCredit) {
      // Split Debit/Credit columns: read whichever column has a non-zero value
      const drParsed = parseNumericAmount(row[debitCol]);
      const crParsed = parseNumericAmount(row[creditCol]);

      if (drParsed.amount > 0 && crParsed.amount > 0) {
        if (crParsed.amount > drParsed.amount) {
          amount = crParsed.amount;
          detectedType = 'income';
        } else {
          amount = drParsed.amount;
          detectedType = 'expense';
        }
      } else if (drParsed.amount > 0) {
        // Debit / Expense / Withdrawal -> amount = positive value, type = 'expense'
        amount = drParsed.amount;
        detectedType = 'expense';
      } else if (crParsed.amount > 0) {
        // Credit / Income / Deposit -> amount = positive value, type = 'income'
        amount = crParsed.amount;
        detectedType = 'income';
      } else {
        // Both are 0 or empty -> skip
        return;
      }
    } else {
      // Unified Amount column
      const amtParsed = parseNumericAmount(row[amountCol]);
      amount = amtParsed.amount;
      const isNegative = amtParsed.isNegative;

      if (amount <= 0) {
        return;
      }

      // Check Type column
      if (typeCol !== -1 && row[typeCol] != null) {
        const typeStr = String(row[typeCol]).trim().toLowerCase();
        if (/inc|credit|^cr$|deposit|salary|refund|received|\+/i.test(typeStr)) {
          detectedType = 'income';
        } else if (/exp|debit|^dr$|withdrawal|spent|paid|-/i.test(typeStr)) {
          detectedType = 'expense';
        } else {
          detectedType = isNegative ? 'expense' : 'expense';
        }
      } else if (amtParsed.isCredit) {
        detectedType = 'income';
      } else if (amtParsed.isDebit) {
        detectedType = 'expense';
      } else {
        // Check column header name itself
        const headerNorm = normalizeKey(headerRow[amountCol]);
        if (/^(credit|cr|deposit|deposits|income|incomes|received|inflow)/i.test(headerNorm)) {
          detectedType = 'income';
        } else {
          detectedType = 'expense';
        }
      }
    }

    // 2. Description / Title
    const description = rawDesc || 'Imported Transaction';

    // 3. Category (Fallback: 'Other / Misc')
    const rawCat = catCol !== -1 ? String(row[catCol] ?? '').trim() : '';
    const category = rawCat || 'Other / Misc';
    categorySet.add(category);

    // 4. Date / Timestamp
    const rawDate = dateCol !== -1 ? row[dateCol] : undefined;
    const timestamp = parseDateValue(rawDate);

    // 5. Payment Mode (Fallback: 'UPI')
    const rawMode = modeCol !== -1 ? row[modeCol] : undefined;
    const payment_method = normalizePaymentMode(rawMode);

    // 6. Notes
    const notes = notesCol !== -1 ? String(row[notesCol] ?? '').trim() : '';

    parsedTransactions.push({
      id: `tx-import-${Date.now()}-${generateUUID().slice(0, 8)}`,
      user_id: CURRENT_USER.id,
      type: detectedType,
      category,
      description,
      amount,
      payment_method,
      payment_mode: payment_method,
      notes,
      timestamp,
      created_at: new Date().toISOString(),
    });
  });

  // Calculate Summary metrics
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let minDate = '';
  let maxDate = '';

  parsedTransactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else {
      totalExpense += tx.amount;
      expenseCount++;
    }

    const txDate = tx.timestamp.substring(0, 10);
    if (!minDate || txDate < minDate) minDate = txDate;
    if (!maxDate || txDate > maxDate) maxDate = txDate;
  });

  if (parsedTransactions.length === 0 && errors.length === 0) {
    errors.push('No valid transaction records found in uploaded file.');
  }

  return {
    addedCount: parsedTransactions.length,
    transactions: parsedTransactions,
    errors,
    summary: {
      totalCount: parsedTransactions.length,
      totalIncome,
      totalExpense,
      incomeCount,
      expenseCount,
      dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
      categories: Array.from(categorySet),
    },
  };
}

// Check all sheets in workbook.SheetNames:
// Picks the sheet that has the most non-empty rows or contains transaction keywords ('Date', 'Description', 'Particulars', 'Amount', 'Expense').
// Avoids selecting 1-row summary charts or overview sheets.
export function findBestSheet(workbook: XLSX.WorkBook): { sheetName: string; rows: any[][] } {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { sheetName: '', rows: [] };
  }

  const summarySheetRegex = /^(summary|dashboard|overview|charts?|cover|kpi|reports?|pivot)/i;
  const headerKeywordsRegex = /(date|particulars?|description|item|details?|name|amount|expense|debit|credit|cost|spend|paid|price)/i;

  let bestSheetName = workbook.SheetNames[0];
  let bestRows: any[][] = [];
  let highestScore = -Infinity;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    const nonEmptyRows = rawRows.filter(
      (row) => Array.isArray(row) && row.some((cell) => cell != null && String(cell).trim() !== '')
    );

    if (nonEmptyRows.length === 0) continue;

    // Count keyword matches in the first 15 rows
    let keywordMatches = 0;
    const scanLimit = Math.min(15, nonEmptyRows.length);
    for (let r = 0; r < scanLimit; r++) {
      for (const cell of nonEmptyRows[r]) {
        const str = String(cell ?? '').trim();
        if (headerKeywordsRegex.test(str)) {
          keywordMatches++;
        }
      }
    }

    // Dry run parsing to see how many transactions this sheet produces
    let parsedCount = 0;
    try {
      const outcome = processRawRows(nonEmptyRows);
      parsedCount = outcome.transactions.length;
    } catch {
      parsedCount = 0;
    }

    const isSummaryName = summarySheetRegex.test(sheetName.trim());
    let score = parsedCount * 1000 + keywordMatches * 20 + nonEmptyRows.length;
    if (isSummaryName && parsedCount <= 2) {
      score -= 5000;
    }

    if (score > highestScore) {
      highestScore = score;
      bestSheetName = sheetName;
      bestRows = nonEmptyRows;
    }
  }

  if (bestRows.length > 0) {
    return { sheetName: bestSheetName, rows: bestRows };
  }

  // Fallback to first sheet
  const first = workbook.SheetNames[0];
  const ws = workbook.Sheets[first];
  const rows: any[][] = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
  return { sheetName: first, rows };
}

// Client-side parser supporting CSV (PapaParse) & XLSX/XLS/XLSM (SheetJS)
export async function parseTransactionFile(file: File): Promise<ImportResult> {
  const fileName = file.name.toLowerCase();
  const isCsv = fileName.endsWith('.csv') || file.type.includes('csv');
  const isExcel =
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls') ||
    fileName.endsWith('.xlsm') ||
    file.type.includes('spreadsheet') ||
    file.type.includes('excel') ||
    file.type.includes('macroenabled');

  if (!isCsv && !isExcel) {
    return {
      addedCount: 0,
      transactions: [],
      errors: ['Unsupported file format. Please upload a .csv, .xlsx, .xls, or .xlsm file.'],
      summary: {
        totalCount: 0,
        totalIncome: 0,
        totalExpense: 0,
        incomeCount: 0,
        expenseCount: 0,
        dateRange: null,
        categories: [],
      },
    };
  }

  if (isCsv) {
    return new Promise((resolve, reject) => {
      Papa.parse<any[]>(file, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          try {
            if (results.errors && results.errors.length > 0) {
              const parseErrors = results.errors.slice(0, 3).map((e) => `CSV warning: ${e.message}`);
              const outcome = processRawRows(results.data);
              outcome.errors.unshift(...parseErrors);
              resolve(outcome);
            } else {
              resolve(processRawRows(results.data));
            }
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  // Excel (.xlsx, .xls, .xlsm macro-enabled) parsing
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellText: false,
          cellNF: false,
        });

        const bestSheet = findBestSheet(workbook);
        if (!bestSheet.rows || bestSheet.rows.length === 0) {
          resolve({
            addedCount: 0,
            transactions: [],
            errors: ['No sheet with valid transaction data found in uploaded spreadsheet.'],
            summary: {
              totalCount: 0,
              totalIncome: 0,
              totalExpense: 0,
              incomeCount: 0,
              expenseCount: 0,
              dateRange: null,
              categories: [],
            },
          });
          return;
        }

        resolve(processRawRows(bestSheet.rows));
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
