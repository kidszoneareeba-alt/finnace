import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Users,
  ArrowRight,
  Calendar,
  Search,
  X,
  Scale,
  Building2,
  Filter,
  FileSpreadsheet,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  MapPin,
  Map,
  Calculator,
  BookOpen,
  Download,
  Printer,
  Globe,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Account,
  AccountCategory,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  UserProfile,
  DateFilterType,
  DateRange,
} from '../types';
import { NavItem } from './Sidebar';
import { DashboardMetricModals, DashboardMetricType } from './DashboardMetricModals';
import { Section1AnimatedCards } from './Section1AnimatedCards';
import {
  calculateCashInHand,
  calculateBankBalances,
  calculateAllCustomerBalances,
  calculateCustomerBalance,
  generateAccountLedger,
  getInvoiceDueStatus,
  SYSTEM_TODAY,
  getDateRangeFromFilter,
  isDateInRange,
} from '../utils/accounting';
import { formatCurrency } from '../utils/numberToWords';

interface SectionHeaderProps {
  badgeText: string;
  badgeClass: string;
  borderClass: string;
  titleEn: string;
  titleUr: string;
  descEn?: string;
  descUr?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  badgeText,
  badgeClass,
  borderClass,
  titleEn,
  titleUr,
  descEn,
  descUr,
}) => (
  <div className={`p-4 rounded-2xl border-l-4 ${borderClass} bg-white mb-4 border border-slate-100/80 shadow-2xs`}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase shadow-2xs ${badgeClass}`}>
          {badgeText}
        </span>
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">{titleEn}</h3>
      </div>
      <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-full border border-slate-200 self-start sm:self-auto font-sans" dir="rtl">
        {titleUr}
      </span>
    </div>

    {(descEn || descUr) && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5">
        {descEn && (
          <div className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 font-medium">
            {descEn}
          </div>
        )}
        {descUr && (
          <div className="text-xs text-slate-700 text-right leading-relaxed font-sans bg-slate-50/70 p-2.5 rounded-xl border border-slate-100" dir="rtl">
            {descUr}
          </div>
        )}
      </div>
    )}
  </div>
);

interface MainDashboardProps {
  accounts: Account[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  userProfile: UserProfile;
  onNavigate: (tab: NavItem) => void;
  onViewAccountLedger: (account: Account) => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  accounts,
  cashTxns,
  recoveries,
  invoices,
  userProfile,
  onNavigate,
  onViewAccountLedger,
}) => {
  // 1. Permanent Cash in Hand Account & Closing Balance
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

  const cashAccountLedger = useMemo(() => {
    if (!cashAccount) return { closingBalance: 0 };
    return generateAccountLedger(cashAccount, invoices, recoveries, cashTxns);
  }, [cashAccount, invoices, recoveries, cashTxns]);

  // Overall Cash, Bank, and Customer Receivables Stats
  const cashStats = calculateCashInHand(cashTxns, recoveries);
  const bankStats = calculateBankBalances(accounts, cashTxns, recoveries);
  const customerStats = calculateAllCustomerBalances(accounts, invoices, recoveries, cashTxns);

  // Compute live current balances across all categories
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
      return {
        account: acc,
        balance,
      };
    });
  }, [accounts, invoices, recoveries, cashTxns, customerStats, bankStats]);

  // 5. Total Payable Amount (Accounts with Credit / Cr balance where company owes money / liability)
  const totalPayableAmount = useMemo(() => {
    return allAccountsWithBalances.reduce((sum, { balance }) => {
      return balance < 0 ? sum + Math.abs(balance) : sum;
    }, 0);
  }, [allAccountsWithBalances]);

  const payableAccountsCount = useMemo(() => {
    return allAccountsWithBalances.filter(({ balance }) => balance < -0.01).length;
  }, [allAccountsWithBalances]);

  // Total recoveries all-time
  const totalRecoveryAllTime = recoveries.reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  // Invoices Due Status Analysis (15-Day Terms: Due Soon within 2 days, and 15 days completed / Overdue)
  const invoiceDueAnalysis = useMemo(() => {
    const dueSoonList: { invoice: CustomerInvoice; status: ReturnType<typeof getInvoiceDueStatus>; customer?: Account }[] = [];
    const overdueList: { invoice: CustomerInvoice; status: ReturnType<typeof getInvoiceDueStatus>; customer?: Account }[] = [];

    invoices.forEach((inv) => {
      const status = getInvoiceDueStatus(inv, SYSTEM_TODAY);
      const customer = accounts.find((a) => a.id === inv.customerId);

      if (status.isOverdue) {
        overdueList.push({ invoice: inv, status, customer });
      } else if (status.isDueSoon) {
        dueSoonList.push({ invoice: inv, status, customer });
      }
    });

    const totalOverdueAmount = overdueList.reduce((sum, item) => sum + Number(item.invoice.amount || 0), 0);
    const totalDueSoonAmount = dueSoonList.reduce((sum, item) => sum + Number(item.invoice.amount || 0), 0);

    return {
      dueSoonList,
      overdueList,
      totalOverdueAmount,
      totalDueSoonAmount,
    };
  }, [invoices, accounts]);

  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true);

  // Helper to extract city/region from location string
  const extractCity = (loc?: string) => {
    if (!loc || !loc.trim()) return 'Other / Unassigned';
    const clean = loc.trim();
    const lower = clean.toLowerCase();
    if (lower.includes('lahore')) return 'Lahore';
    if (lower.includes('karachi')) return 'Karachi';
    if (lower.includes('faisalabad')) return 'Faisalabad';
    if (lower.includes('islamabad')) return 'Islamabad';
    if (lower.includes('rawalpindi')) return 'Rawalpindi';
    if (lower.includes('multan')) return 'Multan';
    if (lower.includes('sialkot')) return 'Sialkot';
    if (lower.includes('gujranwala')) return 'Gujranwala';
    if (lower.includes('peshawar')) return 'Peshawar';
    if (lower.includes('quetta')) return 'Quetta';
    const parts = clean.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    return clean;
  };

  // Location-Wise Due Analysis (Customer Receivables by City & Region)
  const locationDueAnalysis = useMemo(() => {
    const customerAccounts = accounts.filter((a) => a.category === 'Customer');
    const locationMap: Record<
      string,
      {
        city: string;
        totalDue: number; // Receivable (Dr)
        totalAdvance: number; // Advance (Cr)
        customerCount: number;
        customers: {
          account: Account;
          balance: number;
          overdueInvoicesCount: number;
          overdueInvoicesAmount: number;
        }[];
      }
    > = {};

    customerAccounts.forEach((cust) => {
      const balance = calculateCustomerBalance(cust, invoices, recoveries, cashTxns);
      const city = extractCity(cust.location);

      // Check overdue invoices for this customer
      const custOverdue = invoices.filter((inv) => {
        if (inv.customerId !== cust.id) return false;
        const st = getInvoiceDueStatus(inv, SYSTEM_TODAY);
        return st.isOverdue;
      });
      const overdueInvoicesCount = custOverdue.length;
      const overdueInvoicesAmount = custOverdue.reduce((s, inv) => s + Number(inv.amount || 0), 0);

      if (!locationMap[city]) {
        locationMap[city] = {
          city,
          totalDue: 0,
          totalAdvance: 0,
          customerCount: 0,
          customers: [],
        };
      }

      if (balance > 0) {
        locationMap[city].totalDue += balance;
      } else if (balance < 0) {
        locationMap[city].totalAdvance += Math.abs(balance);
      }

      locationMap[city].customerCount += 1;
      locationMap[city].customers.push({
        account: cust,
        balance,
        overdueInvoicesCount,
        overdueInvoicesAmount,
      });
    });

    const locationsList = Object.values(locationMap).sort((a, b) => b.totalDue - a.totalDue);
    const grandTotalDue = locationsList.reduce((sum, loc) => sum + loc.totalDue, 0);

    return {
      locationsList,
      grandTotalDue,
    };
  }, [accounts, invoices, recoveries, cashTxns]);

  const [selectedLocationCity, setSelectedLocationCity] = useState<string>('All');
  const [isLocationSectionExpanded, setIsLocationSectionExpanded] = useState<boolean>(true);

  // Download Section 4 Location-Wise Customer Receivables Directory as A4 PDF for Field Recovery
  const handleDownloadLocationDuePdf = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // Filter customers by selectedLocationCity
      const targetLocations = locationDueAnalysis.locationsList.filter(
        (loc) => selectedLocationCity === 'All' || loc.city === selectedLocationCity
      );

      const customerRows = targetLocations.flatMap((loc) =>
        loc.customers.map((item) => ({
          city: loc.city,
          account: item.account,
          balance: item.balance,
          overdueInvoicesCount: item.overdueInvoicesCount,
        }))
      );

      const totalDue = customerRows.reduce(
        (sum, c) => (c.balance > 0 ? sum + c.balance : sum),
        0
      );

      // 1. Header Banner Box
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('EJAZ BUSINESS SOLUTION', margin + 6, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(147, 197, 253); // blue-300
      doc.text(
        'Customer Receivables & Field Recovery Sheet',
        margin + 6,
        24
      );

      // Meta Data (Date & Location on Top Right)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${SYSTEM_TODAY}`, pageWidth - margin - 6, 17, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        `LOCATION: ${selectedLocationCity.toUpperCase()} (${customerRows.length} CLIENTS)`,
        pageWidth - margin - 6,
        23,
        { align: 'right' }
      );

      // 2. Info Strip: Summary of Due Amount & Instructions for Recovery Officer
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`TOTAL OUTSTANDING DUE: PKR ${formatCurrency(totalDue)}`, margin + 4, 45);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Field Officer: Write collected cash/cheque, promise dates or remarks in Remarks column.',
        pageWidth - margin - 4,
        45,
        { align: 'right' }
      );

      // 3. Prepare Table Headers and Rows
      const tableHeaders = [
        [
          '#',
          'City / Area',
          'Customer Code & Name',
          'Detailed Address',
          'Contact Phone',
          'Outstanding Due',
          'Recovery Remarks / Field Notes',
        ],
      ];

      const tableRows = customerRows.map((row, index) => {
        const balStr =
          row.balance > 0
            ? `PKR ${formatCurrency(row.balance)} Dr`
            : row.balance < 0
            ? `PKR ${formatCurrency(Math.abs(row.balance))} Cr`
            : '0.00';

        const overdueTag = row.overdueInvoicesCount > 0 ? `\n[${row.overdueInvoicesCount} Overdue]` : '';

        return [
          (index + 1).toString(),
          row.city,
          `${row.account.code}\n${row.account.name}${overdueTag}`,
          row.account.location || '-',
          row.account.contact || '-',
          balStr,
          '', // Empty remarks column with generous row height for handwritten recovery notes
        ];
      });

      // Total row at the end
      tableRows.push([
        '',
        'TOTAL',
        `Grand Total (${customerRows.length} Accounts)`,
        '',
        '',
        `PKR ${formatCurrency(totalDue)}`,
        'Officer Verification',
      ]);

      // Render autoTable on A4
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 53,
        margin: { left: margin, right: margin, bottom: 25 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 3.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          valign: 'middle',
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [30, 58, 138], // blue-900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 20 }, // City
          2: { cellWidth: 40, fontStyle: 'bold' }, // Customer Code & Name
          3: { cellWidth: 36 }, // Detailed Address
          4: { cellWidth: 24, fontStyle: 'bold' }, // Contact Phone
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }, // Due Amount
          6: { cellWidth: 32 }, // Remarks column for notes
        },
        didDrawPage: () => {
          // Footer
          const pageStr = `Page ${doc.getNumberOfPages()}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Ejaz Business Solution - Recovery Sheet (${selectedLocationCity}) - Generated on ${SYSTEM_TODAY}`,
            margin,
            pageHeight - 8
          );
          doc.text(pageStr, pageWidth - margin, pageHeight - 8, { align: 'right' });
        },
      });

      // Signature line on final page
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY + 28 < pageHeight) {
        doc.setDrawColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        // Recovery Officer Signature
        doc.line(margin + 10, finalY + 18, margin + 70, finalY + 18);
        doc.text('Recovery Officer Signature', margin + 18, finalY + 22);

        // Accounts Manager Signature
        doc.line(pageWidth - margin - 70, finalY + 18, pageWidth - margin - 10, finalY + 18);
        doc.text('Accounts Manager Verification', pageWidth - margin - 65, finalY + 22);
      }

      const fileName = `Ejaz_Recovery_Sheet_${selectedLocationCity.replace(/[^a-zA-Z0-9]/g, '_')}_${SYSTEM_TODAY}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Error generating recovery PDF:', err);
      alert('Could not generate PDF. Please try again.');
    }
  };

  // Business Overview & Section 1 Timeframe Filter State & Period Metrics
  const [activeTimeframe, setActiveTimeframe] = useState<DateFilterType>('month');
  const [customTimeRange, setCustomTimeRange] = useState<DateRange>({
    startDate: '2026-10-01',
    endDate: SYSTEM_TODAY,
  });

  // Compute active bounds
  const activeDateRange = useMemo(() => {
    return getDateRangeFromFilter(activeTimeframe, customTimeRange);
  }, [activeTimeframe, customTimeRange]);

  // Period-filtered transactions
  const periodRecoveries = useMemo(() => {
    return recoveries.filter((r) => isDateInRange(r.date, activeDateRange));
  }, [recoveries, activeDateRange]);

  const periodCashTxns = useMemo(() => {
    return cashTxns.filter((t) => isDateInRange(t.date, activeDateRange));
  }, [cashTxns, activeDateRange]);

  const periodInvoices = useMemo(() => {
    return invoices.filter((i) => isDateInRange(i.date, activeDateRange));
  }, [invoices, activeDateRange]);

  // Period Financial Metrics for Section 1 and Section 2/3
  const totalPeriodRecovery = useMemo(() => {
    return periodRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [periodRecoveries]);

  const periodCashRecoveries = useMemo(() => {
    return periodRecoveries
      .filter((r) => r.paymentMethod === 'Cash' || (r.cashAmount !== undefined && r.cashAmount > 0))
      .reduce((sum, r) => sum + Number(r.cashAmount !== undefined ? r.cashAmount : (r.paymentMethod === 'Cash' ? r.amount : 0)), 0);
  }, [periodRecoveries]);

  const periodBankRecoveries = useMemo(() => {
    return periodRecoveries
      .filter((r) => r.paymentMethod === 'Bank' || (r.chequeAmount !== undefined && r.chequeAmount > 0))
      .reduce((sum, r) => sum + Number(r.chequeAmount !== undefined ? r.chequeAmount : (r.paymentMethod === 'Bank' ? r.amount : 0)), 0);
  }, [periodRecoveries]);

  const periodCashReceived = useMemo(() => {
    return periodCashTxns
      .filter((t) => t.type === 'Cash Received' || t.debitAccountId === 'acc_pers_cash')
      .reduce((sum, t) => sum + Number(t.amount || t.debitAmount || 0), 0);
  }, [periodCashTxns]);

  const periodCashPaid = useMemo(() => {
    return periodCashTxns
      .filter((t) => t.type === 'Cash Paid' || t.creditAccountId === 'acc_pers_cash')
      .reduce((sum, t) => sum + Number(t.amount || t.creditAmount || 0), 0);
  }, [periodCashTxns]);

  const totalPeriodInvoiced = useMemo(() => {
    return periodInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  }, [periodInvoices]);

  const netPeriodCashFlow = (periodCashReceived + periodCashRecoveries) - periodCashPaid;

  // Metric Modals State: Cash in Hand, Outstanding on Customers, Bank Balance, Recoveries, Payable
  const [activeMetricModal, setActiveMetricModal] = useState<DashboardMetricType | null>(null);

  // Cash in Hand period statement drawer state & period ledger
  const [isCashDrawerOpen, setIsCashDrawerOpen] = useState<boolean>(false);

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

  // Account Directory Search & Filtering States
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountCategoryFilter, setAccountCategoryFilter] = useState<'All' | AccountCategory>('All');
  const [accountBalanceFilter, setAccountBalanceFilter] = useState<
    'all' | 'receivable' | 'payable' | 'zero' | 'high'
  >('all');

  // Filter accounts by name, code, category, and balance
  const filteredAccounts = useMemo(() => {
    const q = accountSearchQuery.trim().toLowerCase();
    const isNumeric = !isNaN(Number(q)) && q.length > 0;
    const numValue = isNumeric ? Number(q) : null;

    return allAccountsWithBalances.filter(({ account, balance }) => {
      // 1. Filter by category
      if (accountCategoryFilter !== 'All' && account.category !== accountCategoryFilter) {
        return false;
      }

      // 2. Filter by balance status
      if (accountBalanceFilter === 'receivable' && balance <= 0) return false;
      if (accountBalanceFilter === 'payable' && balance >= 0) return false;
      if (accountBalanceFilter === 'zero' && Math.abs(balance) > 0.01) return false;
      if (accountBalanceFilter === 'high' && Math.abs(balance) < 100000) return false;

      // 3. Filter by text (Name, Code, Location, Contact) or typed Balance
      if (!q) return true;

      const matchesText =
        account.name.toLowerCase().includes(q) ||
        account.code.toLowerCase().includes(q) ||
        (account.location && account.location.toLowerCase().includes(q)) ||
        (account.contact && account.contact.toLowerCase().includes(q)) ||
        account.category.toLowerCase().includes(q);

      const balanceStr = Math.round(Math.abs(balance)).toString();
      const matchesBalance =
        balanceStr.includes(q) ||
        (numValue !== null && Math.abs(Math.abs(balance) - numValue) < 100);

      return matchesText || matchesBalance;
    });
  }, [allAccountsWithBalances, accountSearchQuery, accountCategoryFilter, accountBalanceFilter]);

  // Recent combined transactions (Recoveries and Cash Vouchers)
  const recentActivities = useMemo(() => {
    return [
      ...recoveries.map((r) => ({
        id: r.id,
        date: r.date,
        title: `Recovery from ${r.customerName}`,
        voucherNo: r.voucherNo,
        type: 'recovery' as const,
        amount: r.amount,
        method: r.paymentMethod,
        timestamp: r.createdAt,
      })),
      ...cashTxns.map((c) => {
        const isDoubleEntry = c.creditAccountCode && c.debitAccountCode;
        const title = isDoubleEntry
          ? `${c.creditAccountName} ➔ ${c.debitAccountName}`
          : `${c.type}: ${c.accountName}`;
        return {
          id: c.id,
          date: c.date,
          title,
          voucherNo: c.voucherNo,
          type: (c.type === 'Cash Received' ? 'cash_in' : 'cash_out') as
            | 'cash_in'
            | 'cash_out',
          amount: c.amount,
          method: 'Cash' as const,
          timestamp: c.createdAt,
        };
      }),
    ]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 8);
  }, [recoveries, cashTxns]);

  // Section 2: Download A4 PDF for Due Soon Invoices (Within 1-2 Days)
  const handleDownloadDueSoonPdf = () => {
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      const dueList = invoiceDueAnalysis.dueSoonList;
      const totalAmount = invoiceDueAnalysis.totalDueSoonAmount;

      // 1. Header Banner Box
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('EJAZ BUSINESS SOLUTION', margin + 6, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(253, 230, 138); // amber-200
      doc.text(
        'Invoices Due Soon Sheet (1-2 Days Left)',
        margin + 6,
        24
      );

      // Meta Data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${SYSTEM_TODAY}`, pageWidth - margin - 6, 17, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        `STATUS: NEARING 15 DAYS (${dueList.length} INVOICES)`,
        pageWidth - margin - 6,
        23,
        { align: 'right' }
      );

      // 2. Info Strip
      doc.setFillColor(254, 243, 199); // amber-100
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'F');
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(120, 53, 15); // amber-900
      doc.text(`TOTAL DUE SOON AMOUNT: PKR ${formatCurrency(totalAmount)}`, margin + 4, 45);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text(
        'Field Officer: Credit limit expiring in 1-2 days. Write follow-up notes/commitments in remarks.',
        pageWidth - margin - 4,
        45,
        { align: 'right' }
      );

      // 3. Table Headers and Rows
      const tableHeaders = [
        [
          '#',
          'Customer Code & Name',
          'Invoice # & Date',
          'Contact & City',
          'Due Date & Days Left',
          'Amount (PKR)',
          'Follow-up Remarks / Field Notes',
        ],
      ];

      const tableRows = dueList.map((item, index) => {
        const city = extractCity(item.customer?.location);
        const contact = item.customer?.contact || '-';
        const daysLeftStr =
          item.status.daysRemaining === 0
            ? 'Today (0d)'
            : `${item.status.daysRemaining} Day${item.status.daysRemaining > 1 ? 's' : ''} Left`;

        return [
          (index + 1).toString(),
          `${item.invoice.customerCode}\n${item.invoice.customerName}`,
          `#${item.invoice.invoiceNo}\n${item.invoice.date}`,
          `${contact}\n${city}`,
          `${item.status.dueDate}\n(${daysLeftStr})`,
          `PKR ${formatCurrency(item.invoice.amount)}`,
          '', // Blank remarks column for field notes
        ];
      });

      // Total row at the end
      tableRows.push([
        '',
        `Grand Total (${dueList.length} Invoices)`,
        '',
        '',
        '',
        `PKR ${formatCurrency(totalAmount)}`,
        'Officer Follow-up Signed',
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 53,
        margin: { left: margin, right: margin, bottom: 25 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 3.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          valign: 'middle',
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [180, 83, 9], // amber-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 40, fontStyle: 'bold' }, // Customer Code & Name
          2: { cellWidth: 26 }, // Invoice # & Date
          3: { cellWidth: 30 }, // Contact & City
          4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, // Due Date
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }, // Amount
          6: { cellWidth: 32 }, // Remarks
        },
        didDrawPage: () => {
          const pageStr = `Page ${doc.getNumberOfPages()}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Ejaz Business Solution - Invoices Due Soon Sheet - Generated on ${SYSTEM_TODAY}`,
            margin,
            pageHeight - 8
          );
          doc.text(pageStr, pageWidth - margin, pageHeight - 8, { align: 'right' });
        },
      });

      // Signature line on final page
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY + 28 < pageHeight) {
        doc.setDrawColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        doc.line(margin + 10, finalY + 18, margin + 70, finalY + 18);
        doc.text('Recovery Officer Signature', margin + 18, finalY + 22);

        doc.line(pageWidth - margin - 70, finalY + 18, pageWidth - margin - 10, finalY + 18);
        doc.text('Accounts Manager Verification', pageWidth - margin - 65, finalY + 22);
      }

      doc.save(`Ejaz_Business_Invoices_Due_Soon_${SYSTEM_TODAY}.pdf`);
    } catch (err) {
      console.error('Error generating due soon PDF:', err);
    }
  };

  // Section 3: Download A4 PDF for Overdue Invoices (15+ Days Completed)
  const handleDownloadOverduePdf = () => {
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      const overdueList = invoiceDueAnalysis.overdueList;
      const totalAmount = invoiceDueAnalysis.totalOverdueAmount;

      // 1. Header Banner Box
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('EJAZ BUSINESS SOLUTION', margin + 6, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(254, 205, 211); // rose-200
      doc.text(
        'Overdue Invoices Recovery Sheet (15+ Days Overdue)',
        margin + 6,
        24
      );

      // Meta Data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${SYSTEM_TODAY}`, pageWidth - margin - 6, 17, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        `CRITICAL OVERDUE (${overdueList.length} INVOICES)`,
        pageWidth - margin - 6,
        23,
        { align: 'right' }
      );

      // 2. Info Strip
      doc.setFillColor(255, 228, 230); // rose-100
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'F');
      doc.setDrawColor(225, 29, 72); // rose-600
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(159, 18, 57); // rose-900
      doc.text(`TOTAL OVERDUE AMOUNT: PKR ${formatCurrency(totalAmount)}`, margin + 4, 45);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(190, 18, 60); // rose-800
      doc.text(
        'Urgent Recovery Notice: 15-day credit period expired. Collect payments or enter recovery action.',
        pageWidth - margin - 4,
        45,
        { align: 'right' }
      );

      // 3. Table Headers and Rows
      const tableHeaders = [
        [
          '#',
          'Customer Code & Name',
          'Invoice # & Date',
          'Contact & City',
          'Due Date & Overdue',
          'Overdue Amount (PKR)',
          'Recovery Action / Field Notes',
        ],
      ];

      const tableRows = overdueList.map((item, index) => {
        const city = extractCity(item.customer?.location);
        const contact = item.customer?.contact || '-';
        const overdueDaysStr = `+${item.status.daysOverdue} Days`;

        return [
          (index + 1).toString(),
          `${item.invoice.customerCode}\n${item.invoice.customerName}`,
          `#${item.invoice.invoiceNo}\n${item.invoice.date}`,
          `${contact}\n${city}`,
          `${item.status.dueDate}\n(${overdueDaysStr})`,
          `PKR ${formatCurrency(item.invoice.amount)}`,
          '', // Blank remarks column for handwriting
        ];
      });

      // Total row at the end
      tableRows.push([
        '',
        `Grand Total (${overdueList.length} Overdue Invoices)`,
        '',
        '',
        '',
        `PKR ${formatCurrency(totalAmount)}`,
        'Recovery Officer Action',
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 53,
        margin: { left: margin, right: margin, bottom: 25 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 3.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          valign: 'middle',
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [190, 18, 60], // rose-700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 38, fontStyle: 'bold' }, // Customer Code & Name
          2: { cellWidth: 26 }, // Invoice # & Date
          3: { cellWidth: 30 }, // Contact & City
          4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }, // Due Date & Overdue
          5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }, // Amount
          6: { cellWidth: 32 }, // Recovery action notes
        },
        didDrawPage: () => {
          const pageStr = `Page ${doc.getNumberOfPages()}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Ejaz Business Solution - Overdue Invoices Recovery Sheet - Generated on ${SYSTEM_TODAY}`,
            margin,
            pageHeight - 8
          );
          doc.text(pageStr, pageWidth - margin, pageHeight - 8, { align: 'right' });
        },
      });

      // Signature line on final page
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY + 28 < pageHeight) {
        doc.setDrawColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        doc.line(margin + 10, finalY + 18, margin + 70, finalY + 18);
        doc.text('Recovery Officer Signature', margin + 18, finalY + 22);

        doc.line(pageWidth - margin - 70, finalY + 18, pageWidth - margin - 10, finalY + 18);
        doc.text('Accounts Manager Verification', pageWidth - margin - 65, finalY + 22);
      }

      doc.save(`Ejaz_Business_Overdue_Invoices_${SYSTEM_TODAY}.pdf`);
    } catch (err) {
      console.error('Error generating overdue PDF:', err);
    }
  };

  // Section 5: Download Master Account & Customer Directory A4 PDF
  const handleDownloadDirectoryPdf = () => {
    try {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      const targetAccounts = filteredAccounts;
      const totalDr = targetAccounts.reduce(
        (sum, a) => (a.balance > 0 ? sum + a.balance : sum),
        0
      );
      const totalCr = targetAccounts.reduce(
        (sum, a) => (a.balance < 0 ? sum + Math.abs(a.balance) : sum),
        0
      );

      // 1. Header Banner Box
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

      // Title & Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('EJAZ BUSINESS SOLUTION', margin + 6, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(191, 219, 254); // blue-200
      doc.text(
        'Master Account & Customer Directory Statement',
        margin + 6,
        24
      );

      // Meta Data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${SYSTEM_TODAY}`, pageWidth - margin - 6, 17, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text(
        `FILTER: ${accountCategoryFilter.toUpperCase()} (${targetAccounts.length} ACCOUNTS)`,
        pageWidth - margin - 6,
        23,
        { align: 'right' }
      );

      // 2. Info Strip
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, 37, pageWidth - margin * 2, 13, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `TOTAL RECEIVABLE (DR): PKR ${formatCurrency(totalDr)}  |  PAYABLE / ADVANCE (CR): PKR ${formatCurrency(totalCr)}`,
        margin + 4,
        45
      );

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        'Master Accounts Directory. Remarks column for ledger verification & audit notes.',
        pageWidth - margin - 4,
        45,
        { align: 'right' }
      );

      // 3. Table Headers and Rows
      const tableHeaders = [
        [
          '#',
          'Code',
          'Account / Customer Name',
          'Category',
          'Contact & Location',
          'Closing Balance (PKR)',
          'Audit Remarks / Field Notes',
        ],
      ];

      const tableRows = targetAccounts.map((item, index) => {
        const balStr =
          item.balance > 0
            ? `PKR ${formatCurrency(item.balance)} Dr`
            : item.balance < 0
            ? `PKR ${formatCurrency(Math.abs(item.balance))} Cr`
            : '0.00';

        const contactLocation = [item.account.contact, item.account.location].filter(Boolean).join('\n') || '-';

        return [
          (index + 1).toString(),
          item.account.code,
          item.account.name,
          item.account.category,
          contactLocation,
          balStr,
          '', // Blank remarks column for handwriting
        ];
      });

      // Total row at the end
      tableRows.push([
        '',
        'TOTAL',
        `Grand Total (${targetAccounts.length} Accounts)`,
        '',
        '',
        `Dr: ${formatCurrency(totalDr)}\nCr: ${formatCurrency(totalCr)}`,
        'Audited & Verified',
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 53,
        margin: { left: margin, right: margin, bottom: 25 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: 3.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
          valign: 'middle',
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [30, 41, 59], // slate-800
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 20, fontStyle: 'bold' }, // Code
          2: { cellWidth: 44, fontStyle: 'bold' }, // Account Name
          3: { cellWidth: 20, halign: 'center' }, // Category
          4: { cellWidth: 32 }, // Contact & Location
          5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }, // Closing Balance
          6: { cellWidth: 34 }, // Remarks
        },
        didDrawPage: () => {
          const pageStr = `Page ${doc.getNumberOfPages()}`;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Ejaz Business Solution - Accounts & Customer Directory - Generated on ${SYSTEM_TODAY}`,
            margin,
            pageHeight - 8
          );
          doc.text(pageStr, pageWidth - margin, pageHeight - 8, { align: 'right' });
        },
      });

      // Signature line on final page
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      if (finalY + 28 < pageHeight) {
        doc.setDrawColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);

        doc.line(margin + 10, finalY + 18, margin + 70, finalY + 18);
        doc.text('Auditor / Accountant Signature', margin + 18, finalY + 22);

        doc.line(pageWidth - margin - 70, finalY + 18, pageWidth - margin - 10, finalY + 18);
        doc.text('Managing Director Approval', pageWidth - margin - 65, finalY + 22);
      }

      doc.save(`Ejaz_Business_Accounts_Directory_${SYSTEM_TODAY}.pdf`);
    } catch (err) {
      console.error('Error generating accounts directory PDF:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            EJaz Finance Pro
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accounting, Recovery Management, Customer Ledgers & Financial Analytics
          </p>
        </div>

        <div className="text-right hidden md:block">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
            <span>{userProfile.name}</span>
            <span className="text-[10px] text-emerald-700 font-mono">({userProfile.role})</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {accounts.length} Total Accounts
          </div>
        </div>
      </div>

      {/* 1. KEY FINANCIAL INDICATORS & MASTER BALANCES (SECTION 1) */}
      <div className="space-y-4">
        {/* Top Hero Banner Matching Reference Image */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-blue-100/40 border border-blue-100/80 shadow-xs p-5 sm:p-6 space-y-4 relative overflow-hidden">
          {/* Subtle 3D Bar Chart & Wave Sheen on the top right */}
          <div className="absolute right-4 sm:right-8 -top-2 w-48 h-32 pointer-events-none opacity-25 sm:opacity-40 flex items-end justify-end gap-2">
            <div className="w-3.5 h-12 bg-blue-400/80 rounded-t-sm" />
            <div className="w-3.5 h-18 bg-blue-500/80 rounded-t-sm" />
            <div className="w-3.5 h-24 bg-[#0066ff] rounded-t-sm" />
            <div className="w-3.5 h-28 bg-blue-600 rounded-t-sm" />
            <TrendingUp className="w-12 h-12 text-[#0066ff] absolute -top-1 right-0" />
          </div>

          {/* Top Row: Icon + Title & Live Summary + Urdu Globe Dropdown Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-[#0066ff] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Key Financial Indicators & Master Balances (PKR)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live summary of your financial position
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="bg-white/95 border border-slate-200/90 hover:border-blue-300 px-4 py-2 rounded-full text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 cursor-default font-sans">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span dir="rtl">اہم مالیاتی اشاریے اور کھاتوں کے ماسٹر بیلنس</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Middle Row: Two side-by-side informational cards in connected container */}
          <div className="bg-white/70 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-blue-100/80 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse md:divide-blue-100">
            {/* Left Column: Live real-time balances */}
            <div className="flex items-start gap-3.5 pb-2 md:pb-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/70">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-700">Live real-time balances:</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Primary Cash-in-Hand drawer closing balance, total uncollected customer receivables, bank accounts deposits, cumulative recoveries collected, and total payable liabilities (Cr).
                </p>
              </div>
            </div>

            {/* Right Column: Urdu Description with Stylized Quote */}
            <div className="pt-3 md:pt-0 md:pl-4 flex items-start gap-2">
              <span className="text-[#0066ff] text-3xl font-serif font-black select-none shrink-0 leading-none">“</span>
              <div className="flex-1 text-right" dir="rtl">
                <p className="text-xs text-slate-700 font-medium leading-relaxed font-sans">
                  کیش ان ہینڈ کا لائیو کلوزنگ، بینک اکاؤنٹس کا کل بیلنس، لائف ٹائم وصول شدہ ریکوری، اور کمپنی کے ذمے کی واجب الادا رقم۔
                </p>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5" dir="ltr">
                  (Payables / Liabilities)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Filter Toolbar: Matching Reference Image */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          {/* Pill Container for Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white rounded-full border border-slate-200/80 shadow-2xs">
            {(
              [
                { id: 'today', labelEn: 'Today', labelUr: 'آج' },
                { id: 'yesterday', labelEn: 'Yesterday', labelUr: 'گزشتہ کل' },
                { id: 'week', labelEn: 'This Week', labelUr: 'یہ ہفتہ' },
                { id: 'month', labelEn: 'This Month', labelUr: 'یہ مہینہ' },
                { id: 'custom', labelEn: 'Custom', labelUr: 'کسٹم' },
              ] as { id: DateFilterType; labelEn: string; labelUr: string }[]
            ).map((btn) => {
              const isActive = activeTimeframe === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setActiveTimeframe(btn.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#0066ff] text-white font-bold shadow-md shadow-blue-500/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{btn.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Range Display with Calendar Pill */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-slate-500 font-medium text-xs flex items-center gap-1.5">
              <span>Selected Range:</span>
            </span>
            <div className="px-4 py-2 rounded-full bg-blue-50/80 text-blue-900 font-bold border border-blue-200/60 shadow-2xs flex items-center gap-2 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{activeDateRange.startDate}</span>
              <span className="text-blue-400">➔</span>
              <span>{activeDateRange.endDate}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Custom Range Date Pickers (if activeTimeframe === 'custom') */}
        {activeTimeframe === 'custom' && (
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Custom Date Pickers:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium">From:</span>
                <input
                  type="date"
                  value={customTimeRange.startDate}
                  onChange={(e) =>
                    setCustomTimeRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="text-xs bg-transparent text-slate-900 font-mono focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-slate-400 font-bold">➔</span>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 font-medium">To:</span>
                <input
                  type="date"
                  value={customTimeRange.endDate}
                  onChange={(e) =>
                    setCustomTimeRange((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  className="text-xs bg-transparent text-slate-900 font-mono focus:outline-hidden"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setCustomTimeRange({ startDate: '2026-10-01', endDate: SYSTEM_TODAY })
              }
              className="text-xs text-blue-700 hover:text-blue-900 underline cursor-pointer font-semibold"
            >
              Reset to Month
            </button>
          </div>
        )}

        {/* 5 Key Financial Master Balances - Clean & Professional Cards */}
        <Section1AnimatedCards
          cashClosingBalance={cashAccountLedger.closingBalance}
          cashAccountCode={cashAccount?.code || 'PERS-CASH'}
          totalCustomerOutstanding={customerStats.totalCustomerOutstanding}
          customerAccountsCount={accounts.filter((a) => a.category === 'Customer').length}
          totalBankBalance={bankStats.totalBankBalance}
          bankAccountsCount={accounts.filter((a) => a.category === 'Bank').length}
          totalRecoveryAllTime={totalRecoveryAllTime}
          recoveryCount={recoveries.length}
          totalPayableAmount={totalPayableAmount}
          payableAccountsCount={payableAccountsCount}
          onOpenMetricModal={setActiveMetricModal}
        />

        {/* CASH IN HAND PERIOD ENTRIES DRAWER */}
        {isCashDrawerOpen && (
          <div className="mt-4 bg-slate-900 text-slate-100 rounded-3xl border-2 border-emerald-500 ring-4 ring-emerald-500/20 shadow-2xl p-5 sm:p-7 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Drawer Top Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">
                    CASH IN HAND STATEMENT
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono text-[11px] border border-slate-700 font-semibold">
                    {activeTimeframe.toUpperCase()} [{activeDateRange.startDate} ➔ {activeDateRange.endDate}]
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({periodCashLedger.entries.length} Entries in Selected Range)
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1.5 flex items-center gap-2">
                  <span>منتخب مدت کے کیش ان ہینڈ واؤچرز اور روزنامچہ</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing all cash entries, vouchers, and customer cash collections recorded between <strong className="text-slate-200">{activeDateRange.startDate}</strong> and <strong className="text-slate-200">{activeDateRange.endDate}</strong>.
                </p>
              </div>

              {/* Action Buttons in Header: View Full Ledger & Close */}
              <div className="flex items-center gap-2.5 self-start lg:self-auto shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewAccountLedger(cashAccount)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
                  title="Open the complete lifetime historical ledger for Cash in Hand"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Full Lifetime Ledger (مکمل کیش لیجر) →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCashDrawerOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                  title="Close period statement"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Period Financial Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Period Opening Bal
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-slate-200 mt-1 tabular-nums truncate">
                  PKR {formatCurrency(Math.abs(periodCashLedger.openingBalance))} {periodCashLedger.openingBalance < 0 ? 'Cr' : 'Dr'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                  At {activeDateRange.startDate}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                  Period Cash In (+)
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1 tabular-nums truncate">
                  +PKR {formatCurrency(periodCashLedger.totalDebit)}
                </div>
                <div className="text-[10px] text-emerald-500/80 mt-0.5 truncate">
                  Total receipts & cash in
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50">
                <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">
                  Period Cash Out (-)
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-rose-400 mt-1 tabular-nums truncate">
                  -PKR {formatCurrency(periodCashLedger.totalCredit)}
                </div>
                <div className="text-[10px] text-rose-500/80 mt-0.5 truncate">
                  Total payments & cash out
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Net Period Flow
                </div>
                <div className={`text-sm sm:text-base font-bold font-mono mt-1 tabular-nums truncate ${
                  periodCashLedger.totalDebit - periodCashLedger.totalCredit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {periodCashLedger.totalDebit - periodCashLedger.totalCredit >= 0 ? '+' : ''}PKR {formatCurrency(periodCashLedger.totalDebit - periodCashLedger.totalCredit)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  Net cash velocity
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-900/50 border border-emerald-600/70 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider">
                  Period Closing Cash
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-white mt-1 tabular-nums truncate">
                  PKR {formatCurrency(Math.abs(periodCashLedger.closingBalance))} {periodCashLedger.closingBalance < 0 ? 'Cr' : 'Dr'}
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5 truncate font-mono">
                  At {activeDateRange.endDate}
                </div>
              </div>
            </div>

            {/* Entries Table */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/90 shadow-inner">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-3 px-3.5 w-28">Date</th>
                      <th className="py-3 px-3.5 w-32">Voucher #</th>
                      <th className="py-3 px-3.5">Particulars / Narration</th>
                      <th className="py-3 px-3.5 w-32">Entry Type</th>
                      <th className="py-3 px-3.5 text-right w-36 text-emerald-400">Cash In (DR)</th>
                      <th className="py-3 px-3.5 text-right w-36 text-rose-400">Cash Out (CR)</th>
                      <th className="py-3 px-3.5 text-right w-40 text-slate-200">Running Bal (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-900/40 text-slate-400 font-mono text-[11px]">
                      <td className="py-2.5 px-3.5 font-bold text-slate-300">{activeDateRange.startDate}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-500">—</td>
                      <td className="py-2.5 px-3.5 font-semibold text-slate-300">
                        Opening Balance (اس تاریخ سے پہلے کا کیش ان ہینڈ بیلنس)
                      </td>
                      <td className="py-2.5 px-3.5 font-sans font-bold text-slate-400">Opening</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 px-3.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-200 tabular-nums">
                        PKR {formatCurrency(Math.abs(periodCashLedger.openingBalance))} {periodCashLedger.openingBalance < 0 ? 'Cr' : 'Dr'}
                      </td>
                    </tr>

                    {periodCashLedger.entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                          کوئی نقد لین دین اس منتخب مدت میں نہیں ملا۔ تمام تاریخی اندراجات دیکھنے کے لیے نیچے دیا گیا <strong>"View Full Lifetime Ledger"</strong> بٹن دبائیں۔
                        </td>
                      </tr>
                    ) : (
                      periodCashLedger.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {entry.date}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                            {entry.voucherNo}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-200 max-w-md">
                            <div className="font-medium">{entry.description}</div>
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              entry.debit > 0
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                            {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-rose-400 tabular-nums whitespace-nowrap">
                            {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-white tabular-nums whitespace-nowrap">
                            PKR {formatCurrency(Math.abs(entry.balance))} {entry.balance < 0 ? 'Cr' : 'Dr'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-900 text-slate-200 border-t-2 border-slate-700 font-bold">
                    <tr>
                      <td colSpan={4} className="py-3 px-3.5 text-right uppercase tracking-wider text-xs text-slate-400">
                        Total Period Movements ({activeDateRange.startDate} to {activeDateRange.endDate}):
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-sm text-emerald-400 tabular-nums">
                        +PKR {formatCurrency(periodCashLedger.totalDebit)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-sm text-rose-400 tabular-nums">
                        -PKR {formatCurrency(periodCashLedger.totalCredit)}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono text-sm text-white tabular-nums">
                        PKR {formatCurrency(Math.abs(periodCashLedger.closingBalance))} {periodCashLedger.closingBalance < 0 ? 'Cr' : 'Dr'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Drawer Bottom Bar with Direct Full Ledger Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
              <span className="text-slate-400">
                Displaying <strong>{periodCashLedger.entries.length}</strong> cash movement(s) within selected period.
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onViewAccountLedger(cashAccount)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Full Lifetime Ledger (مکمل کیش لیجر) →</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('Cash in Hand')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-700/60 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cash Vouchers Drawer →
                </button>
                <button
                  type="button"
                  onClick={() => setIsCashDrawerOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700"
                >
                  Close (بند کریں)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. INVOICES DUE SOON (2 DAYS BEFORE 15-DAY TERMS - Section 2) */}
      <div className="rounded-2xl border-2 border-amber-500 ring-2 ring-amber-500/15 bg-amber-50/70 p-5 sm:p-6 shadow-xs space-y-4">
        <SectionHeader
          badgeText="SECTION 2 · سیکشن 2"
          badgeClass="bg-amber-600 text-white"
          borderClass="border-l-amber-600"
          titleEn="Invoices Due Soon (Within 1 to 2 Days of 15-Day Terms)"
          titleUr="قریب المیعاد انوائسز (1 تا 2 دن میں واجب الادا)"
          descEn="Proactive alerts for customer invoices nearing their 15-day credit period limit so your recovery team can follow up prior to delay."
          descUr="وہ انوائسز جن کے 15 دن کی ادھار میعاد ختم ہونے میں صرف 1 سے 2 دن رہ گئے ہیں تاکہ آپ وقت سے پہلے وصولی کی یاد دہانی کروا سکیں۔"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-amber-950">
                  ⚠️ Invoices Due Soon (Within 2 Days) — یہ انوائس ڈیو ہونے والی ہیں
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  {invoiceDueAnalysis.dueSoonList.length} Invoices Nearing 15 Days
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                15 دن کی میعاد مکمل ہونے میں صرف 1 سے 2 دن باقی ہیں۔ متوقع واجب الادا رقم: <strong>PKR {formatCurrency(invoiceDueAnalysis.totalDueSoonAmount)}</strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadDueSoonPdf}
              className="text-xs font-semibold text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download Due Soon Invoices A4 Sheet with Notes"
            >
              <Download className="w-3.5 h-3.5 text-amber-700" />
              <span>Download A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Add Invoice')}
              className="text-xs font-semibold text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Invoices Hub →</span>
            </button>
          </div>
        </div>

        {invoiceDueAnalysis.dueSoonList.length === 0 ? (
          <div className="py-6 text-center text-xs text-amber-900 bg-white rounded-xl border border-amber-200 font-medium">
            🎉 No customer invoices currently nearing their 15-day credit limit. All accounts are on schedule!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {invoiceDueAnalysis.dueSoonList.map(({ invoice, status, customer }) => (
              <div
                key={invoice.id}
                className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-2xs flex flex-col justify-between space-y-2 hover:border-amber-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      {invoice.customerCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-1">
                      {invoice.customerName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Inv #{invoice.invoiceNo} · Date: {invoice.date}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase shrink-0">
                    Due in {status.daysRemaining} {status.daysRemaining === 1 ? 'day' : 'days'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Due Date:</span>
                    <span className="font-mono text-xs font-bold text-amber-900">{status.dueDate}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Amount:</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      PKR {formatCurrency(invoice.amount)}
                    </span>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-end text-xs">
                  {customer && (
                    <button
                      type="button"
                      onClick={() => onViewAccountLedger(customer)}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded border border-blue-200 cursor-pointer"
                    >
                      View Ledger →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. OVERDUE CUSTOMER INVOICES (15+ DAYS COMPLETED - Section 3) */}
      <div className="rounded-2xl border-2 border-rose-600 ring-2 ring-rose-500/15 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-rose-50/20 border-b border-rose-100">
          <SectionHeader
            badgeText="SECTION 3 · سیکشن 3"
            badgeClass="bg-rose-600 text-white"
            borderClass="border-l-rose-600"
            titleEn="Overdue Customer Invoices (15+ Days Completed)"
            titleUr="15 دن سے زائد تاخیر کا شکار انوائسز (اوور ڈیو)"
            descEn="Urgent recovery collection tracker for customer invoices exceeding the 15-day credit cycle. Track days overdue, direct phone contacts, and record payments instantly."
            descUr="وہ تمام انوائسز جن کی 15 دن کی ادھار میعاد گزر چکی ہے۔ یہاں سے تاخیر کے دن، بقایا رقم اور فوری وصولی درج کرنے کی سہولت۔"
          />
        </div>

        {/* Clickable Header Banner: Click to View Breakdown */}
        <div
          onClick={() => setIsOverdueExpanded((prev) => !prev)}
          className="p-5 bg-gradient-to-r from-rose-50/90 via-rose-50/40 to-white border-b border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-rose-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  15 Days Completed — Overdue Customer Invoices
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                  {invoiceDueAnalysis.overdueList.length} Invoices
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                جن انوائسز کے 15 دن مکمل ہو چکے ہیں — کلک کر کے مکمل کسٹمر تفصیل اور واجب الادا رقم دیکھیں
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadOverduePdf();
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download Overdue Invoices A4 Sheet with Notes"
            >
              <Download className="w-3.5 h-3.5 text-rose-700" />
              <span className="hidden sm:inline">Download A4 PDF</span>
              <span className="sm:hidden">A4 PDF</span>
            </button>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Overdue Amount:
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-700 tabular-nums">
                PKR {formatCurrency(invoiceDueAnalysis.totalOverdueAmount)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-rose-200 text-rose-700 shadow-2xs">
              {isOverdueExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {/* Breakdown List (Shown on Click / Expanded) */}
        {isOverdueExpanded && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 pb-2 border-b border-rose-100">
              <span className="font-semibold text-rose-950">
                Customer Breakdown ({invoiceDueAnalysis.overdueList.length} Overdue Accounts):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadOverduePdf}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Download Overdue Invoices A4 Sheet with Notes"
                >
                  <Download className="w-3.5 h-3.5 text-rose-700" />
                  <span>Download A4 PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('Add Invoice')}
                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Go to Add Invoice View →
                </button>
              </div>
            </div>

            {invoiceDueAnalysis.overdueList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                🎉 No invoices with 15+ days completed! All customer payments are on track.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Customer Account</th>
                      <th className="py-2.5 px-3 w-32">Invoice #</th>
                      <th className="py-2.5 px-3 w-28">Invoice Date</th>
                      <th className="py-2.5 px-3 w-36">Due Date (15d Mark)</th>
                      <th className="py-2.5 px-3 text-right w-36">Amount Due (PKR)</th>
                      <th className="py-2.5 px-3 text-center w-36">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {invoiceDueAnalysis.overdueList.map(({ invoice, status, customer }) => (
                      <tr key={invoice.id} className="hover:bg-rose-50/40 transition-colors">
                        {/* Customer */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="font-mono text-blue-700 font-bold">
                              {invoice.customerCode}
                            </span>
                            <span>{invoice.customerName}</span>
                          </div>
                          {customer?.contact && (
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              📞 {customer.contact} {customer.location ? `· ${customer.location}` : ''}
                            </div>
                          )}
                        </td>

                        {/* Invoice # */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {invoice.invoiceNo}
                        </td>

                        {/* Invoice Date */}
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {invoice.date}
                        </td>

                        {/* Due Date & Overdue badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono text-slate-800">{status.dueDate}</div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-block mt-0.5">
                            {status.daysOverdue} days overdue
                          </span>
                        </td>

                        {/* Amount Due */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-700 tabular-nums whitespace-nowrap text-sm">
                          PKR {formatCurrency(invoice.amount)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {customer && (
                              <button
                                type="button"
                                onClick={() => onViewAccountLedger(customer)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                              >
                                View Ledger →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-rose-50/80 font-bold text-slate-900 border-t-2 border-rose-300">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right uppercase tracking-wider text-xs text-rose-900">
                        Total Due Invoices Amount (15+ Days Complete):
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-base font-black text-rose-700 tabular-nums">
                        PKR {formatCurrency(invoiceDueAnalysis.totalOverdueAmount)}
                      </td>
                      <td className="py-3 px-3 text-center text-xs text-slate-400 font-mono">
                        —
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. LOCATION-WISE CUSTOMER DUE SECTION (Section 4) */}
      <div className="rounded-2xl border-2 border-indigo-600 ring-2 ring-indigo-500/15 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-indigo-50/20 border-b border-indigo-100">
          <SectionHeader
            badgeText="SECTION 4 · سیکشن 4"
            badgeClass="bg-indigo-600 text-white"
            borderClass="border-l-indigo-600"
            titleEn="Location & City-Wise Customer Receivables"
            titleUr="شہر اور علاقہ وائز کسٹمر بقایا جات کی رپورٹ"
            descEn="Geographic breakdown of outstanding debts by cities (Lahore, Karachi, Faisalabad, Islamabad, etc.) with proportional distribution bars, city-specific filters, and direct customer contact directories."
            descUr="پاکستان کے مختلف شہروں اور علاقوں کے لحاظ سے کسٹمرز سے وصول طلب رقوم کی تفصیل، فیصد تناسب، مخصوص شہر کے کسٹمرز کی فہرست، رابطہ نمبر، اور فوری لیجر کی سہولت۔"
          />
        </div>

        {/* Header Banner */}
        <div
          onClick={() => setIsLocationSectionExpanded((prev) => !prev)}
          className="p-5 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Location-Wise Total Due & Customer Outstanding
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {locationDueAnalysis.locationsList.length} Cities / Regions
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                لوکیشن اور شہر کے حساب سے کل واجب الادا رقم کا موازنہ اور کسٹمر فہرست
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Outstanding Across Locations:
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-blue-900 tabular-nums">
                PKR {formatCurrency(locationDueAnalysis.grandTotalDue)}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
              {isLocationSectionExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {/* Section Content */}
        {isLocationSectionExpanded && (
          <div className="p-5 space-y-5">
            {/* Location Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* "All Locations" Card / Filter */}
              <button
                type="button"
                onClick={() => setSelectedLocationCity('All')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedLocationCity === 'All'
                    ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Map className="w-3.5 h-3.5 text-blue-600" />
                      All Regions (تمام علاقے)
                    </span>
                    <span className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      {accounts.filter((a) => a.category === 'Customer').length} Clients
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-black font-mono text-slate-900 tabular-nums">
                    PKR {formatCurrency(locationDueAnalysis.grandTotalDue)}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>100% Total Due</span>
                  <span className="font-semibold text-blue-700">View All →</span>
                </div>
              </button>

              {/* Individual Cities / Locations */}
              {locationDueAnalysis.locationsList.map((loc) => {
                const percentOfTotal = locationDueAnalysis.grandTotalDue > 0
                  ? Math.round((loc.totalDue / locationDueAnalysis.grandTotalDue) * 100)
                  : 0;
                const isSelected = selectedLocationCity === loc.city;

                return (
                  <button
                    key={loc.city}
                    type="button"
                    onClick={() => setSelectedLocationCity(loc.city)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{loc.city}</span>
                        </span>
                        <span className="text-[10px] font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 shrink-0 ml-1">
                          {loc.customerCount} {loc.customerCount === 1 ? 'Client' : 'Clients'}
                        </span>
                      </div>
                      <div className="mt-2 text-lg font-black font-mono text-blue-900 tabular-nums">
                        PKR {formatCurrency(loc.totalDue)}
                      </div>
                      {/* Progress Bar showing proportion */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(8, percentOfTotal))}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono">{percentOfTotal}% of total</span>
                      {loc.customers.some((c) => c.overdueInvoicesCount > 0) ? (
                        <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Has Overdue
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium text-[10px]">On Track</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drilldown Customer Table for Selected Location */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedLocationCity === 'All'
                      ? 'All Locations — Customer Receivables Directory'
                      : `Customers in ${selectedLocationCity} (${
                          locationDueAnalysis.locationsList.find((l) => l.city === selectedLocationCity)?.customerCount || 0
                        } Accounts)`}
                  </span>
                  {selectedLocationCity !== 'All' && (
                    <button
                      type="button"
                      onClick={() => setSelectedLocationCity('All')}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                    >
                      (Show All Locations)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-slate-600 text-xs">
                    Total Due:{' '}
                    <span className="font-mono font-black text-rose-700 text-sm">
                      PKR {formatCurrency(
                        selectedLocationCity === 'All'
                          ? locationDueAnalysis.grandTotalDue
                          : locationDueAnalysis.locationsList.find((l) => l.city === selectedLocationCity)?.totalDue || 0
                      )}
                    </span>
                  </div>

                  {/* A4 PDF Download Button for Field Recovery Officer */}
                  <button
                    type="button"
                    onClick={handleDownloadLocationDuePdf}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:scale-102"
                    title="Download A4 Recovery Collection Sheet with remarks column for field visits"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download A4 Recovery PDF (ریکوری شیٹ)</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/70 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">City / Area</th>
                      <th className="py-2.5 px-3">Customer Account</th>
                      <th className="py-2.5 px-3">Detailed Location / Address</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3 text-right">Outstanding Due (PKR)</th>
                      <th className="py-2.5 px-3 text-center">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {locationDueAnalysis.locationsList
                      .filter((loc) => selectedLocationCity === 'All' || loc.city === selectedLocationCity)
                      .flatMap((loc) =>
                        loc.customers.map(({ account, balance, overdueInvoicesCount }) => (
                          <tr key={account.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                                <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                                {loc.city}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                <span className="font-mono text-slate-600 font-bold bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                                  {account.code}
                                </span>
                                <span>{account.name}</span>
                              </div>
                              {overdueInvoicesCount > 0 && (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                                  ⚠️ {overdueInvoicesCount} Overdue Invoice(s)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                              {account.location || '—'}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {account.contact || '—'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                              <span
                                className={balance > 0 ? 'text-rose-700 font-bold text-sm' : balance < 0 ? 'text-amber-700' : 'text-slate-400'}
                              >
                                PKR {formatCurrency(Math.abs(balance))} {balance < 0 ? 'Cr' : balance > 0 ? 'Dr' : ''}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => onViewAccountLedger(account)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer"
                                >
                                  View Ledger →
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. ACCOUNT AND CUSTOMER DIRECTORY (Section 5) */}
      <div className="bg-white rounded-2xl border-2 border-cyan-600 ring-2 ring-cyan-500/15 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-cyan-50/20 border-b border-cyan-100">
          <SectionHeader
            badgeText="SECTION 5 · سیکشن 5"
            badgeClass="bg-cyan-700 text-white"
            borderClass="border-l-cyan-700"
            titleEn="Comprehensive Master Account & Customer Directory"
            titleUr="کھاتہ جات اور کسٹمرز کی ماسٹر ڈائریکٹری"
            descEn="Searchable master database of all customer, bank, expense, and personal accounts. Filter by category, Dr/Cr balance status, city, or code, and view live closing balances."
            descUr="تمام رجسٹرڈ کسٹمرز، بینک، دفتری اخراجات اور ذاتی کھاتوں کی مکمل فہرست، نام/کوڈ/شہر سے تلاش، کیٹیگری اور بیلنس کے فلٹرز، اور کسی بھی کھاتے کا تفصیلی لیجر۔"
          />
        </div>

        {/* Header Bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Account and Customer Directory
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                {filteredAccounts.length} of {accounts.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Filter customer, bank, expense, and personal accounts by code, name, city, or live closing balance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadDirectoryPdf}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Download Master Accounts & Customer Directory PDF with Audit Notes"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Create Account')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ New Account</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('View Accounts Report')}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Print Ledgers</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={accountSearchQuery}
                onChange={(e) => setAccountSearchQuery(e.target.value)}
                placeholder="Search by code (CUST-101), name, city (Lahore), contact, or balance..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
              />
              {accountSearchQuery && (
                <button
                  type="button"
                  onClick={() => setAccountSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={accountCategoryFilter}
                  onChange={(e) => setAccountCategoryFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="All">All Categories</option>
                  <option value="Customer">Customer Accounts</option>
                  <option value="Bank">Bank Accounts</option>
                  <option value="Office Expense">Office Expenses</option>
                  <option value="Personal">Personal Accounts</option>
                </select>
              </div>
            </div>

            {/* Balance Status Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <select
                  value={accountBalanceFilter}
                  onChange={(e) => setAccountBalanceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="all">All Balance Statuses</option>
                  <option value="receivable">Receivable / Due (&gt; 0 DR)</option>
                  <option value="payable">Payable / Advance (&lt; 0 CR)</option>
                  <option value="zero">Zero Balanced (₨ 0.00)</option>
                  <option value="high">High Value (&gt;= ₨ 100,000)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Active Filter Badges */}
          {(accountSearchQuery || accountCategoryFilter !== 'All' || accountBalanceFilter !== 'all') && (
            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
                {accountSearchQuery && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200 flex items-center gap-1">
                    "{accountSearchQuery}"
                    <button onClick={() => setAccountSearchQuery('')} className="cursor-pointer font-bold">×</button>
                  </span>
                )}
                {accountCategoryFilter !== 'All' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                    Category: {accountCategoryFilter}
                    <button onClick={() => setAccountCategoryFilter('All')} className="cursor-pointer font-bold">×</button>
                  </span>
                )}
                {accountBalanceFilter !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 flex items-center gap-1">
                    Balance: {accountBalanceFilter}
                    <button onClick={() => setAccountBalanceFilter('all')} className="cursor-pointer font-bold">×</button>
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountSearchQuery('');
                  setAccountCategoryFilter('All');
                  setAccountBalanceFilter('all');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>

        {/* Directory Table / Accounts Grid */}
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 w-28">Code</th>
                <th className="py-3 px-4">Account / Customer Name</th>
                <th className="py-3 px-4 w-32">Category</th>
                <th className="py-3 px-4">Contact & Location</th>
                <th className="py-3 px-4 text-right w-36">Live Closing Balance</th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Search className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No matching accounts found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try searching with different keywords or clearing your balance / category filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(({ account, balance }) => {
                  const isCustomer = account.category === 'Customer';
                  const isBank = account.category === 'Bank';
                  const isExpense = account.category === 'Office Expense';

                  return (
                    <tr
                      key={account.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {account.code}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{account.name}</div>
                        {account.id === 'acc_pers_cash' || account.code === 'PERS-CASH' ? (
                          <span className="text-[10px] text-emerald-700 font-bold">
                            ★ Primary Cash Drawer
                          </span>
                        ) : null}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCustomer
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isBank
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isExpense
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {account.category}
                        </span>
                      </td>

                      {/* Contact & Location */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-700">
                            {account.contact || '—'}
                          </span>
                          {account.location && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                {account.location}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Live Closing Balance */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-baseline justify-end gap-1.5 font-mono tabular-nums font-bold text-xs sm:text-sm">
                          <span
                            className={
                              balance > 0
                                ? isCustomer
                                  ? 'text-pink-700'
                                  : 'text-emerald-700'
                                : balance < 0
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }
                          >
                            PKR {formatCurrency(Math.abs(balance))}
                          </span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-bold border uppercase ${
                              balance < 0
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : balance > 0
                                ? 'bg-slate-100 text-slate-700 border-slate-300'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {balance < 0 ? 'CR' : balance > 0 ? 'DR' : '0.00'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onViewAccountLedger(account)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Ledger</span>
                          <ArrowRight className="w-3 h-3" />
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

      {/* 6. RECENT FINANCIAL TRANSACTIONS JOURNAL (Section 6) */}
      <div className="bg-white rounded-2xl border-2 border-purple-600 ring-2 ring-purple-500/15 p-5 sm:p-6 shadow-xs">
        <SectionHeader
          badgeText="SECTION 6 · سیکشن 6"
          badgeClass="bg-purple-600 text-white"
          borderClass="border-l-purple-600"
          titleEn="Recent Financial Transactions Journal (Audit Log)"
          titleUr="حالیہ مالیاتی لین دین کا روزنامچہ (جرنل لاگ)"
          descEn="Live chronological audit trail of recent cash receipts, cash disbursements, double-entry vouchers, and customer recoveries with voucher numbers, payment methods, and timestamps."
          descUr="سسٹم میں حال ہی میں درج کیے گئے کیش واؤچرز، نقد ادائیگیاں، رسیدیں اور کسٹمر ریکوریز کا تازہ ترین مکمل ریکارڈ، واؤچر نمبر، ادائیگی کا طریقہ اور تاریخ۔"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recent PKR Financial Transactions
            </h2>
            <p className="text-[11px] text-slate-500">
              Latest cash vouchers, credit/debit movements, and customer recoveries in Lahore
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('Cash in Hand')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              Cash Vouchers →
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => onNavigate('Recovery Entry')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              Recoveries →
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent transactions recorded yet.
            </div>
          ) : (
            recentActivities.map((act) => {
              const isPositive = act.type === 'recovery' || act.type === 'cash_in';
              return (
                <div
                  key={act.id}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/70 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        act.type === 'recovery'
                          ? 'bg-amber-50 text-amber-600'
                          : act.type === 'cash_in'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {act.type === 'recovery' ? (
                        <Receipt className="w-4 h-4" />
                      ) : act.type === 'cash_in' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {act.title}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono font-medium text-slate-700">{act.voucherNo}</span>
                        <span>·</span>
                        <span>{act.date}</span>
                        <span>·</span>
                        <span className="text-slate-600 font-medium">{act.method}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-xs sm:text-sm tabular-nums ${
                        isPositive ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isPositive ? '+' : ''}PKR {formatCurrency(act.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive Modal Windows for Dashboard Metric Cards */}
      <DashboardMetricModals
        activeModal={activeMetricModal}
        onClose={() => setActiveMetricModal(null)}
        accounts={accounts}
        cashTxns={cashTxns}
        recoveries={recoveries}
        invoices={invoices}
        cashAccount={cashAccount}
        cashAccountLedger={cashAccountLedger}
        customerStats={customerStats}
        bankStats={bankStats}
        totalPayableAmount={totalPayableAmount}
        payableAccountsCount={payableAccountsCount}
        totalRecoveryAllTime={totalRecoveryAllTime}
        activeDateRange={activeDateRange}
        activeTimeframe={activeTimeframe}
        onNavigate={onNavigate}
        onViewAccountLedger={onViewAccountLedger}
      />
    </div>
  );
};
