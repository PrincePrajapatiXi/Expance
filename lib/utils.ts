import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CategoryMeta } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency into INR ₹
export function formatINR(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
  }
  return formatted;
}

// 12-hour formatted timestamp: YYYY-MM-DD hh:mm A
export function format12HourDateTime(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = String(hours).padStart(2, '0');

  return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`;
}

// ISO datetime local helper for <input type="datetime-local">
export function toDateTimeLocalFormat(dateInput: Date | string = new Date()): string {
  const d = new Date(dateInput);
  const tzOffset = d.getTimezoneOffset() * 60000;
  const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  return localISOTime;
}

// Category Registry with soft pastels
export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: '🍔',
    type: 'expense',
    bgLight: 'bg-amber-100 dark:bg-amber-950/40',
    textDark: 'text-amber-800 dark:text-amber-300',
    colorHex: '#F59E0B',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: '🛍️',
    type: 'expense',
    bgLight: 'bg-pink-100 dark:bg-pink-950/40',
    textDark: 'text-pink-800 dark:text-pink-300',
    colorHex: '#EC4899',
  },
  {
    id: 'gift',
    name: 'Gift & Donation',
    icon: '🎁',
    type: 'both',
    bgLight: 'bg-purple-100 dark:bg-purple-950/40',
    textDark: 'text-purple-800 dark:text-purple-300',
    colorHex: '#A855F7',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: '⚡',
    type: 'expense',
    bgLight: 'bg-orange-100 dark:bg-orange-950/40',
    textDark: 'text-orange-800 dark:text-orange-300',
    colorHex: '#F97316',
  },
  {
    id: 'education',
    name: 'Education',
    icon: '🎓',
    type: 'expense',
    bgLight: 'bg-sky-100 dark:bg-sky-950/40',
    textDark: 'text-sky-800 dark:text-sky-300',
    colorHex: '#0284C7',
  },
  {
    id: 'travel',
    name: 'Travel & Transport',
    icon: '🚗',
    type: 'expense',
    bgLight: 'bg-cyan-100 dark:bg-cyan-950/40',
    textDark: 'text-cyan-800 dark:text-cyan-300',
    colorHex: '#06B6D4',
  },
  {
    id: 'salary',
    name: 'Salary / Wages',
    icon: '💼',
    type: 'income',
    bgLight: 'bg-emerald-100 dark:bg-emerald-950/40',
    textDark: 'text-emerald-800 dark:text-emerald-300',
    colorHex: '#10B981',
  },
  {
    id: 'investment',
    name: 'Investment & Dividends',
    icon: '📈',
    type: 'income',
    bgLight: 'bg-teal-100 dark:bg-teal-950/40',
    textDark: 'text-teal-800 dark:text-teal-300',
    colorHex: '#14B8A6',
  },
  {
    id: 'rent',
    name: 'Rent & Housing',
    icon: '🏠',
    type: 'expense',
    bgLight: 'bg-indigo-100 dark:bg-indigo-950/40',
    textDark: 'text-indigo-800 dark:text-indigo-300',
    colorHex: '#6366F1',
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    icon: '🩺',
    type: 'expense',
    bgLight: 'bg-rose-100 dark:bg-rose-950/40',
    textDark: 'text-rose-800 dark:text-rose-300',
    colorHex: '#F43F5E',
  },
  {
    id: 'other',
    name: 'Other / Misc',
    icon: '💡',
    type: 'both',
    bgLight: 'bg-slate-100 dark:bg-slate-800',
    textDark: 'text-slate-800 dark:text-slate-200',
    colorHex: '#64748B',
  },
];

export function getCategoryMeta(categoryName: string): CategoryMeta {
  const match = CATEGORIES.find(
    (c) =>
      c.name.toLowerCase() === categoryName.toLowerCase() ||
      c.id.toLowerCase() === categoryName.toLowerCase()
  );

  return (
    match || {
      id: 'custom',
      name: categoryName,
      icon: '💰',
      type: 'both',
      bgLight: 'bg-slate-100 dark:bg-slate-800',
      textDark: 'text-slate-800 dark:text-slate-200',
      colorHex: '#64748B',
    }
  );
}
