import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  FilePlus2,
  Wallet,
  Receipt,
  FileSpreadsheet,
  ChevronRight,
  LogOut,
  X,
  Calculator,
  TrendingUp,
  BarChart3,
  PanelLeftClose,
} from 'lucide-react';

export type NavItem =
  | 'Dashboard'
  | 'Create Account'
  | 'Add Invoice'
  | 'Cash in Hand'
  | 'Recovery Entry'
  | 'Business Overview'
  | 'View Accounts Report'
  | 'Closing Report';

interface SidebarProps {
  activeTab: NavItem;
  onSelectTab: (tab: NavItem) => void;
  onLogout: () => void;
  cashInHandBalance?: number;
  totalCustomers: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onLogout,
  totalCustomers,
  isOpen,
  onClose,
}) => {
  const navItems: { label: NavItem; urduLabel: string; icon: React.ReactNode; badge?: string }[] = [
    {
      label: 'Dashboard',
      urduLabel: 'ڈیش بورڈ و خلاصہ',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      label: 'Create Account',
      urduLabel: 'نیا کھاتہ بنائیں',
      icon: <UserPlus className="w-4 h-4 shrink-0" />,
      badge: `${totalCustomers} Accs`,
    },
    {
      label: 'Add Invoice',
      urduLabel: 'نئی انوائس بنائیں',
      icon: <FilePlus2 className="w-4 h-4 shrink-0" />,
    },
    {
      label: 'Cash in Hand',
      urduLabel: 'کیش ان ہینڈ دراز',
      icon: <Wallet className="w-4 h-4 shrink-0" />,
    },
    {
      label: 'Recovery Entry',
      urduLabel: 'ریکوری وصولی اندراج',
      icon: <Receipt className="w-4 h-4 shrink-0" />,
    },
    {
      label: 'View Accounts Report',
      urduLabel: 'کھاتہ جات لیجر رپورٹ',
      icon: <FileSpreadsheet className="w-4 h-4 shrink-0" />,
    },
    {
      label: 'Closing Report',
      urduLabel: 'ماہانہ کلوزنگ و منافع رپورٹ',
      icon: <Calculator className="w-4 h-4 shrink-0" />,
      badge: 'New',
    },
  ];

  const handleNavClick = (tab: NavItem) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 no-print"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      )}

      {/* Slide-out Sidebar Drawer on mobile, collapsible docked on lg */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 lg:z-20 max-w-[85vw] lg:max-w-none h-screen bg-white text-slate-700 flex flex-col border-r border-slate-100 shadow-2xl lg:shadow-none transition-all duration-300 ease-in-out shrink-0 ${
          isOpen
            ? 'w-64 xl:w-72 translate-x-0 opacity-100'
            : 'w-0 -translate-x-full opacity-0 overflow-hidden border-r-0 pointer-events-none'
        } no-print`}
      >
        {/* Company & Brand Header Matching Reference Image */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Blue Chart Icon with Upward Arrow in Squircle */}
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0066ff] border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
                EJaz Finance Pro
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight truncate">
                Your Financial Dashboard
              </p>
            </div>
          </div>

          {/* Hide Sidebar for Full Screen View Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Hide Sidebar for Full-Screen View / فل اسکرین کے لیے سائڈبار چھپائیں"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4 flex-1 overflow-y-auto space-y-1.5">
          <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider">
            <span>MAIN NAVIGATION</span>
            <span className="text-[9px] text-blue-600 font-semibold">کلک پر فل اسکرین ہوگی</span>
          </div>
          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.label)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#0066ff] text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <span
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-blue-600'
                    }
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-bold">{item.label}</span>
                    <span className="block text-[10px] opacity-80 font-normal truncate">
                      {item.urduLabel}
                    </span>
                  </div>
                </div>
                {item.badge ? (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ml-1.5 ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : item.badge === 'New'
                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'opacity-100 translate-x-0.5 text-white' : 'opacity-30 group-hover:opacity-100'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* User Session & Logout strip */}
        <div className="px-3 pb-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 truncate">
                Ejaz Business Solution
              </p>
              <p className="text-[10px] text-emerald-600 font-medium truncate">
                Lahore, Pakistan
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Logout / لاگ آؤٹ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Multi-layered Fluid Blue Wave Illustration matching reference image */}
        <div className="relative mt-auto overflow-hidden pointer-events-none select-none">
          <svg viewBox="0 0 280 70" className="w-full h-16" preserveAspectRatio="none">
            <path
              d="M 0,35 Q 70,10 140,40 T 280,25 L 280,70 L 0,70 Z"
              fill="#bfdbfe"
              opacity="0.35"
            />
            <path
              d="M 0,45 Q 80,20 160,50 T 280,40 L 280,70 L 0,70 Z"
              fill="#60a5fa"
              opacity="0.55"
            />
            <path
              d="M 0,55 Q 90,35 180,60 T 280,50 L 280,70 L 0,70 Z"
              fill="#0066ff"
              opacity="0.85"
            />
          </svg>
        </div>
      </aside>
    </>
  );
};
