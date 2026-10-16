import React, { useState, useEffect } from 'react';
import type { Account } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddAccountModalProps {
  onClose: () => void;
  onSave: (account: Omit<Account, 'id'>) => void;
  accounts: Account[];
  parentId: string | null;
  editingAccount?: Account | null; // If provided, modal is in Edit mode
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSave, accounts, parentId, editingAccount }) => {
  const isEditMode = !!editingAccount;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isGroup, setIsGroup] = useState<boolean>(true);
  const [type, setType] = useState<'مدين' | 'دائن'>('مدين');
  const [statementType, setStatementType] = useState<'balance_sheet' | 'income_statement'>('balance_sheet');

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isSubAccount = parentId !== null;
  const parentAccount = accounts.find(a => a.id === parentId);

  // Populate form from editingAccount or auto-generate for new
  useEffect(() => {
    if (isEditMode && editingAccount) {
      setCode(editingAccount.code);
      setName(editingAccount.name);
      setType(editingAccount.type);
      setStatementType(editingAccount.statementType || 'balance_sheet');
      setIsGroup(editingAccount.isGroup !== false);
    } else {
      // Auto-generate code for new account
      let generatedCode = '';
      if (isSubAccount && parentAccount) {
        const children = accounts.filter(a => a.parentId === parentId);
        if (children.length > 0) {
          const childCodes = children.map(c => {
            const num = parseInt(c.code.replace(parentAccount.code, ''), 10);
            return isNaN(num) ? 0 : num;
          });
          const maxCode = Math.max(...childCodes, 0);
          const nextNum = (maxCode + 1).toString().padStart(2, '0');
          generatedCode = `${parentAccount.code}${nextNum}`;
        } else {
          generatedCode = `${parentAccount.code}01`;
        }
        setType(parentAccount.type);
        if (parentAccount.statementType) {
          setStatementType(parentAccount.statementType);
        }
      } else {
        const rootAccounts = accounts.filter(a => a.parentId === null);
        if (rootAccounts.length > 0) {
          const rootCodes = rootAccounts.map(c => parseInt(c.code, 10)).filter(n => !isNaN(n));
          const maxRoot = Math.max(...rootCodes, 0);
          generatedCode = (maxRoot + 1).toString();
        } else {
          generatedCode = '1';
        }
      }
      setCode(generatedCode);
    }
  }, [accounts, parentId, isSubAccount, parentAccount, editingAccount, isEditMode]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAlertOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isAlertOpen]);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setIsAlertOpen(true);
  };

  const handleSubmit = () => {
    if (!code.trim() || !name.trim()) {
      showAlert('كود الحساب واسمه مطلوبان.');
      return;
    }
    // Check for duplicate code (excluding the current account in edit mode)
    const duplicateCode = accounts.find(a =>
      a.code.trim() === code.trim() && (!isEditMode || a.id !== editingAccount?.id)
    );
    if (duplicateCode) {
      showAlert(`كود الحساب "${code}" مستخدم بالفعل في الحساب: ${duplicateCode.name}`);
      return;
    }
    onSave({
      code,
      name,
      type,
      statementType,
      isGroup,
      parentId: isEditMode ? (editingAccount?.parentId ?? null) : parentId,
    });
  };

  const modalTitle = isEditMode
    ? `تعديل الحساب: ${editingAccount?.name}`
    : isSubAccount
    ? 'إضافة حساب فرعي'
    : 'إضافة حساب رئيسي';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Show parent info only when adding a sub-account */}
          {!isEditMode && parentAccount && (
            <div className="p-3 bg-blue-50 rounded-md">
              <span className="text-sm font-medium text-gray-600">الحساب الرئيسي: </span>
              <span className="font-semibold text-blue-800">{parentAccount.code} - {parentAccount.name}</span>
            </div>
          )}

          {/* Show edit badge for edit mode */}
          {isEditMode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              <span className="text-sm text-amber-800 font-medium">أنت تقوم بتعديل بيانات هذا الحساب</span>
            </div>
          )}

          <div>
            <label htmlFor="accountCode" className="block text-sm font-medium text-gray-700 mb-1">
              كود الحساب <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="accountCode"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {!isEditMode && (
              <p className="text-xs text-gray-500 mt-1">تم توليد الكود تلقائياً بناءً على الشجرة، يمكنك تعديله إذا لزم الأمر.</p>
            )}
          </div>

          <div>
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
              اسم الحساب <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="accountName"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              طبيعة الحساب التراتبية <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="isGroup"
                  checked={isGroup === true}
                  onChange={() => setIsGroup(true)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">تجميعي (يسمح بإضافة فروع تحته)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="isGroup"
                  checked={isGroup === false}
                  onChange={() => setIsGroup(false)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">فرعي نهائي (لا يسمح بالتفرع)</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
              طبيعة الحساب <span className="text-red-500">*</span>
            </label>
            <select
              id="accountType"
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="مدين">مدين</option>
              <option value="دائن">دائن</option>
            </select>
          </div>

          <div>
            <label htmlFor="statementType" className="block text-sm font-medium text-gray-700 mb-1">
              نوع القائمة <span className="text-red-500">*</span>
            </label>
            <select
              id="statementType"
              value={statementType}
              onChange={e => setStatementType(e.target.value as any)}
              disabled={!isEditMode && isSubAccount}
              className={`w-full p-2 border border-gray-300 rounded-md shadow-sm ${!isEditMode && isSubAccount ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white focus:outline-none focus:ring-2 focus:ring-blue-300'}`}
            >
              <option value="balance_sheet">قائمة المركز المالي (الميزانية)</option>
              <option value="income_statement">قائمة الدخل (الأرباح والخسائر)</option>
            </select>
            {!isEditMode && isSubAccount && (
              <p className="text-xs text-gray-500 mt-1">يتم وراثة نوع القائمة تلقائياً من الحساب الرئيسي.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100 transition-colors">إلغاء</button>
          <button
            onClick={handleSubmit}
            className={`text-white font-bold py-2 px-4 rounded-lg transition-colors ${isEditMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isEditMode ? 'حفظ التعديلات' : 'حفظ الحساب'}
          </button>
        </div>
      </div>
      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        message={alertMessage}
      />
    </div>
  );
};

export default AddAccountModal;
