'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { parseTransactionFile, ImportResult } from '@/lib/import';
import { bulkAddTransactions } from '@/lib/db';
import { Transaction } from '@/lib/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: Transaction[]) => void;
}

export default function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const parseRes = await parseTransactionFile(selectedFile);
      setResult(parseRes);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read file. Please ensure it is a valid CSV or Excel file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!result || !result.transactions.length) return;
    setIsProcessing(true);
    try {
      const added = await bulkAddTransactions(result.transactions);
      onImportSuccess(added);
      onClose();
    } catch (err: any) {
      setErrorMsg('Failed to save imported records.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Import Transactions
                  </h3>
                  <p className="text-[11px] text-slate-500">Bulk upload from CSV or Excel (.xlsx)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="my-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
                }}
                className="hidden"
              />

              {!result ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                    Click to select CSV or XLSX file
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    Supports Date, Category, Description, Type, Amount, Payment Mode, and Notes columns.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                        {file?.name}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3 h-3" /> {result.addedCount} ready
                    </span>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl">
                      ⚠️ {result.errors.length} rows skipped due to invalid amounts or format.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={resetState}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer block"
                  >
                    Choose another file
                  </button>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetState();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              {result && result.transactions.length > 0 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Import {result.transactions.length} Transactions
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
