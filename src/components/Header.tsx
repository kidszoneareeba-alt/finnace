import React, { useState } from 'react';
import {
  Menu,
  RotateCcw,
  Download,
  Upload,
  Calendar,
  Check,
  LayoutDashboard,
  UserPlus,
  FilePlus2,
  Wallet,
  Receipt,
  FileSpreadsheet,
  Calculator,
  LogOut,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { NavItem } from './Sidebar';
import { SYSTEM_TODAY } from '../utils/accounting';

interface HeaderProps {
  activeTab: NavItem;
  onToggleSidebar: () => void;
  onSelectTab: (tab: NavItem) => void;
  onResetData: () => void;
  onExportBackup: () => void;
  onImportBackup: (json: string) => boolean;
  onLogout?: () => void;
}

const URDU_TAB_NAMES: Record<NavItem, string> = {
  'Dashboard': 'ڈیش بورڈ و سمری',
  'Create Account': 'نیا کھاتہ بنائیں',
  'Add Invoice': 'نئی انوائس شامل کریں',
  'Cash in Hand': 'کیش ان ہینڈ دراز',
  'Recovery Entry': 'کسٹمر ریکوری اندراج',
  'Business Overview': 'کاروباری مالیاتی جائزہ',
  'View Accounts Report': 'کھاتہ جات لیجر رپورٹ',
  'Closing Report': 'ماہانہ کلوزنگ و منافع',
};

const TAB_ICONS: Record<NavItem, React.ReactNode> = {
  'Dashboard': <LayoutDashboard className="w-3.5 h-3.5" />,
  'Create Account': <UserPlus className="w-3.5 h-3.5" />,
  'Add Invoice': <FilePlus2 className="w-3.5 h-3.5" />,
  'Cash in Hand': <Wallet className="w-3.5 h-3.5" />,
  'Recovery Entry': <Receipt className="w-3.5 h-3.5" />,
  'Business Overview': <LayoutDashboard className="w-3.5 h-3.5" />,
  'View Accounts Report': <FileSpreadsheet className="w-3.5 h-3.5" />,
  'Closing Report': <Calculator className="w-3.5 h-3.5" />,
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  onSelectTab,
  onResetData,
  onExportBackup,
  onImportBackup,
  onLogout,
}) => {
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = onImportBackup(content);
      if (success) {
        showToast('Database imported successfully!');
      } else {
        showToast('Error importing file. Invalid format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowDataMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs no-print">
      {/* Top Header Row Matching Reference Image */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Hamburger & Search Anything Pill Bar */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-lg">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
            aria-label="Toggle navigation menu"
            title="Toggle Sidebar / فل اسکرین اور سائڈبار"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input Pill matching reference image */}
          <div className="relative w-full max-w-xs sm:max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search anything... (Ctrl + K)"
              className="w-full pl-9 pr-4 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-400 rounded-full text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden"
            />
          </div>

          {/* Active Tab indicator */}
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <span className="p-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {TAB_ICONS[activeTab]}
            </span>
            <div className="text-xs">
              <span className="font-bold text-slate-900">{activeTab}</span>
              <span className="text-[10px] text-slate-400 font-sans ml-1.5 opacity-80" dir="rtl">
                ({URDU_TAB_NAMES[activeTab]})
              </span>
            </div>
          </div>
        </div>

        {/* Right: Notification Bell, User Avatar & Data Persistence */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Notification Bell matching image */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDataMenu(false);
              }}
              className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer relative"
              title="Notifications / اطلاعات"
            >
              <Bell className="w-4 h-4" />
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center absolute -top-0.5 -right-0.5 border-2 border-white shadow-2xs">
                3
              </span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">NOTIFICATIONS (اطلاعات)</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">Active</span>
                </div>
                <div className="p-2 space-y-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">15-Day Terms Tracker Active</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Due soon and overdue customer invoices monitored live.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-bold text-slate-800">Cash Drawer Balanced</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Primary cash in hand automatically reconciled with vouchers.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar matching image */}
          <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
              U
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Database / Backup dropdown menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Database & Backup Settings"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Data & Backup</span>
            </button>

            {showDataMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400">
                  DATABASE PERSISTENCE (بیک اپ)
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onExportBackup();
                    setShowDataMenu(false);
                    showToast('Database backup downloaded');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export JSON Backup (محفوظ کریں)</span>
                </button>

                <label className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Import JSON Backup (لوڈ کریں)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </label>

                <div className="border-t border-slate-100 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset database to realistic initial sample accounting data?')) {
                      onResetData();
                      setShowDataMenu(false);
                      showToast('Database reset to sample demo data');
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-rose-500" />
                  <span>Reset to Sample Data (ڈیٹا ری سیٹ)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Logout / لاگ آؤٹ"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating temporary toast notice */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </header>
  );
};
