'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import BottomNav from '@/components/BottomNav';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import BudgetSummaryCard from '@/components/BudgetSummaryCard';
import { Transaction } from '@/lib/types';
import { fetchTransactions } from '@/lib/db';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ToastState {
  id: number;
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
}

export default function CategoriesPage() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetchTransactions().then(setTransactions);
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredTransactions = transactions.filter((tx) => {
    if (!selectedMonth) return true;
    const txDate = new Date(tx.timestamp);
    const [year, month] = selectedMonth.split('-');
    return (
      txDate.getFullYear() === parseInt(year) &&
      txDate.getMonth() + 1 === parseInt(month)
    );
  });

  const handleBudgetAlert = (category: string, percent: number) => {
    setToast({
      id: Date.now(),
      message: `🚨 "${category}" has exceeded its monthly budget! (${percent}% used)`,
      type: 'error',
    });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <main className="max-w-4xl mx-auto w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pt-2">
        <DesktopNav onQuickAdd={() => {}} />

        {/* Toast notification */}
        {toast && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-3 duration-200">
            <div
              className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-md border ${
                toast.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-900'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToast(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 cursor-pointer ml-3 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="my-2">
          <h2 className="text-xl font-extrabold tracking-tight">Category Breakdown</h2>
          <p className="text-xs text-slate-500">Share of Income & Expense per Category</p>
        </div>

        {/* Budget Summary Card */}
        <BudgetSummaryCard transactions={filteredTransactions} />

        {/* Category Spending with Budget Alerts */}
        <CategoryBreakdown
          transactions={filteredTransactions}
          onBudgetAlert={handleBudgetAlert}
        />
      </main>

      <BottomNav />
    </div>
  );
}
