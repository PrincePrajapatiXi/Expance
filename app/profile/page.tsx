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
import { supabase, isSupabaseConfigured, signOutUser } from '@/lib/supabaseClient';
import { triggerHaptic } from '@/lib/utils';
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
  LogOut,
} from 'lucide-react';

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

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
  const [authUser, setAuthUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTransactions().then(setTransactions);
    const p = getUserProfile();
    setProfile(p);
    setFormData(p);

    // Initial auth check
    if (isSupabaseConfigured) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          setAuthUser(data.user);
          const meta = data.user.user_metadata || {};
          const syncedProfile: UserProfile = {
            ...p,
            full_name: meta.full_name || meta.name || data.user.email?.split('@')[0] || p.full_name,
            email: data.user.email || p.email,
            avatar_url: meta.avatar_url || meta.picture || p.avatar_url,
          };
          saveUserProfile(syncedProfile);
          setProfile(syncedProfile);
          setFormData(syncedProfile);
        } else {
          setAuthUser(null);
        }
        setIsAuthLoading(false);
      }).catch(() => {
        setAuthUser(null);
        setIsAuthLoading(false);
      });

      // Listen to auth state changes (e.g. after Google OAuth redirect)
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setAuthUser(session.user);
          const meta = session.user.user_metadata || {};
          const syncedProfile: UserProfile = {
            ...getUserProfile(),
            full_name: meta.full_name || meta.name || session.user.email?.split('@')[0] || 'Google User',
            email: session.user.email || '',
            avatar_url: meta.avatar_url || meta.picture || '',
          };
          saveUserProfile(syncedProfile);
          setProfile(syncedProfile);
          setFormData(syncedProfile);
        } else {
          setAuthUser(null);
        }
        setIsAuthLoading(false);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    triggerHaptic(15);
    try {
      if (!isSupabaseConfigured) {
        setMessage('Supabase is not configured yet. Please configure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.');
        setTimeout(() => setMessage(null), 4000);
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      setMessage(err?.message || 'Google sign-in failed. Please try again.');
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleSignOut = async () => {
    triggerHaptic(15);
    try {
      await signOutUser();
      setAuthUser(null);
      saveUserProfile(DEFAULT_USER);
      setProfile(DEFAULT_USER);
      setFormData(DEFAULT_USER);
      setMessage('Successfully disconnected and signed out.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Sign Out failed:', err);
      setMessage('Failed to sign out. Please try again.');
      setTimeout(() => setMessage(null), 3000);
    }
  };

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
    <div className="w-full min-h-screen overflow-x-hidden overflow-y-auto pb-28 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        userProfile={profile}
        onProfileUpdate={setProfile}
      />

      <main className="max-w-4xl mx-auto w-full px-3 sm:px-4 lg:px-6 pt-2">
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

        {/* ============================================== */}
        {/* Supabase Cloud Authentication (Login / Logout) */}
        {/* ============================================== */}
        {!isAuthLoading && (
          authUser ? (
            /* B. IF LOGGED IN */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs mb-4 relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-indigo-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* User Google Profile Picture / Initials */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-400 to-indigo-600 p-0.5 shadow-sm shrink-0">
                    <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center text-white font-extrabold text-lg overflow-hidden">
                      {(authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || profile.avatar_url) ? (
                        <img
                          src={authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || profile.avatar_url}
                          alt={authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile.full_name || 'User'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{getInitials(authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile.full_name, authUser.email)}</span>
                      )}
                    </div>
                  </div>

                  {/* Full Name & Verified Email Address */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight truncate">
                        {authUser.user_metadata?.full_name || authUser.user_metadata?.name || profile.full_name || 'Google User'}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        Cloud Connected (Supabase)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {authUser.email || profile.email}
                    </p>
                  </div>
                </div>

                {/* Sign Out / Disconnect Button */}
                <button
                  onClick={handleSignOut}
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 font-bold text-xs transition-transform duration-100 ease-out active:scale-95 cursor-pointer shrink-0 select-none shadow-2xs"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out / Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* A. IF GUEST / NOT LOGGED IN */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-indigo-200/80 dark:border-indigo-900/50 shadow-xs mb-4 relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                        Cloud Sync & Backup
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 shrink-0">
                        Guest Mode
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                      Sign in with Google to sync your transactions across devices securely via Supabase.
                    </p>
                  </div>
                </div>

                {/* Continue with Google Action Button */}
                <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 border border-slate-300/80 dark:border-slate-700 shadow-sm transition-transform duration-100 ease-out active:scale-95 font-bold text-xs sm:text-sm cursor-pointer shrink-0 select-none"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )
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
