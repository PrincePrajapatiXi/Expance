'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SummaryStats } from '@/lib/types';
import { formatINR } from '@/lib/utils';

interface KPICardsProps {
  stats: SummaryStats;
}

export default function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 min-w-0 select-none">
      {/* Total Income Card */}
      <div
        className="rounded-2xl p-4 shadow-sm transition-transform duration-100 ease-out active:scale-95 border border-emerald-200/60 cursor-pointer"
        style={{ backgroundColor: '#DCFCE7' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-200/80 text-emerald-900">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
              Total Income
            </span>
          </div>
          <span
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200/80"
            style={{ color: '#166534' }}
          >
            <ArrowUpRight className="w-3 h-3" /> {stats.incomeCount} TX
          </span>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#166534' }}>
            {formatINR(stats.totalIncome)}
          </h2>
          <p className="text-[11px] font-medium text-emerald-800/80 mt-0.5">
            Total income logged this period
          </p>
        </div>
      </div>

      {/* Total Expense Card */}
      <div
        className="rounded-2xl p-4 shadow-sm transition-transform duration-100 ease-out active:scale-95 border border-rose-200/60 cursor-pointer"
        style={{ backgroundColor: '#FEE2E2' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-200/80 text-rose-900">
              <TrendingDown className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Total Expense
            </span>
          </div>
          <span
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200/80"
            style={{ color: '#991B1B' }}
          >
            <ArrowDownRight className="w-3 h-3" /> {stats.expenseCount} TX
          </span>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#991B1B' }}>
            {formatINR(stats.totalExpense)}
          </h2>
          <p className="text-[11px] font-medium text-rose-800/80 mt-0.5">
            Total expense logged this period
          </p>
        </div>
      </div>

      {/* Net Balance Card */}
      <div
        className="rounded-2xl p-4 shadow-sm transition-transform duration-100 ease-out active:scale-95 text-white border border-indigo-900/20 cursor-pointer"
        style={{ backgroundColor: '#1E3A8A' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/15 text-white">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">
              Net Balance
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white">
            {stats.netBalance >= 0 ? 'Surplus' : 'Deficit'}
          </span>
        </div>
        <div className="mt-3">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {formatINR(stats.netBalance)}
          </h2>
          <p className="text-[11px] font-medium text-indigo-200 mt-0.5">
            Calculated Net Cash Flow (INR ₹)
          </p>
        </div>
      </div>
    </div>
  );
}
