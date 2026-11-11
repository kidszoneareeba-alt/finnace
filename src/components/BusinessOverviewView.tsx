import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Calendar,
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  Account,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  DateFilterType,
  DateRange,
} from '../types';
import {
  SYSTEM_TODAY,
  getDateRangeFromFilter,
  isDateInRange,
  calculateCashInHand,
  calculateBankBalances,
  calculateAllCustomerBalances,
} from '../utils/accounting';
import { formatCurrency } from '../utils/numberToWords';

interface BusinessOverviewViewProps {
  accounts: Account[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  onNavigateToRecovery: () => void;
  onNavigateToLedger: (account: Account) => void;
}

export const BusinessOverviewView: React.FC<BusinessOverviewViewProps> = ({
  accounts,
  cashTxns,
  recoveries,
  invoices,
  onNavigateToRecovery,
  onNavigateToLedger,
}) => {
  // Filter state
  const [activeFilter, setActiveFilter] = useState<DateFilterType>('month');
  const [customRange, setCustomRange] = useState<DateRange>({
    startDate: '2026-10-01',
    endDate: SYSTEM_TODAY,
  });
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  // Compute active bounds
  const activeDateRange = useMemo(() => {
    return getDateRangeFromFilter(activeFilter, customRange);
  }, [activeFilter, customRange]);

  // Filtered transactions for the selected period
  const periodRecoveries = useMemo(() => {
    return recoveries.filter((r) => isDateInRange(r.date, activeDateRange));
  }, [recoveries, activeDateRange]);

  const periodCashTxns = useMemo(() => {
    return cashTxns.filter((t) => isDateInRange(t.date, activeDateRange));
  }, [cashTxns, activeDateRange]);

  // Overall Financial Balances
  const overallCashStats = useMemo(() => {
    return calculateCashInHand(cashTxns, recoveries);
  }, [cashTxns, recoveries]);

  const bankStats = useMemo(() => {
    return calculateBankBalances(accounts, cashTxns, recoveries);
  }, [accounts, cashTxns, recoveries]);

  const customerStats = useMemo(() => {
    return calculateAllCustomerBalances(accounts, invoices, recoveries, cashTxns);
  }, [accounts, invoices, recoveries, cashTxns]);

  // Period Financial Metrics
  const totalPeriodRecovery = useMemo(() => {
    return periodRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [periodRecoveries]);

  const periodCashReceived = useMemo(() => {
    return periodCashTxns
      .filter((t) => t.type === 'Cash Received')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [periodCashTxns]);

  const periodCashPaid = useMemo(() => {
    return periodCashTxns
      .filter((t) => t.type === 'Cash Paid')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [periodCashTxns]);

  const periodCashRecoveries = useMemo(() => {
    return periodRecoveries
      .filter((r) => r.paymentMethod === 'Cash')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [periodRecoveries]);

  const periodBankRecoveries = useMemo(() => {
    return periodRecoveries
      .filter((r) => r.paymentMethod === 'Bank')
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [periodRecoveries]);

  // Net Cash Flow in period = (Cash Received + Cash Recoveries) - Cash Paid
  const netPeriodCashFlow = (periodCashReceived + periodCashRecoveries) - periodCashPaid;

  // Generate Daily Trend Data for Interactive Chart
  const chartDays = useMemo(() => {
    const start = new Date(activeDateRange.startDate + 'T00:00:00');
    const end = new Date(activeDateRange.endDate + 'T00:00:00');
    const days: { dateStr: string; label: string; recovery: number; cashPaid: number }[] = [];

    // Limit to max 31 days for clean visualization
    const cur = new Date(start);
    while (cur <= end && days.length < 31) {
      const dStr = cur.toISOString().split('T')[0];
      const dayRec = periodRecoveries
        .filter((r) => r.date === dStr)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const dayPaid = periodCashTxns
        .filter((t) => t.date === dStr && t.type === 'Cash Paid')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      days.push({
        dateStr: dStr,
        label: `${cur.getMonth() + 1}/${cur.getDate()}`,
        recovery: dayRec,
        cashPaid: dayPaid,
      });

      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [activeDateRange, periodRecoveries, periodCashTxns]);

  const maxChartValue = Math.max(
    ...chartDays.map((d) => Math.max(d.recovery, d.cashPaid)),
    1000
  );

  // Top Customers by outstanding
  const topDebtors = useMemo(() => {
    const custs = accounts.filter((a) => a.category === 'Customer');
    return custs
      .map((c) => ({
        account: c,
        balance: customerStats.customerBalances[c.id] || 0,
      }))
      .filter((c) => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [accounts, customerStats]);

  const filterButtons: { id: DateFilterType; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom Date Range' },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Header & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Business Financial Overview
              </h1>
              <span className="text-xs text-slate-500 font-mono">
                [{activeDateRange.startDate} to {activeDateRange.endDate}]
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time analytics for cash flows, recovery performance, bank balances, and customer accounts
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setActiveFilter(btn.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilter === btn.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Inputs (When custom selected) */}
        {activeFilter === 'custom' && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Custom Date Span:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-900 font-mono"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-md text-slate-900 font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary KPI Metric Cards (6 core metrics in PKR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Total Recovery Amount */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Total Recovery Amount</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 tabular-nums tracking-tight">
            PKR {formatCurrency(totalPeriodRecovery)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>{periodRecoveries.length} entries in period</span>
            <span className="text-emerald-700 font-medium">
              Cash: PKR {formatCurrency(periodCashRecoveries)} · Bank: PKR {formatCurrency(periodBankRecoveries)}
            </span>
          </div>
        </div>

        {/* 2. Total Cash Received */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Total Cash Received</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 tabular-nums tracking-tight">
            PKR {formatCurrency(periodCashReceived)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Direct Cash Receipts</span>
            <span>+ Cash Recoveries (PKR {formatCurrency(periodCashRecoveries)})</span>
          </div>
        </div>

        {/* 3. Total Cash Paid */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Total Cash Paid</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-600 tabular-nums tracking-tight">
            PKR {formatCurrency(periodCashPaid)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Outflows in period</span>
            <span className="text-slate-600">Expenses & Deposits</span>
          </div>
        </div>

        {/* 4. Current Cash in Hand */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-200">Current Cash in Hand</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums tracking-tight">
            PKR {formatCurrency(overallCashStats.currentCashInHand)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>Ejaz Solution Safe Drawer</span>
            <span className="text-emerald-400 font-medium">Liquid Available</span>
          </div>
        </div>

        {/* 5. Total Bank Balance */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Total Bank Balance</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-700 tabular-nums tracking-tight">
            PKR {formatCurrency(bankStats.totalBankBalance)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>HBL & Meezan Operations</span>
            <span>{accounts.filter((a) => a.category === 'Bank').length} Bank Accounts</span>
          </div>
        </div>

        {/* 6. Customer Outstanding Balances */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Customer Outstanding</span>
            <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-pink-700 tabular-nums tracking-tight">
            PKR {formatCurrency(customerStats.totalCustomerOutstanding)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>Total Receivables Due</span>
            <span className="text-pink-700 font-medium">{topDebtors.length} Active Clients</span>
          </div>
        </div>
      </div>

      {/* Interactive Charts & Visual Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery & Cash Trends Bar Chart (2 columns wide) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Recovery & Cash Outflow Trend
                </h3>
                <p className="text-[11px] text-slate-500">
                  Daily distribution of customer recoveries vs cash disbursements
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                  <span className="text-slate-600">Customer Recovery</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-400" />
                  <span className="text-slate-600">Cash Paid</span>
                </div>
              </div>
            </div>

            {/* SVG Visual Chart */}
            <div className="pt-6 pb-2">
              {chartDays.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                  No transaction data available for this range.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-56 flex items-end gap-2 sm:gap-3 pt-6 px-2">
                    {chartDays.map((day, idx) => {
                      const recHeightPct = Math.min(100, (day.recovery / maxChartValue) * 100);
                      const paidHeightPct = Math.min(100, (day.cashPaid / maxChartValue) * 100);
                      const isHovered = hoveredChartIndex === idx;

                      return (
                        <div
                          key={day.dateStr}
                          onMouseEnter={() => setHoveredChartIndex(idx)}
                          onMouseLeave={() => setHoveredChartIndex(null)}
                          className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                        >
                          {/* Tooltip on hover */}
                          {isHovered && (
                            <div className="absolute -top-12 z-20 bg-slate-900 text-white text-[11px] rounded-lg py-1 px-2.5 shadow-lg whitespace-nowrap pointer-events-none">
                              <div className="font-semibold">{day.dateStr}</div>
                              <div className="text-emerald-400">
                                Rec: PKR {formatCurrency(day.recovery)}
                              </div>
                              <div className="text-rose-400">
                                Paid: PKR {formatCurrency(day.cashPaid)}
                              </div>
                            </div>
                          )}

                          {/* Bars container */}
                          <div className="w-full flex items-end justify-center gap-1 h-44">
                            {/* Recovery bar */}
                            <div
                              style={{ height: `${Math.max(recHeightPct, 4)}%` }}
                              className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                                day.recovery > 0
                                  ? 'bg-emerald-500 group-hover:bg-emerald-600'
                                  : 'bg-slate-100'
                              }`}
                            />
                            {/* Cash Paid bar */}
                            <div
                              style={{ height: `${Math.max(paidHeightPct, 4)}%` }}
                              className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                                day.cashPaid > 0
                                  ? 'bg-rose-400 group-hover:bg-rose-500'
                                  : 'bg-slate-100'
                              }`}
                            />
                          </div>

                          {/* Date label */}
                          <div className="text-[10px] text-slate-500 mt-2 truncate w-full text-center font-mono">
                            {day.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Net Period Cash Balance:</span>
            <span
              className={`font-mono font-bold ${
                netPeriodCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {netPeriodCashFlow >= 0 ? '+' : ''}PKR {formatCurrency(netPeriodCashFlow)}
            </span>
          </div>
        </div>

        {/* Top Outstanding Customers List (1 column wide) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Top Customer Balances
                </h3>
                <p className="text-[11px] text-slate-500">
                  Highest pending receivables awaiting recovery
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToRecovery}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                + Recovery
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-3">
              {topDebtors.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No outstanding receivables currently.
                </div>
              ) : (
                topDebtors.map(({ account, balance }) => (
                  <div
                    key={account.id}
                    className="py-3 flex items-center justify-between group hover:bg-slate-50/70 rounded-lg px-2 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {account.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateToLedger(account)}
                          className="text-xs font-semibold text-slate-900 truncate hover:text-blue-600 text-left"
                        >
                          {account.name}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {account.location || 'Local Customer'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-rose-700 tabular-nums">
                        PKR {formatCurrency(balance)}
                      </div>
                      <button
                        type="button"
                        onClick={onNavigateToRecovery}
                        className="text-[10px] text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center gap-0.5 cursor-pointer mt-0.5"
                      >
                        <span>Collect</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Total Debtor Dues:</span>
            <span className="font-mono font-bold text-slate-900">
              PKR {formatCurrency(customerStats.totalCustomerOutstanding)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
