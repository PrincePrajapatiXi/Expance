'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import BottomNav from '@/components/BottomNav';
import ChartsSection from '@/components/ChartsSection';
import KPICards from '@/components/KPICards';
import { Transaction } from '@/lib/types';
import { fetchTransactions, calculateSummaryStats } from '@/lib/db';
import { formatINR, getCategoryMeta } from '@/lib/utils';
import { TrendingUp, Percent, Sparkles, Award } from 'lucide-react';

export default function AnalyticsPage() {
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

  const stats = calculateSummaryStats(filteredTransactions);

  // Compute highest spending category
  const expenseTxs = filteredTransactions.filter((t) => t.type === 'expense');
  const catSpending: Record<string, number> = {};
  expenseTxs.forEach((t) => {
    catSpending[t.category] = (catSpending[t.category] || 0) + t.amount;
  });
  const topCategoryEntry = Object.entries(catSpending).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topCategoryEntry ? topCategoryEntry[0] : 'None';
  const topCategoryAmount = topCategoryEntry ? topCategoryEntry[1] : 0;
  const topCategoryMeta = getCategoryMeta(topCategory);

  // Savings rate
  const savingsRate =
    stats.totalIncome > 0
      ? Math.max(0, ((stats.totalIncome - stats.totalExpense) / stats.totalIncome) * 100).toFixed(1)
      : '0.0';

  // Average expense
  const avgExpense = stats.expenseCount > 0 ? stats.totalExpense / stats.expenseCount : 0;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <Header selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

      <main className="max-w-4xl mx-auto w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pt-2">
        <DesktopNav onQuickAdd={() => {}} />

        <div className="my-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">Analytics & Reports</h2>
            <p className="text-xs text-slate-500">Visual Insights & Spending Distribution</p>
          </div>
        </div>

        {/* Primary KPI Cards */}
        <KPICards stats={stats} />

        {/* Quick Analytics Insight Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Top Spending
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl">{topCategoryMeta.icon}</span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                  {topCategory}
                </span>
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {topCategoryAmount > 0 ? formatINR(topCategoryAmount) : '₹0'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Percent className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Savings Rate
              </span>
            </div>
            <div className="mt-2">
              <span className="font-extrabold text-xl text-emerald-700 dark:text-emerald-400 block">
                {savingsRate}%
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Net surplus ratio from income
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Avg Expense / TX
              </span>
            </div>
            <div className="mt-2">
              <span className="font-extrabold text-xl text-slate-900 dark:text-white block">
                {formatINR(avgExpense)}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Average outflow per expense
              </span>
            </div>
          </div>
        </div>

        {/* Donut and Bar Charts Section */}
        <ChartsSection transactions={filteredTransactions} />
      </main>

      <BottomNav />
    </div>
  );
}
