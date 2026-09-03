'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  Wallet,
  Check,
  Sparkles,
  User,
  Settings,
  Coins,
  LogOut,
  LogIn,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem, UserProfile } from '@/lib/types';
import { getUserProfile, saveUserProfile, DEFAULT_USER } from '@/lib/db';
import { supabase, isSupabaseConfigured, signOutUser, getAuthUser } from '@/lib/supabase';
import { triggerHaptic } from '@/lib/utils';
import NotificationModal from './NotificationModal';
import MonthPickerPopover from './MonthPickerPopover';
import AuthModal from './AuthModal';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  userProfile?: UserProfile;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export default function Header({
  selectedMonth,
  onMonthChange,
  userProfile: propUserProfile,
  onProfileUpdate,
}: HeaderProps) {
  const [profile, setProfile] = useState<UserProfile>(propUserProfile || DEFAULT_USER);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propUserProfile) {
      setProfile(propUserProfile);
    } else {
      const stored = getUserProfile();
      setProfile(stored);
    }
  }, [propUserProfile]);

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    if (isSupabaseConfigured) {
      getAuthUser().then((user) => {
        if (user) {
          setIsAuthenticated(true);
          const authProf: UserProfile = {
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            currency: 'INR',
            avatar_url: user.user_metadata?.avatar_url || '',
          };
          setProfile(authProf);
          saveUserProfile(authProf);
          if (onProfileUpdate) onProfileUpdate(authProf);
        }
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setIsAuthenticated(true);
            const user = session.user;
            const authProf: UserProfile = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              currency: 'INR',
              avatar_url: user.user_metadata?.avatar_url || '',
            };
            setProfile(authProf);
            saveUserProfile(authProf);
            if (onProfileUpdate) onProfileUpdate(authProf);
          } else if (event === 'SIGNED_OUT') {
            setIsAuthenticated(false);
            setProfile(DEFAULT_USER);
          }
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [onProfileUpdate]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n1',
      title: 'Welcome to Expance',
      message: 'Cloud Database & Auth sync enabled.',
      timestamp: 'Just now',
      read: false,
      type: 'info',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Helper to dynamically calculate initials from name or email
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

  // Currency selection handler
  const handleSelectCurrency = (curr: string) => {
    const updated: UserProfile = { ...profile, currency: curr };
    setProfile(updated);
    saveUserProfile(updated);
    if (onProfileUpdate) onProfileUpdate(updated);
    setShowCurrencyModal(false);
    setIsUserMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await signOutUser();
    setIsAuthenticated(false);
    setProfile(DEFAULT_USER);
    saveUserProfile(DEFAULT_USER);
    if (onProfileUpdate) onProfileUpdate(DEFAULT_USER);
  };

  const handleAuthSuccess = (authUserProfile: UserProfile) => {
    setIsAuthenticated(true);
    setProfile(authUserProfile);
    saveUserProfile(authUserProfile);
    if (onProfileUpdate) onProfileUpdate(authUserProfile);
  };

  const displayName = isAuthenticated
    ? profile.full_name || 'Account Holder'
    : 'Guest User';
  const displayEmail = isAuthenticated
    ? profile.email || ''
    : 'Local Storage Mode';
  const initials = isAuthenticated
    ? getInitials(profile.full_name, profile.email)
    : 'G';

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 min-w-0">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-900 via-indigo-800 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/20 group-hover:scale-105 transition-transform">
              <Wallet className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
                  Expance
                </h1>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                  <Sparkles className="w-2.5 h-2.5" /> PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block">
                Personal Expense & Income Tracker
              </p>
            </div>
          </Link>

          {/* Month Selector, Notifications & User Avatar */}
          <div className="flex items-center gap-2">
            {/* Modern Month & Year Popover Picker */}
            <MonthPickerPopover
              selectedMonth={selectedMonth}
              onMonthChange={onMonthChange}
            />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setShowNotifications(true);
                }}
                type="button"
                className="relative p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 transition-transform duration-100 ease-out hover:scale-105 active:scale-90 cursor-pointer select-none"
                aria-label="View notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Dynamic User Profile Avatar Button & Floating Dropdown */}
            <div className="relative pl-1" ref={menuRef}>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  setIsUserMenuOpen((prev) => !prev);
                }}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/60 transition-transform duration-100 ease-out cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/60 active:scale-90 select-none"
                aria-label="User profile menu"
                aria-expanded={isUserMenuOpen}
                title="Account & Profile Settings"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-600 p-0.5 shadow-sm">
                  <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center text-white font-extrabold text-xs overflow-hidden">
                    {isAuthenticated && profile.avatar_url && !imgError ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Floating User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-72 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Header Tile */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 mb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-indigo-600 p-0.5 shadow-xs shrink-0">
                        <div className="w-full h-full rounded-full bg-indigo-900 flex items-center justify-center text-white font-extrabold text-xs overflow-hidden">
                          {isAuthenticated && profile.avatar_url && !imgError ? (
                            <img
                              src={profile.avatar_url}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={() => setImgError(true)}
                            />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                        {profile.currency || 'INR'} (₹)
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isAuthenticated
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {isAuthenticated ? 'Cloud Synced' : 'Guest / Local'}
                      </span>
                    </div>
                  </div>

                  {/* Menu Action Options */}
                  <div className="space-y-1 py-1">
                    {!isAuthenticated && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowAuthModal(true);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-2xl transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <LogIn className="w-4 h-4" />
                          <span>Sign In / Connect Supabase</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Profile & Export Settings</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setShowCurrencyModal(true);
                      }}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Currency Preferences</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                        {profile.currency || 'INR'}
                      </span>
                    </button>
                  </div>

                  {/* Logout Action Divider */}
                  <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isAuthenticated ? 'Sign Out / Log Out' : 'Reset Guest Session'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Currency Preferences Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xs w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                Select Currency
              </h3>
              <button
                onClick={() => setShowCurrencyModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="py-3 space-y-2">
              {[
                { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
                { code: 'USD', symbol: '$', label: 'US Dollar' },
                { code: 'EUR', symbol: '€', label: 'Euro' },
                { code: 'GBP', symbol: '£', label: 'British Pound' },
                { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
              ].map((c) => (
                <button
                  key={c.code}
                  onClick={() => handleSelectCurrency(c.code)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    profile.currency === c.code
                      ? 'bg-indigo-900 text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.symbol}</span>
                    <span>{c.label}</span>
                  </div>
                  {profile.currency === c.code && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Notifications Modal Component */}
      {showNotifications && (
        <NotificationModal
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </>
  );
}
