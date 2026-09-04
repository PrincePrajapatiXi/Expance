'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { parseTransactionFile, ImportResult } from '@/lib/import';
import { bulkAddTransactions } from '@/lib/db';
import { Transaction } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: Transaction[]) => void;
  initialFile?: File | null;
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  initialFile,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically parse if initialFile is passed
  useEffect(() => {
    if (isOpen && initialFile) {
      handleProcessFile(initialFile);
    }
  }, [isOpen, initialFile]);

  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const parseRes = await parseTransactionFile(selectedFile);
      if (parseRes.addedCount === 0 && parseRes.errors.length > 0) {
        setErrorMsg(parseRes.errors[0] || 'Could not find valid transactions in this file.');
      } else {
        setResult(parseRes);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err?.message || 'Failed to parse file. Please verify it is a valid CSV or Excel spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      handleProcessFile(droppedFile);
    }
  };

  const handleConfirmImport = async () => {
    if (!result || !result.transactions.length) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const added = await bulkAddTransactions(result.transactions);
      onImportSuccess(added);
      resetState();
      onClose();
    } catch (err: any) {
      console.error('Failed to import transactions:', err);
      setErrorMsg(err?.message || 'Failed to save imported records to database. Please check your Supabase connection or permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    setIsProcessing(false);
    setIsSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 my-auto relative overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                Import from Excel / CSV
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk upload past expenses and income spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetState();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="my-4 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls, .xlsm, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel.sheet.macroEnabled.12"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleProcessFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {/* State 1: Dropzone (when no file or result) */}
          {!result && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500/70 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {isProcessing ? (
                <div className="py-6 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Parsing and auto-detecting columns...
                  </p>
                  <p className="text-[11px] text-slate-400">Reading CSV / Excel records client-side</p>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-1">
                    Import from Excel / CSV
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
                    Upload your existing spreadsheet to bulk import past expenses and income.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      .csv
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      .xlsx
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      .xlsm
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      .xls
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                    Smart auto-detection matches Amount, Type, Description, Category, Date & Payment Mode headers
                  </p>
                </>
              )}
            </div>
          )}

          {/* State 2: Preview Summary & Transaction Preview */}
          {result && (
            <div className="space-y-3.5">
              {/* File Info Bar */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                      {file?.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetState}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  <RotateCcw className="w-3 h-3" /> Change File
                </button>
              </div>

              {/* Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-purple-50/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200/70 dark:border-indigo-900/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                      Found {result.addedCount} transactions to import
                    </span>
                  </div>
                  {result.summary.dateRange && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {result.summary.dateRange.start} ~ {result.summary.dateRange.end}
                    </span>
                  )}
                </div>

                {/* KPI badges */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Income</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                      +{formatCurrency(result.summary.totalIncome)} ({result.summary.incomeCount})
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Expenses</span>
                    </div>
                    <span className="text-xs font-extrabold text-rose-700 dark:text-rose-400">
                      -{formatCurrency(result.summary.totalExpense)} ({result.summary.expenseCount})
                    </span>
                  </div>
                </div>
              </div>

              {/* Extracted Transactions List Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Extracted Transactions ({result.transactions.length} items)
                  </span>
                  <span className="text-[10px] text-slate-400">Scroll to review all rows</span>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800 shadow-inner">
                  {result.transactions.map((tx, idx) => (
                    <div key={tx.id || idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                              tx.type === 'income'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {tx.type}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {tx.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>{tx.category}</span>
                          <span>•</span>
                          <span>{tx.timestamp.substring(0, 10)}</span>
                          <span>•</span>
                          <span>{tx.payment_method}</span>
                        </div>
                      </div>
                      <div
                        className={`font-extrabold text-xs shrink-0 text-right ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skipped rows warning if any */}
              {result.errors.length > 0 && (
                <div className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60">
                  ⚠️ Note: {result.errors.length} row(s) were skipped due to zero or missing amount values.
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              resetState();
              onClose();
            }}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {result && result.transactions.length > 0 ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Confirm Import ({result.transactions.length})
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Select File
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
