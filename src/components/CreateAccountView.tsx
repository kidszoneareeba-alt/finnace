import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  Sparkles,
  Building,
  Phone,
  MapPin,
  Tag,
} from 'lucide-react';
import { Account, AccountCategory, BalanceType } from '../types';

interface CreateAccountViewProps {
  accounts: Account[];
  onSaveAccount: (account: Account) => boolean;
  onDeleteAccount: (accountId: string) => boolean;
  onViewLedger: (account: Account) => void;
}

export const CreateAccountView: React.FC<CreateAccountViewProps> = ({
  accounts,
  onSaveAccount,
  onDeleteAccount,
  onViewLedger,
}) => {
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AccountCategory>('Customer');
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [openingBalanceType, setOpeningBalanceType] = useState<BalanceType>('Dr');

  // UI state
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'All' | AccountCategory>('All');

  // Categories list per specification
  const categories: AccountCategory[] = ['Customer', 'Personal', 'Bank', 'Office Expense'];

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setCategory('Customer');
    setContact('');
    setLocation('');
    setOpeningBalance('0');
    setOpeningBalanceType('Dr');
    setErrorMessage('');
  };

  const handleEditClick = (acc: Account) => {
    setEditingId(acc.id);
    setCode(acc.code);
    setName(acc.name);
    setCategory(acc.category);
    setContact(acc.contact || '');
    setLocation(acc.location || '');
    setOpeningBalance(String(acc.openingBalance || 0));
    setOpeningBalanceType(acc.openingBalanceType || 'Dr');
    setErrorMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateNextCode = () => {
    let prefix = 'CUST-';
    if (category === 'Bank') prefix = 'BANK-';
    if (category === 'Office Expense') prefix = 'EXP-';
    if (category === 'Personal') prefix = 'PERS-';

    const existingWithPrefix = accounts.filter((a) => a.code.startsWith(prefix));
    const nextNum = existingWithPrefix.length + 101;
    setCode(`${prefix}${nextNum}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validations
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setErrorMessage('Account Code is required.');
      return;
    }

    if (!trimmedName) {
      setErrorMessage('Account Name is required.');
      return;
    }

    // Check duplicate account code
    const isDuplicate = accounts.some(
      (a) => a.code.toUpperCase() === trimmedCode && a.id !== editingId
    );
    if (isDuplicate) {
      setErrorMessage(`Account code "${trimmedCode}" already exists. Please use a unique code.`);
      return;
    }

    const newAccount: Account = {
      id: editingId || `acc_${Date.now()}`,
      code: trimmedCode,
      name: trimmedName,
      category,
      contact: contact.trim(),
      location: location.trim(),
      openingBalance: Math.abs(parseFloat(openingBalance) || 0),
      openingBalanceType: openingBalanceType || 'Dr',
      createdAt: editingId
        ? accounts.find((a) => a.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = onSaveAccount(newAccount);
    if (saved) {
      setSuccessMessage(
        editingId
          ? `Account ${trimmedCode} updated successfully!`
          : `Account ${trimmedCode} (${trimmedName}) registered successfully!`
      );
      resetForm();
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleDeleteClick = (account: Account) => {
    if (
      confirm(
        `Are you sure you want to delete account "${account.code} - ${account.name}"?`
      )
    ) {
      const deleted = onDeleteAccount(account.id);
      if (deleted) {
        setSuccessMessage(`Account ${account.code} removed.`);
        if (editingId === account.id) resetForm();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesCategory =
      selectedCategoryFilter === 'All' || acc.category === selectedCategoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      acc.code.toLowerCase().includes(q) ||
      acc.name.toLowerCase().includes(q) ||
      acc.location.toLowerCase().includes(q) ||
      acc.contact.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Title banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Create & Manage Accounts
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Register official business accounts, customers, bank ledgers, and office expenses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Total Registered:</span>
            <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
              {accounts.length} Accounts
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Account Registration Form */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit Account Details' : 'New Account Registration Form'}
            </h2>
          </div>
          {editingId && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
              Editing: {code}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Account Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Account Code <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateNextCode}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Auto-Suggest
                </button>
              </div>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CUST-106, BANK-HBL-01, EXP-105"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
              />
              <p className="text-[11px] text-slate-500 mt-1">Unique identifier code</p>
            </div>

            {/* Account Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Al-Madina Hardware / Mian Brothers Trading"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-[11px] text-slate-500 mt-1">Full legal or business title</p>
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AccountCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Customer / Personal / Bank / Office Expense</p>
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Contact Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 0300-1234567 or 042-35789900"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Pakistani mobile or PTCL landline</p>
            </div>

            {/* Location / Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Location / Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Shop #14, Hall Road / Badami Bagh, Lahore"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Market, Plaza, Sector, City (e.g. Lahore, Karachi)</p>
            </div>

            {/* Opening Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Opening Balance (PKR ₨)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">Starting balance amount in PKR</p>
            </div>

            {/* Balance Nature (Dr / Cr) Option */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Balance Nature (Dr / Cr) <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                    openingBalanceType === 'Dr'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {openingBalanceType === 'Dr' ? 'DEBIT (Dr)' : 'CREDIT (Cr)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpeningBalanceType('Dr')}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    openingBalanceType === 'Dr'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span className="text-sm">Dr</span>
                    <span className="text-[11px] font-medium opacity-90">(Debit)</span>
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 ${
                      openingBalanceType === 'Dr' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    Receivable / بنام
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpeningBalanceType('Cr')}
                  className={`px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                    openingBalanceType === 'Cr'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <span className="text-sm">Cr</span>
                    <span className="text-[11px] font-medium opacity-90">(Credit)</span>
                  </div>
                  <span
                    className={`text-[10px] mt-0.5 ${
                      openingBalanceType === 'Cr' ? 'text-amber-100' : 'text-slate-500'
                    }`}
                  >
                    Advance / Payable / جمع
                  </span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {openingBalanceType === 'Dr'
                  ? 'Dr: Customer owes money to business / Asset'
                  : 'Cr: Advance paid by customer / Payable'}
              </p>
            </div>
          </div>

          {/* Form Action Buttons: Save, Edit, and Cancel per prompt */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? 'Update Account' : 'Save Account'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Accounts Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
            {(['All', ...categories] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code, name, city (e.g. CUST-101, Lahore, Karachi)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Opening Bal</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No accounts found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {acc.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-600 font-medium">
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {acc.contact || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {acc.location || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <span className="text-slate-900 font-medium">
                          PKR {Number(acc.openingBalance || 0).toLocaleString('en-PK', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            (acc.openingBalanceType || 'Dr') === 'Cr'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {acc.openingBalanceType || 'Dr'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewLedger(acc)}
                          title="View Ledger Statement"
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(acc)}
                          title="Edit Account"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(acc)}
                          title="Delete Account"
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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
    </div>
  );
};
