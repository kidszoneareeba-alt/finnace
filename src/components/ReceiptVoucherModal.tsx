import React from 'react';
import { Printer, X, CheckCircle2, Building2 } from 'lucide-react';
import { RecoveryEntry, UserProfile, Account } from '../types';
import { numberToWords, formatCurrency } from '../utils/numberToWords';

interface ReceiptVoucherModalProps {
  recovery: RecoveryEntry | null;
  userProfile: UserProfile;
  customerAccount?: Account;
  previousBalance?: number;
  onClose: () => void;
}

export const ReceiptVoucherModal: React.FC<ReceiptVoucherModalProps> = ({
  recovery,
  userProfile,
  customerAccount,
  previousBalance = 0,
  onClose,
}) => {
  if (!recovery) return null;

  const currentOutstandingAfter = previousBalance - recovery.amount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print-shadow-none print:w-full print:max-w-none print:border-none">
        {/* Modal Controls (Hidden when printed) */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-800">
              Recovery Receipt Voucher #{recovery.voucherNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 space-y-6 text-slate-900" id="printable-voucher">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 print:text-black" />
                <h1 className="text-lg font-bold uppercase tracking-tight text-slate-900">
                  {userProfile.companyName}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                {userProfile.companyAddress}
              </p>
              <p className="text-xs text-slate-500">
                Phone: {userProfile.companyPhone} · Email: {userProfile.email}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold uppercase tracking-wider rounded">
                Official Recovery Receipt
              </span>
              <div className="mt-2 text-xs font-mono">
                <div className="text-slate-500">Voucher No:</div>
                <div className="text-sm font-bold text-slate-900">{recovery.voucherNo}</div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div>
              <span className="text-slate-500 block text-[11px]">Received From (Customer):</span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {recovery.customerName}
              </span>
              <span className="font-mono text-slate-600 block mt-0.5">
                Customer Code: {recovery.customerCode}
              </span>
              {customerAccount?.contact && (
                <span className="text-slate-500 block">Contact: {customerAccount.contact}</span>
              )}
              {customerAccount?.location && (
                <span className="text-slate-500 block">Location: {customerAccount.location}</span>
              )}
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-500 text-[11px]">Transaction Date:</span>
                <span className="font-mono font-semibold ml-2 text-slate-900">{recovery.date}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px]">Payment Method:</span>
                <span className="font-semibold ml-2 text-slate-900">{recovery.paymentMethod}</span>
              </div>
              {recovery.paymentMethod === 'Bank' && recovery.bankAccountName && (
                <div className="text-slate-600 text-[11px]">
                  Deposited To: <span className="font-medium">{recovery.bankAccountName}</span>
                </div>
              )}
              {recovery.invoiceNo && (
                <div>
                  <span className="text-slate-500 text-[11px]">Against Invoice:</span>
                  <span className="font-mono font-bold ml-2 text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {recovery.invoiceNo}
                  </span>
                </div>
              )}
              <div>
                <span className="text-slate-500 text-[11px]">Collected By:</span>
                <span className="font-medium ml-2 text-slate-900">{recovery.receivedBy || 'Ejaz Ali (Director)'}</span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="border border-slate-200 rounded-xl p-5 bg-emerald-50/40 print:bg-white print:border-slate-400 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">
                Total Amount Received (PKR)
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-800 tabular-nums">
                PKR {formatCurrency(recovery.amount)}
              </span>
            </div>

            {/* Breakdown between Cash in Hand & Cheque in Hand if available */}
            {(recovery.cashAmount || recovery.chequeAmount) && (
              <div className="grid grid-cols-2 gap-3 pt-1 pb-1">
                {recovery.cashAmount !== undefined && recovery.cashAmount > 0 && (
                  <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Cash Received (Cash in Hand - PERS-CASH)
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      PKR {formatCurrency(recovery.cashAmount)}
                    </span>
                    {recovery.cashDescription && (
                      <p className="text-[10px] text-slate-600 mt-0.5">{recovery.cashDescription}</p>
                    )}
                  </div>
                )}
                {recovery.chequeAmount !== undefined && recovery.chequeAmount > 0 && (
                  <div className="p-2.5 rounded-lg bg-blue-100/60 border border-blue-200 text-xs">
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">
                      Cheque Received (Cheque in Hand - PERS-CHEQ)
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      PKR {formatCurrency(recovery.chequeAmount)}
                    </span>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                      {[recovery.chequeNo ? `Chq #${recovery.chequeNo}` : '', recovery.chequeBank, recovery.chequeDate ? `Date: ${recovery.chequeDate}` : ''].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <span className="text-[11px] text-slate-500 block">Amount in Words:</span>
              <span className="text-xs font-semibold text-slate-800 italic block mt-0.5">
                {numberToWords(recovery.amount)}
              </span>
            </div>
            {recovery.remarks && (
              <div className="mt-2 pt-2 border-t border-slate-200/60">
                <span className="text-[11px] text-slate-500 block">Remarks / Notes:</span>
                <span className="text-xs text-slate-700 block mt-0.5">{recovery.remarks}</span>
              </div>
            )}
          </div>

          {/* Balance Statement Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-center border border-slate-200 rounded-xl p-3 bg-slate-50 print:bg-white">
            <div className="border-r border-slate-200 pr-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Previous Outstanding
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                PKR {formatCurrency(previousBalance)}
              </span>
            </div>
            <div className="border-r border-slate-200 px-2">
              <span className="text-[10px] text-emerald-600 uppercase tracking-wider block">
                Recovery Deducted
              </span>
              <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                -PKR {formatCurrency(recovery.amount)}
              </span>
            </div>
            <div className="pl-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Remaining Balance
              </span>
              <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                PKR {formatCurrency(Math.max(0, currentOutstandingAfter))}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-10 flex items-center justify-between text-xs text-slate-500">
            <div className="text-center w-44">
              <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-800">
                Customer Signature
              </div>
              <span className="text-[10px] text-slate-400">Payer Confirmation</span>
            </div>
            <div className="text-center w-44">
              <div className="border-t border-slate-400 pt-1.5 font-medium text-slate-800">
                Authorized Cashier
              </div>
              <span className="text-[10px] text-slate-400">For {userProfile.companyName}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            This is an official computer-generated recovery voucher issued via Ejaz Business Solution Accounting System (Pakistan).
          </div>
        </div>
      </div>
    </div>
  );
};
