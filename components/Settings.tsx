
import React, { useState, useEffect, useRef } from 'react';
import type { CompanyInfo, Customer, Supplier, Product, User, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, Account, ThemeSettings, ModulePostingSettings } from '../types.ts';
import ConfirmationModal from './ConfirmationModal.tsx';
import OpeningBalancesModal from './OpeningBalancesModal.tsx';
import ConnectionSettings from './ConnectionSettings.tsx';
import { defaultSettingsValues, moduleTabs } from './ModuleAccountingSettingsModal.tsx';

const WALLPAPER_PRESETS = [
  { id: 'office', name: 'أبراج وأعمال حديثة', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920' },
  { id: 'dashboard', name: 'إحصاءات وتحليلات', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920' },
  { id: 'manufacturing', name: 'مصانع وإنتاج وتغليف', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1920' },
  { id: 'warehouse', name: 'مستودعات وتخزين', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920' },
  { id: 'finance', name: 'خزينة وبنوك', url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920' },
  { id: 'sales', name: 'مبيعات وتجارة', url: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1920' },
  { id: 'minimal_marble', name: 'رخام هادئ وراقي', url: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=1920' },
  { id: 'dark_luxury', name: 'تجريدي داكن فاخر', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1920' },
];

const DEFAULT_PAGE_BACKGROUNDS: Record<string, { label: string; icon: string; defaultUrl: string }> = {
  dashboard: { label: 'لوحة التحكم', icon: '📊', defaultUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920' },
  sales: { label: 'فواتير المبيعات', icon: '💰', defaultUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1920' },
  quotations: { label: 'عروض الأسعار', icon: '📋', defaultUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=1920' },
  purchases: { label: 'فواتير المشتريات', icon: '🛒', defaultUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1920' },
  purchaseRequests: { label: 'طلبات الشراء', icon: '📝', defaultUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920' },
  purchaseOrders: { label: 'أوامر الشراء', icon: '📑', defaultUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920' },
  manufacturing: { label: 'التصنيع والإنتاج', icon: '⚙️', defaultUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1920' },
  inventory: { label: 'المخزون والأصناف', icon: '📦', defaultUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1920' },
  warehouse: { label: 'المستودعات والمخازن', icon: '🏬', defaultUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920' },
  treasury: { label: 'الخزينة والمصارف', icon: '🏦', defaultUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920' },
  reports: { label: 'الحسابات والتقارير', icon: '📈', defaultUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1920' },
  accountingSettings: { label: 'إعدادات التوجيه المحاسبي', icon: '⚖️', defaultUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920' },
};

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
  postingSettings?: ModulePostingSettings;
  setPostingSettings?: React.Dispatch<React.SetStateAction<ModulePostingSettings>>;
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
  expenses = [],
  postingSettings = {},
  setPostingSettings,
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
  const [selectedBgPage, setSelectedBgPage] = useState<string>('dashboard');

  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetPage?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً (أكثر من 5 ميجابايت). يرجى اختيار صورة أصغر حجماً.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;
      if (targetPage) {
        setThemeSettings(prev => ({
          ...prev,
          pageBackgrounds: {
            ...(prev.pageBackgrounds || {}),
            [targetPage]: base64,
          }
        }));
      } else {
        setThemeSettings(prev => ({
          ...prev,
          defaultBackgroundUrl: base64,
        }));
      }
      setSuccessMessage('تم تحديث صورة الخلفية بنجاح');
      setTimeout(() => setSuccessMessage(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpapers = () => {
    if (window.confirm('هل تريد استعادة جميع خلفيات النظام ومقاييس العرض الافتراضية؟')) {
      const defaultPages: Record<string, string> = {};
      Object.entries(DEFAULT_PAGE_BACKGROUNDS).forEach(([k, v]) => {
        defaultPages[k] = v.defaultUrl;
      });
      setThemeSettings(prev => ({
        ...prev,
        backgroundEnabled: true,
        backgroundOpacity: 90,
        backgroundBlur: 'sm',
        backgroundMode: 'per_page',
        defaultBackgroundUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920',
        pageBackgrounds: defaultPages,
      }));
      setSuccessMessage('تمت استعادة الخلفيات الافتراضية بنجاح');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // --- Accounting Posting Settings State ---
  const [postingCurrentTab, setPostingCurrentTab] = useState<'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse' | 'all'>('sales');
  const [postingFormData, setPostingFormData] = useState<ModulePostingSettings>({
    ...defaultSettingsValues,
    ...(postingSettings || {})
  });
  const [postingAccountFilter, setPostingAccountFilter] = useState('');
  const [postingSuccessMessage, setPostingSuccessMessage] = useState('');

  useEffect(() => {
    if (postingSettings && Object.keys(postingSettings).length > 0) {
      setPostingFormData(prev => ({
        ...defaultSettingsValues,
        ...postingSettings
      }));
    }
  }, [postingSettings]);

  const handlePostingChange = (field: keyof ModulePostingSettings, value: string) => {
    setPostingFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePosting = () => {
    if (setPostingSettings) {
      setPostingSettings(postingFormData);
    }
    setPostingSuccessMessage('تم حفظ وتطبيق توجيهات القيود المحاسبية بنجاح لكافة الصفحات');
    setTimeout(() => setPostingSuccessMessage(''), 4000);
  };

  const handleResetPostingDefaults = () => {
    if (window.confirm('هل تريد استعادة جميع الحسابات المحاسبية الافتراضية للنظام؟')) {
      const reset = { ...defaultSettingsValues };
      setPostingFormData(reset);
      if (setPostingSettings) {
        setPostingSettings(reset);
      }
      setPostingSuccessMessage('تمت استعادة حسابات التوجيه المحاسبي الافتراضية بنجاح');
      setTimeout(() => setPostingSuccessMessage(''), 4000);
    }
  };
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

  const selectablePostingAccounts = accounts.filter(a => !a.isGroup);
  const filteredPostingAccounts = postingAccountFilter.trim()
    ? selectablePostingAccounts.filter(a =>
        (a.name || '').toLowerCase().includes(postingAccountFilter.toLowerCase()) ||
        (a.code || '').toLowerCase().includes(postingAccountFilter.toLowerCase())
      )
    : selectablePostingAccounts;

  const renderPostingAccountField = (
    label: string,
    field: keyof ModulePostingSettings,
    defaultAccId: string,
    description: string,
    badgeColor: string = 'text-blue-600'
  ) => {
    const currentValue = postingFormData[field] || defaultAccId;
    const currentAccount = accounts.find(a => a.id === currentValue);

    return (
      <div className="bg-slate-50/80 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors">
        <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <span>{label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border font-mono ${badgeColor}`}>
              الافتراضي: {defaultAccId}
            </span>
          </label>
          {currentAccount && (
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {currentAccount.code} - {currentAccount.name}
            </span>
          )}
        </div>

        <select
          value={currentValue}
          onChange={e => handlePostingChange(field, e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-xs font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {filteredPostingAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name} ({a.type === 'Asset' || a.type === 'مدين' ? 'أصول/مدين' : 'خصوم/دائن'})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    );
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

      {/* Module Accounting Posting Settings Section */}
      <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8 relative overflow-hidden text-right border-2 border-blue-500/30">
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-bl-lg font-bold">
          محاسبة متقدمة
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl p-2 bg-blue-100 dark:bg-blue-950 text-blue-700 rounded-xl">⚙️</span>
            <div>
              <h2 className="text-xl font-bold text-main">
                إعدادات التوجيه والترحيل المحاسبي
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                توجيه قيود اليومية التلقائية وتحديد الحسابات لكل موديول في النظام
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetPostingDefaults}
              className="text-xs text-gray-500 hover:text-red-600 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
            >
              <span>🔄</span>
              <span>استعادة الافتراضيات</span>
            </button>
            <button
              type="button"
              onClick={handleSavePosting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm flex items-center gap-1 transition-all"
            >
              <span>💾</span>
              <span>حفظ التوجيهات</span>
            </button>
          </div>
        </div>

        {postingSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 px-4 py-2 rounded-xl font-bold text-xs mb-4 text-center">
            ✓ {postingSuccessMessage}
          </div>
        )}

        {/* Module Switcher Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {moduleTabs.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPostingCurrentTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                postingCurrentTab === t.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.title}</span>
            </button>
          ))}
        </div>

        {/* Quick Search inside Accounts */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 تصفية الحسابات بالاسم أو الكود لتسهيل الاختيار..."
            value={postingAccountFilter}
            onChange={e => setPostingAccountFilter(e.target.value)}
            className="w-full text-xs p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-right focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Tab Content Fields */}
        <div className="space-y-6">
          {/* Sales Tab */}
          {(postingCurrentTab === 'sales' || postingCurrentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">📈</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">توجيهات موديول المبيعات (فواتير، عروض، مرتجعات)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderPostingAccountField('حساب العملاء (المدينون)', 'salesReceivablesAccountId', '1103', 'يُسجل مديناً بإجمالي الفاتورة الآجلة أو دائناً بالمرتجع')}
                {renderPostingAccountField('حساب إيرادات المبيعات', 'salesRevenueAccountId', '4101', 'يُسجل دائناً بقيمة المبيعات المحققة')}
                {renderPostingAccountField('حساب مرتجعات ومسموحات المبيعات', 'salesReturnsAccountId', '4102', 'يُسجل مديناً عند عمل مرتجع بيع أو إلغاء فاتورة')}
                {renderPostingAccountField('حساب تكلفة البضاعة المباعة (COGS)', 'salesCogsAccountId', '5101', 'يُسجل مديناً بتكلفة الأصناف المباعة وفق الجرد المستمر')}
                {renderPostingAccountField('حساب المخزون الافتراضي للمبيعات', 'salesDefaultInventoryAccountId', '1104', 'يُسجل دائناً بتكلفة الأصناف المباعة لخفض المخزون')}
                {renderPostingAccountField('حساب ضريبة القيمة المضافة المحصلة', 'salesVatAccountId', '2105', 'حساب وسيط لضريبة المبيعات المحصلة لصالح الضرائب')}
                {renderPostingAccountField('حساب الخصم المسموح به', 'salesDiscountAccountId', '5301', 'يُسجل مديناً عند منح خصم تجاري أو تعجيلي للعميل')}
              </div>
            </div>
          )}

          {/* Purchases Tab */}
          {(postingCurrentTab === 'purchases' || postingCurrentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">🛒</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">توجيهات موديول المشتريات (فواتير، طلبات، أوامر)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderPostingAccountField('حساب الموردين (الدائنون)', 'purchasePayablesAccountId', '2101', 'يُسجل دائناً بإجمالي فاتورة الشراء الآجلة أو مديناً بالمرتجع')}
                {renderPostingAccountField('حساب مخزون الخامات والمشتريات', 'purchaseDefaultInventoryAccountId', '110401', 'يُسجل مديناً بقيمة المواد المشتراة لزيادة رصيد المخزون')}
                {renderPostingAccountField('حساب مصروفات المشتريات والشحن', 'purchaseExpensesAccountId', '5201', 'حساب التكلفة للبنود الخدمية والمصروفات المصاحبة للشراء')}
                {renderPostingAccountField('حساب ضريبة القيمة المضافة مدخلات', 'purchaseVatAccountId', '1106', 'حساب ضريبة المشتريات القابلة للخصم والاسترداد')}
                {renderPostingAccountField('حساب الخصم المكتسب من الموردين', 'purchaseDiscountAccountId', '4202', 'يُسجل دائناً بقيمة الخصومات المكتسبة من الموردين')}
                {renderPostingAccountField('حساب اعتمادات وبضاعة بالطريق', 'purchaseGoodsInTransitAccountId', '110404', 'للتوريدات المؤجلة قبل وصولها الفعلي للمخازن')}
              </div>
            </div>
          )}

          {/* Manufacturing Tab */}
          {(postingCurrentTab === 'manufacturing' || postingCurrentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">🏗️</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">توجيهات موديول التصنيع والتشغيل والأوامر</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderPostingAccountField('حساب الإنتاج تحت التشغيل (WIP)', 'mfgWipAccountId', '110402', 'يُحمل بجميع تكاليف المواد والمصنعيات والمصروفات أثناء التصنيع')}
                {renderPostingAccountField('حساب مخزون الخامات المستهلكة', 'mfgRawMaterialAccountId', '110401', 'يُسجل دائناً بتكلفة الخامات المنصرفة لأمر الإنتاج')}
                {renderPostingAccountField('حساب مخزون الإنتاج التام النهائي', 'mfgFinishedGoodsAccountId', '110403', 'يُسجل مديناً بالتكلفة الإجمالية للمنتج النهائي التام')}
                {renderPostingAccountField('حساب مصنعيات الغير ومقاولي الباطن', 'mfgSubcontractorAccountId', '2101', 'يُسجل دائناً بتكلفة العمليات الخارجية المنفذة لدى الغير')}
                {renderPostingAccountField('حساب خسائر وهالك الإنتاج (Scrap)', 'mfgScrapLossAccountId', '5203', 'يُسجل مديناً بتكلفة الهالك والتالف الخارج عن المعدلات الطبيعية')}
                {renderPostingAccountField('حساب أجور ومصروفات التشغيل المباشرة', 'mfgDirectLaborAccountId', '5102', 'أجور عمال الإنتاج وتكاليف التشغيل المحملة على الأمر')}
                {renderPostingAccountField('حساب المصروفات الصناعية غير المباشرة', 'mfgDefaultExpenseAccountId', '5201', 'الكهرباء والصيانة والمصروفات الخدمية للمصنع')}
              </div>
            </div>
          )}

          {/* Treasury Tab */}
          {(postingCurrentTab === 'treasury' || postingCurrentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">🏦</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">توجيهات موديول الخزينة والبنوك وحركات النقدية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderPostingAccountField('حساب الخزينة النقدية الرئيسية', 'treasuryMainCashAccountId', '1101', 'الحساب النقدي لصندوق النقدية الرئيسي')}
                {renderPostingAccountField('حساب البنك الرئيسي', 'treasuryBankAccountId', '1102', 'حساب المعاملات البنكية والشيكات')}
                {renderPostingAccountField('حساب المحافظ الإلكترونية (فودافون كاش)', 'treasuryVodafoneCashAccountId', '1106', 'حساب المعاملات النقدية عبر محافظ الهواتف')}
                {renderPostingAccountField('حساب شبكة المدفوعات اللحظية (إنستاباي)', 'treasuryInstapayAccountId', '1107', 'حساب التحويلات الفورية اللحظية')}
                {renderPostingAccountField('حساب مصاريف وعمولات بنكية', 'treasuryBankFeesAccountId', '5201', 'يُحمل بالعمولات والمصاريف الإدارية المقتطعة')}
                {renderPostingAccountField('حساب جاري الشركاء الافتراضي', 'treasuryPartnerCurrentAccountId', '3102', 'مسحوبات وإيداعات الشركاء والتمويلات الشخصية')}
              </div>
            </div>
          )}

          {/* Warehouse & Assets Tab */}
          {(postingCurrentTab === 'warehouse' || postingCurrentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-lg">🏭</span>
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">توجيهات المخازن والتسويات الجردية والأصول الثابتة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderPostingAccountField('حساب عجز الجرد والتسويات السالبة', 'inventoryAdjustmentLossAccountId', '5201', 'يُسجل مديناً بقيمة العجز والتلف المخزني المكتشف أثناء الجرد')}
                {renderPostingAccountField('حساب فائض الجرد والتسويات الموجبة', 'inventoryAdjustmentGainAccountId', '4201', 'يُسجل دائناً كإيراد رأس مالي ناتج عن الزيادات الجردية')}
                {renderPostingAccountField('حساب مجمع إهلاك الأصول الثابتة', 'fixedAssetsAccumDepreciationAccountId', '1202', 'حساب الخصوم المقابل للأصول لتراكم الإهلاك السنوي')}
                {renderPostingAccountField('حساب مصروف إهلاك الأصول الثابتة', 'fixedAssetsDepreciationExpenseAccountId', '5204', 'يُسجل مديناً ضمن مصروفات الفترة بقسط الإهلاك الدفتري')}
              </div>
            </div>
          )}
        </div>

        {/* Section Bottom Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
          <span className="text-[11px] text-gray-400">
            * تنطبق هذه الحسابات فوراً على كافة الفواتير وسندات الصرف والقبض والتشغيل التي يتم إنشاؤها لاحقاً.
          </span>
          <button
            type="button"
            onClick={handleSavePosting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <span>💾</span>
            <span>حفظ وتطبيق التوجيهات المحاسبية</span>
          </button>
        </div>
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

      {/* Background Wallpaper Settings Section */}
      <div className="bg-theme-card p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8 relative overflow-hidden text-right">
        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">تخصيص</div>
        <h2 className="text-xl font-bold text-main mb-2 pb-2 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            إعدادات خلفيات النظام والصفحات (Wallpapers)
          </div>
          <button
            type="button"
            onClick={handleResetWallpapers}
            className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            استعادة الافتراضيات
          </button>
        </h2>
        <p className="text-xs text-gray-500 mb-6">
          تحكم في تشغيل وإيقاف صور الخلفية لكافة الشاشات أو تخصيص خلفية فريدة لكل موديول، مع ضبط الشفافية والتغبيش لضمان راحة العين ووضوح البيانات.
        </p>

        {/* Toggle On/Off Switch */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6 border border-gray-200 dark:border-gray-700">
          <div>
            <div className="font-bold text-sm text-gray-800 dark:text-gray-200">تفعيل صور الخلفية في النظام</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {themeSettings.backgroundEnabled !== false ? 'الصور مفعلة وتظهر خلف شاشات البرنامج بتأثير شفاف وناعم.' : 'الخلفيات معطلة، ويعمل النظام بلون موحد هادئ وسريع.'}
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={themeSettings.backgroundEnabled !== false}
              onChange={(e) => setThemeSettings({ ...themeSettings, backgroundEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {themeSettings.backgroundEnabled !== false && (
          <div className="space-y-6">
            {/* Visual Adjustments: Opacity & Blur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <label className="font-bold text-gray-700 dark:text-gray-300">نسبة عتامة الغطاء الشفاف</label>
                  <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-xs">
                    {themeSettings.backgroundOpacity ?? 90}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="98"
                  step="2"
                  value={themeSettings.backgroundOpacity ?? 90}
                  onChange={(e) => setThemeSettings({ ...themeSettings, backgroundOpacity: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="text-[11px] text-gray-400">
                  موصى به: 90% إلى 95% لقراءة مريحة وواضحة جداً لجميع الجداول.
                </p>
              </div>

              {/* Blur Level */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">درجة التغبيش والضبابية (Blur)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'none', label: 'بدون' },
                    { id: 'sm', label: 'خفيف' },
                    { id: 'md', label: 'متوسط' },
                    { id: 'lg', label: 'قوي' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setThemeSettings({ ...themeSettings, backgroundBlur: b.id as any })}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${(themeSettings.backgroundBlur || 'sm') === b.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">
                  تنعيم تفاصيل الخلفية لمنع تشتيت الانتباه أثناء العمل.
                </p>
              </div>
            </div>

            {/* Mode Selector: Unified vs Per-Page */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">نمط الخلفيات</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setThemeSettings({ ...themeSettings, backgroundMode: 'unified' })}
                  className={`p-3 rounded-xl border text-center transition-all ${themeSettings.backgroundMode === 'unified'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className="text-sm">🖼️ صورة موحدة لكافة الصفحات</div>
                  <div className="text-[11px] font-normal text-gray-500 mt-0.5">صورة واحدة تنطبق على كامل النظام</div>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeSettings({ ...themeSettings, backgroundMode: 'per_page' })}
                  className={`p-3 rounded-xl border text-center transition-all ${(themeSettings.backgroundMode || 'per_page') === 'per_page'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <div className="text-sm">📑 خلفية مخصصة لكل شاشة</div>
                  <div className="text-[11px] font-normal text-gray-500 mt-0.5">خلفية خاصة ومناسبة لطبيعة كل موديول</div>
                </button>
              </div>
            </div>

            {/* Unified Mode Settings */}
            {themeSettings.backgroundMode === 'unified' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-44 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-inner relative flex-shrink-0 bg-gray-200">
                    <img
                      src={themeSettings.defaultBackgroundUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920'}
                      alt="معاينة الخلفية الموحدة"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      معاينة الحالية
                    </span>
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">رابط صورة الخلفية (URL) أو رفع من جهازك</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={themeSettings.defaultBackgroundUrl || ''}
                        onChange={(e) => setThemeSettings({ ...themeSettings, defaultBackgroundUrl: e.target.value })}
                        placeholder="https://images.unsplash.com/... أو رابط الصورة"
                        className="flex-1 text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-left"
                        dir="ltr"
                      />
                      <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        رفع صورة
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleBgFileUpload(e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Preset Wallpapers Gallery for Unified Mode */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">اختر من المعرض الجاهز السريع:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {WALLPAPER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setThemeSettings({ ...themeSettings, defaultBackgroundUrl: preset.url })}
                        className={`relative rounded-lg overflow-hidden border-2 text-right transition-all group h-16 ${
                          themeSettings.defaultBackgroundUrl === preset.url ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1.5">
                          <span className="text-[11px] font-bold text-white drop-shadow truncate">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Per-Page Mode Settings */}
            {(themeSettings.backgroundMode || 'per_page') === 'per_page' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">اختر الشاشة أو الموديول لتخصيص خلفيته:</label>
                  {/* Page Selector Tabs */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-gray-200/70 dark:bg-gray-700/60 rounded-xl">
                    {Object.entries(DEFAULT_PAGE_BACKGROUNDS).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedBgPage(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          selectedBgPage === key
                            ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                        }`}
                      >
                        <span>{info.icon}</span>
                        <span>{info.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Page Editor */}
                {selectedBgPage && DEFAULT_PAGE_BACKGROUNDS[selectedBgPage] && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span>{DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].icon}</span>
                        <span>خلفية صفحة: {DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultUrl = DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].defaultUrl;
                          setThemeSettings(prev => ({
                            ...prev,
                            pageBackgrounds: {
                              ...(prev.pageBackgrounds || {}),
                              [selectedBgPage]: defaultUrl,
                            }
                          }));
                        }}
                        className="text-[11px] text-gray-500 hover:text-indigo-600 font-semibold transition-colors"
                      >
                        استعادة الافتراضي لهذه الصفحة
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-full sm:w-44 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 shadow-inner relative flex-shrink-0 bg-gray-200">
                        <img
                          src={
                            (themeSettings.pageBackgrounds && themeSettings.pageBackgrounds[selectedBgPage]) ||
                            DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].defaultUrl
                          }
                          alt={DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].label}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          معاينة
                        </span>
                      </div>
                      <div className="flex-1 w-full space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">رابط صورة الخلفية أو رفع ملف من جهازك</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={
                              (themeSettings.pageBackgrounds && themeSettings.pageBackgrounds[selectedBgPage]) ||
                              DEFAULT_PAGE_BACKGROUNDS[selectedBgPage].defaultUrl
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              setThemeSettings(prev => ({
                                ...prev,
                                pageBackgrounds: {
                                  ...(prev.pageBackgrounds || {}),
                                  [selectedBgPage]: val,
                                }
                              }));
                            }}
                            placeholder="https://..."
                            className="flex-1 text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-left"
                            dir="ltr"
                          />
                          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1 shrink-0 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            رفع صورة
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleBgFileUpload(e, selectedBgPage)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Quick presets for this page */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1.5">أو اختر صورة سريعة من المعرض:</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {WALLPAPER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setThemeSettings(prev => ({
                                ...prev,
                                pageBackgrounds: {
                                  ...(prev.pageBackgrounds || {}),
                                  [selectedBgPage]: preset.url,
                                }
                              }));
                            }}
                            className="relative rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 h-14 group transition-all"
                          >
                            <img src={preset.url} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 flex items-end p-1">
                              <span className="text-[10px] font-bold text-white drop-shadow truncate">{preset.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mini Grid of All Configured Backgrounds */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">نظرة عامة على خلفيات كافة الشاشات:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {Object.entries(DEFAULT_PAGE_BACKGROUNDS).map(([key, info]) => {
                      const currentUrl = (themeSettings.pageBackgrounds && themeSettings.pageBackgrounds[key]) || info.defaultUrl;
                      const isCustom = themeSettings.pageBackgrounds && themeSettings.pageBackgrounds[key] && themeSettings.pageBackgrounds[key] !== info.defaultUrl;
                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedBgPage(key)}
                          className={`cursor-pointer rounded-lg border p-1.5 flex flex-col gap-1 transition-all ${
                            selectedBgPage === key ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-200' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                          }`}
                        >
                          <div className="h-16 w-full rounded overflow-hidden relative bg-gray-200">
                            <img src={currentUrl} alt={info.label} className="w-full h-full object-cover" />
                            {isCustom && (
                              <span className="absolute top-1 right-1 bg-amber-500 text-white text-[9px] px-1 rounded font-bold">
                                مخصصة
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                            {info.icon} {info.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
