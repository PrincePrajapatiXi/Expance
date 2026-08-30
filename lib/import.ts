import * as XLSX from 'xlsx';
import { Transaction, TransactionFormData, TransactionType, PaymentMethod } from './types';
import { CURRENT_USER } from './db';

export interface ImportResult {
  addedCount: number;
  transactions: Transaction[];
  errors: string[];
}

export async function parseTransactionFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve({ addedCount: 0, transactions: [], errors: ['No sheet found in uploaded file.'] });
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson.length) {
          resolve({ addedCount: 0, transactions: [], errors: ['Uploaded file is empty.'] });
          return;
        }

        const parsedTransactions: Transaction[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, index) => {
          const rowNum = index + 2; // account for header line

          // Find fields with flexible column naming
          const typeVal = String(row['Type'] || row['type'] || row['TYPE'] || 'expense').trim().toLowerCase();
          const type: TransactionType = typeVal.includes('inc') ? 'income' : 'expense';

          const category = String(
            row['Category'] || row['category'] || row['CATEGORY'] || 'Other / Misc'
          ).trim() || 'Other / Misc';

          const description = String(
            row['Description'] || row['description'] || row['Title'] || row['title'] || 'Imported Transaction'
          ).trim() || 'Imported Transaction';

          // Extract Amount
          let rawAmount = row['Amount (₹)'] ?? row['Amount'] ?? row['amount'] ?? row['AMOUNT'] ?? 0;
          if (typeof rawAmount === 'string') {
            rawAmount = rawAmount.replace(/[^0-9.-]+/g, '');
          }
          const amount = Math.abs(parseFloat(rawAmount));

          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowNum}: Invalid or zero amount, skipping.`);
            return;
          }

          // Extract Date / Timestamp
          const rawDate = row['Date & Time'] || row['Date'] || row['date'] || row['Timestamp'] || row['timestamp'];
          let timestamp = new Date().toISOString();
          if (rawDate) {
            const parsedDate = new Date(rawDate);
            if (!isNaN(parsedDate.getTime())) {
              timestamp = parsedDate.toISOString();
            }
          }

          // Extract Payment Mode & Notes
          const paymentModeVal = String(
            row['Payment Mode'] || row['Mode'] || row['Payment'] || 'UPI'
          ).trim();
          let payment_method: PaymentMethod = 'UPI';
          if (/cash/i.test(paymentModeVal)) payment_method = 'Cash';
          else if (/card/i.test(paymentModeVal)) payment_method = 'Card';
          else if (/bank|net/i.test(paymentModeVal)) payment_method = 'Net Banking';

          const notes = String(row['Notes'] || row['notes'] || row['Remarks'] || '').trim();

          parsedTransactions.push({
            id: `tx-import-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            user_id: CURRENT_USER.id,
            type,
            category,
            description,
            amount,
            payment_method,
            notes,
            timestamp,
            created_at: new Date().toISOString(),
          });
        });

        resolve({
          addedCount: parsedTransactions.length,
          transactions: parsedTransactions,
          errors,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
