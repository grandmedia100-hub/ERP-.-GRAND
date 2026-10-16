
import React, { useState, useEffect, useRef } from 'react';
import type { CompanyInfo, Customer, Supplier, Product, User, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, Account, ThemeSettings } from '../types.ts';
import ConfirmationModal from './ConfirmationModal.tsx';
import OpeningBalancesModal from './OpeningBalancesModal.tsx';
import ConnectionSettings from './ConnectionSettings.tsx';

interface SettingsProps {
  onClearData: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  partners?: any[];
  setPartners?: React.Dispatch<React.SetStateAction<any[]>>;

  // Removed duplicate optional definitions
  customerPayments?: CustomerPayment[]; // Optional for repair
  setCustomerPayments?: React.Dispatch<React.SetStateAction<CustomerPayment[]>>; // Optional for repair
  supplierPayments?: SupplierPayment[]; // Optional for repair
  setSupplierPayments?: React.Dispatch<React.SetStateAction<SupplierPayment[]>>; // Optional for repair
  onManageUsers: () => void;
  currentUser: User;
  themeSettings: ThemeSettings;
  setThemeSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;

  // New Props for Regeneration
  salesInvoices: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  purchaseInvoices: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  journalEntries: any[]; // Using any to avoid complex circular imports if types aren't perfect defined elsewhere
  setJournalEntries: React.Dispatch<React.SetStateAction<any[]>>;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  expenses?: any[];
}

const Settings: React.FC<SettingsProps> = ({
  onClearData,
  customers, setCustomers,
  suppliers, setSuppliers,
  products, setProducts,
  partners = [], setPartners,

  customerPayments, setCustomerPayments,
  supplierPayments, setSupplierPayments,
  onManageUsers,
  currentUser,
  themeSettings, setThemeSettings,

  // New Props Destructuring
  salesInvoices = [],
  purchaseInvoices = [],
  journalEntries = [],
  setJournalEntries,
  accounts,
  setAccounts,
  expenses = []
}) => {
  // --- State for Company Info ---
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    address: '',
    phone: '',
    logo: '',
    treasuryOpeningBalance: 0,
  });

  // --- General UI State ---
  const [successMessage, setSuccessMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isOpeningBalancesOpen, setIsOpeningBalancesOpen] = useState(false);
  const [isConnectionSettingsOpen, setIsConnectionSettingsOpen] = useState(false);
  // fileInputRef was for backup restore, not needed here anymore, removing refs to it if any remain

  // --- Load Initial Data ---
  useEffect(() => {
    const savedInfo = localStorage.getItem('companyInfo');
    if (savedInfo) {
      setCompanyInfo(JSON.parse(savedInfo));
    }
  }, []);

  // --- Save Company Info ---
  useEffect(() => {
    if (companyInfo.name) {
      localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    }
  }, [companyInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCompanyInfo({
      ...companyInfo,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCompanyInfo({ ...companyInfo, logo: event.target?.result as string });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    setSuccessMessage('تم حفظ الإعدادات بنجاح!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };


  // --- Clear Data Logic ---
  const handleClearRequest = () => setIsConfirmOpen(true);
  const handleConfirmClear = () => {
    setIsConfirmOpen(false);
    onClearData();
    onClearData();
  };


  // --- Manual Repair Logic ---
  const handleRepairData = () => {
    if (!customerPayments || !setCustomerPayments || !supplierPayments || !setSupplierPayments) {
      alert("وظيفة الإصلاح غير متوفرة حالياً (ناقصة البيانات).");
      return;
    }

    if (!window.confirm("تحذير: هذه العملية ستقوم بفحص البيانات وإصلاح الأخطاء المعروفة (مثل تكرار السندات). هل تريد الاستمرار؟")) {
      return;
    }

    const newCustomerPayments = [...customerPayments];
    const newSupplierPayments = [...supplierPayments];
    let changesMade = false;

    // Fix: Move incorrect Supplier Payments out of Customer Payments
    const incorrectlyPlacedIndices = newCustomerPayments
      .map((p, index) => {
        // @ts-ignore
        if ((p.supplierId || p.supplierName) && !p.customerId) {
          return index;
        }
        return -1;
      })
      .filter(i => i !== -1)
      .sort((a, b) => b - a);

    if (incorrectlyPlacedIndices.length > 0) {
      incorrectlyPlacedIndices.forEach(index => {
        const misplacedPayment = newCustomerPayments[index];
        newCustomerPayments.splice(index, 1);

        // Avoid duplicates in destination
        const exists = newSupplierPayments.some(sp => sp.id === misplacedPayment.id);
        if (!exists) {
          // @ts-ignore
          newSupplierPayments.push(misplacedPayment as SupplierPayment);
        }
      });
      changesMade = true;
    }

    if (changesMade) {
      setCustomerPayments(newCustomerPayments);
      setSupplierPayments(newSupplierPayments);
      setSuccessMessage("تم إصلاح البيانات بنجاح! ✅");
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      alert("البيانات سليمة، لم يتم العثور على أخطاء لإصلاحها.");
    }
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

  // --- Regenerate Journal Entries Logic ---
  const handleRegenerateJournalEntries = () => {
    if (!window.confirm("هل أنت متأكد؟ سقوم هذا الإجراء بفحص جميع الفواتير والسندات وإعادة إنشاء القيود المحاسبية المفقودة. عملية آمنة ولكن يفضل أخذ نسخة احتياطية أولاً.")) {
      return;
    }

    let entriesAdded = 0;
    const newEntries: any[] = [];
    const existingIds = new Set(journalEntries.map(je => je.referenceId));

    // 1. Sales Invoices
    salesInvoices.forEach(inv => {
      if (inv.status !== 'voided' && !existingIds.has(inv.id)) {
        // Calculate Cost
        let totalCost = 0;
        const inventoryGroups: Record<string, number> = {};
        inv.items.forEach(item => {
          let itemCost = 0;
          if (item.cost !== undefined && item.cost >= 0) {
            itemCost = item.cost * item.quantity;
          } else {
            const product = products.find(p => p.id === item.productId);
            if (product) itemCost = product.costPrice * item.quantity;
          }
          totalCost += itemCost;
          
          const product = products.find(p => p.id === item.productId);
          const whId = product?.warehouseId || 'WH-0001';
          const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
          const accId = whAcc ? whAcc.id : '1104';
          inventoryGroups[accId] = (inventoryGroups[accId] || 0) + itemCost;
        });

        const lines = [];
        if (inv.invoiceType === 'return') {
          lines.push(
            { accountId: '4101', accountName: 'إيرادات المبيعات', debit: inv.total, credit: 0 },
            { accountId: '1103', accountName: `عميل - ${inv.customerName}`, debit: 0, credit: inv.total }
          );
          if (totalCost > 0) {
            for (const [accId, amt] of Object.entries(inventoryGroups)) {
              const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
              lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
            }
            lines.push({ accountId: '5101', accountName: 'تكلفة البضاعة المباعة', debit: 0, credit: totalCost });
          }
          newEntries.push({
            id: `JE-REG-SALE-${inv.id}`,
            date: inv.date,
            description: `فاتورة مرتجع مبيعات رقم ${inv.id} - ${inv.customerName} (استعادة)`,
            lines: lines,
            referenceType: 'SalesInvoice',
            referenceId: inv.id,
            createdAt: new Date().toISOString()
          });
        } else {
          lines.push(
            { accountId: '1103', accountName: `عميل - ${inv.customerName}`, debit: inv.total, credit: 0 },
            { accountId: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: inv.total }
          );
          if (totalCost > 0) {
            lines.push({ accountId: '5101', accountName: 'تكلفة البضاعة المباعة', debit: totalCost, credit: 0 });
            for (const [accId, amt] of Object.entries(inventoryGroups)) {
              const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
              lines.push({ accountId: accId, accountName: accName, debit: 0, credit: amt });
            }
          }
          newEntries.push({
            id: `JE-REG-SALE-${inv.id}`,
            date: inv.date,
            description: `فاتورة مبيعات رقم ${inv.id} - ${inv.customerName} (استعادة)`,
            lines: lines,
            referenceType: 'SalesInvoice',
            referenceId: inv.id,
            createdAt: new Date().toISOString()
          });
        }
        entriesAdded++;
      }
    });

    // 2. Purchase Invoices
    purchaseInvoices.forEach(inv => {
      if (inv.status !== 'voided' && !existingIds.has(inv.id)) {

        let inventoryTotal = 0;
        const expenseGroups: Record<string, number> = {};
        const inventoryGroups: Record<string, number> = {};

        // Calculate Totals matching Purchase.tsx logic
        inv.items.forEach(item => {
          const isExpense = item.itemType === 'expense';
          if (isExpense) {
            const cat = item.productName || 'مصروف عام';
            expenseGroups[cat] = (expenseGroups[cat] || 0) + item.total;
          } else {
            inventoryTotal += item.total;
            const product = products.find(p => p.id === item.productId);
            const whId = product?.warehouseId || 'WH-0001';
            const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
            const accId = whAcc ? whAcc.id : '1104';
            inventoryGroups[accId] = (inventoryGroups[accId] || 0) + item.total;
          }
        });

        const lines = [];
        if (inv.invoiceType === 'return') {
          lines.push(
            { accountId: '2101', accountName: `مورد - ${inv.supplierName}`, debit: inv.total, credit: 0 }
          );

          if (inventoryTotal > 0) {
            for (const [accId, amt] of Object.entries(inventoryGroups)) {
              const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
              lines.push({ accountId: accId, accountName: accName, debit: 0, credit: amt });
            }
          }
          for (const [cat, amt] of Object.entries(expenseGroups)) {
            lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: 0, credit: amt });
          }

          newEntries.push({
            id: `JE-REG-PUR-${inv.id}`,
            date: inv.date,
            description: `فاتورة مرتجع مشتريات رقم ${inv.id} - ${inv.supplierName} (استعادة)`,
            lines: lines,
            referenceType: 'PurchaseInvoice',
            referenceId: inv.id,
            createdAt: new Date().toISOString()
          });
        } else {
          if (inventoryTotal > 0) {
            for (const [accId, amt] of Object.entries(inventoryGroups)) {
              const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
              lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
            }
          }
          for (const [cat, amt] of Object.entries(expenseGroups)) {
            lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: amt, credit: 0 });
          }

          lines.push(
            { accountId: '2101', accountName: `مورد - ${inv.supplierName}`, debit: 0, credit: inv.total }
          );

          newEntries.push({
            id: `JE-REG-PUR-${inv.id}`,
            date: inv.date,
            description: `فاتورة مشتريات رقم ${inv.id} - ${inv.supplierName} (استعادة)`,
            lines: lines,
            referenceType: 'PurchaseInvoice',
            referenceId: inv.id,
            createdAt: new Date().toISOString()
          });
        }
        entriesAdded++;
      }
    });

    // 3. Customer Payments (Receipts)
    if (customerPayments) {
      customerPayments.forEach(pay => {
        if (pay.status !== 'voided' && !existingIds.has(pay.id)) {
          // Helpers for account ID (Simplified)
          const getAccId = (name: string) => {
            if (name === 'الخزينة الرئيسية') return '1101';
            if (name.includes('بنك')) return '1102';
            if (name.includes('فيصل')) return '1102';
            if (name.includes('فودافون')) return '1102';
            if (name.includes('انستاباى')) return '1102';
            return '1101';
          };

          newEntries.push({
            id: `JE-REG-CP-${pay.id}`,
            date: pay.date,
            description: `سند قبض من عميل: ${pay.customerName} (استعادة)`,
            lines: [
              { accountId: getAccId(pay.treasuryAccount || 'الخزينة الرئيسية'), accountName: pay.treasuryAccount || 'الخزينة الرئيسية', debit: pay.amount, credit: 0 },
              { accountId: '1103', accountName: `عميل - ${pay.customerName}`, debit: 0, credit: pay.amount }
            ],
            referenceType: 'Manual', // Or Payment
            referenceId: pay.id,
            createdAt: new Date().toISOString()
          });
          entriesAdded++;
        }
      });
    }

    // 4. Supplier Payments
    if (supplierPayments) {
      supplierPayments.forEach(pay => {
        if (pay.status !== 'voided' && !existingIds.has(pay.id)) {
          const getAccId = (name: string) => {
            if (name === 'الخزينة الرئيسية') return '1101';
            if (name && name.includes('بنك')) return '1102';
            if (name && name.includes('فيصل')) return '1102';
            if (name && name.includes('فودافون')) return '1102';
            if (name && name.includes('انستاباى')) return '1102';
            return '1101';
          };

          const isExpense = pay.isExpense;
          newEntries.push({
            id: `JE-REG-SP-${pay.id}`,
            date: pay.date,
            description: `${isExpense ? 'صرف مصروف' : 'سند صرف لمورد'}: ${pay.supplierName} (استعادة)`,
            lines: [
              {
                accountId: isExpense ? getOrCreateExpenseAccount(pay.expenseCategory || 'مصروف عام') : '2101',
                accountName: isExpense ? (pay.expenseCategory || 'مصروف عام') : `مورد - ${pay.supplierName}`,
                debit: pay.amount,
                credit: 0
              },
              {
                accountId: getAccId(pay.treasuryAccount || 'الخزينة الرئيسية'),
                accountName: pay.treasuryAccount || 'الخزينة الرئيسية',
                debit: 0,
                credit: pay.amount
              }
            ],
            referenceType: 'Manual',
            referenceId: pay.id,
            createdAt: new Date().toISOString()
          });
          entriesAdded++;
        }
      });
    }

    // 5. Expenses
    expenses.forEach(exp => {
      if (!existingIds.has(exp.id)) {
        newEntries.push({
          id: `JE-REG-EXP-${exp.id}`,
          date: exp.date,
          description: `مصروف: ${exp.category} - ${exp.description} (استعادة)`,
          lines: [
            { accountId: getOrCreateExpenseAccount(exp.category), accountName: exp.category, debit: exp.amount, credit: 0 },
            { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: exp.amount } // Defaulting to Main Treasury as Expenses component assumes main treasury
          ],
          referenceType: 'Manual',
          referenceId: exp.id,
          createdAt: new Date().toISOString()
        });
        entriesAdded++;
      }
    });

    if (entriesAdded > 0) {
      setJournalEntries(prev => [...prev, ...newEntries]);
      setSuccessMessage(`تمت استعادة ${entriesAdded} قيد محاسبي بنجاح!`);
    } else {
      alert("لم يتم العثور على قيود مفقودة.");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-main mb-6">الإعدادات والنسخ الاحتياطي</h1>

      {/* Company Info Section */}
      <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8">
        <h2 className="text-xl font-bold text-main mb-4 pb-2 border-b">بيانات الشركة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-main mb-1">اسم الشركة</label>
            <input type="text" name="name" id="name" value={companyInfo.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>

          {/* Financial Year Settings Section */}
          {(currentUser.role === 'admin' || currentUser.role === 'developer') && (
            <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8 border border-purple-200">
              <h2 className="text-xl font-bold text-purple-700 mb-4 pb-2 border-b border-purple-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                إعدادات السنة المالية
              </h2>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <label htmlFor="lockDate" className="block text-sm font-bold text-gray-700 mb-2">تاريخ إغلاق الفترة المالية (Lock Date)</label>
                  <p className="text-sm text-gray-500 mb-2">لن يتم السماح بإضافة أو تعديل أو حذف أي معاملات قبل هذا التاريخ.</p>
                  <input
                    type="date"
                    id="lockDate"
                    value={companyInfo.financialYearLockDate || ''}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, financialYearLockDate: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="mt-4 text-right">
                <button onClick={handleSaveSettings} className="bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 shadow-md">
                  حفظ التاريخ
                </button>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input type="tel" name="phone" id="phone" value={companyInfo.phone} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input type="text" name="address" id="address" value={companyInfo.address} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">شعار الشركة</label>
            <div className="flex items-center space-x-4 space-x-reverse">
              {companyInfo.logo && <img src={companyInfo.logo} alt="Company Logo" className="h-16 w-16 object-contain rounded-md bg-gray-100" />}
              <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 justify-between items-center border-t pt-4">
          <div className="flex gap-2">
            <button
              onClick={() => setIsOpeningBalancesOpen(true)}
              className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
              الأرصدة الافتتاحية
            </button>

            {currentUser.permissions.includes('manage_users') && (
              <button
                onClick={onManageUsers}
                className="bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" /></svg>
                إدارة المستخدمين
              </button>
            )}

            <button
              onClick={() => setIsConnectionSettingsOpen(true)}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
              إعدادات الخادم
            </button>
          </div>
          <button onClick={handleSaveSettings} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 shadow-md">
            حفظ الكل
          </button>
        </div>
        {successMessage && <p className="text-green-600 mt-2 text-center font-bold">{successMessage}</p>}
      </div>


      {
        currentUser.role === 'developer' && (
          <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8 border-2 border-indigo-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">Developer Mode</div>
            <h2 className="text-xl font-bold text-indigo-700 mb-6 pb-2 border-b border-indigo-200 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              أدوات المطور (Developer Tools)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700">مقياس الواجهة (UI Scale)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="125"
                    step="5"
                    value={themeSettings.uiScale}
                    onChange={(e) => setThemeSettings({ ...themeSettings, uiScale: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-bold text-indigo-600 w-12 text-center">{themeSettings.uiScale}%</span>
                </div>
                <p className="text-xs text-gray-500">تحكم في حجم عرض البرنامج بالكامل.</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700">حجم الأيقونات</label>
                <div className="flex gap-2">
                  {['small', 'normal', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setThemeSettings({ ...themeSettings, iconSize: size as any })}
                      className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${themeSettings.iconSize === size
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      {size === 'small' ? 'صغير' : size === 'normal' ? 'متوسط' : 'كبير'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Theme Selector Section */}
      <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8 relative overflow-hidden text-right">
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">جديد</div>
        <h2 className="text-xl font-bold text-main mb-6 pb-2 border-b flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.357a4 4 0 014.114 0l1.657 1.357M10 14v4h4v-4m-4 0a6 6 0 016-6h-6z" />
          </svg>
          المظهر والألوان (Themes)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'default', name: 'الافتراضي (الأزرق)', bg: 'bg-blue-600', border: 'border-blue-200' },
            { id: 'dark', name: 'الوضع الليلي (أنيق)', bg: 'bg-gray-900', border: 'border-gray-700' },
            { id: 'corporate', name: 'رمادي رسمي', bg: 'bg-gray-600', border: 'border-gray-400' },
            { id: 'emerald', name: 'أخضر مالي', bg: 'bg-green-600', border: 'border-green-200' },
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => setThemeSettings({ ...themeSettings, theme: theme.id as any })}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:shadow-lg ${themeSettings.theme === theme.id ? `border-blue-600 ring-2 ring-blue-100 ${theme.border}` : 'border-gray-100'
                }`}
            >
              <div className={`w-12 h-12 rounded-full mb-3 ${theme.bg} shadow-md`}></div>
              <span className={`font-bold ${themeSettings.theme === theme.id ? 'text-blue-700' : 'text-gray-600'}`}>{theme.name}</span>
              {themeSettings.theme === theme.id && <span className="text-xs text-blue-500 mt-1 font-semibold">مفعل</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-red-300 max-w-3xl mx-auto text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">منطقة الخطر</h2>
        <button onClick={handleClearRequest} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors">
          تفريغ جميع البيانات (Reset)
        </button>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-bold text-gray-700 mb-2">أدوات الإصلاح</h3>
          <button onClick={handleRepairData} className="bg-orange-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-orange-600 transition-colors">
            فحص وإصلاح البيانات (Repair)
          </button>
          <button onClick={handleRegenerateJournalEntries} className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition-colors mr-2">
            إعادة بناء القيود المحاسبية (Regenerate Journals)
          </button>
          <p className="text-xs text-gray-500 mt-2">استخدم هذا الزر إذا كانت التقارير المالية فارغة رغم وجود فواتير.</p>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmClear}
        title="تأكيد تفريغ البيانات"
        message="هل أنت متأكد تماماً من رغبتك في حذف جميع البيانات؟ سيتم فقدان كل شيء بشكل دائم."
      />

      {
        isOpeningBalancesOpen && customers && setCustomers && suppliers && setSuppliers && products && setProducts && (
          <OpeningBalancesModal
            onClose={() => setIsOpeningBalancesOpen(false)}
            customers={customers}
            setCustomers={setCustomers}
            suppliers={suppliers}
            setSuppliers={setSuppliers}
            partners={partners}
            setPartners={setPartners || (() => {})}
            products={products}
            setProducts={setProducts}
            companyInfo={companyInfo}
            setCompanyInfo={setCompanyInfo}
          />
        )
      }

      <ConnectionSettings
        isOpen={isConnectionSettingsOpen}
        onClose={() => setIsConnectionSettingsOpen(false)}
      />
    </div >
  );
};

export default Settings;
