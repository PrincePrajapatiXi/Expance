'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '@/lib/types';
import { formatINR, CATEGORIES } from '@/lib/utils';
import { fetchCategoryBudgets } from '@/lib/db';
import { ShieldCheck, ShieldAlert, TrendingDown, AlertTriangle, ChevronRight } from 'lucide-react';

interface BudgetSummaryCardProps {
  transactions: Transaction[];
}

export default function BudgetSummaryCard({ transactions }: BudgetSummaryCardProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCategoryBudgets().then(setBudgets);
  }, []);

  // Only expense categories that have a budget
  const expenseCategories = CATEGORIES.filter((c) => c.type === 'expense' || c.type === 'both');

  // Compute per-category spending (only expenses)
  const categorySpending: Record<string, number> = {};
  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
    });

  // Total budget = sum of all budget limits for categories that have transactions or budgets
  let totalBudget = 0;
  let totalSpent = 0;
  let overBudgetCount = 0;
  const relevantCategories = new Set<string>();

  // Gather all categories that have either a budget or spending
  expenseCategories.forEach((c) => {
    if (budgets[c.name] || categorySpending[c.name]) {
      relevantCategories.add(c.name);
    }
  });
  Object.keys(categorySpending).forEach((cat) => relevantCategories.add(cat));

  relevantCategories.forEach((cat) => {
    const budget = budgets[cat] || 5000;
    const spent = categorySpending[cat] || 0;
    totalBudget += budget;
    totalSpent += spent;
    if (spent >= budget) overBudgetCount++;
  });

  const overallPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;
  const isOver = remaining < 0;

  // Color coding
  let progressColor = 'bg-emerald-500';
  let progressGlow = '';
  let statusLabel = 'On Track';
  let statusIcon = <ShieldCheck className="w-4 h-4" />;
  let statusBg = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  let headerGradient = 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-teal-950/20';

  if (overallPercent >= 100) {
    progressColor = 'bg-rose-500';
    progressGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.35)]';
    statusLabel = 'Over Budget';
    statusIcon = <ShieldAlert className="w-4 h-4" />;
    statusBg = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    headerGradient = 'from-rose-500/10 to-red-500/5 dark:from-rose-950/40 dark:to-red-950/20';
  } else if (overallPercent >= 80) {
    progressColor = 'bg-amber-500';
    progressGlow = 'shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    statusLabel = 'Approaching Limit';
    statusIcon = <AlertTriangle className="w-4 h-4" />;
    statusBg = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    headerGradient = 'from-amber-500/10 to-orange-500/5 dark:from-amber-950/40 dark:to-orange-950/20';
  }

  return (
    <div className={`rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br ${headerGradient} bg-white dark:bg-slate-900 my-4 transition-all min-w-0 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-sm border border-slate-100 dark:border-slate-700">
            <TrendingDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Monthly Budget Overview
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Total Budget vs Total Spent
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusBg} ${
            overallPercent >= 100 ? 'animate-pulse-danger' : overallPercent >= 80 ? 'animate-pulse-warning' : ''
          }`}
        >
          {statusIcon}
          {statusLabel}
        </span>
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Total Budget
          </span>
          <span className="block text-lg font-extrabold text-slate-900 dark:text-slate-100">
            {formatINR(totalBudget)}
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Total Spent
          </span>
          <span className={`block text-lg font-extrabold ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {formatINR(totalSpent)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
          <span>
            {isOver ? (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Exceeded by {formatINR(Math.abs(remaining))}
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {formatINR(remaining)} remaining
              </span>
            )}
          </span>
          <span>{overallPercent.toFixed(1)}% used</span>
        </div>
        <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor} ${progressGlow}`}
            style={{
              width: `${Math.min(overallPercent, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400">
            {relevantCategories.size} Categories
          </span>
          {overBudgetCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-3 h-3" />
              {overBudgetCount} over budget
            </span>
          )}
        </div>
        <a
          href="/categories"
          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          View Details <ChevronRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
