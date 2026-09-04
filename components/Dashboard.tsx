'use client';

import React, { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Transaction, FilterOptions, TransactionFormData } from '@/lib/types';
import { calculateSummaryStats } from '@/lib/db';
import { triggerHaptic } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import KPICards from '@/components/KPICards';
import FilterBar from '@/components/FilterBar';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import BudgetSummaryCard from '@/components/BudgetSummaryCard';
import BottomNav from '@/components/BottomNav';
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

  const {
    transactions,
    loading,
    toast,
    dismissToast,
    addNewTransaction,
    editExistingTransaction,
    removeTransaction,
    refetch,
  } = useTransactions();

  // Auto-switch date filter to "All Time" when imported transactions contain dates outside current month.
  // Also re-fetches data immediately when the import event fires or when the user navigates back to this page.
  React.useEffect(() => {
    const handleTxUpdate = (event: any) => {
      const detail = event?.detail;
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const listToCheck = Array.isArray(detail?.transactions)
        ? detail.transactions
        : Array.isArray(detail)
        ? detail
        : [];

      const hasOutOfMonth =
        detail?.resetToAllTime ||
        detail?.hasOutOfMonthDates ||
        listToCheck.some((tx: any) => {
          const m = (tx.timestamp || '').substring(0, 7);
          return m && m !== currentMonth;
        });

      if (hasOutOfMonth) {
        setSelectedMonth('');
        setFilters((prev) => ({ ...prev, dateRange: 'all', selectedMonth: '' }));
      }

      // Re-fetch so Dashboard always shows latest data after import
      refetch();
    };

    const handleResetDateFilter = () => {
      setSelectedMonth('');
      setFilters((prev) => ({ ...prev, dateRange: 'all', selectedMonth: '' }));
    };

    // Re-fetch when user switches back to this tab/page after importing on profile page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    window.addEventListener('expance:transactions_updated', handleTxUpdate);
    window.addEventListener('expance:reset_date_filter', handleResetDateFilter);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('expance:transactions_updated', handleTxUpdate);
      window.removeEventListener('expance:reset_date_filter', handleResetDateFilter);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

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

  return (
    <div className="w-full min-h-screen overflow-x-hidden overflow-y-auto pb-28 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header Bar */}
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="relative z-10 max-w-4xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-2">
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
          triggerHaptic(20);
          setEditingTx(null);
          setIsModalOpen(true);
        }}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-8 right-5 z-40 w-14 h-14 rounded-full bg-indigo-900 hover:bg-indigo-950 text-white shadow-xl shadow-indigo-900/35 flex items-center justify-center transition-transform duration-100 ease-out hover:scale-105 active:scale-90 cursor-pointer ring-4 ring-white dark:ring-slate-900 select-none"
        title="Add Transaction"
        aria-label="Add Transaction"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Transaction Add / Edit Bottom Sheet Modal */}
      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTx(null);
          }}
          onSubmit={handleModalSubmit}
          editingTransaction={editingTx}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
