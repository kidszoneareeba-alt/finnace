/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavItem, Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { MainDashboard } from './components/MainDashboard';
import { CreateAccountView } from './components/CreateAccountView';
import { AddInvoiceView } from './components/AddInvoiceView';
import { CashInHandView } from './components/CashInHandView';
import { RecoveryEntryView } from './components/RecoveryEntryView';
import { BusinessOverviewView } from './components/BusinessOverviewView';
import { ViewAccountsReportView } from './components/ViewAccountsReportView';
import { ClosingReportView } from './components/ClosingReportView';

import {
  Account,
  CashTransaction,
  RecoveryEntry,
  CustomerInvoice,
  UserProfile,
  MonthlyClosingReport,
} from './types';
import {
  getStoredAccounts,
  saveStoredAccounts,
  getStoredCashTransactions,
  saveStoredCashTransactions,
  getStoredRecoveries,
  saveStoredRecoveries,
  getStoredInvoices,
  saveStoredInvoices,
  getUserProfile,
  getAuthSession,
  setAuthSession,
  clearAuthSession,
  resetToDemoData,
  exportDatabaseBackup,
  importDatabaseBackup,
  getStoredClosingReports,
  saveStoredClosingReports,
  getStoredOpeningStock,
  saveStoredOpeningStock,
} from './utils/storage';
import { calculateCashInHand } from './utils/accounting';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getAuthSession().isLoggedIn;
  });

  // Navigation State (Exact options per requirements)
  const [activeTab, setActiveTab] = useState<NavItem>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active ledger account when jumping from other modules
  const [targetLedgerAccountId, setTargetLedgerAccountId] = useState<string | undefined>(
    undefined
  );

  // Core Persistent State
  const [accounts, setAccounts] = useState<Account[]>(() => getStoredAccounts());
  const [cashTxns, setCashTxns] = useState<CashTransaction[]>(() =>
    getStoredCashTransactions()
  );
  const [recoveries, setRecoveries] = useState<RecoveryEntry[]>(() =>
    getStoredRecoveries()
  );
  const [invoices, setInvoices] = useState<CustomerInvoice[]>(() =>
    getStoredInvoices()
  );
  const [closingReports, setClosingReports] = useState<MonthlyClosingReport[]>(() =>
    getStoredClosingReports()
  );
  const [openingStockBase, setOpeningStockBase] = useState<number>(() =>
    getStoredOpeningStock()
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(() => getUserProfile());

  // Calculate live cash in hand balance for header/sidebar
  const cashBalance = calculateCashInHand(cashTxns, recoveries).currentCashInHand;

  // Handlers for closing report
  const handleSaveClosingReport = (report: MonthlyClosingReport): boolean => {
    setClosingReports((prev) => {
      const exists = prev.some((r) => r.id === report.id || r.monthYear === report.monthYear);
      const updated = exists
        ? prev.map((r) => (r.id === report.id || r.monthYear === report.monthYear ? report : r))
        : [report, ...prev];
      saveStoredClosingReports(updated);
      return updated;
    });
    return true;
  };

  const handleDeleteClosingReport = (reportId: string): boolean => {
    setClosingReports((prev) => {
      const updated = prev.filter((r) => r.id !== reportId);
      saveStoredClosingReports(updated);
      return updated;
    });
    return true;
  };

  const handleUpdateOpeningStockBase = (amount: number): void => {
    setOpeningStockBase(amount);
    saveStoredOpeningStock(amount);
  };

  // Handlers for persistent updates
  const handleSaveAccount = (account: Account): boolean => {
    setAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      const updated = exists
        ? prev.map((a) => (a.id === account.id ? account : a))
        : [account, ...prev];
      saveStoredAccounts(updated);
      return updated;
    });
    return true;
  };

  const handleDeleteAccount = (accountId: string): boolean => {
    setAccounts((prev) => {
      const updated = prev.filter((a) => a.id !== accountId);
      saveStoredAccounts(updated);
      return updated;
    });
    return true;
  };

  const handleSaveCashTxn = (txn: CashTransaction): boolean => {
    setCashTxns((prev) => {
      const exists = prev.some((t) => t.id === txn.id);
      const updated = exists
        ? prev.map((t) => (t.id === txn.id ? txn : t))
        : [txn, ...prev];
      saveStoredCashTransactions(updated);
      return updated;
    });
    return true;
  };

  const handleDeleteCashTxn = (id: string): boolean => {
    setCashTxns((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveStoredCashTransactions(updated);
      return updated;
    });
    return true;
  };

  const handleSaveRecovery = (recovery: RecoveryEntry): boolean => {
    setRecoveries((prev) => {
      const exists = prev.some((r) => r.id === recovery.id);
      const updated = exists
        ? prev.map((r) => (r.id === recovery.id ? recovery : r))
        : [recovery, ...prev];
      saveStoredRecoveries(updated);
      return updated;
    });
    return true;
  };

  const handleDeleteRecovery = (id: string): boolean => {
    setRecoveries((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      saveStoredRecoveries(updated);
      return updated;
    });
    return true;
  };

  const handleSaveInvoice = (invoice: CustomerInvoice): boolean => {
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === invoice.id);
      const updated = exists
        ? prev.map((i) => (i.id === invoice.id ? invoice : i))
        : [invoice, ...prev];
      saveStoredInvoices(updated);
      return updated;
    });
    return true;
  };

  const handleSaveMultipleInvoices = (newInvoices: CustomerInvoice[]): boolean => {
    if (!newInvoices.length) return true;
    setInvoices((prev) => {
      const newIds = new Set(newInvoices.map((inv) => inv.id));
      const filteredPrev = prev.filter((inv) => !newIds.has(inv.id));
      const updated = [...newInvoices, ...filteredPrev];
      saveStoredInvoices(updated);
      return updated;
    });
    return true;
  };

  const handleDeleteInvoice = (id: string): boolean => {
    setInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStoredInvoices(updated);
      return updated;
    });
    return true;
  };

  const handleLogin = (user: { email: string; name: string }) => {
    setAuthSession({ isLoggedIn: true, email: user.email, name: user.name });
    setIsAuthenticated(true);
    setActiveTab('Dashboard');
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthenticated(false);
  };

  const handleResetData = () => {
    resetToDemoData();
    setAccounts(getStoredAccounts());
    setCashTxns(getStoredCashTransactions());
    setRecoveries(getStoredRecoveries());
    setInvoices(getStoredInvoices());
    setUserProfile(getUserProfile());
    setClosingReports(getStoredClosingReports());
    setOpeningStockBase(getStoredOpeningStock());
  };

  const handleExportBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LedgerPulse_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonString: string): boolean => {
    const success = importDatabaseBackup(jsonString);
    if (success) {
      setAccounts(getStoredAccounts());
      setCashTxns(getStoredCashTransactions());
      setRecoveries(getStoredRecoveries());
      setInvoices(getStoredInvoices());
      setUserProfile(getUserProfile());
      setClosingReports(getStoredClosingReports());
      setOpeningStockBase(getStoredOpeningStock());
      return true;
    }
    return false;
  };

  const handleViewLedgerFromAccount = (account: Account) => {
    setTargetLedgerAccountId(account.id);
    setActiveTab('View Accounts Report');
  };

  // If user is not logged in, show professional login screen
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-row">
      {/* 2. Left-side Navigation Sidebar (Docked on desktop, overlay on mobile) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setTargetLedgerAccountId(undefined);
          setIsSidebarOpen(false);
        }}
        onLogout={handleLogout}
        cashInHandBalance={cashBalance}
        totalCustomers={accounts.filter((a) => a.category === 'Customer').length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area: Full Window layout */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full transition-all duration-200">
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setTargetLedgerAccountId(undefined);
          }}
          onResetData={handleResetData}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onLogout={handleLogout}
        />

        {/* Viewport Router: Full Window presentation */}
        <main className="flex-1 p-3.5 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full">
          {activeTab === 'Dashboard' && (
            <MainDashboard
              accounts={accounts}
              cashTxns={cashTxns}
              recoveries={recoveries}
              invoices={invoices}
              userProfile={userProfile}
              onNavigate={(tab) => {
                setActiveTab(tab);
                setTargetLedgerAccountId(undefined);
              }}
              onViewAccountLedger={handleViewLedgerFromAccount}
            />
          )}

          {activeTab === 'Create Account' && (
            <CreateAccountView
              accounts={accounts}
              onSaveAccount={handleSaveAccount}
              onDeleteAccount={handleDeleteAccount}
              onViewLedger={handleViewLedgerFromAccount}
            />
          )}

          {activeTab === 'Add Invoice' && (
            <AddInvoiceView
              accounts={accounts}
              invoices={invoices}
              onSaveInvoice={handleSaveInvoice}
              onSaveMultipleInvoices={handleSaveMultipleInvoices}
              onDeleteInvoice={handleDeleteInvoice}
              onViewLedger={handleViewLedgerFromAccount}
              onNavigateToRecovery={() => setActiveTab('Recovery Entry')}
            />
          )}

          {activeTab === 'Cash in Hand' && (
            <CashInHandView
              accounts={accounts}
              cashTxns={cashTxns}
              recoveries={recoveries}
              invoices={invoices}
              onSaveCashTxn={handleSaveCashTxn}
              onDeleteCashTxn={handleDeleteCashTxn}
              onViewLedger={handleViewLedgerFromAccount}
            />
          )}

          {activeTab === 'Recovery Entry' && (
            <RecoveryEntryView
              accounts={accounts}
              recoveries={recoveries}
              invoices={invoices}
              cashTxns={cashTxns}
              userProfile={userProfile}
              onSaveRecovery={handleSaveRecovery}
              onDeleteRecovery={handleDeleteRecovery}
              onNavigateToCreateAccount={() => setActiveTab('Create Account')}
            />
          )}

          {activeTab === 'Business Overview' && (
            <BusinessOverviewView
              accounts={accounts}
              cashTxns={cashTxns}
              recoveries={recoveries}
              invoices={invoices}
              onNavigateToRecovery={() => setActiveTab('Recovery Entry')}
              onNavigateToLedger={handleViewLedgerFromAccount}
            />
          )}

          {activeTab === 'View Accounts Report' && (
            <ViewAccountsReportView
              accounts={accounts}
              cashTxns={cashTxns}
              recoveries={recoveries}
              invoices={invoices}
              userProfile={userProfile}
              initialAccountId={targetLedgerAccountId}
              onSaveInvoice={handleSaveInvoice}
              onSaveRecovery={handleSaveRecovery}
              onSaveCashTxn={handleSaveCashTxn}
              onSaveAccount={handleSaveAccount}
            />
          )}

          {activeTab === 'Closing Report' && (
            <ClosingReportView
              invoices={invoices}
              cashTxns={cashTxns}
              recoveries={recoveries}
              userProfile={userProfile}
              closingReports={closingReports}
              openingStockBase={openingStockBase}
              onSaveClosingReport={handleSaveClosingReport}
              onDeleteClosingReport={handleDeleteClosingReport}
              onUpdateOpeningStockBase={handleUpdateOpeningStockBase}
            />
          )}
        </main>
      </div>
    </div>
  );
}
