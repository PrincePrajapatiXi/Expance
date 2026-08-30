'use client';

import React from 'react';
import { Receipt, ArrowLeftRight } from 'lucide-react';
import { Transaction } from '@/lib/types';
import TransactionCard from './TransactionCard';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onAddNew?: () => void;
}

export default function TransactionList({
  transactions,
  onEdit,
  onDelete,
  onAddNew,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200/80 dark:border-slate-800 my-6 shadow-xs flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50 dark:ring-indigo-950/30">
          <Receipt className="w-8 h-8" strokeWidth={1.75} />
        </div>
        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100">
          No transactions yet
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto mt-1.5 leading-relaxed">
          Tap the + button below to log your first income or expense.
        </p>
      </div>
    );
  }

  return (
    <div className="my-3">
      {/* Mobile Swipe Hint Banner */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2 px-1">
        <span>Recent Activity ({transactions.length})</span>
        <span className="inline-flex items-center gap-1 sm:hidden text-[10px]">
          <ArrowLeftRight className="w-3 h-3 text-indigo-500" /> Swipe right to Edit, left to Delete
        </span>
      </div>

      {/* Transaction Feed */}
      <div className="space-y-1">
        {transactions.map((tx) => (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
