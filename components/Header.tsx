'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Wallet,
} from 'lucide-react';
import { NotificationItem, UserProfile } from '@/lib/types';
import { triggerHaptic } from '@/lib/utils';
import NotificationModal from './NotificationModal';
import MonthPickerPopover from './MonthPickerPopover';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  userProfile?: UserProfile;
  onProfileUpdate?: (updated: UserProfile) => void;
}

export default function Header({
  selectedMonth,
  onMonthChange,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);

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

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 pl-3.5 pr-4 sm:px-6 py-2.5 sm:py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 min-w-0 w-full">
          {/* Logo & Brand (No PRO badge) */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-900 via-indigo-800 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/20 group-hover:scale-105 transition-transform">
              <Wallet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none">
                Expance
              </h1>
              <p className="text-[11px] font-medium text-slate-500 hidden sm:block mt-0.5">
                Personal Expense & Income Tracker
              </p>
            </div>
          </Link>

          {/* Month Selector & Notifications with clean padding and edge spacing */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 pl-1">
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
          </div>
        </div>
      </header>

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

