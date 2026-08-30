'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';

interface MonthPickerPopoverProps {
  selectedMonth: string; // Format: YYYY-MM or '' for all
  onMonthChange: (month: string) => void;
}

const MONTH_NAMES = [
  { short: 'Jan', full: 'January', num: '01' },
  { short: 'Feb', full: 'February', num: '02' },
  { short: 'Mar', full: 'March', num: '03' },
  { short: 'Apr', full: 'April', num: '04' },
  { short: 'May', full: 'May', num: '05' },
  { short: 'Jun', full: 'June', num: '06' },
  { short: 'Jul', full: 'July', num: '07' },
  { short: 'Aug', full: 'August', num: '08' },
  { short: 'Sep', full: 'September', num: '09' },
  { short: 'Oct', full: 'October', num: '10' },
  { short: 'Nov', full: 'November', num: '11' },
  { short: 'Dec', full: 'December', num: '12' },
];

export default function MonthPickerPopover({
  selectedMonth,
  onMonthChange,
}: MonthPickerPopoverProps) {
  const now = new Date();
  const realCurrentYear = now.getFullYear();
  const realCurrentMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const realCurrentMonthStr = `${realCurrentYear}-${realCurrentMonthNum}`;

  // Parse initial selected year & month
  const initialYear = selectedMonth
    ? parseInt(selectedMonth.split('-')[0], 10)
    : realCurrentYear;

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(initialYear);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync viewYear when selectedMonth prop changes
  useEffect(() => {
    if (selectedMonth) {
      const yr = parseInt(selectedMonth.split('-')[0], 10);
      if (!isNaN(yr)) setViewYear(yr);
    }
  }, [selectedMonth]);

  // Outside click listener & ESC key listener
  useEffect(() => {
    const handleEvents = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setIsOpen(false);
      } else if (
        e instanceof MouseEvent &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleEvents);
      document.addEventListener('keydown', handleEvents);
    }
    return () => {
      document.removeEventListener('mousedown', handleEvents);
      document.removeEventListener('keydown', handleEvents);
    };
  }, [isOpen]);

  // Format button trigger display label
  const getDisplayLabel = () => {
    if (!selectedMonth) return 'All Months';
    const [year, month] = selectedMonth.split('-');
    const mObj = MONTH_NAMES.find((m) => m.num === month);
    if (!mObj) return selectedMonth;
    return `${mObj.full} ${year}`;
  };

  const handleSelectMonth = (monthNum: string) => {
    const newMonthStr = `${viewYear}-${monthNum}`;
    onMonthChange(newMonthStr);
    setIsOpen(false);
  };

  const handleResetCurrentMonth = () => {
    setViewYear(realCurrentYear);
    onMonthChange(realCurrentMonthStr);
    setIsOpen(false);
  };

  const isCurrentRealMonth = (year: number, monthNum: string) => {
    return year === realCurrentYear && monthNum === realCurrentMonthNum;
  };

  const isSelected = (year: number, monthNum: string) => {
    return selectedMonth === `${year}-${monthNum}`;
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
        aria-label="Select month and year"
        aria-expanded={isOpen}
      >
        <Calendar className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
        <span className="text-xs font-bold tracking-tight whitespace-nowrap">
          {getDisplayLabel()}
        </span>
      </button>

      {/* Modern Popover Grid Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Popover Header: Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-wider">
                {viewYear}
              </span>
              {viewYear === realCurrentYear && (
                <span className="block text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                  Current Year
                </span>
              )}
            </div>

            <button
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3x4 Months Grid */}
          <div className="grid grid-cols-3 gap-2 py-3.5">
            {MONTH_NAMES.map((m) => {
              const active = isSelected(viewYear, m.num);
              const isNow = isCurrentRealMonth(viewYear, m.num);

              return (
                <button
                  key={m.num}
                  type="button"
                  onClick={() => handleSelectMonth(m.num)}
                  className={`relative py-2.5 px-2 rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                    active
                      ? 'bg-indigo-900 text-white shadow-md shadow-indigo-900/30 scale-[1.03]'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  } ${
                    isNow && !active
                      ? 'ring-2 ring-indigo-500/60 dark:ring-indigo-400/50'
                      : ''
                  }`}
                >
                  <span>{m.short}</span>
                  {isNow && (
                    <span
                      className={`text-[9px] font-extrabold ${
                        active ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      Now
                    </span>
                  )}
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Action Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetCurrentMonth}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold text-[11px] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                This Month
              </button>

              <button
                type="button"
                onClick={() => {
                  onMonthChange('');
                  setIsOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-extrabold text-[11px] transition-colors cursor-pointer ${
                  !selectedMonth
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Time
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
