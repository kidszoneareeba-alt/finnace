import {
  Account,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  DateFilterType,
  DateRange,
  LedgerEntry,
} from '../types';

// The current simulated system date anchor
export const SYSTEM_TODAY = '2026-10-24';

/**
 * Returns date range bounds based on filter preset
 */
export function getDateRangeFromFilter(filter: DateFilterType, customRange?: DateRange): DateRange {
  const base = new Date(SYSTEM_TODAY + 'T00:00:00');

  if (filter === 'today') {
    return { startDate: SYSTEM_TODAY, endDate: SYSTEM_TODAY };
  }

  if (filter === 'yesterday') {
    const yesterday = new Date(base);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    return { startDate: yStr, endDate: yStr };
  }

  if (filter === 'week') {
    // Current week: from Monday to today
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(base);
    monday.setDate(diff);
    return {
      startDate: monday.toISOString().split('T')[0],
      endDate: SYSTEM_TODAY,
    };
  }

  if (filter === 'month') {
    const firstDay = new Date(base.getFullYear(), base.getMonth(), 1);
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    };
  }

  if (filter === 'custom' && customRange) {
    return customRange;
  }

  return { startDate: SYSTEM_TODAY, endDate: SYSTEM_TODAY };
}

/**
 * Check if a date string falls inside the range [start, end]
 */
export function isDateInRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= range.startDate && d <= range.endDate;
}

/**
 * Calculate Current Cash in Hand:
 * Inflows:
 * - Cash Received from Cash Transactions
 * - Recovery entries with paymentMethod === 'Cash'
 * Outflows:
 * - Cash Paid in Cash Transactions
 */
export function calculateCashInHand(
  cashTxns: CashTransaction[],
  recoveries: RecoveryEntry[],
  dateRange?: DateRange
): {
  totalCashReceived: number;
  totalCashPaid: number;
  totalCashRecoveries: number;
  currentCashInHand: number;
} {
  const filteredCashTxns = dateRange
    ? cashTxns.filter((t) => isDateInRange(t.date, dateRange))
    : cashTxns;

  const filteredRecoveries = dateRange
    ? recoveries.filter((r) => isDateInRange(r.date, dateRange))
    : recoveries;

  // 1. Recoveries in Cash
  const cashRecoveries = filteredRecoveries
    .filter((r) => r.paymentMethod === 'Cash' || r.paymentMethod === 'Cash & Cheque' || (r.cashAmount !== undefined && r.cashAmount > 0))
    .reduce((sum, r) => sum + Number(r.cashAmount !== undefined ? r.cashAmount : (r.paymentMethod === 'Cash' ? r.amount : 0)), 0);

  // 2. Double-entry cash inflows (debited to Cash in Hand)
  const doubleEntryCashInflows = filteredCashTxns
    .filter((t) => t.debitAccountId === 'acc_pers_cash' || t.debitAccountCode === 'PERS-CASH')
    .reduce((sum, t) => sum + Number(t.debitAmount || t.amount || 0), 0);

  // 3. Double-entry cash outflows (credited from Cash in Hand)
  const doubleEntryCashOutflows = filteredCashTxns
    .filter((t) => t.creditAccountId === 'acc_pers_cash' || t.creditAccountCode === 'PERS-CASH')
    .reduce((sum, t) => sum + Number(t.creditAmount || t.amount || 0), 0);

  // 4. Legacy cash received
  const legacyCashReceived = filteredCashTxns
    .filter((t) => !t.creditAccountId && !t.debitAccountId && t.type === 'Cash Received')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // 5. Legacy cash paid
  const legacyCashPaid = filteredCashTxns
    .filter((t) => !t.creditAccountId && !t.debitAccountId && t.type === 'Cash Paid')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalCashReceived = legacyCashReceived + doubleEntryCashInflows;
  const totalCashPaid = legacyCashPaid + doubleEntryCashOutflows;
  const netCashInHand = totalCashReceived + cashRecoveries - totalCashPaid;

  return {
    totalCashReceived,
    totalCashPaid,
    totalCashRecoveries: cashRecoveries,
    currentCashInHand: netCashInHand,
  };
}

/**
 * Calculate All Bank Balances
 */
export function calculateBankBalances(
  accounts: Account[],
  cashTxns: CashTransaction[],
  recoveries: RecoveryEntry[]
): {
  bankBalances: Record<string, number>;
  totalBankBalance: number;
} {
  const bankAccounts = accounts.filter((a) => a.category === 'Bank');
  const balances: Record<string, number> = {};
  let total = 0;

  bankAccounts.forEach((bank) => {
    const openingSign = bank.openingBalanceType === 'Cr' ? -1 : 1;
    let balance = Number(bank.openingBalance || 0) * openingSign;

    // Cash Paid to Bank (Cash Deposit into Bank) -> Increases Bank
    const cashDeposits = cashTxns
      .filter((t) => t.accountId === bank.id && t.type === 'Cash Paid')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Cash Received from Bank (Cash Withdrawal from Bank) -> Decreases Bank
    const cashWithdrawals = cashTxns
      .filter((t) => t.accountId === bank.id && t.type === 'Cash Received')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Recovery entries received via Bank into this account (or default first bank if unassigned)
    const bankRecoveries = recoveries
      .filter((r) => {
        if (r.paymentMethod !== 'Bank') return false;
        if (r.bankAccountId) return r.bankAccountId === bank.id;
        // fallback to first bank account if none explicitly picked
        return bankAccounts[0]?.id === bank.id;
      })
      .reduce((s, r) => s + Number(r.amount || 0), 0);

    balance = balance + cashDeposits - cashWithdrawals + bankRecoveries;
    balances[bank.id] = balance;
    total += balance;
  });

  return { bankBalances: balances, totalBankBalance: total };
}

/**
 * Calculate single customer's outstanding balance
 */
export function calculateCustomerBalance(
  customer: Account,
  invoices: CustomerInvoice[],
  recoveries: RecoveryEntry[],
  cashTxns: CashTransaction[]
): number {
  const openingSign = customer.openingBalanceType === 'Cr' ? -1 : 1;
  const opening = Number(customer.openingBalance || 0) * openingSign;

  // Invoices/sales debited to customer (increases outstanding receivable)
  const totalInvoices = invoices
    .filter((inv) => inv.customerId === customer.id)
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

  // Cash Paid to Customer (Refunds/Advances from us) -> increases receivable
  const cashPaidToCust = cashTxns
    .filter((t) => t.accountId === customer.id && t.type === 'Cash Paid')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Total recoveries from customer (reduces receivable)
  const totalRecoveries = recoveries
    .filter((r) => r.customerId === customer.id)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // Direct Cash Received in Cash in Hand from this customer (reduces receivable)
  const cashReceivedFromCust = cashTxns
    .filter((t) => t.accountId === customer.id && t.type === 'Cash Received')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return opening + totalInvoices + cashPaidToCust - totalRecoveries - cashReceivedFromCust;
}

/**
 * Calculate total customer outstanding balances across all customer accounts
 */
export function calculateAllCustomerBalances(
  accounts: Account[],
  invoices: CustomerInvoice[],
  recoveries: RecoveryEntry[],
  cashTxns: CashTransaction[]
): {
  customerBalances: Record<string, number>;
  totalCustomerOutstanding: number;
} {
  const customers = accounts.filter((a) => a.category === 'Customer');
  const balances: Record<string, number> = {};
  let total = 0;

  customers.forEach((c) => {
    const bal = calculateCustomerBalance(c, invoices, recoveries, cashTxns);
    balances[c.id] = bal;
    total += bal;
  });

  return { customerBalances: balances, totalCustomerOutstanding: total };
}

/**
 * Generate full chronological ledger entries for an account
 */
export function generateAccountLedger(
  account: Account,
  invoices: CustomerInvoice[],
  recoveries: RecoveryEntry[],
  cashTxns: CashTransaction[],
  dateRange?: DateRange
): {
  openingBalance: number;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
} {
  interface RawEntry {
    id: string;
    date: string;
    voucherNo: string;
    description: string;
    type: string;
    debit: number;
    credit: number;
    createdAt: string;
    sourceType?: 'invoice' | 'recovery' | 'cashTxn';
    sourceId?: string;
  }

  const rawEntries: RawEntry[] = [];

  // Process double-entry cash vouchers for ANY account:
  cashTxns.forEach((t) => {
    if (t.creditAccountId && t.debitAccountId) {
      if (t.creditAccountId === account.id) {
        rawEntries.push({
          id: `${t.id}_cr`,
          date: t.date,
          voucherNo: t.voucherNo,
          description: t.creditDescription || t.description || `Cash Credit / Transfer to ${t.debitAccountName || 'Account'}`,
          type: 'Cash Voucher (CR)',
          debit: 0,
          credit: Number(t.creditAmount || t.amount),
          createdAt: t.createdAt,
          sourceType: 'cashTxn',
          sourceId: t.id,
        });
      }
      if (t.debitAccountId === account.id) {
        rawEntries.push({
          id: `${t.id}_dr`,
          date: t.date,
          voucherNo: t.voucherNo,
          description: t.debitDescription || t.description || `Cash Debit / Received from ${t.creditAccountName || 'Account'}`,
          type: 'Cash Voucher (DR)',
          debit: Number(t.debitAmount || t.amount),
          credit: 0,
          createdAt: t.createdAt,
          sourceType: 'cashTxn',
          sourceId: t.id,
        });
      }
    }
  });

  // Dedicated handling if this account is the permanent Cash in Hand Account
  const isCashAccount = account.code === 'PERS-CASH' || account.id === 'acc_pers_cash';
  if (isCashAccount) {
    recoveries.forEach((rec) => {
      const cashAmt = rec.cashAmount !== undefined ? rec.cashAmount : (rec.paymentMethod === 'Cash' ? rec.amount : 0);
      if (cashAmt > 0) {
        rawEntries.push({
          id: `${rec.id}_csh`,
          date: rec.date,
          voucherNo: rec.voucherNo,
          description: rec.cashDescription || `Customer Cash Recovery from ${rec.customerName}${rec.remarks ? ' - ' + rec.remarks : ''}`,
          type: 'Cash Recovery (DR)',
          debit: Number(cashAmt),
          credit: 0,
          createdAt: rec.createdAt,
        });
      }
    });

    cashTxns
      .filter((t) => !t.creditAccountId && !t.debitAccountId)
      .forEach((t) => {
        if (t.type === 'Cash Received') {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || `Cash Received from ${t.accountName}`,
            type: 'Cash Receipt (DR)',
            debit: Number(t.amount),
            credit: 0,
            createdAt: t.createdAt,
          });
        } else {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || `Cash Paid to ${t.accountName}`,
            type: 'Cash Payment (CR)',
            debit: 0,
            credit: Number(t.amount),
            createdAt: t.createdAt,
          });
        }
      });
  }

  // Dedicated handling if this account is the permanent Cheque in Hand Account
  const isChequeAccount =
    account.code === 'PERS-CHEQ' ||
    account.id === 'acc_pers_cheq' ||
    account.name.toLowerCase().includes('cheque in hand');
  if (isChequeAccount) {
    recoveries.forEach((rec) => {
      const chequeAmt = rec.chequeAmount !== undefined ? rec.chequeAmount : (rec.paymentMethod === 'Cheque' ? rec.amount : 0);
      if (chequeAmt > 0) {
        const details = [
          rec.chequeNo ? `Chq #${rec.chequeNo}` : '',
          rec.chequeBank ? rec.chequeBank : '',
          rec.chequeDescription || rec.remarks,
        ].filter(Boolean).join(' | ');

        rawEntries.push({
          id: `${rec.id}_chq`,
          date: rec.date,
          voucherNo: rec.voucherNo,
          description: `Customer Cheque Recovery from ${rec.customerName}${details ? ` (${details})` : ''}`,
          type: 'Cheque Recovery (DR)',
          debit: Number(chequeAmt),
          credit: 0,
          createdAt: rec.createdAt,
        });
      }
    });
  }

  if (account.category === 'Customer') {
    // Invoices are Debits (Customer owes more)
    invoices
      .filter((inv) => inv.customerId === account.id)
      .forEach((inv) => {
        rawEntries.push({
          id: inv.id,
          date: inv.date,
          voucherNo: inv.invoiceNo,
          description: inv.description || 'Sales Invoice Dispatch',
          type: 'Sales Invoice',
          debit: Number(inv.amount),
          credit: 0,
          createdAt: inv.createdAt,
          sourceType: 'invoice',
          sourceId: inv.id,
        });
      });

    // Recoveries are Credits (Payment received, customer owes less)
    recoveries
      .filter((rec) => rec.customerId === account.id)
      .forEach((rec) => {
        const breakdownParts: string[] = [];
        if (rec.cashAmount && rec.cashAmount > 0) {
          breakdownParts.push(`Cash: PKR ${rec.cashAmount.toLocaleString()}`);
        }
        if (rec.chequeAmount && rec.chequeAmount > 0) {
          breakdownParts.push(`Cheque: PKR ${rec.chequeAmount.toLocaleString()}${rec.chequeNo ? ` #${rec.chequeNo}` : ''}`);
        }
        const breakdownStr = breakdownParts.length > 0 ? ` [${breakdownParts.join(', ')}]` : '';

        rawEntries.push({
          id: rec.id,
          date: rec.date,
          voucherNo: rec.voucherNo,
          description: `Recovery Received via ${rec.paymentMethod}${breakdownStr}${rec.remarks ? ' - ' + rec.remarks : ''}`,
          type: 'Recovery Receipt',
          debit: 0,
          credit: Number(rec.amount),
          createdAt: rec.createdAt,
          sourceType: 'recovery',
          sourceId: rec.id,
        });
      });

    // Direct Cash Transactions for Customer (Legacy)
    cashTxns
      .filter((t) => t.accountId === account.id && !t.creditAccountId && !t.debitAccountId)
      .forEach((t) => {
        if (t.type === 'Cash Received') {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Cash Received from Customer',
            type: 'Cash Receipt',
            debit: 0,
            credit: Number(t.amount),
            createdAt: t.createdAt,
          });
        } else {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Cash Refund / Paid to Customer',
            type: 'Cash Payment',
            debit: Number(t.amount),
            credit: 0,
            createdAt: t.createdAt,
          });
        }
      });
  } else if (account.category === 'Bank') {
    // Bank deposits from cash (Legacy)
    cashTxns
      .filter((t) => t.accountId === account.id && !t.creditAccountId && !t.debitAccountId)
      .forEach((t) => {
        if (t.type === 'Cash Paid') {
          // Cash Paid to Bank = Bank Deposit (Debit Bank)
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Cash Deposit to Bank Account',
            type: 'Bank Deposit',
            debit: Number(t.amount),
            credit: 0,
            createdAt: t.createdAt,
          });
        } else {
          // Cash Received from Bank = Bank Withdrawal (Credit Bank)
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Cash Withdrawal from Bank Account',
            type: 'Bank Withdrawal',
            debit: 0,
            credit: Number(t.amount),
            createdAt: t.createdAt,
          });
        }
      });

    // Recoveries deposited directly into Bank
    recoveries
      .filter((rec) => rec.paymentMethod === 'Bank' && (rec.bankAccountId === account.id || !rec.bankAccountId))
      .forEach((rec) => {
        rawEntries.push({
          id: rec.id,
          date: rec.date,
          voucherNo: rec.voucherNo,
          description: `Customer Recovery from ${rec.customerName}${rec.remarks ? ' - ' + rec.remarks : ''}`,
          type: 'Bank Receipt',
          debit: Number(rec.amount),
          credit: 0,
          createdAt: rec.createdAt,
        });
      });
  } else if (account.category === 'Office Expense') {
    // Cash Paid for Office Expense = Debit Expense (Legacy)
    cashTxns
      .filter((t) => t.accountId === account.id && !t.creditAccountId && !t.debitAccountId)
      .forEach((t) => {
        if (t.type === 'Cash Paid') {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Office Expense Paid in Cash',
            type: 'Expense Voucher',
            debit: Number(t.amount),
            credit: 0,
            createdAt: t.createdAt,
          });
        } else {
          rawEntries.push({
            id: t.id,
            date: t.date,
            voucherNo: t.voucherNo,
            description: t.description || 'Expense Refund / Reversal',
            type: 'Expense Reversal',
            debit: 0,
            credit: Number(t.amount),
            createdAt: t.createdAt,
          });
        }
      });
  } else {
    // Personal Account (Legacy, excluding dedicated Cash in Hand and Cheque in Hand accounts)
    if (!isCashAccount && !isChequeAccount) {
      cashTxns
        .filter((t) => t.accountId === account.id && !t.creditAccountId && !t.debitAccountId)
        .forEach((t) => {
          if (t.type === 'Cash Paid') {
            // Cash Paid to personal drawer/drawings
            rawEntries.push({
              id: t.id,
              date: t.date,
              voucherNo: t.voucherNo,
              description: t.description || 'Personal Drawing / Cash Paid',
              type: 'Drawing Voucher',
              debit: Number(t.amount),
              credit: 0,
              createdAt: t.createdAt,
            });
          } else {
            // Cash Received from personal / capital introduced
            rawEntries.push({
              id: t.id,
              date: t.date,
              voucherNo: t.voucherNo,
              description: t.description || 'Capital Introduced / Received',
              type: 'Capital Receipt',
              debit: 0,
              credit: Number(t.amount),
              createdAt: t.createdAt,
            });
          }
        });
    }
  }

  // Sort chronological
  rawEntries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  // Calculate opening balance before dateRange.startDate
  const openingSign = account.openingBalanceType === 'Cr' ? -1 : 1;
  let openingBal = Number(account.openingBalance || 0) * openingSign;
  const filteredEntries: RawEntry[] = [];

  if (dateRange) {
    rawEntries.forEach((entry) => {
      if (entry.date < dateRange.startDate) {
        // adjust opening balance with prior transactions
        openingBal += entry.debit - entry.credit;
      } else if (entry.date <= dateRange.endDate) {
        filteredEntries.push(entry);
      }
    });
  } else {
    filteredEntries.push(...rawEntries);
  }

  // Calculate running balance for each entry
  let currentRunning = openingBal;
  let totalDebit = 0;
  let totalCredit = 0;

  const resultEntries: LedgerEntry[] = filteredEntries.map((entry) => {
    currentRunning += entry.debit - entry.credit;
    totalDebit += entry.debit;
    totalCredit += entry.credit;
    return {
      id: entry.id,
      date: entry.date,
      voucherNo: entry.voucherNo,
      description: entry.description,
      type: entry.type,
      debit: entry.debit,
      credit: entry.credit,
      balance: currentRunning,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
    };
  });

  return {
    openingBalance: openingBal,
    entries: resultEntries,
    totalDebit,
    totalCredit,
    closingBalance: currentRunning,
  };
}

/**
 * Generate sequential voucher number with unique timestamp suffix
 */
export function generateVoucherNumber(prefix: string, count: number): string {
  const pad = String(count + 1).padStart(4, '0');
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${pad}`;
}

/**
 * Calculates due date for an invoice (standard 15 days from invoice date)
 */
export function calculateInvoiceDueDate(invoiceDate: string, days = 15): string {
  if (!invoiceDate) return '';
  const d = new Date(invoiceDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Returns the status of an invoice relative to reference date (SYSTEM_TODAY):
 * - isOverdue: 15 days complete / reached
 * - isDueSoon: within 2 days of due date (e.g. 1 or 2 days left)
 */
export function getInvoiceDueStatus(
  invoice: CustomerInvoice,
  referenceDateStr = SYSTEM_TODAY
): {
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean; // 15 days completed!
  isDueSoon: boolean; // within 2 days!
  daysOverdue: number;
} {
  const dueDate = invoice.dueDate || calculateInvoiceDueDate(invoice.date, 15);
  const ref = new Date(referenceDateStr + 'T00:00:00').getTime();
  const due = new Date(dueDate + 'T00:00:00').getTime();
  const diffTime = due - ref;
  const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const daysOverdue = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;

  return {
    dueDate,
    daysRemaining,
    isOverdue: daysRemaining <= 0,
    isDueSoon: daysRemaining > 0 && daysRemaining <= 2,
    daysOverdue,
  };
}

