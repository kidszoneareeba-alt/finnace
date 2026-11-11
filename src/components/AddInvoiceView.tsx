import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FilePlus2,
  Building,
  User,
  Trash2,
  ArrowRight,
  Clock,
  AlertTriangle,
  Receipt,
  DollarSign,
  ChevronDown,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { Account, CustomerInvoice } from '../types';
import {
  SYSTEM_TODAY,
  calculateInvoiceDueDate,
  getInvoiceDueStatus,
} from '../utils/accounting';
import { formatCurrency, numberToWords } from '../utils/numberToWords';

interface AddInvoiceViewProps {
  accounts: Account[];
  invoices: CustomerInvoice[];
  onSaveInvoice: (invoice: CustomerInvoice) => boolean;
  onSaveMultipleInvoices?: (invoices: CustomerInvoice[]) => boolean;
  onDeleteInvoice: (id: string) => boolean;
  onViewLedger?: (account: Account) => void;
  onNavigateToRecovery?: (customerId: string) => void;
}

interface ParsedBulkInvoice {
  tempId: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  amount: number;
  description: string;
  isMatched: boolean;
  rawCustomerInput?: string;
  warning?: string;
}

export const AddInvoiceView: React.FC<AddInvoiceViewProps> = ({
  accounts,
  invoices,
  onSaveInvoice,
  onSaveMultipleInvoices,
  onDeleteInvoice,
  onViewLedger,
  onNavigateToRecovery,
}) => {
  // 1. Single Form Inputs State
  const [date, setDate] = useState(SYSTEM_TODAY);
  const [customerId, setCustomerId] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Auto-suggest next invoice number
  const suggestedInvoiceNo = useMemo(() => {
    const year = new Date().getFullYear();
    const count = invoices.length + 401;
    return `INV-${year}-${count}`;
  }, [invoices.length]);

  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // 2. Excel Bulk Upload State
  const [parsedBulkInvoices, setParsedBulkInvoices] = useState<ParsedBulkInvoice[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dueSoon' | 'overdue'>('all');

  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for customer dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter only Customer category accounts
  const customerAccounts = useMemo(() => {
    return accounts.filter((a) => a.category === 'Customer');
  }, [accounts]);

  const filteredCustomerAccounts = useMemo(() => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return customerAccounts;
    return customerAccounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.location && a.location.toLowerCase().includes(q)) ||
        (a.contact && a.contact.toLowerCase().includes(q))
    );
  }, [customerAccounts, customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    return customerAccounts.find((a) => a.id === customerId);
  }, [customerAccounts, customerId]);

  // Computed 15-day due date from entry date
  const calculatedDueDate = useMemo(() => {
    return calculateInvoiceDueDate(date, 15);
  }, [date]);

  const resetForm = () => {
    setDate(SYSTEM_TODAY);
    setCustomerId('');
    setCustomerSearchQuery('');
    setInvoiceNo('');
    setAmount('');
    setDescription('');
    setErrorMessage('');
  };

  // Helper to parse dates from Excel (handles numeric serial dates and string formats)
  const parseExcelDate = (val: any, fallbackDate: string): string => {
    if (!val) return fallbackDate;
    if (typeof val === 'number') {
      const utcDays = Math.floor(val - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      if (!isNaN(dateInfo.getTime())) {
        return dateInfo.toISOString().split('T')[0];
      }
    }
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const parts = str.split(/[/.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return fallbackDate;
  };

  // Helper to match customer by code or name
  const matchCustomer = (codeVal?: string, nameVal?: string): Account | undefined => {
    const cleanCode = String(codeVal || '').trim().toLowerCase();
    const cleanName = String(nameVal || '').trim().toLowerCase();

    if (cleanCode) {
      const byCode = customerAccounts.find(
        (c) =>
          c.code.toLowerCase() === cleanCode ||
          c.code.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanCode.replace(/[^a-z0-9]/g, '')
      );
      if (byCode) return byCode;
    }

    if (cleanName) {
      const byExactName = customerAccounts.find(
        (c) => c.name.toLowerCase() === cleanName
      );
      if (byExactName) return byExactName;

      const byPartial = customerAccounts.find(
        (c) =>
          c.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(c.name.toLowerCase())
      );
      if (byPartial) return byPartial;
    }

    return undefined;
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      {
        'Customer Code': customerAccounts[0]?.code || 'CUST-001',
        'Customer Name': customerAccounts[0]?.name || 'Haji Aslam & Sons (Lahore)',
        'Invoice No': 'INV-2026-501',
        'Date': SYSTEM_TODAY,
        'Amount': 85000,
        'Description': 'Construction materials order dispatch',
        'Due Date': calculateInvoiceDueDate(SYSTEM_TODAY, 15),
      },
      {
        'Customer Code': customerAccounts[1]?.code || 'CUST-002',
        'Customer Name': customerAccounts[1]?.name || 'Malik Traders (Multan)',
        'Invoice No': 'INV-2026-502',
        'Date': SYSTEM_TODAY,
        'Amount': 140000,
        'Description': 'Wiring and electrical fittings dispatch',
        'Due Date': calculateInvoiceDueDate(SYSTEM_TODAY, 15),
      },
      {
        'Customer Code': customerAccounts[2]?.code || 'CUST-003',
        'Customer Name': customerAccounts[2]?.name || 'Chaudhry Building Material (Gujranwala)',
        'Invoice No': 'INV-2026-503',
        'Date': SYSTEM_TODAY,
        'Amount': 62000,
        'Description': 'Hardware fixtures supply',
        'Due Date': calculateInvoiceDueDate(SYSTEM_TODAY, 15),
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, 'Ejaz_Bulk_Invoices_Sample.xlsx');
  };

  // Parse Uploaded Excel / CSV File
  const handleProcessExcelFile = (file: File) => {
    if (!file) return;
    setIsBulkProcessing(true);
    setErrorMessage('');
    setBulkFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setErrorMessage('The uploaded Excel file does not contain any sheets.');
          setIsBulkProcessing(false);
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          setErrorMessage('The uploaded Excel sheet is empty. Please add rows with invoices.');
          setIsBulkProcessing(false);
          return;
        }

        const parsed: ParsedBulkInvoice[] = [];
        let autoInvCounter = invoices.length + 501;

        jsonRows.forEach((row, index) => {
          // Normalize row keys
          const normalized: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = row[k];
          });

          // Extract fields
          const codeVal =
            normalized['customercode'] ||
            normalized['code'] ||
            normalized['custcode'] ||
            normalized['accountcode'] ||
            '';

          const nameVal =
            normalized['customername'] ||
            normalized['customer'] ||
            normalized['name'] ||
            normalized['client'] ||
            '';

          const invNoVal =
            normalized['invoiceno'] ||
            normalized['invoicenumber'] ||
            normalized['invoice'] ||
            normalized['billno'] ||
            normalized['billnumber'] ||
            '';

          const dateVal =
            normalized['date'] ||
            normalized['invoicedate'] ||
            normalized['billdate'] ||
            '';

          const amountVal =
            normalized['amount'] ||
            normalized['netamount'] ||
            normalized['total'] ||
            normalized['totalamount'] ||
            normalized['pkr'] ||
            normalized['rs'] ||
            0;

          const descVal =
            normalized['description'] ||
            normalized['particulars'] ||
            normalized['remarks'] ||
            normalized['item'] ||
            normalized['narration'] ||
            '';

          const rawAmount = String(amountVal).replace(/[^0-9.-]/g, '');
          const numAmount = parseFloat(rawAmount) || 0;

          const parsedDate = parseExcelDate(dateVal, SYSTEM_TODAY);
          const computedDue = calculateInvoiceDueDate(parsedDate, 15);

          // Customer matching
          const matchedCust = matchCustomer(codeVal, nameVal);
          const finalInvoiceNo = String(invNoVal).trim() || `INV-${new Date().getFullYear()}-${autoInvCounter++}`;

          parsed.push({
            tempId: `bulk_inv_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            invoiceNo: finalInvoiceNo,
            date: parsedDate,
            dueDate: computedDue,
            customerId: matchedCust ? matchedCust.id : (customerAccounts[0]?.id || ''),
            customerCode: matchedCust ? matchedCust.code : (codeVal || customerAccounts[0]?.code || 'CUST'),
            customerName: matchedCust ? matchedCust.name : (nameVal || customerAccounts[0]?.name || 'Unknown Customer'),
            amount: numAmount,
            description: String(descVal).trim() || 'Sales Invoice Dispatch (Bulk Excel)',
            isMatched: Boolean(matchedCust),
            rawCustomerInput: `${codeVal} ${nameVal}`.trim(),
            warning: numAmount <= 0 ? 'Amount must be greater than 0' : undefined,
          });
        });

        setParsedBulkInvoices(parsed);
        setIsBulkProcessing(false);
      } catch (err: any) {
        console.error('Error reading Excel file:', err);
        setErrorMessage(`Failed to read Excel file: ${err?.message || 'Invalid format'}`);
        setIsBulkProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Error reading uploaded file.');
      setIsBulkProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Bulk File Selection Handlers
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessExcelFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessExcelFile(file);
    }
  };

  // Update specific row customer
  const handleBulkRowCustomerChange = (tempId: string, newCustId: string) => {
    const cust = customerAccounts.find((c) => c.id === newCustId);
    if (!cust) return;

    setParsedBulkInvoices((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              customerId: cust.id,
              customerCode: cust.code,
              customerName: cust.name,
              isMatched: true,
            }
          : item
      )
    );
  };

  // Delete row from parsed list
  const handleRemoveParsedRow = (tempId: string) => {
    setParsedBulkInvoices((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Save All Invoices in one click
  const handleSaveAllBulkInvoices = () => {
    if (parsedBulkInvoices.length === 0) return;

    const invalidRow = parsedBulkInvoices.find((i) => i.amount <= 0 || !i.customerId);
    if (invalidRow) {
      setErrorMessage(
        `Cannot save: Invoice #${invalidRow.invoiceNo} has invalid amount or missing customer.`
      );
      return;
    }

    const invoicesToSave: CustomerInvoice[] = parsedBulkInvoices.map((item) => ({
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceNo: item.invoiceNo,
      date: item.date,
      dueDate: item.dueDate,
      customerId: item.customerId,
      customerCode: item.customerCode,
      customerName: item.customerName,
      amount: item.amount,
      description: item.description,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    }));

    if (onSaveMultipleInvoices) {
      onSaveMultipleInvoices(invoicesToSave);
    } else {
      invoicesToSave.forEach((inv) => onSaveInvoice(inv));
    }

    // Trigger celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    const totalBulkAmount = invoicesToSave.reduce((sum, inv) => sum + inv.amount, 0);
    setSuccessMessage(
      `🎉 All ${invoicesToSave.length} invoices successfully imported & saved! Total PKR ${formatCurrency(totalBulkAmount)} debited to customer accounts with 15-day due terms.`
    );

    // Clear bulk preview
    setParsedBulkInvoices([]);
    setBulkFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => setSuccessMessage(''), 8000);
  };

  // Single Manual Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!date) {
      setErrorMessage('Please select a valid invoice date.');
      return;
    }

    if (!selectedCustomer) {
      setErrorMessage('Please search and select a customer account (by Code or Name).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid invoice net amount greater than zero.');
      return;
    }

    const finalInvoiceNo = invoiceNo.trim() || suggestedInvoiceNo;

    // Check duplicate invoice number
    const isDuplicate = invoices.some(
      (inv) => inv.invoiceNo.toLowerCase() === finalInvoiceNo.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMessage(`Invoice number "${finalInvoiceNo}" already exists. Please use a unique invoice number.`);
      return;
    }

    const dueDate = calculateInvoiceDueDate(date, 15);

    const newInvoice: CustomerInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNo: finalInvoiceNo,
      date,
      dueDate,
      customerId: selectedCustomer.id,
      customerCode: selectedCustomer.code,
      customerName: selectedCustomer.name,
      amount: numAmount,
      description: description.trim() || 'Sales Invoice Dispatch',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    const saved = onSaveInvoice(newInvoice);
    if (saved) {
      setSuccessMessage(
        `Invoice ${finalInvoiceNo} saved successfully! PKR ${formatCurrency(numAmount)} has been debited (DR) to ${selectedCustomer.code} - ${selectedCustomer.name}. Payment due date: ${dueDate} (15 Days).`
      );
      resetForm();
      setTimeout(() => setSuccessMessage(''), 6000);
    }
  };

  const handleDelete = (inv: CustomerInvoice) => {
    if (confirm(`Void and delete customer invoice ${inv.invoiceNo} (PKR ${formatCurrency(inv.amount)})?`)) {
      onDeleteInvoice(inv.id);
      setSuccessMessage(`Invoice ${inv.invoiceNo} has been deleted.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // Filtered invoices history
  const filteredInvoices = useMemo(() => {
    const q = historySearchQuery.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchQ =
        !q ||
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerCode.toLowerCase().includes(q) ||
        inv.description.toLowerCase().includes(q) ||
        inv.date.includes(q);

      if (!matchQ) return false;

      const dueStatus = getInvoiceDueStatus(inv, SYSTEM_TODAY);
      if (statusFilter === 'dueSoon' && !dueStatus.isDueSoon) return false;
      if (statusFilter === 'overdue' && !dueStatus.isOverdue) return false;

      return true;
    });
  }, [invoices, historySearchQuery, statusFilter]);

  // Overall Invoice Statistics
  const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const overdueCount = invoices.filter((inv) => getInvoiceDueStatus(inv, SYSTEM_TODAY).isOverdue).length;
  const dueSoonCount = invoices.filter((inv) => getInvoiceDueStatus(inv, SYSTEM_TODAY).isDueSoon).length;

  // Bulk stats
  const totalParsedAmount = parsedBulkInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const matchedCount = parsedBulkInvoices.filter((i) => i.isMatched).length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <FilePlus2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Add Customer Sales Invoices
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  کسٹمر سیلز انوائس اینٹری — ایکسل فائل کے ذریعے بلک امپورٹ کریں یا دستی انوائس درج کریں
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 font-semibold font-mono">
              Total Invoices: PKR {formatCurrency(totalInvoicedAmount)}
            </div>
            {dueSoonCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-bold flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{dueSoonCount} Due Soon (2 Days)</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>{overdueCount} Overdue (15+ Days)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold leading-relaxed">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-bold leading-relaxed">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-rose-700 hover:text-rose-900 font-bold cursor-pointer text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXCEL BULK INVOICE UPLOAD & AUTO-ENTRY SECTION (TOP FEATURED OPTION)   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-md border-2 border-emerald-500/70 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase bg-emerald-400 text-slate-950">
                  EXCEL BULK IMPORT · ایکسل امپورٹ
                </span>
                <span className="text-[11px] font-mono text-emerald-200 font-semibold">
                  Auto-Entry for Multiple Customers
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                Bulk Import Invoices via Excel File (ایکسل فائل کے ذریعے تمام انوائسز خودکار اندراج)
              </h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Upload an Excel/CSV file with bulk invoices. All invoices will auto-populate with customer matching, and you can save all of them at once with a single click.
              </p>
            </div>
          </div>

          {/* Download Sample Template */}
          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-emerald-400/50 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs hover:scale-102"
            title="Download ready-to-use Excel sample file"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Download Sample Excel Template (سیمپل فائل)</span>
          </button>
        </div>

        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer relative overflow-hidden ${
            isDragging
              ? 'border-emerald-300 bg-emerald-800/40 scale-[1.01]'
              : 'border-emerald-500/50 hover:border-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/60'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center shadow-inner">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-white">
                Click to browse or drag & drop your Excel file here
              </p>
              <p className="text-xs text-emerald-200/80 mt-1">
                Supports <strong className="text-white">.xlsx, .xls, and .csv</strong> files with columns: Customer Code, Name, Invoice No, Date, Amount, Description
              </p>
            </div>

            {bulkFileName && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-xs font-bold shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Uploaded: {bulkFileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* PARSED BULK INVOICES PREVIEW & CONFIRMATION */}
        {parsedBulkInvoices.length > 0 && (
          <div className="bg-slate-950/90 rounded-2xl border-2 border-emerald-400 p-4 sm:p-5 space-y-4 animate-in fade-in duration-300 shadow-xl">
            {/* Summary Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 font-mono text-xs font-black uppercase">
                  ✓ {parsedBulkInvoices.length} Invoices Detected
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Total Amount: <strong className="text-emerald-300 text-sm">PKR {formatCurrency(totalParsedAmount)}</strong>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({matchedCount} of {parsedBulkInvoices.length} Customers Matched)
                </span>
              </div>

              {/* Action Buttons: Save All Invoices or Cancel */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveAllBulkInvoices}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer hover:scale-102"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Save All {parsedBulkInvoices.length} Invoices (تمام انوائسز ایک کلک میں محفوظ کریں)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParsedBulkInvoices([]);
                    setBulkFileName('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                >
                  Clear / Cancel
                </button>
              </div>
            </div>

            {/* Invoices Preview Table */}
            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3 w-28">Date</th>
                    <th className="py-2.5 px-3 w-32">Invoice #</th>
                    <th className="py-2.5 px-3">Target Customer (Account)</th>
                    <th className="py-2.5 px-3 text-right w-36 text-emerald-300">Net Amount</th>
                    <th className="py-2.5 px-3 w-32">Due Date (15d)</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center w-20">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-sans">
                  {parsedBulkInvoices.map((item, idx) => (
                    <tr key={item.tempId} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap text-slate-300">
                        {item.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                        {item.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-950 bg-emerald-400 px-1.5 py-0.2 rounded text-[10px]">
                            {item.customerCode}
                          </span>
                          <span className="font-bold text-white">{item.customerName}</span>
                          {!item.isMatched && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                              Auto-Fallback
                            </span>
                          )}
                        </div>
                        {/* Selector if user wants to change customer */}
                        <div className="mt-1">
                          <select
                            value={item.customerId}
                            onChange={(e) => handleBulkRowCustomerChange(item.tempId, e.target.value)}
                            className="text-[11px] bg-slate-900 text-slate-300 border border-slate-700 rounded px-1.5 py-0.5 focus:outline-hidden focus:border-emerald-500"
                          >
                            {customerAccounts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code} - {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 tabular-nums whitespace-nowrap text-sm">
                        PKR {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {item.dueDate}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">
                        {item.description}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveParsedRow(item.tempId)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Remove this invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Final Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-slate-400">
                Ready to save. Each invoice will be debited (DR) to the respective customer ledger with 15-day due date tracking.
              </span>
              <button
                type="button"
                onClick={handleSaveAllBulkInvoices}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save All Invoices (تمام انوائسز محفوظ کریں) →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SINGLE MANUAL INVOICE CREATION FORM                                    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Manual Single Invoice Entry (دستی سنگل انوائس اینٹری)
              </h2>
              <span className="text-[11px] text-slate-500">
                Debits amount (DR) directly to customer ledger
              </span>
            </div>
          </div>

          {/* 15 Days Payment Terms Badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Standard Terms: 15 Days Credit</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. INVOICE ENTRY DATE */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>1. Invoice Date</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                انوائس کے اندراج کی تاریخ (Due date خود بخود اس سے 15 دن آگے مقرر ہوگی)
              </p>
            </div>

            {/* 2. CUSTOMER SELECTION (Code or Name) */}
            <div className="relative" ref={customerDropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>2. Select Customer (Code or Name)</span> <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={
                    selectedCustomer
                      ? `${selectedCustomer.code} - ${selectedCustomer.name}`
                      : customerSearchQuery
                  }
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    if (selectedCustomer) {
                      setCustomerId('');
                    }
                    setIsCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setIsCustomerDropdownOpen(true)}
                  placeholder="Search customer code (e.g. CUST-101) or name..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium shadow-2xs"
                />
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerId('');
                      setCustomerSearchQuery('');
                      setIsCustomerDropdownOpen(true);
                    }}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Customer Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 max-h-56 bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto z-30 divide-y divide-slate-100">
                  {filteredCustomerAccounts.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center italic">
                      No customer accounts found matching "{customerSearchQuery}"
                    </div>
                  ) : (
                    filteredCustomerAccounts.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => {
                          setCustomerId(cust.id);
                          setCustomerSearchQuery('');
                          setIsCustomerDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 text-xs hover:bg-blue-50/70 transition-colors flex items-center justify-between cursor-pointer ${
                          selectedCustomer?.id === cust.id ? 'bg-blue-100/60 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            <span className="font-mono text-blue-700 font-bold mr-1.5">
                              {cust.code}
                            </span>
                            <span>{cust.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {cust.location ? `${cust.location} · ` : ''}Contact: {cust.contact || 'N/A'}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          Select
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected Customer Card */}
              {selectedCustomer && (
                <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{selectedCustomer.name}</span>
                    <div className="text-[11px] text-slate-600">
                      Code: <strong className="font-mono text-blue-800">{selectedCustomer.code}</strong>
                      {selectedCustomer.location ? ` · ${selectedCustomer.location}` : ''}
                      {selectedCustomer.contact ? ` · ${selectedCustomer.contact}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 uppercase">
                    Customer
                  </span>
                </div>
              )}
            </div>

            {/* 3. INVOICE NO */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>3. Invoice No</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder={`e.g. ${suggestedInvoiceNo} (or custom manual bill #)`}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                انوائس نمبر درج کریں (خالی چھوڑنے پر خودکار نمبر تفویض ہوگا)
              </p>
            </div>

            {/* 4. TOTAL NET AMOUNT */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>4. Total Net Amount (PKR ₨)</span> <span className="text-rose-500">*</span>
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
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
              {parseFloat(amount) > 0 && (
                <p className="text-[11px] text-blue-900 font-medium mt-1">
                  {numberToWords(parseFloat(amount))}
                </p>
              )}
            </div>

            {/* 5. DESCRIPTION / PARTICULARS */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                5. Description / Particulars
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Supply of construction supplies, 50 bags cement, wiring set dispatch"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>

          {/* 6. AUTOMATIC 15-DAYS DUE DATE PREVIEW BANNER */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Calculated Due Date (15 Days Standard Terms)
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">
                  {calculatedDueDate || 'Select invoice date'}
                </span>
                <span className="text-xs text-slate-300 ml-2">
                  (15 دن مکمل ہونے پر ڈیش بورڈ میں ڈیو الرٹ ظاہر ہوگا)
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block">Accounting Effect:</span>
              <span className="text-xs font-bold text-pink-400 font-mono">
                DEBIT (DR) TO CUSTOMER ACCOUNT
              </span>
            </div>
          </div>

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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Customer Invoice (Debit)</span>
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 4. AUDIT INVOICES JOURNAL & HISTORY                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Customer Invoices Journal & Due Status
            </h3>
            <p className="text-[11px] text-slate-500">
              Complete chronological ledger of all customer sales invoices with 15-day due tracking
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                All ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('dueSoon')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'dueSoon'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <span>Due Soon (2d)</span>
                <span className="font-mono text-[10px] bg-amber-100 text-amber-900 px-1 rounded-full">
                  {dueSoonCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('overdue')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'overdue'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                <span>Overdue (15d+)</span>
                <span className="font-mono text-[10px] bg-rose-100 text-rose-900 px-1 rounded-full">
                  {overdueCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search invoice #, customer name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-28">Invoice Date</th>
                <th className="py-3 px-4 w-32">Invoice #</th>
                <th className="py-3 px-4">Customer Account</th>
                <th className="py-3 px-4 w-40">Due Date (15d)</th>
                <th className="py-3 px-4 text-right w-32">Net Amount (PKR)</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customer invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const dueStatus = getInvoiceDueStatus(inv, SYSTEM_TODAY);
                  const customerAcc = accounts.find((a) => a.id === inv.customerId);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {inv.date}
                      </td>

                      {/* Invoice # */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="font-mono text-blue-700 font-bold">
                              {inv.customerCode}
                            </span>
                            <span>{inv.customerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-sm mt-0.5">
                            {inv.description}
                          </div>
                        </div>
                      </td>

                      {/* Due Date & Status Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div>
                          <span className="font-mono font-medium text-slate-800">
                            {dueStatus.dueDate}
                          </span>
                          <div className="mt-0.5">
                            {dueStatus.isOverdue ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                🚨 Overdue ({dueStatus.daysOverdue}d ago)
                              </span>
                            ) : dueStatus.isDueSoon ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                ⚠️ Due Soon ({dueStatus.daysRemaining}d left)
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {dueStatus.daysRemaining} days left
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap text-slate-900">
                        PKR {formatCurrency(Number(inv.amount))}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {customerAcc && onViewLedger && (
                            <button
                              type="button"
                              onClick={() => onViewLedger(customerAcc)}
                              title="View Customer Ledger"
                              className="px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                            >
                              Ledger
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(inv)}
                            title="Void Invoice"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
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
    </div>
  );
};
