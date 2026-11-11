import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wallet,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  FileText,
  X,
  ChevronDown,
  Building,
  User,
  CreditCard,
  Layers,
} from 'lucide-react';
import {
  Account,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
} from '../types';
import {
  SYSTEM_TODAY,
  generateAccountLedger,
} from '../utils/accounting';
import { formatCurrency, numberToWords } from '../utils/numberToWords';

interface CashInHandViewProps {
  accounts: Account[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  onSaveCashTxn: (txn: CashTransaction) => boolean;
  onDeleteCashTxn: (id: string) => boolean;
  onViewLedger?: (account: Account) => void;
}

export const CashInHandView: React.FC<CashInHandViewProps> = ({
  accounts,
  cashTxns,
  recoveries,
  invoices,
  onSaveCashTxn,
  onDeleteCashTxn,
  onViewLedger,
}) => {
  // 1. Identify Permanent Cash in Hand Account (PERS-CASH under Personal category)
  const cashAccount = useMemo(() => {
    return (
      accounts.find(
        (a) =>
          a.code === 'PERS-CASH' ||
          a.id === 'acc_pers_cash' ||
          a.name.toLowerCase() === 'cash in hand account'
      ) ||
      accounts.find((a) => a.category === 'Personal') ||
      accounts[0]
    );
  }, [accounts]);

  // Compute live persistent closing balance for the Cash in Hand Account
  const cashAccountLedger = useMemo(() => {
    if (!cashAccount) return { closingBalance: 0 };
    return generateAccountLedger(cashAccount, invoices, recoveries, cashTxns);
  }, [cashAccount, invoices, recoveries, cashTxns]);

  // Form State
  const [date, setDate] = useState(SYSTEM_TODAY);
  const [customVoucherNo, setCustomVoucherNo] = useState('');

  // Account 1 (First Account to be Credited - CR)
  const [creditAccountId, setCreditAccountId] = useState<string>('');
  const [creditSearchQuery, setCreditSearchQuery] = useState('');
  const [isCreditDropdownOpen, setIsCreditDropdownOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDescription, setCreditDescription] = useState('');

  // Account 2 (Second Account to be Debited - DR)
  const [debitAccountId, setDebitAccountId] = useState<string>('');
  const [debitSearchQuery, setDebitSearchQuery] = useState('');
  const [isDebitDropdownOpen, setIsDebitDropdownOpen] = useState(false);
  const [debitAmount, setDebitAmount] = useState('');
  const [debitDescription, setDebitDescription] = useState('');

  // UI Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Dropdown click outside listeners
  const creditDropdownRef = useRef<HTMLDivElement>(null);
  const debitDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        creditDropdownRef.current &&
        !creditDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCreditDropdownOpen(false);
      }
      if (
        debitDropdownRef.current &&
        !debitDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDebitDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered accounts for Account 1 (CR)
  const filteredCreditAccounts = useMemo(() => {
    const q = creditSearchQuery.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q))
    );
  }, [accounts, creditSearchQuery]);

  // Filtered accounts for Account 2 (DR)
  const filteredDebitAccounts = useMemo(() => {
    const q = debitSearchQuery.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q))
    );
  }, [accounts, debitSearchQuery]);

  const selectedCreditAccount = useMemo(() => {
    return accounts.find((a) => a.id === creditAccountId);
  }, [accounts, creditAccountId]);

  const selectedDebitAccount = useMemo(() => {
    return accounts.find((a) => a.id === debitAccountId);
  }, [accounts, debitAccountId]);

  const resetForm = () => {
    setCustomVoucherNo('');
    setCreditAccountId('');
    setCreditSearchQuery('');
    setCreditAmount('');
    setCreditDescription('');

    setDebitAccountId('');
    setDebitSearchQuery('');
    setDebitAmount('');
    setDebitDescription('');

    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!date) {
      setErrorMessage('Please select a valid transaction date.');
      return;
    }

    if (!selectedCreditAccount) {
      setErrorMessage('Please search and select the Credit From account.');
      return;
    }

    if (!selectedDebitAccount) {
      setErrorMessage('Please search and select the Debit To account.');
      return;
    }

    if (selectedCreditAccount.id === selectedDebitAccount.id) {
      setErrorMessage('The Credit From and Debit To accounts must be different accounts.');
      return;
    }

    const numAmount = parseFloat(creditAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid cash amount greater than zero.');
      return;
    }

    // Voucher Number (Optional: user can type custom voucher # or system auto-generates)
    const year = new Date().getFullYear();
    const count = cashTxns.length + 101;
    const autoVoucherNo = `CV-${year}-${count}`;
    const voucherNo = customVoucherNo.trim() || autoVoucherNo;

    const newTxn: CashTransaction = {
      id: `csh_${Date.now()}`,
      voucherNo,
      date,
      // 1. Credit From (CR)
      creditAccountId: selectedCreditAccount.id,
      creditAccountCode: selectedCreditAccount.code,
      creditAccountName: selectedCreditAccount.name,
      creditAccountCategory: selectedCreditAccount.category,
      creditAmount: numAmount,
      creditDescription: creditDescription.trim() || `Cash Cr: ${selectedCreditAccount.name}`,

      // 2. Debit To (DR)
      debitAccountId: selectedDebitAccount.id,
      debitAccountCode: selectedDebitAccount.code,
      debitAccountName: selectedDebitAccount.name,
      debitAccountCategory: selectedDebitAccount.category,
      debitAmount: numAmount,
      debitDescription: debitDescription.trim() || `Cash Dr: ${selectedDebitAccount.name}`,

      // Primary/legacy fields for system-wide compatibility
      accountId: selectedCreditAccount.id,
      accountCode: selectedCreditAccount.code,
      accountName: selectedCreditAccount.name,
      accountCategory: selectedCreditAccount.category,
      type: selectedCreditAccount.id === cashAccount?.id ? 'Cash Paid' : 'Cash Received',
      amount: numAmount,
      description: `${creditDescription.trim() || selectedCreditAccount.name} -> ${debitDescription.trim() || selectedDebitAccount.name}`,
      createdAt: new Date().toISOString(),
    };

    const saved = onSaveCashTxn(newTxn);
    if (saved) {
      setSuccessMessage(
        `Voucher ${voucherNo} saved successfully! PKR ${formatCurrency(numAmount)} credited from [${selectedCreditAccount.code}] and debited to [${selectedDebitAccount.code}].`
      );
      resetForm();
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleDelete = (txn: CashTransaction) => {
    if (confirm(`Void and delete cash voucher ${txn.voucherNo}?`)) {
      onDeleteCashTxn(txn.id);
      setSuccessMessage(`Cash voucher ${txn.voucherNo} voided.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Filter history list
  const filteredTxns = useMemo(() => {
    const q = historySearchQuery.toLowerCase().trim();
    if (!q) return cashTxns;
    return cashTxns.filter((txn) => {
      const crName = txn.creditAccountName || '';
      const crCode = txn.creditAccountCode || '';
      const drName = txn.debitAccountName || '';
      const drCode = txn.debitAccountCode || '';
      const vNo = txn.voucherNo || '';
      const desc = txn.description || '';
      const accName = txn.accountName || '';
      return (
        vNo.toLowerCase().includes(q) ||
        crName.toLowerCase().includes(q) ||
        crCode.toLowerCase().includes(q) ||
        drName.toLowerCase().includes(q) ||
        drCode.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        accName.toLowerCase().includes(q)
      );
    });
  }, [cashTxns, historySearchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO CARD: ONLY CASH IN HAND ACCOUNT CLOSING BALANCE (Per user request) */}
      <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span className="font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
              {cashAccount ? cashAccount.code : 'PERS-CASH'}
            </span>
            <span className="font-semibold text-slate-100">
              {cashAccount ? cashAccount.name : 'Cash in Hand Account'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Personal Account</span>
          </div>

          <div className="flex items-baseline gap-2.5 mt-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold text-slate-300">
              Closing Balance :
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400 tracking-tight">
              PKR {formatCurrency(Math.abs(cashAccountLedger.closingBalance))}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold border uppercase ${
                cashAccountLedger.closingBalance < 0
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {cashAccountLedger.closingBalance < 0 ? 'CR' : 'DR'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-2">
            Live persistent closing balance of Cash in Hand Account in Ejaz Business Solution
          </p>
        </div>

        {cashAccount && onViewLedger && (
          <button
            type="button"
            onClick={() => onViewLedger(cashAccount)}
            className="px-4 py-2 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>View Cash Ledger →</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 2. CASH DOUBLE-ENTRY VOUCHER FORM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Cash Voucher Entry
              </h2>
            </div>
          </div>

          {/* Top Controls: Voucher No (Optional) & Transaction Date */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Optional Voucher No */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Voucher No:</span>
              </span>
              <input
                type="text"
                value={customVoucherNo}
                onChange={(e) => setCustomVoucherNo(e.target.value)}
                placeholder="Auto (Optional)"
                className="w-32 sm:w-36 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
              />
            </div>

            {/* Transaction Date Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date:</span>
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* =========================================================================
                1. CREDIT FROM
                ========================================================================= */}
            <div className="p-5 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50/40 via-white to-white space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200/70">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-2xs">
                    1
                  </span>
                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                    Credit From
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                  CR (Credit)
                </span>
              </div>

              {/* Account 1 Search / Selector */}
              <div className="relative" ref={creditDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Search & Select Account (Code or Name) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={
                      selectedCreditAccount
                        ? `${selectedCreditAccount.code} - ${selectedCreditAccount.name}`
                        : creditSearchQuery
                    }
                    onChange={(e) => {
                      setCreditSearchQuery(e.target.value);
                      if (selectedCreditAccount) {
                        setCreditAccountId('');
                      }
                      setIsCreditDropdownOpen(true);
                    }}
                    onFocus={() => setIsCreditDropdownOpen(true)}
                    placeholder="Search by code (e.g. CUST-101, CASH) or name..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium shadow-2xs"
                  />
                  {selectedCreditAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreditAccountId('');
                        setCreditSearchQuery('');
                        setIsCreditDropdownOpen(true);
                      }}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isCreditDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 max-h-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto z-30 divide-y divide-slate-100">
                    {filteredCreditAccounts.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center italic">
                        No accounts found matching "{creditSearchQuery}"
                      </div>
                    ) : (
                      filteredCreditAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setCreditAccountId(acc.id);
                            setCreditSearchQuery('');
                            setIsCreditDropdownOpen(false);
                            if (!creditDescription) {
                              setCreditDescription(`Cash Credit from ${acc.name}`);
                            }
                          }}
                          className={`w-full text-left p-2.5 text-xs hover:bg-amber-50/70 transition-colors flex items-center justify-between cursor-pointer ${
                            selectedCreditAccount?.id === acc.id ? 'bg-amber-100/60 font-semibold' : ''
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              <span className="font-mono text-amber-800 font-bold mr-1.5">
                                {acc.code}
                              </span>
                              <span>{acc.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {acc.category} {acc.location ? `· ${acc.location}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Select
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Account Info Card */}
              {selectedCreditAccount && (
                <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-300 text-xs flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-900">{selectedCreditAccount.name}</span>
                    <div className="text-[11px] text-slate-600">
                      Code: <strong className="font-mono">{selectedCreditAccount.code}</strong> · Category: {selectedCreditAccount.category}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300 uppercase">
                    Credit (CR)
                  </span>
                </div>
              )}

              {/* Amount ONLY in Credit From section */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Cash Amount (PKR ₨) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-mono font-bold text-xs">
                    PKR
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-12 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
                {parseFloat(creditAmount) > 0 && (
                  <p className="text-[11px] text-amber-900 font-medium mt-1.5">
                    {numberToWords(parseFloat(creditAmount))}
                  </p>
                )}
              </div>

              {/* Description for Credit From */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Narration
                </label>
                <input
                  type="text"
                  value={creditDescription}
                  onChange={(e) => setCreditDescription(e.target.value)}
                  placeholder="e.g. Cash payment received / Cash issued from drawer"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
              </div>
            </div>

            {/* =========================================================================
                2. DEBIT TO
                ========================================================================= */}
            <div className="p-5 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/40 via-white to-white space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-blue-200/70">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow-2xs">
                    2
                  </span>
                  <span className="text-sm font-bold text-slate-900 tracking-tight">
                    Debit To
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 uppercase tracking-wider">
                  DR (Debit)
                </span>
              </div>

              {/* Account 2 Search / Selector */}
              <div className="relative" ref={debitDropdownRef}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Search & Select Account (Code or Name) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={
                      selectedDebitAccount
                        ? `${selectedDebitAccount.code} - ${selectedDebitAccount.name}`
                        : debitSearchQuery
                    }
                    onChange={(e) => {
                      setDebitSearchQuery(e.target.value);
                      if (selectedDebitAccount) {
                        setDebitAccountId('');
                      }
                      setIsDebitDropdownOpen(true);
                    }}
                    onFocus={() => setIsDebitDropdownOpen(true)}
                    placeholder="Search by code (e.g. EXP-101, CASH, HBL) or name..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
                  />
                  {selectedDebitAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        setDebitAccountId('');
                        setDebitSearchQuery('');
                        setIsDebitDropdownOpen(true);
                      }}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Menu */}
                {isDebitDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 max-h-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto z-30 divide-y divide-slate-100">
                    {filteredDebitAccounts.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center italic">
                        No accounts found matching "{debitSearchQuery}"
                      </div>
                    ) : (
                      filteredDebitAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setDebitAccountId(acc.id);
                            setDebitSearchQuery('');
                            setIsDebitDropdownOpen(false);
                            if (!debitDescription) {
                              setDebitDescription(`Cash Debit to ${acc.name}`);
                            }
                          }}
                          className={`w-full text-left p-2.5 text-xs hover:bg-blue-50/70 transition-colors flex items-center justify-between cursor-pointer ${
                            selectedDebitAccount?.id === acc.id ? 'bg-blue-100/60 font-semibold' : ''
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              <span className="font-mono text-blue-800 font-bold mr-1.5">
                                {acc.code}
                              </span>
                              <span>{acc.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {acc.category} {acc.location ? `· ${acc.location}` : ''}
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Select
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Account Info Card */}
              {selectedDebitAccount && (
                <div className="p-2.5 rounded-lg bg-blue-100/70 border border-blue-300 text-xs flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-900">{selectedDebitAccount.name}</span>
                    <div className="text-[11px] text-slate-600">
                      Code: <strong className="font-mono">{selectedDebitAccount.code}</strong> · Category: {selectedDebitAccount.category}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-300 uppercase">
                    Debit (DR)
                  </span>
                </div>
              )}

              {/* Auto-Matched Debit Amount (User does not enter amount twice) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Debit Amount (PKR ₨)
                </label>
                <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200/90 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Auto-balanced with Credit
                    </span>
                    <span className="text-base font-bold font-mono tabular-nums text-blue-950">
                      PKR {creditAmount ? formatCurrency(parseFloat(creditAmount) || 0) : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-800 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Auto-Matched</span>
                  </div>
                </div>
              </div>

              {/* Description for Debit To */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Description / Narration
                </label>
                <input
                  type="text"
                  value={debitDescription}
                  onChange={(e) => setDebitDescription(e.target.value)}
                  placeholder="e.g. Office expense booked / Deposit into account"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Professional Flow Summary */}
          {selectedCreditAccount && selectedDebitAccount && creditAmount && (
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800 shadow-xs">
              <div className="flex items-center gap-2.5 flex-wrap text-xs">
                <span className="text-slate-400 font-medium">Transaction Flow:</span>
                <span className="px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 font-bold border border-amber-500/40">
                  Credit From: {selectedCreditAccount.code} ({selectedCreditAccount.name})
                </span>
                <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="px-2.5 py-1 rounded-md bg-blue-950/80 text-blue-300 font-bold border border-blue-500/40">
                  Debit To: {selectedDebitAccount.code} ({selectedDebitAccount.name})
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400">Total:</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  PKR {formatCurrency(parseFloat(creditAmount) || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Clear Form
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Cash Voucher</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. CASH IN HAND VOUCHERS HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Cash Vouchers Journal & Audit History
            </h3>
            <p className="text-[11px] text-slate-500">
              Complete chronological journal of double-entry cash debits and credits
            </p>
          </div>

          {/* Search History Box */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search voucher #, account code or name..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-24">Date</th>
                <th className="py-3 px-4 w-28">Voucher #</th>
                <th className="py-3 px-4">Credit From (CR)</th>
                <th className="py-3 px-4">Debit To (DR)</th>
                <th className="py-3 px-4 text-right w-28">Amount (PKR)</th>
                <th className="py-3 px-4 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No cash transactions recorded matching your search.
                  </td>
                </tr>
              ) : (
                filteredTxns.map((txn) => {
                  const hasDoubleEntry = txn.creditAccountCode && txn.debitAccountCode;

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-600">
                        {txn.date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {txn.voucherNo}
                      </td>

                      {/* Credit Account (CR) */}
                      <td className="py-3 px-4">
                        {hasDoubleEntry ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-800 text-[11px]">
                                {txn.creditAccountCode}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {txn.creditAccountName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                CR
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                              {txn.creditDescription}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-mono font-bold text-slate-900">
                              {txn.accountCode}
                            </span>
                            <span className="ml-1 text-slate-700">{txn.accountName}</span>
                            <div className="text-[10px] text-slate-400">{txn.type}</div>
                          </div>
                        )}
                      </td>

                      {/* Debit Account (DR) */}
                      <td className="py-3 px-4">
                        {hasDoubleEntry ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-800 text-[11px]">
                                {txn.debitAccountCode}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {txn.debitAccountName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                DR
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                              {txn.debitDescription}
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 italic text-[11px]">
                            {txn.type === 'Cash Received' ? 'Debited to Cash in Hand' : 'Credited from Cash in Hand'}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-slate-900">
                        PKR {formatCurrency(Number(txn.amount))}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(txn)}
                          title="Void / Delete Transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
