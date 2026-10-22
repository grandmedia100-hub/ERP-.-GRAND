
import React, { useState, useMemo } from 'react';
import type { CustomerPayment, SupplierPayment, Customer, Supplier, TreasuryAccountType, CompanyInfo, JournalEntry, Account, ModulePostingSettings } from '../types.ts';
import AddReceiptModal from './AddReceiptModal.tsx';
import AddPaymentModal from './AddPaymentModal.tsx';
import AddTransferModal from './AddTransferModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import { exportToExcel } from '../utils/exportToExcel.ts';
import { showNotification } from '../services/notificationService.ts';
import type { TreasuryTransfer } from '../types.ts';

interface TreasuryProps {
  customerPayments: CustomerPayment[];
  setCustomerPayments: React.Dispatch<React.SetStateAction<CustomerPayment[]>>;
  supplierPayments: SupplierPayment[];
  setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
  customers: Customer[];
  suppliers: Supplier[];
  createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'> | any) => void;
  logAction: (action: string) => void;
  currentUser: any; // Or User type
  deleteJournalEntryByReference: (refId: string) => void;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  treasuryTransfers: TreasuryTransfer[];
  setTreasuryTransfers: React.Dispatch<React.SetStateAction<TreasuryTransfer[]>>;
  branches?: { id: string; name: string }[];
  currentBranchId?: string;
  postingSettings?: ModulePostingSettings;
  onOpenSettings?: () => void;
}

const Treasury: React.FC<TreasuryProps> = ({
  customerPayments, setCustomerPayments, supplierPayments, setSupplierPayments, customers, suppliers,
  createJournalEntry, logAction, currentUser, deleteJournalEntryByReference, accounts, setAccounts,
  treasuryTransfers, setTreasuryTransfers,
  branches = [
    { id: 'main', name: 'جراند ميديا' },
    { id: 'branch_1792042133332', name: 'برو باك' }
  ],
  currentBranchId = 'main',
  postingSettings,
  onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'receipts' | 'payments' | 'transfers'>('receipts');

  // Modals State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Editing State
  const [editingReceipt, setEditingReceipt] = useState<CustomerPayment | null>(null);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);

  // Deletion State
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'receipt' | 'payment' | 'transfer' } | null>(null);

  // Filter State
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic treasury, bank, and electronic wallet accounts extracted from the active branch's Chart of Accounts
  const accountOptions: TreasuryAccountType[] = useMemo(() => {
    const list = (accounts || []).filter(a =>
      !a.isGroup && (
        ['1101', '1102', '1105', '1106', '1107'].includes(a.id) ||
        ['1101', '1102', '1105', '1106', '1107'].includes(a.code) ||
        a.name.includes('خزينة') ||
        a.name.includes('صندوق') ||
        a.name.includes('بنك') ||
        a.name.includes('كاش') ||
        a.name.includes('محفظ') ||
        a.name.includes('انستاباي') ||
        a.name.includes('انستاباى')
      )
    );
    if (list.length > 0) {
      return list.map(a => a.name);
    }
    return ['الخزينة الرئيسية', 'انستاباى', 'فودافون كاش', 'بنك فيصل', 'البنك الاهلى'];
  }, [accounts]);

  const recAccId = postingSettings?.salesReceivablesAccountId || '1103';
  const payablesAccId = postingSettings?.purchasePayablesAccountId || '2101';

  const getAccountId = (name: string): string => {
    // 1. Direct match by account name in branch accounts
    const match = (accounts || []).find(a => a.name === name);
    if (match) return match.id;

    // 2. Keyword fallback or posting settings
    if (name.includes('الرئيسية') || name.includes('صندوق')) return postingSettings?.treasuryMainCashAccountId || '1101';
    if (name.includes('الاهلى') || name.includes('الأهلي')) return postingSettings?.treasuryBankAccountId || '1102';
    if (name.includes('فيصل')) return '1105';
    if (name.includes('فودافون') || name.includes('كاش')) return '1106';
    if (name.includes('انستاباي') || name.includes('انستاباى')) return '1107';

    return postingSettings?.treasuryMainCashAccountId || '1101';
  };

  const getOrCreateExpenseAccount = (name: string): string => {
    if (name.includes('عمول') || name.includes('بنك')) {
      if (postingSettings?.treasuryBankFeesAccountId) return postingSettings.treasuryBankFeesAccountId;
    }
    // Look up existing expense account first
    const existing = accounts.find(a => a.name === name && (a.parentId === '52' || a.id.startsWith('52')));
    if (existing) return existing.id;
    // Fallback to configured bank fees or general operating expenses
    return postingSettings?.treasuryBankFeesAccountId || '5201';
  };
  const expenses: any[] = []; // Treasury doesn't hold expenses directly — they come via Expenses module
  const handleAddAutoExpense = () => {};

  // Receipt Handlers
  const handleAddReceipt = () => {
    setEditingReceipt(null);
    setIsReceiptModalOpen(true);
  };

  const handleEditReceipt = (receipt: CustomerPayment) => {
    if (receipt.status === 'voided') return;
    setEditingReceipt(receipt);
    setIsReceiptModalOpen(true);
  };

  const handleSaveReceipt = (receiptData: Omit<CustomerPayment, 'id'> & { id?: string }) => {
    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      // Allow Admin/Developer to bypass
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser) {
        if (new Date(receiptData.date) <= new Date(financialYearLockDate)) {
          alert(`عفواً، لا يمكن إضافة أو تعديل سندات قبض في فترة مالية مغلقة.`);
          return;
        }
        if (receiptData.id) {
          const original = customerPayments.find(p => p.id === receiptData.id);
          if (original && new Date(original.date) <= new Date(financialYearLockDate)) {
            alert(`عفواً، لا يمكن تعديل سند قبض من فترة مالية مغلقة.`);
            return;
          }
        }
      }
    }
    if (receiptData.id) {
      // EDIT Mode
      deleteJournalEntryByReference(receiptData.id);
      deleteJournalEntryByReference(`FEE-${receiptData.id}`);

      // Re-Create Journal Entry for Updated Amount
      createJournalEntry({
        date: receiptData.date,
        description: `تعديل سند قبض رقم: ${receiptData.id}`,
        referenceType: 'Manual',
        referenceId: receiptData.id,
        lines: [
          { accountId: getAccountId(receiptData.treasuryAccount || 'الخزينة الرئيسية'), accountName: receiptData.treasuryAccount || 'الخزينة الرئيسية', debit: receiptData.amount, credit: 0 },
          { accountId: recAccId, accountName: `عميل - ${receiptData.customerName}`, debit: 0, credit: receiptData.amount }
        ],
        branchId: currentBranchId
      });

      // Handle Fee on Edit if present
      if (receiptData.fee && receiptData.fee > 0) {
        const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
        createJournalEntry({
          date: receiptData.date,
          description: `عمولة معاملة سند قبض رقم: ${receiptData.id}`,
          referenceType: 'Manual',
          referenceId: `FEE-${receiptData.id}`,
          lines: [
            { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: receiptData.fee, credit: 0 },
            { accountId: getAccountId(receiptData.treasuryAccount || 'الخزينة الرئيسية'), accountName: receiptData.treasuryAccount || 'الخزينة الرئيسية', debit: 0, credit: receiptData.fee }
          ],
          branchId: currentBranchId
        });
      }

      setCustomerPayments(prev => prev.map(p => p.id === receiptData.id ? { ...p, ...receiptData } as CustomerPayment : p));
      logAction(`تعديل سند قبض: ${receiptData.id}`);

    } else {
      const maxNum = customerPayments.reduce((max, rec) => {
        if (rec.id.startsWith('CP')) {
          const num = parseInt(rec.id.substring(2), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }
        return max;
      }, 0);
      const newId = `CP${(maxNum + 1).toString().padStart(3, '0')}`;
      const newReceipt: CustomerPayment = {
        ...receiptData,
        id: newId,
        status: 'active'
      } as CustomerPayment;
      if (newReceipt.isIntercompany && newReceipt.targetBranchId && newReceipt.targetBranchId !== currentBranchId) {
        const targetName = newReceipt.targetBranchName || 'الكيان الشقيق';
        const customerTitle = newReceipt.targetCustomerName || newReceipt.customerName;
        createJournalEntry({
          date: newReceipt.date,
          description: `تحصيل بيني من عميل (${customerTitle}) لصالح ${targetName}`,
          referenceType: 'Manual',
          referenceId: newReceipt.id,
          lines: [
            { accountId: getAccountId(newReceipt.treasuryAccount || 'الخزينة الرئيسية'), accountName: newReceipt.treasuryAccount || 'الخزينة الرئيسية', debit: newReceipt.amount, credit: 0 },
            { accountId: '2102', accountName: `جاري شركة ${targetName}`, debit: 0, credit: newReceipt.amount }
          ],
          branchId: currentBranchId
        });
        logAction(`إضافة سند تحصيل بيني: ${newReceipt.id} (${newReceipt.amount} لصالح ${targetName})`);
      } else {
        // Journal Entry: Debit Treasury, Credit Customer
        createJournalEntry({
          date: newReceipt.date,
          description: `سند قبض من عميل: ${newReceipt.customerName}`,
          referenceType: 'Manual',
          referenceId: newReceipt.id,
          lines: [
            { accountId: getAccountId(newReceipt.treasuryAccount || 'الخزينة الرئيسية'), accountName: newReceipt.treasuryAccount || 'الخزينة الرئيسية', debit: newReceipt.amount, credit: 0 },
            { accountId: recAccId, accountName: `عميل - ${newReceipt.customerName}`, debit: 0, credit: newReceipt.amount }
          ],
          branchId: currentBranchId
        });

        // Handle Fee if present
        if (newReceipt.fee && newReceipt.fee > 0) {
          const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
          createJournalEntry({
            date: newReceipt.date,
            description: `عمولة معاملة سند قبض رقم: ${newReceipt.id}`,
            referenceType: 'Manual',
            referenceId: `FEE-${newReceipt.id}`,
            lines: [
              { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: newReceipt.fee, credit: 0 },
              { accountId: getAccountId(newReceipt.treasuryAccount || 'الخزينة الرئيسية'), accountName: newReceipt.treasuryAccount || 'الخزينة الرئيسية', debit: 0, credit: newReceipt.fee }
            ],
            branchId: currentBranchId
          });
        }

        logAction(`إضافة سند قبض جديد: ${newReceipt.id} (${newReceipt.amount})`);
      }
    }

    showNotification({
      type: 'cash',
      title: 'تم تسجيل سند قبض بنجاح',
      message: `سند قبض بقيمة ${(receiptData.amount || 0).toLocaleString()} ج.م - ${receiptData.customerName || ''}`,
      sound: 'cash',
      category: 'treasury'
    });

    setIsReceiptModalOpen(false);
    setEditingReceipt(null);
  };

  // Payment Handlers
  const handleAddPayment = () => {
    setEditingPayment(null);
    setIsPaymentModalOpen(true);
  };

  const handleEditPayment = (payment: SupplierPayment) => {
    if (payment.status === 'voided') return;
    setEditingPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (paymentData: Omit<SupplierPayment, 'id'> & { id?: string }) => {
    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      // Allow Admin/Developer to bypass
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser) {
        if (new Date(paymentData.date) <= new Date(financialYearLockDate)) {
          alert(`عفواً، لا يمكن إضافة أو تعديل سندات صرف في فترة مالية مغلقة.`);
          return;
        }
        if (paymentData.id) {
          const original = supplierPayments.find(p => p.id === paymentData.id);
          if (original && new Date(original.date) <= new Date(financialYearLockDate)) {
            alert(`عفواً، لا يمكن تعديل سند صرف من فترة مالية مغلقة.`);
            return;
          }
        }
      }
    }

    // Check Funds
    const account = paymentData.treasuryAccount || 'الخزينة الرئيسية';
    const totalAmount = paymentData.amount + (paymentData.fee || 0);

    if (!checkFunds(account, totalAmount, paymentData.id)) {
      alert(`عفواً، لا يوجد رصيد كافٍ في "${account}" لإتمام هذه العملية (المبلغ + العمولة).`);
      return;
    }

    if (paymentData.id) {
      // EDIT Mode
      deleteJournalEntryByReference(paymentData.id);
      deleteJournalEntryByReference(`FEE-${paymentData.id}`);

      const supplier = suppliers.find(s => s.id === paymentData.supplierId);
      const isActuallyExpense = paymentData.isExpense || !supplier;

      createJournalEntry({
        date: paymentData.date,
        description: `تعديل سند صرف ${isActuallyExpense ? 'مصروف' : 'مورد'} رقم: ${paymentData.id}`,
        referenceType: 'Manual',
        referenceId: paymentData.id,
        lines: [
          {
            accountId: isActuallyExpense ? getOrCreateExpenseAccount(paymentData.expenseCategory || 'مصروف عام') : payablesAccId,
            accountName: isActuallyExpense ? (paymentData.expenseCategory || 'مصروف عام') : `مورد - ${paymentData.supplierName}`,
            debit: paymentData.amount,
            credit: 0
          },
          {
            accountId: getAccountId(paymentData.treasuryAccount || 'الخزينة الرئيسية'),
            accountName: paymentData.treasuryAccount || 'الخزينة الرئيسية',
            debit: 0,
            credit: paymentData.amount
          }
        ],
        branchId: currentBranchId
      });

      // Handle Fee on Edit if present
      if (paymentData.fee && paymentData.fee > 0) {
        const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
        createJournalEntry({
          date: paymentData.date,
          description: `عمولة معاملة سند صرف رقم: ${paymentData.id}`,
          referenceType: 'Manual',
          referenceId: `FEE-${paymentData.id}`,
          lines: [
            { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: paymentData.fee, credit: 0 },
            { accountId: getAccountId(paymentData.treasuryAccount || 'الخزينة الرئيسية'), accountName: paymentData.treasuryAccount || 'الخزينة الرئيسية', debit: 0, credit: paymentData.fee }
          ],
          branchId: currentBranchId
        });
      }

      setSupplierPayments(prev => prev.map(p => p.id === paymentData.id ? { ...p, ...paymentData } as SupplierPayment : p));
      logAction(`تعديل سند صرف: ${paymentData.id}`);

    } else {
      const maxNum = supplierPayments.reduce((max, pay) => {
        if (pay.id.startsWith('SP') && !pay.id.startsWith('SP-IC-')) {
          const num = parseInt(pay.id.substring(2), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }
        return max;
      }, 0);
      const newId = `SP${(maxNum + 1).toString().padStart(3, '0')}`;
      const newPayment: SupplierPayment = {
        ...paymentData,
        id: newId,
        status: 'active',
        branchId: currentBranchId
      } as SupplierPayment;
      setSupplierPayments(prev => [...prev, newPayment]);

      if (newPayment.isIntercompany && newPayment.targetBranchId && newPayment.targetBranchId !== currentBranchId) {
        const targetName = newPayment.targetBranchName || 'الكيان الشقيق';
        const supplierTitle = newPayment.targetSupplierName || newPayment.supplierName;
        createJournalEntry({
          date: newPayment.date,
          description: `سداد بيني لمورد (${supplierTitle}) نيابة عن ${targetName}`,
          referenceType: 'Manual',
          referenceId: newPayment.id,
          lines: [
            { accountId: '2102', accountName: `جاري شركة ${targetName}`, debit: newPayment.amount, credit: 0 },
            ...(newPayment.fee && newPayment.fee > 0 ? [{ accountId: '5201', accountName: 'مصاريف وعمولات بنكية', debit: newPayment.fee, credit: 0 }] : []),
            { accountId: getAccountId(newPayment.treasuryAccount || 'الخزينة الرئيسية'), accountName: newPayment.treasuryAccount || 'الخزينة الرئيسية', debit: 0, credit: newPayment.amount + (newPayment.fee || 0) }
          ],
          branchId: currentBranchId
        });
        logAction(`إضافة سند صرف بيني: ${newPayment.id} (${newPayment.amount} نيابة عن ${targetName})`);
      } else {
        const supplier = suppliers.find(s => s.id === newPayment.supplierId);
        const isActuallyExpense = newPayment.isExpense || !supplier;

        createJournalEntry({
          date: newPayment.date,
          description: `${isActuallyExpense ? 'صرف مصروف' : 'سند صرف لمورد'}: ${newPayment.supplierName}`,
          referenceType: 'Manual',
          referenceId: newPayment.id,
          lines: [
            {
              accountId: isActuallyExpense ? getOrCreateExpenseAccount(newPayment.expenseCategory || 'مصروف عام') : payablesAccId,
              accountName: isActuallyExpense ? (newPayment.expenseCategory || 'مصروف عام') : `مورد - ${newPayment.supplierName}`,
              debit: newPayment.amount,
              credit: 0
            },
            {
              accountId: getAccountId(newPayment.treasuryAccount || 'الخزينة الرئيسية'),
              accountName: newPayment.treasuryAccount || 'الخزينة الرئيسية',
              debit: 0,
              credit: newPayment.amount
            }
          ],
          branchId: currentBranchId
        });

        // Handle Fee if present
        if (newPayment.fee && newPayment.fee > 0) {
          const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
          createJournalEntry({
            date: newPayment.date,
            description: `عمولة معاملة سند صرف رقم: ${newPayment.id}`,
            referenceType: 'Manual',
            referenceId: `FEE-${newPayment.id}`,
            lines: [
              { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: newPayment.fee, credit: 0 },
              { accountId: getAccountId(newPayment.treasuryAccount || 'الخزينة الرئيسية'), accountName: newPayment.treasuryAccount || 'الخزينة الرئيسية', debit: 0, credit: newPayment.fee }
            ],
            branchId: currentBranchId
          });
        }

        logAction(`إضافة سند صرف جديد: ${newPayment.id} (${newPayment.amount})`);
      }
    }

    showNotification({
      type: 'info',
      title: 'تم تسجيل سند صرف بنجاح',
      message: `سند صرف بقيمة ${(paymentData.amount || 0).toLocaleString()} ج.م - ${paymentData.supplierName || ''}`,
      sound: 'cash',
      category: 'treasury'
    });

    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  // Transfer Handlers
  const handleAddTransfer = () => {
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = (transferData: Omit<TreasuryTransfer, 'id'>) => {
    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      // Allow Admin/Developer to bypass
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser && new Date(transferData.date) <= new Date(financialYearLockDate)) {
        alert(`عفواً، لا يمكن إضافة أو تعديل تحويلات في فترة مالية مغلقة.`);
        return;
      }
    }

    // Check Funds
    if (!checkFunds(transferData.fromAccount, transferData.amount + transferData.fee)) {
      alert(`عفواً، لا يوجد رصيد كافٍ في "${transferData.fromAccount}" لإتمام هذه العملية.`);
      return;
    }

    const maxNum = treasuryTransfers.reduce((max, tr) => {
      if (tr.id.startsWith('TR') && !tr.id.startsWith('TR-IC-')) {
        const num = parseInt(tr.id.substring(2), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }
      return max;
    }, 0);
    const newId = `TR${(maxNum + 1).toString().padStart(3, '0')}`;
    const newTransfer: TreasuryTransfer = {
      ...transferData,
      id: newId,
      status: 'active',
      branchId: currentBranchId
    };
    setTreasuryTransfers(prev => [...prev, newTransfer]);

    if (newTransfer.isIntercompany && newTransfer.toBranchId && newTransfer.toBranchId !== currentBranchId) {
      const targetName = newTransfer.toBranchName || 'الكيان الشقيق';
      createJournalEntry({
        date: newTransfer.date,
        description: `تحويل بيني إلى ${targetName} (${newTransfer.toAccount})`,
        referenceType: 'Manual',
        referenceId: newTransfer.id,
        lines: [
          { accountId: '2102', accountName: `جاري شركة ${targetName}`, debit: newTransfer.amount, credit: 0 },
          ...(newTransfer.fee > 0 ? [{ accountId: '5201', accountName: 'مصاريف وعمولات بنكية', debit: newTransfer.fee, credit: 0 }] : []),
          { accountId: getAccountId(newTransfer.fromAccount), accountName: newTransfer.fromAccount, debit: 0, credit: newTransfer.amount + (newTransfer.fee || 0) }
        ],
        branchId: currentBranchId
      });
      logAction(`تحويل رصيد بيني: ${newTransfer.id} (${newTransfer.amount} من ${newTransfer.fromAccount} إلى ${targetName} [${newTransfer.toAccount}])`);
    } else {
      createJournalEntry({
        date: newTransfer.date,
        description: `تحويل من ${newTransfer.fromAccount} إلى ${newTransfer.toAccount}`,
        referenceType: 'Manual',
        referenceId: newTransfer.id,
        lines: [
          { accountId: getAccountId(newTransfer.toAccount), accountName: newTransfer.toAccount, debit: newTransfer.amount, credit: 0 },
          { accountId: getAccountId(newTransfer.fromAccount), accountName: newTransfer.fromAccount, debit: 0, credit: newTransfer.amount }
        ],
        branchId: currentBranchId
      });

      if (newTransfer.fee > 0) {
        const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
        createJournalEntry({
          date: newTransfer.date,
          description: `عمولة تحويل رقم: ${newTransfer.id}`,
          referenceType: 'Manual',
          referenceId: `FEE-${newTransfer.id}`,
          lines: [
            { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: newTransfer.fee, credit: 0 },
            { accountId: getAccountId(newTransfer.fromAccount), accountName: newTransfer.fromAccount, debit: 0, credit: newTransfer.fee }
          ],
          branchId: currentBranchId
        });
      }
      logAction(`تحويل رصيد: ${newTransfer.id} (${newTransfer.amount} من ${newTransfer.fromAccount} إلى ${newTransfer.toAccount})`);
    }

    showNotification({
      type: 'success',
      title: 'تم تسجيل تحويل نقدية بين الحسابات',
      message: `تحويل مبلغ ${(transferData.amount || 0).toLocaleString()} ج.م من (${transferData.fromAccount}) إلى (${transferData.toAccount})`,
      sound: 'success',
      category: 'treasury'
    });

    setIsTransferModalOpen(false);
  };


  // Void/Delete Handlers
  const handleActionRequest = (id: string, type: 'receipt' | 'payment' | 'transfer') => {
    setItemToDelete({ id, type });
    setIsConfirmModalOpen(true);
  };

  const confirmAction = () => {
    if (itemToDelete) {
      // Check Financial Lock BEFORE proceeding
      const companyInfoString = localStorage.getItem('companyInfo');

      if (itemToDelete.type === 'receipt') {
        const receipt = customerPayments.find(p => p.id === itemToDelete.id);
        if (receipt) {
          if (companyInfoString) {
            const { financialYearLockDate } = JSON.parse(companyInfoString);
            // Allow Admin/Developer to bypass
            const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

            if (financialYearLockDate && isRestrictedUser && new Date(receipt.date) <= new Date(financialYearLockDate)) {
              alert(`عفواً، لا يمكن إلغاء سند قبض في فترة مالية مغلقة.`);
              setIsConfirmModalOpen(false);
              setItemToDelete(null);
              return;
            }
          }

          setCustomerPayments(prev => prev.map(p => p.id === itemToDelete.id ? { ...p, status: 'voided' } : p));

          // Create Reversing Entry (Do Not Delete Old, Just Reverse for audit trail of void)
          const isIC = (receipt as any).receivedByOtherBranch;
          createJournalEntry({
            date: new Date().toISOString().split('T')[0],
            description: `إلغاء سند قبض رقم ${receipt.id}`,
            referenceType: 'Manual',
            referenceId: receipt.id,
            lines: [
              { accountId: recAccId, accountName: `عميل - ${receipt.customerName}`, debit: receipt.amount, credit: 0 },
              { accountId: isIC ? '2102' : getAccountId(receipt.treasuryAccount || 'الخزينة الرئيسية'), accountName: isIC ? 'جاري الأطراف الشقيقة' : (receipt.treasuryAccount || 'الخزينة الرئيسية'), debit: 0, credit: receipt.amount }
            ],
            branchId: currentBranchId
          });

          // Reverse Fee if present
          if (receipt.fee && receipt.fee > 0) {
            const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
            createJournalEntry({
              date: new Date().toISOString().split('T')[0],
              description: `إلغاء عمولة سند قبض رقم ${receipt.id}`,
              referenceType: 'Manual',
              referenceId: `VOID-FEE-${receipt.id}`,
              lines: [
                { accountId: getAccountId(receipt.treasuryAccount || 'الخزينة الرئيسية'), accountName: receipt.treasuryAccount || 'الخزينة الرئيسية', debit: receipt.fee, credit: 0 },
                { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: 0, credit: receipt.fee }
              ],
              branchId: currentBranchId
            });
          }

          logAction(`إلغاء سند قبض: ${receipt.id}`);
        }
      } else if (itemToDelete.type === 'payment') {
        const payment = supplierPayments.find(p => p.id === itemToDelete.id);
        if (payment) {
          if (companyInfoString) {
            const { financialYearLockDate } = JSON.parse(companyInfoString);
            // Allow Admin/Developer to bypass
            const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

            if (financialYearLockDate && isRestrictedUser && new Date(payment.date) <= new Date(financialYearLockDate)) {
              alert(`عفواً، لا يمكن إلغاء سند صرف في فترة مالية مغلقة.`);
              setIsConfirmModalOpen(false);
              setItemToDelete(null);
              return;
            }
          }

          setSupplierPayments(prev => prev.map(p => p.id === itemToDelete.id ? { ...p, status: 'voided' } : p));

          // Void Payment: Originally Debit Supplier, Credit Treasury.
          // Reverse: Debit Treasury, Credit Supplier.
          const isIC = (payment as any).paidByOtherBranch;
          createJournalEntry({
            date: new Date().toISOString().split('T')[0],
            description: `إلغاء سند صرف رقم ${payment.id}`,
            referenceType: 'Manual',
            referenceId: payment.id,
            lines: [
              { accountId: isIC ? '2102' : getAccountId(payment.treasuryAccount || 'الخزينة الرئيسية'), accountName: isIC ? 'جاري الأطراف الشقيقة' : (payment.treasuryAccount || 'الخزينة الرئيسية'), debit: payment.amount, credit: 0 },
              { accountId: payablesAccId, accountName: `مورد - ${payment.supplierName}`, debit: 0, credit: payment.amount }
            ],
            branchId: currentBranchId
          });

          // Reverse Fee if present
          if (payment.fee && payment.fee > 0) {
            const feeAccountId = getOrCreateExpenseAccount('مصاريف وعمولات بنكية');
            createJournalEntry({
              date: new Date().toISOString().split('T')[0],
              description: `إلغاء عمولة سند صرف رقم ${payment.id}`,
              referenceType: 'Manual',
              referenceId: `VOID-FEE-${payment.id}`,
              lines: [
                { accountId: getAccountId(payment.treasuryAccount || 'الخزينة الرئيسية'), accountName: payment.treasuryAccount || 'الخزينة الرئيسية', debit: payment.fee, credit: 0 },
                { accountId: feeAccountId, accountName: 'مصاريف وعمولات بنكية', debit: 0, credit: payment.fee }
              ],
              branchId: currentBranchId
            });
          }

          logAction(`إلغاء سند صرف: ${payment.id}`);
        }
      } else if (itemToDelete.type === 'transfer') {
        const transfer = treasuryTransfers.find(t => t.id === itemToDelete.id);
        if (transfer) {
          setTreasuryTransfers(prev => prev.map(t => t.id === itemToDelete.id ? { ...t, status: 'voided' } : t));
          // Reverse journal entry for transfer
          if (transfer.isIntercompany) {
            const targetName = transfer.toBranchName || 'الكيان الشقيق';
            createJournalEntry({
              date: new Date().toISOString().split('T')[0],
              description: `إلغاء تحويل بيني رقم ${transfer.id}`,
              referenceType: 'Manual',
              referenceId: `VOID-${transfer.id}`,
              lines: [
                { accountId: getAccountId(transfer.fromAccount), accountName: transfer.fromAccount, debit: transfer.amount + (transfer.fee || 0), credit: 0 },
                { accountId: '2102', accountName: `جاري شركة ${targetName}`, debit: 0, credit: transfer.amount },
                ...(transfer.fee > 0 ? [{ accountId: '5201', accountName: 'مصاريف وعمولات بنكية', debit: 0, credit: transfer.fee }] : [])
              ],
              branchId: currentBranchId
            });
          } else {
            createJournalEntry({
              date: new Date().toISOString().split('T')[0],
              description: `إلغاء تحويل رصيد رقم ${transfer.id}`,
              referenceType: 'Manual',
              referenceId: `VOID-${transfer.id}`,
              lines: [
                { accountId: getAccountId(transfer.fromAccount), accountName: transfer.fromAccount, debit: transfer.amount, credit: 0 },
                { accountId: getAccountId(transfer.toAccount), accountName: transfer.toAccount, debit: 0, credit: transfer.amount }
              ],
              branchId: currentBranchId
            });
          }
          logAction(`إلغاء تحويل رصيد: ${transfer.id}`);
        }
      }
    }
    setIsConfirmModalOpen(false);
    setItemToDelete(null);
  };

  // Helper to check funds
  // Helper to check funds
  const checkFunds = (accountName: string, amount: number, excludeTransactionId?: string): boolean => {
    // Calculate current balance for the specific account and branch
    let companyInfo: CompanyInfo = { treasuryOpeningBalance: 0, treasuryBreakdown: {} };
    if (currentBranchId === 'main') {
      const companyInfoString = localStorage.getItem('companyInfo');
      if (companyInfoString) {
        try { companyInfo = JSON.parse(companyInfoString); } catch {}
      }
    } else {
      const branchInfoString = localStorage.getItem(`companyInfo_${currentBranchId}`);
      if (branchInfoString) {
        try { companyInfo = JSON.parse(branchInfoString); } catch {}
      }
    }

    let balance = 0;
    if (accountName === 'الخزينة الرئيسية') {
      balance = companyInfo.treasuryOpeningBalance || 0;
    }
    if (companyInfo.treasuryBreakdown && companyInfo.treasuryBreakdown[accountName]) {
      balance = companyInfo.treasuryBreakdown[accountName];
    }

    // Add Incomes (Subtract fees) - excluding receivedByOtherBranch
    const receipts = customerPayments
      .filter(p => !p.receivedByOtherBranch && (p.treasuryAccount || 'الخزينة الرئيسية') === accountName && (p.status || 'active') === 'active')
      .reduce((sum, p) => sum + p.amount - (p.fee || 0), 0);

    // Subtract Payments (Include fees) - excluding paidByOtherBranch
    const payments = supplierPayments
      .filter(p => !p.paidByOtherBranch && (p.treasuryAccount || 'الخزينة الرئيسية') === accountName && (p.status || 'active') === 'active' && p.id !== excludeTransactionId)
      .reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);

    // Transfers Out: Only deduct if this branch is source
    const transfersOut = treasuryTransfers
      .filter(t => {
        if ((t.status || 'active') !== 'active') return false;
        if (t.fromAccount !== accountName) return false;
        if (t.isIntercompany) {
          return t.branchId === currentBranchId || t.fromBranchId === currentBranchId;
        }
        return true;
      })
      .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);

    // Transfers In: Only add if this branch is target
    const transfersIn = treasuryTransfers
      .filter(t => {
        if ((t.status || 'active') !== 'active') return false;
        if (t.toAccount !== accountName) return false;
        if (t.isIntercompany) {
          return t.toBranchId === currentBranchId || (t.id.startsWith('TR-IC-') && t.branchId === currentBranchId);
        }
        return true;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Subtract Expenses
    let totalExpenses = 0;
    if (accountName === 'الخزينة الرئيسية') {
      totalExpenses = expenses
        .filter(e => (e.status || 'active') === 'active')
        .reduce((sum, e) => sum + e.amount, 0);
    }

    const currentBalance = balance + receipts - payments - totalExpenses - transfersOut + transfersIn;
    return currentBalance >= amount;
  };

  const balances = useMemo(() => {
    let companyInfo: CompanyInfo = { treasuryOpeningBalance: 0, treasuryBreakdown: {} };
    if (currentBranchId === 'main') {
      const companyInfoString = localStorage.getItem('companyInfo');
      if (companyInfoString) {
        try { companyInfo = JSON.parse(companyInfoString); } catch {}
      }
    } else {
      const branchInfoString = localStorage.getItem(`companyInfo_${currentBranchId}`);
      if (branchInfoString) {
        try { companyInfo = JSON.parse(branchInfoString); } catch {}
      }
    }

    const treasuryAccountList: TreasuryAccountType[] = accountOptions;
    const result: Record<string, number> = {};

    treasuryAccountList.forEach(acc => {
      // Opening Balance for this branch
      let opening = 0;
      if (acc === 'الخزينة الرئيسية') {
        opening = companyInfo.treasuryOpeningBalance || 0;
      }
      if (companyInfo.treasuryBreakdown && companyInfo.treasuryBreakdown[acc]) {
        opening = companyInfo.treasuryBreakdown[acc];
      }

      // Transactions
      const totalReceipts = customerPayments
        .filter(p => !p.receivedByOtherBranch && (p.treasuryAccount || 'الخزينة الرئيسية') === acc && (p.status || 'active') === 'active')
        .reduce((sum, p) => sum + (p.amount - (p.fee || 0)), 0);

      const totalPayments = supplierPayments
        .filter(p => !p.paidByOtherBranch && (p.treasuryAccount || 'الخزينة الرئيسية') === acc && (p.status || 'active') === 'active')
        .reduce((sum, p) => sum + p.amount + (p.fee || 0), 0);

      // Transfers Out: Only deduct if this branch is source
      const transfersOut = treasuryTransfers
        .filter(t => {
          if ((t.status || 'active') !== 'active') return false;
          if (t.fromAccount !== acc) return false;
          if (t.isIntercompany) {
            return t.branchId === currentBranchId || t.fromBranchId === currentBranchId;
          }
          return true;
        })
        .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);

      // Transfers In: Only add if this branch is target
      const transfersIn = treasuryTransfers
        .filter(t => {
          if ((t.status || 'active') !== 'active') return false;
          if (t.toAccount !== acc) return false;
          if (t.isIntercompany) {
            return t.toBranchId === currentBranchId || (t.id.startsWith('TR-IC-') && t.branchId === currentBranchId);
          }
          return true;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      result[acc] = opening + totalReceipts - totalPayments - transfersOut + transfersIn;
    });

    return result;

  }, [customerPayments, supplierPayments, treasuryTransfers, accountOptions, currentBranchId]);

  // Filtering Logic
  const filteredReceipts = useMemo(() => {
    return customerPayments.filter(p => {
      const accountMatch = selectedAccounts.length > 0 ? selectedAccounts.includes(p.treasuryAccount || 'الخزينة الرئيسية') : true;
      const startDateMatch = startDate ? new Date(p.date) >= new Date(startDate) : true;
      const endDateMatch = endDate ? new Date(p.date) <= new Date(endDate) : true;
      const searchMatch = searchQuery ? p.customerName.includes(searchQuery) : true;
      return accountMatch && startDateMatch && endDateMatch && searchMatch;
    }).reverse();
  }, [customerPayments, selectedAccounts, startDate, endDate, searchQuery]);

  const filteredPayments = useMemo(() => {
    return supplierPayments.filter(p => {
      const accountMatch = selectedAccounts.length > 0 ? selectedAccounts.includes(p.treasuryAccount || 'الخزينة الرئيسية') : true;
      const startDateMatch = startDate ? new Date(p.date) >= new Date(startDate) : true;
      const endDateMatch = endDate ? new Date(p.date) <= new Date(endDate) : true;
      const searchMatch = searchQuery ? p.supplierName.includes(searchQuery) : true;
      return accountMatch && startDateMatch && endDateMatch && searchMatch;
    }).reverse();
  }, [supplierPayments, selectedAccounts, startDate, endDate, searchQuery]);

  const filteredTransfers = useMemo(() => {
    return treasuryTransfers.filter(t => {
      const accountMatch = selectedAccounts.length > 0 ? (selectedAccounts.includes(t.fromAccount) || selectedAccounts.includes(t.toAccount)) : true;
      const startDateMatch = startDate ? new Date(t.date) >= new Date(startDate) : true;
      const endDateMatch = endDate ? new Date(t.date) <= new Date(endDate) : true;
      const searchMatch = searchQuery ? (
        (t.notes && t.notes.includes(searchQuery)) ||
        (t.fromAccount && t.fromAccount.includes(searchQuery)) ||
        (t.toAccount && t.toAccount.includes(searchQuery)) ||
        (t.toBranchName && t.toBranchName.includes(searchQuery)) ||
        (t.sourceBranchName && t.sourceBranchName.includes(searchQuery))
      ) : true;
      return accountMatch && startDateMatch && endDateMatch && searchMatch;
    }).reverse();
  }, [treasuryTransfers, selectedAccounts, startDate, endDate, searchQuery]);

  const currentFilteredTotal = useMemo(() => {
    if (activeTab === 'receipts') {
      return filteredReceipts
        .filter(item => (item.status || 'active') === 'active')
        .reduce((sum, item) => sum + item.amount, 0);
    } else if (activeTab === 'payments') {
      return filteredPayments
        .filter(item => (item.status || 'active') === 'active')
        .reduce((sum, item) => sum + item.amount, 0);
    } else {
      return filteredTransfers
        .filter(item => (item.status || 'active') === 'active')
        .reduce((sum, item) => sum + item.amount, 0);
    }
  }, [activeTab, filteredReceipts, filteredPayments, filteredTransfers]);

  const resetFilters = () => {
    setSelectedAccounts([]);
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setIsAccountDropdownOpen(false);
  };

  const toggleAccount = (account: string) => {
    setSelectedAccounts(prev =>
      prev.includes(account)
        ? prev.filter(a => a !== account)
        : [...prev, account]
    );
  };

  const handleExport = () => {
    if (activeTab === 'receipts') {
      const exportData = filteredReceipts.map((item: any) => ({
        'رقم السند': item.id,
        'التاريخ': item.date,
        'العميل': item.customerName,
        'الحساب': item.treasuryAccount || 'الخزينة الرئيسية',
        'المبلغ': item.amount,
        'ملاحظات': item.notes || '',
        'طرف شقيق': item.receivedByOtherBranch ? `تم التحصيل عبر ${item.sourceBranchName || 'كيان شقيق'}` : '',
        'الحالة': item.status === 'voided' ? 'ملغي' : 'نشط'
      }));
      exportToExcel(exportData, 'سندات_القبض');
    } else if (activeTab === 'payments') {
      const exportData = filteredPayments.map((item: any) => ({
        'رقم السند': item.id,
        'التاريخ': item.date,
        'المورد': item.supplierName,
        'الحساب': item.treasuryAccount || 'الخزينة الرئيسية',
        'المبلغ': item.amount,
        'ملاحظات': item.notes || '',
        'طرف شقيق': item.paidByOtherBranch ? `سُدد بواسطة ${item.sourceBranchName || 'كيان شقيق'}` : (item.isIntercompany ? `سداد لمورد تابع لـ ${item.targetBranchName || ''}` : ''),
        'الحالة': item.status === 'voided' ? 'ملغي' : 'نشط'
      }));
      exportToExcel(exportData, 'سندات_الصرف');
    } else {
      const exportData = filteredTransfers.map((item: any) => ({
        'رقم التحويل': item.id,
        'التاريخ': item.date,
        'من حساب': `${item.fromAccount} ${item.sourceBranchName ? `(${item.sourceBranchName})` : ''}`,
        'إلى حساب': `${item.toAccount} ${item.toBranchName ? `(${item.toBranchName})` : ''}`,
        'المبلغ': item.amount,
        'العمولة': item.fee || 0,
        'النوع': item.isIntercompany ? 'تحويل بيني (شركات شقيقة)' : 'تحويل داخلي',
        'ملاحظات': item.notes || '',
        'الحالة': item.status === 'voided' ? 'ملغي' : 'نشط'
      }));
      exportToExcel(exportData, 'التحويلات_المالية');
    }
  };

  const handlePrintTransferVoucher = (transfer: TreasuryTransfer) => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const title = transfer.isIntercompany ? 'سند تحويل مالي بيني (شركات شقيقة)' : 'سند تحويل مالي بين الحسابات';
    const color = '#4f46e5';

    const printContent = `
      <html>
        <head>
          <title>${title} - ${transfer.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
            @page { size: A5 landscape; margin: 0; }
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              margin: 0; 
              padding: 10mm; 
              background-color: #fff; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .voucher-box { 
              border: 2px solid ${color}; 
              padding: 20px; 
              border-radius: 12px; 
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              position: relative;
              background: linear-gradient(to bottom right, #fff, #f8f9fa);
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 2px solid ${color}; 
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .logo-section { text-align: right; width: 25%; }
            .logo-section img { max-width: 100px; max-height: 60px; object-fit: contain; }
            .title-section { text-align: center; width: 50%; }
            .title-section h1 { 
              margin: 0; 
              font-size: 20px; 
              color: ${color}; 
              font-weight: 800; 
              border: 2px solid ${color};
              display: inline-block;
              padding: 5px 16px;
              border-radius: 50px;
              background: #fff;
            }
            .company-section { text-align: left; width: 25%; font-size: 14px; color: #444; }
            .company-section h2 { margin: 0; font-size: 16px; font-weight: 700; color: #000; }
            .main-content {
              flex-grow: 1;
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 20px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .field {
              background: rgba(255,255,255,0.8);
              border-bottom: 1px solid #ddd;
              padding: 4px;
            }
            .field label {
              display: block;
              color: ${color};
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .field .value {
              font-size: 14px;
              color: #222;
              font-weight: 600;
            }
            .amount-box {
              background: ${color};
              color: white;
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .amount-box .amount {
              font-size: 30px;
              font-weight: 800;
              direction: ltr;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #eee;
              padding-top: 15px;
              margin-top: auto;
            }
            .sig-box { text-align: center; width: 30%; }
            .sig-label { font-size: 12px; color: #666; font-weight: 700; margin-bottom: 25px; }
            .sig-line { border-top: 1px dashed #999; width: 80%; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <div class="logo-section">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo">` : ''}
              </div>
              <div class="title-section">
                <h1>${title}</h1>
                <p style="margin:4px 0 0;font-size:12px;color:#666;">رقم التحويل: ${transfer.id}</p>
              </div>
              <div class="company-section">
                <h2>${companyInfo.name}</h2>
                <div style="font-size: 11px;">${companyInfo.phone || ''}</div>
              </div>
            </div>
            
            <div class="main-content">
              <div class="info-grid">
                <div class="field">
                  <label>من حساب / جهة الخصم</label>
                  <div class="value">${transfer.fromAccount} ${transfer.sourceBranchName ? `(${transfer.sourceBranchName})` : ''}</div>
                </div>
                <div class="field">
                  <label>إلى حساب / جهة الإيداع</label>
                  <div class="value">${transfer.toAccount} ${transfer.toBranchName ? `(${transfer.toBranchName})` : ''}</div>
                </div>
                <div class="field">
                  <label>تاريخ التحويل</label>
                  <div class="value" dir="ltr" style="text-align: right;">${transfer.date}</div>
                </div>
                <div class="field">
                  <label>عمولة التحويل</label>
                  <div class="value">${transfer.fee ? transfer.fee.toLocaleString() + ' ج.م' : 'بدون عمولة'}</div>
                </div>
                <div class="field" style="grid-column: 1 / -1;">
                  <label>البيان / ملاحظات</label>
                  <div class="value">${transfer.notes || '-'}</div>
                </div>
              </div>

              <div class="amount-box">
                <label style="font-size: 13px; opacity: 0.9;">المبلغ المحوّل</label>
                <div class="amount">${transfer.amount.toLocaleString()}</div>
                <div style="font-size: 13px; opacity: 0.9;">جنيه مصري</div>
              </div>
            </div>

            <div class="signatures">
              <div class="sig-box">
                <div class="sig-label">أمين الصندوق (المحول)</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-box">
                <div class="sig-label">المدير المالي</div>
                <div class="sig-line"></div>
              </div>
              <div class="sig-box">
                <div class="sig-label">المستلم / المحول إليه</div>
                <div class="sig-line"></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handlePrintVoucher = (voucher: CustomerPayment | SupplierPayment, type: 'receipt' | 'payment') => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const isReceipt = type === 'receipt';
    const title = isReceipt ? 'سند قبض' : 'سند صرف';
    const titleEn = isReceipt ? 'Receipt Voucher' : 'Payment Voucher';
    const partyLabel = isReceipt ? 'استلمنا من السيد' : 'صرفنا للسيد';
    const partyName = isReceipt ? (voucher as CustomerPayment).customerName : (voucher as SupplierPayment).supplierName;
    const amountLabel = isReceipt ? 'المبلغ المستلم' : 'المبلغ المدفوع';
    const color = isReceipt ? '#28a745' : '#dc3545';

    const printContent = `
      <html>
        <head>
          <title>${title} - ${voucher.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
            @page { size: A5 landscape; margin: 0; }
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              margin: 0; 
              padding: 10mm; 
              background-color: #fff; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .voucher-box { 
              border: 2px solid ${color}; 
              padding: 20px; 
              border-radius: 12px; 
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              position: relative;
              background-image: 
                radial-gradient(${color}10 1px, transparent 1px),
                linear-gradient(to bottom right, #fff, #f8f9fa);
              background-size: 20px 20px, 100% 100%;
            }
            
            /* Watermark Effect */
            .voucher-box::before {
              content: '${titleEn}';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 80px;
              color: ${color};
              opacity: 0.03;
              font-weight: 900;
              white-space: nowrap;
              pointer-events: none;
              text-transform: uppercase;
              z-index: 0;
            }

            /* Header */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 2px solid ${color}; 
              padding-bottom: 10px;
              margin-bottom: 20px;
              position: relative;
              z-index: 1;
            }
            .logo-section { text-align: right; width: 25%; }
            .logo-section img { max-width: 100px; max-height: 60px; object-fit: contain; }
            
            .title-section { text-align: center; width: 50%; }
            .title-section h1 { 
              margin: 0; 
              font-size: 24px; 
              color: ${color}; 
              font-weight: 800; 
              border: 2px solid ${color};
              display: inline-block;
              padding: 5px 20px;
              border-radius: 50px;
              background: #fff;
            }
            .title-section p { 
              margin: 5px 0 0; 
              color: #555; 
              font-size: 12px; 
              letter-spacing: 1px;
              text-transform: uppercase;
              font-weight: 600;
            }
            
            .company-section { text-align: left; width: 25%; font-size: 14px; color: #444; }
            .company-section h2 { margin: 0; font-size: 16px; font-weight: 700; color: #000; }
            
            /* Content Grid */
            .main-content {
              flex-grow: 1;
              display: grid;
              grid-template-columns: 2fr 1fr;
              gap: 20px;
              position: relative;
              z-index: 1;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              align-content: start;
            }

            .field {
              background: rgba(255,255,255,0.8);
              border-bottom: 1px solid #ddd;
            }
            .field label {
              display: block;
              color: ${color};
              font-size: 11px;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .field .value {
              font-size: 14px;
              color: #222;
              font-weight: 600;
              min-height: 20px;
            }

            /* Amount Box */
            .amount-box {
              background: ${color};
              color: white;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              display: flex;
              flex-direction: column;
              justify-content: center;
              box-shadow: 0 4px 10px ${color}40;
            }
            .amount-box label {
              font-size: 14px;
              opacity: 0.9;
              margin-bottom: 5px;
            }
            .amount-box .amount {
              font-size: 32px;
              font-weight: 800;
              direction: ltr;
            }
            .amount-box .currency {
              font-size: 14px;
              opacity: 0.9;
            }

            /* Notes */
            .notes-section {
              margin-top: 15px;
              background: rgba(238, 238, 238, 0.4);
              padding: 10px;
              border-radius: 8px;
              border: 1px dashed #ccc;
            }
            .notes-section label {
              font-size: 12px;
              color: #666;
              font-weight: 600;
            }
            .notes-section p {
              margin: 5px 0 0;
              font-size: 13px;
              color: #333;
            }

            /* Footer Signatures */
            .footer {
              margin-top: auto;
              padding-top: 20px;
              position: relative;
              z-index: 1;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #eee;
              padding-top: 20px;
            }
            
            .sig-box {
              text-align: center;
              width: 30%;
            }
            .sig-label {
              font-size: 12px;
              color: #666;
              font-weight: 700;
              margin-bottom: 30px;
            }
            .sig-line {
              border-top: 1px dashed #999;
              width: 80%;
              margin: 0 auto;
            }
            
            /* Print Info */
            .print-meta {
              text-align: center;
              font-size: 9px;
              color: #aaa;
              margin-top: 10px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="voucher-box">
            <div class="header">
              <div class="logo-section">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo">` : ''}
              </div>
              <div class="title-section">
                <h1>${title}</h1>
                <p>No. ${voucher.id}</p>
              </div>
              <div class="company-section">
                <h2>${companyInfo.name}</h2>
                <div style="font-size: 11px; margin-top: 5px;">${companyInfo.address}</div>
                <div style="font-size: 11px;">${companyInfo.phone}</div>
              </div>
            </div>
            
            <div class="main-content">
              <div class="info-grid">
                <div class="field" style="grid-column: 1 / -1;">
                  <label>${partyLabel}</label>
                  <div class="value" style="font-size: 16px;">${partyName}</div>
                </div>
                
                <div class="field">
                  <label>طريقة الدفع</label>
                  <div class="value">${(voucher as any).paymentMethod || 'نقدي'}</div>
                </div>

                <div class="field">
                  <label>تاريخ التحرير</label>
                  <div class="value" dir="ltr" style="text-align: right;">${voucher.date}</div>
                </div>

                <div class="field" style="grid-column: 1 / -1;">
                  <label>الخزينة / الحساب</label>
                  <div class="value">${voucher.treasuryAccount || 'الخزينة الرئيسية'}</div>
                </div>
              </div>

              <div class="amount-box">
                <label>${amountLabel}</label>
                <div class="amount">${voucher.amount.toLocaleString()}</div>
                <div class="currency">جنيه مصري</div>
              </div>
            </div>

            ${voucher.notes || voucher.isExpense ? `
              <div class="notes-section">
                <label>ملاحظات / البيان</label>
                <p>
                  ${voucher.notes || ''}
                  ${voucher.isExpense ? ` - (مصروف: ${voucher.expenseCategory || 'عام'})` : ''}
                </p>
              </div>
            ` : ''}
            
            <div class="footer">
              <div class="signatures">
                <div class="sig-box">
                  <div class="sig-label">المحاسب / أمين الصندوق</div>
                  <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                  <div class="sig-label">المدير المالي</div>
                  <div class="sig-line"></div>
                </div>
                <div class="sig-box">
                  <div class="sig-label">${isReceipt ? 'المستلم' : 'المسلم'}</div>
                  <div class="sig-line"></div>
                </div>
              </div>
              <div class="print-meta">
                تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  const handlePrintStatement = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const isTransfers = activeTab === 'transfers';
    const isReceipts = activeTab === 'receipts';

    const title = isTransfers ? 'تقرير التحويلات المالية والبينية' : (isReceipts ? 'تقرير سندات القبض' : 'تقرير سندات الصرف');
    const data = isTransfers ? filteredTransfers : (isReceipts ? filteredReceipts : filteredPayments);
    const total = currentFilteredTotal;
    const colorClass = isTransfers ? '#4f46e5' : (isReceipts ? '#16a34a' : '#dc2626');

    // Filter description
    let filterDescription = "";
    const datePart = startDate || endDate ? `الفترة: من ${startDate || 'البداية'} إلى ${endDate || 'الآن'}` : '';
    const accountPart = selectedAccounts.length > 0 ? `الحسابات: ${selectedAccounts.join('، ')}` : 'جميع الحسابات';
    filterDescription = `${datePart} | ${accountPart}`;

    const printContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              padding: 20px; 
              background-color: white; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 3px solid ${colorClass}; 
              padding-bottom: 20px; 
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .company-info { text-align: right; }
            .report-title { text-align: center; flex: 1; }
            .logo img { max-width: 100px; max-height: 80px; }
            
            h1 { margin: 0; color: ${colorClass}; font-size: 24px; }
            h2 { margin: 5px 0; font-size: 18px; color: #333; }
            p { margin: 5px 0; font-size: 14px; color: #666; }

            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9fafb; }
            
            .total-row { font-weight: bold; background-color: ${colorClass} !important; color: white; font-size: 14px; }
            .total-row td { border: 1px solid ${colorClass}; }
            
            .badge { 
                padding: 2px 6px; 
                border-radius: 4px; 
                font-size: 11px; 
                background-color: #eee; 
                border: 1px solid #ccc;
            }

            .footer { 
              position: fixed; 
              bottom: 0; 
              left: 0; 
              right: 0; 
              text-align: center; 
              border-top: 1px solid #ddd; 
              padding: 10px; 
              font-size: 11px; 
              color: #888; 
            }
          </style>
        </head>
        <body>
          <div class="header">
             <div class="logo">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Logo">` : ''}
             </div>
             <div class="report-title">
                <h1>${companyInfo.name}</h1>
                <h2>${title}</h2>
                <p>${filterDescription}</p>
             </div>
             <div class="company-info">
                <p>${companyInfo.address}</p>
                <p>${companyInfo.phone}</p>
             </div>
          </div>

          <table>
            ${isTransfers ? `
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="15%">رقم التحويل</th>
                  <th width="20%">من حساب</th>
                  <th width="20%">إلى حساب</th>
                  <th width="15%">التاريخ</th>
                  <th width="10%">النوع</th>
                  <th width="15%">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.id}</td>
                    <td><span class="badge">${item.fromAccount} ${item.sourceBranchName ? `(${item.sourceBranchName})` : ''}</span></td>
                    <td><span class="badge">${item.toAccount} ${item.toBranchName ? `(${item.toBranchName})` : ''}</span></td>
                    <td style="direction: ltr; text-align: right;">${item.date}</td>
                    <td>${item.isIntercompany ? 'تحويل بيني' : 'داخلي'}</td>
                    <td style="font-weight: bold;">${item.amount.toLocaleString()} ج.م</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="6" style="text-align: center;">الإجمالي</td>
                  <td style="direction: ltr; text-align: right;">${total.toLocaleString()} ج.م</td>
                </tr>
              </tbody>
            ` : `
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="15%">رقم السند</th>
                  <th width="20%">${isReceipts ? 'العميل' : 'المورد'}</th>
                  <th width="15%">الحساب</th>
                  <th width="15%">التاريخ</th>
                  <th width="20%">ملاحظات</th>
                  <th width="10%">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                ${data.map((item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.id}</td>
                    <td>${isReceipts ? (item as CustomerPayment).customerName : (item as SupplierPayment).supplierName}</td>
                    <td><span class="badge">${item.treasuryAccount || 'الخزينة الرئيسية'}</span></td>
                    <td style="direction: ltr; text-align: right;">${item.date}</td>
                    <td>${item.notes || '-'}</td>
                    <td style="font-weight: bold;">${item.amount.toLocaleString()} ج.م</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="6" style="text-align: center;">الإجمالي</td>
                  <td style="direction: ltr; text-align: right;">${total.toLocaleString()} ج.م</td>
                </tr>
              </tbody>
            `}
          </table>

          <div class="footer">
            تم طباعة هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-EG')}
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
        <h1 className="text-3xl font-bold text-gray-800">الخزينة والبنوك</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="bg-white border border-gray-300 text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-sm text-sm"
              title="إعدادات التوجيه المحاسبي لموديول الخزينة والبنوك"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">إعدادات التوجيه</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePrintStatement()}
            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            <span>طباعة الكشف</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>تصدير إكسيل</span>
          </button>
          {activeTab === 'receipts' && (
            <button
              type="button"
              onClick={() => handleAddReceipt()}
              className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" /></svg>
              <span>إضافة سند قبض</span>
            </button>
          )}
          {activeTab === 'payments' && (
            <button
              type="button"
              onClick={() => handleAddPayment()}
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center space-x-2 space-x-reverse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" /></svg>
              <span>إضافة سند صرف</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleAddTransfer}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 space-x-reverse shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 011.414 1.414l3-3a1 1 0 010-1.414l-3-3a1 1 0 111.414 1.414L13.586 5H8zM16 15a1 1 0 100-2H10.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 15H16z" />
            </svg>
            <span>تحويل بين الحسابات / الفروع</span>
          </button>
        </div>
      </div>

      {/* Balances Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {Object.entries(balances).map(([name, balance]) => (
          <div key={name} className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col items-center text-center">
            <p className={`text-sm font-semibold mb-1 ${name.includes('انستاباى') ? 'text-purple-600' :
              name.includes('فودافون') ? 'text-red-600' :
                name.includes('بنك') ? 'text-green-600' : 'text-gray-600'
              }`}>{name}</p>
            <p className="text-xl font-bold text-gray-800">{balance.toLocaleString()} ج.م</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative">
        {/* ... Existing Filters JSX ... */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">تصفية حسب الحساب</label>
            <button
              type="button"
              onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-right flex justify-between items-center focus:ring-2 focus:ring-blue-500"
            >
              <span className="truncate">
                {selectedAccounts.length === 0
                  ? 'جميع الحسابات'
                  : `${selectedAccounts.length} حسابات محددة`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isAccountDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {accountOptions.map(acc => (
                  <div
                    key={acc}
                    onClick={() => toggleAccount(acc)}
                    className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(acc)}
                      readOnly
                      className="form-checkbox h-4 w-4 text-blue-600 rounded ml-2"
                    />
                    <span className="text-sm text-gray-700">{acc}</span>
                  </div>
                ))}
              </div>
            )}
            {isAccountDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsAccountDropdownOpen(false)}></div>
            )}
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => resetFilters()}
              className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mt-4 border-t pt-4 border-gray-100">
          <div className="flex-1 w-full relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">بحث باسم العميل / المورد</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب اسم العميل أو المورد..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 text-sm">عدد السجلات: <strong>{activeTab === 'receipts' ? filteredReceipts.length : activeTab === 'payments' ? filteredPayments.length : filteredTransfers.length}</strong></span>
          <div className="text-lg">
            <span className="text-gray-600 ml-2">الإجمالي (للفلتر الحالي):</span>
            <span className={`font-bold ${activeTab === 'receipts' ? 'text-green-600' : activeTab === 'payments' ? 'text-red-600' : 'text-indigo-600'}`}>
              {currentFilteredTotal.toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-4 space-x-reverse" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-2 px-4 font-semibold text-lg ${activeTab === 'receipts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            سندات القبض (العملاء)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-4 font-semibold text-lg ${activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            سندات الصرف (الموردين)
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`py-2 px-4 font-semibold text-lg flex items-center gap-2 ${activeTab === 'transfers' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span>التحويلات المالية والشركات الشقيقة</span>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {filteredTransfers.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md" key={activeTab}>
        <div className="overflow-x-auto">
          {activeTab === 'receipts' ? (
            <table className="w-full text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide w-12"></th>
                  <th className="p-3 text-sm font-semibold tracking-wide">رقم السند</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">العميل</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">الحساب / الخزنة</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">ملاحظات</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map((payment) => {
                  const isVoided = payment.status === 'voided';
                  return (
                    <tr key={payment.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-sm text-center">
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${isVoided ? 'bg-red-100' : 'bg-green-100'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isVoided ? 'text-red-600' : 'text-green-600'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {payment.id}
                        {isVoided && <span className="mr-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">ملغي</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{payment.customerName}</div>
                        {payment.receivedByOtherBranch && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium mt-1">
                            تحصيل عبر: {payment.sourceBranchName || 'كيان شقيق'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-400">
                          {payment.treasuryAccount || 'الخزينة الرئيسية'}
                        </span>
                      </td>
                      <td className={`p-3 text-sm ${isVoided ? 'line-through text-gray-400' : 'text-gray-700'}`} style={{ direction: 'ltr', textAlign: 'right' }}>{payment.date}</td>
                      <td className={`p-3 text-sm font-bold ${isVoided ? 'line-through text-red-300' : 'text-green-600'}`}>{Number(payment.amount).toLocaleString()} ج.م</td>
                      <td className={`p-3 text-sm text-gray-500 ${isVoided ? 'line-through' : ''}`}>
                        {payment.notes}
                        {payment.isExpense && <span className="block text-xs text-orange-600 font-semibold mt-1">مصروف: {payment.expenseCategory}</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          {!isVoided && (
                            <>
                              {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                                <button
                                  onClick={() => handleEditReceipt(payment)}
                                  className="text-yellow-600 hover:text-yellow-800 font-medium"
                                  title="تعديل"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePrintVoucher(payment, 'receipt')}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="طباعة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => handleActionRequest(payment.id, 'receipt')} className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1" title="إلغاء">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                <span>إلغاء</span>
                              </button>
                            </>
                          )}
                          {isVoided && <span className="text-xs text-red-500 font-bold">ملغي</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">لا توجد سندات قبض تطابق الفلتر</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : activeTab === 'payments' ? (
            <table className="w-full text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide w-12"></th>
                  <th className="p-3 text-sm font-semibold tracking-wide">رقم السند</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">المورد</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">الحساب / الخزنة</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">ملاحظات</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => {
                  const isVoided = payment.status === 'voided';
                  return (
                    <tr key={payment.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-sm text-center">
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${isVoided ? 'bg-red-100' : 'bg-red-100'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isVoided ? 'text-red-400' : 'text-red-600'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {payment.id}
                        {isVoided && <span className="mr-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">ملغي</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{payment.supplierName}</div>
                        {payment.paidByOtherBranch && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium mt-1">
                            سُدد بواسطة: {payment.sourceBranchName || 'كيان شقيق'}
                          </span>
                        )}
                        {payment.isIntercompany && !payment.paidByOtherBranch && (
                          <span className="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded font-medium mt-1">
                            سداد لمورد: {payment.targetBranchName || 'كيان شقيق'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-400">
                          {payment.treasuryAccount || 'الخزينة الرئيسية'}
                        </span>
                      </td>
                      <td className={`p-3 text-sm ${isVoided ? 'line-through text-gray-400' : 'text-gray-700'}`} style={{ direction: 'ltr', textAlign: 'right' }}>{payment.date}</td>
                      <td className={`p-3 text-sm font-bold ${isVoided ? 'line-through text-red-300' : 'text-red-600'}`}>{Number(payment.amount).toLocaleString()} ج.م</td>
                      <td className={`p-3 text-sm text-gray-500 ${isVoided ? 'line-through' : ''}`}>
                        {payment.notes}
                        {payment.isExpense && <span className="block text-xs text-orange-600 font-semibold mt-1">مصروف: {payment.expenseCategory}</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          {!isVoided && (
                            <>
                              {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                                <button
                                  onClick={() => handleEditPayment(payment)}
                                  className="text-yellow-600 hover:text-yellow-800 font-medium"
                                  title="تعديل"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePrintVoucher(payment, 'payment')}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="طباعة"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button type="button" onClick={() => handleActionRequest(payment.id, 'payment')} className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1" title="إلغاء">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 715.636 5.636m12.728 12.728L5.636 5.636" />
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
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">لا توجد سندات صرف تطابق الفلتر</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-right">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide w-12"></th>
                  <th className="p-3 text-sm font-semibold tracking-wide">رقم التحويل</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">من حساب (جهة الخصم)</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">إلى حساب (جهة الإيداع)</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">النوع والعمولة</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">ملاحظات</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransfers.map((transfer) => {
                  const isVoided = transfer.status === 'voided';
                  return (
                    <tr key={transfer.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                      <td className="p-3 text-sm text-center">
                        <div className={`inline-flex items-center justify-center p-1.5 rounded-full ${isVoided ? 'bg-red-100' : 'bg-indigo-100'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isVoided ? 'text-red-600' : 'text-indigo-600'}`} viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 011.414 1.414l3-3a1 1 0 010-1.414l-3-3a1 1 0 111.414 1.414L13.586 5H8zM16 15a1 1 0 100-2H10.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 15H16z" />
                          </svg>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {transfer.id}
                        {isVoided && <span className="mr-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">ملغي</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{transfer.fromAccount}</div>
                        {transfer.sourceBranchName && (
                          <span className="text-xs text-gray-500 font-medium">[{transfer.sourceBranchName}]</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="font-medium text-gray-900">{transfer.toAccount}</div>
                        {transfer.toBranchName && (
                          <span className="text-xs text-indigo-600 font-semibold">[{transfer.toBranchName}]</span>
                        )}
                      </td>
                      <td className={`p-3 text-sm ${isVoided ? 'line-through text-gray-400' : 'text-gray-700'}`} style={{ direction: 'ltr', textAlign: 'right' }}>
                        {transfer.date}
                      </td>
                      <td className={`p-3 text-sm font-bold ${isVoided ? 'line-through text-gray-400' : 'text-indigo-600'}`}>
                        {Number(transfer.amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {transfer.isIntercompany ? (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">
                            تحويل بيني شقيق
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
                            داخلي
                          </span>
                        )}
                        {transfer.fee > 0 && (
                          <div className="text-xs text-orange-600 font-medium mt-0.5">
                            عمولة: {transfer.fee.toLocaleString()} ج.م
                          </div>
                        )}
                      </td>
                      <td className={`p-3 text-sm text-gray-500 ${isVoided ? 'line-through' : ''}`}>
                        {transfer.notes || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          {!isVoided && (
                            <>
                              <button
                                type="button"
                                onClick={() => handlePrintTransferVoucher(transfer)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="طباعة سند التحويل"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActionRequest(transfer.id, 'transfer')}
                                className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                                title="إلغاء التحويل"
                              >
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
                {filteredTransfers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-500">لا توجد تحويلات مالية تطابق الفلتر</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isReceiptModalOpen && (
        <AddReceiptModal
          onClose={() => setIsReceiptModalOpen(false)}
          onSave={handleSaveReceipt}
          customers={customers}
          receiptToEdit={editingReceipt}
          existingReceipts={customerPayments}
          onAddExpense={handleAddAutoExpense}
          branches={branches}
          currentBranchId={currentBranchId}
          accountOptions={accountOptions}
        />
      )}

      {isPaymentModalOpen && (
        <AddPaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
          onSave={handleSavePayment}
          suppliers={suppliers}
          paymentToEdit={editingPayment}
          existingPayments={supplierPayments}
          onAddExpense={handleAddAutoExpense}
          branches={branches}
          currentBranchId={currentBranchId}
          accountOptions={accountOptions}
        />
      )}

      {isTransferModalOpen && (
        <AddTransferModal
          onClose={() => setIsTransferModalOpen(false)}
          onSave={handleSaveTransfer}
          branches={branches}
          currentBranchId={currentBranchId}
          accountOptions={accountOptions}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmAction}
        title="تأكيد الإلغاء"
        message="هل أنت متأكد من رغبتك في إلغاء هذا السند؟ سيتم عكس القيد المحاسبي."
      />
    </div>
  );
};

export default Treasury;
