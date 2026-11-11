import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  FileDown,
  Loader2,
  Phone,
  AlertTriangle,
  Pencil,
  X,
  Check,
  Save,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  Account,
  AccountCategory,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  UserProfile,
  DateRange,
  LedgerEntry,
  PaymentMethod,
} from '../types';
import {
  SYSTEM_TODAY,
  generateAccountLedger,
  getInvoiceDueStatus,
  calculateInvoiceDueDate,
} from '../utils/accounting';
import { formatCurrency, numberToWords } from '../utils/numberToWords';

interface ViewAccountsReportViewProps {
  accounts: Account[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  invoices: CustomerInvoice[];
  userProfile: UserProfile;
  initialAccountId?: string;
  onSaveInvoice?: (invoice: CustomerInvoice) => boolean;
  onSaveRecovery?: (recovery: RecoveryEntry) => boolean;
  onSaveCashTxn?: (txn: CashTransaction) => boolean;
  onSaveAccount?: (account: Account) => boolean;
}

export const ViewAccountsReportView: React.FC<ViewAccountsReportViewProps> = ({
  accounts,
  cashTxns,
  recoveries,
  invoices,
  userProfile,
  initialAccountId,
  onSaveInvoice,
  onSaveRecovery,
  onSaveCashTxn,
  onSaveAccount,
}) => {
  // Account selection state
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId || accounts[0]?.id || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'All' | AccountCategory>('All');
  const [accountSearch, setAccountSearch] = useState('');

  // Report date range filter
  const [fromDate, setFromDate] = useState('2026-09-01');
  const [toDate, setToDate] = useState(SYSTEM_TODAY);

  // Sorting
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Find currently selected account
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // Filter accounts for dropdown
  const filteredAccountOptions = useMemo(() => {
    return accounts.filter((a) => {
      const matchCat = categoryFilter === 'All' || a.category === categoryFilter;
      const q = accountSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [accounts, categoryFilter, accountSearch]);

  // Generate ledger statement
  const dateRange: DateRange = useMemo(() => {
    return { startDate: fromDate, endDate: toDate };
  }, [fromDate, toDate]);

  const ledgerData = useMemo(() => {
    if (!selectedAccount) {
      return {
        openingBalance: 0,
        entries: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    }
    const result = generateAccountLedger(
      selectedAccount,
      invoices,
      recoveries,
      cashTxns,
      dateRange
    );

    if (sortOrder === 'desc') {
      return {
        ...result,
        entries: [...result.entries].reverse(),
      };
    }
    return result;
  }, [selectedAccount, invoices, recoveries, cashTxns, dateRange, sortOrder]);

  // Identify all overdue invoices (15 days term completed) for current selected customer
  const customerOverdueInvoices = useMemo(() => {
    if (!selectedAccount || selectedAccount.category !== 'Customer') return [];
    return invoices
      .filter((inv) => inv.customerId === selectedAccount.id)
      .map((inv) => ({
        invoice: inv,
        dueStatus: getInvoiceDueStatus(inv, SYSTEM_TODAY),
      }))
      .filter((item) => item.dueStatus.isOverdue);
  }, [selectedAccount, invoices]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (!selectedAccount) return;

    const headers = ['Date', 'Voucher No / Invoice No', 'Type', 'Description', 'Debit', 'Credit', 'Running Balance'];
    const rows = [
      headers.join(','),
      `"${fromDate}","OPN-BAL","Opening","Opening Balance",${ledgerData.openingBalance > 0 ? ledgerData.openingBalance : 0},${ledgerData.openingBalance < 0 ? Math.abs(ledgerData.openingBalance) : 0},"${Math.abs(ledgerData.openingBalance)} ${ledgerData.openingBalance < 0 ? 'Cr' : 'Dr'}"`,
      ...ledgerData.entries.map((entry) => {
        const matchedInv = invoices.find(
          (inv) => selectedAccount.category === 'Customer' && inv.customerId === selectedAccount.id && (inv.invoiceNo === entry.voucherNo || inv.id === entry.id)
        );
        const status = matchedInv ? getInvoiceDueStatus(matchedInv, SYSTEM_TODAY) : null;
        const voucherLabel = status?.isOverdue ? `${entry.voucherNo} [OVERDUE]` : entry.voucherNo;
        return [
          `"${entry.date}"`,
          `"${voucherLabel}"`,
          `"${entry.type}"`,
          `"${entry.description.replace(/"/g, '""')}"`,
          entry.debit,
          entry.credit,
          `"${Math.abs(entry.balance)} ${entry.balance < 0 ? 'Cr' : 'Dr'}"`,
        ].join(',');
      }),
      `"","TOTAL","","Total Movement",${ledgerData.totalDebit},${ledgerData.totalCredit},"${Math.abs(ledgerData.closingBalance)} ${ledgerData.closingBalance < 0 ? 'Cr' : 'Dr'}"`,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Ledger_${selectedAccount.code}_${fromDate}_to_${toDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Customer Ledger Entry Edit Modal State & Handlers ---
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    voucherNo: '',
    description: '',
    amount: 0,
    paymentMethod: 'Cash' as PaymentMethod,
    chequeNo: '',
    chequeBank: '',
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Opening Balance Edit State & Handlers
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [editOpeningBalAmount, setEditOpeningBalAmount] = useState<number | string>(0);
  const [editOpeningBalType, setEditOpeningBalType] = useState<'Dr' | 'Cr'>('Dr');

  const handleOpenEditOpeningBalanceModal = () => {
    if (!selectedAccount) return;
    setEditOpeningBalAmount(Math.abs(selectedAccount.openingBalance || 0));
    setEditOpeningBalType(selectedAccount.openingBalanceType || 'Dr');
    setIsOpeningBalanceModalOpen(true);
  };

  const handleSaveOpeningBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    const amt = Math.max(0, Number(editOpeningBalAmount) || 0);
    const updatedAccount: Account = {
      ...selectedAccount,
      openingBalance: amt,
      openingBalanceType: editOpeningBalType,
    };
    onSaveAccount?.(updatedAccount);
    showToast(`Opening balance for ${selectedAccount.name} updated to PKR ${formatCurrency(amt)} (${editOpeningBalType})`);
    setIsOpeningBalanceModalOpen(false);
  };

  const handleOpenEditModal = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setEditFormError(null);

    // Look for matching invoice
    const inv = invoices.find(
      (i) => (entry.sourceType === 'invoice' && i.id === entry.sourceId) || i.id === entry.id || i.invoiceNo === entry.voucherNo
    );

    // Look for matching recovery
    const rec = recoveries.find(
      (r) =>
        (entry.sourceType === 'recovery' && r.id === entry.sourceId) ||
        r.id === entry.id ||
        r.id === entry.id.replace(/_(csh|chq)$/, '') ||
        r.voucherNo === entry.voucherNo
    );

    // Look for matching cash transaction
    const txn = cashTxns.find(
      (t) =>
        (entry.sourceType === 'cashTxn' && t.id === entry.sourceId) ||
        t.id === entry.id ||
        t.id === entry.id.replace(/_(cr|dr)$/, '') ||
        t.voucherNo === entry.voucherNo
    );

    if (inv) {
      setEditForm({
        date: inv.date,
        voucherNo: inv.invoiceNo,
        description: inv.description,
        amount: inv.amount,
        paymentMethod: 'Cash',
        chequeNo: '',
        chequeBank: '',
      });
    } else if (rec) {
      setEditForm({
        date: rec.date,
        voucherNo: rec.voucherNo,
        description: rec.remarks || entry.description,
        amount: rec.amount,
        paymentMethod: rec.paymentMethod,
        chequeNo: rec.chequeNo || '',
        chequeBank: rec.chequeBank || '',
      });
    } else if (txn) {
      setEditForm({
        date: txn.date,
        voucherNo: txn.voucherNo,
        description: txn.description,
        amount: txn.amount,
        paymentMethod: 'Cash',
        chequeNo: '',
        chequeBank: '',
      });
    } else {
      setEditForm({
        date: entry.date,
        voucherNo: entry.voucherNo,
        description: entry.description,
        amount: entry.debit > 0 ? entry.debit : entry.credit,
        paymentMethod: 'Cash',
        chequeNo: '',
        chequeBank: '',
      });
    }

    setIsEditModalOpen(true);
  };

  const handleSaveEditedEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    if (!editForm.date) {
      setEditFormError('Please select a valid date (تاریخ درج کریں).');
      return;
    }
    if (!editForm.voucherNo.trim()) {
      setEditFormError('Please enter a valid Invoice or Voucher Number (انوائس یا واؤچر نمبر درج کریں).');
      return;
    }
    const amt = Number(editForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setEditFormError('Amount must be a positive number (رقم درست درج کریں).');
      return;
    }

    // Look for matching invoice
    const inv = invoices.find(
      (i) => (editingEntry.sourceType === 'invoice' && i.id === editingEntry.sourceId) || i.id === editingEntry.id || i.invoiceNo === editingEntry.voucherNo
    );

    // Look for matching recovery
    const rec = recoveries.find(
      (r) =>
        (editingEntry.sourceType === 'recovery' && r.id === editingEntry.sourceId) ||
        r.id === editingEntry.id ||
        r.id === editingEntry.id.replace(/_(csh|chq)$/, '') ||
        r.voucherNo === editingEntry.voucherNo
    );

    // Look for matching cash transaction
    const txn = cashTxns.find(
      (t) =>
        (editingEntry.sourceType === 'cashTxn' && t.id === editingEntry.sourceId) ||
        t.id === editingEntry.id ||
        t.id === editingEntry.id.replace(/_(cr|dr)$/, '') ||
        t.voucherNo === editingEntry.voucherNo
    );

    if (inv) {
      const newDueDate = calculateInvoiceDueDate(editForm.date, 15);
      const updated: CustomerInvoice = {
        ...inv,
        date: editForm.date,
        dueDate: newDueDate,
        invoiceNo: editForm.voucherNo.trim(),
        description: editForm.description.trim(),
        amount: amt,
      };
      onSaveInvoice?.(updated);
    } else if (rec) {
      const updated: RecoveryEntry = {
        ...rec,
        date: editForm.date,
        voucherNo: editForm.voucherNo.trim(),
        remarks: editForm.description.trim(),
        amount: amt,
        paymentMethod: editForm.paymentMethod,
        cashAmount: editForm.paymentMethod === 'Cash' ? amt : (rec.cashAmount ? amt : undefined),
        chequeAmount: editForm.paymentMethod === 'Cheque' ? amt : (rec.chequeAmount ? amt : undefined),
        chequeNo: editForm.chequeNo.trim() || undefined,
        chequeBank: editForm.chequeBank.trim() || undefined,
      };
      onSaveRecovery?.(updated);
    } else if (txn) {
      const updated: CashTransaction = {
        ...txn,
        date: editForm.date,
        voucherNo: editForm.voucherNo.trim(),
        description: editForm.description.trim(),
        amount: amt,
        creditAmount: txn.creditAmount !== undefined ? amt : undefined,
        debitAmount: txn.debitAmount !== undefined ? amt : undefined,
      };
      onSaveCashTxn?.(updated);
    }

    showToast(`Entry "${editForm.voucherNo}" updated successfully! Ledger recalculated.`);
    setIsEditModalOpen(false);
    setEditingEntry(null);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  const handleDownloadPDF = () => {
    if (!selectedAccount) return;

    try {
      setIsGeneratingPDF(true);

      // Create pristine vector A4 PDF document in mm
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // 1. Company Brand Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(userProfile.companyName || 'Ejaz Business Solution', margin, 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text('Lahore', margin, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(userProfile.companyAddress || 'Suite 405, Executive Business Heights, Main Gulberg III, Lahore, Pakistan', margin, 27.5);
      doc.text(`Contact: ${userProfile.companyPhone}  |  Email: ${userProfile.email}`, margin, 31.5);

      // Top Right Statement Badge
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(pageWidth - margin - 58, 12, 58, 6.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('GENERAL ACCOUNT LEDGER', pageWidth - margin - 29, 16.3, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Period: ${fromDate} to ${toDate}`, pageWidth - margin, 23, { align: 'right' });
      doc.text(`Generated: ${new Date().toLocaleDateString('en-PK')} ${new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 27, { align: 'right' });

      // Horizontal separator line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(margin, 35, pageWidth - margin, 35);

      // 2. Customer & Account Meta Box (with Customer Contact prominently featured)
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin, 38, contentWidth, 23, 2, 2, 'FD');

      // Top bar in meta box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${selectedAccount.code} - ${selectedAccount.name}`, margin + 4, 45);

      // Category Pill
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Category: ${selectedAccount.category}`, margin + 4, 51);

      // Customer Contact No (PROMINENT as requested)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Customer Contact: ${selectedAccount.contact || 'N/A'}`, margin + 65, 51);

      // Location
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Location: ${selectedAccount.location || 'N/A'}`, margin + 4, 56.5);

      // 3. Prepare table data for autoTable
      const tableHeaders = [
        ['Date', 'Voucher No / Invoice No', 'Description / Particulars', 'Debit (PKR)', 'Credit (PKR)', 'Running Balance']
      ];

      const opDebit = ledgerData.openingBalance > 0 ? formatCurrency(ledgerData.openingBalance) : '-';
      const opCredit = ledgerData.openingBalance < 0 ? formatCurrency(Math.abs(ledgerData.openingBalance)) : '-';
      const opRunning = `${formatCurrency(Math.abs(ledgerData.openingBalance))} ${ledgerData.openingBalance < 0 ? 'CR' : 'DR'}`;

      const tableRows: any[] = [
        [
          fromDate,
          'OPN-BAL',
          'Opening Balance Brought Forward',
          opDebit,
          opCredit,
          opRunning,
        ]
      ];

      ledgerData.entries.forEach((entry) => {
        const matchedInv = invoices.find(
          (inv) => selectedAccount.category === 'Customer' && inv.customerId === selectedAccount.id && (inv.invoiceNo === entry.voucherNo || inv.id === entry.id)
        );
        const status = matchedInv ? getInvoiceDueStatus(matchedInv, SYSTEM_TODAY) : null;
        const isOverdue = status?.isOverdue;

        const voucherCol = isOverdue
          ? `${entry.voucherNo}\n[OVERDUE PENDING]`
          : entry.voucherNo;

        tableRows.push([
          entry.date,
          voucherCol,
          isOverdue ? `${entry.description} (15-Days Credit Expired)` : entry.description,
          entry.debit > 0 ? formatCurrency(entry.debit) : '-',
          entry.credit > 0 ? formatCurrency(entry.credit) : '-',
          `${formatCurrency(Math.abs(entry.balance))} ${entry.balance < 0 ? 'CR' : 'DR'}`,
        ]);
      });

      // Total row
      const closingStr = `: Closing Balance : PKR ${formatCurrency(Math.abs(ledgerData.closingBalance))} ${ledgerData.closingBalance < 0 ? 'CR' : ledgerData.closingBalance > 0 ? 'DR' : '0.00'}`;

      tableRows.push([
        '',
        'TOTAL',
        'Total Movement in Period',
        formatCurrency(ledgerData.totalDebit),
        formatCurrency(ledgerData.totalCredit),
        `${formatCurrency(Math.abs(ledgerData.closingBalance))} ${ledgerData.closingBalance < 0 ? 'CR' : 'DR'}`
      ]);

      // Render Table using autoTable
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 64,
        margin: { left: margin, right: margin, bottom: 25 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          textColor: [15, 23, 42],
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 32 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 26, halign: 'right' },
          5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          // Highlight opening row & total row
          if (data.row.index === 0) {
            data.cell.styles.fillColor = [248, 250, 252];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [15, 23, 42];
          }
          // Highlight overdue invoice rows in light red in PDF
          const rawRow = data.row.raw as unknown as any[];
          const rowText = Array.isArray(rawRow) ? String(rawRow[1] || '') : '';
          if (rowText.includes('[OVERDUE PENDING]')) {
            data.cell.styles.fillColor = [254, 242, 242]; // rose-50
            if (data.column.index === 1) {
              data.cell.styles.textColor = [190, 18, 60]; // rose-700
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });

      // 4. Closing Balance Banner right after table
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 220;

      // Check if we have room for summary & signatures on current page
      let currentY = finalY;
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      // Closing Balance Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, contentWidth, 12, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const netMovement = ledgerData.totalDebit - ledgerData.totalCredit;
      doc.text(`Net Movement: ${netMovement >= 0 ? '+' : ''}PKR ${formatCurrency(netMovement)}`, margin + 4, currentY + 7.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(closingStr, pageWidth - margin - 4, currentY + 7.5, { align: 'right' });

      // Signatures
      currentY += 24;
      if (currentY > 275) {
        doc.addPage();
        currentY = 30;
      }

      doc.setDrawColor(148, 163, 184); // slate-400
      doc.line(margin + 10, currentY, margin + 55, currentY);
      doc.line(pageWidth - margin - 55, currentY, pageWidth - margin - 10, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By (Accountant)', margin + 32.5, currentY + 4, { align: 'center' });
      doc.text(userProfile.name, margin + 32.5, currentY + 8, { align: 'center' });

      doc.text('Audited & Approved By', pageWidth - margin - 32.5, currentY + 4, { align: 'center' });
      doc.text('Finance Controller', pageWidth - margin - 32.5, currentY + 8, { align: 'center' });

      // Page numbers footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Ejaz Business Solution · Lahore', margin, 290);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
      }

      const safeCode = selectedAccount.code.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Ledger_${safeCode}_${fromDate}_to_${toDate}.pdf`;

      // Save directly via Blob + download anchor (100% reliable across browsers and iframes)
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);

      setPdfSuccessMessage(`PDF downloaded successfully: ${fileName}`);
      setTimeout(() => setPdfSuccessMessage(null), 4000);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Could not download PDF directly. Opening print dialog instead.');
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Filter Bar (Hidden in Print) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              View Accounts Report & General Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate official A4 statement of accounts with debit/credit breakdown and running balance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Download official A4 PDF document"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating A4 PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF (A4)</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Statement</span>
            </button>
          </div>
        </div>

        {/* PDF Download Success Banner */}
        {pdfSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between no-print shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{pdfSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Search Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Search Account
            </label>
            <input
              type="text"
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder="e.g. CUST-101, Al-Madina, Lahore..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Filter by Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Customer">Customer Accounts</option>
              <option value="Bank">Bank Accounts</option>
              <option value="Office Expense">Office Expense Accounts</option>
              <option value="Personal">Personal Accounts</option>
            </select>
          </div>

          {/* Account Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Account to View
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filteredAccountOptions.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name} ({acc.category})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: From - To */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Date Range (From - To)
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-1/2 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Sort By Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sort Order
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                className={`w-1/2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  sortOrder === 'asc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Oldest First (Asc)
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                className={`w-1/2 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  sortOrder === 'desc'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Newest First (Desc)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official A4 Statement Printable Sheet */}
      <div
        id="printable-ledger-report"
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Printable Header */}
        <div className="border-b-2 border-slate-900 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 print:text-black" />
                <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900">
                  {userProfile.companyName}
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">{userProfile.companyAddress}</p>
              <p className="text-xs text-slate-500">
                Contact: {userProfile.companyPhone} · Email: {userProfile.email}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded print:bg-black">
                GENERAL ACCOUNT LEDGER
              </span>
              <div className="mt-2 text-xs font-mono text-slate-500">
                Period: <span className="font-semibold text-slate-900">{fromDate}</span> to{' '}
                <span className="font-semibold text-slate-900">{toDate}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Account Meta Box with prominent Customer Contact in heading */}
        {selectedAccount && (
          <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 print:bg-white print:border-slate-300 text-xs">
            {/* Main Customer Header Line with Contact Number */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 print:border-slate-300">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono font-bold text-xs sm:text-sm bg-blue-100 text-blue-900 px-2.5 py-1 rounded-md border border-blue-200 print:bg-slate-100 print:text-black print:border-slate-400">
                  {selectedAccount.code}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedAccount.name}
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  {selectedAccount.category}
                </span>
              </div>

              {/* Dedicated Customer Contact in Heading */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 print:border-slate-300 shadow-2xs">
                <Phone className="w-3.5 h-3.5 text-blue-600 print:text-black shrink-0" />
                <span className="text-xs text-slate-600 font-medium">Customer Contact:</span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {selectedAccount.contact || 'N/A'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block text-[11px]">Account Code:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedAccount.code}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Customer / Account Name:</span>
                <span className="font-semibold text-slate-900">{selectedAccount.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Customer Contact No:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedAccount.contact || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Location / City:</span>
                <span className="text-slate-700 truncate block">
                  {selectedAccount.location || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Overdue Invoices Alert Banner when viewing Customer Account */}
        {selectedAccount.category === 'Customer' && customerOverdueInvoices.length > 0 && (
          <div className="mx-4 sm:mx-6 my-4 p-4 rounded-xl bg-rose-50 border-2 border-rose-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center animate-pulse shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                    Overdue Invoices Alert ({customerOverdueInvoices.length} Invoices Pending)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                    15 DAYS EXPIRED
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Is customer ki 15-day credit terms complete ho chuki hain aur payment pending hai. Neechay ledger me ye invoice red color se blinking aur highlight show ho rahi hai.
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right shrink-0 bg-white/90 sm:bg-transparent px-3 py-1.5 rounded-lg border sm:border-0 border-rose-200">
              <span className="text-[10px] text-rose-600 uppercase font-bold block">Total Overdue Invoices</span>
              <span className="text-sm font-mono font-extrabold text-rose-950">
                PKR {formatCurrency(customerOverdueInvoices.reduce((sum, item) => sum + Number(item.invoice.amount || 0), 0))}
              </span>
            </div>
          </div>
        )}

        {/* Ledger Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 print:border-slate-400">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase font-semibold text-[11px] print:bg-slate-200">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24">Date</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-44 whitespace-nowrap">Voucher No / Invoice No</th>
                <th className="py-2.5 px-3 border-r border-slate-200">Description / Particulars</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Debit (PKR)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 text-right w-28">Credit (PKR)</th>
                <th className="py-2.5 px-3 text-right w-32 border-r border-slate-200">Running Balance (PKR)</th>
                <th className="py-2.5 px-3 text-center w-20 no-print">Action / ترمیم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Opening Balance Row */}
              <tr className="bg-slate-50/50 font-semibold text-slate-800">
                <td className="py-2.5 px-3 font-mono border-r border-slate-200">{fromDate}</td>
                <td className="py-2.5 px-3 font-mono text-slate-500 border-r border-slate-200">OPN-BAL</td>
                <td className="py-2.5 px-3 border-r border-slate-200 italic">
                  Opening Balance Brought Forward
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">
                  {ledgerData.openingBalance > 0
                    ? `PKR ${formatCurrency(ledgerData.openingBalance)}`
                    : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200">
                  {ledgerData.openingBalance < 0
                    ? `PKR ${formatCurrency(Math.abs(ledgerData.openingBalance))}`
                    : '—'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums border-r border-slate-200">
                  <span>PKR ${formatCurrency(Math.abs(ledgerData.openingBalance))}</span>
                  <span
                    className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                      ledgerData.openingBalance < 0
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-blue-50 text-blue-800 border-blue-300'
                    }`}
                  >
                    {ledgerData.openingBalance < 0 ? 'Cr' : 'Dr'}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center no-print">
                  {onSaveAccount && (
                    <button
                      type="button"
                      onClick={handleOpenEditOpeningBalanceModal}
                      className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 transition-colors text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Edit Opening Balance / ابتدائی بیلنس میں ترمیم کریں"
                    >
                      <Pencil className="w-2.5 h-2.5 text-amber-600" />
                      <span>Edit</span>
                    </button>
                  )}
                </td>
              </tr>

              {/* Transactions */}
              {ledgerData.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                    No transactions recorded for this account during the selected date period.
                  </td>
                </tr>
              ) : (
                ledgerData.entries.map((entry) => {
                  // Identify if this transaction entry corresponds to an overdue invoice
                  const matchedInv = invoices.find(
                    (inv) =>
                      selectedAccount?.category === 'Customer' &&
                      inv.customerId === selectedAccount?.id &&
                      (inv.invoiceNo === entry.voucherNo || inv.id === entry.id)
                  );
                  const dueStatus = matchedInv ? getInvoiceDueStatus(matchedInv, SYSTEM_TODAY) : null;
                  const isOverdue = dueStatus ? dueStatus.isOverdue : false;
                  const isDueSoon = dueStatus ? dueStatus.isDueSoon : false;

                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/95 hover:bg-rose-100/90 border-l-4 border-l-rose-600'
                          : isDueSoon
                          ? 'bg-amber-50/60 hover:bg-amber-100/60 border-l-4 border-l-amber-500'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap border-r border-slate-200">
                        {entry.date}
                      </td>
                      <td className={`py-2.5 px-3 font-mono border-r border-slate-200 whitespace-nowrap ${isOverdue ? 'bg-rose-100/50' : ''}`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${isOverdue ? 'text-rose-950 text-xs' : 'text-slate-900 font-medium'}`}>
                              {entry.voucherNo}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                OVERDUE (Pending)
                              </span>
                            )}
                            {!isOverdue && isDueSoon && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                                DUE SOON
                              </span>
                            )}
                          </div>
                          {dueStatus && (
                            <div className={`text-[10px] font-mono ${isOverdue ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                              {isOverdue
                                ? `15-Days Expired (${dueStatus.daysOverdue}d overdue · Due: ${dueStatus.dueDate})`
                                : `Due Date: ${dueStatus.dueDate} (${dueStatus.daysRemaining}d left)`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                        <div className={`font-medium ${isOverdue ? 'text-rose-950 font-bold' : 'text-slate-900'}`}>
                          {entry.description}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            {entry.type}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-200/90 px-1.5 py-0.2 rounded border border-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              Customer Pending Clearance
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono tabular-nums border-r border-slate-200 ${isOverdue ? 'text-rose-900 font-bold bg-rose-50/50' : 'text-slate-900'}`}>
                        {entry.debit > 0 ? `PKR ${formatCurrency(entry.debit)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 border-r border-slate-200">
                        {entry.credit > 0 ? `PKR ${formatCurrency(entry.credit)}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900 border-r border-slate-200">
                        <span>PKR ${formatCurrency(Math.abs(entry.balance))}</span>
                        <span
                          className={`ml-1 text-[9px] px-1 py-0.2 rounded font-bold border ${
                            entry.balance < 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {entry.balance < 0 ? 'Cr' : 'Dr'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center no-print whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(entry)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 transition-all text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Edit Entry / انٹری میں تاریخ، تفصیل، واؤچر نمبر یا رقم تبدیل کریں"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Footer Row */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-slate-200">
              <tr>
                <td colSpan={3} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] border-r border-slate-300">
                  Total Period Movement & Closing Balance:
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-blue-900">
                  PKR {formatCurrency(ledgerData.totalDebit)}
                </td>
                <td className="py-3 px-3 text-right font-mono tabular-nums border-r border-slate-300 text-emerald-900">
                  PKR {formatCurrency(ledgerData.totalCredit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm tabular-nums text-slate-900 border-r border-slate-300">
                  <span>PKR {formatCurrency(Math.abs(ledgerData.closingBalance))}</span>
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded font-bold border ${
                      ledgerData.closingBalance < 0
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}
                  >
                    {ledgerData.closingBalance < 0 ? 'CR' : 'DR'}
                  </span>
                </td>
                <td className="py-3 px-3 no-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Closing Summary Strip */}
        <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:bg-white print:border-slate-300">
          <div className="text-slate-600">
            Net Movement in Period:{' '}
            <span className="font-mono font-bold text-slate-900">
              {ledgerData.totalDebit - ledgerData.totalCredit >= 0 ? '+' : ''}PKR{' '}
              {formatCurrency(ledgerData.totalDebit - ledgerData.totalCredit)}
            </span>
          </div>
          <div className="text-slate-900 font-bold text-sm sm:text-base flex items-center">
            <span className="font-mono font-bold text-slate-900 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs print:border-none print:p-0 print:text-black">
              : Closing Balance : PKR {formatCurrency(Math.abs(ledgerData.closingBalance))} {ledgerData.closingBalance < 0 ? 'CR' : ledgerData.closingBalance > 0 ? 'DR' : '0.00'}
            </span>
          </div>
        </div>

        {/* Audit Signatures */}
        <div className="pt-14 flex items-center justify-between text-xs text-slate-500">
          <div className="text-center w-48">
            <div className="border-t border-slate-400 pt-2 font-medium text-slate-800">
              Prepared By (Accountant)
            </div>
            <span className="text-[10px] text-slate-400">{userProfile.name}</span>
          </div>
          <div className="text-center w-48">
            <div className="border-t border-slate-400 pt-2 font-medium text-slate-800">
              Audited & Approved By
            </div>
            <span className="text-[10px] text-slate-400">Finance Controller</span>
          </div>
        </div>
      </div>

      {/* Edit Ledger Entry Modal */}
      {isEditModalOpen && editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Edit Customer Ledger Entry / کھاتے کی انٹری میں ترمیم
                  </h3>
                  <p className="text-[11px] text-blue-200">
                    {selectedAccount?.name} ({selectedAccount?.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditedEntry} className="p-5 space-y-4">
              {/* Type Badge */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Entry Classification:</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  {editingEntry.type} ({editingEntry.debit > 0 ? 'Debit / ڈیبٹ' : 'Credit / کریڈٹ'})
                </span>
              </div>

              {/* Error Message if any */}
              {editFormError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Date & Voucher No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date / تاریخ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice / Voucher No (واؤچر نمبر) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.voucherNo}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, voucherNo: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. INV-2026-001 or REC-001"
                  />
                </div>
              </div>

              {/* Description / Particulars */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Particulars (تفصیل و نریشن)
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Enter details of transaction / goods sold / recovery narration..."
                />
              </div>

              {/* Amount (PKR) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount in PKR (رقم روپے میں) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">PKR</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editForm.amount || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))}
                    className="w-full pl-12 pr-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                {/* Words Preview */}
                <p className="text-[11px] text-slate-500 mt-1 italic font-medium">
                  {numberToWords(Number(editForm.amount) || 0)}
                </p>
              </div>

              {/* If it's a Recovery, allow editing payment method */}
              {(editingEntry.sourceType === 'recovery' || editingEntry.type.toLowerCase().includes('recovery')) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Payment Method (طریقہ ادائیگی)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'Cheque', 'Bank'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, paymentMethod: m }))}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          editForm.paymentMethod === m
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {editForm.paymentMethod === 'Cheque' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        value={editForm.chequeNo}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, chequeNo: e.target.value }))}
                        placeholder="Cheque No (چیک نمبر)"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                      />
                      <input
                        type="text"
                        value={editForm.chequeBank}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, chequeBank: e.target.value }))}
                        placeholder="Bank Name (بینک کا نام)"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel (منسوخ کریں)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes (تبدیلیاں محفوظ کریں)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Opening Balance Modal */}
      {isOpeningBalanceModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Edit Opening Balance / ابتدائی بیلنس میں ترمیم
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningBalanceModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningBalance} className="p-5 space-y-4">
              <div>
                <span className="text-xs text-slate-500 block mb-1">Account:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedAccount.name} ({selectedAccount.code})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Balance Amount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editOpeningBalAmount}
                  onChange={(e) => setEditOpeningBalAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  {numberToWords(Number(editOpeningBalAmount) || 0)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Balance Type (Dr / Cr)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditOpeningBalType('Dr')}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      editOpeningBalType === 'Dr'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Dr (Debit / واجب الوصول)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpeningBalType('Cr')}
                    className={`py-2 text-xs font-bold rounded-lg border cursor-pointer ${
                      editOpeningBalType === 'Cr'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Cr (Credit / ایڈوانس)
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningBalanceModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shadow-xs"
                >
                  Save Opening Balance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs py-2.5 px-4 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in duration-200 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
