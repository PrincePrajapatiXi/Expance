'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Initial load
  const loadData = useCallback(async () => {
    // 1. Immediately populate from local storage to avoid blank UI
    const immediateLocal = getLocalTransactions();
    if (immediateLocal.length > 0) {
      setTransactions(immediateLocal);
    }

    // 2. Fetch latest from Hybrid Engine (Supabase if authenticated, else localStorage)
    try {
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (err: any) {
      console.warn('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for DB and Supabase events
  useEffect(() => {
    const handleDbEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DBEventDetail>;
      if (!customEvent.detail) return;
      const { type, message } = customEvent.detail;
      if (type === 'insert_error' || type === 'sync_error') {
        showToast(message, 'warning');
      } else if (type === 'sync_success') {
        showToast(message, 'success');
        // Refresh local state with newly synced data
        setTransactions(getLocalTransactions());
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('expance:db_event', handleDbEvent);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('expance:db_event', handleDbEvent);
      }
    };
  }, [showToast]);

  // Handle Supabase Auth changes & Auto-Sync Local Data
  useEffect(() => {
    loadData();

    if (isSupabaseConfigured && supabase) {
      getAuthUser().then((user) => {
        setIsAuthenticated(Boolean(user));
        if (user) {
          // Check and auto-sync any pending local transactions
          syncLocalTransactionsToSupabase(user.id).then((synced) => {
            setTransactions(synced);
          });
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setIsAuthenticated(true);
            setSyncing(true);
            try {
              // User just logged in / signed up -> Auto-migrate local storage data to Supabase!
              const synced = await syncLocalTransactionsToSupabase(session.user.id);
              setTransactions(synced);
              showToast('Account connected! Synced transactions with cloud.', 'success');
            } catch (err: any) {
              console.error('Auto-sync failed on login:', err);
              showToast('Signed in, but cloud sync encountered an issue.', 'warning');
            } finally {
              setSyncing(false);
            }
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            // On sign out, preserve local transactions
            setTransactions(getLocalTransactions());
            showToast('Logged out. Using local device storage.', 'info');
          }
        }
      );

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, [loadData, showToast]);

  // Add Transaction Handler
  const addNewTransaction = async (formData: TransactionFormData): Promise<Transaction> => {
    try {
      const created = await addTransaction(formData);
      setTransactions((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      return created;
    } catch (err: any) {
      showToast('Failed to add transaction: ' + (err.message || 'Unknown error'), 'error');
      throw err;
    }
  };

  // Edit Transaction Handler
  const editExistingTransaction = async (id: string, formData: TransactionFormData): Promise<Transaction> => {
    try {
      const updated = await updateTransaction(id, formData);
      setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    } catch (err: any) {
      showToast('Failed to update transaction: ' + (err.message || 'Unknown error'), 'error');
      throw err;
    }
  };

  // Delete Transaction Handler
  const removeTransaction = async (id: string): Promise<boolean> => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err: any) {
      showToast('Failed to delete transaction: ' + (err.message || 'Unknown error'), 'error');
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
    refreshTransactions: loadData,
  };
}
