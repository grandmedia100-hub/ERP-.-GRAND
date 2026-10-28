import React, { useState, useMemo } from 'react';
import type { SalesInvoice, CompanyInfo, Customer, Product, CustomerPayment, StockTransaction, ModulePostingSettings, Permission } from '../types.ts';
import AddSalesInvoiceModal from './AddSalesInvoiceModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import { exportToExcel } from '../utils/exportToExcel.ts'; // Import
import DetailedSalesByItemReport from './DetailedSalesByItemReport.tsx';
import apiService from '../services/api.ts';
import { showNotification } from '../services/notificationService.ts';
import { generateInvoiceWhatsAppText, openWhatsAppWithMessage } from '../utils/whatsappHelper.ts';
import { generateNextSequence } from '../utils/sequenceManager.ts';

interface SalesProps {
  invoices: SalesInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  customers: Customer[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  stockTransactions: StockTransaction[];
  setStockTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
  customerPayments: CustomerPayment[];
  createJournalEntry: (params: { description: string, lines: any[], referenceType?: 'SalesInvoice' | 'PurchaseInvoice' | 'Payment' | 'Manual', referenceId?: string, date?: string }) => void;
  logAction: (action: string) => void;
  initialInvoiceData?: Partial<SalesInvoice> | null; // New prop
  onClearInitialData?: () => void; // Callback to clear the data after usage
  currentUser: any; // Using any to avoid circular dependency issues with import, or cleaner: User
  deleteJournalEntryByReference: (refId: string) => void;
  accounts: any[];
  branches?: { id: string; name: string }[];
  currentBranchId?: string;
  postingSettings?: ModulePostingSettings;
  onOpenSettings?: () => void;
}

const Sales: React.FC<SalesProps> = ({ invoices, setInvoices, customers, products, setProducts, stockTransactions, setStockTransactions, customerPayments, createJournalEntry, logAction, initialInvoiceData, onClearInitialData, currentUser, deleteJournalEntryByReference, accounts, branches, currentBranchId, postingSettings, onOpenSettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalesInvoice | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [invoiceToVoid, setInvoiceToVoid] = useState<string | null>(null);
  const [isItemReportOpen, setIsItemReportOpen] = useState(false);

  const hasPerm = (perm: Permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'developer') return true;
    return currentUser.permissions ? currentUser.permissions.includes(perm) : false;
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Auto-open modal if initial data is provided (e.g. from Quotation conversion)
  React.useEffect(() => {
    if (initialInvoiceData) {
      setEditingInvoice(initialInvoiceData as SalesInvoice);
      setIsModalOpen(true);

      // Clear the prop so it doesn't reopen on re-render
      if (onClearInitialData) onClearInitialData();
    }
  }, [initialInvoiceData, onClearInitialData]);

  // Dropdown Visibility States
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);

  // Filter Logic
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const idStr = inv.id || '';
      const idMatch = idStr.toLowerCase().includes(searchQuery.toLowerCase());
      const customerMatch = selectedCustomerIds.length > 0 ? selectedCustomerIds.includes(inv.customerId) : true;
      const methodMatch = selectedPaymentMethods.length > 0 ? selectedPaymentMethods.includes(inv.paymentMethod) : true;
      const startDateMatch = startDate ? new Date(inv.date) >= new Date(startDate) : true;
      const endDateMatch = endDate ? new Date(inv.date) <= new Date(endDate) : true;

      // Product Match: Invoice must contain AT LEAST ONE of the selected products
      // Note: Items might not have productId if manually entered without selection, so we check name as fallback or skip
      const productMatch = selectedProductIds.length > 0
        ? inv.items.some(item => item.productId && selectedProductIds.includes(item.productId))
        : true;

      return idMatch && customerMatch && methodMatch && startDateMatch && endDateMatch && productMatch;
    }).sort((a, b) => {
      const bId = b.id || '';
      const aId = a.id || '';
      return bId.localeCompare(aId);
    });
  }, [invoices, searchQuery, selectedCustomerIds, selectedProductIds, selectedPaymentMethods, startDate, endDate]);

  const filteredTotal = useMemo(() => {
    // Only sum Active invoices
    return filteredInvoices.filter(inv => inv.status !== 'voided').reduce((sum, inv) => sum + inv.total, 0);
  }, [filteredInvoices]);

  const handleOpenModal = (invoice: SalesInvoice | null = null) => {
    if (invoice) return; // Prevent editing existing invoices
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingInvoice(null);
    setIsModalOpen(false);
  };

  // ── Perpetual Inventory: Record Stock Movements ──
  const recordStockMovements = (invoice: SalesInvoice, isReturn: boolean, isVoid: boolean = false) => {
    const newTxs: StockTransaction[] = [];
    const productUpdates: { id: string; qtyDelta: number; cost: number }[] = [];

    invoice.items
      .filter(item => item.itemType !== 'expense' && item.productId && !item.productId.startsWith('MANUAL'))
      .forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        // isReturn XOR isVoid means stock comes back, otherwise stock goes out
        const isIncoming = isReturn !== isVoid;
        const qty = item.quantity;
        const cost = product.costPrice || item.price;
        const qtyDelta = isIncoming ? qty : -qty;
        const balanceAfter = product.quantity + qtyDelta;

        newTxs.push({
          id: `ST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: invoice.date,
          productId: product.id,
          productName: product.name,
          type: isReturn ? 'sale_return' : 'sale',
          quantityIn: isIncoming ? qty : 0,
          quantityOut: isIncoming ? 0 : qty,
          unitCost: cost,
          totalCost: qty * cost,
          balanceAfter: Math.max(0, balanceAfter),
          referenceId: invoice.id,
          referenceType: 'SalesInvoice',
          notes: isVoid
            ? (isReturn ? 'إلغاء مرتجع مبيعات (خصم من المخزن)' : 'إلغاء مبيعات (إرجاع للمخزن)')
            : (isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'),
          createdAt: new Date().toISOString(),
        });
        productUpdates.push({ id: product.id, qtyDelta, cost });
      });

    if (newTxs.length > 0) {
      setStockTransactions(prev => [...prev, ...newTxs]);
      setProducts(prev => prev.map(p => {
        const upd = productUpdates.find(u => u.id === p.id);
        return upd ? { ...p, quantity: Math.max(0, p.quantity + upd.qtyDelta) } : p;
      }));
    }
  };

  const handleSaveInvoice = (invoiceData: Omit<SalesInvoice, 'id'> & { id?: string }, type: 'sale' | 'return' = 'sale') => {
    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      // Allow Admin/Developer to bypass
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser) {
        if (new Date(invoiceData.date) <= new Date(financialYearLockDate)) {
          alert(`عفواً، لا يمكن إضافة أو تعديل فواتير في فترة مالية مغلقة (قبل ${financialYearLockDate}).`);
          return;
        }

        // If editing, also check the ORIGINAL date of the invoice
        if (invoiceData.id) {
          const original = invoices.find(i => i.id === invoiceData.id);
          if (original && new Date(original.date) <= new Date(financialYearLockDate)) {
            alert(`عفواً، لا يمكن تعديل فاتورة مؤرخة في فترة مالية مغلقة.`);
            return;
          }
        }
      }
    }

    let newId = invoiceData.id || '';
    const isEdit = !!invoiceData.id;
    const originalInvoice = isEdit ? invoices.find(i => i.id === newId) : null;

    if (!isEdit) {
      if (type === 'return') {
        const currentYear = new Date().getFullYear();
        const prefix = 'RET-SAL';
        const regex = new RegExp(`${prefix}-${currentYear}-(\\d+)`);
        const maxId = invoices.reduce((max, inv) => {
          const match = inv.id.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0);
        newId = `${prefix}-${currentYear}-${(maxId + 1).toString().padStart(3, '0')}`;
      } else {
        newId = generateNextSequence('salesInvoices', invoices);
      }
    }

    const newInvoice: SalesInvoice = {
      ...invoiceData,
      id: newId, // At this point newId is either existing ID or generated
      invoiceType: type,
      status: 'active'
    } as SalesInvoice;

    if (isEdit) {
      // EDIT MODE
      setInvoices(prevInvoices => prevInvoices.map(inv => inv.id === newId ? newInvoice : inv));

      // Delete OLD Journal Entry to prevent duplication/error
      // This relies on the referenceId being the invoice ID
      deleteJournalEntryByReference(newId);

      logAction(`تعديل فاتورة مبيعات رقم ${newId}`);
    } else {
      // CREATE MODE
      setInvoices(prevInvoices => [...prevInvoices, newInvoice]);

      // If it's an intercompany invoice, mirror it in the target branch!
      if (newInvoice.isIntercompany && newInvoice.targetBranchId) {
        const sourceBranchName = branches?.find(b => b.id === currentBranchId)?.name || (currentBranchId === 'main' ? 'جراند ميديا' : 'المصنع');
        const targetBranchName = branches?.find(b => b.id === newInvoice.targetBranchId)?.name || 'الكيان الآخر';
        apiService.request('/api/intercompany/mirror-invoice', {
          method: 'POST',
          body: JSON.stringify({
            salesInvoice: newInvoice,
            sourceBranchId: currentBranchId || 'main',
            sourceBranchName,
            targetBranchId: newInvoice.targetBranchId
          })
        }).then((res: any) => {
          if (res && res.success) {
            logAction(`تم إنشاء فاتورة مشتريات مقابلة آلياً في (${targetBranchName}) برقم #${res.mirroredPurchaseInvoiceId}`);
          }
        }).catch((err: any) => {
          console.error('Error creating mirrored purchase invoice:', err);
        });
      }
    }

    // Automated Journal Entry
    const customerName = customers.find(c => c.id === newInvoice.customerId)?.name || 'Unknown Customer';

    const calculateTotalCost = (items: any[]) => {
      let cost = 0;
      items.forEach(item => {
        // Use direct item cost if available (Job Costing), otherwise fallback to product master cost
        if (item.cost !== undefined && item.cost >= 0) {
          cost += item.cost * (item.quantity || 0);
        } else {
          const product = products.find(p => p.id === item.productId);
          const itemCost = product ? product.costPrice : 0;
          cost += itemCost * (item.quantity || 0);
        }
      });
      return cost;
    };

    const totalCost = calculateTotalCost(newInvoice.items);

    const inventoryGroups: Record<string, number> = {};
    newInvoice.items.forEach(item => {
      // Find the cost of this specific item line
      let itemCost = 0;
      if (item.cost !== undefined && item.cost >= 0) {
        itemCost = item.cost * (item.quantity || 0);
      } else {
        const product = products.find(p => p.id === item.productId);
        itemCost = (product ? product.costPrice : 0) * (item.quantity || 0);
      }
      
      const product = products.find(p => p.id === item.productId);
      const whId = product?.warehouseId || 'WH-0001';
      const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
      const accId = whAcc ? whAcc.id : (postingSettings?.salesDefaultInventoryAccountId || '1104');
      
      inventoryGroups[accId] = (inventoryGroups[accId] || 0) + itemCost;
    });

    const recAccountId = postingSettings?.salesReceivablesAccountId || '1103';
    const recAccountName = accounts.find(a => a.id === recAccountId)?.name || 'العملاء (المدينون)';
    const revAccountId = postingSettings?.salesRevenueAccountId || '4101';
    const revAccountName = accounts.find(a => a.id === revAccountId)?.name || 'إيرادات المبيعات';
    const retAccountId = postingSettings?.salesReturnsAccountId || '4102';
    const retAccountName = accounts.find(a => a.id === retAccountId)?.name || 'مرتجعات ومسموحات المبيعات';
    const cogsAccountId = postingSettings?.salesCogsAccountId || '5101';
    const cogsAccountName = accounts.find(a => a.id === cogsAccountId)?.name || 'تكلفة البضاعة المباعة';

    if (type === 'sale') {
      const lines = [
        { accountId: recAccountId, accountName: recAccountName, debit: newInvoice.total, credit: 0 },
        { accountId: revAccountId, accountName: revAccountName, debit: 0, credit: newInvoice.total }
      ];

      if (totalCost > 0) {
        lines.push({ accountId: cogsAccountId, accountName: cogsAccountName, debit: totalCost, credit: 0 });
        for (const [accId, amt] of Object.entries(inventoryGroups)) {
          const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
          lines.push({ accountId: accId, accountName: accName, debit: 0, credit: amt });
        }
      }

      createJournalEntry({
        description: `فاتورة مبيعات رقم ${newId} - ${customerName} ${isEdit ? '(تعديل)' : ''}`,
        lines: lines,
        referenceType: 'SalesInvoice',
        referenceId: newId,
        date: newInvoice.date
      });
      if (!isEdit) logAction(`إضافة فاتورة بيع جديدة رقم ${newId} للعميل ${customerName}`);
    } else {
      // Return Logic: Reverse entries (Debit Sales Returns, Credit Customer)
      // AND Reverse COGS (Debit Inventory, Credit COGS)

      const lines = [
        { accountId: retAccountId, accountName: retAccountName, debit: newInvoice.total, credit: 0 },
        { accountId: recAccountId, accountName: recAccountName, debit: 0, credit: newInvoice.total }
      ];

      if (totalCost > 0) {
        for (const [accId, amt] of Object.entries(inventoryGroups)) {
          const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
          lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
        }
        lines.push({ accountId: cogsAccountId, accountName: cogsAccountName, debit: 0, credit: totalCost });
      }

      createJournalEntry({
        description: `فاتورة مرتجع مبيعات رقم ${newId} - ${customerName} ${isEdit ? '(تعديل)' : ''}`,
        lines: lines,
        referenceType: 'SalesInvoice',
        referenceId: newId,
        date: newInvoice.date
      });
      if (!isEdit) logAction(`إضافة فاتورة مرتجع مبيعات رقم ${newId} للعميل ${customerName}`);
    }

    // Revert old invoice stock movements if editing
    if (isEdit && originalInvoice && originalInvoice.status !== 'voided') {
      recordStockMovements(originalInvoice, originalInvoice.invoiceType === 'return', true /* isVoid/revert */);
    }

    // Apply stock movements for the new/updated invoice
    recordStockMovements(newInvoice, type === 'return');

    showNotification({
      type: 'cash',
      title: type === 'return' ? 'تم تسجيل مرتجع مبيعات' : 'تم حفظ فاتورة مبيعات بنجاح',
      message: `فاتورة #${newId} للعميل (${customerName}) بمبلغ ${(newInvoice.total || 0).toLocaleString()} ج.م`,
      sound: 'cash',
      category: 'sales'
    });

    handleCloseModal();
  };

  const handleVoidRequest = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    // Check Financial Lock
    const companyInfoString = localStorage.getItem('companyInfo');
    if (companyInfoString) {
      const { financialYearLockDate } = JSON.parse(companyInfoString);
      // Allow Admin/Developer to bypass
      const isRestrictedUser = currentUser.role !== 'admin' && currentUser.role !== 'developer';

      if (financialYearLockDate && isRestrictedUser && new Date(invoice.date) <= new Date(financialYearLockDate)) {
        alert(`عفواً، لا يمكن إلغاء فاتورة في فترة مالية مغلقة (قبل ${financialYearLockDate}).`);
        return;
      }
    }

    setInvoiceToVoid(invoiceId);
    setIsConfirmModalOpen(true);
  };

  const confirmVoid = () => {
    if (invoiceToVoid) {
      const invoice = invoices.find(inv => inv.id === invoiceToVoid);
      if (invoice && invoice.status !== 'voided') {
        // 1. Update Status
        setInvoices(invoices.map(inv =>
          inv.id === invoiceToVoid ? { ...inv, status: 'voided' } : inv
        ));

        // 2. CRITICAL: Reverse inventory movements (return stock to warehouse)
        recordStockMovements(invoice, invoice.invoiceType === 'return', true /* isVoid=true */);

        // 3. Create Reversing Journal Entry
        const calculateTotalCost = (items: any[]) => {
          let cost = 0;
          items.forEach(item => {
            if (item.cost !== undefined && item.cost >= 0) {
              cost += item.cost * (item.quantity || 0);
            } else {
              const product = products.find(p => p.id === item.productId);
              cost += (product ? product.costPrice : 0) * (item.quantity || 0);
            }
          });
          return cost;
        };

        const totalCost = calculateTotalCost(invoice.items);

        const inventoryGroups: Record<string, number> = {};
        (invoice.items || []).forEach(item => {
          let itemCost = 0;
          if (item.cost !== undefined && item.cost >= 0) {
            itemCost = item.cost * (item.quantity || 0);
          } else {
            const product = products.find(p => p.id === item.productId);
            itemCost = (product ? product.costPrice : 0) * (item.quantity || 0);
          }
          const product = products.find(p => p.id === item.productId);
          const whId = product?.warehouseId || 'WH-0001';
          const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
          const accId = whAcc ? whAcc.id : (postingSettings?.salesDefaultInventoryAccountId || '1104');
          inventoryGroups[accId] = (inventoryGroups[accId] || 0) + itemCost;
        });

        const recAccountId = postingSettings?.salesReceivablesAccountId || '1103';
        const recAccountName = accounts.find(a => a.id === recAccountId)?.name || 'العملاء (المدينون)';
        const retAccountId = postingSettings?.salesReturnsAccountId || '4102';
        const retAccountName = accounts.find(a => a.id === retAccountId)?.name || 'مرتجعات ومخصومات المبيعات (إلغاء)';
        const cogsAccountId = postingSettings?.salesCogsAccountId || '5101';
        const cogsAccountName = accounts.find(a => a.id === cogsAccountId)?.name || 'تكلفة البضاعة المباعة';

        // Use contra-revenue account for sales returns/voids
        const lines = [
          { accountId: retAccountId, accountName: retAccountName, debit: invoice.total, credit: 0 },
          { accountId: recAccountId, accountName: recAccountName, debit: 0, credit: invoice.total }
        ];

        if (totalCost > 0) {
          for (const [accId, amt] of Object.entries(inventoryGroups)) {
            const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
            lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
          }
          lines.push({ accountId: cogsAccountId, accountName: cogsAccountName, debit: 0, credit: totalCost });
        }

        createJournalEntry({
          description: `إلغاء (عكس) فاتورة مبيعات رقم ${invoice.id}`,
          lines: lines,
          referenceType: 'SalesInvoice',
          referenceId: `VOID-${invoice.id}`
        });

        // 4. Log Action
        logAction(`إلغاء فاتورة بيع رقم ${invoice.id}`);
      }
    }
    setIsConfirmModalOpen(false);
    setInvoiceToVoid(null);
  };

  const cancelVoid = () => {
    setIsConfirmModalOpen(false);
    setInvoiceToVoid(null);
  };

  const handleDeleteInvoice = (id: string) => {
    const invoice = invoices.find(inv => inv.id === id);
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً؟\nسيتم حذفها بالكامل مع حذف أي فاتورة مشتريات مقابلة لها في الكيان الشقيق تلقائياً.')) {
      // CRITICAL: Reverse stock movements before deleting (if invoice is still active)
      if (invoice && invoice.status !== 'voided') {
        recordStockMovements(invoice, invoice.invoiceType === 'return', true /* isVoid=true */);
      }
      // Also remove the stock transaction records for this invoice
      setStockTransactions(prev => prev.filter(t => t.referenceId !== id));
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      deleteJournalEntryByReference(id);
      logAction(`حذف فاتورة مبيعات رقم ${id} نهائياً`);
    }
  };

  // Filter Handlers
  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const togglePaymentMethod = (method: string) => {
    setSelectedPaymentMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCustomerIds([]);
    setSelectedProductIds([]);
    setSelectedPaymentMethods([]);
    setStartDate('');
    setEndDate('');
    setIsCustomerDropdownOpen(false);
    setIsProductDropdownOpen(false);
    setIsPaymentMethodDropdownOpen(false);
  };

  const handlePrint = (invoice: SalesInvoice, isGrayscale: boolean = false) => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    // Calculate Balances
    const customer = customers.find(c => c.id === invoice.customerId);
    const custInvoices = invoices.filter(i => i.customerId === invoice.customerId && i.status !== 'voided');
    const custPayments = customerPayments.filter(p => p.customerId === invoice.customerId && p.status !== 'voided');

    const totalInv = custInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPay = custPayments.reduce((sum, p) => sum + p.amount, 0);

    const currentGlobalBalance = (customer?.openingBalance || 0) + totalInv - totalPay;
    const previousBalance = currentGlobalBalance - invoice.total;
    const jobOrderCode = invoice.items.find(i => i.batchCode)?.batchCode ||
      invoice.notes?.match(/JOB-\d{4}-\d+/)?.[0] ||
      invoice.items.map(i => i.productId).find(p => p && p.startsWith('PRNT-'))?.replace('PRNT-', '') ||
      '';

    const printContent = `
      <html>
        <head>
          <title>فاتورة مبيعات ${invoice.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { 
              font-family: 'Cairo', sans-serif; 
              direction: rtl; 
              margin: 0; 
              padding: 20px; 
              background-color: white; 
              position: relative;
              min-height: 95vh;
            }
            .invoice-box { 
              max-width: 800px; 
              margin: auto; 
              padding: 20px; 
              padding-bottom: 100px; /* Space for footer */
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px; 
              border-bottom: 3px solid ${isGrayscale ? '#000' : '#007bff'}; 
            }
            .header > div { flex: 1; }
            .company-logo { text-align: right; }
            .company-logo img { max-width: 200px; max-height: 120px; object-fit: contain; ${isGrayscale ? 'filter: grayscale(100%);' : ''} }
            .invoice-title-container { text-align: center; }
            .invoice-title-container h2 { margin: 0; color: ${isGrayscale ? '#000' : '#333'}; font-size: 28px; font-weight: 700; }
            .invoice-title-container span { display: block; margin-top: 5px; font-size: 16px; color: ${isGrayscale ? '#000' : '#666'}; }
            .company-name { text-align: left; }
            .company-name h1 { margin: 0; color: ${isGrayscale ? '#000' : '#007bff'}; font-size: 32px; font-weight: 800; }
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; background: ${isGrayscale ? '#fff' : '#f8f9fa'}; p-2; rounded: 8px; border: ${isGrayscale ? '1px solid #000' : '1px solid #eee'}; padding: 15px; }
            table { width: 100%; text-align: right; border-collapse: collapse; margin-bottom: 20px; }
            table th { background-color: ${isGrayscale ? '#fff' : '#007bff'}; color: ${isGrayscale ? '#000' : 'white'}; padding: 10px; border: ${isGrayscale ? '1px solid #000' : '1px solid #007bff'}; font-weight: bold; border-bottom: ${isGrayscale ? '2px solid #000' : '1px solid #007bff'}; }
            table td { padding: 8px; border: ${isGrayscale ? '1px solid #000' : '1px solid #ddd'}; color: ${isGrayscale ? '#000' : 'inherit'}; }
            .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-table { width: 300px; border: ${isGrayscale ? '2px solid #000' : '2px solid #ddd'}; }
            .totals-table td { padding: 8px; border-bottom: ${isGrayscale ? '1px solid #000' : '1px solid #ddd'}; }
            .totals-table .label { font-weight: bold; background-color: ${isGrayscale ? '#fff' : '#f1f1f1'}; color: ${isGrayscale ? '#000' : 'inherit'}; }
            .totals-table .final-total { background-color: ${isGrayscale ? '#fff' : '#007bff'}; color: ${isGrayscale ? '#000' : 'white'}; font-weight: bold; font-size: 1.1em; border-top: ${isGrayscale ? '2px solid #000' : 'none'}; }
            .notes-section { margin-top: 20px; padding: 10px; border: ${isGrayscale ? '1px solid #000' : '1px solid #eee'}; background-color: ${isGrayscale ? '#fff' : '#fffde7'}; border-radius: 5px; color: ${isGrayscale ? '#000' : 'inherit'}; }
            .footer { 
              position: fixed; 
              bottom: 0; 
              left: 0; 
              right: 0; 
              text-align: center; 
              border-top: 2px solid ${isGrayscale ? '#000' : '#ddd'}; 
              padding: 20px; 
              background-color: white;
              font-size: 16px;
              color: ${isGrayscale ? '#000' : '#333'};
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
             <div class="header">
              <div class="company-logo">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo">` : ''}
              </div>
              <div class="invoice-title-container">
                <h2>فاتورة مبيعات</h2>
                <span>#${invoice.id}</span>
              </div>
              <div class="company-name">
                <h1>${companyInfo.name}</h1>
              </div>
            </div>
             <div class="invoice-details">
              <div>
                <strong>فاتورة إلى السيد/السادة:</strong><br>
                <span style="font-size: 1.2em;">${invoice.customerName}</span>
                ${invoice.companyName ? `<br><span>شركة: ${invoice.companyName}</span>` : ''}
              </div>
              <div style="text-align: left; line-height: 1.5;">
                <strong>التاريخ:</strong> ${invoice.date}<br>
                ${jobOrderCode ? `<strong>رقم أمر الشغل:</strong> <span style="font-family: monospace; font-weight: bold; color: #1e40af;">${jobOrderCode}</span><br>` : ''}
                <strong>طريقة السداد:</strong> ${invoice.paymentMethod}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 5%; text-align: center;">#</th>
                  <th style="width: 15%; text-align: center;">كود الصنف</th>
                  <th>الصنف والمواصفات</th>
                  <th style="width: 12%; text-align: center;">الكمية</th>
                  <th style="width: 15%; text-align: center;">السعر</th>
                  <th style="width: 18%; text-align: center;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                 ${invoice.items.map((item, index) => {
                  const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
                  const cleanProductName = item.productName.replace(/\s*\(أمر شغل\s+JOB-[^)]+\)/, '');
                  return `
                  <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td style="text-align: center; font-family: monospace; font-size: 12px; color: ${isGrayscale ? '#000' : '#374151'}; font-weight: 600;">${itemCode || '-'}</td>
                    <td>
                      <strong>${cleanProductName}</strong>
                      ${item.description ? `<div style="font-size: 11px; color: ${isGrayscale ? '#000' : '#666'}; margin-top: 1px;">${item.description}</div>` : ''}
                      ${item.specifications ? `<div style="font-size: 10px; color: #166534; background: #f0fdf4; padding: 2px 6px; border-radius: 4px; margin-top: 3px; border-right: 2px solid #22c55e; line-height: 1.3;"><strong>المواصفات:</strong> ${item.specifications}</div>` : ''}
                    </td>
                    <td style="text-align: center;">${item.quantity.toLocaleString('en-US')} ${item.unit || ''}</td>
                    <td style="text-align: center;">${item.price.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    <td style="text-align: center; font-weight: bold;">${item.total.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
            <div class="totals-container">
                <table class="totals-table">
                    <tr>
                        <td class="label">إجمالي الفاتورة:</td>
                        <td>${invoice.total.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                    <tr>
                        <td class="label">الرصيد السابق:</td>
                        <td>${previousBalance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                    <tr class="final-total">
                        <td>إجمالي المستحق:</td>
                        <td>${currentGlobalBalance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                </table>
            </div>
            ${invoice.notes ? `
              <div class="notes-section">
                <strong>ملاحظات:</strong><br>
                ${invoice.notes.replace(/\n/g, '<br>')}
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p style="margin: 0;">${companyInfo.address} - هاتف: ${companyInfo.phone}</p>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.onload = () => {
         setTimeout(() => {
           win.focus();
           win.print();
         }, 500);
      };
    }
  };

  const handlePrintFilteredReport = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    let filterDescription = "جميع الفواتير";
    if (startDate || endDate) {
      filterDescription = `الفترة من ${startDate || 'البداية'} إلى ${endDate || 'الآن'}`;
    }
    if (selectedCustomerIds.length > 0) {
      const customerNames = customers.filter(c => selectedCustomerIds.includes(c.id)).map(c => c.name).join(', ');
      filterDescription += ` - العملاء: ${customerNames}`;
    }

    const printContent = `
      <html>
        <head>
          <title>تقرير المبيعات</title>
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
              border-bottom: 2px solid #007bff; 
              padding-bottom: 20px; 
            }
            h1 { margin: 0; color: #007bff; }
            h2 { margin: 5px 0; color: #333; }
            p { color: #666; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background-color: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: center; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; text-align: center; }
            .total-row { background-color: #e3f2fd; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name}</h1>
            <h2>تقرير المبيعات</h2>
            <p>${filterDescription}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>اسم الشركة</th>
                <th>التاريخ</th>
                <th>طريقة السداد</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInvoices.map(inv => `
                <tr>
                  <td>${inv.id}</td>
                  <td>${inv.customerName}</td>
                  <td>${inv.companyName || '-'}</td>
                  <td>${inv.date}</td>
                  <td>${inv.paymentMethod}</td>
                  <td>${inv.total.toLocaleString('en-US')} ج.م</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: left; padding-left: 20px;">الإجمالي</td>
                <td>${filteredTotal.toLocaleString('en-US')} ج.م</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
            تمت الطباعة بتاريخ ${new Date().toLocaleDateString('ar-EG')}
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  // Export Handler
  const handleExport = () => {
    const dataToExport = filteredInvoices.map(inv => ({
      'رقم الفاتورة': inv.id,
      'العميل': inv.customerName,
      'التاريخ': inv.date,
      'الإجمالي': inv.total,
      'طريقة الدفع': inv.paymentMethod,
      'الحالة': inv.status === 'voided' ? 'ملغاة' : 'نشطة'
    }));
    exportToExcel(dataToExport, 'تقرير_المبيعات');
  };

  // WhatsApp Handler
  const handleWhatsApp = (invoice: SalesInvoice) => {
    const customer = customers.find(c => c.id === invoice.customerId);
    const phone = customer?.phone || '';
    const companyInfoStr = localStorage.getItem('companyInfo');
    const companyName = companyInfoStr ? JSON.parse(companyInfoStr).name : undefined;
    const message = generateInvoiceWhatsAppText(invoice, companyName);
    openWhatsAppWithMessage(phone, message);
  };



  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-main">فواتير المبيعات</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="bg-white border border-gray-300 text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-sm text-sm"
              title="إعدادات التوجيه المحاسبي لموديول المبيعات"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">إعدادات التوجيه</span>
            </button>
          )}
          {hasPerm('print_sales_invoice') && (
            <button
              onClick={() => handlePrintFilteredReport()}
              className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center space-x-2 space-x-reverse shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
              <span>طباعة الكشف</span>
            </button>
          )}
          {hasPerm('view_reports_sales') && (
            <button
              onClick={() => setIsItemReportOpen(true)}
              className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center space-x-2 space-x-reverse shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <span>تقرير بالأصناف</span>
            </button>
          )}
          {hasPerm('export_sales') && (
            <button
              onClick={handleExport}
              className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>تصدير إكسيل</span>
            </button>
          )}

          {hasPerm('create_sales_invoice') && (
            <button
              onClick={() => { setEditingInvoice(null); setIsModalOpen(true); }} // Default Sale
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>إضافة فاتورة بيع</span>
            </button>
          )}
          {hasPerm('create_sales_return') && (
            <button
              onClick={() => {
                setEditingInvoice({ invoiceType: 'return' } as any);
                setIsModalOpen(true);
              }}
              className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center space-x-2 space-x-reverse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
              <span>مرتجع مبيعات</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-theme-card p-4 rounded-xl shadow-sm border border-theme mb-6 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">

          {/* Invoice ID Search */}
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-main mb-1">بحث برقم الفاتورة</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full p-2 border border-input-border bg-input-bg text-input-text rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Customer Filter */}
          <div className="col-span-1 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">تصفية حسب العميل</label>
            <button
              onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
              className="w-full p-2 border border-input-border rounded-lg bg-input-bg text-input-text text-right flex justify-between items-center focus:ring-2 focus:ring-primary"
            >
              <span className="truncate">
                {selectedCustomerIds.length === 0
                  ? 'جميع العملاء'
                  : `${selectedCustomerIds.length} عملاء محددين`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isCustomerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {customers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => toggleCustomer(c.id)}
                    className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.includes(c.id)}
                      readOnly
                      className="form-checkbox h-4 w-4 text-blue-600 rounded ml-2"
                    />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
            {isCustomerDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsCustomerDropdownOpen(false)}></div>
            )}
          </div>

          {/* Product Filter */}
          <div className="col-span-1 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">يحتوي على صنف</label>
            <button
              onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-right flex justify-between items-center focus:ring-2 focus:ring-blue-500"
            >
              <span className="truncate">
                {selectedProductIds.length === 0
                  ? 'جميع الأصناف'
                  : `${selectedProductIds.length} أصناف محددة`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isProductDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                {products.map(p => (
                  <div
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      readOnly
                      className="form-checkbox h-4 w-4 text-blue-600 rounded ml-2"
                    />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
            {isProductDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsProductDropdownOpen(false)}></div>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="col-span-1 relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">طريقة الدفع</label>
            <button
              onClick={() => setIsPaymentMethodDropdownOpen(!isPaymentMethodDropdownOpen)}
              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-right flex justify-between items-center focus:ring-2 focus:ring-blue-500"
            >
              <span className="truncate">
                {selectedPaymentMethods.length === 0
                  ? 'الكل'
                  : `${selectedPaymentMethods.length} محدد`}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isPaymentMethodDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                {['نقدي', 'اجل', 'شيك'].map(method => (
                  <div
                    key={method}
                    onClick={() => togglePaymentMethod(method)}
                    className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPaymentMethods.includes(method)}
                      readOnly
                      className="form-checkbox h-4 w-4 text-blue-600 rounded ml-2"
                    />
                    <span className="text-sm text-gray-700">{method}</span>
                  </div>
                ))}
              </div>
            )}
            {isPaymentMethodDropdownOpen && (
              <div className="fixed inset-0 z-10" onClick={() => setIsPaymentMethodDropdownOpen(false)}></div>
            )}
          </div>

          {/* Date Filters */}
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center border-t pt-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => resetFilters()}
              className="bg-gray-100 text-gray-600 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              إعادة تعيين الفلاتر
            </button>
            <span className="text-gray-500 text-sm">عدد الفواتير: <strong>{filteredInvoices.length}</strong></span>
          </div>
          <div className="text-lg">
            <span className="text-gray-600 ml-2">الإجمالي (المصفى):</span>
            <span className="font-bold text-blue-600">{filteredTotal.toLocaleString('en-US')} ج.م</span>
          </div>
        </div>
      </div>

      <div className="bg-theme-card p-6 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-theme-bg">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide">رقم الفاتورة</th>
                <th className="p-3 text-sm font-semibold tracking-wide">العميل</th>
                <th className="p-3 text-sm font-semibold tracking-wide">اسم الشركة</th>
                <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                <th className="p-3 text-sm font-semibold tracking-wide">طريقة السداد</th>
                <th className="p-3 text-sm font-semibold tracking-wide">الإجمالي</th>
                <th className="p-3 text-sm font-semibold tracking-wide">الحالة</th>
                <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className={`hover:bg-theme-bg ${invoice.status === 'voided' ? 'bg-red-50' : ''}`}>
                  <td className="p-3 text-sm text-gray-700">{invoice.id}</td>
                  <td className="p-3 text-sm text-gray-700">{invoice.customerName}</td>
                  <td className="p-3 text-sm text-gray-600">{invoice.companyName || '-'}</td>
                  <td className="p-3 text-sm text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{invoice.date}</td>
                  <td className="p-3 text-sm text-gray-700">
                    <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg bg-opacity-50 ${invoice.paymentMethod === 'نقدي' ? 'text-green-800 bg-green-200' :
                      invoice.paymentMethod === 'اجل' ? 'text-red-800 bg-red-200' : 'text-blue-800 bg-blue-200'
                      }`}>
                      {invoice.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-gray-700 font-bold">
                    {invoice.status === 'voided' ? (
                      <span className="line-through text-gray-400">{(Number(invoice.total) || 0).toLocaleString('en-US')} ج.م</span>
                    ) : (
                      `${(Number(invoice.total) || 0).toLocaleString('en-US')} ج.م`
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {invoice.status === 'voided' ? (
                      <span className="text-red-600 font-bold text-xs">ملغاة (عكس القيد)</span>
                    ) : (
                      <span className="text-green-600 font-bold text-xs">فعالة</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse flex items-center">
                    {hasPerm('print_sales_invoice') && (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handlePrint(invoice, false)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 p-1 rounded hover:bg-blue-50 flex items-center"
                          title="طباعة (ملونة)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                          <span>طباعة</span>
                        </button>
                        <button
                          onClick={() => handlePrint(invoice, true)}
                          className="text-gray-800 hover:text-black font-medium text-xs border border-gray-400 p-1 rounded hover:bg-gray-100 flex items-center"
                          title="طباعة (أبيض وأسود)"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                          <span>أبيض/أسود</span>
                        </button>
                      </div>
                    )}
                    <button onClick={() => handleWhatsApp(invoice)} className="text-green-500 hover:text-green-700 font-medium" title="واتساب">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    </button>
                    {invoice.status !== 'voided' && (
                      <>
                        {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                          <button
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setIsModalOpen(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-800 font-medium p-1 hover:bg-yellow-50 rounded"
                            title="تعديل الفاتورة"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                          </button>
                        )}
                        {hasPerm('void_sales_invoice') && (
                          <button
                            onClick={() => handleVoidRequest(invoice.id)}
                            className="text-orange-600 hover:text-orange-800 font-medium p-1 hover:bg-orange-50 rounded"
                            title="إلغاء الفاتورة (عكس القيد)"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                          </button>
                        )}
                      </>
                    )}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="text-red-600 hover:text-red-800 font-medium p-1 hover:bg-red-50 rounded"
                        title="حذف الفاتورة نهائياً (مع الفاتورة المقابلة)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-gray-500">لا توجد فواتير تطابق معايير البحث.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {
        isModalOpen && (
          <AddSalesInvoiceModal
            onClose={handleCloseModal}
            onSave={handleSaveInvoice}
            customers={customers}
            products={products}
            invoiceToEdit={editingInvoice}
            existingInvoices={invoices}
            branches={branches}
            currentBranchId={currentBranchId}
          />
        )
      }
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={cancelVoid}
        onConfirm={confirmVoid}
        title="تأكيد إلغاء الفاتورة"
        message="هل أنت متأكد من رغبتك في لإلغاء هذه الفاتورة؟ سيتم عكس القيد المحاسبي ولن يؤثر على الأرصدة بعد ذلك."
      />
      {
        isItemReportOpen && (
          <DetailedSalesByItemReport
            onClose={() => setIsItemReportOpen(false)}
            salesInvoices={invoices}
            products={products}
            customers={customers}
          />
        )
      }
    </div >
  );
};

export default Sales;
