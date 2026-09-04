'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, TransactionFormData } from '@/lib/types';
import {
  fetchTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  syncLocalTransactionsToSupabase,
  getLocalTransactions,
  DBEventDetail,
} from '@/lib/db';
import { supabase, isSupabaseConfigured, getAuthUser } from '@/lib/supabaseClient';

export interface ToastNotification {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeDateFilter, setActiveDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Subtle auto-dismissing toast (2.5s)
  const showToast = useCallback(
    (message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info', durationMs = 2500) => {
      const id = Date.now();
      setToast({ id, message, type });

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      if (durationMs > 0) {
        toastTimerRef.current = setTimeout(() => {
          setToast(null);
        }, durationMs);
      }
    },
    []
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(null);
  }, []);

  // Refetch / load transactions from local storage and DB
  const loadData = useCallback(async () => {
    const immediateLocal = getLocalTransactions();
    if (immediateLocal.length > 0) {
      setTransactions(immediateLocal);
    }

    try {
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (err: any) {
      console.warn('[Sync] Offline or fetch failed, using local storage:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Supabase Auth changes & Quiet Auto-Sync
  useEffect(() => {
    loadData();

    if (isSupabaseConfigured && supabase) {
      getAuthUser().then((user) => {
        setIsAuthenticated(Boolean(user));
        if (user) {
          syncLocalTransactionsToSupabase(user.id).then((synced) => {
            setTransactions(synced);
          });
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setIsAuthenticated(true);
            if (event === 'SIGNED_IN') {
              setSyncing(true);
              try {
                const synced = await syncLocalTransactionsToSupabase(session.user.id);
                setTransactions(synced);
              } catch (err: any) {
                console.error('[Supabase Sync]:', err);
              } finally {
                setSyncing(false);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setTransactions(getLocalTransactions());
          }
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [loadData]);

  // Real-time synchronization across tabs and components
  useEffect(() => {
    const handleTxUpdate = async (event: any) => {
      const detail = event?.detail;
      const txs = Array.isArray(detail)
        ? detail
        : Array.isArray(detail?.transactions)
        ? detail.transactions
        : null;

      if (txs) {
        setTransactions(txs);
      } else {
        // Re-read / refetch immediately
        await loadData();
      }

      // Show success toast notification if imported
      if (detail?.importedCount) {
        showToast(`Imported ${detail.importedCount} transactions successfully!`, 'success', 3500);
      }

      // Check if imported rows contain dates outside the currently active month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const listToCheck = txs || getLocalTransactions();

      const hasOutOfMonth =
        detail?.resetToAllTime ||
        detail?.hasOutOfMonthDates ||
        listToCheck.some((tx: any) => {
          const m = (tx.timestamp || '').substring(0, 7);
          return m && m !== currentMonth;
        });

      if (hasOutOfMonth) {
        setActiveDateFilter('all');
        setSelectedMonth('');
      }
    };

    window.addEventListener('expance:transactions_updated', handleTxUpdate);
    window.addEventListener('storage', handleTxUpdate);

    return () => {
      window.removeEventListener('expance:transactions_updated', handleTxUpdate);
      window.removeEventListener('storage', handleTxUpdate);
    };
  }, [loadData, showToast]);

  // Add Transaction Handler
  const addNewTransaction = async (formData: TransactionFormData): Promise<Transaction> => {
    try {
      const created = await addTransaction(formData);
      setTransactions((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      showToast('Transaction added successfully.', 'success', 2500);
      return created;
    } catch (err: any) {
      console.error('Failed to add transaction:', err);
      showToast('Saved locally. Cloud sync offline.', 'info', 2500);
      throw err;
    }
  };

  // Edit Transaction Handler
  const editExistingTransaction = async (id: string, formData: TransactionFormData): Promise<Transaction> => {
    try {
      const updated = await updateTransaction(id, formData);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showToast('Transaction updated.', 'success', 2500);
      return updated;
    } catch (err: any) {
      console.error('Failed to update transaction:', err);
      showToast('Updated locally.', 'info', 2500);
      throw err;
    }
  };

  // Delete Transaction Handler
  const removeTransaction = async (id: string): Promise<boolean> => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      showToast('Transaction deleted.', 'info', 2500);
      return true;
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
      return false;
    }
  };

  return {
    transactions,
    loading,
    syncing,
    isAuthenticated,
    toast,
    dismissToast,
    showToast,
    addNewTransaction,
    editExistingTransaction,
    removeTransaction,
    refetch: loadData,
    refreshTransactions: loadData,
    activeDateFilter,
    setActiveDateFilter,
    selectedMonth,
    setSelectedMonth,
  };
}
