'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import BottomNav from '@/components/BottomNav';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import { Transaction } from '@/lib/types';
import { fetchTransactions } from '@/lib/db';

export default function CategoriesPage() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions().then(setTransactions);
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    if (!selectedMonth) return true;
    const txDate = new Date(tx.timestamp);
    const [year, month] = selectedMonth.split('-');
    return (
      txDate.getFullYear() === parseInt(year) &&
      txDate.getMonth() + 1 === parseInt(month)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <main className="max-w-4xl mx-auto px-4 pt-2">
        <DesktopNav onQuickAdd={() => {}} />

        <div className="my-2">
          <h2 className="text-xl font-extrabold tracking-tight">Category Breakdown</h2>
          <p className="text-xs text-slate-500">Share of Income & Expense per Category</p>
        </div>

        <CategoryBreakdown transactions={filteredTransactions} />
      </main>

      <BottomNav />
    </div>
  );
}
