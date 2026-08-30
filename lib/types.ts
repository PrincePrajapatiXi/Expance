import { z } from 'zod';

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'UPI' | 'Cash' | 'Card' | 'Net Banking' | 'Other';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  payment_method?: PaymentMethod;
  notes?: string;
  timestamp: string; // ISO 8601 string
  created_at?: string;
}

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'Please select a transaction type',
  }),
  category: z.string().min(1, 'Category is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(150, 'Description too long'),
  payment_method: z.enum(['UPI', 'Cash', 'Card', 'Net Banking', 'Other']).optional(),
  notes: z.string().max(250, 'Notes too long').optional(),
  timestamp: z.string().min(1, 'Date & Time is required'),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

export interface CategoryBudget {
  category: string;
  monthly_budget: number;
}

export type DateRangeOption = 'all' | 'today' | 'week' | 'month' | 'custom';

export interface FilterOptions {
  type: 'all' | 'income' | 'expense';
  category: string; // 'all' or specific category
  paymentMethod?: string; // 'all' or specific payment method
  dateRange: DateRangeOption;
  customStartDate?: string;
  customEndDate?: string;
  searchQuery: string;
  selectedMonth: string; // Format: YYYY-MM or ''
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  currency: string;
  avatar_url?: string;
}

export interface SummaryStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  incomeCount: number;
  expenseCount: number;
}

export interface CategoryMeta {
  id: string;
  name: string;
  icon: string;
  type: TransactionType | 'both';
  bgLight: string;
  textDark: string;
  colorHex: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'info' | 'success';
}
