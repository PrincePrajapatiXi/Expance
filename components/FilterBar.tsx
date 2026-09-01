'use client';

import React from 'react';
import { Search, Filter, Calendar, X, CreditCard } from 'lucide-react';
import { FilterOptions, DateRangeOption } from '@/lib/types';
import { CATEGORIES } from '@/lib/utils';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
}

export default function FilterBar({
  filters,
  onFilterChange,
  onResetFilters,
}: FilterBarProps) {
  const isFiltered =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    (filters.paymentMethod && filters.paymentMethod !== 'all') ||
    filters.dateRange !== 'all' ||
    filters.searchQuery !== '';

  const dateOptions: { id: DateRangeOption; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  const paymentModes = [
    { id: 'all', label: 'All Payment Modes' },
    { id: 'UPI', label: '📱 UPI' },
    { id: 'Cash', label: '💵 Cash' },
    { id: 'Card', label: '💳 Card' },
    { id: 'Net Banking', label: '🏦 Net Banking' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4 space-y-3 min-w-0 overflow-hidden">
      {/* Top Search Input & Reset Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search description, category, notes, or payment mode..."
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({ ...filters, searchQuery: e.target.value })
            }
            className="w-full bg-slate-100/80 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 border border-transparent transition-all placeholder:text-slate-400"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors border border-rose-100 dark:border-rose-900/50 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Type Toggle & Date Range Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
        {/* Type Toggle (All, Income, Expense) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => onFilterChange({ ...filters, type: 'all' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filters.type === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, type: 'income' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filters.type === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, type: 'expense' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filters.type === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            Expense
          </button>
        </div>

        {/* Date Range Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          {dateOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onFilterChange({ ...filters, dateRange: opt.id })}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filters.dateRange === opt.id
                  ? 'bg-indigo-900 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker inputs if 'custom' date selected */}
      {filters.dateRange === 'custom' && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.customStartDate || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, customStartDate: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-800 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={filters.customEndDate || ''}
              onChange={(e) =>
                onFilterChange({ ...filters, customEndDate: e.target.value })
              }
              className="w-full bg-slate-50 dark:bg-slate-800 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden"
            />
          </div>
        </div>
      )}

      {/* Payment Mode Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 min-w-0">
        <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <CreditCard className="w-3 h-3" /> Mode:
        </span>
        {paymentModes.map((mode) => (
          <button
            key={mode.id}
            onClick={() =>
              onFilterChange({
                ...filters,
                paymentMethod: mode.id === 'all' ? undefined : mode.id,
              })
            }
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
              (!filters.paymentMethod && mode.id === 'all') ||
              filters.paymentMethod === mode.id
                ? 'bg-indigo-900 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 min-w-0">
        <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1">
          Category:
        </span>
        <button
          onClick={() => onFilterChange({ ...filters, category: 'all' })}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-all cursor-pointer ${
            filters.category === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onFilterChange({ ...filters, category: cat.name })}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
              filters.category === cat.name
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{cat.icon}</span> {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
