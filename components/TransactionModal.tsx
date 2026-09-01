'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Calendar, Tag, FileText, IndianRupee, CreditCard, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { transactionSchema, TransactionFormData, Transaction, PaymentMethod } from '@/lib/types';
import { CATEGORIES, toDateTimeLocalFormat } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => void;
  editingTransaction?: Transaction | null;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  editingTransaction,
}: TransactionModalProps) {
  const isEditing = Boolean(editingTransaction);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'income',
      category: 'Salary / Wages',
      amount: undefined,
      description: '',
      payment_method: 'UPI',
      notes: '',
      timestamp: toDateTimeLocalFormat(new Date()),
    },
  });

  const selectedType = watch('type');
  const selectedCategory = watch('category');
  const selectedPaymentMethod = watch('payment_method') || 'UPI';

  // Populate form values when editing
  useEffect(() => {
    if (editingTransaction) {
      reset({
        type: editingTransaction.type,
        category: editingTransaction.category,
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        payment_method: editingTransaction.payment_method || 'UPI',
        notes: editingTransaction.notes || '',
        timestamp: toDateTimeLocalFormat(editingTransaction.timestamp),
      });
    } else {
      reset({
        type: 'income',
        category: 'Salary / Wages',
        amount: undefined,
        description: '',
        payment_method: 'UPI',
        notes: '',
        timestamp: toDateTimeLocalFormat(new Date()),
      });
    }
  }, [editingTransaction, reset, isOpen]);

  const handleFormSubmit = (data: TransactionFormData) => {
    onSubmit(data);
    onClose();
  };

  // Filter categories matching current type
  const availableCategories = CATEGORIES.filter(
    (c) => c.type === 'both' || c.type === selectedType
  );

  const paymentModes: { id: PaymentMethod; label: string }[] = [
    { id: 'UPI', label: '📱 UPI' },
    { id: 'Cash', label: '💵 Cash' },
    { id: 'Card', label: '💳 Card' },
    { id: 'Net Banking', label: '🏦 Net Banking' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Plus className="w-5 h-5" />
                </span>
                {isEditing ? 'Edit Transaction' : 'Quick Add Transaction'}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-4">
              {/* Type Switcher: 1st Position: Income (+) [Emerald], 2nd Position: Expense (-) [Rose] */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                  {/* Option 1 (Left): Income (+) */}
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'income');
                      setValue('category', 'Salary / Wages');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedType === 'income'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Income (+)
                  </button>

                  {/* Option 2 (Right): Expense (-) */}
                  <button
                    type="button"
                    onClick={() => {
                      setValue('type', 'expense');
                      setValue('category', 'Food & Dining');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      selectedType === 'expense'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-white/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Expense (-)
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Amount (₹ INR)
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-sm">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('amount', { valueAsNumber: true })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 text-base font-extrabold text-slate-900 dark:text-slate-100 rounded-2xl pl-9 pr-4 py-3 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    required
                  />
                </div>
                {errors.amount && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Description / Title
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={selectedType === 'income' ? 'e.g. Monthly Salary, Freelance project' : 'e.g. Grocery shopping, Electricity bill'}
                    {...register('description')}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 rounded-2xl pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    required
                  />
                </div>
                {errors.description && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Payment Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {paymentModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setValue('payment_method', mode.id)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedPaymentMethod === mode.id
                          ? 'bg-indigo-900 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-200/60 dark:border-slate-800 rounded-2xl">
                  {availableCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setValue('category', cat.name)}
                      className={`p-2 rounded-xl text-left text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                        selectedCategory === cat.name
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                          : 'border-transparent bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="truncate text-[11px]">{cat.name}</span>
                    </button>
                  ))}
                </div>
                {errors.category && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500" /> Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Project milestone #1, shared with friend"
                  {...register('notes')}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 rounded-2xl px-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Timestamp Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Date & Time
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="datetime-local"
                    {...register('timestamp')}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-slate-100 rounded-2xl pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                {errors.timestamp && (
                  <p className="text-rose-600 text-[11px] font-semibold mt-1">
                    {errors.timestamp.message}
                  </p>
                )}
              </div>

              {/* Form Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-sm transition-all shadow-lg shadow-indigo-900/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
