'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DesktopNav from '@/components/DesktopNav';
import BottomNav from '@/components/BottomNav';
import ImportModal from '@/components/ImportModal';
import { Transaction, UserProfile } from '@/lib/types';
import { fetchTransactions, clearAllTransactions, getUserProfile, saveUserProfile, DEFAULT_USER } from '@/lib/db';
import {
  exportTransactionsToPDF,
  exportTransactionsToExcel,
  exportTransactionsToCSV,
} from '@/lib/export';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  User,
  Download,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  Database,
  Trash2,
  CheckCircle,
  ShieldCheck,
  Globe,
  Coins,
  Smartphone,
  Save,
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function ProfilePage() {
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER);
  const [formData, setFormData] = useState<UserProfile>(DEFAULT_USER);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTransactions().then(setTransactions);
    const p = getUserProfile();
    setProfile(p);
    setFormData(p);
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile(formData);
    setProfile(formData);
    setIsEditingProfile(false);
    setMessage('Profile settings saved successfully!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportPDF = async () => {
    if (transactions.length === 0) {
      setMessage('No transactions available to export as PDF.');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setIsExporting(true);
    try {
      await exportTransactionsToPDF(transactions, selectedMonth, profile);
      setMessage('Downloaded colorful PDF statement.');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      setMessage('Failed to generate PDF. Please try again.');
      setTimeout(() => setMessage(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (transactions.length === 0) {
      setMessage('No transactions available to export as Excel.');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setIsExporting(true);
    try {
      await exportTransactionsToExcel(transactions, selectedMonth, profile);
      setMessage('Downloaded richly formatted Excel workbook (.xlsx).');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error('Excel export failed:', err);
      setMessage('Failed to generate Excel file. Please try again.');
      setTimeout(() => setMessage(null), 3500);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      setMessage('No transactions available to export as CSV.');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      exportTransactionsToCSV(transactions, selectedMonth);
      setMessage('Exported raw transactions ledger to CSV file.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('CSV export failed:', err);
      setMessage('Failed to generate CSV file.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImportSuccess = (imported: Transaction[]) => {
    setTransactions((prev) => [...imported, ...prev]);
    setMessage(`Successfully imported ${imported.length} transactions!`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all transaction records?')) {
      const reset = clearAllTransactions();
      setTransactions(reset);
      setMessage('All transaction history cleared successfully.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Calculate initials
  const getInitials = (name?: string, email?: string): string => {
    const trimmed = name?.trim();
    if (trimmed) {
      const parts = trimmed.split(/\s+/).filter(Boolean);
      if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (email && email.length >= 2) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'EX';
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24">
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        userProfile={profile}
        onProfileUpdate={setProfile}
      />

      <main className="max-w-4xl mx-auto w-full max-w-full overflow-x-hidden px-3 sm:px-4 lg:px-6 pt-2">
        <DesktopNav onQuickAdd={() => {}} />

        <div className="my-2">
          <h2 className="text-xl font-extrabold tracking-tight">Account & Data Management</h2>
          <p className="text-xs text-slate-500">Manage profile, styled statements, cloud database sync, and backup</p>
        </div>

        {message && (
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-semibold text-xs my-3 flex items-center gap-2 border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {message}
          </div>
        )}

        {/* Profile Card / Editor */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-600 p-0.5 shadow-md shrink-0">
                <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center text-white font-extrabold text-xl overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{getInitials(profile.full_name, profile.email)}</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {profile.full_name}
                </h3>
                <p className="text-xs text-slate-500">{profile.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                    <ShieldCheck className="w-3 h-3" /> Multi-User RLS Active
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                    {profile.currency || 'INR'} Currency
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              {isEditingProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {/* Edit Profile Form */}
          {isEditingProfile && (
            <form onSubmit={handleSaveProfile} className="mt-4 pt-2 space-y-3.5 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Profile Picture URL (Optional)
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formData.avatar_url || ''}
                    onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              </div>

              <div id="currency">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Currency Preference
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-semibold p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                  <option value="AED">AED - UAE Dirham</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save Profile
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Styled PDF & Rich Excel Export Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Export Financial Statements & Data
                </h3>
                <p className="text-xs text-slate-500">Download colorful PDF statements, styled Excel workbooks, or CSV</p>
              </div>
            </div>

            {/* Quick Import Modal Trigger */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer"
              title="Bulk import transactions from Excel or CSV"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Export to PDF (Red/Rose accent theme) */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="p-4 rounded-2xl bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-extrabold text-xs flex items-center justify-between border border-rose-200/70 dark:border-rose-800/80 transition-all cursor-pointer hover:shadow-md hover:shadow-rose-500/10 active:scale-[0.98] text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-200/70 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-rose-950 dark:text-rose-100">
                    Export to PDF
                  </span>
                  <span className="block text-[10px] text-rose-700 dark:text-rose-300/90 font-medium mt-0.5">
                    Download colorful statement
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 ml-1 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Card 2: Export to Excel (Emerald green theme) */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-extrabold text-xs flex items-center justify-between border border-emerald-200/70 dark:border-emerald-800/80 transition-all cursor-pointer hover:shadow-md hover:shadow-emerald-500/10 active:scale-[0.98] text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-200/70 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-emerald-950 dark:text-emerald-100">
                    Export to Excel (.xlsx)
                  </span>
                  <span className="block text-[10px] text-emerald-700 dark:text-emerald-300/90 font-medium mt-0.5">
                    Formatted workbook with summary
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {/* Card 3: Export to CSV (Cyan/Blue theme) */}
            <button
              onClick={handleExportCSV}
              className="p-4 rounded-2xl bg-sky-50 hover:bg-sky-100/90 dark:bg-sky-950/40 dark:hover:bg-sky-950/60 text-sky-900 dark:text-sky-200 font-extrabold text-xs flex items-center justify-between border border-sky-200/70 dark:border-sky-800/80 transition-all cursor-pointer hover:shadow-md hover:shadow-sky-500/10 active:scale-[0.98] text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-200/70 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 group-hover:scale-110 transition-transform">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-sky-950 dark:text-sky-100">
                    Export to CSV
                  </span>
                  <span className="block text-[10px] text-sky-700 dark:text-sky-300/90 font-medium mt-0.5">
                    Raw comma-separated data
                  </span>
                </div>
              </div>
              <Download className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 ml-1 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Database Status & Cloud Sync Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Cloud Database & Sync Engine
              </h3>
              <p className="text-xs text-slate-500">Supabase PostgreSQL Connection & Data Reset</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Database Provider
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {isSupabaseConfigured
                  ? 'Supabase PostgreSQL (Connected)'
                  : 'Local Storage / Device Mode (Ready for Supabase)'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Progressive Web App (PWA)
                </span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                Enabled (Offline view ready)
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={handleClearData}
                className="w-full py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-extrabold text-xs border border-rose-200/80 dark:border-rose-900/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Clear All Transactions
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <BottomNav />
    </div>
  );
}
