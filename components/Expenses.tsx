
import React, { useState, useMemo } from 'react';
import type { Expense, CompanyInfo, JournalEntry, Account } from '../types.ts';
import AddExpenseModal from './AddExpenseModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import { exportToExcel } from '../utils/exportToExcel.ts';

interface ExpensesProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  logAction: (action: string) => void;
  currentUser: any;
  deleteJournalEntryByReference: (refId: string) => void;
  customerPayments: any[];
  supplierPayments: any[];
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

const Expenses: React.FC<ExpensesProps> = ({ expenses, setExpenses, createJournalEntry, logAction, currentUser, deleteJournalEntryByReference, customerPayments, supplierPayments, accounts, setAccounts }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<string | null>(null);

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Extract Unique Categories
  const categories = useMemo(() => {
    const unique = new Set(expenses.map(e => e.category));
    return Array.from(unique).sort();
  }, [expenses]);

  // Filter Logic
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesCategory = selectedCategories.length > 0 ? selectedCategories.includes(expense.category) : true;
      const matchesStartDate = startDate ? new Date(expense.date) >= new Date(startDate) : true;
      const matchesEndDate = endDate ? new Date(expense.date) <= new Date(endDate) : true;
      return matchesCategory && matchesStartDate && matchesEndDate;
    });
  }, [expenses, selectedCategories, startDate, endDate]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses
      .filter(exp => (exp.status || 'active') === 'active')
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const handleOpenAddModal = (expense: Expense | null = null) => {
    if (expense && expense.status === 'voided') return;
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setEditingExpense(null);
    setIsAddModalOpen(false);
  };

  // Helper to find or create account for expense category
  const getOrCreateExpenseAccount = (categoryName: string): string => {
    // 1. Check if exists (parent must be '52' - Operating Expenses)
    const existingAccount = accounts.find(a => a.name === categoryName && a.parentId === '52');
    if (existingAccount) return existingAccount.id;

    // 2. Create New
    const newId = `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newAccount: Account = {
      id: newId,
      code: `52${(accounts.filter(a => a.parentId === '52').length + 1).toString().padStart(2, '0')}`,
      name: categoryName,
      type: 'مدين', // Debit
      parentId: '52',
      isSystem: false
    };

    setAccounts(prev => [...prev, newAccount].sort((a, b) => a.code.localeCompare(b.code)));
    return newId;
  };

  const handleSaveExpense = (expenseData: Omit<Expense, 'id' | 'voucherNumber'> & { id?: string }) => {
    // Check Funds (Assume Main Treasury '1101'/'الخزينة الرئيسية')
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { treasuryOpeningBalance: 0, treasuryBreakdown: {} };

    // Calculate Balance
    const opening = companyInfo.treasuryOpeningBalance || 0;

    // Incomes
    const receipts = customerPayments
      .filter(p => (p.treasuryAccount || 'الخزينة الرئيسية') === 'الخزينة الرئيسية' && (p.status || 'active') === 'active')
      .reduce((sum, p) => sum + p.amount, 0);

    // Payments
    const payments = supplierPayments
      .filter(p => (p.treasuryAccount || 'الخزينة الرئيسية') === 'الخزينة الرئيسية' && (p.status || 'active') === 'active')
      .reduce((sum, p) => sum + p.amount, 0);

    // Expenses (Exclude current if editing)
    const existingExpenses = expenses
      .filter(e => (e.status || 'active') === 'active' && e.id !== expenseData.id)
      .reduce((sum, e) => sum + e.amount, 0);

    const currentBalance = opening + receipts - payments - existingExpenses;

    if (currentBalance < expenseData.amount) {
      alert("عفواً، لا يوجد رصيد كافٍ في الخزينة الرئيسية لإتمام هذا المصروف.");
      return;
    }

    // Check Financial Lock
    const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

    if (isRestrictedUser && companyInfo.financialYearLockDate) {
      if (new Date(expenseData.date) <= new Date(companyInfo.financialYearLockDate)) {
        alert(`عفواً، لا يمكن إضافة أو تعديل مصروفات في فترة مالية مغلقة (قبل ${companyInfo.financialYearLockDate}).`);
        return;
      }
      // If editing, check original date
      if (expenseData.id) {
        const original = expenses.find(e => e.id === expenseData.id);
        if (original && new Date(original.date) <= new Date(companyInfo.financialYearLockDate)) {
          alert(`عفواً، لا يمكن تعديل مصروف من فترة مالية مغلقة.`);
          return;
        }
      }
    }

    if (expenseData.id) {
      // EDIT MODE

      // 1. Delete Old Journal Entry
      deleteJournalEntryByReference(expenseData.id);

      // 2. Create Updated Journal Entry
      createJournalEntry({
        date: expenseData.date,
        description: `تعديل مصروف: ${expenseData.description}`,
        referenceType: 'Manual',
        referenceId: expenseData.id,
        lines: [
          { accountId: getOrCreateExpenseAccount(expenseData.category), accountName: expenseData.category, debit: expenseData.amount, credit: 0 },
          { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: expenseData.amount }
        ]
      });

      // 3. Update State
      setExpenses(expenses.map(exp =>
        exp.id === expenseData.id ? { ...exp, ...expenseData } : exp
      ));
      logAction(`تعديل مصروف: ${expenseData.description}`);

    } else {
      // CREATE MODE
      const prefix = 'EXP-';
      const maxNum = expenses.reduce((max, e) => {
        if (e.voucherNumber.startsWith(prefix)) {
          const num = parseInt(e.voucherNumber.substring(prefix.length), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }
        return max;
      }, 0);
      const nextVoucherNum = `EXP-${(Math.max(maxNum, 9) + 1).toString().padStart(3, '0')}`;

      const newExpense: Expense = {
        ...expenseData,
        id: `E${Date.now()}`,
        voucherNumber: nextVoucherNum,
        status: 'active'
      };
      setExpenses([...expenses, newExpense]);

      createJournalEntry({
        date: newExpense.date,
        description: `إثبات مصروف: ${newExpense.description}`,
        referenceType: 'Manual',
        referenceId: newExpense.id,
        lines: [
          { accountId: getOrCreateExpenseAccount(newExpense.category), accountName: newExpense.category, debit: newExpense.amount, credit: 0 },
          { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: newExpense.amount }
        ]
      });
      logAction(`إضافة مصروف جديد: ${newExpense.description} (${newExpense.amount})`);
    }
    handleCloseAddModal();
  };

  const handleVoidRequest = (expenseId: string) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser && new Date(expense.date) <= new Date(financialYearLockDate)) {
        alert(`عفواً، لا يمكن إلغاء مصروف في فترة مالية مغلقة (قبل ${financialYearLockDate}).`);
        return;
      }
    }

    setExpenseToVoid(expenseId);
    setIsConfirmModalOpen(true);
  };

  const confirmVoid = () => {
    if (expenseToVoid) {
      const expense = expenses.find(e => e.id === expenseToVoid);
      if (expense) {
        setExpenses(expenses.map(exp =>
          exp.id === expenseToVoid ? { ...exp, status: 'voided' } : exp
        ));

        // Reversing Journal Entry (Debit Treasury, Credit Expense)
        createJournalEntry({
          date: new Date().toISOString().split('T')[0],
          description: `إلغاء مصروف رقم ${expense.voucherNumber}`,
          referenceType: 'Manual',
          referenceId: expense.id,
          lines: [
            { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: expense.amount, credit: 0 },
            { accountId: getOrCreateExpenseAccount(expense.category), accountName: expense.category, debit: 0, credit: expense.amount }
          ]
        });
        logAction(`إلغاء مصروف: ${expense.voucherNumber}`);
      }
    }
    setIsConfirmModalOpen(false);
    setExpenseToVoid(null);
  };

  const cancelVoid = () => {
    setIsConfirmModalOpen(false);
    setExpenseToVoid(null);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setStartDate('');
    setEndDate('');
    setIsCategoryDropdownOpen(false);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleExport = () => {
    const exportData = filteredExpenses.map(exp => ({
      'رقم الإذن': exp.voucherNumber,
      'التاريخ': exp.date,
      'الفئة': exp.category,
      'الوصف': exp.description,
      'المبلغ': exp.amount,
      'الحالة': exp.status === 'voided' ? 'ملغي' : 'نشط'
    }));
    exportToExcel(exportData, 'تقرير_المصروفات');
  };

  const handlePrint = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    let filterDescription = "تقرير شامل لجميع المصروفات";
    const datePart = startDate || endDate ? `عن الفترة من ${startDate || 'البداية'} إلى ${endDate || 'الآن'}` : '';
    const categoryPart = selectedCategories.length > 0 ? `(الفئات: ${selectedCategories.join('، ')})` : '';

    if (datePart || categoryPart) {
      filterDescription = `تقرير المصروفات ${datePart} ${categoryPart}`;
    }

    const printContent = `
      <html>
        <head>
          <title>كشف المصروفات</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              padding: 20px; 
              background-color: white;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 20px; 
              padding-bottom: 15px; 
              border-bottom: 3px solid #EAB308; 
            }
            .company-details { text-align: right; }
            .company-details h1 { margin: 0; color: #EAB308; font-size: 24px; font-weight: bold; }
            .company-logo img { max-width: 120px; max-height: 80px; object-fit: contain; }
            
            .report-title { text-align: center; margin-bottom: 20px; }
            .report-title h2 { margin: 0; font-size: 22px; color: #333; }
            .report-title p { margin: 5px 0 0; color: #666; font-size: 14px; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th { background-color: #FEF9C3; color: #333; padding: 10px; border: 1px solid #EAB308; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; text-align: center; }
            td.amount { font-weight: bold; text-align: left; padding-left: 15px; }
            
            .total-row { background-color: #EAB308 !important; color: white; font-weight: bold; font-size: 16px; }
            .total-row td { border: 1px solid #ca8a04; }

            .footer { 
              position: fixed; 
              bottom: 0; 
              left: 0; 
              right: 0; 
              text-align: center; 
              border-top: 1px solid #ddd; 
              padding: 10px; 
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-logo">
              ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo">` : ''}
            </div>
            <div class="company-details">
              <h1>${companyInfo.name}</h1>
              <p>${companyInfo.address}<br>${companyInfo.phone}</p>
            </div>
          </div>

          <div class="report-title">
            <h2>كشف المصروفات</h2>
            <p>${filterDescription}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>رقم الإذن</th>
                <th>الفئة</th>
                <th>الوصف</th>
                <th>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${filteredExpenses.map((exp, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="direction: ltr;">${exp.date}</td>
                  <td>${exp.voucherNumber}</td>
                  <td>${exp.category}</td>
                  <td style="text-align: right;">${exp.description}</td>
                  <td class="amount">${exp.amount.toLocaleString('en-US')} ج.م</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: center;">الإجمالي</td>
                <td style="text-align: left; padding-left: 15px;">${filteredTotal.toLocaleString('en-US')} ج.م</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>تم طباعة هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">المصروفات العامة</h1>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={handlePrint}
            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center space-x-2 space-x-reverse shadow-sm transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            <span>طباعة الكشف</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse shadow-sm transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 flex items-center space-x-2 space-x-reverse shadow-sm transition-all hover:shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>تسجيل مصروف جديد</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative">
        {/* ... Existing Filters JSX ... */}
        {/* To save space and ensure correctness I am blindly copying the Filter Section from previous view but ensuring it works with correct logic */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">تصفية حسب الفئة</label>
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-right flex justify-between items-center focus:ring-2 focus:ring-yellow-500"
            >
              <span className="truncate">
                {selectedCategories.length === 0
                  ? 'جميع الفئات'
                  : `${selectedCategories.length} فئات محددة`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {categories.map(cat => (
                  <div
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center p-2 hover:bg-yellow-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat)}
                      readOnly
                      className="form-checkbox h-4 w-4 text-yellow-600 rounded ml-2"
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="p-3 text-sm text-gray-500 text-center">لا توجد فئات مسجلة</div>
                )}
              </div>
            )}
            {isCategoryDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)}></div>
            )}
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <button
              onClick={() => resetFilters()}
              className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 text-sm">عدد السجلات: <strong>{filteredExpenses.length}</strong></span>
          <div className="text-lg">
            <span className="text-gray-600 ml-2">إجمالي المصروفات (المصفاة):</span>
            <span className="font-bold text-yellow-600">{filteredTotal.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
              <tr>
                <th className="p-4 font-bold border-b-2 border-gray-200">رقم إذن الصرف</th>
                <th className="p-4 font-bold border-b-2 border-gray-200">التاريخ</th>
                <th className="p-4 font-bold border-b-2 border-gray-200">الفئة</th>
                <th className="p-4 font-bold border-b-2 border-gray-200">الوصف</th>
                <th className="p-4 font-bold border-b-2 border-gray-200">المبلغ</th>
                <th className="p-4 font-bold border-b-2 border-gray-200 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {filteredExpenses.map((expense: Expense, index: number) => {
                const isVoided = expense.status === 'voided';
                return (
                  <tr
                    key={expense.id}
                    className={`border-b border-gray-200 transition-colors duration-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isVoided ? 'bg-red-50' : ''}`}
                  >
                    <td className="p-4 font-medium">
                      {expense.voucherNumber}
                      {isVoided && <span className="mr-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">ملغي</span>}
                    </td>
                    <td className={`p-4 ${isVoided ? 'line-through text-gray-400' : ''}`} style={{ direction: 'ltr', textAlign: 'right' }}>{expense.date}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isVoided ? 'bg-gray-200 text-gray-600 border-gray-300' : 'text-yellow-800 bg-yellow-200 border-yellow-300'}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className={`p-4 ${isVoided ? 'line-through text-gray-400' : ''}`}>{expense.description}</td>
                    <td className={`p-4 font-bold text-lg ${isVoided ? 'line-through text-red-300' : 'text-gray-800'}`}>
                      {expense.amount.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center space-x-3 space-x-reverse justify-center">
                        {!isVoided && (
                          <>
                            {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                              <button
                                onClick={() => handleOpenAddModal(expense)}
                                className="text-yellow-600 hover:text-yellow-800 font-medium"
                                title="تعديل"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                              </button>
                            )}
                            <button type="button" onClick={() => handleVoidRequest(expense.id)} className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1" title="إلغاء القيد">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span className="text-xs font-bold">إلغاء</span>
                            </button>
                          </>
                        )}
                        {isVoided && <span className="text-xs text-red-500 font-bold">ملغي</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500 bg-gray-50">
                    لا توجد مصروفات تطابق البحث.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddExpenseModal
          onClose={handleCloseAddModal}
          onSave={handleSaveExpense}
          expenseToEdit={editingExpense}
          existingExpenses={expenses}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={cancelVoid}
        onConfirm={confirmVoid}
        title="تأكيد الإلغاء"
        message="هل أنت متأكد من رغبتك في إلغاء هذا المصروف؟ سيتم عمل قيد عكسي ولا يمكن التراجع عن ذلك."
      />
    </div>
  );
};

export default Expenses;
