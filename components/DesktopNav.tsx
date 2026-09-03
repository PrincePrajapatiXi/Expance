'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart, LayoutGrid, User, Download } from 'lucide-react';

interface DesktopNavProps {
  onQuickAdd: () => void;
}

export default function DesktopNav({ onQuickAdd }: DesktopNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: Home },
    { label: 'Analytics & Charts', href: '/analytics', icon: PieChart },
    { label: 'Categories', href: '/categories', icon: LayoutGrid },
    { label: 'Profile & Export', href: '/profile', icon: User },
  ];

  return (
    <div className="hidden sm:flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200/80 dark:border-slate-800 my-4 shadow-2xs">
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-transform duration-100 ease-out active:scale-95 select-none flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
