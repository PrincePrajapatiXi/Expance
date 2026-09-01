'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Transaction } from '@/lib/types';
import { formatINR } from '@/lib/utils';
import { fetchCategoryBudgets, saveOverallMonthlyBudget } from '@/lib/db';
import {
  ShieldCheck,
  ShieldAlert,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Edit3,
  Target,
  X,
  Check,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BudgetSummaryCardProps {
  transactions: Transaction[];
}

export default function BudgetSummaryCard({ transactions }: BudgetSummaryCardProps) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState<number | string>('');
  const [isSaving, setIsSaving] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      const data = await fetchCategoryBudgets();
      setBudgets(data || {});
    } catch (err) {
      console.warn('Failed to load budgets:', err);
    }
  }, []);

  useEffect(() => {
    loadBudgets();

    const handleBudgetUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, number>>;
      if (customEvent.detail) {
        setBudgets(customEvent.detail);
      } else {
        loadBudgets();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('expance:budget_updated', handleBudgetUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('expance:budget_updated', handleBudgetUpdate);
      }
    };
  }, [loadBudgets]);

  // Compute total spending (only expenses)
  const categorySpending: Record<string, number> = {};
  let totalSpent = 0;

  transactions
    .filter((tx) => tx.type === 'expense')
    .forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      categorySpending[tx.category] = (categorySpending[tx.category] || 0) + amt;
      totalSpent += amt;
    });

  // Calculate dynamic Total Budget:
  // 1. If explicit overall monthly budget is set (__TOTAL__), use that
  // 2. Otherwise, sum all positive category budgets configured by the user
  // 3. Defaults to 0 if no budget has been set
  let totalBudget = 0;
  if (budgets['__TOTAL__'] !== undefined && Number(budgets['__TOTAL__']) > 0) {
    totalBudget = Number(budgets['__TOTAL__']);
  } else {
    // Sum category budgets (excluding meta keys)
    totalBudget = Object.entries(budgets)
      .filter(([k, v]) => k !== '__TOTAL__' && k !== 'TOTAL' && Number(v) > 0)
      .reduce((sum, [, val]) => sum + Number(val), 0);
  }

  // Count categories over budget
  let overBudgetCount = 0;
  Object.entries(categorySpending).forEach(([cat, spent]) => {
    const catBudget = Number(budgets[cat]) || 0;
    if (catBudget > 0 && spent > catBudget) {
      overBudgetCount++;
    }
  });

  const hasBudgetSet = totalBudget > 0;
  const overallPercent = hasBudgetSet ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;
  const isOver = hasBudgetSet && remaining < 0;

  // Color coding and badge states
  let progressColor = 'bg-emerald-500';
  let progressGlow = '';
  let statusLabel = 'On Track';
  let statusIcon = <ShieldCheck className="w-3.5 h-3.5" />;
  let statusBg = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  let headerGradient = 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-teal-950/20';

  if (!hasBudgetSet) {
    statusLabel = 'Budget Not Set';
    statusIcon = <Target className="w-3.5 h-3.5" />;
    statusBg = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    headerGradient = 'from-indigo-500/5 to-slate-500/5 dark:from-indigo-950/20 dark:to-slate-900/40';
    progressColor = 'bg-indigo-500/40 dark:bg-indigo-600/40';
  } else if (overallPercent >= 100) {
    progressColor = 'bg-rose-500';
    progressGlow = 'shadow-[0_0_12px_rgba(239,68,68,0.35)]';
    statusLabel = 'Over Budget';
    statusIcon = <ShieldAlert className="w-3.5 h-3.5" />;
    statusBg = 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    headerGradient = 'from-rose-500/10 to-red-500/5 dark:from-rose-950/40 dark:to-red-950/20';
  } else if (overallPercent >= 80) {
    progressColor = 'bg-amber-500';
    progressGlow = 'shadow-[0_0_10px_rgba(245,158,11,0.3)]';
    statusLabel = 'Approaching Limit';
    statusIcon = <AlertTriangle className="w-3.5 h-3.5" />;
    statusBg = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    headerGradient = 'from-amber-500/10 to-orange-500/5 dark:from-amber-950/40 dark:to-orange-950/20';
  }

  // Open Edit Modal with current total or empty
  const handleOpenEditModal = () => {
    setCustomBudgetInput(totalBudget > 0 ? totalBudget : '');
    setIsEditModalOpen(true);
  };

  // Save Modal Handler
  const handleSaveBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(customBudgetInput);
    if (isNaN(amountNum) || amountNum < 0) return;

    setIsSaving(true);
    try {
      await saveOverallMonthlyBudget(amountNum);
      setBudgets((prev) => ({ ...prev, __TOTAL__: amountNum }));
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to save monthly budget:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const quickPresets = [15000, 25000, 40000, 60000, 80000, 100000];

  return (
    <>
      <div
        className={`rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-br ${headerGradient} bg-white dark:bg-slate-900 my-4 transition-all min-w-0 overflow-hidden`}
      >
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer hover:scale-105 active:scale-95 ${statusBg} ${
                overallPercent >= 100
                  ? 'animate-pulse-danger'
                  : overallPercent >= 80
                  ? 'animate-pulse-warning'
                  : ''
              }`}
              title="Click to edit or set monthly budget"
            >
              {statusIcon}
              <span>{statusLabel}</span>
            </button>
          </div>
        </div>

        {/* Main stats row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          {/* Total Budget Tile with Edit Action */}
          <div className="relative group p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
            <div className="flex items-center justify-between mb-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Budget
              </span>
              <button
                onClick={handleOpenEditModal}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Edit / Set Monthly Budget"
                aria-label="Edit budget"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="block text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {formatINR(totalBudget)}
              </span>
              {!hasBudgetSet && (
                <button
                  onClick={handleOpenEditModal}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  + Set Target
                </button>
              )}
            </div>
          </div>

          {/* Total Spent Tile */}
          <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Spent
              </span>
            </div>
            <span
              className={`block text-lg sm:text-xl font-extrabold ${
                isOver
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {formatINR(totalSpent)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            <span>
              {!hasBudgetSet ? (
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Target className="w-3 h-3 text-indigo-500" /> No budget limit configured
                </span>
              ) : isOver ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Exceeded by {formatINR(Math.abs(remaining))}
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> {formatINR(remaining)} remaining
                </span>
              )}
            </span>
            <span>
              {hasBudgetSet ? `${overallPercent.toFixed(1)}% used` : `${formatINR(totalSpent)} spent`}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor} ${progressGlow}`}
              style={{
                width: hasBudgetSet ? `${Math.min(overallPercent, 100)}%` : totalSpent > 0 ? '100%' : '0%',
              }}
            />
          </div>
        </div>

        {/* Footer info & CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {!hasBudgetSet ? (
              <button
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                Set Monthly Budget
              </button>
            ) : (
              <>
                <span className="text-[10px] font-bold text-slate-400">
                  Target: {formatINR(totalBudget)}
                </span>
                {overBudgetCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="w-3 h-3" />
                    {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'} exceeded
                  </span>
                )}
              </>
            )}
          </div>

          <a
            href="/categories"
            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Category Budgets <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Edit Monthly Target Budget Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                      Set Monthly Budget Target
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Overall spending target for this month
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveBudgetSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Monthly Target Limit (₹ INR)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-base">
                      ₹
                    </div>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={customBudgetInput}
                      onChange={(e) => setCustomBudgetInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-lg font-extrabold text-slate-900 dark:text-slate-100 rounded-2xl pl-9 pr-4 py-3 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                      placeholder="e.g. 35000"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Current month spending logged: <strong className="text-slate-700 dark:text-slate-300">{formatINR(totalSpent)}</strong>
                  </p>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                    Quick Target Presets
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {quickPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCustomBudgetInput(preset)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          Number(customBudgetInput) === preset
                            ? 'bg-indigo-900 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        ₹{preset.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset to 0 option */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setCustomBudgetInput(0)}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Reset budget to ₹0
                  </button>
                </div>

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Target'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
