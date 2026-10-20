import React, { useState } from 'react';
import type { Account, Product, Warehouse } from '../types.ts';
import { accounts as defaultAccounts } from '../data.ts';
import AddAccountModal from './AddAccountModal.tsx';

interface ChartOfAccountsProps {
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  journalEntries: any[];
  products?: Product[];
  warehouses?: Warehouse[];
}

interface AccountNodeProps {
  account: Account;
  allAccounts: Account[];
  level: number;
  onAddSubAccount: (parentId: string) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (account: Account) => void;
  journalEntries: any[];
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  products?: Product[];
  warehouses?: Warehouse[];
}

const AccountNode: React.FC<AccountNodeProps> = ({
  account, allAccounts, level, onAddSubAccount, onEditAccount, onDeleteAccount, journalEntries, expandedIds, toggleExpand, products, warehouses
}) => {
  const children = allAccounts.filter(a => a.parentId === account.id).sort((a, b) => a.code.localeCompare(b.code));
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(account.id);

  const calculateBalance = (accId: string): number => {
    let total = 0;

    const directLines = journalEntries.flatMap(je => je.lines).filter(l => l.accountId === accId);
    total += directLines.reduce((sum, line) => sum + (line.debit - line.credit), 0);

    const childAccs = allAccounts.filter(a => a.parentId === accId);
    for (const child of childAccs) {
      total += calculateBalance(child.id);
    }
    
    return total;
  };

  const balance = calculateBalance(account.id);
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
            <span>{account.name}</span>
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
        <td className={`p-2.5 text-sm font-bold ${displayColor}`}>
          {balance !== 0 ? `${absBalance.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${balanceType}` : '-'}
        </td>

        {/* Actions */}
        <td className="p-2.5 text-sm">
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
      {isExpanded && hasChildren && children.map(child => (
        <AccountNode
          key={child.id}
          account={child}
          allAccounts={allAccounts}
          level={level + 1}
          onAddSubAccount={onAddSubAccount}
          onEditAccount={onEditAccount}
          onDeleteAccount={onDeleteAccount}
          journalEntries={journalEntries}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
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
const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ accounts, setAccounts, journalEntries = [], products = [], warehouses = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [parentAccount, setParentAccount] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  // ── Edit modal ──────────────────────────────────────────────────────
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setParentAccount(account.parentId);
    setIsModalOpen(true);
  };

  // ── Save (Add or Edit) ──────────────────────────────────────────────
  const handleSaveAccount = (accountData: Omit<Account, 'id'>) => {
    if (editingAccount) {
      // Edit mode: update existing account
      setAccounts(prev =>
        prev.map(a =>
          a.id === editingAccount.id
            ? { ...a, ...accountData }
            : a
        ).sort((a, b) => a.code.localeCompare(b.code))
      );
    } else {
      // Add mode: create new account
      const newId = `ACC-${Date.now()}`;
      const newAccount: Account = { ...accountData, id: newId };
      setAccounts(prev => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
    }
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  // ── Delete flow ─────────────────────────────────────────────────────
  const handleDeleteAccount = (account: Account) => {
    // Check: system account
    if (account.isSystem) {
      showInfo('لا يمكن حذف الحسابات النظامية الأساسية.');
      return;
    }

    // Check: has sub-accounts
    const childAccounts = accounts.filter(a => a.parentId === account.id);
    if (childAccounts.length > 0) {
      showInfo(
        `لا يمكن حذف الحساب "${account.name}" لأنه يحتوي على ${childAccounts.length} حساب فرعي. يرجى حذف الحسابات الفرعية أولاً.`
      );
      return;
    }

    // Check: has journal entry movements
    const hasMovements = journalEntries.some(je =>
      je.lines?.some((l: any) => l.accountId === account.id)
    );

    let warning = '';
    if (hasMovements) {
      warning = '⚠️ تحذير: هذا الحساب له حركات محاسبية مسجلة. حذفه قد يؤثر على دقة التقارير المالية.';
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

  // ── Load defaults ───────────────────────────────────────────────────
  const handleLoadDefaults = () => {
    if (defaultAccounts && defaultAccounts.length > 0) {
      setAccounts(defaultAccounts);
    } else {
      showInfo('عذراً، لا توجد بيانات افتراضية متاحة.');
    }
  };

  const rootAccounts = accounts.filter(a => a.parentId === null).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">شجرة الحسابات</h1>
          <p className="text-sm text-gray-500 mt-1">عرض وتخصيص الدليل المحاسبي ومتابعة الأرصدة</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>إضافة حساب رئيسي</span>
        </button>
      </div>

      {/* Expand Controls */}
      {rootAccounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium text-gray-500 ml-1">عرض المستويات:</span>
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
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            المستوى الأول
          </button>
          <button
            onClick={handleExpandLevel2}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            المستوى الثاني
          </button>
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            فتح الكل
          </button>
          <span className="text-xs text-gray-400 mr-auto">
            ({accounts.length} حساب إجمالي | {expandedIds.size} مفتوح)
          </span>
        </div>
      )}

      {/* Accounts Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {rootAccounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide text-right text-gray-600">الحساب</th>
                  <th className="p-3 text-sm font-semibold tracking-wide text-gray-600">طبيعة الحساب</th>
                  <th className="p-3 text-sm font-semibold tracking-wide text-gray-600">الرصيد الحالي</th>
                  <th className="p-3 text-sm font-semibold tracking-wide text-gray-600">إجراءات</th>
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
                    journalEntries={journalEntries || []}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    products={products}
                    warehouses={warehouses}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 m-4">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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