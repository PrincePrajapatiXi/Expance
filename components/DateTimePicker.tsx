'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO datetime string or datetime-local format
  onChange: (value: string) => void;
  className?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Parse a datetime-local string or ISO string into a Date (local time)
function parseInput(val: string): Date {
  if (!val) return new Date();
  // datetime-local format: YYYY-MM-DDTHH:mm
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (m) {
    return new Date(
      parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]),
      parseInt(m[4]), parseInt(m[5])
    );
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Format to datetime-local string (YYYY-MM-DDTHH:mm)
function toLocalFormat(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Display label: "05 Sep 2026, 07:03 PM"
function formatDisplay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  let hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS[d.getMonth()].slice(0, 3);
  return `${day} ${mon} ${d.getFullYear()},  ${pad(hours)}:${pad(mins)} ${ampm}`;
}

export default function DateTimePicker({ value, onChange, className = '' }: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = parseInput(value);

  const [viewYear, setViewYear] = useState(current.getFullYear());
  const [viewMonth, setViewMonth] = useState(current.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date>(current);

  // Time state
  const [timeStr, setTimeStr] = useState(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(current.getHours())}:${pad(current.getMinutes())}`;
  });

  // Sync external value changes
  useEffect(() => {
    const d = parseInput(value);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    const pad = (n: number) => String(n).padStart(2, '0');
    setTimeStr(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build calendar days grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = useCallback((day: number) => {
    const [h, mi] = timeStr.split(':').map(Number);
    const d = new Date(viewYear, viewMonth, day, h || 0, mi || 0);
    setSelectedDate(d);
    onChange(toLocalFormat(d));
  }, [viewYear, viewMonth, timeStr, onChange]);

  const applyTime = useCallback((t: string) => {
    setTimeStr(t);
    const [h, mi] = t.split(':').map(Number);
    const d = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
      isNaN(h) ? 0 : h, isNaN(mi) ? 0 : mi
    );
    setSelectedDate(d);
    onChange(toLocalFormat(d));
  }, [selectedDate, onChange]);

  const setToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(now);
    const pad = (n: number) => String(n).padStart(2, '0');
    const t = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setTimeStr(t);
    onChange(toLocalFormat(now));
  };

  const isSelected = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isFuture = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d > t;
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-3 text-xs font-medium text-slate-800 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-pointer"
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-left font-semibold text-slate-700 dark:text-slate-200">
          {formatDisplay(selectedDate)}
        </span>
        {open
          ? <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 rotate-90" />
        }
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            style={{ minWidth: 280 }}
          >
            {/* Month Navigator */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 px-3 pb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} />;
                const sel = isSelected(day);
                const tod = isToday(day);
                const fut = isFuture(day);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={fut}
                    onClick={() => selectDay(day)}
                    className={`
                      w-full aspect-square rounded-xl text-xs font-bold transition-all duration-100 cursor-pointer
                      ${sel
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : tod
                          ? 'ring-2 ring-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                          : fut
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800 mx-3" />

            {/* Time Picker Row */}
            <div className="flex items-center gap-2.5 px-4 py-3">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Time</span>
              <input
                type="time"
                value={timeStr}
                onChange={e => applyTime(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-4 pb-3.5 pt-0.5 gap-2">
              <button
                type="button"
                onClick={setToday}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-extrabold transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
