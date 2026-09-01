import * as XLSX from 'xlsx';
import { Transaction } from './types';
import { format12HourDateTime } from './utils';

/**
 * Generate a dynamic filename based on the selected month.
 * Format: Expance_Report_September_2026.csv (or .xlsx)
 */
export function getExportFilename(
  selectedMonth: string,
  extension: 'csv' | 'xlsx' = 'csv'
): string {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  let monthLabel = '';
  if (selectedMonth) {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      monthLabel = `${MONTH_NAMES[monthIndex]}_${yearStr}`;
    }
  }

  if (!monthLabel) {
    const now = new Date();
    monthLabel = `${MONTH_NAMES[now.getMonth()]}_${now.getFullYear()}`;
  }

  return `Expance_Report_${monthLabel}.${extension}`;
}

/**
 * Build the common row data used by both CSV and Excel export.
 */
function buildExportData(transactions: Transaction[]) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentBalance = 0;
  return sorted.map((tx, index) => {
    if (tx.type === 'income') {
      currentBalance += tx.amount;
    } else {
      currentBalance -= tx.amount;
    }

    return {
      'No': index + 1,
      'Type': tx.type.toUpperCase(),
      'Category': tx.category,
      'Description': tx.description,
      'Payment Mode': tx.payment_method || 'UPI',
      'Date & Time': format12HourDateTime(tx.timestamp),
      'Amount (₹)': tx.amount,
      'Running Balance (₹)': currentBalance,
      'Notes': tx.notes || '',
    };
  });
}

/**
 * Export transactions to an Excel (.xlsx) file.
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  selectedMonth = ''
) {
  if (!transactions.length) return;

  const filename = getExportFilename(selectedMonth, 'xlsx');
  const data = buildExportData(transactions);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction Ledger');

  // Adjust column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 20 },
    { wch: 32 },
    { wch: 16 },
    { wch: 24 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
  ];

  XLSX.writeFile(workbook, filename);
}

/**
 * Export transactions to a CSV file with UTF-8 BOM for proper
 * encoding of currency symbols (₹) in Microsoft Excel & Google Sheets.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  selectedMonth = ''
) {
  if (!transactions.length) return;

  const filename = getExportFilename(selectedMonth, 'csv');
  const data = buildExportData(transactions);

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  // Prepend UTF-8 BOM (\uFEFF) so Excel correctly interprets Unicode characters like ₹
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
