import * as XLSX from 'xlsx';
import { Transaction } from './types';
import { format12HourDateTime, formatINR } from './utils';

export function exportTransactionsToExcel(
  transactions: Transaction[],
  filename = 'Expance_Transactions.xlsx'
) {
  if (!transactions.length) return;

  // Sort chronological for running balance calculation
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentBalance = 0;
  const data = sorted.map((tx, index) => {
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

export function exportTransactionsToCSV(
  transactions: Transaction[],
  filename = 'Expance_Transactions.csv'
) {
  if (!transactions.length) return;

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let currentBalance = 0;
  const data = sorted.map((tx, index) => {
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

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
