'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Transaction } from '@/lib/types';
import { formatINR, getCategoryMeta } from '@/lib/utils';
import { PieChart as PieIcon, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';

interface ChartsSectionProps {
  transactions: Transaction[];
}

export default function ChartsSection({ transactions }: ChartsSectionProps) {
  // 1. Prepare Category Expense Breakdown Data for Donut Chart
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpenseSum = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);

  const categoryMap: Record<string, number> = {};
  expenseTransactions.forEach((t) => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  });

  const pieData = Object.entries(categoryMap).map(([category, amount]) => {
    const meta = getCategoryMeta(category);
    return {
      name: category,
      value: amount,
      color: meta.colorHex,
      percentage: totalExpenseSum > 0 ? ((amount / totalExpenseSum) * 100).toFixed(1) : '0',
    };
  });

  // Sort largest expense first
  pieData.sort((a, b) => b.value - a.value);

  // 2. Prepare Monthly Income vs Expense Data for Bar Chart
  const monthlyMap: Record<string, { income: number; expense: number }> = {};

  transactions.forEach((t) => {
    const d = new Date(t.timestamp);
    if (isNaN(d.getTime())) return;
    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      monthlyMap[monthKey].income += t.amount;
    } else {
      monthlyMap[monthKey].expense += t.amount;
    }
  });

  const barData = Object.entries(monthlyMap).map(([month, values]) => ({
    month,
    Income: values.income,
    Expense: values.expense,
  }));

  return (
    <div className="space-y-6 my-4">
      {/* Donut Chart: Category Expense Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-600">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Expense Breakdown
              </h3>
              <p className="text-xs text-slate-500">Distribution by Category</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Total: {formatINR(totalExpenseSum)}
          </span>
        </div>

        {pieData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Donut Chart Canvas */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatINR(Number(value)), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '12px',
                      color: '#FFF',
                      border: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend & List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {pieData.map((item) => {
                const meta = getCategoryMeta(item.name);
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{meta.icon}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 dark:text-white block">
                        {formatINR(item.value)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">
            No expense records available to plot breakdown.
          </p>
        )}
      </div>

      {/* Bar Chart: Monthly Income vs Expense */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Income vs Expense Flow
              </h3>
              <p className="text-xs text-slate-500">Monthly Cash Flow Comparison</p>
            </div>
          </div>
        </div>

        {barData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), '']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Income" fill="#166534" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Expense" fill="#991B1B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-8">
            No monthly data to render bar chart.
          </p>
        )}
      </div>
    </div>
  );
}
