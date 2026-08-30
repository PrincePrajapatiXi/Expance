'use client';

import React from 'react';
import { X, Bell, Check, AlertCircle, Info } from 'lucide-react';
import { NotificationItem } from '@/lib/types';

interface NotificationModalProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllAsRead: () => void;
}

export default function NotificationModal({
  notifications,
  onClose,
  onMarkAllAsRead,
}: NotificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-xs text-slate-500">Alerts & Monthly Digest</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-3 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.read
                  ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'
                  : 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50'
              }`}
            >
              <div className="flex items-start gap-3">
                {item.type === 'alert' ? (
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                ) : item.type === 'success' ? (
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-sky-100 text-sky-700 shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onMarkAllAsRead}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Mark all as read
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
