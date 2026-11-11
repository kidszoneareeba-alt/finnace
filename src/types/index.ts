export type AccountCategory = 'Customer' | 'Personal' | 'Bank' | 'Office Expense';

export type BalanceType = 'Dr' | 'Cr';

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  contact: string;
  location: string;
  openingBalance: number; // positive magnitude entered by user
  openingBalanceType?: BalanceType; // 'Dr' (Debit) or 'Cr' (Credit), default is 'Dr'
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'Cash' | 'Bank' | 'Cheque' | 'Cash & Cheque';

export type CashTransactionType = 'Cash Received' | 'Cash Paid';

export interface CashTransaction {
  id: string;
  voucherNo: string;
  date: string; // YYYY-MM-DD
  // Primary/legacy counterpart account
  accountId: string;
  accountCode: string;
  accountName: string;
  accountCategory: AccountCategory;
  type: CashTransactionType;
  amount: number;
  description: string;
  createdAt: string;

  // Double-entry specifics: First Account (Credit - CR) & Second Account (Debit - DR)
  creditAccountId?: string;
  creditAccountCode?: string;
  creditAccountName?: string;
  creditAccountCategory?: AccountCategory;
  creditAmount?: number;
  creditDescription?: string;

  debitAccountId?: string;
  debitAccountCode?: string;
  debitAccountName?: string;
  debitAccountCategory?: AccountCategory;
  debitAmount?: number;
  debitDescription?: string;
}

export interface RecoveryEntry {
  id: string;
  voucherNo: string;
  date: string; // YYYY-MM-DD
  customerId: string;
  customerCode: string;
  customerName: string;
  amount: number; // Total recovery amount
  paymentMethod: PaymentMethod;
  cashAmount?: number; // Cash received portion (Debited to Cash in Hand)
  cashDescription?: string;
  chequeAmount?: number; // Cheque received portion (Debited to Cheque in Hand)
  chequeNo?: string;
  chequeBank?: string;
  chequeDate?: string;
  chequeDescription?: string;
  invoiceId?: string;
  invoiceNo?: string;
  bankAccountId?: string; // If Bank
  bankAccountName?: string;
  remarks: string;
  receivedBy?: string;
  createdAt: string;
}

export interface CustomerInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate?: string; // 15 days from invoice date
  customerId: string;
  customerCode: string;
  customerName: string;
  amount: number;
  description: string;
  createdAt: string;
  status?: 'Pending' | 'Paid' | 'Partial';
}

export type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType?: 'invoice' | 'recovery' | 'cashTxn';
  sourceId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
}

export interface StockPurchaseItem {
  id: string;
  date: string;
  supplierName: string;
  billNo?: string;
  amount: number;
  description?: string;
}

export interface MonthlyClosingReport {
  id: string;
  monthYear: string; // e.g. "2026-11"
  monthLabel: string; // e.g. "November 2026"
  closedAt: string; // ISO date string
  closedBy?: string;
  
  // Stock Accounting:
  openingStock: number; // ابتدائی مال / اسٹاک (شروع میں درج کردہ یا پچھلے ماہ کا اختتامی مال)
  stockPurchases: number; // اس ماہ خریدا گیا نیا مال (Purchases)
  totalStockAvailable: number; // openingStock + stockPurchases (کل دستیاب مال)
  closingStock: number; // ماہ کے اختتام پر گودام میں موجود بقایا مال (Physical Stock Count)
  costOfGoodsSold: number; // فروخت شدہ مال کی لاگت (COGS = openingStock + stockPurchases - closingStock)
  
  // Revenue & Collections:
  totalSales: number; // کل فروخت (ماہ کی انوائسز / نقد سیلز)
  totalRecoveriesCollected: number; // کسٹمرز سے وصول شدہ ریکوری
  grossProfit: number; // مجموعی منافع (Sales - COGS)
  
  // Expenses & Deductions:
  operatingExpenses: number; // دفتری اخراجات، تنخواہیں، بلز وغیرہ
  
  // Final Financial Outcomes:
  netProfit: number; // حتمی خالص ماہانہ آمدنی / نفع (Gross Profit - Expenses)
  profitMarginPercentage: number; // نفع کا تناسب فیصد میں
  finalStockBalance: number; // اختتامی اسٹاک بیلنس جو اگلے ماہ کا ابتدائی اسٹاک بنے گا
  
  // Itemized stock purchases for record
  purchasesList?: StockPurchaseItem[];
  notes?: string;
}

