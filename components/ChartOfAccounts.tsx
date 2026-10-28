import React, { useState, useMemo } from 'react';
import type { Account, Product, Warehouse, Customer, Supplier } from '../types.ts';
import { accounts as defaultAccounts } from '../data.ts';
import AddAccountModal from './AddAccountModal.tsx';
import { exportToExcel } from '../utils/exportToExcel.ts';

interface ChartOfAccountsProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  journalEntries: any[];
  products?: Product[];
  warehouses?: Warehouse[];
  customers?: Customer[];
  suppliers?: Supplier[];
}

interface AccountNodeProps {
  account: Account;
  allAccounts: Account[];
  level: number;
  onAddSubAccount: (parentId: string) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  onViewLedger: (account: Account) => void;
  journalEntries: any[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  products?: Product[];
  warehouses?: Warehouse[];
  customers?: Customer[];
  suppliers?: Supplier[];
  showAnalytical?: boolean;
}

const AccountNode: React.FC<AccountNodeProps> = ({
  account, allAccounts, level, onAddSubAccount, onEditAccount, onDeleteAccount, onViewLedger,
  journalEntries, expandedIds, toggleExpand, products, warehouses,
  customers = [], suppliers = [], showAnalytical = false
}) => {
  const children = allAccounts.filter(a => a.parentId === account.id).sort((a, b) => a.code.localeCompare(b.code));
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(account.id);

  const calculateBalance = (accId: string, accCode?: string): number => {
    let total = 0;

    const directLines = journalEntries.flatMap(je => {
      if (!je) return [];
      const lines = typeof je.lines === 'string' ? (() => { try { return JSON.parse(je.lines); } catch { return []; } })() : (je.lines || []);
      return Array.isArray(lines) ? lines : [];
    }).filter((l: any) => l && (l.accountId === accId || (accCode && l.accountId === accCode)));

    total += directLines.reduce((sum, line) => sum + ((Number(line.debit) || 0) - (Number(line.credit) || 0)), 0);

    const childAccs = allAccounts.filter(a => a.parentId === accId);
    for (const child of childAccs) {
      total += calculateBalance(child.id, child.code);
    }
    
    return total;
  };

  const balance = calculateBalance(account.id, account.code);
  const absBalance = Math.abs(balance);
  const balanceType = balance > 0 ? 'مدين' : balance < 0 ? 'دائن' : '-';
  const isCreditNormal = account.type === 'خصوم' || account.type === 'حقوق ملكية' || account.type === 'إيرادات';
  const displayColor = balance === 0
    ? 'text-gray-400'
    : isCreditNormal
      ? (balance < 0 ? 'text-blue-700 font-bold' : 'text-red-600 font-bold')
      : (balance > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold');

  const indentPx = level * 20;

  const rowBg =
    level === 0 ? 'bg-slate-100 font-bold text-slate-800' :
    level === 1 ? 'bg-blue-50/60 font-semibold text-slate-700' :
    'bg-white text-slate-600';

  // Check if this is the receivables or payables control account
  const isCustomersAccount = account.code === '1103' || account.id === '1103';
  const isSuppliersAccount = account.code === '2101' || account.id === '2101';

  return (
    <>
      <tr className={`border-b border-gray-100 hover:brightness-95 transition-all group ${rowBg}`}>
        {/* Account Name + Code */}
        <td className="p-2.5 text-sm" style={{ paddingRight: `${indentPx + 12}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account.id)}
                className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors flex-shrink-0"
                title={isExpanded ? 'طي' : 'فتح'}
              >
                <svg className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"></span>
              </span>
            )}
            <span className="font-mono bg-gray-200/70 px-1.5 py-0.5 rounded text-xs text-gray-500 flex-shrink-0">{account.code}</span>
            <span 
              onClick={() => onViewLedger(account)}
              className="cursor-pointer hover:text-indigo-600 transition-colors hover:underline"
              title="انقر لعرض كشف حركة وسجل سندات الحساب"
            >
              {account.name}
            </span>
            {hasChildren && (
              <span className="text-xs text-gray-400 font-normal">({children.length})</span>
            )}
            {account.isSystem && (
              <span className="text-[10px] bg-gray-100 text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded font-normal">نظامي</span>
            )}
          </div>
        </td>

        {/* Type / Nature */}
        <td className="p-2.5 text-sm text-gray-500">
          <div className="flex flex-col gap-1">
            <span>{account.type}</span>
            {account.statementType === 'balance_sheet' && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded w-fit">مركز مالي</span>}
            {account.statementType === 'income_statement' && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded w-fit">قائمة دخل</span>}
          </div>
        </td>

        {/* Balance */}
        <td 
          className={`p-2.5 text-sm font-bold ${displayColor} cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => onViewLedger(account)}
          title="انقر لفتح كشف حساب تفصيلي"
        >
          <div className="flex items-center gap-1.5">
            <span>{balance !== 0 ? `${absBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}` : '-'}</span>
            {balance !== 0 && (
              <span className="text-[10px] font-normal text-indigo-500 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-100">
                🔍
              </span>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="p-2.5 text-sm">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* View Ledger */}
            <button
              onClick={() => onViewLedger(account)}
              title="عرض حركة الحساب وسجل السندات والعمليات"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200"
            >
              <span>👁️</span>
              <span>كشف الحركة</span>
            </button>

            {/* Add Sub-account button */}
            {account.isGroup !== false && (
              <button
                onClick={() => onAddSubAccount(account.id)}
                title="إضافة حساب فرعي"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors border border-blue-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                فرعي
              </button>
            )}

            {/* Edit button */}
            <button
              onClick={() => onEditAccount(account)}
              title="تعديل الحساب"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-medium transition-colors border border-amber-200"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              تعديل
            </button>

            {/* Delete button */}
            {!account.isSystem && (
              <button
                onClick={() => onDeleteAccount(account)}
                title="حذف الحساب"
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors border border-red-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                حذف
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Analytical Sub-nodes for Customers */}
      {isCustomersAccount && showAnalytical && isExpanded && customers.map(cust => (
        <tr key={cust.id} className="border-b border-indigo-50/60 bg-emerald-50/25 hover:bg-emerald-50/50 transition-colors">
          <td className="p-2 text-xs" style={{ paddingRight: `${indentPx + 36}px` }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-mono text-[11px] bg-emerald-100 text-emerald-800 px-1 rounded">{cust.id}</span>
              <span className="font-semibold text-slate-800">عميل: {cust.name}</span>
              {cust.companyName && <span className="text-slate-400 text-[11px]">({cust.companyName})</span>}
            </div>
          </td>
          <td className="p-2 text-xs text-slate-400">حساب تحليلي عميل</td>
          <td className="p-2 text-xs font-bold text-emerald-700">
            {(Number(cust.currentBalance || cust.openingBalance) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} مدين
          </td>
          <td className="p-2 text-xs">
            <span className="text-[11px] text-emerald-600 font-medium">مستقل بكشف حساب العميل</span>
          </td>
        </tr>
      ))}

      {/* Analytical Sub-nodes for Suppliers */}
      {isSuppliersAccount && showAnalytical && isExpanded && suppliers.map(sup => (
        <tr key={sup.id} className="border-b border-indigo-50/60 bg-purple-50/25 hover:bg-purple-50/50 transition-colors">
          <td className="p-2 text-xs" style={{ paddingRight: `${indentPx + 36}px` }}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span className="font-mono text-[11px] bg-purple-100 text-purple-800 px-1 rounded">{sup.id}</span>
              <span className="font-semibold text-slate-800">مورد: {sup.name}</span>
              {sup.companyName && <span className="text-slate-400 text-[11px]">({sup.companyName})</span>}
            </div>
          </td>
          <td className="p-2 text-xs text-slate-400">حساب تحليلي مورد</td>
          <td className="p-2 text-xs font-bold text-purple-700">
            {(Number(sup.currentBalance || sup.openingBalance) || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} دائن
          </td>
          <td className="p-2 text-xs">
            <span className="text-[11px] text-purple-600 font-medium">مستقل بكشف حساب المورد</span>
          </td>
        </tr>
      ))}

      {isExpanded && hasChildren && children.map(child => (
        <AccountNode
          key={child.id}
          account={child}
          allAccounts={allAccounts}
          level={level + 1}
          onAddSubAccount={onAddSubAccount}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          onViewLedger={onViewLedger}
          journalEntries={journalEntries}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          products={products}
          warehouses={warehouses}
          customers={customers}
          suppliers={suppliers}
          showAnalytical={showAnalytical}
        />
      ))}
    </>
  );
};

// ── Account Ledger Modal (كشف حركة الحساب وسجل السندات) ──────────────────────────
interface AccountLedgerModalProps {
  account: Account;
  journalEntries: any[];
  onClose: () => void;
}

const AccountLedgerModal: React.FC<AccountLedgerModalProps> = ({ account, journalEntries, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract all movements touching this account or its code
  const allMovements = useMemo(() => {
    const list: any[] = [];
    (journalEntries || []).forEach(je => {
      if (!je) return;
      const lines = typeof je.lines === 'string' ? (() => { try { return JSON.parse(je.lines); } catch { return []; } })() : (je.lines || []);
      if (!Array.isArray(lines)) return;

      lines.forEach((l: any) => {
        if (!l) return;
        const matchesId = l.accountId === account.id || l.accountId === account.code;
        if (matchesId) {
          list.push({
            id: je.id,
            date: je.date || (je.createdAt ? je.createdAt.split('T')[0] : ''),
            referenceId: je.referenceId || '',
            referenceType: je.referenceType || je.type || 'Manual',
            description: je.description || '',
            accountName: l.accountName || account.name,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
          });
        }
      });
    });

    // Sort chronologically ascending
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Compute running balance
    let running = 0;
    return list.map(m => {
      running += (m.debit - m.credit);
      return { ...m, runningBalance: running };
    });
  }, [account, journalEntries]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    return allMovements.filter(m => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || m.description.toLowerCase().includes(q) || m.referenceId.toLowerCase().includes(q);
      const matchesStart = !startDate || m.date >= startDate;
      const matchesEnd = !endDate || m.date <= endDate;
      return matchesSearch && matchesStart && matchesEnd;
    });
  }, [allMovements, searchTerm, startDate, endDate]);

  const totalDebit = filteredMovements.reduce((s, m) => s + m.debit, 0);
  const totalCredit = filteredMovements.reduce((s, m) => s + m.credit, 0);
  const netBalance = totalDebit - totalCredit;

  const isCreditNormal = account.type === 'خصوم' || account.type === 'حقوق ملكية' || account.type === 'إيرادات';
  const balanceNature = netBalance > 0 ? 'مدين' : netBalance < 0 ? 'دائن' : 'متزن';

  const handleExport = () => {
    const dataToExport = filteredMovements.map((m, idx) => ({
      'م': idx + 1,
      'التاريخ': m.date,
      'رقم السند/المرجع': m.referenceId || m.id,
      'نوع المعاملة': m.referenceType,
      'البيان والشرح': m.description,
      'مدين': m.debit,
      'دائن': m.credit,
      'الرصيد التراكمي': m.runningBalance
    }));
    exportToExcel(dataToExport, `كشف_حساب_${account.code}_${account.name}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl shadow-inner">
              📑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-indigo-500/30 border border-indigo-400/40 text-xs px-2 py-0.5 rounded font-bold">{account.code}</span>
                <h2 className="text-xl font-bold tracking-tight">كشف حركة وسجل سندات: {account.name}</h2>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">طبيعة الحساب: {account.type} | دفتر الأستاذ العام وتفاصيل القيود المسجلة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>طباعة</span>
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-700/60 hover:bg-emerald-600/70 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>تصدير إكسيل</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">إجمالي المدين</p>
            <p className="text-base font-extrabold text-emerald-600 mt-0.5">{totalDebit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">إجمالي الدائن</p>
            <p className="text-base font-extrabold text-blue-600 mt-0.5">{totalCredit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">الرصيد الصافي الحالي</p>
            <p className={`text-base font-extrabold mt-0.5 ${netBalance === 0 ? 'text-slate-400' : isCreditNormal ? (netBalance < 0 ? 'text-blue-700' : 'text-red-600') : (netBalance > 0 ? 'text-emerald-700' : 'text-red-600')}`}>
              {Math.abs(netBalance).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م ({balanceNature})
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">عدد الحركات المسجلة</p>
            <p className="text-base font-extrabold text-slate-800 mt-0.5">{filteredMovements.length} حركة</p>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="بحث برقم السند أو البيان أو اسم الطرف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">الفترة من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="font-medium text-slate-600">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {(startDate || endDate || searchTerm) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 underline font-medium"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredMovements.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 w-24">التاريخ</th>
                    <th className="p-3 w-28">رقم السند/المرجع</th>
                    <th className="p-3 w-28">نوع المعاملة</th>
                    <th className="p-3">البيان والشرح التفصيلي</th>
                    <th className="p-3 w-28 text-emerald-700">مدين</th>
                    <th className="p-3 w-28 text-blue-700">دائن</th>
                    <th className="p-3 w-32 font-mono">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-600">{m.date}</td>
                      <td className="p-3">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                          {m.referenceId || m.id}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          m.referenceId.startsWith('CP') ? 'bg-emerald-100 text-emerald-800' :
                          m.referenceId.startsWith('SP') ? 'bg-amber-100 text-amber-800' :
                          m.referenceId.startsWith('TR') ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {m.referenceId.startsWith('CP') ? 'سند قبض' :
                           m.referenceId.startsWith('SP') ? 'سند صرف' :
                           m.referenceId.startsWith('TR') ? 'تحويل مالي' :
                           m.referenceType || 'قيد يومية'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{m.description}</td>
                      <td className="p-3 font-bold text-emerald-600 font-mono">
                        {m.debit > 0 ? m.debit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 font-bold text-blue-600 font-mono">
                        {m.credit > 0 ? m.credit.toLocaleString('ar-EG', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-3 font-bold text-slate-700 font-mono bg-slate-50/60">
                        {Math.abs(m.runningBalance).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {m.runningBalance > 0 ? 'مدين' : m.runningBalance < 0 ? 'دائن' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-slate-600 font-bold text-sm">لا توجد حركات مسجلة على هذا الحساب</p>
              <p className="text-slate-400 text-xs mt-1">ستظهر الحركات تلقائياً بمجرد إنشاء سندات قبض أو صرف أو فواتير مرتبطة به.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            💡 يتم احتساب الحركات آلياً من واقع قيود اليومية المعززة بسندات الخزينة والفواتير.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

// ── Delete Confirmation Modal ──────────────────────────────────────────────
interface DeleteConfirmModalProps {
  account: Account;
  onClose: () => void;
  onConfirm: () => void;
  warning?: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ account, onClose, onConfirm, warning }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">تأكيد حذف الحساب</h3>
          <p className="text-sm text-gray-500">هذا الإجراء لا يمكن التراجع عنه</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-700">
          سيتم حذف الحساب: <span className="font-bold text-gray-900">{account.code} - {account.name}</span>
        </p>
      </div>

      {warning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{warning}</p>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">إلغاء</button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
        >
          نعم، احذف الحساب
        </button>
      </div>
    </div>
  </div>
);

// ── Error/Info Modal ──────────────────────────────────────────────────────
interface InfoModalProps {
  message: string;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900">تعذّر تنفيذ العملية</h3>
      </div>
      <p className="text-sm text-gray-700 mb-5 leading-relaxed">{message}</p>
      <div className="flex justify-end">
        <button onClick={onClose} className="px-5 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition-colors">حسناً</button>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
  accounts, setAccounts, journalEntries = [], products = [], warehouses = [],
  customers = [], suppliers = []
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentAccount, setParentAccount] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  // Ledger Modal State
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<Account | null>(null);

  // Toggle Analytical Accounts (Customers & Suppliers)
  const [showAnalytical, setShowAnalytical] = useState(false);

  // Delete flow state
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Error info modal state
  const [infoMessage, setInfoMessage] = useState('');
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const showInfo = (msg: string) => {
    setInfoMessage(msg);
    setIsInfoOpen(true);
  };

  // ── Expand/Collapse helpers ──────────────────────────────────────────
  const getAllIds = (maxDepth?: number): string[] => {
    const result: string[] = [];
    const walk = (parentId: string | null, currentDepth: number) => {
      const children = accounts.filter(a => a.parentId === parentId);
      for (const child of children) {
        if (maxDepth === undefined || currentDepth < maxDepth) {
          result.push(child.id);
          walk(child.id, currentDepth + 1);
        }
      }
    };
    walk(null, 0);
    return result;
  };

  // Initialize with levels 1 & 2 expanded by default
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    accounts.filter(a => a.parentId === null || a.parentId === '1' || a.parentId === '2').forEach(a => ids.add(a.id));
    return ids;
  });

  const handleExpandAll = () => setExpandedIds(new Set(getAllIds()));
  const handleCollapseAll = () => setExpandedIds(new Set());
  const handleExpandLevel1 = () => setExpandedIds(new Set(getAllIds(1)));
  const handleExpandLevel2 = () => setExpandedIds(new Set(getAllIds(2)));

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Add modal ───────────────────────────────────────────────────────
  const handleOpenModal = (parentId: string | null = null) => {
    setEditingAccount(null);
    setParentAccount(parentId);
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setParentAccount(account.parentId);
    setIsModalOpen(true);
  };

  const handleSaveAccount = (accountData: Omit<Account, 'id'> & { id?: string }) => {
    if (editingAccount) {
      setAccounts(prev => prev.map(a => a.id === editingAccount.id ? { ...a, ...accountData } as Account : a));
    } else {
      const newAccount: Account = {
        ...accountData,
        id: accountData.id || `acc_${Date.now()}`
      } as Account;
      setAccounts(prev => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
      if (newAccount.parentId) {
        setExpandedIds(prev => new Set([...prev, newAccount.parentId!]));
      }
    }
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  // ── Delete flow ─────────────────────────────────────────────────────
  const handleDeleteAccount = (account: Account) => {
    if (account.isSystem) {
      showInfo(`الحساب "${account.name}" هو حساب نظامي أساسي لا يمكن حذفه.`);
      return;
    }

    const childAccounts = accounts.filter(a => a.parentId === account.id);
    if (childAccounts.length > 0) {
      showInfo(
        `لا يمكن حذف الحساب "${account.name}" لوجود عدد ${childAccounts.length} حساب تابع. يرجى نقل الحسابات الفرعية أولاً.`
      );
      return;
    }

    const hasMovements = (journalEntries || []).some(je => {
      const lines = typeof je.lines === 'string' ? (() => { try { return JSON.parse(je.lines); } catch { return []; } })() : (je.lines || []);
      return Array.isArray(lines) && lines.some((l: any) => l.accountId === account.id || l.accountId === account.code);
    });

    let warning = '';
    if (hasMovements) {
      warning = `تنبيه: هذا الحساب مسجل عليه حركات قيود يومية وسندات. حذفه سيؤثر على توازن الدليل المحاسبي.`;
    }

    setDeleteTarget(account);
    setDeleteWarning(warning);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id));
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteWarning('');
  };

  const handleLoadDefaults = () => {
    if (window.confirm('هل تريد إعادة تحميل دليل الحسابات الافتراضي؟')) {
      setAccounts(defaultAccounts);
    }
  };

  const rootAccounts = accounts.filter(a => a.parentId === null).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">شجرة الحسابات (الدليل المحاسبي)</h1>
          <p className="text-sm text-gray-500 mt-1">عرض وتخصيص الدليل المحاسبي، متابعة الأرصدة، وعرض كشوف حركة السندات والعمليات</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Analytical Toggle */}
          <button
            type="button"
            onClick={() => setShowAnalytical(prev => !prev)}
            className={`font-bold py-2 px-3.5 rounded-lg border text-xs flex items-center gap-2 transition-all shadow-sm ${
              showAnalytical
                ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/20'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="إظهار العملاء والموردين كحسابات تحليلية تابعة داخل شجرة الحسابات"
          >
            <span>👥</span>
            <span>{showAnalytical ? 'إخفاء الحسابات التحليلية' : 'إظهار حسابات العملاء والموردين'}</span>
          </button>

          <button
            onClick={() => handleOpenModal(null)}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>إضافة حساب رئيسي</span>
          </button>
        </div>
      </div>

      {/* Expand & Filter Controls */}
      {rootAccounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-600 ml-1">المستويات:</span>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
            طي الكل
          </button>
          <button
            onClick={handleExpandLevel1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            المستوى الأول
          </button>
          <button
            onClick={handleExpandLevel2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors shadow-sm"
          >
            المستوى الثاني
          </button>
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors shadow-sm"
          >
            فتح كافة المستويات
          </button>
          <span className="text-xs text-slate-400 mr-auto font-medium">
            💡 انقر على زر "كشف الحركة" أو على أي رصيد لعرض الحركات والسندات المرتبطة به.
          </span>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {rootAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-xs font-bold tracking-wide text-right text-slate-700">الحساب والكود</th>
                  <th className="p-3 text-xs font-bold tracking-wide text-slate-700">طبيعة الحساب</th>
                  <th className="p-3 text-xs font-bold tracking-wide text-slate-700">الرصيد المالي الحالي</th>
                  <th className="p-3 text-xs font-bold tracking-wide text-slate-700">إجراءات الحساب</th>
                </tr>
              </thead>
              <tbody>
                {rootAccounts.map(account => (
                  <AccountNode
                    key={account.id}
                    account={account}
                    allAccounts={accounts}
                    level={0}
                    onAddSubAccount={handleOpenModal}
                    onEditAccount={handleEditAccount}
                    onDeleteAccount={handleDeleteAccount}
                    onViewLedger={(acc) => setSelectedAccountForLedger(acc)}
                    journalEntries={journalEntries || []}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    products={products}
                    warehouses={warehouses}
                    customers={customers}
                    suppliers={suppliers}
                    showAnalytical={showAnalytical}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 m-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">لا توجد حسابات مسجلة</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">يبدو أن شجرة الحسابات فارغة. يمكنك إعادة تحميل البيانات الافتراضية للنظام.</p>
            <button
              onClick={handleLoadDefaults}
              className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              إعادة تحميل البيانات الافتراضية
            </button>
          </div>
        )}
      </div>

      {/* Account Ledger Modal (كشف حركة وسجل سندات الحساب) */}
      {selectedAccountForLedger && (
        <AccountLedgerModal
          account={selectedAccountForLedger}
          journalEntries={journalEntries}
          onClose={() => setSelectedAccountForLedger(null)}
        />
      )}

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <AddAccountModal
          onClose={() => { setIsModalOpen(false); setEditingAccount(null); }}
          onSave={handleSaveAccount}
          accounts={accounts}
          parentId={parentAccount}
          editingAccount={editingAccount}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteTarget && (
        <DeleteConfirmModal
          account={deleteTarget}
          warning={deleteWarning}
          onClose={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
          onConfirm={confirmDelete}
        />
      )}

      {/* Info / Error Modal */}
      {isInfoOpen && (
        <InfoModal
          message={infoMessage}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </div>
  );
};

export default ChartOfAccounts;
