'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '@/lib/types';
import { formatINR, getCategoryMeta, CATEGORIES } from '@/lib/utils';
import { fetchCategoryBudgets, saveCategoryBudget } from '@/lib/db';
import { PieChart as CategoryIcon, Target, AlertTriangle, CheckCircle, Edit3 } from 'lucide-react';
import BudgetModal from './BudgetModal';

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

export default function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryBudgets().then(setBudgets);
  }, []);

  const handleSaveBudget = async (category: string, amount: number) => {
    await saveCategoryBudget(category, amount);
    setBudgets((prev) => ({ ...prev, [category]: amount }));
    setEditingCategory(null);
  };

  // Group transactions by category
  const categoryTotals: Record<string, { income: number; expense: number; count: number }> = {};

  // Initialize with common categories
  CATEGORIES.forEach((cat) => {
    categoryTotals[cat.name] = { income: 0, expense: 0, count: 0 };
  });

  transactions.forEach((tx) => {
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = { income: 0, expense: 0, count: 0 };
    }
    categoryTotals[tx.category].count += 1;
    if (tx.type === 'income') {
      categoryTotals[tx.category].income += tx.amount;
    } else {
      categoryTotals[tx.category].expense += tx.amount;
    }
  });

  const totalExpenseSum = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Convert to array
  const categoryList = Object.entries(categoryTotals)
    .filter(([name, val]) => val.expense > 0 || val.income > 0 || budgets[name])
    .map(([name, val]) => {
      const budgetLimit = budgets[name] || 5000;
      const percentOfBudget = budgetLimit > 0 ? (val.expense / budgetLimit) * 100 : 0;

      // Color coding: Green < 70%, Yellow 70-90%, Red > 90%
      let budgetColorClass = 'bg-emerald-500';
      let budgetStatusText = 'On Track';
      let badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';

      if (percentOfBudget > 90) {
        budgetColorClass = 'bg-rose-500';
        budgetStatusText = percentOfBudget > 100 ? 'Over Budget' : 'Critical';
        badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
      } else if (percentOfBudget >= 70) {
        budgetColorClass = 'bg-amber-500';
        budgetStatusText = 'Caution';
        badgeColor = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
      }

      return {
        name,
        income: val.income,
        expense: val.expense,
        count: val.count,
        budgetLimit,
        percentOfBudget,
        budgetColorClass,
        budgetStatusText,
        badgeColor,
        meta: getCategoryMeta(name),
        shareOfExpense:
          totalExpenseSum > 0 ? ((val.expense / totalExpenseSum) * 100).toFixed(1) : '0',
      };
    });

  // Sort by highest expense first
  categoryList.sort((a, b) => b.expense - a.expense);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs my-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
            <CategoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Category Spending & Budgets
            </h3>
            <p className="text-xs text-slate-500">Live Budget Limits & Expense Tracking</p>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {categoryList.length} Categories
        </span>
      </div>

      {categoryList.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-xs">No category spending recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {categoryList.map((item) => {
            const isOverBudget = item.expense > item.budgetLimit;
            const remaining = Math.max(0, item.budgetLimit - item.expense);

            return (
              <div
                key={item.name}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5 transition-all hover:shadow-2xs"
              >
                {/* Category Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${item.meta.bgLight} ${item.meta.textDark} shadow-2xs`}
                    >
                      {item.meta.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                          {item.name}
                        </h4>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold ${item.badgeColor}`}
                        >
                          {item.budgetStatusText}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {item.count} transactions • {item.shareOfExpense}% of total
                      </span>
                    </div>
                  </div>

                  {/* Amounts & Set Budget Button */}
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="block font-extrabold text-xs sm:text-sm text-rose-700 dark:text-rose-400">
                        {formatINR(item.expense)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block">
                        Limit: {formatINR(item.budgetLimit)}
                      </span>
                    </div>

                    <button
                      onClick={() => setEditingCategory(item.name)}
                      className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      title={`Set budget limit for ${item.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar for monthly budget spent vs limit */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                    <span>
                      {isOverBudget ? (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Exceeded by {formatINR(item.expense - item.budgetLimit)}
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {formatINR(remaining)} remaining
                        </span>
                      )}
                    </span>
                    <span>{item.percentOfBudget.toFixed(1)}% of budget</span>
                  </div>

                  {/* Visual Progress Bar with color transitions: Green <70%, Yellow 70-90%, Red >90% */}
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.budgetColorClass}`}
                      style={{
                        width: `${Math.min(item.percentOfBudget, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Modal */}
      {editingCategory && (
        <BudgetModal
          isOpen={Boolean(editingCategory)}
          onClose={() => setEditingCategory(null)}
          category={editingCategory}
          currentBudget={budgets[editingCategory] || 5000}
          onSave={handleSaveBudget}
        />
      )}
    </div>
  );
}
