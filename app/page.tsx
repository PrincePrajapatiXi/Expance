'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Transaction, FilterOptions, TransactionFormData } from '@/lib/types';
import {
  fetchTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  calculateSummaryStats,
} from '@/lib/db';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import KPICards from '@/components/KPICards';
import FilterBar from '@/components/FilterBar';
import TransactionList from '@/components/TransactionList';
import TransactionModal from '@/components/TransactionModal';
import BottomNav from '@/components/BottomNav';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export default function HomePage() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Load transactions
  const loadData = async () => {
    setLoading(true);
    const data = await fetchTransactions();
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
      if (tx.payment_method !== filters.paymentMethod) return false;
    }

    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(q);
      const matchCat = tx.category?.toLowerCase().includes(q);
      const matchNotes = tx.notes?.toLowerCase().includes(q);
      const matchMode = tx.payment_method?.toLowerCase().includes(q);
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
      const updated = await updateTransaction(editingTx.id, formData);
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingTx.id ? updated : t))
      );
    } else {
      const created = await addTransaction(formData);
      setTransactions((prev) => [created, ...prev]);
    }
    setEditingTx(null);
  };

  // Trigger Delete
  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
