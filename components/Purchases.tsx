
import React, { useState } from 'react';
import type { PurchaseInvoice, CompanyInfo, Supplier, Product, SupplierPayment, Expense, Account, StockTransaction } from '../types.ts';
import AddPurchaseInvoiceModal from './AddPurchaseInvoiceModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import SupplierStatementModal from './SupplierStatementModal.tsx';

interface PurchasesProps {
  invoices: PurchaseInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  suppliers: Supplier[];
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  stockTransactions: StockTransaction[];
  setStockTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
  supplierPayments: SupplierPayment[];
  setSupplierPayments?: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
  createJournalEntry: (params: { description: string, lines: any[], referenceType?: 'SalesInvoice' | 'PurchaseInvoice' | 'Payment' | 'Manual', referenceId?: string, date?: string }) => void;
  logAction: (action: string) => void;
  currentUser: any;
  deleteJournalEntryByReference: (refId: string) => void;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  currentBranchId?: string;
}

const Purchases: React.FC<PurchasesProps> = ({ invoices, setInvoices, suppliers, products, setProducts, stockTransactions, setStockTransactions, supplierPayments, setSupplierPayments, createJournalEntry, logAction, currentUser, deleteJournalEntryByReference, accounts, setAccounts, currentBranchId = 'main' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [invoiceToVoid, setInvoiceToVoid] = useState<string | null>(null);

  // Statement Modal State
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);

  // Advanced Search States
  const [searchDateStart, setSearchDateStart] = useState<string>('');
  const [searchDateEnd, setSearchDateEnd] = useState<string>('');
  const [searchSupplierId, setSearchSupplierId] = useState<string>('');
  const [searchInvoiceId, setSearchInvoiceId] = useState<string>('');

  // Filtering Logic
  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(inv => {
      const dateMatch = (!searchDateStart || new Date(inv.date) >= new Date(searchDateStart)) &&
        (!searchDateEnd || new Date(inv.date) <= new Date(searchDateEnd));
      const supplierMatch = !searchSupplierId || inv.supplierId === searchSupplierId;
      const idMatch = !searchInvoiceId || inv.id.toLowerCase().includes(searchInvoiceId.toLowerCase());

      return dateMatch && supplierMatch && idMatch;
    }).sort((a, b) => b.id.localeCompare(a.id));
  }, [invoices, searchDateStart, searchDateEnd, searchSupplierId, searchInvoiceId]);

  const resetFilters = () => {
    setSearchDateStart('');
    setSearchDateEnd('');
    setSearchSupplierId('');
    setSearchInvoiceId('');
  };

  const handleOpenModal = (invoice: PurchaseInvoice | null = null) => {
    if (invoice) return; // Prevent editing existing invoices
    setEditingInvoice(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingInvoice(null);
    setIsModalOpen(false);
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

  const handleAddAutoExpense = (e, a) => {};
  const handleSaveInvoice = (invoiceData: Omit<PurchaseInvoice, 'id'> & { id?: string }, type: 'purchase' | 'return' = 'purchase') => {
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
        // If editing, also check the ORIGINAL date
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
      const currentYear = new Date().getFullYear();
      // Robust ID Generation
      const prefix = type === 'return' ? 'RET-PUR' : 'PUR';
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
    }

    const supplier = suppliers.find(s => s.id === invoiceData.supplierId);
    const supplierName = supplier?.name || invoiceData.supplierName || 'Unknown Supplier';
    const companyName = invoiceData.companyName || supplier?.companyName || '';

    const newInvoice: PurchaseInvoice = {
      ...invoiceData,
      id: newId,
      supplierName,
      companyName,
      invoiceType: type,
      status: 'active'
    } as PurchaseInvoice;

    if (isEdit) {
      // EDIT MODE
      setInvoices(prevInvoices => prevInvoices.map(inv => inv.id === newId ? newInvoice : inv));
      deleteJournalEntryByReference(newId);
      logAction(`تعديل فاتورة مشتريات رقم ${newId}`);
    } else {
      // CREATE MODE
      setInvoices(prevInvoices => [...prevInvoices, newInvoice]);
    }

    // Calculate Splits (Inventory vs Expenses)
    const inventoryItems = newInvoice.items.filter(i => i.itemType !== 'expense');
    const expenseItems = newInvoice.items.filter(i => i.itemType === 'expense');

    const inventoryGroups: Record<string, number> = {};
    inventoryItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      const whId = product?.warehouseId || 'WH-0001';
      const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
      const accId = whAcc ? whAcc.id : '1104';
      inventoryGroups[accId] = (inventoryGroups[accId] || 0) + item.total;
    });

    // Group expenses by name/category
    const expenseGroups: Record<string, number> = {};
    expenseItems.forEach(i => {
      const cat = i.productName; // In modal, productName holds the expense name
      expenseGroups[cat] = (expenseGroups[cat] || 0) + i.total;
    });

    if (type === 'purchase') {
      const lines = [];
      // Debit Inventory
      for (const [accId, amt] of Object.entries(inventoryGroups)) {
        const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
        lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
      }
      // Debit Expenses
      for (const [cat, amt] of Object.entries(expenseGroups)) {
        lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: amt, credit: 0 });
      }

      if (newInvoice.paymentMethod === 'نقدي') {
        // Credit Supplier and then clear with Treasury for full audit trail
        lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: 0, credit: newInvoice.total });
        const treasuryAccountName = newInvoice.treasuryAccount || 'الخزينة الرئيسية';
        const treasuryAcc = accounts.find(a => a.name === treasuryAccountName) || { id: '1101', name: treasuryAccountName };
        lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: newInvoice.total, credit: 0 });
        lines.push({ accountId: treasuryAcc.id, accountName: treasuryAccountName, debit: 0, credit: newInvoice.total });
      } else {
        // Credit Supplier
        lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: 0, credit: newInvoice.total });
      }

      createJournalEntry({
        description: `فاتورة مشتريات رقم ${newId} - ${supplierName} (${newInvoice.paymentMethod}) ${isEdit ? '(تعديل)' : ''}`,
        lines: lines,
        referenceType: 'PurchaseInvoice',
        referenceId: newId,
        date: newInvoice.date
      });
      if (!isEdit) logAction(`إضافة فاتورة مشتريات جديدة رقم ${newId} من المورد ${supplierName}`);
    } else {
      // Return Logic: Reverse entries (Debit Supplier, Credit Inventory/Expenses)
      const lines = [];
      lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: newInvoice.total, credit: 0 });

      // Credit Inventory
      for (const [accId, amt] of Object.entries(inventoryGroups)) {
        const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
        lines.push({ accountId: accId, accountName: accName, debit: 0, credit: amt });
      }
      // Credit Expenses
      for (const [cat, amt] of Object.entries(expenseGroups)) {
        lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: 0, credit: amt });
      }

      createJournalEntry({
        description: `فاتورة مرتجع مشتريات رقم ${newId} - ${supplierName} ${isEdit ? '(تعديل)' : ''}`,
        lines: lines,
        referenceType: 'PurchaseInvoice',
        referenceId: newId,
        date: newInvoice.date
      });
      if (!isEdit) logAction(`إضافة فاتورة مرتجع مشتريات رقم ${newId} من المورد ${supplierName}`);
    }

    // ── Perpetual Inventory & Cost Calculations (BOTH Add and Edit) ──
    const isIn = type === 'purchase';
    const newTxs: StockTransaction[] = [];

    setProducts(prevProducts => {
      let updatedProducts = [...prevProducts];

      // 1. If Editing, first revert the quantities from the original invoice
      if (originalInvoice && originalInvoice.status !== 'voided') {
        const origIsIn = originalInvoice.invoiceType === 'purchase';
        originalInvoice.items
          .filter(item => item.itemType !== 'expense' && item.productId && !item.productId.startsWith('MANUAL'))
          .forEach(item => {
            const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
            if (pIdx !== -1) {
              const oldQtyDelta = origIsIn ? item.quantity : -item.quantity;
              updatedProducts[pIdx] = {
                ...updatedProducts[pIdx],
                quantity: Math.max(0, updatedProducts[pIdx].quantity - oldQtyDelta)
              };
            }
          });
      }

      // 2. Apply new invoice quantities & unit costs
      newInvoice.items
        .filter(item => item.itemType !== 'expense' && item.productId && !item.productId.startsWith('MANUAL'))
        .forEach(item => {
          const pIdx = updatedProducts.findIndex(p => p.id === item.productId);
          if (pIdx === -1) return;
          const product = updatedProducts[pIdx];

          const qty = Number(item.quantity) || 0;
          // Calculate effective unit cost (e.g. Total / Qty handles Price per Ton or any price type accurately)
          const effectiveUnitCost = qty > 0 ? (item.total / qty) : (Number(item.price) || 0);
          const qtyDelta = isIn ? qty : -qty;
          const newBalance = Math.max(0, product.quantity + qtyDelta);

          newTxs.push({
            id: `ST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: newInvoice.date,
            productId: product.id,
            productName: product.name,
            type: isIn ? 'purchase' : 'purchase_return',
            quantityIn: isIn ? qty : 0,
            quantityOut: isIn ? 0 : qty,
            unitCost: effectiveUnitCost,
            totalCost: item.total,
            balanceAfter: newBalance,
            referenceId: newId,
            referenceType: 'PurchaseInvoice',
            notes: isEdit
              ? (isIn ? 'فاتورة مشتريات (تعديل)' : 'مرتجع مشتريات (تعديل)')
              : (isIn ? 'فاتورة مشتريات' : 'مرتجع مشتريات'),
            createdAt: new Date().toISOString(),
          });

          updatedProducts[pIdx] = {
            ...product,
            quantity: newBalance,
            costPrice: isIn && effectiveUnitCost > 0 ? effectiveUnitCost : product.costPrice
          };
        });

      return updatedProducts;
    });

    // Replace old stock transactions for this invoice with the newly computed ones
    setStockTransactions(prev => [
      ...prev.filter(t => t.referenceId !== newId),
      ...newTxs
    ]);

    // ── Treasury Impact (Cash Payment Sync) ──
    const paymentId = `PAY-${newId}`;
    if (setSupplierPayments) {
      if (newInvoice.paymentMethod === 'نقدي' && type === 'purchase') {
        const autoPayment: SupplierPayment = {
          id: paymentId,
          supplierId: newInvoice.supplierId,
          supplierName: supplierName,
          amount: newInvoice.total,
          date: newInvoice.date,
          treasuryAccount: newInvoice.treasuryAccount || 'الخزينة الرئيسية',
          paymentMethod: 'نقدي',
          notes: `سداد نقدي تلقائي لفاتورة مشتريات رقم ${newId}`,
          status: 'active',
          branchId: currentBranchId || 'main',
          referenceId: newId,
        };
        setSupplierPayments(prev => [
          ...prev.filter(p => p.id !== paymentId && p.referenceId !== newId),
          autoPayment
        ]);
      } else {
        // If invoice is credit ('اجل') or return, remove any cash payment recorded for this invoice
        setSupplierPayments(prev => prev.filter(p => p.id !== paymentId && p.referenceId !== newId));
      }
    }

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

        // 2. Revert Stock Movement
        const isIn = invoice.type === 'purchase';
        const voidTxs: StockTransaction[] = [];
        setProducts(prevProducts => {
          let updated = [...prevProducts];
          invoice.items
            .filter(item => item.itemType !== 'expense' && item.productId && !item.productId.startsWith('MANUAL'))
            .forEach(item => {
              const pIdx = updated.findIndex(p => p.id === item.productId);
              if (pIdx !== -1) {
                const prod = updated[pIdx];
                const qtyDelta = isIn ? -item.quantity : item.quantity;
                const newBal = Math.max(0, prod.quantity + qtyDelta);
                updated[pIdx] = { ...prod, quantity: newBal };
                voidTxs.push({
                  id: `ST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  date: new Date().toISOString().split('T')[0],
                  productId: prod.id,
                  productName: prod.name,
                  type: isIn ? 'purchase_return' : 'purchase',
                  quantityIn: isIn ? 0 : item.quantity,
                  quantityOut: isIn ? item.quantity : 0,
                  unitCost: prod.costPrice,
                  totalCost: item.total,
                  balanceAfter: newBal,
                  referenceId: invoice.id,
                  referenceType: 'PurchaseInvoice',
                  notes: `إلغاء فاتورة مشتريات رقم ${invoice.id}`,
                  createdAt: new Date().toISOString(),
                });
              }
            });
          return updated;
        });

        if (voidTxs.length > 0) {
          setStockTransactions(prev => [...voidTxs, ...prev]);
        }

        // 3. Void linked cash payment in Treasury if any
        if (setSupplierPayments) {
          setSupplierPayments(prev => prev.map(p =>
            (p.referenceId === invoice.id || p.id === `PAY-${invoice.id}`) ? { ...p, status: 'voided' } : p
          ));
        }

        // 4. Create Reversing Entry (Recalculate split)
        const inventoryItems = invoice.items.filter(i => i.itemType !== 'expense');
        const expenseItems = invoice.items.filter(i => i.itemType === 'expense');

        const inventoryGroups: Record<string, number> = {};
        inventoryItems.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const whId = product?.warehouseId || 'WH-0001';
          const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
          const accId = whAcc ? whAcc.id : '1104';
          inventoryGroups[accId] = (inventoryGroups[accId] || 0) + item.total;
        });

        const expenseGroups: Record<string, number> = {};
        expenseItems.forEach(i => {
          const cat = i.productName;
          expenseGroups[cat] = (expenseGroups[cat] || 0) + i.total;
        });

        const lines = [];

        if (invoice.type === 'purchase') {
          // Reverse Purchase (Credit Inventory/Expense, Debit Supplier)
          lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: invoice.total, credit: 0 });
          for (const [accId, amt] of Object.entries(inventoryGroups)) {
            const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
            lines.push({ accountId: accId, accountName: accName, debit: 0, credit: amt });
          }
          for (const [cat, amt] of Object.entries(expenseGroups)) {
            lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: 0, credit: amt });
          }
        } else {
          // Reverse Return (Debit Inventory/Expense, Credit Supplier)
          lines.push({ accountId: '2101', accountName: 'الموردين (الدائنون)', debit: 0, credit: invoice.total });
          for (const [accId, amt] of Object.entries(inventoryGroups)) {
            const accName = accounts.find(a => a.id === accId)?.name || 'المخزون';
            lines.push({ accountId: accId, accountName: accName, debit: amt, credit: 0 });
          }
          for (const [cat, amt] of Object.entries(expenseGroups)) {
            lines.push({ accountId: getOrCreateExpenseAccount(cat), accountName: cat, debit: amt, credit: 0 });
          }
        }

        createJournalEntry({
          description: `إلغاء (عكس) فاتورة مشتريات رقم ${invoice.id}`,
          lines: lines,
          referenceType: 'PurchaseInvoice',
          referenceId: invoice.id
        });

        // 5. Log Action
        logAction(`إلغاء فاتورة مشتريات رقم ${invoice.id}`);
      }
    }
    setIsConfirmModalOpen(false);
    setInvoiceToVoid(null);
  };

  const cancelVoid = () => {
    setIsConfirmModalOpen(false);
    setInvoiceToVoid(null);
  };

  const handlePrint = (invoice: PurchaseInvoice) => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    // Calculate Balances
    const supplier = suppliers.find(s => s.id === invoice.supplierId);
    const suppInvoices = invoices.filter(i => i.supplierId === invoice.supplierId && i.status !== 'voided');
    const suppPayments = supplierPayments.filter(p => p.supplierId === invoice.supplierId && p.status !== 'voided');

    const totalInv = suppInvoices.reduce((sum, i) => sum + i.total, 0);
    const totalPay = suppPayments.reduce((sum, p) => sum + p.amount, 0);

    // Balance Logic for Suppliers (Credit): Opening + Purchases - Payments
    const currentGlobalBalance = (supplier?.openingBalance || 0) + totalInv - totalPay;
    const previousBalance = currentGlobalBalance - invoice.total;

    const printContent = `
      <html>
        <head>
          <title>فاتورة مشتريات ${invoice.id}</title>
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
              margin-bottom: 20px; 
              padding-bottom: 15px; 
              border-bottom: 2px solid #28a745; 
            }
            .company-name h1 { margin: 0; color: #28a745; font-size: 24px; }
            .company-logo img { max-width: 120px; max-height: 80px; }
            
            .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8f9fa; p-2; rounded: 8px; border: 1px solid #eee; padding: 15px; }
            
            table { width: 100%; text-align: right; border-collapse: collapse; margin-bottom: 20px; }
            table th { background-color: #28a745; color: white; padding: 10px; border: 1px solid #28a745; }
            table td { padding: 8px; border: 1px solid #ddd; }
            
            .totals-container { display: flex; justify-content: flex-end; margin-top: 20px; }
            .totals-table { width: 300px; border: 2px solid #ddd; }
            .totals-table td { padding: 8px; border-bottom: 1px solid #ddd; }
            .totals-table .label { font-weight: bold; background-color: #f1f1f1; }
            .totals-table .final-total { background-color: #28a745; color: white; font-weight: bold; font-size: 1.1em; }
            
            .notes-section { margin-top: 20px; padding: 10px; border: 1px solid #eee; background-color: #fffde7; border-radius: 5px; }
            
            .footer { 
              position: fixed; 
              bottom: 0; 
              left: 0; 
              right: 0; 
              text-align: center; 
              border-top: 1px solid #ddd; 
              padding: 15px; 
              background-color: white;
              font-size: 14px;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
             <div class="header">
              <div class="company-logo">
                ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo">` : ''}
              </div>
              <div class="company-name">
                <h1>${companyInfo.name}</h1>
              </div>
              <div style="text-align: left;">
                <h2 style="margin:0; color: #333;">فاتورة مشتريات</h2>
                <span style="font-size: 14px; color: #666;">#${invoice.id}</span>
              </div>
            </div>

             <div class="invoice-details">
              <div>
                <strong>فاتورة من المورد:</strong><br>
                <span style="font-size: 1.2em;">${invoice.supplierName}</span>
                ${invoice.companyName ? `<br><span>شركة: ${invoice.companyName}</span>` : ''}
              </div>
              <div style="text-align: left;">
                <strong>التاريخ:</strong> ${invoice.date}<br>
                <strong>طريقة السداد:</strong> ${invoice.paymentMethod}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 5%; text-align: center;">#</th>
                  <th style="width: 15%; text-align: center;">كود الصنف</th>
                  <th>الصنف</th>
                  <th style="width: 10%; text-align: center;">الكمية</th>
                  <th style="width: 10%; text-align: center;">الوحدة</th>
                  <th style="width: 15%; text-align: center;">السعر</th>
                  <th style="width: 18%; text-align: center;">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                 ${invoice.items.map((item, index) => {
                  const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
                  return `
                  <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td style="text-align: center; font-family: monospace; font-size: 12px; color: #374151; font-weight: 600;">${itemCode || '-'}</td>
                    <td>
                      <div>
                        <strong>${item.productName}</strong>
                        ${item.itemType === 'expense' ? '<span style="color:red; font-size:0.8em"> (مصروف)</span>' : ''}
                      </div>
                      ${item.description ? `<div style="font-size: 12px; color: #666; margin-top: 2px;">${item.description}</div>` : ''}
                    </td>
                    <td style="text-align: center;">${item.quantity.toLocaleString('en-US')}</td>
                    <td style="text-align: center;">${item.unit || 'عدد'}</td>
                    <td style="text-align: center;">${item.price.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })} ${item.priceType === 'سعر الطن' ? '/ طن' : ''}</td>
                    <td style="text-align: center;">${item.total.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
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
            <p style="margin: 0; font-weight: bold;">${companyInfo.name}</p>
            <p style="margin: 5px 0;">${companyInfo.address}</p>
            <p style="margin: 0;">هاتف: ${companyInfo.phone}</p>
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
        <h1 className="text-3xl font-bold text-gray-800">فواتير المشتريات</h1>
        <div className="flex gap-2">

          <button
            onClick={() => {
              import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                exportToExcel(filteredInvoices, 'purchases_invoices');
              });
            }}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>إضافة فاتورة شراء</span>
          </button>
          <button
            onClick={() => {
              setEditingInvoice({ invoiceType: 'return' } as any);
              setIsModalOpen(true);
            }}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            <span>مرتجع مشتريات</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">بحث برقم الفاتورة</label>
            <input
              type="text"
              value={searchInvoiceId}
              onChange={e => setSearchInvoiceId(e.target.value)}
              placeholder="مثال: PUR-2025..."
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">المورد</label>
            <select
              value={searchSupplierId}
              onChange={e => setSearchSupplierId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">كل الموردين</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">من تاريخ</label>
            <input type="date" value={searchDateStart} onChange={e => setSearchDateStart(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">إلى تاريخ</label>
            <input type="date" value={searchDateEnd} onChange={e => setSearchDateEnd(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={resetFilters} className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg hover:bg-gray-200">إعادة تعيين</button>
            {searchSupplierId && (
              <button
                onClick={() => {
                  const supp = suppliers.find(s => s.id === searchSupplierId);
                  if (supp) {
                    setSelectedSupplierForStatement(supp);
                    setIsStatementModalOpen(true);
                  }
                }}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                كشف حساب
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide">رقم الفاتورة</th>
                <th className="p-3 text-sm font-semibold tracking-wide">المورد</th>
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
                <tr key={invoice.id} className={`hover:bg-gray-50 ${invoice.status === 'voided' ? 'bg-red-50' : ''}`}>
                  <td className="p-3 text-sm text-gray-700">{invoice.id}</td>
                  <td className="p-3 text-sm text-gray-700 font-medium">{invoice.supplierName}</td>
                  <td className="p-3 text-sm text-gray-600 font-medium">{invoice.companyName || suppliers.find(s => s.id === invoice.supplierId)?.companyName || '-'}</td>
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
                      <span className="line-through text-gray-400">{invoice.total.toLocaleString('en-US')} ج.م</span>
                    ) : (
                      `${invoice.total.toLocaleString('en-US')} ج.م`
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
                    <button onClick={() => handlePrint(invoice)} className="text-blue-500 hover:text-blue-700 font-medium">طباعة</button>
                    {invoice.status !== 'voided' && (
                      <>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => {
                              setEditingInvoice(invoice);
                              setIsModalOpen(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                            title="تعديل"
                          >
                            تعديل
                          </button>
                        )}
                        <button onClick={() => handleVoidRequest(invoice.id)} className="text-red-500 hover:text-red-700 font-medium">إلغاء</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <AddPurchaseInvoiceModal
          onClose={handleCloseModal}
          onSave={handleSaveInvoice}
          suppliers={suppliers}
          products={products}
          invoiceToEdit={editingInvoice}
          existingInvoices={invoices}
          onAddExpense={handleAddAutoExpense}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={cancelVoid}
        onConfirm={confirmVoid}
        title="تأكيد إلغاء الفاتورة"
        message="هل أنت متأكد من رغبتك في لإلغاء هذه الفاتورة؟ سيتم عكس القيد المحاسبي ولن يؤثر على الأرصدة بعد ذلك."
      />

      {isStatementModalOpen && selectedSupplierForStatement && (
        <SupplierStatementModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          supplier={selectedSupplierForStatement}
          invoices={invoices}
          payments={supplierPayments}
        />
      )}
    </div>
  );
};

export default Purchases;
