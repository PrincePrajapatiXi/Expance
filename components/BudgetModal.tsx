'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Check, IndianRupee } from 'lucide-react';
import { getCategoryMeta } from '@/lib/utils';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  currentBudget: number;
  onSave: (category: string, amount: number) => void;
}

export default function BudgetModal({
  isOpen,
  onClose,
  category,
  currentBudget,
  onSave,
}: BudgetModalProps) {
  const [budgetAmount, setBudgetAmount] = useState<number>(currentBudget || 0);
  const meta = getCategoryMeta(category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (budgetAmount >= 0) {
      onSave(category, budgetAmount);
      onClose();
    }
  };

  const quickPresets = [2000, 3500, 5000, 8000, 12000, 20000];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs pointer-events-auto">
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
                    Set Monthly Budget
                  </h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span>{meta.icon}</span> {category}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Monthly Budget Limit (₹ INR)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-base">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-lg font-extrabold text-slate-900 dark:text-slate-100 rounded-2xl pl-9 pr-4 py-3 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="5000"
                    required
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                  Quick Amount Presets
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBudgetAmount(preset)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        budgetAmount === preset
                          ? 'bg-indigo-900 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Budget
                </button>
              </div>
            </form>
          </motion.div>
        </div>
  );
}
