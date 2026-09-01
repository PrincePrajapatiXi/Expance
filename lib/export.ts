import { Transaction, UserProfile } from './types';
import { format12HourDateTime } from './utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Generate a dynamic filename based on the selected month and format.
 * Format: Expance_Report_September_2026.pdf (or .xlsx / .csv)
 */
export function getExportFilename(
  selectedMonth: string,
  extension: 'pdf' | 'xlsx' | 'csv' = 'pdf'
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
 * Helper to format selected month string into human readable title.
 */
function getPeriodLabel(selectedMonth: string): string {
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  if (selectedMonth) {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${yearStr}`;
    }
  }
  return 'All Time (Complete History)';
}

/**
 * Formats a number cleanly with Indian numbering grouping (e.g. ₹1,25,000.00).
 */
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Plain number formatted with commas (e.g. 1,25,000.00).
 */
function formatNumberINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

// -----------------------------------------------------------------------------
// 1. HIGH-DESIGN PDF STATEMENT GENERATOR (jspdf + jspdf-autotable)
// -----------------------------------------------------------------------------

interface KpiBoxOptions {
  title: string;
  amount: string;
  subtitle: string;
  bgColor: [number, number, number];
  borderColor: [number, number, number];
  textColor: [number, number, number];
  titleColor: [number, number, number];
}

function drawKpiBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  options: KpiBoxOptions
) {
  // Rounded Card background
  doc.setFillColor(...options.bgColor);
  doc.setDrawColor(...options.borderColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...options.titleColor);
  doc.text(options.title, x + 3.5, y + 5.5);

  // Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...options.textColor);
  doc.text(options.amount, x + 3.5, y + 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(options.subtitle, x + 3.5, y + 17);
}

/**
 * Export high-design PDF financial statement with branded header,
 * KPI summary tiles, structured table with badges, and page-numbered footer.
 */
export async function exportTransactionsToPDF(
  transactions: Transaction[],
  selectedMonth = '',
  userProfile?: UserProfile
) {
  if (!transactions.length) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. BRANDED HEADER BANNER
  // Navy background [15, 23, 42] (#0F172A)
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Indigo Accent stripe [79, 70, 229] (#4F46E5)
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Left Brand Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Expance', margin, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(199, 210, 254);
  doc.text('Personal Expense & Income Statement', margin, 22);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Report Period: ${getPeriodLabel(selectedMonth)}`, margin, 29);

  // Right Header Meta
  const userName = userProfile?.full_name || 'Personal Account';
  const userEmail = userProfile?.email || '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(241, 245, 249);
  doc.text(userName, pageWidth - margin, 14, { align: 'right' });

  if (userEmail) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(userEmail, pageWidth - margin, 20, { align: 'right' });
  }

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Exported: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    pageWidth - margin,
    27,
    { align: 'right' }
  );

  // 2. KPI SUMMARY METRIC BOXES
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += Number(tx.amount) || 0;
      incomeCount++;
    } else {
      totalExpense += Number(tx.amount) || 0;
      expenseCount++;
    }
  });

  const netBalance = totalIncome - totalExpense;
  const cardY = 43;
  const cardHeight = 20;
  const totalGap = 4 * 2;
  const cardWidth = (pageWidth - margin * 2 - totalGap) / 3;

  // Box 1: Total Income
  drawKpiBox(doc, margin, cardY, cardWidth, cardHeight, {
    title: 'TOTAL INCOME',
    amount: `INR ${formatNumberINR(totalIncome)}`,
    subtitle: `${incomeCount} credit entries`,
    bgColor: [220, 252, 231],
    borderColor: [134, 239, 172],
    textColor: [22, 101, 52],
    titleColor: [21, 128, 61],
  });

  // Box 2: Total Expense
  drawKpiBox(doc, margin + cardWidth + 4, cardY, cardWidth, cardHeight, {
    title: 'TOTAL EXPENSE',
    amount: `INR ${formatNumberINR(totalExpense)}`,
    subtitle: `${expenseCount} debit entries`,
    bgColor: [254, 226, 226],
    borderColor: [252, 165, 165],
    textColor: [153, 27, 27],
    titleColor: [185, 28, 28],
  });

  // Box 3: Net Cashflow Balance
  drawKpiBox(doc, margin + (cardWidth + 4) * 2, cardY, cardWidth, cardHeight, {
    title: 'NET BALANCE',
    amount: `${netBalance >= 0 ? '+' : '-'}INR ${formatNumberINR(Math.abs(netBalance))}`,
    subtitle: netBalance >= 0 ? 'Net Surplus' : 'Net Deficit',
    bgColor: netBalance >= 0 ? [224, 231, 255] : [255, 237, 213],
    borderColor: netBalance >= 0 ? [165, 180, 252] : [253, 186, 116],
    textColor: netBalance >= 0 ? [30, 58, 138] : [154, 52, 18],
    titleColor: netBalance >= 0 ? [55, 48, 163] : [194, 65, 12],
  });

  // 3. TABLE DATA PREPARATION
  // Calculate running balances in chronological order
  const sortedAsc = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let runningBalance = 0;
  const balanceMap = new Map<string, number>();
  sortedAsc.forEach((tx) => {
    if (tx.type === 'income') runningBalance += Number(tx.amount) || 0;
    else runningBalance -= Number(tx.amount) || 0;
    balanceMap.set(tx.id, runningBalance);
  });

  // Display sorted descending (newest first)
  const sortedDesc = [...transactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const tableRows = sortedDesc.map((tx, index) => {
    const isInc = tx.type === 'income';
    const bal = balanceMap.get(tx.id) ?? 0;
    const formattedDate = format12HourDateTime(tx.timestamp);

    return [
      String(index + 1),
      formattedDate,
      tx.description || '-',
      tx.category,
      tx.payment_method || tx.payment_mode || 'UPI',
      isInc ? 'INCOME' : 'EXPENSE',
      (isInc ? '+ ' : '- ') + formatNumberINR(tx.amount),
      formatNumberINR(bal),
    ];
  });

  // 4. AUTO TABLE WITH HIGH-DESIGN STYLING
  autoTable(doc, {
    startY: cardY + cardHeight + 6,
    head: [['#', 'Date & Time', 'Description', 'Category', 'Mode', 'Type', 'Amount (INR)', 'Balance (INR)']],
    body: tableRows,
    margin: { left: margin, right: margin, bottom: 18 },
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { cellWidth: 28 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 27 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 24 },
    },
    didParseCell: (data) => {
      // Highlight Type Column badge colors
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'INCOME') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [153, 27, 27];
          data.cell.styles.fontStyle = 'bold';
        }
      }
      // Highlight Amount text color
      if (data.section === 'body' && data.column.index === 6) {
        const strVal = String(data.cell.raw || '');
        if (strVal.startsWith('+')) {
          data.cell.styles.textColor = [22, 101, 52];
        } else {
          data.cell.styles.textColor = [153, 27, 27];
        }
      }
    },
    didDrawPage: (data) => {
      // 5. FOOTER WITH PAGE NUMBERS
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      // Left footer
      doc.text(
        `Generated via Expance Tracker • Verified Statement`,
        margin,
        pageHeight - 7
      );

      // Right footer
      doc.text(
        `Page ${currentPage} of ${totalPages}`,
        pageWidth - margin,
        pageHeight - 7,
        { align: 'right' }
      );
    },
  });

  const filename = getExportFilename(selectedMonth, 'pdf');
  doc.save(filename);
}

// -----------------------------------------------------------------------------
// 2. RICHLY STYLED EXCEL (.xlsx) EXPORT (Using exceljs + file-saver)
// -----------------------------------------------------------------------------

/**
 * Export richly formatted Excel spreadsheet using ExcelJS.
 * Includes: Title banner, KPI visual summary boxes, formatted headers,
 * auto column widths, currency formats, zebra rows, and double-underline totals.
 */
export async function exportTransactionsToExcel(
  transactions: Transaction[],
  selectedMonth = '',
  userProfile?: UserProfile
) {
  if (!transactions.length) return;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Expance Expense Tracker';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Transaction Ledger', {
    views: [{ showGridLines: true }],
  });

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((t) => {
    if (t.type === 'income') totalIncome += Number(t.amount) || 0;
    else totalExpense += Number(t.amount) || 0;
  });
  const netBalance = totalIncome - totalExpense;

  // 1. TITLE BANNER (Rows 1 & 2 merged A1:I2)
  worksheet.mergeCells('A1:I2');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'EXPANCE FINANCIAL REPORT & TRANSACTION LEDGER';
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Dark Navy #1E293B
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. SUBTITLE / METADATA ROW (Row 3 merged A3:I3)
  worksheet.mergeCells('A3:I3');
  const metaCell = worksheet.getCell('A3');
  const userName = userProfile?.full_name || 'Personal Account';
  const userEmail = userProfile?.email ? ` (${userProfile.email})` : '';
  metaCell.value = `Period: ${getPeriodLabel(selectedMonth)}   |   User: ${userName}${userEmail}   |   Exported: ${new Date().toLocaleString('en-IN')}`;
  metaCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  metaCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  metaCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Empty Spacer Row 4
  worksheet.getRow(4).height = 8;

  // 3. KPI SUMMARY STATS CARDS (Rows 5 & 6)
  // Income Metric Box (B5:C6)
  worksheet.mergeCells('B5:C5');
  const incTitle = worksheet.getCell('B5');
  incTitle.value = 'TOTAL INCOME';
  incTitle.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
  incTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  incTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B6:C6');
  const incVal = worksheet.getCell('B6');
  incVal.value = totalIncome;
  incVal.numFmt = '₹#,##0.00';
  incVal.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF166534' } };
  incVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  incVal.alignment = { horizontal: 'center', vertical: 'middle' };

  // Expense Metric Box (E5:F6)
  worksheet.mergeCells('E5:F5');
  const expTitle = worksheet.getCell('E5');
  expTitle.value = 'TOTAL EXPENSE';
  expTitle.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
  expTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  expTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('E6:F6');
  const expVal = worksheet.getCell('E6');
  expVal.value = totalExpense;
  expVal.numFmt = '₹#,##0.00';
  expVal.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF991B1B' } };
  expVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  expVal.alignment = { horizontal: 'center', vertical: 'middle' };

  // Net Balance Metric Box (H5:I6)
  worksheet.mergeCells('H5:I5');
  const netTitle = worksheet.getCell('H5');
  netTitle.value = 'NET CASHFLOW';
  netTitle.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E3A8A' } };
  netTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  netTitle.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('H6:I6');
  const netVal = worksheet.getCell('H6');
  netVal.value = netBalance;
  netVal.numFmt = '₹#,##0.00';
  netVal.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
  netVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  netVal.alignment = { horizontal: 'center', vertical: 'middle' };

  // Empty Spacer Row 7
  worksheet.getRow(7).height = 10;

  // 4. DATA TABLE HEADERS (Row 8)
  const headers = [
    'S.No',
    'Date & Time',
    'Description',
    'Category',
    'Payment Mode',
    'Type',
    'Amount (₹)',
    'Running Balance (₹)',
    'Notes / Remarks',
  ];

  const headerRow = worksheet.getRow(8);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate Navy #0F172A
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF64748B' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // Calculate Running Balance
  const sortedAsc = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let rBal = 0;
  const balMap = new Map<string, number>();
  sortedAsc.forEach((tx) => {
    if (tx.type === 'income') rBal += Number(tx.amount) || 0;
    else rBal -= Number(tx.amount) || 0;
    balMap.set(tx.id, rBal);
  });

  // 5. INSERT DATA ROWS (Starting Row 9)
  let currentRowIndex = 9;
  sortedAsc.forEach((tx, idx) => {
    const isInc = tx.type === 'income';
    const bal = balMap.get(tx.id) ?? 0;
    const row = worksheet.getRow(currentRowIndex);

    row.values = [
      idx + 1,
      format12HourDateTime(tx.timestamp),
      tx.description || '-',
      tx.category,
      tx.payment_method || tx.payment_mode || 'UPI',
      isInc ? 'INCOME' : 'EXPENSE',
      Number(tx.amount),
      bal,
      tx.notes || '',
    ];

    row.height = 20;

    const isEven = idx % 2 === 1;
    const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBg },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { vertical: 'middle' };

      // Column specific styling
      if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (colNumber === 2) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      if (colNumber === 5) cell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Type Column
      if (colNumber === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = {
          name: 'Calibri',
          size: 9.5,
          bold: true,
          color: { argb: isInc ? 'FF166534' : 'FF991B1B' },
        };
      }

      // Amount Column (Col 7)
      if (colNumber === 7) {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = {
          name: 'Calibri',
          size: 9.5,
          bold: true,
          color: { argb: isInc ? 'FF166534' : 'FF991B1B' },
        };
      }

      // Balance Column (Col 8)
      if (colNumber === 8) {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };
      }
    });

    currentRowIndex++;
  });

  // 6. TOTAL SUMMARY ROW AT BOTTOM
  const totalRow = worksheet.getRow(currentRowIndex);
  worksheet.mergeCells(`A${currentRowIndex}:F${currentRowIndex}`);

  const totalLabel = worksheet.getCell(`A${currentRowIndex}`);
  totalLabel.value = 'TOTAL RECORDED TRANSACTIONS';
  totalLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.height = 22;

  // Formula / Sum for Amount Column (Col 7)
  const totalAmountCell = worksheet.getCell(`G${currentRowIndex}`);
  totalAmountCell.value = { formula: `SUM(G9:G${currentRowIndex - 1})`, result: totalExpense + totalIncome };
  totalAmountCell.numFmt = '₹#,##0.00';
  totalAmountCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
  totalAmountCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Final Balance in Col 8
  const finalBalCell = worksheet.getCell(`H${currentRowIndex}`);
  finalBalCell.value = netBalance;
  finalBalCell.numFmt = '₹#,##0.00';
  finalBalCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
  finalBalCell.alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  // 7. AUTO-ADJUST COLUMN WIDTHS
  const colWidths = [8, 22, 32, 22, 16, 14, 18, 20, 24];
  worksheet.columns.forEach((col, index) => {
    col.width = colWidths[index] || 15;
  });

  // 8. GENERATE BLOB & SAVE VIA FILE-SAVER
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = getExportFilename(selectedMonth, 'xlsx');
  saveAs(blob, filename);
}

// -----------------------------------------------------------------------------
// 3. RAW CSV EXPORT WITH UTF-8 BOM
// -----------------------------------------------------------------------------

/**
 * Export transactions to a clean CSV file with UTF-8 BOM for universal compatibility.
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  selectedMonth = ''
) {
  if (!transactions.length) return;

  const sortedAsc = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let runningBalance = 0;
  const rows = sortedAsc.map((tx, index) => {
    if (tx.type === 'income') runningBalance += Number(tx.amount) || 0;
    else runningBalance -= Number(tx.amount) || 0;

    return [
      index + 1,
      `"${format12HourDateTime(tx.timestamp)}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${tx.category}"`,
      `"${tx.payment_method || tx.payment_mode || 'UPI'}"`,
      tx.type.toUpperCase(),
      Number(tx.amount).toFixed(2),
      runningBalance.toFixed(2),
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ];
  });

  const header = [
    'S.No',
    'Date & Time',
    'Description',
    'Category',
    'Payment Mode',
    'Type',
    'Amount (INR)',
    'Running Balance (INR)',
    'Notes',
  ];

  const csvContent = [
    header.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) for Excel & Google Sheets character encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = getExportFilename(selectedMonth, 'csv');
  saveAs(blob, filename);
}
