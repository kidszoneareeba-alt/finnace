import React, { useState } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Check,
  Eye,
  EyeOff,
  TrendingUp,
  Headphones,
  Zap,
  Globe,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { email: string; name: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('aijaz');
  const [password, setPassword] = useState('5050');
  const [showPassword, setShowPassword] = useState(false);
  const [keepActive, setKeepActive] = useState(true);
  const [language, setLanguage] = useState<'ur' | 'en'>('ur');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('براہ کرم لاگ ان آئی ڈی اور پاس ورڈ دونوں درج کریں۔ (Please enter both Login ID and Password)');
      return;
    }

    // Verify requested credentials: ID "aijaz" and Password "5050"
    const isValidId = cleanUser === 'aijaz' || cleanUser === 'aijaz@ejazbusiness.pk' || cleanUser === 'ejaz';
    const isValidPassword = cleanPass === '5050';

    if (!isValidId || !isValidPassword) {
      setError('غلط لاگ ان تفصیلات! درست لاگ ان آئی ڈی: aijaz اور پاس ورڈ: 5050 ہے۔ (Invalid Credentials. Use ID: aijaz & Password: 5050)');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLogin({
        email: 'aijaz',
        name: 'Ejaz Ali (Managing Director)',
      });
    }, 350);
  };

  const handleFillCredentials = () => {
    setUsername('aijaz');
    setPassword('5050');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Soft Fluid Ambient Waves matching reference image */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-200/25 rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-sky-200/30 rounded-full blur-3xl pointer-events-none -ml-40 -mb-40" />

      {/* Top Header Row with Logo and Language Switcher */}
      <header className="px-6 sm:px-12 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          {/* Logo Squircle with Rising Chart */}
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0066ff] border border-blue-200/80 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              EJaz Finance Pro
            </h1>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight mt-1">
              Your Financial Dashboard
            </p>
          </div>
        </div>

        {/* Language selector pill */}
        <button
          type="button"
          onClick={() => setLanguage((prev) => (prev === 'ur' ? 'en' : 'ur'))}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'ur' ? 'Urdu (اردو)' : 'English'}</span>
        </button>
      </header>

      {/* Main 2-Column Content Area */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-4 sm:py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Column: Brand Pitch, Features & Laptop Illustration */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          <div className="space-y-3 sm:space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Manage Your Finances <br />
              <span className="text-[#0066ff]">Smarter & Easier</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl">
              A powerful and simple solution for tracking accounts, managing transactions and growing your business.
            </p>
          </div>

          {/* 3 Bullet Checklist Items matching reference image */}
          <div className="space-y-2.5">
            {[
              'Real-time Financial Reports',
              'Secure & Reliable',
              'Easy to Use Interface',
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#0066ff] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="text-sm font-bold text-slate-800">{text}</span>
              </div>
            ))}
          </div>

          {/* Laptop Mockup & 3D Financial Graph Illustration */}
          <div className="relative pt-4 max-w-lg select-none pointer-events-none">
            {/* Floating Glass Pill: Grow Your Business */}
            <div className="absolute -top-1 right-8 z-20 bg-white/90 backdrop-blur-md border border-blue-200/90 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 animate-bounce duration-1000">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0066ff] flex items-center justify-center">
                <TrendingUp className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 leading-none">Grow Your</p>
                <p className="text-xs font-black text-[#0066ff]">Business</p>
              </div>
            </div>

            {/* Stylized Laptop Chassis */}
            <div className="relative mx-auto bg-slate-800 rounded-t-2xl p-2.5 shadow-2xl border-2 border-slate-700/80 max-w-md">
              {/* Laptop Screen with Dashboard Interface Mockup */}
              <div className="bg-slate-50 rounded-lg p-2.5 space-y-2 border border-slate-300">
                {/* Mini Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="text-[9px] font-bold text-slate-800 font-mono">EJaz Finance Pro</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-8 h-2 rounded-full bg-slate-200" />
                    <div className="w-4 h-2 rounded-full bg-blue-500" />
                  </div>
                </div>

                {/* Mini Metric Cards */}
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="bg-white p-1.5 rounded border border-blue-100 shadow-2xs">
                    <p className="text-[7px] text-slate-400">Cash in Hand</p>
                    <p className="text-[8px] font-bold text-slate-900 font-mono">59,150</p>
                    <div className="w-full h-1 bg-emerald-400 rounded-full mt-1" />
                  </div>
                  <div className="bg-white p-1.5 rounded border border-purple-100 shadow-2xs">
                    <p className="text-[7px] text-slate-400">Customer Due</p>
                    <p className="text-[8px] font-bold text-purple-700 font-mono">2,620,600</p>
                    <div className="w-full h-1 bg-purple-400 rounded-full mt-1" />
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-100 shadow-2xs">
                    <p className="text-[7px] text-slate-400">Bank Balance</p>
                    <p className="text-[8px] font-bold text-emerald-700 font-mono">2,782,000</p>
                    <div className="w-full h-1 bg-emerald-500 rounded-full mt-1" />
                  </div>
                  <div className="bg-white p-1.5 rounded border border-amber-100 shadow-2xs">
                    <p className="text-[7px] text-slate-400">Recoveries</p>
                    <p className="text-[8px] font-bold text-amber-700 font-mono">70,400</p>
                    <div className="w-full h-1 bg-amber-400 rounded-full mt-1" />
                  </div>
                </div>

                {/* Mini Chart Mockup */}
                <div className="bg-white p-2 rounded border border-slate-200/80 flex items-end justify-between h-10 gap-1 px-2">
                  <div className="w-3 bg-blue-300 rounded-t h-4" />
                  <div className="w-3 bg-blue-400 rounded-t h-6" />
                  <div className="w-3 bg-[#0066ff] rounded-t h-8" />
                  <div className="w-3 bg-blue-600 rounded-t h-9" />
                  <div className="w-3 bg-emerald-400 rounded-t h-7" />
                  <div className="w-3 bg-emerald-500 rounded-t h-10" />
                </div>
              </div>

              {/* Laptop Keyboard Base */}
              <div className="h-2.5 bg-slate-700 rounded-b-md mt-1 mx-auto w-full" />
            </div>

            {/* 3D Ascending Blue Bars with Upward Arrow in Background */}
            <div className="absolute right-0 bottom-4 flex items-end gap-1.5 opacity-90 z-0">
              <div className="w-3.5 h-8 bg-blue-300/80 rounded-t" />
              <div className="w-3.5 h-12 bg-blue-400/80 rounded-t" />
              <div className="w-3.5 h-16 bg-blue-500/80 rounded-t" />
              <div className="w-3.5 h-20 bg-[#0066ff] rounded-t" />
              <div className="w-3.5 h-24 bg-blue-700 rounded-t" />
            </div>
          </div>

          {/* Bottom Trust Row Badges matching reference image */}
          <div className="pt-2 flex flex-wrap items-center gap-6 sm:gap-8 border-t border-slate-200/80 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Bank-Grade Security</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>24/7 Support</span>
            </div>
            <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Lightning Fast Performance</span>
            </div>
          </div>
        </div>

        {/* Right Column: Floating Login Card matching reference image */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,102,255,0.08)] border border-slate-100 relative">
            {/* Centered Top Squircle Icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0066ff] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
              <TrendingUp className="w-7 h-7 stroke-[2.5]" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1 mb-5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sign In to Business Portal
              </h3>
              <p className="text-xs text-slate-500">
                Access your account and manage your business
              </p>
            </div>

            {/* Official Access / Demo Credentials Box matching reference image */}
            <div className="mb-5 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>(Official Access) مقاصد لاگ ان</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillCredentials}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 text-[#0066ff] font-bold text-[11px] rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Auto-Fill</span>
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-100 flex-1">
                  <span className="text-[10px] text-slate-400 font-sans">Login ID:</span>
                  <span className="font-bold text-[#0066ff]">aijaz</span>
                </div>
                <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-blue-100 flex-1">
                  <span className="text-[10px] text-slate-400 font-sans">Password:</span>
                  <span className="font-bold text-slate-700">•••••</span>
                  <span className="text-[9px] text-slate-400 font-sans ml-auto">(5050)</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <span className="font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Login ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Login ID / یوزر نیم
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your Login ID"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0066ff] rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden shadow-2xs font-medium"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Password / پاس ورڈ
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-[#0066ff] hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your Password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#0066ff] rounded-xl text-xs text-slate-900 placeholder-slate-400 transition-all focus:outline-hidden shadow-2xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Keep session active checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="keepSession"
                  checked={keepActive}
                  onChange={(e) => setKeepActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0066ff] border-slate-300 focus:ring-[#0066ff] cursor-pointer"
                />
                <label htmlFor="keepSession" className="text-xs text-slate-600 cursor-pointer select-none">
                  Keep session active <span className="text-[11px] text-slate-400">(سیشن فعال رکھیں)</span>
                </label>
              </div>

              {/* Main Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-[#0066ff] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/30 cursor-pointer disabled:opacity-50"
              >
                <span>Login to Dashboard / لاگ ان کریں</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary 1-Click Fill Button matching reference image */}
              <button
                type="button"
                onClick={handleFillCredentials}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#0066ff] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-blue-200 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0066ff]" />
                <span>Fill ID "aijaz" & Pass "5050" Click to Fill</span>
              </button>
            </form>

            {/* Footer Security Note */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Encrypted Local Ledger Vault • EJaz Finance Pro 2026</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer minimal info */}
      <footer className="px-6 py-3 text-center text-xs text-slate-400 relative z-20">
        EJaz Finance Pro • Professional Pakistani Business Accounting & Recovery Software
      </footer>
    </div>
  );
};
