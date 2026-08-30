'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Mail,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithMagicLink,
  signInWithGoogle,
  isSupabaseConfigured,
} from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userProfile: any) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Mock fallback if user is in demo mode
        const mockProfile = {
          id: 'user-demo',
          email,
          full_name: fullName || email.split('@')[0],
          currency: 'INR',
        };
        onAuthSuccess(mockProfile);
        setSuccessMsg('Signed in successfully (Offline / Demo Mode).');
        setTimeout(() => onClose(), 1200);
        return;
      }

      if (tab === 'signin') {
        const { user } = await signInWithEmailPassword(email, password);
        if (user) {
          onAuthSuccess({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || email.split('@')[0],
            currency: 'INR',
          });
          onClose();
        }
      } else if (tab === 'signup') {
        const { user } = await signUpWithEmailPassword(email, password, fullName);
        if (user) {
          setSuccessMsg('Account created! Check your email inbox to confirm your account.');
          setTimeout(() => {
            onAuthSuccess({
              id: user.id,
              email: user.email,
              full_name: fullName,
              currency: 'INR',
            });
            onClose();
          }, 2000);
        }
      } else if (tab === 'magic') {
        await signInWithMagicLink(email);
        setSuccessMsg('Magic login link sent to your email address!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (!isSupabaseConfigured) {
        const mockProfile = {
          id: 'user-google-demo',
          email: 'google.user@example.com',
          full_name: 'Google User',
          currency: 'INR',
        };
        onAuthSuccess(mockProfile);
        onClose();
        return;
      }
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in error.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-900 via-indigo-800 to-blue-600 flex items-center justify-center text-white shadow-xs">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {tab === 'signin'
                      ? 'Sign In to Expance'
                      : tab === 'signup'
                      ? 'Create Account'
                      : 'Magic Link Sign In'}
                  </h3>
                  <p className="text-[10px] text-slate-500">Secure Supabase PostgreSQL Authentication</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Google OAuth Button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 my-3.5">
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                or email
              </span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  tab === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('magic');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                  tab === 'magic'
                    ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Magic Link
              </button>
            </div>

            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Prince Sharma"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {tab !== 'magic' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-xs font-medium pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    {tab === 'signin'
                      ? 'Sign In with Password'
                      : tab === 'signup'
                      ? 'Create Account'
                      : 'Send Magic Link'}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
