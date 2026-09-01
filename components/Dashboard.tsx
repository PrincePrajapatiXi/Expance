'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2, Info, X, Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Transaction, FilterOptions, TransactionFormData } from '@/lib/types';
import { calculateSummaryStats } from '@/lib/db';
import { exportTransactionsToCSV, exportTransactionsToExcel, exportTransactionsToPDF } from '@/lib/export';
import { useTransactions } from '@/hooks/useTransactions';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import KPICards from '@/components/KPICards';
import FilterBar from '@/components/FilterBar';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import BudgetSummaryCard from '@/components/BudgetSummaryCard';
import BottomNav from '@/components/BottomNav';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    category: 'all',
    dateRange: 'all',
    searchQuery: '',
    selectedMonth: currentMonthStr,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close Export Dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    };
    if (isExportOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isExportOpen]);

  const {
    transactions,
    loading,
    syncing,
    isAuthenticated,
    toast,
    dismissToast,
    showToast,
    addNewTransaction,
    editExistingTransaction,
    removeTransaction,
  } = useTransactions();

  // Filter Transactions based on UI controls & Selected Month
  const filteredTransactions = transactions.filter((tx) => {
    // Month filter
    if (selectedMonth) {
      const txMonth = tx.timestamp.substring(0, 7);
      if (txMonth !== selectedMonth) return false;
    }

    // Type filter
    if (filters.type !== 'all' && tx.type !== filters.type) return false;

    // Category filter
    if (filters.category !== 'all' && tx.category !== filters.category) return false;

    // Payment Mode filter
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      const txMode = tx.payment_method || tx.payment_mode || 'UPI';
      if (txMode !== filters.paymentMethod) return false;
    }

    // Search query filter
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchCat = tx.category?.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q);
      const matchMode = (tx.payment_method || tx.payment_mode)?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchNotes && !matchMode) return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const txDate = new Date(tx.timestamp);
      if (filters.dateRange === 'today') {
        const isToday =
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (filters.dateRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (txDate < oneWeekAgo) return false;
      } else if (filters.dateRange === 'month') {
        const isThisMonth =
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return false;
      } else if (filters.dateRange === 'custom') {
        if (filters.customStartDate) {
          const start = new Date(filters.customStartDate);
          if (txDate < start) return false;
        }
        if (filters.customEndDate) {
          const end = new Date(filters.customEndDate);
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
      }
    }

    return true;
  });

  const stats = calculateSummaryStats(filteredTransactions);

  // Add / Edit submission
  const handleModalSubmit = async (formData: TransactionFormData) => {
    if (editingTx) {
      await editExistingTransaction(editingTx.id, formData);
    } else {
      await addNewTransaction(formData);
    }
    setEditingTx(null);
  };

  // Trigger Delete
  const handleDelete = async (id: string) => {
    await removeTransaction(id);
  };

  // Trigger Edit Modal
  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      dateRange: 'all',
      searchQuery: '',
      selectedMonth: currentMonthStr,
    });
  };

  // Export Handlers
  const handleExportPDF = async () => {
    setIsExportOpen(false);
    if (filteredTransactions.length === 0) {
      showToast('No transactions to export for this month.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      await exportTransactionsToPDF(filteredTransactions, selectedMonth);
      showToast(`Exported ${filteredTransactions.length} transactions as PDF statement.`, 'success');
    } catch {
      showToast('Failed to export PDF. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (filteredTransactions.length === 0) {
      showToast('No transactions to export for this month.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      exportTransactionsToCSV(filteredTransactions, selectedMonth);
      showToast(`Exported ${filteredTransactions.length} transactions as CSV.`, 'success');
    } catch {
      showToast('Failed to export CSV. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportOpen(false);
    if (filteredTransactions.length === 0) {
      showToast('No transactions to export for this month.', 'warning');
      return;
    }
    setIsExporting(true);
    try {
      await exportTransactionsToExcel(filteredTransactions, selectedMonth);
      showToast(`Exported ${filteredTransactions.length} transactions as Excel.`, 'success');
    } catch {
      showToast('Failed to export Excel. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Top Header Bar */}
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="max-w-4xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-2">
        {/* Sync Status Badge & Quick Info Bar */}
        <div className="flex items-center justify-between py-1 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs transition-all ${
                syncing
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 animate-pulse'
                  : isAuthenticated
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing with Supabase...</span>
                </>
              ) : isAuthenticated ? (
                <>
                  <Cloud className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Cloud Synced (Supabase)</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3 h-3 text-slate-500" />
                  <span>Local Storage / Guest Mode</span>
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <p className="text-[11px] font-semibold text-slate-400">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
            </p>

            {/* Export Data Dropdown Button */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setIsExportOpen((prev) => !prev)}
                disabled={isExporting}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border shadow-2xs transition-all cursor-pointer active:scale-95 ${
                  filteredTransactions.length === 0
                    ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/60 dark:to-blue-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-950/80 dark:hover:to-blue-950/60 hover:shadow-md hover:shadow-indigo-500/10'
                }`}
                aria-label="Export transactions"
                aria-expanded={isExportOpen}
              >
                {isExporting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Export</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Export Format Dropdown */}
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Download Format</p>
                  </div>
                  <div className="py-1 px-1">
                    <button
                      type="button"
                      onClick={handleExportPDF}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-rose-950 dark:text-rose-200">PDF Statement</p>
                        <p className="text-[10px] text-slate-400 font-medium">Styled colorful PDF</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-emerald-950 dark:text-emerald-200">Excel (.xlsx)</p>
                        <p className="text-[10px] text-slate-400 font-medium">Styled workbook with stats</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-bold">CSV File</p>
                        <p className="text-[10px] text-slate-400 font-medium">Compatible with all apps</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <DesktopNav onQuickAdd={() => { setEditingTx(null); setIsModalOpen(true); }} />

        {/* Summary KPI Cards */}
        <KPICards stats={stats} />

        {/* Monthly Budget vs Spent Summary */}
        <BudgetSummaryCard transactions={filteredTransactions} />

        {/* Filter and Search Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onResetFilters={handleResetFilters}
        />

        {/* Transaction Feed */}
        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-400">
            Loading transactions...
          </div>
        ) : (
          <TransactionList
            transactions={filteredTransactions}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        )}
      </main>

      {/* Floating Toast Notification (bottom-right, non-intrusive) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-24 z-50 max-w-sm pointer-events-auto"
          >
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-2xl border backdrop-blur-md ${
                toast.type === 'error'
                  ? 'bg-rose-950/95 text-rose-100 border-rose-800'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/95 text-amber-100 border-amber-800'
                  : toast.type === 'success'
                  ? 'bg-emerald-950/95 text-emerald-100 border-emerald-800'
                  : 'bg-slate-900/95 text-slate-100 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={dismissToast}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer ml-3 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) anchored bottom-right */}
      <button
        onClick={() => {
          setEditingTx(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-20 sm:bottom-8 right-5 z-40 w-14 h-14 rounded-full bg-indigo-900 hover:bg-indigo-950 text-white shadow-xl shadow-indigo-900/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-white dark:ring-slate-900"
        title="Add Transaction"
        aria-label="Add Transaction"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Transaction Add / Edit Bottom Sheet Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleModalSubmit}
        editingTransaction={editingTx}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
