import { Transaction, TransactionFormData, SummaryStats, UserProfile, PaymentMethod } from './types';
import { supabase, isSupabaseConfigured, getAuthUser } from './supabaseClient';

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

export const DEFAULT_BUDGETS: Record<string, number> = {};

// Event emitter for UI Toast / Notification feedback
export type DBEventType = 'insert_error' | 'sync_success' | 'sync_error' | 'offline_mode';
export interface DBEventDetail {
  type: DBEventType;
  message: string;
  details?: any;
}

export function emitDBEvent(type: DBEventType, message: string, details?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<DBEventDetail>('expance:db_event', {
        detail: { type, message, details },
      })
    );
  }
}

// User Profile helpers
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

// Generate UUID safely for client-side creation
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to normalize Supabase raw row or local object to standard Transaction
export function normalizeTransaction(raw: any): Transaction {
  const paymentMethodVal = raw.payment_mode || raw.payment_method || 'UPI';
  let payment_method: PaymentMethod = 'UPI';
  if (['UPI', 'Cash', 'Card', 'Net Banking', 'Other'].includes(paymentMethodVal)) {
    payment_method = paymentMethodVal as PaymentMethod;
  } else if (/cash/i.test(paymentMethodVal)) {
    payment_method = 'Cash';
  } else if (/card/i.test(paymentMethodVal)) {
    payment_method = 'Card';
  } else if (/bank|net/i.test(paymentMethodVal)) {
    payment_method = 'Net Banking';
  } else {
    payment_method = 'Other';
  }

  return {
    id: String(raw.id || generateUUID()),
    user_id: String(raw.user_id || CURRENT_USER.id),
    type: raw.type === 'income' ? 'income' : 'expense',
    category: String(raw.category || 'Other / Misc'),
    description: String(raw.description || ''),
    amount: Number(raw.amount) || 0,
    payment_method,
    payment_mode: paymentMethodVal,
    notes: raw.notes || '',
    timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// Local Storage helpers
export function getLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeTransaction);
    }
    return [];
  } catch (e) {
    console.error('Failed to read transactions from localStorage', e);
    return [];
  }
}

export function saveLocalTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions to localStorage', e);
  }
}

// Automatic Sync of Local Transactions to Supabase when user logs in
export async function syncLocalTransactionsToSupabase(userId: string): Promise<Transaction[]> {
  if (!isSupabaseConfigured || !supabase || !userId) {
    return getLocalTransactions();
  }

  const localList = getLocalTransactions();
  if (!localList.length) {
    // No local transactions to sync, fetch from Supabase
    return fetchTransactions();
  }

  try {
    // 1. Fetch user's existing Supabase transactions
    const { data: remoteData, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (fetchErr) {
      console.warn('[Supabase Sync] Could not fetch remote transactions:', fetchErr.message);
      return localList;
    }

    const existingRemoteMap = new Map<string, any>();
    (remoteData || []).forEach((row: any) => {
      existingRemoteMap.set(row.id, row);
      // Also match by timestamp + amount + description if local ID was client-generated non-uuid
      const compositeKey = `${row.timestamp}_${row.amount}_${row.description}_${row.category}`;
      existingRemoteMap.set(compositeKey, row);
    });

    // 2. Identify local transactions that are not yet in Supabase
    const toUpload = localList.filter((localTx) => {
      if (existingRemoteMap.has(localTx.id)) return false;
      const compositeKey = `${localTx.timestamp}_${localTx.amount}_${localTx.description}_${localTx.category}`;
      if (existingRemoteMap.has(compositeKey)) return false;
      return true;
    });

    if (toUpload.length > 0) {
      console.log(`[Supabase Sync] Migrating ${toUpload.length} local transactions to account: ${userId}`);
      
      const payload = toUpload.map((t) => ({
        user_id: userId,
        type: t.type,
        category: t.category,
        description: t.description || '',
        payment_mode: t.payment_method || t.payment_mode || 'UPI',
        amount: Number(t.amount),
        notes: t.notes || '',
        timestamp: t.timestamp,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('transactions')
        .insert(payload)
        .select();

      if (insertErr) {
        console.error('[Supabase Sync Failed]:', insertErr.message, insertErr);
        emitDBEvent('sync_error', `Could not sync local transactions to cloud: ${insertErr.message}`, insertErr);
      } else if (inserted) {
        console.log(`[Supabase Sync Success] Uploaded ${inserted.length} transactions to Supabase.`);
        emitDBEvent('sync_success', `Synced ${inserted.length} local transactions to your cloud account.`);
      }
    }

    // 3. Re-fetch all user transactions from Supabase to ensure single source of truth
    const { data: updatedRemote } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (updatedRemote && updatedRemote.length > 0) {
      const normalizedRemote = updatedRemote.map(normalizeTransaction);
      saveLocalTransactions(normalizedRemote);
      return normalizedRemote;
    }
  } catch (err) {
    console.error('[Supabase Sync Error]:', err);
  }

  return getLocalTransactions();
}

// 1. Fetch Transactions (Hybrid Supabase + LocalStorage Fallback)
export async function fetchTransactions(): Promise<Transaction[]> {
  const local = getLocalTransactions();

  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      
      // If user is authenticated, query their cloud transactions
      if (authUser) {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('timestamp', { ascending: false });

        if (!error && data) {
          const remoteNormalized = data.map(normalizeTransaction);
          
          // If we have local transactions that need syncing, trigger background sync
          const remoteIds = new Set(data.map((d: any) => d.id));
          const hasUnsyncedLocal = local.some((l) => !remoteIds.has(l.id) && l.user_id !== authUser.id);
          
          if (hasUnsyncedLocal) {
            // Asynchronously sync unsynced local data to account
            syncLocalTransactionsToSupabase(authUser.id);
          }

          // Cache in local storage for instant offline access
          saveLocalTransactions(remoteNormalized);
          return remoteNormalized;
        }

        if (error) {
          console.warn('[Supabase] Fetch query failed, falling back to localStorage cache:', error.message);
          emitDBEvent('offline_mode', `Cloud sync offline: ${error.message}. Using offline cache.`);
        }
      } else {
        // Guest mode: User has not signed in. Always serve from local storage!
        return local;
      }
    } catch (err: any) {
      console.warn('[Supabase] Fetch exception, using localStorage cache:', err?.message || err);
    }
  }

  // Fallback to local storage (unauthenticated or Supabase offline)
  return local;
}

// 2. Add Transaction (Immediate LocalStorage persistence + Cloud Sync if authenticated)
export async function addTransaction(formData: TransactionFormData): Promise<Transaction> {
  const localId = generateUUID();
  let currentUser = CURRENT_USER;

  // Build local transaction object
  const newTx: Transaction = {
    id: localId,
    user_id: currentUser.id,
    type: formData.type,
    category: formData.category,
    description: formData.description || '',
    amount: Number(formData.amount),
    payment_method: formData.payment_method || 'UPI',
    payment_mode: formData.payment_method || 'UPI',
    notes: formData.notes || '',
    timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // 1. Immediately persist to localStorage for instant UI feedback and zero data loss
  const currentLocal = getLocalTransactions();
  const updatedLocal = [newTx, ...currentLocal];
  saveLocalTransactions(updatedLocal);

  // 2. If authenticated with Supabase, sync to cloud database
  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        newTx.user_id = authUser.id;

        // Exact Supabase table columns: id, user_id, type, category, description, payment_mode, amount, notes, timestamp
        const dbPayload = {
          user_id: authUser.id,
          type: newTx.type,
          category: newTx.category,
          description: newTx.description,
          payment_mode: newTx.payment_method || 'UPI',
          amount: newTx.amount,
          notes: newTx.notes,
          timestamp: newTx.timestamp,
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert([dbPayload])
          .select()
          .single();

        if (error) {
          console.error('[Supabase Insert Error]:', error.message, error);
          emitDBEvent('insert_error', `Cloud save failed (${error.message}). Saved locally on device.`, error);
        } else if (data) {
          const syncedTx = normalizeTransaction(data);
          // Update the local entry with the Supabase row ID and timestamps
          const reSyncedLocal = updatedLocal.map((t) => (t.id === newTx.id ? syncedTx : t));
          saveLocalTransactions(reSyncedLocal);
          return syncedTx;
        }
      }
    } catch (err: any) {
      console.error('[Supabase Insert Exception]:', err);
      emitDBEvent('insert_error', `Failed to connect to cloud database: ${err?.message || 'Network error'}. Saved locally.`, err);
    }
  }

  return newTx;
}

// 3. Bulk Add (for Excel/CSV Import)
export async function bulkAddTransactions(importedList: Transaction[]): Promise<Transaction[]> {
  if (!importedList.length) return [];

  const currentLocal = getLocalTransactions();
  const combinedLocal = [...importedList.map(normalizeTransaction), ...currentLocal];
  saveLocalTransactions(combinedLocal);

  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        const payload = importedList.map((t) => ({
          user_id: authUser.id,
          type: t.type,
          category: t.category,
          description: t.description || '',
          payment_mode: t.payment_method || t.payment_mode || 'UPI',
          amount: Number(t.amount),
          notes: t.notes || '',
          timestamp: t.timestamp,
        }));

        const { data, error } = await supabase
          .from('transactions')
          .insert(payload)
          .select();

        if (error) {
          console.error('[Supabase Bulk Insert Error]:', error.message, error);
          emitDBEvent('insert_error', `Cloud bulk save failed: ${error.message}. Saved locally.`, error);
        } else if (data) {
          const remoteNormalized = data.map(normalizeTransaction);
          const finalMerged = [...remoteNormalized, ...currentLocal];
          saveLocalTransactions(finalMerged);
          return remoteNormalized;
        }
      }
    } catch (err: any) {
      console.error('[Supabase Bulk Insert Exception]:', err);
    }
  }

  return importedList;
}

// 4. Update Transaction
export async function updateTransaction(id: string, formData: TransactionFormData): Promise<Transaction> {
  const updatedFields = {
    type: formData.type,
    category: formData.category,
    description: formData.description || '',
    amount: Number(formData.amount),
    payment_method: formData.payment_method || 'UPI',
    payment_mode: formData.payment_method || 'UPI',
    notes: formData.notes || '',
    timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
  };

  // Immediate local update
  const current = getLocalTransactions();
  const existing = current.find((t) => t.id === id);
  const updatedTx: Transaction = {
    id,
    user_id: existing?.user_id || CURRENT_USER.id,
    ...updatedFields,
    created_at: existing?.created_at || new Date().toISOString(),
  };

  const updatedList = current.map((tx) => (tx.id === id ? updatedTx : tx));
  saveLocalTransactions(updatedList);

  // Cloud update if authenticated
  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        const { data, error } = await supabase
          .from('transactions')
          .update({
            type: updatedFields.type,
            category: updatedFields.category,
            description: updatedFields.description,
            payment_mode: updatedFields.payment_mode,
            amount: updatedFields.amount,
            notes: updatedFields.notes,
            timestamp: updatedFields.timestamp,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('[Supabase Update Error]:', error.message, error);
        } else if (data) {
          return normalizeTransaction(data);
        }
      }
    } catch (err) {
      console.error('[Supabase Update Exception]:', err);
    }
  }

  return updatedTx;
}

// 5. Delete Transaction
export async function deleteTransaction(id: string): Promise<boolean> {
  // Immediate local delete
  const current = getLocalTransactions();
  const updated = current.filter((tx) => tx.id !== id);
  saveLocalTransactions(updated);

  // Cloud delete if authenticated
  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        const { error } = await supabase.from('transactions').delete().eq('id', id);
        if (error) {
          console.error('[Supabase Delete Error]:', error.message, error);
        }
      }
    } catch (err) {
      console.error('[Supabase Delete Exception]:', err);
    }
  }

  return true;
}

// 6. Clear All Transactions
export function clearAllTransactions(): Transaction[] {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

// 7. Calculate Summary KPIs
export function calculateSummaryStats(transactions: Transaction[]): SummaryStats {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      totalIncome += amt;
      incomeCount++;
    } else if (tx.type === 'expense') {
      totalExpense += amt;
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
      const authUser = await getAuthUser();
      if (authUser) {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', authUser.id);

        if (!error && data && data.length > 0) {
          const map: Record<string, number> = { ...DEFAULT_BUDGETS };
          data.forEach((b: any) => {
            map[b.category] = Number(b.monthly_budget);
          });
          return map;
        }
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
    window.dispatchEvent(new CustomEvent('expance:budget_updated', { detail: updated }));
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const authUser = await getAuthUser();
      if (authUser) {
        await supabase
          .from('budgets')
          .upsert(
            { user_id: authUser.id, category, monthly_budget: monthlyBudget },
            { onConflict: 'user_id,category' }
          );
      }
    } catch (err) {
      console.warn('Supabase budget upsert error:', err);
    }
  }
}

export async function saveOverallMonthlyBudget(amount: number): Promise<void> {
  await saveCategoryBudget('__TOTAL__', amount);
}

