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
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Check if a header matches any candidate pattern
function matchesPattern(key: string, patterns: string[]): boolean {
  const norm = normalizeKey(key);
  return patterns.some((p) => norm === p || norm.includes(p));
}

// Robust date parser for strings, numbers (Excel serial), and Date objects
function parseDateValue(val: any): string {
  if (!val) return new Date().toISOString();

  // If already a Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }

  // If Excel numerical serial date (e.g. 45200 ~ 2023)
  if (typeof val === 'number') {
    if (val > 20000 && val < 70000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + val * 86400000);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const str = String(val).trim();
  if (!str) return new Date().toISOString();

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dmyMatch) {
    const [, d, m, y, h = '0', min = '0', s = '0'] = dmyMatch;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);

    // If day > 12, it's definitely DD/MM/YYYY
    // If month > 12 and day <= 12, swap (MM/DD/YYYY)
    if (day <= 12 && month > 12) {
      const parsed = new Date(year, day - 1, month, parseInt(h, 10), parseInt(min, 10), parseInt(s, 10));
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    } else {
      const parsed = new Date(year, month - 1, day, parseInt(h, 10), parseInt(min, 10), parseInt(s, 10));
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }
  }

  // Standard Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

// Clean and extract numeric amount
function parseNumericAmount(val: any): { amount: number; isNegative: boolean } {
  if (typeof val === 'number') {
    return {
      amount: Math.abs(val),
      isNegative: val < 0,
    };
  }

  if (!val) return { amount: 0, isNegative: false };

  const str = String(val).trim();
  // Check negative formatted like -100 or (100) or 100-
  const isNegative = str.startsWith('-') || str.endsWith('-') || (str.startsWith('(') && str.endsWith(')'));
  // Remove currency signs (₹, $, €, £, Rs., etc.) and commas
  const cleaned = str.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);

  return {
    amount: isNaN(parsed) ? 0 : Math.abs(parsed),
    isNegative,
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

// Process raw object rows (from either PapaParse or XLSX) into standardized Transactions
export function processRawRows(rawRows: Record<string, any>[]): ImportResult {
  if (!rawRows.length) {
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

  // Find header keys using smart auto-detection
  const firstRowKeys = Object.keys(rawRows[0] || {});

  const findKey = (patterns: string[]): string | undefined => {
    return firstRowKeys.find((k) => matchesPattern(k, patterns));
  };

  // Auto-detect column headers based on user specs:
  // Amount: amount, rupees, price, cost, inr, amt, total
  const amountKey = findKey(['amount', 'rupees', 'price', 'cost', 'inr', 'amt', 'total']);
  const debitKey = findKey(['debit', 'dr', 'withdrawal', 'spent', 'expenseamount']);
  const creditKey = findKey(['credit', 'cr', 'deposit', 'received', 'incomeamount']);

  // Type: type, mode, cr/dr
  const typeKey = findKey(['type', 'txntype', 'transactiontype', 'crdr', 'drcr']);

  // Description / Title: description, title, name, item, note, particulars, details, narration
  const descKey = findKey(['description', 'title', 'name', 'item', 'note', 'details', 'particulars', 'narration', 'desc']);

  // Category: category, tag, tags
  const catKey = findKey(['category', 'tag', 'tags', 'cat']);

  // Date: date, time, created_at, timestamp, txn date
  const dateKey = findKey(['date', 'time', 'createdat', 'timestamp', 'datetime', 'txndate']);

  // Payment Mode: payment mode, mode, payment, payment method
  const modeKey = findKey(['paymentmode', 'paymentmethod', 'payment', 'paymode']) || (typeKey !== 'mode' ? findKey(['mode']) : undefined);

  // Notes: notes, remarks, comment, memo
  const notesKey = findKey(['notes', 'remarks', 'comment', 'memo']);

  const parsedTransactions: Transaction[] = [];
  const errors: string[] = [];
  const categorySet = new Set<string>();

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // Account for header row in spreadsheets

    // 1. Amount & Type calculation
    let amount = 0;
    let isNegative = false;
    let detectedType: TransactionType = 'expense';

    // Case A: Separate Credit and Debit columns (Bank statement format)
    if (creditKey && debitKey) {
      const cr = parseNumericAmount(row[creditKey]);
      const dr = parseNumericAmount(row[debitKey]);

      if (cr.amount > 0) {
        amount = cr.amount;
        detectedType = 'income';
      } else if (dr.amount > 0) {
        amount = dr.amount;
        detectedType = 'expense';
      } else {
        errors.push(`Row ${rowNum}: Both Credit and Debit are zero or invalid. Skipped.`);
        return;
      }
    } else if (amountKey) {
      // Case B: Unified Amount column
      const amtParsed = parseNumericAmount(row[amountKey]);
      amount = amtParsed.amount;
      isNegative = amtParsed.isNegative;

      if (amount <= 0) {
        errors.push(`Row ${rowNum}: Amount is 0 or invalid. Skipped.`);
        return;
      }

      // Check Type column
      if (typeKey && row[typeKey]) {
        const typeStr = String(row[typeKey]).trim().toLowerCase();
        if (/inc|credit|^cr$|deposit|salary|refund|received|\+/i.test(typeStr)) {
          detectedType = 'income';
        } else if (/exp|debit|^dr$|withdrawal|spent|paid|-/i.test(typeStr)) {
          detectedType = 'expense';
        } else {
          detectedType = isNegative ? 'expense' : 'expense';
        }
      } else {
        // Fallback: If amount was explicitly negative (e.g. -500), it's an expense.
        detectedType = isNegative ? 'expense' : 'expense';
      }
    } else {
      errors.push(`Row ${rowNum}: Could not find Amount column.`);
      return;
    }

    // 2. Description / Title
    const rawDesc = descKey ? String(row[descKey] || '').trim() : '';
    const description = rawDesc || 'Imported Transaction';

    // 3. Category (Fallback: 'Other / Misc')
    const rawCat = catKey ? String(row[catKey] || '').trim() : '';
    const category = rawCat || 'Other / Misc';
    categorySet.add(category);

    // 4. Date / Timestamp
    const rawDate = dateKey ? row[dateKey] : undefined;
    const timestamp = parseDateValue(rawDate);

    // 5. Payment Mode (Fallback: 'UPI' or 'Cash')
    const rawMode = modeKey ? row[modeKey] : undefined;
    const payment_method = normalizePaymentMode(rawMode);

    // 6. Notes
    const notes = notesKey ? String(row[notesKey] || '').trim() : '';

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
      Papa.parse<Record<string, any>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: true,
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
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({
            addedCount: 0,
            transactions: [],
            errors: ['No sheet found in uploaded spreadsheet.'],
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

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        resolve(processRawRows(rawJson));
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
