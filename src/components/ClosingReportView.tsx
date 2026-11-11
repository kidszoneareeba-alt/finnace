import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Boxes,
  TrendingUp,
  Receipt,
  ArrowDownLeft,
  Calendar,
  Save,
  Printer,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Coins,
  Scale,
  RefreshCw,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  CustomerInvoice,
  CashTransaction,
  RecoveryEntry,
  UserProfile,
  MonthlyClosingReport,
  StockPurchaseItem,
} from '../types';
import { formatCurrency, numberToWords } from '../utils/numberToWords';
import { SYSTEM_TODAY } from '../utils/accounting';

interface ClosingReportViewProps {
  invoices: CustomerInvoice[];
  cashTxns: CashTransaction[];
  recoveries: RecoveryEntry[];
  userProfile: UserProfile;
  closingReports: MonthlyClosingReport[];
  openingStockBase: number;
  onSaveClosingReport: (report: MonthlyClosingReport) => void;
  onDeleteClosingReport: (reportId: string) => void;
  onUpdateOpeningStockBase: (amount: number) => void;
}

export const ClosingReportView: React.FC<ClosingReportViewProps> = ({
  invoices,
  cashTxns,
  recoveries,
  userProfile,
  closingReports,
  openingStockBase,
  onSaveClosingReport,
  onDeleteClosingReport,
  onUpdateOpeningStockBase,
}) => {
  // Current active month selection (Default to current month from system date, e.g. "2026-11")
  const defaultMonthYear = useMemo(() => {
    return SYSTEM_TODAY.slice(0, 7) || '2026-11';
  }, []);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(defaultMonthYear);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Month labels generator
  const getMonthLabel = (my: string) => {
    try {
      const [year, month] = my.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return my;
    }
  };

  // Find if this month already has a saved closing report
  const existingSavedReport = useMemo(() => {
    return closingReports.find((r) => r.monthYear === selectedMonthYear);
  }, [closingReports, selectedMonthYear]);

  // Derive previous month's closing stock to suggest as default Opening Stock
  const previousMonthClosingStock = useMemo(() => {
    try {
      const [yearStr, monthStr] = selectedMonthYear.split('-');
      let year = Number(yearStr);
      let month = Number(monthStr) - 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      const prevKey = `${year}-${String(month).padStart(2, '0')}`;
      const prevReport = closingReports.find((r) => r.monthYear === prevKey);
      return prevReport ? prevReport.closingStock : null;
    } catch {
      return null;
    }
  }, [selectedMonthYear, closingReports]);

  // Form states for the currently selected month
  const [openingStock, setOpeningStock] = useState<number>(() => {
    if (existingSavedReport) return existingSavedReport.openingStock;
    return previousMonthClosingStock ?? openingStockBase;
  });

  // Track itemized stock purchases
  const [purchasesList, setPurchasesList] = useState<StockPurchaseItem[]>(() => {
    if (existingSavedReport?.purchasesList) return existingSavedReport.purchasesList;
    return [
      {
        id: 'p_init_01',
        date: `${selectedMonthYear}-04`,
        supplierName: 'Pak Industrial Supplies Co. (لاہور سپلائر)',
        billNo: 'INV-4821',
        amount: 380000,
        description: 'New hardware stock & raw goods',
      },
      {
        id: 'p_init_02',
        date: `${selectedMonthYear}-14`,
        supplierName: 'National Steel & Tooling Corporation',
        billNo: 'BL-9034',
        amount: 270000,
        description: 'Batch structural tools & supplies',
      },
    ];
  });

  // Direct manual stock purchase input (if not itemizing)
  const [manualStockPurchases, setManualStockPurchases] = useState<number>(() => {
    if (existingSavedReport) return existingSavedReport.stockPurchases;
    return 650000;
  });
  const [isItemizedPurchases, setIsItemizedPurchases] = useState<boolean>(true);

  // New purchase entry form modal/row state
  const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');
  const [newPurchaseBillNo, setNewPurchaseBillNo] = useState('');
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(SYSTEM_TODAY);
  const [newPurchaseDesc, setNewPurchaseDesc] = useState('');

  // Auto-calculated system sales and recoveries in this month
  const systemMonthInvoices = useMemo(() => {
    return invoices.filter((i) => i.date.startsWith(selectedMonthYear));
  }, [invoices, selectedMonthYear]);

  const autoSystemSales = useMemo(() => {
    return systemMonthInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [systemMonthInvoices]);

  const [customSalesAmount, setCustomSalesAmount] = useState<number>(() => {
    if (existingSavedReport) return existingSavedReport.totalSales;
    return autoSystemSales || 1595000;
  });
  const [useAutoSales, setUseAutoSales] = useState<boolean>(true);

  const effectiveSales = useAutoSales && autoSystemSales > 0 ? autoSystemSales : customSalesAmount;

  // Month recoveries collected
  const systemMonthRecoveries = useMemo(() => {
    return recoveries.filter((r) => r.date.startsWith(selectedMonthYear));
  }, [recoveries, selectedMonthYear]);

  const monthRecoveriesAmount = useMemo(() => {
    return systemMonthRecoveries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [systemMonthRecoveries]);

  // Auto-calculated office/operating expenses in this month
  const autoSystemExpenses = useMemo(() => {
    return cashTxns
      .filter((t) => t.date.startsWith(selectedMonthYear))
      .filter(
        (t) =>
          t.type === 'Cash Paid' &&
          (t.accountCategory === 'Office Expense' ||
            t.accountCategory === 'Personal' ||
            t.debitAccountCategory === 'Office Expense')
      )
      .reduce((sum, t) => sum + Number(t.amount || t.creditAmount || 0), 0);
  }, [cashTxns, selectedMonthYear]);

  const [customExpensesAmount, setCustomExpensesAmount] = useState<number>(() => {
    if (existingSavedReport) return existingSavedReport.operatingExpenses;
    return autoSystemExpenses || 120000;
  });
  const [useAutoExpenses, setUseAutoExpenses] = useState<boolean>(true);

  const effectiveExpenses = useAutoExpenses && autoSystemExpenses > 0 ? autoSystemExpenses : customExpensesAmount;

  // Month-end physical Closing Stock input
  const [closingStockInput, setClosingStockInput] = useState<number>(() => {
    if (existingSavedReport) return existingSavedReport.closingStock;
    return 1350000; // Realistic default
  });

  const [notes, setNotes] = useState<string>(() => existingSavedReport?.notes || '');

  // Update form fields when month selector changes
  const handleSelectMonth = (my: string) => {
    setSelectedMonthYear(my);
    const rep = closingReports.find((r) => r.monthYear === my);
    if (rep) {
      setOpeningStock(rep.openingStock);
      setManualStockPurchases(rep.stockPurchases);
      if (rep.purchasesList) setPurchasesList(rep.purchasesList);
      setCustomSalesAmount(rep.totalSales);
      setCustomExpensesAmount(rep.operatingExpenses);
      setClosingStockInput(rep.closingStock);
      setNotes(rep.notes || '');
    } else {
      // Look up previous month closing stock for rollover
      try {
        const [y, m] = my.split('-');
        let prevY = Number(y);
        let prevM = Number(m) - 1;
        if (prevM < 1) {
          prevM = 12;
          prevY -= 1;
        }
        const prevKey = `${prevY}-${String(prevM).padStart(2, '0')}`;
        const prevRep = closingReports.find((r) => r.monthYear === prevKey);
        if (prevRep) {
          setOpeningStock(prevRep.closingStock);
        } else {
          setOpeningStock(openingStockBase);
        }
      } catch {
        setOpeningStock(openingStockBase);
      }
    }
  };

  // Compute Total Purchases
  const effectivePurchases = useMemo(() => {
    if (isItemizedPurchases && purchasesList.length > 0) {
      return purchasesList.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }
    return manualStockPurchases;
  }, [isItemizedPurchases, purchasesList, manualStockPurchases]);

  // Core Financial Formula Calculations:
  // 1. Total Stock Available = Opening Stock + Stock Purchases
  const totalStockAvailable = Math.max(0, openingStock + effectivePurchases);

  // 2. Cost of Goods Sold (COGS) = Opening Stock + Purchases - Closing Stock
  // (In accounting: Available Stock - Remaining Closing Stock = Cost of Stock Sold)
  const costOfGoodsSold = Math.max(0, totalStockAvailable - closingStockInput);

  // 3. Gross Profit = Total Sales - COGS
  const grossProfit = effectiveSales - costOfGoodsSold;

  // 4. Net Profit = Gross Profit - Operating Expenses
  const netProfit = grossProfit - effectiveExpenses;

  // 5. Profit Margin % = (Net Profit / Total Sales) * 100
  const profitMarginPercentage = effectiveSales > 0 ? (netProfit / effectiveSales) * 100 : 0;

  // 6. Final Remaining Stock in Warehouse = Closing Stock
  const finalStockBalance = closingStockInput;

  // Add Itemized Stock Purchase
  const handleAddPurchaseItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newPurchaseAmount);
    if (!newPurchaseSupplier.trim() || isNaN(amt) || amt <= 0) {
      alert('Please enter a valid supplier name and purchase amount.');
      return;
    }

    const newItem: StockPurchaseItem = {
      id: `purch_${Date.now()}`,
      date: newPurchaseDate || SYSTEM_TODAY,
      supplierName: newPurchaseSupplier.trim(),
      billNo: newPurchaseBillNo.trim() || `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: amt,
      description: newPurchaseDesc.trim() || 'Stock purchase bill',
    };

    setPurchasesList((prev) => [newItem, ...prev]);
    setNewPurchaseSupplier('');
    setNewPurchaseBillNo('');
    setNewPurchaseAmount('');
    setNewPurchaseDesc('');
  };

  const handleDeletePurchaseItem = (id: string) => {
    setPurchasesList((prev) => prev.filter((p) => p.id !== id));
  };

  // Finalize and save the monthly closing report
  const handleSaveClosing = () => {
    const report: MonthlyClosingReport = {
      id: existingSavedReport?.id || `close_${selectedMonthYear.replace('-', '_')}`,
      monthYear: selectedMonthYear,
      monthLabel: getMonthLabel(selectedMonthYear),
      closedAt: new Date().toISOString(),
      closedBy: userProfile.name,
      openingStock,
      stockPurchases: effectivePurchases,
      totalStockAvailable,
      closingStock: closingStockInput,
      costOfGoodsSold,
      totalSales: effectiveSales,
      totalRecoveriesCollected: monthRecoveriesAmount,
      grossProfit,
      operatingExpenses: effectiveExpenses,
      netProfit,
      profitMarginPercentage: Number(profitMarginPercentage.toFixed(2)),
      finalStockBalance,
      purchasesList: isItemizedPurchases ? purchasesList : undefined,
      notes: notes.trim(),
    };

    onSaveClosingReport(report);

    // Also update base opening stock if this is current month
    onUpdateOpeningStockBase(finalStockBalance);

    // Fire celebratory confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setSuccessToast(`Closing report for ${getMonthLabel(selectedMonthYear)} successfully finalized and saved!`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Print A4 Closing Statement
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Explanation Banner */}
      <div className="bg-white rounded-2xl border-2 border-emerald-600 ring-2 ring-emerald-500/15 p-5 sm:p-6 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-700/20">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                  MONTHLY CLOSING & STOCK PROFIT REPORT
                </span>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  ماہانہ کلوزنگ و منافع رپورٹ
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                Monthly Income, Profit & Remaining Stock Balance
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print A4 Statement</span>
            </button>
            <button
              type="button"
              onClick={handleSaveClosing}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Finalize & Save Closing</span>
            </button>
          </div>
        </div>

        {/* Bilingual Explanations (English & Urdu) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3.5 text-xs">
          <div className="text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <span className="font-bold text-slate-900 text-[11px] block mb-1">
              📌 How it works (English):
            </span>
            Enter your opening stock once at the start, record new stock purchased during the month, verify total sales and operating expenses, enter physical closing stock count at month end, and automatically calculate Cost of Goods Sold (COGS), net monthly profit, and the remaining warehouse stock balance.
          </div>
          <div className="text-slate-700 text-right leading-relaxed font-sans bg-emerald-50/40 p-3 rounded-xl border border-emerald-100" dir="rtl">
            <span className="font-bold text-emerald-950 text-[11px] block mb-1 text-right">
              ✨ یہ سیکشن کیسے کام کرتا ہے (اردو):
            </span>
            شروع میں ایک بار گودام کا ابتدائی اسٹاک درج کریں، اس ماہ خریدا گیا نیا مال شامل کریں۔ سسٹم کل فروخت اور اخراجات کا حساب لگا کر خودکار طریقے سے آپ کا خالص ماہانہ منافع (Net Profit) اور گودام میں موجود بقایا اسٹاک بیلنس نکال دے گا۔
          </div>
        </div>
      </div>

      {/* 2. Month Selector & Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Select Closing Month:</span>
          </div>
          <input
            type="month"
            value={selectedMonthYear}
            onChange={(e) => handleSelectMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <span className="text-sm font-bold text-slate-900 font-sans">
            {getMonthLabel(selectedMonthYear)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {existingSavedReport ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Closed & Finalized on {new Date(existingSavedReport.closedAt).toLocaleDateString()}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
              <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>Draft Month in Progress (جاری کلوزنگ)</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. The 3 Primary Grand Metric Summary Cards (Profit, Stock Balance, COGS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Monthly Net Profit (خالص ماہانہ نفع) */}
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-2xl p-5 border-2 border-emerald-500 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-emerald-300 mb-2">
            <div>
              <span className="font-bold tracking-tight text-white text-sm">Monthly Net Profit</span>
              <span className="block text-[11px] text-emerald-400 font-sans">خالص ماہانہ منافع / آمدنی</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tabular-nums">
              PKR {formatCurrency(Math.abs(netProfit))}
            </div>
            <div className="text-[11px] text-emerald-200/80 font-mono mt-1">
              {netProfit >= 0 ? '✓ Profitable Month' : '⚠️ Net Loss'} · Margin: {profitMarginPercentage.toFixed(1)}%
            </div>
          </div>

          <div className="text-[10px] text-slate-300 pt-2 border-t border-emerald-800/60 font-sans truncate">
            {numberToWords(Math.abs(netProfit))}
          </div>
        </div>

        {/* Metric 2: Final Remaining Stock Balance (گودام میں بقایا اسٹاک) */}
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white rounded-2xl p-5 border-2 border-blue-500 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-blue-300 mb-2">
            <div>
              <span className="font-bold tracking-tight text-white text-sm">Remaining Stock Balance</span>
              <span className="block text-[11px] text-blue-400 font-sans">گودام میں موجود اختتامی اسٹاک بیلنس</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-300 tabular-nums">
              PKR {formatCurrency(finalStockBalance)}
            </div>
            <div className="text-[11px] text-blue-200/80 font-mono mt-1">
              Rolls over to next month's Opening Stock
            </div>
          </div>

          <div className="text-[10px] text-slate-300 pt-2 border-t border-blue-800/60 font-sans truncate">
            {numberToWords(finalStockBalance)}
          </div>
        </div>

        {/* Metric 3: Cost of Goods Sold (فروخت شدہ مال کی لاگت - COGS) */}
        <div className="bg-white rounded-2xl p-5 border-2 border-purple-500 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <div>
              <span className="font-bold text-slate-900 text-sm">Cost of Goods Sold (COGS)</span>
              <span className="block text-[11px] text-slate-500 font-sans">فروخت شدہ مال کی اصل لاگت</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-700 tabular-nums">
              PKR {formatCurrency(costOfGoodsSold)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Gross Profit: <strong className="text-slate-800 font-mono">PKR {formatCurrency(grossProfit)}</strong>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Sales: PKR {formatCurrency(effectiveSales)}</span>
            <span className="text-purple-700 font-semibold font-mono">COGS Formula</span>
          </div>
        </div>
      </div>

      {/* 4. Step-by-Step Accounting Input Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
        {/* Left Column: Opening Stock & Stock Purchases */}
        <div className="space-y-6">
          {/* Card 1: Opening Stock Amount */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500 ring-1 ring-emerald-500/20 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center font-mono">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Opening Stock Amount</h3>
                  <span className="text-[11px] text-slate-500 font-sans">ابتدائی اسٹاک کی مالیت (پہلے سے موجود مال)</span>
                </div>
              </div>

              {previousMonthClosingStock !== null && (
                <button
                  type="button"
                  onClick={() => setOpeningStock(previousMonthClosingStock)}
                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 cursor-pointer"
                  title="Use previous month's closing stock"
                >
                  Carry Over PKR {formatCurrency(previousMonthClosingStock)} ↵
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500">
              ماہ کے آغاز پر دکان یا گودام میں پہلے سے موجود مال کی کل مالیت درج کریں۔ یہ رقم شروع میں ایک بار ڈالی جاتی ہے اور اگلے ماہ خودکار کیری فارورڈ ہو جاتی ہے۔
            </p>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                PKR
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={openingStock}
                onChange={(e) => setOpeningStock(Math.max(0, Number(e.target.value)))}
                className="w-full pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                placeholder="0.00"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-mono text-slate-600">{numberToWords(openingStock)}</span>
              <button
                type="button"
                onClick={() => {
                  onUpdateOpeningStockBase(openingStock);
                  alert('Opening stock base saved successfully.');
                }}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Save as Base Default
              </button>
            </div>
          </div>

          {/* Card 2: Stock Purchases in this Month */}
          <div className="bg-white rounded-2xl border-2 border-blue-500 ring-1 ring-blue-500/20 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center font-mono">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Stock Purchased This Month</h3>
                  <span className="text-[11px] text-slate-500 font-sans">اس ماہ خریدا گیا نیا اسٹاک (Purchases)</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setIsItemizedPurchases(true)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    isItemizedPurchases ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Itemized Bills ({purchasesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIsItemizedPurchases(false)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    !isItemizedPurchases ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Direct Lump Sum
                </button>
              </div>
            </div>

            {/* Total Purchases Banner */}
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-900 font-bold block">Total Purchases in Month:</span>
                <span className="text-[11px] text-blue-700 font-sans">اس ماہ کی کل خریداری</span>
              </div>
              <div className="text-xl font-black font-mono text-blue-900 tabular-nums">
                PKR {formatCurrency(effectivePurchases)}
              </div>
            </div>

            {isItemizedPurchases ? (
              <div className="space-y-3">
                {/* Add Purchase Item Row */}
                <form onSubmit={handleAddPurchaseItem} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add New Stock Purchase Bill / خریداری رسید</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Supplier / مل کا نام *"
                      value={newPurchaseSupplier}
                      onChange={(e) => setNewPurchaseSupplier(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Bill / Invoice # (اختیاری)"
                      value={newPurchaseBillNo}
                      onChange={(e) => setNewPurchaseBillNo(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        placeholder="Amount (PKR) *"
                        value={newPurchaseAmount}
                        onChange={(e) => setNewPurchaseAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newPurchaseDate}
                      onChange={(e) => setNewPurchaseDate(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Description / تفصیل مال"
                      value={newPurchaseDesc}
                      onChange={(e) => setNewPurchaseDesc(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      + Add Bill
                    </button>
                  </div>
                </form>

                {/* List of itemized bills */}
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                  {purchasesList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No stock purchase bills added yet. Add above or switch to Direct Lump Sum.
                    </div>
                  ) : (
                    purchasesList.map((item) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">{item.supplierName}</span>
                            {item.billNo && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.billNo}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {item.date} {item.description ? `· ${item.description}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900">
                            PKR {formatCurrency(item.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePurchaseItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">
                  Enter Total Stock Purchased in {getMonthLabel(selectedMonthYear)}:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                    PKR
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={manualStockPurchases}
                    onChange={(e) => setManualStockPurchases(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Total Available Stock highlight */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Total Stock Available (Opening + Purchases):
              </span>
              <span className="font-mono font-black text-slate-900 text-sm">
                PKR {formatCurrency(totalStockAvailable)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Sales, Closing Stock, Expenses & Profit Breakdown */}
        <div className="space-y-6">
          {/* Card 3: Monthly Sales & Revenue */}
          <div className="bg-white rounded-2xl border-2 border-teal-500 ring-1 ring-teal-500/20 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center font-mono">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Total Sales in Month</h3>
                  <span className="text-[11px] text-slate-500 font-sans">اس ماہ کی کل فروخت (سیلز / انوائسز)</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <label className="flex items-center gap-1 text-slate-600 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={useAutoSales}
                    onChange={(e) => setUseAutoSales(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>Auto Sync from Invoices ({systemMonthInvoices.length})</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">System Invoices Amount:</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  PKR {formatCurrency(autoSystemSales)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {systemMonthInvoices.length} invoices generated in {selectedMonthYear}
                </span>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <span className="text-[11px] text-emerald-800 block">Cash Recoveries Collected:</span>
                <span className="text-base font-bold font-mono text-emerald-800">
                  PKR {formatCurrency(monthRecoveriesAmount)}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {systemMonthRecoveries.length} receipts in this month
                </span>
              </div>
            </div>

            {!useAutoSales && (
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">
                  Custom Monthly Sales Amount:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                    PKR
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={customSalesAmount}
                    onChange={(e) => setCustomSalesAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-14 pr-4 py-2 text-sm font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Closing Stock Count at Month End */}
          <div className="bg-white rounded-2xl border-2 border-amber-500 ring-1 ring-amber-500/20 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center font-mono">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Month-End Closing Stock Count</h3>
                  <span className="text-[11px] text-slate-500 font-sans">ماہ کے اختتام پر گودام میں موجود بقایا مال (Physical Stock)</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              مہینے کے اختتام پر دکان یا گودام میں جو مال بچ گیا اس کی کل فزیکل گنتی (Physical Inventory Value) یہاں درج کریں۔
            </p>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                PKR
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={closingStockInput}
                onChange={(e) => setClosingStockInput(Math.max(0, Number(e.target.value)))}
                className="w-full pl-14 pr-4 py-2.5 text-base font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white"
                placeholder="0.00"
              />
            </div>

            <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
              <span className="text-amber-900 font-medium">Cost of Goods Sold (COGS):</span>
              <span className="font-mono font-bold text-amber-900">
                PKR {formatCurrency(costOfGoodsSold)}
              </span>
            </div>
          </div>

          {/* Card 5: Operating Expenses */}
          <div className="bg-white rounded-2xl border-2 border-rose-500 ring-1 ring-rose-500/20 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center font-mono">
                  5
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Monthly Operating Expenses</h3>
                  <span className="text-[11px] text-slate-500 font-sans">دفتری و کاروباری اخراجات (کرایہ، بل، تنخواہیں)</span>
                </div>
              </div>

              <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={useAutoExpenses}
                  onChange={(e) => setUseAutoExpenses(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span>Auto Sync from Cash Vouchers</span>
              </label>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                PKR
              </div>
              <input
                type="number"
                min="0"
                step="500"
                value={effectiveExpenses}
                onChange={(e) => {
                  setUseAutoExpenses(false);
                  setCustomExpensesAmount(Math.max(0, Number(e.target.value)));
                }}
                className="w-full pl-14 pr-4 py-2 text-sm font-bold font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              سسٹم کے کیش واؤچرز میں سے {selectedMonthYear} کے اخراجات خودکار منسلک ہیں۔ آپ دستی بھی تبدیل کر سکتے ہیں۔
            </p>
          </div>
        </div>
      </div>

      {/* 5. Complete Visual Financial Statement & Math Flow */}
      <div className="bg-white rounded-2xl border-2 border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Official Monthly Closing Financial Statement (آمدنی و منافع کا تفصیلی گوشوارہ)
              </h3>
              <p className="text-xs text-slate-500">
                Period: {getMonthLabel(selectedMonthYear)} · Currency: Pakistani Rupee (PKR)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {SYSTEM_TODAY}
          </span>
        </div>

        {/* Financial Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Financial Component / اکاؤنٹ تفصیل</th>
                <th className="py-2.5 px-4 text-center">Urdu Term / اصطلاح</th>
                <th className="py-2.5 px-4 text-right font-mono">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Opening Stock Balance
                </td>
                <td className="py-2.5 px-4 text-center text-slate-600 font-sans">ابتدائی اسٹاک</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums">
                  PKR {formatCurrency(openingStock)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  (+) Add: Stock Purchased in Month
                </td>
                <td className="py-2.5 px-4 text-center text-slate-600 font-sans">اس ماہ خریدا گیا نیا مال</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-blue-700">
                  + PKR {formatCurrency(effectivePurchases)}
                </td>
              </tr>
              <tr className="bg-slate-50/60 font-bold text-slate-900 border-t border-slate-200">
                <td className="py-2.5 px-4">(=) Total Stock Available for Sale</td>
                <td className="py-2.5 px-4 text-center font-sans">کل دستیاب مال برائے فروخت</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                  PKR {formatCurrency(totalStockAvailable)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  (-) Less: Closing Stock Remaining in Warehouse
                </td>
                <td className="py-2.5 px-4 text-center text-slate-600 font-sans">گودام میں بچ جانے والا بقایا مال</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-amber-700">
                  - PKR {formatCurrency(closingStockInput)}
                </td>
              </tr>
              <tr className="bg-purple-50/60 font-bold text-purple-950 border-t-2 border-purple-200">
                <td className="py-2.5 px-4">(=) Cost of Goods Sold (COGS)</td>
                <td className="py-2.5 px-4 text-center font-sans">فروخت شدہ مال کی اصل لاگت</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-purple-900 text-sm">
                  PKR {formatCurrency(costOfGoodsSold)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Total Monthly Invoiced Sales Revenue
                </td>
                <td className="py-2.5 px-4 text-center text-slate-600 font-sans">اس ماہ کی کل فروخت (سیلز)</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums text-teal-800">
                  PKR {formatCurrency(effectiveSales)}
                </td>
              </tr>
              <tr className="bg-teal-50/60 font-bold text-teal-950 border-t border-teal-200">
                <td className="py-2.5 px-4">(=) Gross Profit (Sales - COGS)</td>
                <td className="py-2.5 px-4 text-center font-sans">مجموعی نفع (سیلز منفی لاگت)</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-teal-900 text-sm">
                  PKR {formatCurrency(grossProfit)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  (-) Less: Business Operating & Office Expenses
                </td>
                <td className="py-2.5 px-4 text-center text-slate-600 font-sans">دفتری اخراجات، تنخواہیں و بلز</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold tabular-nums text-rose-700">
                  - PKR {formatCurrency(effectiveExpenses)}
                </td>
              </tr>
              <tr className="bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-50 font-black text-emerald-950 border-t-2 border-emerald-600 text-sm">
                <td className="py-3 px-4">
                  (★) FINAL NET MONTHLY PROFIT (خالص ماہانہ نفع)
                </td>
                <td className="py-3 px-4 text-center font-sans">خالص آمدنی / نفع</td>
                <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800 text-base">
                  PKR {formatCurrency(netProfit)}
                </td>
              </tr>
              <tr className="bg-blue-50/80 font-bold text-blue-950 border-t border-blue-200">
                <td className="py-2.5 px-4">
                  (★) FINAL STOCK BALANCE IN HAND (اختتامی اسٹاک بیلنس)
                </td>
                <td className="py-2.5 px-4 text-center font-sans">اگلے ماہ کا ابتدائی اسٹاک</td>
                <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-900 text-sm">
                  PKR {formatCurrency(finalStockBalance)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes & Comments field */}
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Closing Remarks / نوٹس و کیفیات (اختیاری):
          </label>
          <input
            type="text"
            placeholder="e.g. November 2026 stock verified by store manager and books audited..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
          />
        </div>

        {/* Finalize button */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="text-xs text-slate-500">
            کلوزنگ محفوظ کرنے پر یہ رپورٹ ہمیشہ کے لیے ڈیٹا بیس میں محفوظ ہو جائے گی اور اگلے مہینے کے لیے بقایا اسٹاک خودکار ٹرانسفر ہو جائے گا۔
          </div>

          <button
            type="button"
            onClick={handleSaveClosing}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Finalize & Lock Monthly Closing Report (ماہانہ کلوزنگ محفوظ کریں)</span>
          </button>
        </div>
      </div>

      {/* 6. Historical Finalized Monthly Closing Reports Archive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden no-print">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historical Monthly Closing Reports Archive
              </h3>
              <p className="text-[11px] text-slate-500 font-sans">
                ماضی کے تمام مہینوں کی محفوظ شدہ کلوزنگ رپورٹس کا مکمل ریکارڈ
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
            {closingReports.length} Saved Closings
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Opening Stock</th>
                <th className="py-2.5 px-3 text-right">Purchases</th>
                <th className="py-2.5 px-3 text-right">Sales</th>
                <th className="py-2.5 px-3 text-right">Closing Stock</th>
                <th className="py-2.5 px-3 text-right">COGS</th>
                <th className="py-2.5 px-3 text-right">Expenses</th>
                <th className="py-2.5 px-3 text-right text-emerald-800 font-bold">Net Profit</th>
                <th className="py-2.5 px-3 text-right text-blue-800 font-bold">Stock Balance</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {closingReports.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                    No finalized monthly closings recorded yet. Complete the calculation above and click Finalize.
                  </td>
                </tr>
              ) : (
                closingReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold font-sans text-slate-900 whitespace-nowrap">
                      {report.monthLabel}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">
                      {formatCurrency(report.openingStock)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-blue-700">
                      +{formatCurrency(report.stockPurchases)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-teal-800 font-semibold">
                      {formatCurrency(report.totalSales)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-amber-700">
                      {formatCurrency(report.closingStock)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-purple-700">
                      {formatCurrency(report.costOfGoodsSold)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums text-rose-700">
                      -{formatCurrency(report.operatingExpenses)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-700 bg-emerald-50/50">
                      PKR {formatCurrency(report.netProfit)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-blue-800 bg-blue-50/50">
                      PKR {formatCurrency(report.finalStockBalance)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectMonth(report.monthYear)}
                          className="px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete closing report for ${report.monthLabel}?`)) {
                              onDeleteClosingReport(report.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* 7. Printable A4 Monthly Statement (Shown only when printing) */}
      <div className="print-only p-8 text-black bg-white">
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold uppercase tracking-tight">Ejaz Business Solution</h1>
          <p className="text-xs mt-1">Main Gulberg III, Lahore, Pakistan · Ph: +92 (42) 3578-9900</p>
          <h2 className="text-lg font-bold mt-2 uppercase border border-black inline-block px-4 py-1">
            Monthly Profit & Stock Closing Statement ({getMonthLabel(selectedMonthYear)})
          </h2>
          <div className="flex justify-between text-xs mt-3">
            <span>Date: {SYSTEM_TODAY}</span>
            <span>Printed by: {userProfile.name}</span>
            <span>Status: Final Reconciled</span>
          </div>
        </div>

        <table className="w-full text-xs border border-black border-collapse my-4">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 font-bold">1. Opening Stock Value (ابتدائی اسٹاک)</td>
              <td className="p-2 text-right font-mono font-bold">PKR {formatCurrency(openingStock)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold">2. New Stock Purchases (اس ماہ خریدا گیا مال)</td>
              <td className="p-2 text-right font-mono font-bold">+ PKR {formatCurrency(effectivePurchases)}</td>
            </tr>
            <tr className="border-b border-black bg-slate-100 font-bold">
              <td className="p-2">Total Available Stock (کل دستیاب مال)</td>
              <td className="p-2 text-right font-mono">PKR {formatCurrency(totalStockAvailable)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold">3. Closing Stock Remaining (اختتامی بقایا مال)</td>
              <td className="p-2 text-right font-mono font-bold">- PKR {formatCurrency(closingStockInput)}</td>
            </tr>
            <tr className="border-b border-black bg-slate-100 font-bold">
              <td className="p-2">Cost of Goods Sold - COGS (فروخت شدہ مال کی لاگت)</td>
              <td className="p-2 text-right font-mono">PKR {formatCurrency(costOfGoodsSold)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold">4. Total Monthly Invoiced Sales (کل فروخت)</td>
              <td className="p-2 text-right font-mono font-bold">PKR {formatCurrency(effectiveSales)}</td>
            </tr>
            <tr className="border-b border-black bg-slate-100 font-bold">
              <td className="p-2">Gross Profit (مجموعی منافع)</td>
              <td className="p-2 text-right font-mono">PKR {formatCurrency(grossProfit)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold">5. Business Operating Expenses (دفتری اخراجات)</td>
              <td className="p-2 text-right font-mono font-bold">- PKR {formatCurrency(effectiveExpenses)}</td>
            </tr>
            <tr className="border-b-2 border-black font-black text-sm bg-slate-200">
              <td className="p-3">NET MONTHLY PROFIT (خالص ماہانہ نفع / آمدنی)</td>
              <td className="p-3 text-right font-mono">PKR {formatCurrency(netProfit)}</td>
            </tr>
            <tr className="border-b border-black font-black text-sm">
              <td className="p-3">REMAINING STOCK BALANCE (اگلے ماہ کا ابتدائی اسٹاک)</td>
              <td className="p-3 text-right font-mono">PKR {formatCurrency(finalStockBalance)}</td>
            </tr>
          </tbody>
        </table>

        {notes && (
          <div className="border border-black p-2 text-xs mt-3">
            <strong>Notes:</strong> {notes}
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 mt-16 pt-8 border-t border-black text-center text-xs">
          <div>
            <div className="border-t border-black pt-1 font-semibold">Store Incharge / Stock Count</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-semibold">Accountant / Reconciled By</div>
          </div>
          <div>
            <div className="border-t border-black pt-1 font-semibold">Managing Director / Approved</div>
          </div>
        </div>
      </div>

      {/* Floating success toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}
    </div>
  );
};
