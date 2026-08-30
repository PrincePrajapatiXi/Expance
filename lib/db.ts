import { Transaction, TransactionFormData, SummaryStats, UserProfile, CategoryBudget } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'expance_transactions_v2';
const PROFILE_KEY = 'expance_user_profile_v2';
const BUDGET_KEY = 'expance_category_budgets_v1';

export const DEFAULT_USER: UserProfile = {
  id: 'user-default',
  full_name: 'Prince Sharma',
  email: 'prince.sharma@example.com',
  currency: 'INR',
  avatar_url: '',
};

export const DEFAULT_BUDGETS: Record<string, number> = {
  'Food & Dining': 6000,
  'Shopping': 4000,
  'Bills & Utilities': 3500,
  'Rent & Housing': 25000,
  'Travel & Transport': 3000,
  'Education': 2000,
  'Health & Fitness': 2500,
  'Gift & Donation': 2000,
  'Other / Misc': 2000,
};

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_USER;
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_USER;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export const CURRENT_USER = DEFAULT_USER;

// Local storage helpers - clean, unseeded state
function getLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read transactions from localStorage', e);
    return [];
  }
}

function saveLocalTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions to localStorage', e);
  }
}

// Data Service APIs
export async function fetchTransactions(): Promise<Transaction[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!error && data) {
        saveLocalTransactions(data);
        return data;
      }
      if (error) {
        console.warn('Supabase query error, falling back to local storage cache:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using local storage cache:', err);
    }
  }

  return getLocalTransactions();
}

export async function addTransaction(formData: TransactionFormData): Promise<Transaction> {
  const newTx: Transaction = {
    id: isSupabaseConfigured ? undefined! : `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: CURRENT_USER.id,
    type: formData.type,
    category: formData.category,
    description: formData.description,
    amount: Number(formData.amount),
    payment_method: formData.payment_method || 'UPI',
    notes: formData.notes || '',
    timestamp: new Date(formData.timestamp).toISOString(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          type: newTx.type,
          category: newTx.category,
          description: newTx.description,
          amount: newTx.amount,
          payment_method: newTx.payment_method,
          notes: newTx.notes,
          timestamp: newTx.timestamp
        }])
        .select()
        .single();

      if (!error && data) return data;
      console.warn('Supabase insert failed, persisting locally:', error?.message);
    } catch (err) {
      console.warn('Supabase insert error, persisting locally:', err);
    }
  }

  const current = getLocalTransactions();
  const updated = [newTx, ...current];
  saveLocalTransactions(updated);
  return newTx;
}

export async function bulkAddTransactions(importedList: Transaction[]): Promise<Transaction[]> {
  if (!importedList.length) return [];

  if (isSupabaseConfigured && supabase) {
    try {
      const payload = importedList.map(t => ({
        type: t.type,
        category: t.category,
        description: t.description,
        amount: t.amount,
        payment_method: t.payment_method || 'UPI',
        notes: t.notes || '',
        timestamp: t.timestamp
      }));

      const { data, error } = await supabase
        .from('transactions')
        .insert(payload)
        .select();

      if (!error && data) {
        const current = getLocalTransactions();
        const combined = [...data, ...current];
        saveLocalTransactions(combined);
        return data;
      }
    } catch (err) {
      console.warn('Supabase bulk insert failed:', err);
    }
  }

  const current = getLocalTransactions();
  const combined = [...importedList, ...current];
  saveLocalTransactions(combined);
  return importedList;
}

export async function updateTransaction(id: string, formData: TransactionFormData): Promise<Transaction> {
  const updatedData = {
    type: formData.type,
    category: formData.category,
    description: formData.description,
    amount: Number(formData.amount),
    payment_method: formData.payment_method || 'UPI',
    notes: formData.notes || '',
    timestamp: new Date(formData.timestamp).toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
      console.warn('Supabase update failed, updating locally:', error?.message);
    } catch (err) {
      console.warn('Supabase update error:', err);
    }
  }

  const current = getLocalTransactions();
  const updated = current.map((tx) =>
    tx.id === id ? { ...tx, ...updatedData } : tx
  );
  saveLocalTransactions(updated);
  return { id, user_id: CURRENT_USER.id, ...updatedData };
}

export async function deleteTransaction(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) return true;
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  const current = getLocalTransactions();
  const updated = current.filter((tx) => tx.id !== id);
  saveLocalTransactions(updated);
  return true;
}

export function clearAllTransactions(): Transaction[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

export function calculateSummaryStats(transactions: Transaction[]): SummaryStats {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      incomeCount++;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
      expenseCount++;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    incomeCount,
    expenseCount,
  };
}

// Category Budgets API
export async function fetchCategoryBudgets(): Promise<Record<string, number>> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from('budgets').select('*');
      if (!error && data && data.length > 0) {
        const map: Record<string, number> = { ...DEFAULT_BUDGETS };
        data.forEach((b: any) => {
          map[b.category] = Number(b.monthly_budget);
        });
        return map;
      }
    } catch (err) {
      console.warn('Supabase budget query failed, falling back:', err);
    }
  }

  if (typeof window === 'undefined') return DEFAULT_BUDGETS;
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return DEFAULT_BUDGETS;
    return { ...DEFAULT_BUDGETS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_BUDGETS;
  }
}

export async function saveCategoryBudget(category: string, monthlyBudget: number): Promise<void> {
  const current = await fetchCategoryBudgets();
  const updated = { ...current, [category]: monthlyBudget };

  if (typeof window !== 'undefined') {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(updated));
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('budgets')
        .upsert(
          { category, monthly_budget: monthlyBudget },
          { onConflict: 'user_id,category' }
        );
    } catch (err) {
      console.warn('Supabase budget upsert error:', err);
    }
  }
}
