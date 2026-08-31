'use client';

import React, { useState } from 'react';
import { Plus, Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Transaction, FilterOptions, TransactionFormData } from '@/lib/types';
import { calculateSummaryStats } from '@/lib/db';
import { useTransactions } from '@/hooks/useTransactions';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import KPICards from '@/components/KPICards';
import FilterBar from '@/components/FilterBar';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import BottomNav from '@/components/BottomNav';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function Dashboard() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const {
    transactions,
    loading,
    syncing,
    isAuthenticated,
    toast,
    dismissToast,
    addNewTransaction,
    editExistingTransaction,
    removeTransaction,
  } = useTransactions();

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    category: 'all',
    dateRange: 'all',
    searchQuery: '',
    selectedMonth: currentMonthStr,
  });

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.timestamp);

    // Month filter check
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      if (
        txDate.getFullYear() !== parseInt(year) ||
        txDate.getMonth() + 1 !== parseInt(month)
      ) {
        return false;
      }
    }

    // Type filter
    if (filters.type !== 'all' && tx.type !== filters.type) {
      return false;
    }

    // Category filter
    if (filters.category !== 'all' && tx.category !== filters.category) {
      return false;
    }

    // Payment Mode filter
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      const mode = tx.payment_method || tx.payment_mode;
      if (mode !== filters.paymentMethod) return false;
    }

    // Search query
    if (filters.searchQuery) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      {/* PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Top Header Bar */}
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      <main className="max-w-4xl mx-auto px-4 pt-2">
        {/* Floating Toast Notification Banner */}
        {toast && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md border ${
                toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900'
                  : toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-600 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={dismissToast}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 cursor-pointer ml-3 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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

          <p className="text-[11px] font-semibold text-slate-400">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Desktop Navigation Tabs */}
        <DesktopNav onQuickAdd={() => { setEditingTx(null); setIsModalOpen(true); }} />

        {/* Summary KPI Cards */}
        <KPICards stats={stats} />

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
