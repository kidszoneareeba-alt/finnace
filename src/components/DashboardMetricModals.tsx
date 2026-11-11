import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Wallet,
  Users,
  CreditCard,
  Receipt,
  TrendingDown,
  Calendar,
  Building2,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  MapPin,
  ExternalLink,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Account,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  DateFilterType,
  DateRange,
} from '../types';
import { NavItem } from './Sidebar';
import { formatCurrency } from '../utils/numberToWords';
import {
  calculateCustomerBalance,
  generateAccountLedger,
  isDateInRange,
} from '../utils/accounting';

export type DashboardMetricType = 'cash' | 'outstanding' | 'bank' | 'recoveries' | 'payable';

interface DashboardMetricModalsProps {
  activeModal: DashboardMetricType | null;
  onClose: () => void;
  accounts: Account[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  cashAccount?: Account;
  cashAccountLedger: { closingBalance: number };
  customerStats: {
    customerBalances: Record<string, number>;
    totalCustomerOutstanding: number;
  };
  bankStats: {
    bankBalances: Record<string, number>;
    totalBankBalance: number;
  };
  totalPayableAmount: number;
  payableAccountsCount: number;
  totalRecoveryAllTime: number;
  activeDateRange: DateRange;
  activeTimeframe: DateFilterType;
  onNavigate: (tab: NavItem) => void;
  onViewAccountLedger: (account: Account) => void;
}

export const DashboardMetricModals: React.FC<DashboardMetricModalsProps> = ({
  activeModal,
  onClose,
  accounts,
  cashTxns,
  recoveries,
  invoices,
  cashAccount,
  cashAccountLedger,
  customerStats,
  bankStats,
  totalPayableAmount,
  payableAccountsCount,
  totalRecoveryAllTime,
  activeDateRange,
  activeTimeframe,
  onNavigate,
  onViewAccountLedger,
}) => {
  // Local search and filter states for modals
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [periodOnly, setPeriodOnly] = useState<boolean>(false);

  // Reset filters when active modal changes
  React.useEffect(() => {
    setSearchQuery('');
    setFilterType('all');
    setPeriodOnly(false);
  }, [activeModal]);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModal) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, onClose]);

  // Precompute customer balances map and customer objects
  const customerAccounts = useMemo(() => {
    return accounts.filter((a) => a.category === 'Customer');
  }, [accounts]);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.category === 'Bank');
  }, [accounts]);

  // Precompute running balances before & after for each recovery entry
  const recoveryBalanceMap = useMemo(() => {
    const map: Record<string, { dueBefore: number; balanceAfter: number }> = {};
    const customerMap = new Map<string, Account>();
    customerAccounts.forEach((c) => customerMap.set(c.id, c));

    customerAccounts.forEach((cust) => {
      const ledger = generateAccountLedger(cust, invoices, recoveries, cashTxns);
      ledger.entries.forEach((entry) => {
        if (
          entry.sourceType === 'recovery' ||
          entry.id?.startsWith('rec_') ||
          entry.voucherNo?.startsWith('RV-')
        ) {
          const balanceAfter = entry.balance;
          const dueBefore = balanceAfter + (entry.credit || 0);
          map[entry.id] = { dueBefore, balanceAfter };
          if (entry.sourceId) {
            map[entry.sourceId] = { dueBefore, balanceAfter };
          }
        }
      });
    });

    return map;
  }, [customerAccounts, invoices, recoveries, cashTxns]);

  // Period-filtered cash ledger
  const periodCashLedger = useMemo(() => {
    if (!cashAccount) {
      return {
        openingBalance: 0,
        entries: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    }
    return generateAccountLedger(
      cashAccount,
      invoices,
      recoveries,
      cashTxns,
      activeDateRange
    );
  }, [cashAccount, invoices, recoveries, cashTxns, activeDateRange]);

  // All accounts with their live balance for Payable modal
  const allAccountsWithBalances = useMemo(() => {
    return accounts.map((acc) => {
      let balance = 0;
      if (acc.category === 'Customer') {
        balance =
          customerStats.customerBalances[acc.id] ??
          calculateCustomerBalance(acc, invoices, recoveries, cashTxns);
      } else if (acc.category === 'Bank') {
        balance = bankStats.bankBalances[acc.id] ?? acc.openingBalance ?? 0;
      } else {
        balance = generateAccountLedger(acc, invoices, recoveries, cashTxns).closingBalance;
      }
      return { account: acc, balance };
    });
  }, [accounts, customerStats, bankStats, invoices, recoveries, cashTxns]);

  if (!activeModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL 1: CASH IN HAND OPTIONS & DETAIL WINDOW              */}
        {/* ========================================================= */}
        {activeModal === 'cash' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white shrink-0 flex items-start justify-between gap-4 border-b border-emerald-700/60">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-emerald-400 text-slate-950">
                      CASH VAULT & REGISTER
                    </span>
                    <span className="text-xs font-mono text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/80 font-semibold">
                      A/C Code: {cashAccount?.code || 'PERS-CASH'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                    Cash in Hand - Options & Statement (کیش ان ہینڈ تفصیلات اور روزنامچہ)
                  </h2>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    Primary cash drawer, physical cash register, double-entry vouchers, and daily transactions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-white/15"
                  title="Back to Dashboard (واپس ڈیش بورڈ)"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back (واپس جائیں)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                  title="Close Window (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/60">
              {/* Transactions in Active Date Filter Range */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Cash Transactions in Selected Range
                      </span>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {periodCashLedger.entries.length} Entries
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Period: <strong className="text-slate-700">{activeDateRange.startDate}</strong> to <strong className="text-slate-700">{activeDateRange.endDate}</strong>
                    </p>
                  </div>

                  <div className="text-xs font-mono text-slate-500">
                    Period Closing: <strong className="text-slate-900">PKR {formatCurrency(Math.abs(periodCashLedger.closingBalance))}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                      <tr>
                        <th className="py-2.5 px-3 w-28">Date</th>
                        <th className="py-2.5 px-3 w-28">Voucher #</th>
                        <th className="py-2.5 px-3">Particulars / Narration</th>
                        <th className="py-2.5 px-3 text-right text-emerald-700">Cash In (DR)</th>
                        <th className="py-2.5 px-3 text-right text-rose-700">Cash Out (CR)</th>
                        <th className="py-2.5 px-3 text-right text-slate-900">Balance (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {/* Opening Balance Row */}
                      <tr className="bg-slate-50/70 text-slate-500 text-[11px]">
                        <td className="py-2.5 px-3 font-bold text-slate-700">{activeDateRange.startDate}</td>
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-700">
                          Opening Balance for selected period
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          PKR {formatCurrency(Math.abs(periodCashLedger.openingBalance))} {periodCashLedger.openingBalance < 0 ? 'Cr' : 'Dr'}
                        </td>
                      </tr>

                      {periodCashLedger.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                            No cash transactions recorded in this selected period.
                          </td>
                        </tr>
                      ) : (
                        periodCashLedger.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">{entry.date}</td>
                            <td className="py-2.5 px-3 whitespace-nowrap font-bold text-blue-700">
                              {entry.voucherNo}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-800 max-w-xs truncate">
                              {entry.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700 tabular-nums">
                              {entry.debit > 0 ? `+PKR ${formatCurrency(entry.debit)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-rose-700 tabular-nums">
                              {entry.credit > 0 ? `-PKR ${formatCurrency(entry.credit)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular-nums">
                              PKR {formatCurrency(Math.abs(entry.balance))} {entry.balance < 0 ? 'Cr' : 'Dr'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-mono">
                Real-time synchronized with Pakistani PKR accounting standards
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Dashboard (واپس جائیں)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: OUTSTANDING ON CUSTOMERS DETAIL WINDOW           */}
        {/* ========================================================= */}
        {activeModal === 'outstanding' && (() => {
          // Filter customers based on search and balance type
          const filteredCustomers = customerAccounts.filter((cust) => {
            const bal =
              customerStats.customerBalances[cust.id] ??
              calculateCustomerBalance(cust, invoices, recoveries, cashTxns);

            if (filterType === 'due' && bal <= 0.01) return false;
            if (filterType === 'advance' && bal >= -0.01) return false;
            if (filterType === 'zero' && Math.abs(bal) > 0.01) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              cust.name.toLowerCase().includes(q) ||
              cust.code.toLowerCase().includes(q) ||
              (cust.location && cust.location.toLowerCase().includes(q)) ||
              (cust.contact && cust.contact.toLowerCase().includes(q))
            );
          });

          const totalFilteredDue = filteredCustomers.reduce((sum, cust) => {
            const bal =
              customerStats.customerBalances[cust.id] ??
              calculateCustomerBalance(cust, invoices, recoveries, cashTxns);
            return bal > 0 ? sum + bal : sum;
          }, 0);

          return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-pink-900 via-rose-800 to-slate-900 text-white shrink-0 flex items-start justify-between gap-4 border-b border-pink-700/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300 shrink-0 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-pink-400 text-slate-950">
                        CUSTOMER RECEIVABLES (DR)
                      </span>
                      <span className="text-xs font-mono text-pink-200 bg-pink-950/80 px-2 py-0.5 rounded border border-pink-700/80 font-semibold">
                        {customerAccounts.length} Total Customers
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                      Outstanding on Customers (کسٹمرز کے ذمے واجب الوصول بقایا جات)
                    </h2>
                    <p className="text-xs text-pink-200/90 mt-0.5">
                      All customers with outstanding balance amount, contact, city, and direct ledger access
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-white/15"
                    title="Back to Dashboard (واپس ڈیش بورڈ)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back (واپس جائیں)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Close Window (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-header / Stats Strip */}
              <div className="p-4 sm:p-5 bg-pink-50/60 border-b border-pink-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-pink-800 tracking-wider">
                      Total Market Outstanding Due (Dr)
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-pink-700 tabular-nums">
                      PKR {formatCurrency(customerStats.totalCustomerOutstanding)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-pink-200 hidden md:block" />
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                      Filtered Outstanding Sum
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
                      PKR {formatCurrency(totalFilteredDue)}
                    </div>
                  </div>
                </div>

                {/* Search & Filter Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search customer name, code, city..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-pink-500 font-sans shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-pink-500 cursor-pointer shadow-2xs"
                  >
                    <option value="all">All ({customerAccounts.length})</option>
                    <option value="due">Due Only (&gt; 0)</option>
                    <option value="advance">Advance / Cr (&lt; 0)</option>
                    <option value="zero">Zero Balanced</option>
                  </select>
                </div>
              </div>

              {/* Table of Customers */}
              <div className="overflow-x-auto flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-4 w-28">Customer Code</th>
                      <th className="py-3 px-4">Customer Name & Info</th>
                      <th className="py-3 px-4">Location / City</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4 text-right w-44">Outstanding Balance Amount</th>
                      <th className="py-3 px-4 text-center w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No matching customer accounts found</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing search or changing the balance filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((cust) => {
                        const bal =
                          customerStats.customerBalances[cust.id] ??
                          calculateCustomerBalance(cust, invoices, recoveries, cashTxns);

                        return (
                          <tr key={cust.id} className="hover:bg-pink-50/30 transition-colors">
                            {/* Customer Code */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
                                {cust.code}
                              </span>
                            </td>

                            {/* Customer Name */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                              {cust.openingBalance ? (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Opening: PKR {formatCurrency(cust.openingBalance)} ({cust.openingBalanceType || 'Dr'})
                                </div>
                              ) : null}
                            </td>

                            {/* Location */}
                            <td className="py-3 px-4 text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{cust.location || '—'}</span>
                              </span>
                            </td>

                            {/* Contact */}
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              <span className="inline-flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{cust.contact || '—'}</span>
                              </span>
                            </td>

                            {/* Outstanding Balance Amount */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-baseline justify-end gap-1.5 font-mono tabular-nums font-bold">
                                <span className={`text-sm ${
                                  bal > 0 ? 'text-pink-700 font-black' : bal < 0 ? 'text-amber-700' : 'text-slate-400'
                                }`}>
                                  PKR {formatCurrency(Math.abs(bal))}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase ${
                                  bal > 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : bal < 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                  {bal > 0 ? 'DR (Due)' : bal < 0 ? 'CR (Adv)' : '0.00'}
                                </span>
                              </div>
                            </td>

                            {/* Action: View Ledger */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onViewAccountLedger(cust);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-2xs hover:scale-102 cursor-pointer inline-flex items-center gap-1.5"
                                title={`Open ${cust.name} Ledger`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>View Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {filteredCustomers.length} of {customerAccounts.length} customers
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard (واپس ڈیش بورڈ)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL 3: BANK ACCOUNTS AND BALANCES DETAIL WINDOW         */}
        {/* ========================================================= */}
        {activeModal === 'bank' && (() => {
          const filteredBanks = bankAccounts.filter((bank) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              bank.name.toLowerCase().includes(q) ||
              bank.code.toLowerCase().includes(q) ||
              (bank.location && bank.location.toLowerCase().includes(q)) ||
              (bank.contact && bank.contact.toLowerCase().includes(q))
            );
          });

          return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shrink-0 flex items-start justify-between gap-4 border-b border-blue-700/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-blue-400 text-slate-950">
                        COMMERCIAL BANK ACCOUNTS
                      </span>
                      <span className="text-xs font-mono text-blue-200 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/80 font-semibold">
                        {bankAccounts.length} Registered Banks
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                      Bank Balances & Accounts (کمرشل بینک اکاؤنٹس اور بیلنس)
                    </h2>
                    <p className="text-xs text-blue-200/90 mt-0.5">
                      All commercial bank accounts, live reconciled balances, and row-wise ledger view
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-white/15"
                    title="Back to Dashboard (واپس ڈیش بورڈ)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back (واپس جائیں)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Close Window (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-header / Summary */}
              <div className="p-4 sm:p-5 bg-blue-50/60 border-b border-blue-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-blue-800 tracking-wider">
                      Total Commercial Bank Balance
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-blue-700 tabular-nums">
                      PKR {formatCurrency(bankStats.totalBankBalance)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-blue-200 hidden md:block" />
                  <div className="hidden sm:block">
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                      Reconciliation Status
                    </div>
                    <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>All Accounts Active & Reconciled</span>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bank name, code, branch..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Bank Accounts */}
              <div className="overflow-x-auto flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-4 w-32">Bank Code</th>
                      <th className="py-3 px-4">Bank & Account Name</th>
                      <th className="py-3 px-4">Branch / Location</th>
                      <th className="py-3 px-4">A/C Number / Contact</th>
                      <th className="py-3 px-4 text-right w-44">Bank Balance (PKR)</th>
                      <th className="py-3 px-4 text-center w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBanks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No bank accounts found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Add bank accounts from Create Account module.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredBanks.map((bank) => {
                        const bal = bankStats.bankBalances[bank.id] ?? bank.openingBalance ?? 0;

                        return (
                          <tr key={bank.id} className="hover:bg-blue-50/40 transition-colors">
                            {/* Code */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                              <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                                {bank.code}
                              </span>
                            </td>

                            {/* Name */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>{bank.name}</span>
                              </div>
                              {bank.openingBalance ? (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Opening Bal: PKR {formatCurrency(bank.openingBalance)} ({bank.openingBalanceType || 'Dr'})
                                </div>
                              ) : null}
                            </td>

                            {/* Branch */}
                            <td className="py-3 px-4 text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{bank.location || 'Main Branch'}</span>
                              </span>
                            </td>

                            {/* Contact / A/C number */}
                            <td className="py-3 px-4 text-slate-600 font-mono">
                              <span>{bank.contact || '—'}</span>
                            </td>

                            {/* Current Bank Balance */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-baseline justify-end gap-1.5 font-mono tabular-nums font-bold">
                                <span className={`text-sm ${
                                  bal >= 0 ? 'text-blue-700 font-black' : 'text-amber-700'
                                }`}>
                                  PKR {formatCurrency(Math.abs(bal))}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase ${
                                  bal >= 0
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {bal >= 0 ? 'DR' : 'CR (Overdraft)'}
                                </span>
                              </div>
                            </td>

                            {/* Action: View Ledger */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onViewAccountLedger(bank);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-2xs hover:scale-102 cursor-pointer inline-flex items-center gap-1.5"
                                title={`Open ${bank.name} Ledger`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>View Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  {bankAccounts.length} Commercial Bank Accounts registered
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard (واپس ڈیش بورڈ)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL 4: RECOVERIES BREAKDOWN DETAIL WINDOW               */}
        {/* ========================================================= */}
        {activeModal === 'recoveries' && (() => {
          // Filter recoveries by search and optional period
          const filteredRecoveries = recoveries.filter((r) => {
            if (periodOnly && !isDateInRange(r.date, activeDateRange)) return false;

            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              r.customerName.toLowerCase().includes(q) ||
              r.customerCode.toLowerCase().includes(q) ||
              (r.voucherNo && r.voucherNo.toLowerCase().includes(q)) ||
              (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
              (r.remarks && r.remarks.toLowerCase().includes(q)) ||
              r.paymentMethod.toLowerCase().includes(q)
            );
          });

          const totalFilteredRecoveries = filteredRecoveries.reduce(
            (sum, r) => sum + Number(r.amount || 0),
            0
          );

          return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-900 via-amber-800 to-slate-900 text-white shrink-0 flex items-start justify-between gap-4 border-b border-amber-700/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-amber-400 text-slate-950">
                        CUSTOMER RECOVERIES & RECEIPTS
                      </span>
                      <span className="text-xs font-mono text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/80 font-semibold">
                        {recoveries.length} Total Receipts
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                      Customer Recoveries & Receipts (کسٹمر وصولیاں اور تفصیلی ریکوری رپورٹ)
                    </h2>
                    <p className="text-xs text-amber-200/90 mt-0.5">
                      Customer code & name, invoice number, total due, recovery amount, balance after recovery, and ledger access
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-white/15"
                    title="Back to Dashboard (واپس ڈیش بورڈ)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back (واپس جائیں)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Close Window (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-header / Summary */}
              <div className="p-4 sm:p-5 bg-amber-50/60 border-b border-amber-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-amber-800 tracking-wider">
                      Total Collected Recoveries
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-amber-700 tabular-nums">
                      PKR {formatCurrency(totalRecoveryAllTime)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-amber-200 hidden md:block" />
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                      Filtered Recoveries Sum
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
                      PKR {formatCurrency(totalFilteredRecoveries)}
                    </div>
                  </div>
                </div>

                {/* Search & Period Toggle */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search customer, invoice #, voucher..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-sans shadow-2xs"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPeriodOnly((prev) => !prev)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border ${
                      periodOnly
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{periodOnly ? '✓ Period Filter Active' : 'Filter by Period'}</span>
                  </button>
                </div>
              </div>

              {/* Table of Recoveries (Exact Columns Specified by User) */}
              <div className="overflow-x-auto flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-3 w-28">Date & Voucher</th>
                      <th className="py-3 px-3">Customer Code & Name</th>
                      <th className="py-3 px-3 w-28">Invoice #</th>
                      <th className="py-3 px-3 text-right text-slate-600 w-36">Total Amount Due</th>
                      <th className="py-3 px-3 text-right text-emerald-700 w-36">Recovery Amount</th>
                      <th className="py-3 px-3 text-right text-slate-900 w-36">Balance After Recovery</th>
                      <th className="py-3 px-3 text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecoveries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-700">No recovery entries found</p>
                          <p className="text-xs text-slate-400 mt-1">Try clearing search or filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRecoveries.map((rec) => {
                        // Find customer account
                        const customer = customerAccounts.find(
                          (c) => c.id === rec.customerId || c.code === rec.customerCode
                        );

                        // Look up computed running balance
                        const balanceData =
                          recoveryBalanceMap[rec.id] ||
                          (rec.voucherNo ? recoveryBalanceMap[rec.voucherNo] : undefined);

                        let dueBefore = balanceData ? balanceData.dueBefore : 0;
                        let balanceAfter = balanceData ? balanceData.balanceAfter : 0;

                        // Fallback if not mapped directly
                        if (!balanceData && customer) {
                          const currentBal = calculateCustomerBalance(
                            customer,
                            invoices,
                            recoveries,
                            cashTxns
                          );
                          balanceAfter = currentBal;
                          dueBefore = currentBal + Number(rec.amount || 0);
                        }

                        // Linked invoice lookup
                        const linkedInvoice = invoices.find(
                          (inv) =>
                            inv.id === rec.invoiceId ||
                            inv.invoiceNo === rec.invoiceNo ||
                            (rec.invoiceNo && inv.invoiceNo.toLowerCase() === rec.invoiceNo.toLowerCase())
                        );

                        const invoiceDisplay =
                          rec.invoiceNo ||
                          linkedInvoice?.invoiceNo ||
                          (rec.invoiceId ? 'INV-Ref' : 'General A/C');

                        return (
                          <tr key={rec.id} className="hover:bg-amber-50/30 transition-colors">
                            {/* Date & Voucher */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="font-mono text-slate-800 font-semibold">{rec.date}</div>
                              <div className="font-mono text-[10px] text-amber-700 font-bold mt-0.5">
                                {rec.voucherNo}
                              </div>
                            </td>

                            {/* 1. Customer Code and Name */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
                                  {rec.customerCode || customer?.code || 'CUST'}
                                </span>
                                <span>{rec.customerName}</span>
                              </div>
                              {customer?.location && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{customer.location}</span>
                                </div>
                              )}
                            </td>

                            {/* 2. Invoice Number */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800 bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-[10px]">
                                {invoiceDisplay}
                              </span>
                            </td>

                            {/* 3. Total Amount Due */}
                            <td className="py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                              <div className="text-slate-800">
                                PKR {formatCurrency(Math.abs(dueBefore))}
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase">
                                {dueBefore < 0 ? 'Cr (Adv)' : 'Dr (Due)'}
                              </span>
                            </td>

                            {/* 5. Recovery Amount */}
                            <td className="py-3 px-3 text-right font-mono font-black tabular-nums whitespace-nowrap">
                              <div className="text-emerald-700 text-sm">
                                PKR {formatCurrency(rec.amount)}
                              </div>
                              <span className="text-[9px] text-emerald-600 font-sans font-bold">
                                Received (CR)
                              </span>
                            </td>

                            {/* 6. Balance After Recovery */}
                            <td className="py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                              <div className={`text-sm ${
                                balanceAfter > 0
                                  ? 'text-pink-700'
                                  : balanceAfter < 0
                                  ? 'text-amber-700'
                                  : 'text-slate-500'
                              }`}>
                                PKR {formatCurrency(Math.abs(balanceAfter))}
                              </div>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase border ${
                                balanceAfter > 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : balanceAfter < 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {balanceAfter > 0 ? 'DR (Rem. Due)' : balanceAfter < 0 ? 'CR (Advance)' : '0.00'}
                              </span>
                            </td>

                            {/* 7. Action: View Ledger */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  if (customer) {
                                    onViewAccountLedger(customer);
                                  } else {
                                    onNavigate('View Accounts Report');
                                  }
                                }}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-2xs hover:scale-102 cursor-pointer inline-flex items-center gap-1"
                                title="Open Customer Ledger"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {filteredRecoveries.length} of {recoveries.length} receipts
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard (واپس ڈیش بورڈ)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* MODAL 5: TOTAL PAYABLE ACCOUNTS DETAIL WINDOW             */}
        {/* ========================================================= */}
        {activeModal === 'payable' && (() => {
          // Accounts with balance < 0 (Credit balance where company owes money / liabilities)
          const payableAccounts = allAccountsWithBalances.filter(
            ({ balance }) => balance < -0.01
          );

          const filteredPayableAccounts = payableAccounts.filter(({ account }) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              account.name.toLowerCase().includes(q) ||
              account.code.toLowerCase().includes(q) ||
              account.category.toLowerCase().includes(q) ||
              (account.location && account.location.toLowerCase().includes(q)) ||
              (account.contact && account.contact.toLowerCase().includes(q))
            );
          });

          const totalFilteredPayable = filteredPayableAccounts.reduce(
            (sum, { balance }) => sum + Math.abs(balance),
            0
          );

          return (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shrink-0 flex items-start justify-between gap-4 border-b border-purple-700/60">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-purple-400 text-slate-950">
                        COMPANY LIABILITIES & CREDITORS (CR)
                      </span>
                      <span className="text-xs font-mono text-purple-200 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-700/80 font-semibold">
                        {payableAccounts.length} Payable Accounts
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
                      Total Payable Accounts (قابل ادا رقم اور کریڈیٹرز کھاتے)
                    </h2>
                    <p className="text-xs text-purple-200/90 mt-0.5">
                      Accounts where balance is payable (Cr balance): suppliers, vendors, advances received, and company liabilities
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 border border-white/15"
                    title="Back to Dashboard (واپس ڈیش بورڈ)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back (واپس جائیں)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    title="Close Window (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-header / Summary */}
              <div className="p-4 sm:p-5 bg-purple-50/60 border-b border-purple-100 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-purple-800 tracking-wider">
                      Total Company Payable Liabilities (Cr)
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono text-purple-700 tabular-nums">
                      PKR {formatCurrency(totalPayableAmount)}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-purple-200 hidden md:block" />
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                      Filtered Payable Sum
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-slate-800 tabular-nums">
                      PKR {formatCurrency(totalFilteredPayable)}
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, code, category..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-sans shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Payable Accounts (Exact Columns Specified by User: Name, Code, Total Payable Amount, View Ledger Option) */}
              <div className="overflow-x-auto flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-4 w-32">Account Code</th>
                      <th className="py-3 px-4">Account Name & Category</th>
                      <th className="py-3 px-4">Contact & Location</th>
                      <th className="py-3 px-4 text-right w-44">Total Payable Amount (CR)</th>
                      <th className="py-3 px-4 text-center w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayableAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                          <p className="font-semibold text-slate-700">
                            {payableAccounts.length === 0
                              ? 'No payable liabilities! All accounts have zero or debit balances.'
                              : 'No matching payable accounts found.'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {payableAccounts.length === 0
                              ? 'Company has no pending credit liabilities.'
                              : 'Try adjusting your search query.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredPayableAccounts.map(({ account, balance }) => {
                        return (
                          <tr key={account.id} className="hover:bg-purple-50/30 transition-colors">
                            {/* Account Code */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono font-bold">
                              <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-[11px]">
                                {account.code}
                              </span>
                            </td>

                            {/* Account Name & Category */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">{account.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {account.category}
                                </span>
                                {account.category === 'Customer' ? (
                                  <span className="text-[10px] text-amber-700 font-semibold font-mono">
                                    (Customer Advance Credit)
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            {/* Contact & Location */}
                            <td className="py-3 px-4 text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono">{account.contact || '—'}</span>
                                {account.location && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="truncate max-w-[150px]">{account.location}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Total Payable Amount */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-baseline justify-end gap-1.5 font-mono tabular-nums font-bold">
                                <span className="text-sm text-purple-700 font-black">
                                  PKR {formatCurrency(Math.abs(balance))}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold border uppercase bg-purple-50 text-purple-700 border-purple-200">
                                  CR (Payable)
                                </span>
                              </div>
                            </td>

                            {/* Action: View Ledger */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onViewAccountLedger(account);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-2xs hover:scale-102 cursor-pointer inline-flex items-center gap-1.5"
                                title={`Open ${account.name} Ledger`}
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>View Ledger</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  Showing {filteredPayableAccounts.length} of {payableAccounts.length} payable liability accounts
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigate('Cash in Hand');
                    }}
                    className="px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Make Payment (ادائیگی کریں) →
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard (واپس ڈیش بورڈ)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
