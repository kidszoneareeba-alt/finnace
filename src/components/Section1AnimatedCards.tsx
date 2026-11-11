import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Users,
  Building2,
  Receipt,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Settings,
  List,
  Download,
  Scale,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { DashboardMetricType } from './DashboardMetricModals';
import { formatCurrency } from '../utils/numberToWords';

interface Section1AnimatedCardsProps {
  cashClosingBalance: number;
  cashAccountCode: string;
  totalCustomerOutstanding: number;
  customerAccountsCount: number;
  totalBankBalance: number;
  bankAccountsCount: number;
  totalRecoveryAllTime: number;
  recoveryCount: number;
  totalPayableAmount: number;
  payableAccountsCount: number;
  onOpenMetricModal: (metric: DashboardMetricType) => void;
  onTriggerRefresh?: () => void;
}

// Smooth count-up easing hook
function useCountUp(target: number, durationMs: number = 1200) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let frameId: number;

    const startVal = 0;
    const endVal = target;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth ease-out exponential curve
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -8 * progress);
      const current = Math.round(startVal + (endVal - startVal) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, durationMs]);

  return displayValue;
}

export const Section1AnimatedCards: React.FC<Section1AnimatedCardsProps> = ({
  cashClosingBalance,
  cashAccountCode: _cashAccountCode,
  totalCustomerOutstanding,
  customerAccountsCount: _customerAccountsCount,
  totalBankBalance,
  bankAccountsCount: _bankAccountsCount,
  totalRecoveryAllTime,
  recoveryCount: _recoveryCount,
  totalPayableAmount,
  payableAccountsCount: _payableAccountsCount,
  onOpenMetricModal,
}) => {
  // Animated smooth count values
  const animatedCash = useCountUp(Math.abs(cashClosingBalance));
  const animatedCustomer = useCountUp(totalCustomerOutstanding);
  const animatedBank = useCountUp(totalBankBalance);
  const animatedRecovery = useCountUp(totalRecoveryAllTime);
  const animatedPayable = useCountUp(totalPayableAmount);

  // Active hover indicator index
  const [hoveredNode, setHoveredNode] = useState<{ card: string; idx: number } | null>(null);

  // 3D Card Flip Animation State
  const [flippingCard, setFlippingCard] = useState<DashboardMetricType | null>(null);

  const handleCardClick = (metric: DashboardMetricType) => {
    if (flippingCard) return; // Prevent double trigger
    setFlippingCard(metric);

    // Launch detail modal halfway through the 3D flip animation
    setTimeout(() => {
      onOpenMetricModal(metric);
      setTimeout(() => {
        setFlippingCard(null);
      }, 450);
    }, 320);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* ======================================================== */}
      {/* CARD 1: CASH IN HAND (Blue Theme - 3D Flip Card)         */}
      {/* ======================================================== */}
      <div className="[perspective:1000px] h-full">
        <div
          onClick={() => handleCardClick('cash')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick('cash');
            }
          }}
          className={`group relative rounded-2xl transition-all duration-500 [transform-style:preserve-3d] cursor-pointer select-none h-full ${
            flippingCard === 'cash' ? '[transform:rotateY(180deg)_scale(1.03)] shadow-2xl' : ''
          }`}
          title="Click to flip and open Cash in Hand vouchers & statement"
        >
          {/* FRONT FACE */}
          <div className="[backface-visibility:hidden] bg-white rounded-2xl p-4 sm:p-4.5 border border-blue-100/90 hover:border-blue-400 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(59,130,246,0.16)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-sky-400 group-hover:h-1.5 transition-all duration-300" />

            <div className="space-y-2.5">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Cash in Hand</h4>
                <span className="text-[10px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Reconciled</span>
                </span>
              </div>

              {/* Amount Figure */}
              <div>
                <div className="text-lg sm:text-[21px] font-black font-mono tracking-tight text-slate-900 tabular-nums group-hover:text-[#0066ff] transition-colors leading-tight">
                  PKR {formatCurrency(animatedCash)}
                </div>
              </div>

              {/* Growth Pill & Urdu Label */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.5%</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium font-sans truncate" dir="rtl">
                  کیش ان ہینڈ بیلنس
                </p>
              </div>

              {/* Mini-Chart: Sparkline with animated glow & hover nodes */}
              <div className="pt-1 relative">
                <svg viewBox="0 0 160 36" className="w-full h-7 overflow-visible">
                  <defs>
                    <linearGradient id="blueSpark" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#0066ff" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 5,26 Q 25,16 45,20 T 85,10 T 125,22 T 155,8"
                    fill="none"
                    stroke="url(#blueSpark)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="group-hover:stroke-[2.8] transition-all duration-300"
                  />
                  {[
                    { cx: 5, cy: 26, val: '20K' },
                    { cx: 45, cy: 20, val: '35K' },
                    { cx: 85, cy: 10, val: '48K' },
                    { cx: 125, cy: 22, val: '42K' },
                    { cx: 155, cy: 8, val: '59K' },
                  ].map((pt, i) => (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredNode({ card: 'cash', idx: i })}>
                      <circle
                        cx={pt.cx}
                        cy={pt.cy}
                        r="3.5"
                        className="fill-white stroke-[#0066ff] stroke-2 group-hover:r-4 group-hover:stroke-[2.5] transition-all duration-300"
                      />
                      {hoveredNode?.card === 'cash' && hoveredNode?.idx === i && (
                        <text
                          x={pt.cx}
                          y={pt.cy - 6}
                          textAnchor="middle"
                          className="text-[9px] font-mono font-bold fill-[#0066ff]"
                        >
                          {pt.val}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
                <div className="text-[9px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-0.5">
                  <span>● Daily Cash Flow</span>
                  <span className="font-mono">Drawer Active</span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-1">
              <div className="w-full bg-blue-50/90 group-hover:bg-[#0066ff] group-hover:text-white text-blue-700 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                <Settings className="w-3.5 h-3.5" />
                <span>Open Options</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-0.5" />
              </div>
            </div>
          </div>

          {/* BACK FACE (Revealed when Flipping) */}
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-gradient-to-br from-[#0066ff] via-blue-600 to-indigo-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xl border border-blue-300">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
              <Wallet className="w-6 h-6 text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-black tracking-tight">Opening Cash Vault</h4>
            <p className="text-[11px] text-blue-100 mt-1 font-sans" dir="rtl">کیش ان ہینڈ تفصیلات کھل رہی ہیں</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading Register...</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 2: CUSTOMER DUE (Purple Theme - 3D Flip Card)       */}
      {/* ======================================================== */}
      <div className="[perspective:1000px] h-full">
        <div
          onClick={() => handleCardClick('outstanding')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick('outstanding');
            }
          }}
          className={`group relative rounded-2xl transition-all duration-500 [transform-style:preserve-3d] cursor-pointer select-none h-full ${
            flippingCard === 'outstanding' ? '[transform:rotateY(180deg)_scale(1.03)] shadow-2xl' : ''
          }`}
          title="Click to flip and open Customer Balances Directory"
        >
          {/* FRONT FACE */}
          <div className="[backface-visibility:hidden] bg-white rounded-2xl p-4 sm:p-4.5 border border-purple-100/90 hover:border-purple-400 shadow-[0_4px_20px_-4px_rgba(168,85,247,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(168,85,247,0.16)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-400 group-hover:h-1.5 transition-all duration-300" />

            <div className="space-y-2.5">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Customer Due</h4>
                <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  <span>15-Day Terms</span>
                </span>
              </div>

              {/* Amount Figure */}
              <div>
                <div className="text-lg sm:text-[21px] font-black font-mono tracking-tight text-slate-900 tabular-nums group-hover:text-purple-600 transition-colors leading-tight">
                  PKR {formatCurrency(animatedCustomer)}
                </div>
              </div>

              {/* Growth Pill & Urdu Label */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 group-hover:bg-rose-100 transition-colors">
                  <TrendingDown className="w-3 h-3" />
                  <span>-8.3%</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium font-sans truncate" dir="rtl">
                  کسٹمرز کے ذمے کل رقم
                </p>
              </div>

              {/* Mini-Chart: Vertical Gradient Purple Bars */}
              <div className="pt-1">
                <div className="h-7 flex items-end justify-between gap-1.5 px-0.5">
                  {[35, 55, 45, 65, 50, 80, 100].map((height, i) => (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className="w-full bg-gradient-to-t from-purple-500 to-purple-300 rounded-xs group-hover:scale-y-115 group-hover:brightness-110 transition-all duration-300 origin-bottom"
                    />
                  ))}
                </div>
                <div className="text-[9px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-0.5">
                  <span>● Client Receivables</span>
                  <span className="font-mono">7 Clients Monitored</span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-1">
              <div className="w-full bg-purple-50/90 group-hover:bg-purple-600 group-hover:text-white text-purple-700 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                <Users className="w-3.5 h-3.5" />
                <span>View Directory</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-0.5" />
              </div>
            </div>
          </div>

          {/* BACK FACE (Revealed when Flipping) */}
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xl border border-purple-300">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
              <Users className="w-6 h-6 text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-black tracking-tight">Opening Directory</h4>
            <p className="text-[11px] text-purple-100 mt-1 font-sans" dir="rtl">کسٹمر ڈائریکٹری اور واجبات</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading Clients...</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 3: BANK BALANCE (Emerald Theme - 3D Flip Card)       */}
      {/* ======================================================== */}
      <div className="[perspective:1000px] h-full">
        <div
          onClick={() => handleCardClick('bank')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick('bank');
            }
          }}
          className={`group relative rounded-2xl transition-all duration-500 [transform-style:preserve-3d] cursor-pointer select-none h-full ${
            flippingCard === 'bank' ? '[transform:rotateY(180deg)_scale(1.03)] shadow-2xl' : ''
          }`}
          title="Click to flip and open Bank Accounts & Ledgers"
        >
          {/* FRONT FACE */}
          <div className="[backface-visibility:hidden] bg-white rounded-2xl p-4 sm:p-4.5 border border-emerald-100/90 hover:border-emerald-400 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(16,185,129,0.16)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 group-hover:h-1.5 transition-all duration-300" />

            <div className="space-y-2.5">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Bank Balance</h4>
                <span className="text-[10px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>Liquid Deposits</span>
                </span>
              </div>

              {/* Amount Figure */}
              <div>
                <div className="text-lg sm:text-[21px] font-black font-mono tracking-tight text-slate-900 tabular-nums group-hover:text-emerald-600 transition-colors leading-tight">
                  PKR {formatCurrency(animatedBank)}
                </div>
              </div>

              {/* Growth Pill & Urdu Label */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="w-3 h-3" />
                  <span>+10.1%</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium font-sans truncate" dir="rtl">
                  بینک اکاؤنٹس کا بیلنس
                </p>
              </div>

              {/* Mini-Chart: Vertical Gradient Emerald Bars */}
              <div className="pt-1">
                <div className="h-7 flex items-end justify-between gap-1.5 px-0.5">
                  {[40, 60, 50, 75, 60, 85, 100].map((height, i) => (
                    <div
                      key={i}
                      style={{ height: `${height}%` }}
                      className="w-full bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-xs group-hover:scale-y-115 group-hover:brightness-110 transition-all duration-300 origin-bottom"
                    />
                  ))}
                </div>
                <div className="text-[9px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-0.5">
                  <span>● Commercial Banks</span>
                  <span className="font-mono">2 Banks Verified</span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-1">
              <div className="w-full bg-emerald-50/90 group-hover:bg-emerald-600 group-hover:text-white text-emerald-700 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                <List className="w-3.5 h-3.5" />
                <span>View Ledgers</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-0.5" />
              </div>
            </div>
          </div>

          {/* BACK FACE (Revealed when Flipping) */}
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xl border border-emerald-300">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
              <Building2 className="w-6 h-6 text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-black tracking-tight">Opening Bank Ledgers</h4>
            <p className="text-[11px] text-emerald-100 mt-1 font-sans" dir="rtl">بینک کھاتہ جات اور ڈپازٹس</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Verifying Reserves...</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 4: RECOVERIES (Orange/Amber Theme - 3D Flip Card)    */}
      {/* ======================================================== */}
      <div className="[perspective:1000px] h-full">
        <div
          onClick={() => handleCardClick('recoveries')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick('recoveries');
            }
          }}
          className={`group relative rounded-2xl transition-all duration-500 [transform-style:preserve-3d] cursor-pointer select-none h-full ${
            flippingCard === 'recoveries' ? '[transform:rotateY(180deg)_scale(1.03)] shadow-2xl' : ''
          }`}
          title="Click to flip and open Recoveries Received Vouchers"
        >
          {/* FRONT FACE */}
          <div className="[backface-visibility:hidden] bg-white rounded-2xl p-4 sm:p-4.5 border border-amber-100/90 hover:border-amber-400 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(245,158,11,0.16)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400 group-hover:h-1.5 transition-all duration-300" />

            <div className="space-y-2.5">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Recoveries</h4>
                <span className="text-[10px] text-amber-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Collections</span>
                </span>
              </div>

              {/* Amount Figure */}
              <div>
                <div className="text-lg sm:text-[21px] font-black font-mono tracking-tight text-slate-900 tabular-nums group-hover:text-amber-600 transition-colors leading-tight">
                  PKR {formatCurrency(animatedRecovery)}
                </div>
              </div>

              {/* Growth Pill, Inflow Tag & Urdu Label */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                <div className="flex items-center gap-1">
                  <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                    <TrendingDown className="w-2.5 h-2.5" />
                    <span>-2.1%</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 font-mono tracking-wider">
                    INFLOW
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium font-sans truncate" dir="rtl">
                  وصول شدہ ریکوری رقم
                </p>
              </div>

              {/* Mini-Chart: Orange Sparkline with glowing wave nodes */}
              <div className="pt-1">
                <svg viewBox="0 0 160 36" className="w-full h-7 overflow-visible">
                  <defs>
                    <linearGradient id="amberSpark" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ea580c" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 5,24 Q 25,10 50,16 T 90,12 T 125,22 T 155,14"
                    fill="none"
                    stroke="url(#amberSpark)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="group-hover:stroke-[2.8] transition-all duration-300"
                  />
                  {[
                    { cx: 5, cy: 24, val: '15K' },
                    { cx: 50, cy: 16, val: '28K' },
                    { cx: 90, cy: 12, val: '45K' },
                    { cx: 125, cy: 22, val: '58K' },
                    { cx: 155, cy: 14, val: '70.4K' },
                  ].map((pt, i) => (
                    <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredNode({ card: 'recovery', idx: i })}>
                      <circle
                        cx={pt.cx}
                        cy={pt.cy}
                        r="3.5"
                        className="fill-white stroke-[#ea580c] stroke-2 group-hover:r-4 group-hover:stroke-[2.5] transition-all duration-300"
                      />
                      {hoveredNode?.card === 'recovery' && hoveredNode?.idx === i && (
                        <text
                          x={pt.cx}
                          y={pt.cy - 6}
                          textAnchor="middle"
                          className="text-[9px] font-mono font-bold fill-[#ea580c]"
                        >
                          {pt.val}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
                <div className="text-[9px] text-amber-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-0.5">
                  <span>● Recovery Vouchers</span>
                  <span className="font-mono">Cash + Cheques</span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-1">
              <div className="w-full bg-amber-50/90 group-hover:bg-amber-600 group-hover:text-white text-amber-800 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                <Download className="w-3.5 h-3.5" />
                <span>View Inflows</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-0.5" />
              </div>
            </div>
          </div>

          {/* BACK FACE (Revealed when Flipping) */}
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xl border border-amber-300">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
              <Receipt className="w-6 h-6 text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-black tracking-tight">Opening Inflows</h4>
            <p className="text-[11px] text-amber-100 mt-1 font-sans" dir="rtl">وصول شدہ ریکوری واؤچرز</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Fetching Receipts...</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CARD 5: TOTAL PAYABLE (Violet Theme - 3D Flip Card)      */}
      {/* ======================================================== */}
      <div className="[perspective:1000px] h-full">
        <div
          onClick={() => handleCardClick('payable')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick('payable');
            }
          }}
          className={`group relative rounded-2xl transition-all duration-500 [transform-style:preserve-3d] cursor-pointer select-none h-full ${
            flippingCard === 'payable' ? '[transform:rotateY(180deg)_scale(1.03)] shadow-2xl' : ''
          }`}
          title="Click to flip and open Liabilities & Payables"
        >
          {/* FRONT FACE */}
          <div className="[backface-visibility:hidden] bg-white rounded-2xl p-4 sm:p-4.5 border border-violet-100/90 hover:border-violet-400 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(139,92,246,0.16)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-pink-400 group-hover:h-1.5 transition-all duration-300" />

            <div className="space-y-2.5">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Total Payable</h4>
                <span className="text-[10px] text-violet-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-violet-500" />
                  <span>Liabilities</span>
                </span>
              </div>

              {/* Amount Figure */}
              <div>
                <div className="text-lg sm:text-[21px] font-black font-mono tracking-tight text-slate-900 tabular-nums group-hover:text-violet-600 transition-colors leading-tight">
                  PKR {formatCurrency(animatedPayable)}
                </div>
              </div>

              {/* CR Status Tag & Urdu Label */}
              <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
                <div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-800 font-mono tracking-wider">
                    CR
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium font-sans truncate" dir="rtl">
                  کمپنی کی واجب الادا رقم
                </p>
              </div>

              {/* Mini-Chart: Dotted Violet Horizontal Baseline */}
              <div className="pt-1">
                <svg viewBox="0 0 160 36" className="w-full h-7 overflow-visible">
                  <line
                    x1="5"
                    y1="18"
                    x2="155"
                    y2="18"
                    stroke="#c084fc"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    className="group-hover:stroke-violet-600 transition-colors duration-300"
                  />
                  {[5, 30, 55, 80, 105, 130, 155].map((cx, i) => (
                    <circle
                      key={i}
                      cx={cx}
                      cy="18"
                      r="3"
                      className="fill-white stroke-[#8b5cf6] stroke-2 group-hover:r-3.5 group-hover:stroke-violet-700 transition-all duration-300"
                    />
                  ))}
                </svg>
                <div className="text-[9px] text-violet-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pt-0.5">
                  <span>● Supplier Payables</span>
                  <span className="font-mono">Balanced (Cr)</span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="mt-3 pt-1">
              <div className="w-full bg-violet-50/90 group-hover:bg-violet-600 group-hover:text-white text-violet-800 rounded-xl px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                <Scale className="w-3.5 h-3.5" />
                <span>View Liabilities</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-0.5" />
              </div>
            </div>
          </div>

          {/* BACK FACE (Revealed when Flipping) */}
          <div className="[backface-visibility:hidden] [transform:rotateY(180deg)] absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 text-white rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-2xl border border-violet-300">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
              <Scale className="w-6 h-6 text-white animate-bounce" />
            </div>
            <h4 className="text-sm font-black tracking-tight">Opening Liabilities</h4>
            <p className="text-[11px] text-violet-100 mt-1 font-sans" dir="rtl">واجب الادا رقم تفصیلات</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold bg-white/20 px-3 py-1 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Verifying Ledgers...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
