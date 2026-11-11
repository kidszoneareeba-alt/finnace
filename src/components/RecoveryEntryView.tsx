import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
  DollarSign,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Building,
  CreditCard,
  Banknote,
  RotateCcw,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { Account, RecoveryEntry, PaymentMethod, UserProfile, CustomerInvoice, CashTransaction } from '../types';
import {
  SYSTEM_TODAY,
  calculateCustomerBalance,
  generateVoucherNumber,
  getInvoiceDueStatus,
} from '../utils/accounting';
import { ReceiptVoucherModal } from './ReceiptVoucherModal';
import { formatCurrency } from '../utils/numberToWords';

interface RecoveryEntryViewProps {
  accounts: Account[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  cashTxns: CashTransaction[];
  userProfile: UserProfile;
  onSaveRecovery: (recovery: RecoveryEntry) => boolean;
  onDeleteRecovery: (id: string) => boolean;
  onNavigateToCreateAccount: () => void;
}

export const RecoveryEntryView: React.FC<RecoveryEntryViewProps> = ({
  accounts,
  recoveries,
  invoices,
  cashTxns,
  userProfile,
  onSaveRecovery,
  onDeleteRecovery,
  onNavigateToCreateAccount,
}) => {
  // 1. Date (defaults to current system date)
  const [date, setDate] = useState(SYSTEM_TODAY);

  // 2. Customer Selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // 3. Invoice Selection & Entry
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  // 4. Cash Section
  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');

  // 5. Cheque Section
  const [chequeAmount, setChequeAmount] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeDate, setChequeDate] = useState(SYSTEM_TODAY);
  const [chequeDescription, setChequeDescription] = useState('');

  // General remarks
  const [generalRemarks, setGeneralRemarks] = useState('');

  // UI status
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [activeVoucherForPrint, setActiveVoucherForPrint] = useState<{
    recovery: RecoveryEntry;
    previousBalance: number;
    account?: Account;
  } | null>(null);

  // Filter accounts
  const customerAccounts = accounts.filter((a) => a.category === 'Customer');
  const cashAccount = accounts.find(
    (a) => a.code === 'PERS-CASH' || a.id === 'acc_pers_cash' || a.name.toLowerCase().includes('cash in hand')
  );
  const chequeAccount = accounts.find(
    (a) => a.code === 'PERS-CHEQ' || a.id === 'acc_pers_cheq' || a.name.toLowerCase().includes('cheque in hand')
  );

  // Selected customer resolution
  const matchedCustomer = customerAccounts.find((c) => c.id === selectedCustomerId);

  const customerCurrentBalance = matchedCustomer
    ? calculateCustomerBalance(matchedCustomer, invoices, recoveries, cashTxns)
    : 0;

  // Search filtered customers for dropdown
  const filteredCustomers = customerAccounts.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.contact.toLowerCase().includes(q)
    );
  });

  const handleSelectCustomer = (customer: Account) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(`${customer.code} - ${customer.name}`);
    setIsCustomerDropdownOpen(false);
    setInvoiceNo('');
    setSelectedInvoiceId('');
    setErrorMessage('');
  };

  // Customer's recorded invoices
  const customerInvoices = useMemo(() => {
    if (!matchedCustomer) return [];
    return invoices.filter((inv) => inv.customerId === matchedCustomer.id);
  }, [matchedCustomer, invoices]);

  // Selected or typed invoice resolution
  const matchedInvoice = useMemo(() => {
    if (!invoiceNo.trim() && !selectedInvoiceId) return null;
    return (
      customerInvoices.find((inv) => inv.id === selectedInvoiceId) ||
      customerInvoices.find(
        (inv) => inv.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()
      ) ||
      invoices.find(
        (inv) =>
          inv.customerId === matchedCustomer?.id &&
          inv.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()
      ) ||
      null
    );
  }, [customerInvoices, invoiceNo, selectedInvoiceId, invoices, matchedCustomer]);

  // Calculate invoice due amount and 15-day status
  const matchedInvoiceDueInfo = useMemo(() => {
    if (!matchedInvoice) return null;
    const priorRecoveries = recoveries
      .filter(
        (r) =>
          r.customerId === matchedInvoice.customerId &&
          (r.invoiceId === matchedInvoice.id ||
            (r.invoiceNo && r.invoiceNo.toUpperCase() === matchedInvoice.invoiceNo.toUpperCase()) ||
            (r.remarks && r.remarks.includes(matchedInvoice.invoiceNo)))
      )
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const dueAmount = Math.max(0, Number(matchedInvoice.amount || 0) - priorRecoveries);
    const dueStatus = getInvoiceDueStatus(matchedInvoice, SYSTEM_TODAY);

    return {
      invoice: matchedInvoice,
      totalAmount: Number(matchedInvoice.amount || 0),
      priorRecoveries,
      dueAmount,
      dueStatus,
    };
  }, [matchedInvoice, recoveries]);

  const handleSelectInvoiceDropdown = (invId: string) => {
    setSelectedInvoiceId(invId);
    const inv = customerInvoices.find((i) => i.id === invId);
    if (inv) {
      setInvoiceNo(inv.invoiceNo);
      setErrorMessage('');
    } else {
      setInvoiceNo('');
    }
  };

  const handleInvoiceNoChange = (val: string) => {
    setInvoiceNo(val);
    const inv = customerInvoices.find(
      (i) => i.invoiceNo.trim().toUpperCase() === val.trim().toUpperCase()
    );
    if (inv) {
      setSelectedInvoiceId(inv.id);
    } else {
      setSelectedInvoiceId('');
    }
  };

  const handleAutoFillDueAmount = (type: 'cash' | 'cheque') => {
    if (!matchedInvoiceDueInfo) return;
    const fillAmt = String(matchedInvoiceDueInfo.dueAmount);
    if (type === 'cash') {
      setCashAmount(fillAmt);
      if (!cashDescription) {
        setCashDescription(`Recovery against invoice #${matchedInvoiceDueInfo.invoice.invoiceNo}`);
      }
    } else {
      setChequeAmount(fillAmt);
      if (!chequeDescription) {
        setChequeDescription(`Cheque recovery against invoice #${matchedInvoiceDueInfo.invoice.invoiceNo}`);
      }
    }
  };

  // Numeric totals calculation
  const numCash = parseFloat(cashAmount) || 0;
  const numCheque = parseFloat(chequeAmount) || 0;
  const totalRecoveryAmount = numCash + numCheque;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!date) {
      setErrorMessage('Please select a valid transaction date.');
      return;
    }

    if (!matchedCustomer) {
      setErrorMessage('Please search and select a valid customer account by code or name.');
      return;
    }

    if (numCash <= 0 && numCheque <= 0) {
      setErrorMessage('Please enter at least Cash Amount or Cheque Amount received.');
      return;
    }

    // Determine payment method classification
    let paymentMethod: PaymentMethod = 'Cash';
    if (numCash > 0 && numCheque > 0) {
      paymentMethod = 'Cash & Cheque';
    } else if (numCheque > 0) {
      paymentMethod = 'Cheque';
    } else {
      paymentMethod = 'Cash';
    }

    const voucherNo = generateVoucherNumber('REC', recoveries.length);

    // Build consolidated remarks
    const remarkSegments: string[] = [];
    if (matchedInvoice) {
      remarkSegments.push(`Against Inv #${matchedInvoice.invoiceNo}`);
    } else if (invoiceNo.trim()) {
      remarkSegments.push(`Against Inv #${invoiceNo.trim().toUpperCase()}`);
    }

    if (generalRemarks.trim()) {
      remarkSegments.push(generalRemarks.trim());
    }
    if (numCash > 0 && cashDescription.trim()) {
      remarkSegments.push(`Cash: ${cashDescription.trim()}`);
    }
    if (numCheque > 0 && (chequeNo.trim() || chequeBank.trim() || chequeDescription.trim())) {
      const chqInfo = [
        chequeNo ? `Chq #${chequeNo.trim()}` : '',
        chequeBank ? `Bank: ${chequeBank.trim()}` : '',
        chequeDescription.trim(),
      ].filter(Boolean).join(' | ');
      remarkSegments.push(`Cheque: ${chqInfo}`);
    }

    const finalInvoiceNo = matchedInvoice ? matchedInvoice.invoiceNo : (invoiceNo.trim().toUpperCase() || undefined);

    const newRecovery: RecoveryEntry = {
      id: `rec_${Date.now()}`,
      voucherNo,
      date,
      customerId: matchedCustomer.id,
      customerCode: matchedCustomer.code,
      customerName: matchedCustomer.name,
      invoiceId: matchedInvoice?.id,
      invoiceNo: finalInvoiceNo,
      amount: totalRecoveryAmount,
      paymentMethod,
      cashAmount: numCash > 0 ? numCash : undefined,
      cashDescription: cashDescription.trim() || undefined,
      chequeAmount: numCheque > 0 ? numCheque : undefined,
      chequeNo: chequeNo.trim() || undefined,
      chequeBank: chequeBank.trim() || undefined,
      chequeDate: chequeDate || undefined,
      chequeDescription: chequeDescription.trim() || undefined,
      remarks: remarkSegments.join(' // '),
      receivedBy: userProfile.name,
      createdAt: new Date().toISOString(),
    };

    const saved = onSaveRecovery(newRecovery);
    if (saved) {
      setSuccessMessage(
        `Recovery voucher ${voucherNo} for PKR ${formatCurrency(totalRecoveryAmount)} saved! ` +
        (finalInvoiceNo ? `Linked to Invoice #${finalInvoiceNo}. ` : '') +
        (numCash > 0 ? `Cash PKR ${formatCurrency(numCash)} debited to Cash in Hand (${cashAccount?.code || 'PERS-CASH'}). ` : '') +
        (numCheque > 0 ? `Cheque PKR ${formatCurrency(numCheque)} debited to Cheque in Hand (${chequeAccount?.code || 'PERS-CHEQ'}). ` : '') +
        `Customer ${matchedCustomer.code} credited.`
      );

      // Auto-trigger print receipt preview
      setActiveVoucherForPrint({
        recovery: newRecovery,
        previousBalance: customerCurrentBalance,
        account: matchedCustomer,
      });

      // Clear form
      setCashAmount('');
      setCashDescription('');
      setChequeAmount('');
      setChequeNo('');
      setChequeBank('');
      setChequeDescription('');
      setGeneralRemarks('');
      setInvoiceNo('');
      setSelectedInvoiceId('');
    }
  };

  const handleResetForm = () => {
    setDate(SYSTEM_TODAY);
    setSelectedCustomerId('');
    setCustomerSearch('');
    setInvoiceNo('');
    setSelectedInvoiceId('');
    setCashAmount('');
    setCashDescription('');
    setChequeAmount('');
    setChequeNo('');
    setChequeBank('');
    setChequeDescription('');
    setGeneralRemarks('');
    setErrorMessage('');
  };

  const handlePrintEntry = (entry: RecoveryEntry) => {
    const cust = customerAccounts.find((c) => c.id === entry.customerId);
    const prevBal = cust
      ? calculateCustomerBalance(cust, invoices, recoveries, cashTxns) + entry.amount
      : entry.amount;
    setActiveVoucherForPrint({
      recovery: entry,
      previousBalance: prevBal,
      account: cust,
    });
  };

  const handleDeleteEntry = (entry: RecoveryEntry) => {
    if (confirm(`Are you sure you want to void and delete recovery voucher ${entry.voucherNo}?`)) {
      onDeleteRecovery(entry.id);
      setSuccessMessage(`Recovery voucher ${entry.voucherNo} was deleted.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Filter history
  const filteredRecoveries = recoveries.filter((r) => {
    const q = historySearchQuery.toLowerCase().trim();
    return (
      !q ||
      r.voucherNo.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.customerCode.toLowerCase().includes(q) ||
      (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
      r.paymentMethod.toLowerCase().includes(q) ||
      (r.chequeNo && r.chequeNo.toLowerCase().includes(q)) ||
      (r.remarks && r.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Recovery Desk
              </span>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Customer Recovery Entry
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select date & customer, enter invoice no to view pending due amount, and record cash/cheque collection
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <div className="text-[11px]">
                <span className="text-slate-500">Cash Account: </span>
                <span className="font-mono font-bold text-emerald-900">{cashAccount?.code || 'PERS-CASH'}</span>
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <div className="text-[11px]">
                <span className="text-slate-500">Cheque Account: </span>
                <span className="font-mono font-bold text-blue-900">{chequeAccount?.code || 'PERS-CHEQ'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium leading-relaxed">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer shrink-0 ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onNavigateToCreateAccount}
            className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer shrink-0 ml-3"
          >
            Register Customer Account
          </button>
        </div>
      )}

      {/* Main Entry Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-visible">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                New Customer Recovery Voucher
              </h2>
              <p className="text-[11px] text-slate-500">
                1. Date ➔ 2. Customer ➔ 3. Invoice No & Due Amount ➔ 4. Cash ➔ 5. Cheque ➔ Save
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* SECTION 1: Date & Customer Search */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* 1. Date */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                1. Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Transaction posting date</p>
            </div>

            {/* 2. Customer Search / Selection */}
            <div className="md:col-span-8 relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  2. Select Customer (by Code or Name) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onNavigateToCreateAccount}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  + Add New Customer
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={customerSearch}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsCustomerDropdownOpen(true);
                    // If manually typed code directly matches
                    const direct = customerAccounts.find(
                      (c) => c.code.toLowerCase() === e.target.value.trim().toLowerCase()
                    );
                    if (direct) {
                      setSelectedCustomerId(direct.id);
                    }
                  }}
                  placeholder="Search code e.g. CUST-101 or type company name (Al-Madina, Zubair, Tariq)..."
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch('');
                      setSelectedCustomerId('');
                      setInvoiceNo('');
                      setSelectedInvoiceId('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No customer account found matching &quot;{customerSearch}&quot;.
                    </div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className={`w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50/80 transition-colors cursor-pointer flex items-center justify-between ${
                          selectedCustomerId === c.id ? 'bg-emerald-50 font-bold text-emerald-900' : 'text-slate-800'
                        }`}
                      >
                        <div className="truncate pr-3">
                          <span className="font-mono font-bold text-slate-900 mr-2 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            {c.code}
                          </span>
                          <span className="font-medium text-slate-900">{c.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">({c.location || 'Lahore'})</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-600 shrink-0">
                          {c.contact}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Customer Account Details Card */}
              {matchedCustomer && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-900">{matchedCustomer.name}</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                        {matchedCustomer.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {matchedCustomer.location || 'Lahore, Pakistan'} · Phone: {matchedCustomer.contact || 'N/A'}
                    </p>
                  </div>

                  <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      {customerCurrentBalance < 0 ? 'Current Advance (Credit)' : 'Current Outstanding (Receivable)'}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold tabular-nums ${
                        customerCurrentBalance < 0 ? 'text-amber-700' : 'text-rose-700'
                      }`}
                    >
                      PKR {formatCurrency(Math.abs(customerCurrentBalance))} {customerCurrentBalance < 0 ? 'Cr' : 'Dr'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Invoice No Entry & Auto Due Amount Display */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  3. Invoice No & Due Amount (انوس نمبر اور واجب الادا رقم)
                </h3>
              </div>
              <span className="text-[11px] text-indigo-700 font-medium">
                {matchedCustomer
                  ? `${customerInvoices.length} recorded invoice(s) for this customer`
                  : 'Select a customer first to view invoices'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Invoice Dropdown / Picker */}
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pick from Customer&apos;s Invoices
                </label>
                <div className="relative">
                  <select
                    disabled={!matchedCustomer || customerInvoices.length === 0}
                    value={selectedInvoiceId}
                    onChange={(e) => handleSelectInvoiceDropdown(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!matchedCustomer
                        ? 'Select customer above first...'
                        : customerInvoices.length === 0
                        ? 'No recorded invoices found for this customer'
                        : `-- Select from ${customerInvoices.length} recorded invoice(s) --`}
                    </option>
                    {customerInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNo} · Date: {inv.date} · PKR {formatCurrency(inv.amount)} ({inv.description.slice(0, 28)})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Choose from customer&apos;s billing records or type below
                </p>
              </div>

              {/* Invoice No Direct Typing */}
              <div className="md:col-span-6">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Type Invoice No (e.g. INV-2026-401)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => handleInvoiceNoChange(e.target.value)}
                    placeholder="e.g. INV-2026-401"
                    className="w-full px-3 py-2 text-sm bg-white border border-indigo-300 rounded-lg text-slate-900 font-mono uppercase font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {invoiceNo && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceNo('');
                        setSelectedInvoiceId('');
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Entering invoice number automatically calculates due balance
                </p>
              </div>
            </div>

            {/* Auto-Displayed Invoice Due Amount Card */}
            {matchedInvoiceDueInfo ? (
              <div className="bg-white rounded-xl border-2 border-indigo-300 p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-indigo-950 bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                      #{matchedInvoiceDueInfo.invoice.invoiceNo}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      Date: <span className="font-mono font-semibold">{matchedInvoiceDueInfo.invoice.date}</span>
                    </span>
                    {matchedInvoiceDueInfo.dueStatus.isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        15-Days Overdue ({matchedInvoiceDueInfo.dueStatus.daysOverdue}d ago)
                      </span>
                    ) : matchedInvoiceDueInfo.dueStatus.isDueSoon ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                        Due in {matchedInvoiceDueInfo.dueStatus.daysRemaining} days
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        Active Term (Due: {matchedInvoiceDueInfo.dueStatus.dueDate})
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 truncate max-w-sm">
                    {matchedInvoiceDueInfo.invoice.description}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Total Invoice Amount
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      PKR {formatCurrency(matchedInvoiceDueInfo.totalAmount)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Already Recovered / Cleared
                    </span>
                    <span className="font-mono font-bold text-slate-700 text-sm">
                      PKR {formatCurrency(matchedInvoiceDueInfo.priorRecoveries)}
                    </span>
                  </div>

                  {/* PROMINENT DUE AMOUNT */}
                  <div className="p-2.5 rounded-lg bg-indigo-50 border-2 border-indigo-400">
                    <span className="text-[10px] uppercase font-extrabold text-indigo-900 block flex items-center justify-between">
                      <span>Invoice Due Amount (بقیہ واجب الادا)</span>
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                    </span>
                    <span className="font-mono font-black text-indigo-950 text-base tabular-nums block mt-0.5">
                      PKR {formatCurrency(matchedInvoiceDueInfo.dueAmount)}
                    </span>
                  </div>
                </div>

                {/* Quick Auto-Fill Buttons */}
                {matchedInvoiceDueInfo.dueAmount > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Quick Amount Fill:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAutoFillDueAmount('cash')}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Banknote className="w-3 h-3 text-emerald-700" />
                      <span>Fill Cash: PKR {formatCurrency(matchedInvoiceDueInfo.dueAmount)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAutoFillDueAmount('cheque')}
                      className="px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <FileCheck2 className="w-3 h-3 text-blue-700" />
                      <span>Fill Cheque: PKR {formatCurrency(matchedInvoiceDueInfo.dueAmount)}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : invoiceNo.trim() ? (
              <div className="p-3 bg-white rounded-lg border border-indigo-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>
                    Custom Invoice No entered: <strong className="font-mono uppercase text-indigo-900">{invoiceNo}</strong>.
                    This voucher will be linked against this invoice reference.
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <hr className="border-slate-200" />

          {/* SECTION 3: Cash Amount Received & Auto Cash in Hand Account */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  4. Cash Amount Received (نقد رقم)
                </h3>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">
                Auto-updates Cash in Hand Safe & Customer Ledger
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Cash Amount */}
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash Amount (PKR ₨)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-800 font-mono text-xs font-bold">
                    PKR
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="e.g. 25,000"
                    className="w-full pl-12 pr-3 py-2 text-sm bg-white border border-emerald-300 rounded-lg text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Cash Description */}
              <div className="md:col-span-7">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash Description / Narration (تفصیل)
                </label>
                <input
                  type="text"
                  value={cashDescription}
                  onChange={(e) => setCashDescription(e.target.value)}
                  placeholder="e.g. Received cash at counter against pending invoice / on-spot collection"
                  className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Auto Cash in Hand Account Notification Box */}
            <div className="bg-white rounded-lg border border-emerald-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">
                    Auto Destination: {cashAccount?.name || 'Cash in Hand Account'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 ml-1.5 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                    ({cashAccount?.code || 'PERS-CASH'})
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permanent Account under Personal Category · Head Office Safe, Lahore
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Customer</span>
                  <span className="text-[11px] font-bold text-rose-700">Credit (CR)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cash in Hand</span>
                  <span className="text-[11px] font-bold text-emerald-700">Debit (DR)</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Cheque Amount Received & Auto Cheque in Hand Account */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center">
                  <FileCheck2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  5. Cheque Amount Received (چیک رقم - اختیاری)
                </h3>
              </div>
              <span className="text-[11px] text-blue-700 font-medium">
                Auto-debited to Cheque in Hand permanent account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
              {/* Cheque Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque Amount (PKR ₨)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-800 font-mono text-xs font-bold">
                    PKR
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={chequeAmount}
                    onChange={(e) => setChequeAmount(e.target.value)}
                    placeholder="e.g. 50,000"
                    className="w-full pl-12 pr-3 py-2 text-sm bg-white border border-blue-300 rounded-lg text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Cheque Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque No. (چیک نمبر)
                </label>
                <input
                  type="text"
                  value={chequeNo}
                  onChange={(e) => setChequeNo(e.target.value)}
                  placeholder="e.g. CHQ-990142"
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cheque Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Name (بینک)
                </label>
                <input
                  type="text"
                  value={chequeBank}
                  onChange={(e) => setChequeBank(e.target.value)}
                  placeholder="e.g. Meezan Bank / HBL / MCB"
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cheque Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque Clearing Date
                </label>
                <input
                  type="date"
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Cheque Description */}
              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque Description / Narration (تفصیل)
                </label>
                <input
                  type="text"
                  value={chequeDescription}
                  onChange={(e) => setChequeDescription(e.target.value)}
                  placeholder="e.g. Crossed cheque received against invoice clearance"
                  className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Auto Cheque in Hand Account Notification Box */}
            <div className="bg-white rounded-lg border border-blue-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">
                    Auto Destination: {chequeAccount?.name || 'Cheque in Hand Account'}
                  </span>
                  <span className="font-mono font-bold text-blue-700 ml-1.5 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                    ({chequeAccount?.code || 'PERS-CHEQ'})
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Permanent Account under Personal Category · Head Office Cheque Safe, Lahore
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Customer</span>
                  <span className="text-[11px] font-bold text-rose-700">Credit (CR)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Cheque in Hand</span>
                  <span className="text-[11px] font-bold text-blue-700">Debit (DR)</span>
                </div>
              </div>
            </div>
          </div>

          {/* General Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Recovery Voucher Remarks (اختیاری ریمارکس)
            </label>
            <input
              type="text"
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              placeholder="e.g. Official collection voucher issued at Ejaz Business Solution Lahore office"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Calculation Summary & Save Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Live Impact Preview */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-slate-100 px-3 py-2 rounded-lg">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total Recovery</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  PKR {formatCurrency(totalRecoveryAmount)}
                </span>
              </div>

              {matchedInvoiceDueInfo && (
                <div className="bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-indigo-700 block">
                    Invoice Due After Payment
                  </span>
                  <span className="font-mono font-bold text-indigo-950 text-sm">
                    PKR {formatCurrency(Math.max(0, matchedInvoiceDueInfo.dueAmount - totalRecoveryAmount))}
                  </span>
                </div>
              )}

              {matchedCustomer && totalRecoveryAmount > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Overall Customer Balance</span>
                  <span className="font-mono font-bold text-emerald-950 text-sm">
                    PKR {formatCurrency(Math.abs(customerCurrentBalance - totalRecoveryAmount))}{' '}
                    {customerCurrentBalance - totalRecoveryAmount < 0 ? 'Cr' : 'Dr'}
                  </span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Recovery & Post to Accounts</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Recovery History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Customer Recovery Audit Trail & Voucher History
            </h3>
            <p className="text-[11px] text-slate-500">
              Detailed history of all Cash & Cheque collections with invoice link and official receipt printout
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search voucher, customer code, invoice #, cheque #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Against Invoice</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Cash (PERS-CASH)</th>
                <th className="py-3 px-4 text-right">Cheque (PERS-CHEQ)</th>
                <th className="py-3 px-4 text-right">Total Recovery</th>
                <th className="py-3 px-4">Description / Remarks</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecoveries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No recovery records found.
                  </td>
                </tr>
              ) : (
                filteredRecoveries.map((rec) => {
                  const recCash = rec.cashAmount !== undefined ? rec.cashAmount : (rec.paymentMethod === 'Cash' ? rec.amount : 0);
                  const recCheque = rec.chequeAmount !== undefined ? rec.chequeAmount : (rec.paymentMethod === 'Cheque' ? rec.amount : 0);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-600">
                        {rec.date}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {rec.voucherNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{rec.customerName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{rec.customerCode}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {rec.invoiceNo ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                            {rec.invoiceNo}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">General Ledger</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            rec.paymentMethod === 'Cash'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.paymentMethod === 'Cheque'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {rec.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {recCash > 0 ? (
                          <span className="font-bold text-emerald-700">
                            PKR {formatCurrency(recCash)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        {recCheque > 0 ? (
                          <div>
                            <span className="font-bold text-blue-700">
                              PKR {formatCurrency(recCheque)}
                            </span>
                            {rec.chequeNo && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                #{rec.chequeNo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        PKR {formatCurrency(rec.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                        {rec.remarks || rec.cashDescription || rec.chequeDescription || '—'}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintEntry(rec)}
                            title="Print Recovery Voucher Receipt"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(rec)}
                            title="Void / Delete Entry"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Voucher Modal */}
      {activeVoucherForPrint && (
        <ReceiptVoucherModal
          recovery={activeVoucherForPrint.recovery}
          previousBalance={activeVoucherForPrint.previousBalance}
          customerAccount={activeVoucherForPrint.account}
          userProfile={userProfile}
          onClose={() => setActiveVoucherForPrint(null)}
        />
      )}
    </div>
  );
};
