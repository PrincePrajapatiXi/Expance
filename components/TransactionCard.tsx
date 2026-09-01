'use client';

import React, { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Trash2, Edit2, Clock } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { formatINR, format12HourDateTime, getCategoryMeta } from '@/lib/utils';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionCard({
  transaction,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const [dragX, setDragX] = useState(0);
  const meta = getCategoryMeta(transaction.category);
  const isIncome = transaction.type === 'income';

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -80) {
      // Swiped left far enough -> Trigger Delete
      onDelete(transaction.id);
    } else if (info.offset.x > 80) {
      // Swiped right far enough -> Trigger Edit
      onEdit(transaction);
    }
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2.5 touch-pan-y group">
      {/* Action Backgrounds revealed during swipe */}
      <div className="absolute inset-0 flex items-center justify-between px-5 font-bold text-xs text-white rounded-2xl select-none">
        {/* Swipe Right Background (Edit) */}
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <Edit2 className="w-4 h-4" />
          <span>Edit</span>
        </div>

        {/* Swipe Left Background (Delete) */}
        <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
          <span>Delete</span>
          <Trash2 className="w-4 h-4" />
        </div>
      </div>

      {/* Draggable Card Surface */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDrag={(e, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition-shadow flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing"
      >
        {/* Left Side: Category Icon + Description & Time */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Rounded category icon background */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${meta.bgLight} ${meta.textDark} shadow-2xs`}
          >
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                {transaction.description}
              </h3>
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                {transaction.category}
              </span>
              {transaction.payment_method && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    {transaction.payment_method}
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-700 text-[10px]">•</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                <Clock className="w-3 h-3" />
                {format12HourDateTime(transaction.timestamp)}
              </span>
            </div>
            {transaction.notes && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 italic">
                📝 {transaction.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Amount & Desktop Quick Actions */}
        <div className="flex items-center gap-2 shrink-0 text-right">
          <div>
            <span
              className={`block font-extrabold text-sm sm:text-base tracking-tight ${
                isIncome
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatINR(transaction.amount)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {transaction.type}
            </span>
          </div>

          {/* Action buttons visible on desktop / hover */}
          <div className="hidden sm:flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity ml-1">
            <button
              onClick={() => onEdit(transaction)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Edit Transaction"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(transaction.id)}
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors"
              title="Delete Transaction"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
