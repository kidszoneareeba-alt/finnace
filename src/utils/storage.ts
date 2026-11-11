import { Account, CashTransaction, RecoveryEntry, CustomerInvoice, UserProfile, MonthlyClosingReport } from '../types';

const STORAGE_KEYS = {
  ACCOUNTS: 'ledgerpulse_accounts_v2',
  CASH_TXNS: 'ledgerpulse_cash_txns_v2',
  RECOVERIES: 'ledgerpulse_recoveries_v2',
  INVOICES: 'ledgerpulse_invoices_v2',
  USER_PROFILE: 'ledgerpulse_user_v2',
  AUTH_SESSION: 'ledgerpulse_auth_session_v2',
  CLOSING_REPORTS: 'ledgerpulse_closings_v2',
  OPENING_STOCK: 'ledgerpulse_opening_stock_v2',
};

export const DEFAULT_USER: UserProfile = {
  id: 'usr_admin',
  name: 'Ejaz Ali',
  email: 'admin@ejazbusiness.pk',
  role: 'Managing Director & Chief Financial Controller',
  companyName: 'Ejaz Business Solution',
  companyAddress: 'Suite 405, Executive Business Heights, Main Gulberg III, Lahore, Pakistan',
  companyPhone: '+92 (42) 3578-9900',
};

// Seed realistic Pakistani accounting accounts for Ejaz Business Solution
const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc_cust_01',
    code: 'CUST-101',
    name: 'Al-Madina Hardware & Construction Supplies (Pvt) Ltd',
    category: 'Customer',
    contact: '0300-8472910',
    location: 'Plot 12, Badami Bagh Industrial Area, Lahore',
    openingBalance: 450000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'acc_cust_02',
    code: 'CUST-102',
    name: 'Zubair Electronics & Wholesale Mart',
    category: 'Customer',
    contact: '0321-4598123',
    location: 'Shop 45, Hall Road Electronics Plaza, Lahore',
    openingBalance: 320000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-05T09:30:00Z',
  },
  {
    id: 'acc_cust_03',
    code: 'CUST-103',
    name: 'Tariq & Brothers Trading Co.',
    category: 'Customer',
    contact: '0333-5129876',
    location: 'Warehouse 9, Sector I-9 Industrial Area, Islamabad',
    openingBalance: 685000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-10T11:15:00Z',
  },
  {
    id: 'acc_cust_04',
    code: 'CUST-104',
    name: 'Karachi Modern Textile & Garments',
    category: 'Customer',
    contact: '0345-2214567',
    location: 'Plot 7-B, Commercial Avenue, SITE Area, Karachi',
    openingBalance: 184000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-15T14:20:00Z',
  },
  {
    id: 'acc_cust_05',
    code: 'CUST-105',
    name: 'Evergreen Cash & Carry Supermarket',
    category: 'Customer',
    contact: '0312-6547890',
    location: 'Block C, Main Commercial Market, Faisal Town, Lahore',
    openingBalance: 125000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'acc_cust_06',
    code: 'CUST-106',
    name: 'Mian Packages & Paper Board Mills',
    category: 'Customer',
    contact: '0302-4433221',
    location: '18-Km Ferozepur Road, Kahna Nau, Lahore',
    openingBalance: 290000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-22T08:00:00Z',
  },
  {
    id: 'acc_cust_07',
    code: 'CUST-107',
    name: 'Chenab Yarn & Cotton Traders',
    category: 'Customer',
    contact: '0300-6655443',
    location: 'Clock Tower Cloth Market, Faisalabad',
    openingBalance: 520000,
    openingBalanceType: 'Dr',
    createdAt: '2026-09-25T11:00:00Z',
  },
  {
    id: 'acc_bank_01',
    code: 'BANK-01',
    name: 'Habib Bank Limited (HBL) - Corporate A/C 0042-79012345-03',
    category: 'Bank',
    contact: '042-111-111-425',
    location: 'Gulberg Main Boulevard Branch, Lahore',
    openingBalance: 1850000,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_bank_02',
    code: 'BANK-02',
    name: 'Meezan Islamic Bank - Operations A/C 0201-0104829102',
    category: 'Bank',
    contact: '042-111-331-331',
    location: 'DHA Phase 5 Commercial Branch, Lahore',
    openingBalance: 940000,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_exp_01',
    code: 'EXP-101',
    name: 'Head Office Rent & Maintenance',
    category: 'Office Expense',
    contact: '042-3578-1122',
    location: 'Executive Business Heights, Gulberg III, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_exp_02',
    code: 'EXP-102',
    name: 'LESCO Electricity & Sui Northern Gas Bills',
    category: 'Office Expense',
    contact: '042-111-000-118',
    location: 'State Utility Billing Division, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_exp_03',
    code: 'EXP-103',
    name: 'Office Refreshment, Tea & Pantry Supplies',
    category: 'Office Expense',
    contact: '0301-9005566',
    location: 'Ghalib Market, Gulberg, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_exp_04',
    code: 'EXP-104',
    name: 'Field Logistics & Bike Fuel Allowance',
    category: 'Office Expense',
    contact: '0302-9007788',
    location: 'Lahore Field Dispatch Desk',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_pers_cash',
    code: 'PERS-CASH',
    name: 'Cash in Hand Account',
    category: 'Personal',
    contact: '042-3578-9900',
    location: 'Head Office Cash Safe, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_pers_cheq',
    code: 'PERS-CHEQ',
    name: 'Cheque in Hand Account',
    category: 'Personal',
    contact: '042-3578-9900',
    location: 'Head Office Cheque Safe, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'acc_pers_01',
    code: 'PERS-01',
    name: 'Ejaz Ali - Managing Director Drawings',
    category: 'Personal',
    contact: '0300-7770011',
    location: 'Suite 405, Executive Heights, Lahore',
    openingBalance: 0,
    openingBalanceType: 'Dr',
    createdAt: '2026-08-01T08:00:00Z',
  },
];

// Helper to get formatted date string for today and past days
function getDateOffset(daysOffset: number): string {
  const date = new Date(2026, 9, 24); // Based on system metadata: 2026-10-24
  date.setDate(date.getDate() - daysOffset);
  return date.toISOString().split('T')[0];
}

const INITIAL_CASH_TXNS: CashTransaction[] = [
  {
    id: 'csh_01',
    voucherNo: 'CPV-2026-101',
    date: getDateOffset(4),
    accountId: 'acc_exp_01',
    accountCode: 'EXP-101',
    accountName: 'Head Office Rent & Maintenance',
    accountCategory: 'Office Expense',
    type: 'Cash Paid',
    amount: 15000,
    description: 'Monthly Gulberg office maintenance and service charges paid in cash',
    createdAt: new Date(2026, 9, 20, 10, 30).toISOString(),
  },
  {
    id: 'csh_02',
    voucherNo: 'CPV-2026-102',
    date: getDateOffset(2),
    accountId: 'acc_exp_03',
    accountCode: 'EXP-103',
    accountName: 'Office Refreshment, Tea & Pantry Supplies',
    accountCategory: 'Office Expense',
    type: 'Cash Paid',
    amount: 2400,
    description: 'Weekly staff tea, milk, pantry and guest refreshments',
    createdAt: new Date(2026, 9, 22, 14, 0).toISOString(),
  },
  {
    id: 'csh_03',
    voucherNo: 'CRV-2026-103',
    date: getDateOffset(1), // Yesterday
    accountId: 'acc_bank_01',
    accountCode: 'BANK-01',
    accountName: 'Habib Bank Limited (HBL) - Corporate A/C 0042-79012345-03',
    accountCategory: 'Bank',
    type: 'Cash Received',
    amount: 30000,
    description: 'Cash withdrawal from HBL cheque #881920 for office cash safe drawer',
    createdAt: new Date(2026, 9, 23, 11, 45).toISOString(),
  },
  {
    id: 'csh_04',
    voucherNo: 'CPV-2026-104',
    date: getDateOffset(0), // Today
    accountId: 'acc_exp_04',
    accountCode: 'EXP-104',
    accountName: 'Field Logistics & Bike Fuel Allowance',
    accountCategory: 'Office Expense',
    type: 'Cash Paid',
    amount: 1850,
    description: 'Emergency client consignment fuel allowance & courier dispatch',
    createdAt: new Date(2026, 9, 24, 9, 15).toISOString(),
  },
];

const INITIAL_RECOVERIES: RecoveryEntry[] = [
  {
    id: 'rec_01',
    voucherNo: 'REC-2026-001',
    date: getDateOffset(5),
    customerId: 'acc_cust_01',
    customerCode: 'CUST-101',
    customerName: 'Al-Madina Hardware & Construction Supplies (Pvt) Ltd',
    amount: 15000,
    paymentMethod: 'Cash',
    remarks: 'Partial recovery against invoice #INV-401 received at Lahore cash counter',
    receivedBy: 'Ejaz Ali (Director)',
    createdAt: new Date(2026, 9, 19, 11, 0).toISOString(),
  },
  {
    id: 'rec_02',
    voucherNo: 'REC-2026-002',
    date: getDateOffset(3),
    customerId: 'acc_cust_02',
    customerCode: 'CUST-102',
    customerName: 'Zubair Electronics & Wholesale Mart',
    amount: 12000,
    paymentMethod: 'Bank',
    bankAccountId: 'acc_bank_01',
    bankAccountName: 'Habib Bank Limited (HBL) - Corporate A/C 0042-79012345-03',
    remarks: 'Online 1Link / IBFT transfer received against outstanding dues',
    receivedBy: 'Ejaz Ali (Director)',
    createdAt: new Date(2026, 9, 21, 15, 30).toISOString(),
  },
  {
    id: 'rec_03',
    voucherNo: 'REC-2026-003',
    date: getDateOffset(1), // Yesterday
    customerId: 'acc_cust_03',
    customerCode: 'CUST-103',
    customerName: 'Tariq & Brothers Trading Co.',
    amount: 25000,
    paymentMethod: 'Cash',
    remarks: 'Cash recovery collected on spot from I-9 Islamabad office',
    receivedBy: 'Ejaz Ali (Director)',
    createdAt: new Date(2026, 9, 23, 16, 20).toISOString(),
  },
  {
    id: 'rec_04',
    voucherNo: 'REC-2026-004',
    date: getDateOffset(0), // Today
    customerId: 'acc_cust_04',
    customerCode: 'CUST-104',
    customerName: 'Karachi Modern Textile & Garments',
    amount: 8400,
    paymentMethod: 'Cash',
    remarks: 'Cash collected by recovery officer at SITE Area Karachi. Voucher issued.',
    receivedBy: 'Ejaz Ali (Director)',
    createdAt: new Date(2026, 9, 24, 10, 45).toISOString(),
  },
  {
    id: 'rec_05',
    voucherNo: 'REC-2026-005',
    date: getDateOffset(0), // Today
    customerId: 'acc_cust_01',
    customerCode: 'CUST-101',
    customerName: 'Al-Madina Hardware & Construction Supplies (Pvt) Ltd',
    amount: 10000,
    paymentMethod: 'Bank',
    bankAccountId: 'acc_bank_02',
    bankAccountName: 'Meezan Islamic Bank - Operations A/C 0201-0104829102',
    remarks: 'Direct online Meezan Bank deposit reference MZN-PK-99182',
    receivedBy: 'Ejaz Ali (Director)',
    createdAt: new Date(2026, 9, 24, 11, 30).toISOString(),
  },
];

// Seed Customer Invoices/Sales to represent receivables with 15 days terms
const INITIAL_INVOICES: CustomerInvoice[] = [
  {
    id: 'inv_01',
    invoiceNo: 'INV-2026-401',
    date: getDateOffset(20), // 20 days ago -> 15 days complete! Overdue by 5 days
    dueDate: getDateOffset(5),
    customerId: 'acc_cust_01',
    customerCode: 'CUST-101',
    customerName: 'Al-Madina Hardware & Construction Supplies (Pvt) Ltd',
    amount: 25000,
    description: 'Bulk dispatch of commercial industrial fittings and steel hinges',
    createdAt: new Date(2026, 9, 4, 10, 0).toISOString(),
    status: 'Pending',
  },
  {
    id: 'inv_02',
    invoiceNo: 'INV-2026-402',
    date: getDateOffset(14), // 14 days ago -> Due in 1 day (Due Soon!)
    dueDate: getDateOffset(-1),
    customerId: 'acc_cust_02',
    customerCode: 'CUST-102',
    customerName: 'Zubair Electronics & Wholesale Mart',
    amount: 18000,
    description: 'Dispatch of wholesale wiring sets and circuit breakers',
    createdAt: new Date(2026, 9, 10, 12, 0).toISOString(),
    status: 'Pending',
  },
  {
    id: 'inv_03',
    invoiceNo: 'INV-2026-403',
    date: getDateOffset(13), // 13 days ago -> Due in 2 days (Due Soon!)
    dueDate: getDateOffset(-2),
    customerId: 'acc_cust_03',
    customerCode: 'CUST-103',
    customerName: 'Tariq & Brothers Trading Co.',
    amount: 32000,
    description: 'Consignment delivery of copper cables and conduits',
    createdAt: new Date(2026, 9, 11, 14, 30).toISOString(),
    status: 'Pending',
  },
  {
    id: 'inv_04',
    invoiceNo: 'INV-2026-404',
    date: getDateOffset(18), // 18 days ago -> 15 days complete! Overdue by 3 days
    dueDate: getDateOffset(3),
    customerId: 'acc_cust_04',
    customerCode: 'CUST-104',
    customerName: 'Karachi Modern Textile & Garments',
    amount: 42000,
    description: 'Textile machinery spare parts delivery and fitting',
    createdAt: new Date(2026, 9, 6, 11, 0).toISOString(),
    status: 'Pending',
  },
];

// Helper functions for reading and writing to localStorage
export function getStoredAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    const parsed: Account[] = JSON.parse(raw);
    let loadedAccounts: Account[] = parsed.map((acc) => ({
      ...acc,
      openingBalanceType: acc.openingBalanceType || 'Dr',
    }));

    // Ensure permanent Cash in Hand Account exists in Personal category
    const hasCashAccount = loadedAccounts.some(
      (a) => a.code === 'PERS-CASH' || a.id === 'acc_pers_cash' || a.name.toLowerCase() === 'cash in hand account'
    );
    if (!hasCashAccount) {
      const permanentCashAccount: Account = {
        id: 'acc_pers_cash',
        code: 'PERS-CASH',
        name: 'Cash in Hand Account',
        category: 'Personal',
        contact: '042-3578-9900',
        location: 'Head Office Cash Safe, Lahore',
        openingBalance: 0,
        openingBalanceType: 'Dr',
        createdAt: '2026-08-01T08:00:00Z',
      };
      loadedAccounts = [permanentCashAccount, ...loadedAccounts];
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(loadedAccounts));
    }

    // Ensure permanent Cheque in Hand Account exists in Personal category
    const hasChequeAccount = loadedAccounts.some(
      (a) => a.code === 'PERS-CHEQ' || a.id === 'acc_pers_cheq' || a.name.toLowerCase() === 'cheque in hand account'
    );
    if (!hasChequeAccount) {
      const permanentChequeAccount: Account = {
        id: 'acc_pers_cheq',
        code: 'PERS-CHEQ',
        name: 'Cheque in Hand Account',
        category: 'Personal',
        contact: '042-3578-9900',
        location: 'Head Office Cheque Safe, Lahore',
        openingBalance: 0,
        openingBalanceType: 'Dr',
        createdAt: '2026-08-01T08:00:00Z',
      };
      loadedAccounts = [permanentChequeAccount, ...loadedAccounts];
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(loadedAccounts));
    }

    return loadedAccounts;
  } catch (err) {
    console.error('Failed to load accounts from storage', err);
    return INITIAL_ACCOUNTS;
  }
}

export function saveStoredAccounts(accounts: Account[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts to storage', err);
  }
}

export function getStoredCashTransactions(): CashTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASH_TXNS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CASH_TXNS, JSON.stringify(INITIAL_CASH_TXNS));
      return INITIAL_CASH_TXNS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load cash txns from storage', err);
    return INITIAL_CASH_TXNS;
  }
}

export function saveStoredCashTransactions(txns: CashTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CASH_TXNS, JSON.stringify(txns));
  } catch (err) {
    console.error('Failed to save cash txns to storage', err);
  }
}

export function getStoredRecoveries(): RecoveryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECOVERIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RECOVERIES, JSON.stringify(INITIAL_RECOVERIES));
      return INITIAL_RECOVERIES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load recoveries from storage', err);
    return INITIAL_RECOVERIES;
  }
}

export function saveStoredRecoveries(recoveries: RecoveryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECOVERIES, JSON.stringify(recoveries));
  } catch (err) {
    console.error('Failed to save recoveries to storage', err);
  }
}

export function getStoredInvoices(): CustomerInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load invoices from storage', err);
    return INITIAL_INVOICES;
  }
}

export function saveStoredInvoices(invoices: CustomerInvoice[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  } catch (err) {
    console.error('Failed to save invoices to storage', err);
  }
}

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER));
      return DEFAULT_USER;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USER;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export function getAuthSession(): { isLoggedIn: boolean; email: string; name: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) {
      // Default to logged-out so user sees the professional login screen
      const defaultSession = { isLoggedIn: false, email: 'aijaz', name: 'Ejaz Ali (Managing Director)' };
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(defaultSession));
      return defaultSession;
    }
    const parsed = JSON.parse(raw);
    // If it was the legacy admin email, reset to require login with 'aijaz' / '5050'
    if (parsed.email === 'admin@ejazbusiness.pk') {
      const updated = { isLoggedIn: false, email: 'aijaz', name: 'Ejaz Ali (Managing Director)' };
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch {
    return { isLoggedIn: false, email: 'aijaz', name: 'Ejaz Ali (Managing Director)' };
  }
}

export function setAuthSession(session: { isLoggedIn: boolean; email: string; name: string }): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
}

export const DEFAULT_OPENING_STOCK = 1400000; // PKR 1.4 Million initial opening stock

const INITIAL_CLOSING_REPORTS: MonthlyClosingReport[] = [
  {
    id: 'close_2026_10',
    monthYear: '2026-10',
    monthLabel: 'October 2026',
    closedAt: '2026-10-31T18:00:00Z',
    closedBy: 'Ejaz Ali (Managing Director)',
    openingStock: 1200000,
    stockPurchases: 850000,
    totalStockAvailable: 2050000,
    closingStock: 1400000,
    costOfGoodsSold: 650000,
    totalSales: 1150000,
    totalRecoveriesCollected: 980000,
    grossProfit: 500000,
    operatingExpenses: 165000,
    netProfit: 335000,
    profitMarginPercentage: 29.13,
    finalStockBalance: 1400000,
    purchasesList: [
      { id: 'p_01', date: '2026-10-05', supplierName: 'Pak Industrial Supplies Co.', billNo: 'PI-492', amount: 450000, description: 'Imported equipment & hardware stock' },
      { id: 'p_02', date: '2026-10-18', supplierName: 'Lahore Tooling & Engineering Works', billNo: 'ST-108', amount: 400000, description: 'Tooling stock & raw materials' },
    ],
    notes: 'October 2026 official closing finalized. All customer ledgers and stock physical count verified.',
  },
];

export function getStoredOpeningStock(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OPENING_STOCK);
    if (!raw) return DEFAULT_OPENING_STOCK;
    const parsed = Number(raw);
    return isNaN(parsed) ? DEFAULT_OPENING_STOCK : parsed;
  } catch {
    return DEFAULT_OPENING_STOCK;
  }
}

export function saveStoredOpeningStock(amount: number): void {
  localStorage.setItem(STORAGE_KEYS.OPENING_STOCK, String(amount));
}

export function getStoredClosingReports(): MonthlyClosingReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLOSING_REPORTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify(INITIAL_CLOSING_REPORTS));
      return INITIAL_CLOSING_REPORTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_CLOSING_REPORTS;
  } catch {
    return INITIAL_CLOSING_REPORTS;
  }
}

export function saveStoredClosingReports(reports: MonthlyClosingReport[]): void {
  localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify(reports));
}

// Reset database to initial sample dataset
export function resetToDemoData(): void {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS));
  localStorage.setItem(STORAGE_KEYS.CASH_TXNS, JSON.stringify(INITIAL_CASH_TXNS));
  localStorage.setItem(STORAGE_KEYS.RECOVERIES, JSON.stringify(INITIAL_RECOVERIES));
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(DEFAULT_USER));
  localStorage.setItem(STORAGE_KEYS.CLOSING_REPORTS, JSON.stringify(INITIAL_CLOSING_REPORTS));
  localStorage.setItem(STORAGE_KEYS.OPENING_STOCK, String(DEFAULT_OPENING_STOCK));
}

// Export database as JSON
export function exportDatabaseBackup(): string {
  const backup = {
    accounts: getStoredAccounts(),
    cashTransactions: getStoredCashTransactions(),
    recoveries: getStoredRecoveries(),
    invoices: getStoredInvoices(),
    userProfile: getUserProfile(),
    closingReports: getStoredClosingReports(),
    openingStock: getStoredOpeningStock(),
    exportedAt: new Date().toISOString(),
    version: '1.2.0',
  };
  return JSON.stringify(backup, null, 2);
}

// Import database from JSON string
export function importDatabaseBackup(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.accounts && Array.isArray(parsed.accounts)) {
      saveStoredAccounts(parsed.accounts);
      if (parsed.cashTransactions) saveStoredCashTransactions(parsed.cashTransactions);
      if (parsed.recoveries) saveStoredRecoveries(parsed.recoveries);
      if (parsed.invoices) saveStoredInvoices(parsed.invoices);
      if (parsed.userProfile) saveUserProfile(parsed.userProfile);
      if (parsed.closingReports && Array.isArray(parsed.closingReports)) {
        saveStoredClosingReports(parsed.closingReports);
      }
      if (typeof parsed.openingStock === 'number') {
        saveStoredOpeningStock(parsed.openingStock);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to import backup', err);
    return false;
  }
}

