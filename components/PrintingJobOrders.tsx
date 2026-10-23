import React, { useState, useMemo } from 'react';
import type {
  PrintingJobOrder, JobOperationItem, PrintingOperationId, PrintingOperationDefinition,
  ConsolidatedVendorInvoice, ConsolidatedVendorInvoiceLine, Customer, Supplier, Account,
  JournalEntry, ModulePostingSettings, Permission, SalesInvoice, PurchaseInvoice
} from '../types.ts';
import { showNotification } from '../services/notificationService.ts';

// ==================== 18 Standard Printing Operations Catalog ====================
export const STANDARD_PRINTING_OPERATIONS: PrintingOperationDefinition[] = [
  { id: 'paper_cutting', name: 'قص ورق', category: 'prepress', icon: '✂️', defaultUnit: 'رزمة / فرخ' },
  { id: 'ctp_plates', name: 'ذنكات (CTP)', category: 'prepress', icon: '💿', defaultUnit: 'عدد زنكات' },
  { id: 'laser_die', name: 'فورمة تكسير', category: 'prepress', icon: '📐', defaultUnit: 'فورمة' },
  { id: 'printing', name: 'طباعة (سحب)', category: 'press', icon: '🖨️', defaultUnit: 'سحبة / ضربة' },
  { id: 'lamination', name: 'سلوفان (مط/لامع)', category: 'coating', icon: '✨', defaultUnit: 'فرخ / متر' },
  { id: 'spot_uv', name: 'سبوت UV', category: 'coating', icon: '💧', defaultUnit: 'فرخ' },
  { id: 'flood_uv', name: 'UV كامل (ورنيش)', category: 'coating', icon: '☀️', defaultUnit: 'فرخ' },
  { id: 'pvc_window', name: 'شباك PVC شفاف', category: 'converting', icon: '🪟', defaultUnit: 'علبة' },
  { id: 'gold_metalized', name: 'متلايز ذهبي', category: 'press', icon: '🌟', defaultUnit: 'فرخ' },
  { id: 'silver_metalized', name: 'متلايز فضي', category: 'press', icon: '🪙', defaultUnit: 'فرخ' },
  { id: 'hot_foil', name: 'بصمة (Hot Foil)', category: 'coating', icon: '🏷️', defaultUnit: 'ضربة' },
  { id: 'embossing', name: 'كوفراج (بارز/غائر)', category: 'coating', icon: '🖼️', defaultUnit: 'ضربة' },
  { id: 'die_cutting', name: 'تكسير وريجة', category: 'converting', icon: '⚙️', defaultUnit: 'فرخ' },
  { id: 'gluing', name: 'لزق وتجميع', category: 'converting', icon: '🧴', defaultUnit: 'علبة' },
  { id: 'staple_binding', name: 'دبوس (تجليد)', category: 'binding', icon: '📎', defaultUnit: 'نسخة' },
  { id: 'spiral_binding', name: 'سلك لولبي', category: 'binding', icon: '🌀', defaultUnit: 'نسخة' },
  { id: 'packaging', name: 'تغليف وشرنكة', category: 'logistics', icon: '📦', defaultUnit: 'طرد' },
  { id: 'shipping', name: 'شحن ونقل', category: 'logistics', icon: '🚚', defaultUnit: 'نقلة' },
];

export const PRINTING_TEMPLATES: { name: string; icon: string; desc: string; operations: PrintingOperationId[] }[] = [
  {
    name: 'علب كرتون وتغليف فاخر',
    icon: '📦',
    desc: 'ورق + زنكات + فورمة + طباعة + متلايز + سلوفان + سبوت UV + بصمة + كوفراج + تكسير + شباك + لزق + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'laser_die', 'printing', 'gold_metalized', 'lamination', 'spot_uv', 'hot_foil', 'embossing', 'die_cutting', 'pvc_window', 'gluing', 'packaging', 'shipping']
  },
  {
    name: 'بروشور وفلاير تجاري',
    icon: '📄',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + تكسير وريجة + تغليف + شحن',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging', 'shipping']
  },
  {
    name: 'كتالوج / مجلة / مفكرة',
    icon: '📖',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + دبوس أو سلك لولبي + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'staple_binding', 'spiral_binding', 'packaging', 'shipping']
  },
  {
    name: 'استيكر وملصقات مخصصة',
    icon: '🏷️',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + تكسير + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging']
  }
];

interface PrintingJobOrdersProps {
  jobOrders: PrintingJobOrder[];
  setJobOrders: React.Dispatch<React.SetStateAction<PrintingJobOrder[]>>;
  consolidatedInvoices: ConsolidatedVendorInvoice[];
  setConsolidatedInvoices: React.Dispatch<React.SetStateAction<ConsolidatedVendorInvoice[]>>;
  salesInvoices?: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  purchaseInvoices?: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  deleteJournalEntryByReference?: (refId: string) => void;
  journalEntries?: JournalEntry[];
  setJournalEntries?: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  customers: Customer[];
  suppliers: Supplier[];
  accounts: Account[];
  currentUser?: any;
  createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string; branchId?: string }) => string;
  logAction: (action: string) => void;
  postingSettings?: ModulePostingSettings;
  currentBranchId?: string;
  onNavigate?: (page: string) => void;
}

const PrintingJobOrders: React.FC<PrintingJobOrdersProps> = ({
  jobOrders = [],
  setJobOrders,
  consolidatedInvoices = [],
  setConsolidatedInvoices,
  salesInvoices = [],
  setSalesInvoices,
  purchaseInvoices = [],
  setPurchaseInvoices,
  deleteJournalEntryByReference,
  journalEntries = [],
  setJournalEntries,
  customers = [],
  suppliers = [],
  accounts = [],
  currentUser,
  createJournalEntry,
  logAction,
  postingSettings,
  currentBranchId = 'main',
  onNavigate
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'consolidated' | 'profitability'>('orders');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<PrintingJobOrder | null>(null);
  const [viewingJob, setViewingJob] = useState<PrintingJobOrder | null>(null);
  const [isConsolidatedModalOpen, setIsConsolidatedModalOpen] = useState(false);

  // Profitability Report Filter
  const [reportCustomerId, setReportCustomerId] = useState<string>('all');
  const [reportDateStart, setReportDateStart] = useState<string>('');
  const [reportDateEnd, setReportDateEnd] = useState<string>('');

  // Permission helper
  const hasPerm = (perm: Permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'developer') return true;
    return currentUser.permissions ? currentUser.permissions.includes(perm) : false;
  };

  // Helper: Get Accounts
  const wipAccountId = postingSettings?.mfgWipAccountId || '110402'; // WIP
  const wipAccountName = accounts.find(a => a.id === wipAccountId)?.name || 'إنتاج تحت التشغيل (مطبوعات WIP)';
  const payablesAccountId = postingSettings?.purchasePayablesAccountId || '2101'; // Suppliers
  const cogsAccountId = postingSettings?.salesCogsAccountId || '5101'; // COGS
  const cogsAccountName = accounts.find(a => a.id === cogsAccountId)?.name || 'تكلفة بضاعة مباعة (مطبوعات)';
  const revenueAccountId = postingSettings?.salesRevenueAccountId || '4101'; // Sales Revenue
  const revenueAccountName = accounts.find(a => a.id === revenueAccountId)?.name || 'إيرادات مبيعات المطبوعات';
  const receivablesAccountId = postingSettings?.salesReceivablesAccountId || '1103'; // Customers

  // ==================== KPI Calculations ====================
  const kpis = useMemo(() => {
    const totalOrders = jobOrders.length;
    const inProgress = jobOrders.filter(o => o.status === 'in_progress').length;
    const delivered = jobOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const totalRevenue = jobOrders.reduce((sum, o) => sum + (Number(o.clientSalePrice) || 0), 0);
    const totalCost = jobOrders.reduce((sum, o) => sum + (Number(o.totalActualCost) || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalOrders, inProgress, delivered, totalRevenue, totalCost, totalProfit, marginPercent };
  }, [jobOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return jobOrders.filter(order => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.productTitle.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchCustomer = customerFilter === 'all' || order.customerId === customerFilter;
      return matchQuery && matchStatus && matchCustomer;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [jobOrders, searchQuery, statusFilter, customerFilter]);

  // ==================== Order Creation & Duplicate (Feature 4) ====================
  const [formData, setFormData] = useState<{
    customerId: string;
    productTitle: string;
    productCategory: string;
    quantity: number;
    unit: string;
    clientSalePrice: number;
    deliveryDate: string;
    notes: string;
    selectedOps: PrintingOperationId[];
  }>({
    customerId: '',
    productTitle: '',
    productCategory: 'مطبوعات تجارية',
    quantity: 1000,
    unit: 'عدد',
    clientSalePrice: 0,
    deliveryDate: '',
    notes: '',
    selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'packaging']
  });

  const handleOpenCreateModal = (orderToEdit?: PrintingJobOrder) => {
    if (orderToEdit) {
      setEditingJob(orderToEdit);
      setFormData({
        customerId: orderToEdit.customerId,
        productTitle: orderToEdit.productTitle,
        productCategory: orderToEdit.productCategory || 'مطبوعات تجارية',
        quantity: orderToEdit.quantity,
        unit: orderToEdit.unit,
        clientSalePrice: orderToEdit.clientSalePrice,
        deliveryDate: orderToEdit.deliveryDate || '',
        notes: orderToEdit.notes || '',
        selectedOps: orderToEdit.operations.map(o => o.operationId)
      });
    } else {
      setEditingJob(null);
      setFormData({
        customerId: customers[0]?.id || '',
        productTitle: '',
        productCategory: 'مطبوعات تجارية',
        quantity: 1000,
        unit: 'عدد',
        clientSalePrice: 0,
        deliveryDate: '',
        notes: '',
        selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'packaging']
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleApplyTemplate = (opIds: PrintingOperationId[]) => {
    setFormData(prev => ({ ...prev, selectedOps: opIds }));
  };

  const toggleOperation = (opId: PrintingOperationId) => {
    setFormData(prev => {
      const exists = prev.selectedOps.includes(opId);
      if (exists) {
        return { ...prev, selectedOps: prev.selectedOps.filter(id => id !== opId) };
      } else {
        return { ...prev, selectedOps: [...prev.selectedOps, opId] };
      }
    });
  };

  const handleSaveJobOrder = () => {
    if (!formData.customerId) {
      showNotification('يرجى اختيار العميل أولاً', 'error');
      return;
    }
    if (!formData.productTitle) {
      showNotification('يرجى كتابة اسم أو وصف المطبوع', 'error');
      return;
    }
    if (formData.selectedOps.length === 0) {
      showNotification('يرجى تحديد عملية واحدة على الأقل لأمر الشغل', 'error');
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);

    if (editingJob) {
      // Update existing
      const updatedOrders = jobOrders.map(ord => {
        if (ord.id !== editingJob.id) return ord;

        // Keep existing operation progress if already present
        const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
          const existingOp = ord.operations.find(o => o.operationId === opId);
          if (existingOp) return existingOp;
          const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
          return {
            id: `OP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            operationId: opId,
            name: def?.name || opId,
            executionType: 'external',
            status: 'pending',
            cost: 0,
            unit: def?.defaultUnit || 'عدد'
          };
        });

        const totalCost = ops.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
        const grossProfit = Number(formData.clientSalePrice) - totalCost;
        const margin = formData.clientSalePrice > 0 ? (grossProfit / formData.clientSalePrice) * 100 : 0;

        return {
          ...ord,
          customerId: formData.customerId,
          customerName: customer?.name || ord.customerName,
          companyName: customer?.companyName || ord.companyName,
          productTitle: formData.productTitle,
          productCategory: formData.productCategory,
          quantity: Number(formData.quantity) || 1,
          unit: formData.unit,
          clientSalePrice: Number(formData.clientSalePrice) || 0,
          deliveryDate: formData.deliveryDate,
          notes: formData.notes,
          operations: ops,
          totalActualCost: totalCost,
          grossProfit,
          profitMarginPercent: margin
        };
      });

      setJobOrders(updatedOrders);
      logAction(`تحديث أمر تشغيل مطبوعات: ${editingJob.code} للعميل ${customer?.name}`);
      showNotification('تم تحديث أمر الشغل بنجاح', 'success');
    } else {
      // Create new
      const nextNum = jobOrders.length + 1;
      const orderCode = `JOB-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const newId = `JOB_${Date.now()}`;

      const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
        const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
        return {
          id: `OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          operationId: opId,
          name: def?.name || opId,
          executionType: 'external',
          status: 'pending',
          cost: 0,
          unit: def?.defaultUnit || 'عدد'
        };
      });

      const newOrder: PrintingJobOrder = {
        id: newId,
        code: orderCode,
        date: new Date().toISOString().split('T')[0],
        deliveryDate: formData.deliveryDate,
        customerId: formData.customerId,
        customerName: customer?.name || 'عميل نقدي',
        companyName: customer?.companyName,
        productTitle: formData.productTitle,
        productCategory: formData.productCategory,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit,
        clientSalePrice: Number(formData.clientSalePrice) || 0,
        operations: ops,
        currentStageIndex: 0,
        status: 'in_progress',
        totalActualCost: 0,
        grossProfit: Number(formData.clientSalePrice) || 0,
        profitMarginPercent: 100,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        branchId: currentBranchId
      };

      setJobOrders(prev => [newOrder, ...prev]);
      logAction(`إنشاء أمر تشغيل مطبوعات جديد: ${orderCode} للعميل ${customer?.name}`);
      showNotification(`تم إنشاء أمر الشغل ${orderCode} بنجاح`, 'success');
    }

    setIsCreateModalOpen(false);
  };

  // Feature 4: Duplicate Job Order
  const handleDuplicateJob = (order: PrintingJobOrder) => {
    const nextNum = jobOrders.length + 1;
    const newCode = `JOB-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const newId = `JOB_${Date.now()}`;

    // Reset status and cost journal IDs, keeping vendors and operational setup
    const duplicatedOps: JobOperationItem[] = order.operations.map(op => ({
      ...op,
      id: `OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'pending',
      journalEntryId: undefined,
      completedAt: undefined
    }));

    const totalCost = duplicatedOps.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
    const grossProfit = order.clientSalePrice - totalCost;
    const margin = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    const duplicatedOrder: PrintingJobOrder = {
      ...order,
      id: newId,
      code: newCode,
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      currentStageIndex: 0,
      operations: duplicatedOps,
      totalActualCost: totalCost,
      grossProfit,
      profitMarginPercent: margin,
      salesInvoiceId: undefined,
      cogsJournalEntryId: undefined,
      createdAt: new Date().toISOString()
    };

    setJobOrders(prev => [duplicatedOrder, ...prev]);
    logAction(`تكرار أمر تشغيل مطبوعات: تم نسخ ${order.code} إلى ${newCode}`);
    showNotification(`تم تكرار الطلبية بنجاح برقم جديد: ${newCode}`, 'success');
  };

  // ==================== Stage Execution & Accounting ====================
  const handleExecuteStage = (orderId: string, opIndex: number, updatedFields: Partial<JobOperationItem>) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;

    const op = order.operations[opIndex];
    if (!op) return;

    const isExternal = (updatedFields.executionType || op.executionType) === 'external';
    const cost = Number(updatedFields.cost ?? op.cost) || 0;
    const supplierId = updatedFields.supplierId || op.supplierId;
    const supplier = suppliers.find(s => s.id === supplierId);

    if (isExternal && !supplierId) {
      showNotification('يرجى اختيار المورد المسؤول عن هذه المرحلة أولاً', 'error');
      return;
    }

    let jeId: string | undefined = op.journalEntryId;
    let pInvId: string | undefined = op.purchaseInvoiceId;

    // 1. Generate real Purchase Invoice for supplier if external and not yet created
    if (isExternal && cost > 0 && !pInvId) {
      const pinvCount = (purchaseInvoices?.length || 0) + 1;
      const todayStr = new Date().toISOString().split('T')[0];
      const yearStr = todayStr.split('-')[0];
      pInvId = `PINV-${yearStr}-${String(pinvCount).padStart(4, '0')}`;
      const supplierName = supplier?.name || supplier?.companyName || 'مورد تشغيل لدى الغير';

      const newPurchaseInvoice: PurchaseInvoice = {
        id: pInvId,
        supplierId: supplierId!,
        supplierName,
        companyName: supplier?.companyName,
        date: todayStr,
        items: [
          {
            productId: `SRV-${op.operationId}`,
            productName: `${op.name} (أمر شغل ${order.code} - ${order.customerName})`,
            quantity: 1,
            price: cost,
            total: cost,
            unit: (op.unit as any) || 'عدد',
            itemType: 'expense',
            cost: cost
          }
        ],
        subTotal: cost,
        total: cost,
        paymentMethod: op.paymentMethod || 'اجل',
        invoiceType: 'purchase',
        notes: `مصنعية/توريد ${op.name} عن أمر شغل ${order.code} للعميل ${order.customerName}${op.notes ? ` - ${op.notes}` : ''}`,
        status: 'active',
        branchId: currentBranchId
      };

      if (setPurchaseInvoices) {
        setPurchaseInvoices(prev => [newPurchaseInvoice, ...prev]);
      }
    }

    // 2. Generate Journal Entry if external and not already posted
    if (isExternal && cost > 0 && !jeId) {
      const supplierName = supplier?.name || supplier?.companyName || 'مورد تشغيل لدى الغير';
      const entryDesc = `فاتورة مشتريات ${pInvId || ''} - تكلفة تشغيل لدى الغير (${op.name}) - أمر شغل ${order.code} - مورد: ${supplierName}`;

      jeId = createJournalEntry({
        description: entryDesc,
        date: new Date().toISOString().split('T')[0],
        referenceType: 'PurchaseInvoice',
        referenceId: pInvId || order.code,
        branchId: currentBranchId,
        lines: [
          {
            accountId: wipAccountId,
            accountName: `${wipAccountName} (${order.code})`,
            debit: cost,
            credit: 0
          },
          {
            accountId: payablesAccountId,
            accountName: `الموردين - ${supplierName}`,
            debit: 0,
            credit: cost
          }
        ]
      });

      logAction(`ترحيل قيد مرحلة (${op.name}) وفاتورة مشتريات ${pInvId} بأمر شغل ${order.code} لحساب المورد ${supplierName} بقيمة ${cost} ج.م`);
    }

    // Update operation item
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      ...updatedFields,
      supplierName: supplier?.name || supplier?.companyName || op.supplierName,
      status: 'completed',
      journalEntryId: jeId,
      purchaseInvoiceId: pInvId,
      completedAt: new Date().toISOString()
    };

    // Recalculate totals
    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    // Advance stage index if all prior are completed
    let nextStageIndex = order.currentStageIndex;
    if (opIndex === order.currentStageIndex) {
      nextStageIndex = Math.min(order.operations.length - 1, opIndex + 1);
    }

    const updatedOrder: PrintingJobOrder = {
      ...order,
      operations: newOps,
      currentStageIndex: nextStageIndex,
      totalActualCost,
      grossProfit,
      profitMarginPercent
    };

    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    showNotification(`تم اعتماد مرحلة (${op.name}) وتسجيل فاتورة المورد في المشتريات والحسابات بنجاح ✅`, 'success');
  };

  // Undo / Reset an approved stage (تراجع عن اعتماد مرحلة لتعديل التكلفة أو المورد)
  const handleUndoStage = (orderId: string, opIndex: number) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;
    const op = order.operations[opIndex];
    if (!op || op.status !== 'completed') return;

    if (!window.confirm(`هل أنت متأكد من إلغاء اعتماد مرحلة (${op.name})؟ سيتم حذف فاتورة المورد وقيدها المحاسبي لإتاحة تعديلها من جديد.`)) {
      return;
    }

    // 1. Remove linked purchase invoice from state
    if (op.purchaseInvoiceId && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => p.id !== op.purchaseInvoiceId));
    }

    // 2. Delete journal entry by reference and ID
    if (deleteJournalEntryByReference) {
      if (op.purchaseInvoiceId) deleteJournalEntryByReference(op.purchaseInvoiceId);
      if (op.journalEntryId) deleteJournalEntryByReference(op.journalEntryId);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        e.id !== op.journalEntryId && 
        e.referenceId !== op.purchaseInvoiceId && 
        e.referenceId !== op.journalEntryId
      ));
    }

    // 3. Reset operation state to pending
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      status: 'pending',
      journalEntryId: undefined,
      purchaseInvoiceId: undefined,
      completedAt: undefined
    };

    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    const updatedOrder: PrintingJobOrder = {
      ...order,
      operations: newOps,
      totalActualCost,
      grossProfit,
      profitMarginPercent
    };

    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    logAction(`إلغاء اعتماد مرحلة (${op.name}) بأمر شغل ${order.code} وحذف فاتورة المورد وقيدها`);
    showNotification(`تم إلغاء اعتماد المرحلة وإلغاء استحقاق المورد، يمكنك الآن تعديلها وإعادة الاعتماد ✅`, 'success');
  };

  // Delete Job Order completely (حذف أمر الشغل بالكامل وتنظيف القيود والفواتير المرتبطة)
  const handleDeleteJobOrder = (orderId: string) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;

    if (!window.confirm(`هل أنت متأكد تماماً من حذف أمر الشغل رقم (${order.code})؟ سيتم إلغاء فواتير الموردين وفاتورة البيع والقيود المرتبطة به نهائياً.`)) {
      return;
    }

    // 1. Remove all linked purchase invoices
    const pInvIds = order.operations.map(o => o.purchaseInvoiceId).filter(Boolean) as string[];
    if (pInvIds.length > 0 && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => !pInvIds.includes(p.id)));
    }

    // 2. Remove linked sales invoice if any
    if (order.salesInvoiceId && setSalesInvoices) {
      setSalesInvoices(prev => prev.filter(inv => inv.id !== order.salesInvoiceId));
    }

    // 3. Delete journal entries by reference & ID
    const jeIds = order.operations.map(o => o.journalEntryId).filter(Boolean) as string[];
    if (order.cogsJournalEntryId) jeIds.push(order.cogsJournalEntryId);

    if (deleteJournalEntryByReference) {
      deleteJournalEntryByReference(order.code);
      pInvIds.forEach(id => deleteJournalEntryByReference(id));
      if (order.salesInvoiceId) deleteJournalEntryByReference(order.salesInvoiceId);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        !jeIds.includes(e.id) &&
        e.referenceId !== order.code &&
        !pInvIds.includes(e.referenceId || '') &&
        e.referenceId !== order.salesInvoiceId
      ));
    }

    // 4. Remove from state
    setJobOrders(prev => prev.filter(o => o.id !== orderId));
    if (viewingJob?.id === orderId) setViewingJob(null);

    logAction(`حذف أمر تشغيل المطبوعات بالكامل: ${order.code}`);
    showNotification(`تم حذف أمر الشغل (${order.code}) وتنظيف كافة الحركات المرتبطة به بنجاح 🗑️`, 'success');
  };

  // Final Delivery & Revenue Recognition (Creates real Sales Invoice in Sales Module)
  const handleDeliverJobOrder = (order: PrintingJobOrder) => {
    if (order.status === 'delivered') return;

    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer?.name || order.customerName;
    const todayStr = new Date().toISOString().split('T')[0];
    const yearStr = todayStr.split('-')[0];

    // Generate Sales Invoice ID
    const invCount = (salesInvoices?.length || 0) + 1;
    const invId = `INV-${yearStr}-${String(invCount).padStart(4, '0')}`;

    // 1. Calculate Unit Price
    const unitPrice = order.quantity > 0 ? (order.clientSalePrice / order.quantity) : order.clientSalePrice;

    // 2. Create the real Sales Invoice object
    const newInvoice: SalesInvoice = {
      id: invId,
      customerId: order.customerId,
      customerName: customerName,
      companyName: customer?.companyName || order.companyName,
      date: todayStr,
      items: [
        {
          productId: `PRNT-${order.code}`,
          productName: order.productTitle,
          quantity: order.quantity,
          price: unitPrice,
          total: order.clientSalePrice,
          unit: (order.unit as any) || 'عدد',
          itemType: 'expense', // Marked as custom service/expense item so it does not fail physical raw stock lookup
          cost: order.totalActualCost
        }
      ],
      subTotal: order.clientSalePrice,
      total: order.clientSalePrice,
      paymentMethod: 'اجل',
      invoiceType: 'sale',
      notes: `فاتورة مبيعات مسندة عن أمر تشغيل مطبوعات رقم ${order.code}${order.notes ? ` - ${order.notes}` : ''}`,
      status: 'active',
      branchId: currentBranchId
    };

    if (setSalesInvoices) {
      setSalesInvoices(prev => [newInvoice, ...prev]);
    }

    // 3. Revenue Entry: Debit Customer, Credit Printing Revenue
    const revenueEntryId = createJournalEntry({
      description: `فاتورة مبيعات ${invId} - تسليم أمر شغل مطبوعات ${order.code} - العميل: ${customerName}`,
      date: todayStr,
      referenceType: 'SalesInvoice',
      referenceId: invId,
      branchId: currentBranchId,
      lines: [
        {
          accountId: receivablesAccountId,
          accountName: `العملاء - ${customerName}`,
          debit: order.clientSalePrice,
          credit: 0
        },
        {
          accountId: revenueAccountId,
          accountName: revenueAccountName,
          debit: 0,
          credit: order.clientSalePrice
        }
      ]
    });

    // 4. COGS Entry: Debit COGS (Printing), Credit WIP (Printing Job)
    let cogsEntryId: string | undefined = undefined;
    if (order.totalActualCost > 0) {
      cogsEntryId = createJournalEntry({
        description: `إقفال تكلفة أوامر تشغيل مطبوعات (COGS) - أمر شغل ${order.code} - فاتورة ${invId}`,
        date: todayStr,
        referenceType: 'SalesInvoice',
        referenceId: invId,
        branchId: currentBranchId,
        lines: [
          {
            accountId: cogsAccountId,
            accountName: cogsAccountName,
            debit: order.totalActualCost,
            credit: 0
          },
          {
            accountId: wipAccountId,
            accountName: wipAccountName,
            debit: 0,
            credit: order.totalActualCost
          }
        ]
      });
    }

    const updatedOrder: PrintingJobOrder = {
      ...order,
      status: 'delivered',
      salesInvoiceId: invId,
      cogsJournalEntryId: cogsEntryId
    };

    setJobOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    if (viewingJob?.id === order.id) setViewingJob(updatedOrder);

    logAction(`تسليم أمر شغل المطبوعات ${order.code} وإصدار فاتورة بيع ${invId} للعميل ${customerName}`);
    showNotification(`تم إنشاء فاتورة المبيعات (${invId}) في قسم المبيعات وتسليم الطلبية بنجاح 📦`, 'success');
  };

  // ==================== Feature 5: Consolidated Vendor Invoices ====================
  const [consForm, setConsForm] = useState<{
    supplierId: string;
    invoiceNumber: string;
    date: string;
    paymentMethod: 'نقدي' | 'اجل';
    notes: string;
    lines: {
      jobOrderId: string;
      operationId: PrintingOperationId;
      amount: number;
      notes: string;
    }[];
  }>({
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'اجل',
    notes: '',
    lines: [{ jobOrderId: '', operationId: 'printing', amount: 0, notes: '' }]
  });

  const handleAddConsolidatedLine = () => {
    setConsForm(prev => ({
      ...prev,
      lines: [...prev.lines, { jobOrderId: '', operationId: 'printing', amount: 0, notes: '' }]
    }));
  };

  const handleRemoveConsolidatedLine = (idx: number) => {
    setConsForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveConsolidatedInvoice = () => {
    if (!consForm.supplierId) {
      showNotification('يرجى اختيار المورد أولاً', 'error');
      return;
    }
    if (consForm.lines.some(l => !l.jobOrderId || l.amount <= 0)) {
      showNotification('يرجى تحديد أمر الشغل والمبلغ لجميع بنود الفاتورة', 'error');
      return;
    }

    const supplier = suppliers.find(s => s.id === consForm.supplierId);
    const supplierName = supplier?.name || supplier?.companyName || 'مورد مجمع';
    const totalAmount = consForm.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    const formattedLines: ConsolidatedVendorInvoiceLine[] = consForm.lines.map(line => {
      const order = jobOrders.find(o => o.id === line.jobOrderId);
      const opDef = STANDARD_PRINTING_OPERATIONS.find(d => d.id === line.operationId);
      return {
        id: `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        jobOrderId: line.jobOrderId,
        jobOrderCode: order?.code || 'طلب غير معروف',
        customerName: order?.customerName || '',
        operationId: line.operationId,
        operationName: opDef?.name || line.operationId,
        amount: Number(line.amount) || 0,
        notes: line.notes
      };
    });

    // Generate real Purchase Invoice for supplier
    const pinvCount = (purchaseInvoices?.length || 0) + 1;
    const yearStr = consForm.date.split('-')[0] || new Date().getFullYear().toString();
    const pInvId = consForm.invoiceNumber ? `PINV-${consForm.invoiceNumber}` : `PINV-${yearStr}-${String(pinvCount).padStart(4, '0')}`;

    const newPurchaseInvoice: PurchaseInvoice = {
      id: pInvId,
      supplierId: consForm.supplierId,
      supplierName,
      companyName: supplier?.companyName,
      date: consForm.date,
      items: formattedLines.map(line => ({
        productId: `SRV-${line.operationId}`,
        productName: `${line.operationName} (أمر شغل ${line.jobOrderCode} - ${line.customerName})`,
        quantity: 1,
        price: line.amount,
        total: line.amount,
        unit: 'عدد',
        itemType: 'expense',
        cost: line.amount
      })),
      subTotal: totalAmount,
      total: totalAmount,
      paymentMethod: consForm.paymentMethod,
      invoiceType: 'purchase',
      notes: `فاتورة مورد مجمعة رقم ${consForm.invoiceNumber || ''} موزعة على ${formattedLines.length} طلبيات${consForm.notes ? ` - ${consForm.notes}` : ''}`,
      status: 'active',
      branchId: currentBranchId
    };

    if (setPurchaseInvoices) {
      setPurchaseInvoices(prev => [newPurchaseInvoice, ...prev]);
    }

    // Create single Journal Entry: Credit Supplier, Debit WIP split per job
    const jeLines = [
      {
        accountId: payablesAccountId,
        accountName: `الموردين - ${supplierName}`,
        debit: 0,
        credit: totalAmount
      },
      ...formattedLines.map(line => ({
        accountId: wipAccountId,
        accountName: `${wipAccountName} (${line.jobOrderCode} - ${line.operationName})`,
        debit: line.amount,
        credit: 0
      }))
    ];

    const jeId = createJournalEntry({
      description: `فاتورة مشتريات ${pInvId} - فاتورة مجمعة لمورد (${supplierName}) رقم ${consForm.invoiceNumber || 'بدون'} عن ${formattedLines.length} طلبيات`,
      date: consForm.date,
      referenceType: 'PurchaseInvoice',
      referenceId: pInvId,
      branchId: currentBranchId,
      lines: jeLines
    });

    // Update costs on the respective Job Orders
    setJobOrders(prevOrders => {
      return prevOrders.map(order => {
        const matchingLines = formattedLines.filter(l => l.jobOrderId === order.id);
        if (matchingLines.length === 0) return order;

        const updatedOps = [...order.operations];
        matchingLines.forEach(line => {
          const opIndex = updatedOps.findIndex(o => o.operationId === line.operationId);
          if (opIndex >= 0) {
            updatedOps[opIndex] = {
              ...updatedOps[opIndex],
              supplierId: consForm.supplierId,
              supplierName,
              cost: Number(updatedOps[opIndex].cost || 0) + line.amount,
              status: 'completed',
              journalEntryId: jeId,
              purchaseInvoiceId: pInvId,
              completedAt: new Date().toISOString()
            };
          }
        });

        const totalCost = updatedOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
        const grossProfit = order.clientSalePrice - totalCost;
        const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

        return {
          ...order,
          operations: updatedOps,
          totalActualCost: totalCost,
          grossProfit,
          profitMarginPercent
        };
      });
    });

    const newConsInvoice: ConsolidatedVendorInvoice = {
      id: `CONS_${Date.now()}`,
      invoiceNumber: consForm.invoiceNumber || `INV-${Date.now()}`,
      date: consForm.date,
      supplierId: consForm.supplierId,
      supplierName,
      totalAmount,
      paymentMethod: consForm.paymentMethod,
      lines: formattedLines,
      journalEntryId: jeId,
      purchaseInvoiceId: pInvId,
      createdAt: new Date().toISOString(),
      notes: consForm.notes
    };

    setConsolidatedInvoices(prev => [newConsInvoice, ...prev]);
    logAction(`تسجيل فاتورة مجمعة للمورد ${supplierName} بقيمة ${totalAmount} ج.م لـ ${formattedLines.length} طلبيات`);
    showNotification('تم تسجيل الفاتورة المجمعة وترحيل القيود وتحديث الطلبيات بنجاح ✅', 'success');
    setIsConsolidatedModalOpen(false);
  };

  const handleDeleteConsolidatedInvoice = (consId: string) => {
    const cons = consolidatedInvoices.find(c => c.id === consId);
    if (!cons) return;
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة المجمعة للمورد (${cons.supplierName})؟ سيتم إلغاء فاتورة المشتريات والقيود المرتبطة بها.`)) return;

    if (cons.purchaseInvoiceId && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => p.id !== cons.purchaseInvoiceId));
    }
    if (deleteJournalEntryByReference) {
      if (cons.purchaseInvoiceId) deleteJournalEntryByReference(cons.purchaseInvoiceId);
      if (cons.journalEntryId) deleteJournalEntryByReference(cons.journalEntryId);
      if (cons.invoiceNumber) deleteJournalEntryByReference(cons.invoiceNumber);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        e.id !== cons.journalEntryId && 
        e.referenceId !== cons.purchaseInvoiceId && 
        e.referenceId !== cons.invoiceNumber
      ));
    }
    setConsolidatedInvoices(prev => prev.filter(c => c.id !== consId));
    logAction(`حذف فاتورة مورد مجمعة: ${cons.supplierName} بقيمة ${cons.totalAmount}`);
    showNotification(`تم حذف الفاتورة المجمعة وإلغاء الاستحقاق بنجاح ✅`, 'success');
  };

  // ==================== Feature 6: Customer Profitability Analysis ====================
  const customerProfitabilityData = useMemo(() => {
    const list = reportCustomerId === 'all'
      ? customers
      : customers.filter(c => c.id === reportCustomerId);

    return list.map(customer => {
      const orders = jobOrders.filter(o => {
        const matchCust = o.customerId === customer.id;
        const matchStart = !reportDateStart || o.date >= reportDateStart;
        const matchEnd = !reportDateEnd || o.date <= reportDateEnd;
        return matchCust && matchStart && matchEnd;
      });

      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.clientSalePrice) || 0), 0);
      const totalCost = orders.reduce((sum, o) => sum + (Number(o.totalActualCost) || 0), 0);
      const netProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        customer,
        orderCount: orders.length,
        totalRevenue,
        totalCost,
        netProfit,
        margin,
        orders
      };
    }).filter(d => d.orderCount > 0 || reportCustomerId !== 'all')
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [customers, jobOrders, reportCustomerId, reportDateStart, reportDateEnd]);

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      {/* ==================== Top Header & Action Bar ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">🖨️</span>
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">أوامر تشغيل المطبوعات والتوريدات</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                إدارة ملفات تشغيل المطبوعات الورقية بالـ 18 مرحلة (تصنيع لدى الغير / داخلي) والربحية الحية
              </p>
            </div>
          </div>
        </div>

        {/* Top Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasPerm('create_printing_job') && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm text-sm transition-all"
            >
              <span>➕</span>
              <span>أمر شغل مطبوعات جديد</span>
            </button>
          )}

          <button
            onClick={() => setIsConsolidatedModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-2 shadow-sm text-sm transition-all"
            title="تسجيل فاتورة مورد مجمعة تضم أكثر من أمر شغل (الميزة 5)"
          >
            <span>🧾</span>
            <span>فاتورة مورد مجمعة</span>
          </button>
        </div>
      </div>

      {/* ==================== Navigation Tabs ==================== */}
      <div className="flex border-b border-gray-200 gap-4 bg-white px-4 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📋</span>
          <span>أوامر الشغل ({jobOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consolidated')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'consolidated'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🧾</span>
          <span>فواتير الموردين المجمعة ({consolidatedInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profitability')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'profitability'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📊</span>
          <span>تقرير أرباح العميل الحقيقية</span>
        </button>
      </div>

      {/* ==================== TAB 1: JOB ORDERS ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-indigo-700">إجمالي الأوامر</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">{kpis.totalOrders} أمر</div>
              <span className="text-xs text-indigo-600 font-medium">({kpis.inProgress} قيد التنفيذ)</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-emerald-700">إجمالي مبيعات المطبوعات</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {kpis.totalRevenue.toLocaleString('en-US')} ج.م
              </div>
              <span className="text-xs text-emerald-600 font-medium">قيمة الفواتير المسندة</span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-amber-700">إجمالي تكاليف التشغيل (الورش والمطابع)</span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {kpis.totalCost.toLocaleString('en-US')} ج.م
              </div>
              <span className="text-xs text-amber-600 font-medium">تكاليف منفذة لدى الغير/داخلي</span>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-purple-700">صافي أرباح المطبوعات</span>
              <div className="text-2xl font-black text-purple-900 mt-1">
                {kpis.totalProfit.toLocaleString('en-US')} ج.م
              </div>
              <span className={`text-xs font-bold ${kpis.marginPercent >= 25 ? 'text-green-600' : 'text-orange-600'}`}>
                هامش الربح: {kpis.marginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ابحث برقم الأمر، اسم العميل، أو اسم المطبوع..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كل الحالات</option>
                <option value="in_progress">قيد التشغيل ⏳</option>
                <option value="completed">مكتمل التشغيل ✅</option>
                <option value="delivered">تم التسليم للعميل 📦</option>
                <option value="draft">مسودة</option>
              </select>

              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
              >
                <option value="all">كل العملاء</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3.5 text-xs font-bold text-gray-600">كود الأمر</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">العميل</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">المطبوع والكمية</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">سعر البيع</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">التكلفة الفعلية</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">صافي الربح (%)</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">مراحل التشغيل</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">الحالة</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOrders.map(order => {
                    const completedOps = order.operations.filter(o => o.status === 'completed').length;
                    const totalOps = order.operations.length;
                    const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

                    return (
                      <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-700">
                          {order.code}
                          <div className="text-[10px] text-gray-400 font-sans">{order.date}</div>
                        </td>

                        <td className="p-3.5 font-bold text-gray-800">
                          {order.customerName}
                          {order.companyName && (
                            <div className="text-xs text-gray-500 font-normal">{order.companyName}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-gray-800">{order.productTitle}</span>
                          <div className="text-xs text-gray-500">
                            {order.quantity.toLocaleString('en-US')} {order.unit}
                          </div>
                        </td>

                        <td className="p-3.5 font-bold text-gray-800">
                          {order.clientSalePrice.toLocaleString('en-US')} ج.م
                        </td>

                        <td className="p-3.5 font-semibold text-amber-700">
                          {order.totalActualCost.toLocaleString('en-US')} ج.م
                        </td>

                        <td className="p-3.5">
                          <div className={`font-bold ${order.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {order.grossProfit.toLocaleString('en-US')} ج.م
                          </div>
                          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                            order.profitMarginPercent >= 25 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.profitMarginPercent.toFixed(1)}%
                          </span>
                        </td>

                        {/* Progress Stepper Bar */}
                        <td className="p-3.5 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                            <span>{completedOps} من {totalOps} مراحل</span>
                            <span>{progressPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* Status Badge & Invoice Link */}
                        <td className="p-3.5">
                          {order.status === 'delivered' ? (
                            <div className="flex flex-col gap-1">
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                                <span>📦</span> تم التسليم
                              </span>
                              {order.salesInvoiceId && (
                                <button
                                  onClick={() => onNavigate && onNavigate('sales')}
                                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                                  title="فتح شاشة فواتير المبيعات"
                                >
                                  <span>🧾</span> {order.salesInvoiceId}
                                </button>
                              )}
                            </div>
                          ) : order.status === 'completed' ? (
                            <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                              <span>✅</span> مكتمل
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                              <span>⏳</span> قيد التشغيل
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center space-x-1.5 space-x-reverse">
                          <button
                            onClick={() => setViewingJob(order)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            title="فتح ملف أمر الشغل والتشغيل"
                          >
                            👁️ ملف الشغل
                          </button>

                          {hasPerm('duplicate_printing_job') && (
                            <button
                              onClick={() => handleDuplicateJob(order)}
                              className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                              title="تكرار الطلبية بضغطة زر (الميزة 4)"
                            >
                              🔄 تكرار
                            </button>
                          )}

                          {order.status !== 'delivered' && (
                            <button
                              onClick={() => handleOpenCreateModal(order)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                              title="تعديل أمر الشغل والكمية والأسعار"
                            >
                              ✏️ تعديل
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteJobOrder(order.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                            title="حذف أمر الشغل بالكامل وتنظيف القيود والفواتير المرتبطة"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 font-medium">
                        لا توجد أوامر تشغيل مطبوعات تطابق البحث. يمكنك إنشاء أمر شغل جديد الآن!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CONSOLIDATED INVOICES (FEATURE 5) ==================== */}
      {activeTab === 'consolidated' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">💡 الفواتير المجمعة للموردين (Feature 5)</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                تتيح لك إثبات فاتورة واحدة من المطبعة أو تاجر الورق تضم مصنعيات عدة طلبيات لعملاء مختلفين وتوزيع التكلفة تلقائياً على كل أمر شغل.
              </p>
            </div>
            <button
              onClick={() => setIsConsolidatedModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>➕</span>
              <span>تسجيل فاتورة مجمعة جديدة</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3.5 text-xs font-bold text-gray-600">رقم الفاتورة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">التاريخ</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">المورد</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">عدد الطلبيات المغطاة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">إجمالي الفاتورة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">طريقة السداد</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">تفاصيل البنود</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consolidatedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="p-3.5 font-mono font-bold text-gray-800">{inv.invoiceNumber}</td>
                    <td className="p-3.5 text-gray-600">{inv.date}</td>
                    <td className="p-3.5 font-bold text-emerald-800">{inv.supplierName}</td>
                    <td className="p-3.5 font-semibold text-gray-700">{inv.lines.length} طلبية</td>
                    <td className="p-3.5 font-black text-emerald-700">
                      {inv.totalAmount.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="p-3.5">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {inv.lines.map((l, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs">
                            {l.jobOrderCode} ({l.operationName}): {l.amount.toLocaleString('en-US')} ج.م
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteConsolidatedInvoice(inv.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        title="حذف الفاتورة المجمعة وإلغاء الاستحقاق"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}

                {consolidatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                      لا توجد فواتير موردين مجمعة مسجلة حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CUSTOMER NET PROFITABILITY (FEATURE 6) ==================== */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اختر العميل</label>
              <select
                value={reportCustomerId}
                onChange={e => setReportCustomerId(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm min-w-[200px]"
              >
                <option value="all">كافة العملاء</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={reportDateStart}
                onChange={e => setReportDateStart(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={reportDateEnd}
                onChange={e => setReportDateEnd(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <button
              onClick={() => {
                setReportCustomerId('all');
                setReportDateStart('');
                setReportDateEnd('');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm"
            >
              إعادة تعيين
            </button>
          </div>

          {/* Profitability Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-indigo-50/60 border-b border-indigo-100">
                <tr>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">العميل</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">عدد الطلبيات</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">إجمالي المبيعات</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">تكلفة الورش والمطابع</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">صافي ربح الشركة</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">نسبة الربحية</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">تفاصيل الطلبيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerProfitabilityData.map(({ customer, orderCount, totalRevenue, totalCost, netProfit, margin, orders }) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="p-3.5 font-bold text-gray-900">
                      {customer.name}
                      {customer.companyName && (
                        <div className="text-xs text-gray-500 font-normal">{customer.companyName}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-semibold text-gray-700">{orderCount} طلبية</td>
                    <td className="p-3.5 font-bold text-gray-900">{totalRevenue.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3.5 font-semibold text-amber-700">{totalCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3.5 font-black text-green-700 text-base">
                      {netProfit.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="p-3.5">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                        margin >= 30 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs text-gray-600 space-y-1">
                        {orders.slice(0, 3).map(o => (
                          <div key={o.id} className="truncate max-w-[240px]">
                            • <span className="font-bold">{o.code}</span> ({o.productTitle}): ربح {o.grossProfit.toLocaleString('en-US')} ج.م
                          </div>
                        ))}
                        {orders.length > 3 && (
                          <div className="text-[11px] text-indigo-600 font-bold">
                            + {orders.length - 3} طلبيات أخرى
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {customerProfitabilityData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                      لا توجد بيانات لربحية العملاء في الفترة المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT JOB ORDER ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 my-8">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">
                  {editingJob ? `تعديل أمر شغل: ${editingJob.code}` : 'إنشاء أمر شغل مطبوعات ورقية جديد'}
                </h2>
                <p className="text-xs text-indigo-100 mt-0.5">تحديد مواصفات الطلبية والعمليات الفنية المطلوبة</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white hover:text-indigo-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Customer & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">العميل *</label>
                  <select
                    value={formData.customerId}
                    onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تصنيف المطبوع</label>
                  <select
                    value={formData.productCategory}
                    onChange={e => setFormData(prev => ({ ...prev, productCategory: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="علب وتغليف كرتون">علب وتغليف كرتون فاخر</option>
                    <option value="مطبوعات تجارية">بروشور / فلاير / مطبوعات تجارية</option>
                    <option value="كتالوج ومجلات">كتالوج / مجلة / مفكرة</option>
                    <option value="استيكر وملصقات">استيكر وملصقات</option>
                    <option value="كروت شخصية">كروت ودعوات فاخرة</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Title, Quantity, Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">اسم / وصف المطبوع *</label>
                  <input
                    type="text"
                    placeholder="مثال: علبة عطر 50 مل كوشيه 350 جم سلوفان مط وبصمة ذهبي"
                    value={formData.productTitle}
                    onChange={e => setFormData(prev => ({ ...prev, productTitle: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الكمية المطلوبة *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-bold"
                    />
                    <select
                      value={formData.unit}
                      onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="p-2.5 border border-gray-300 rounded-xl text-sm"
                    >
                      <option value="عدد">عدد</option>
                      <option value="علبة">علبة</option>
                      <option value="ألف">ألف</option>
                      <option value="كرتونة">كرتونة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Sale Price & Delivery Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">سعر البيع المتفق عليه للعميل (ج.م) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.clientSalePrice}
                    onChange={e => setFormData(prev => ({ ...prev, clientSalePrice: Number(e.target.value) || 0 }))}
                    className="w-full p-2.5 border border-indigo-300 bg-indigo-50/40 rounded-xl text-sm font-black text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">موعد التسليم المتوقع</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="border-t border-gray-100 pt-4">
                <span className="text-xs font-bold text-gray-700 block mb-2">⚡ قوالب جاهزة سريعة لملء العمليات:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRINTING_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.operations)}
                      className="p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl text-right text-xs transition-all"
                    >
                      <div className="font-bold text-gray-800">{tmpl.icon} {tmpl.name}</div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{tmpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operations Checklist (18 Operations) */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700">
                    حدد العمليات المطلوبة لهذه الطلبية ({formData.selectedOps.length} محددة):
                  </span>
                  <div className="text-[11px] text-indigo-600 font-bold">
                    اضغط لتفعيل أو إلغاء أي مرحلة
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STANDARD_PRINTING_OPERATIONS.map(op => {
                    const isSelected = formData.selectedOps.includes(op.id);
                    return (
                      <div
                        key={op.id}
                        onClick={() => toggleOperation(op.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer select-none flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{op.icon}</span>
                          <span>{op.name}</span>
                        </span>
                        <span>{isSelected ? '✓' : '+'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات فنية إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي تفاصيل تخص الألوان، الجراماج، أو متطلبات العميل الخاصة..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveJobOrder}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 shadow-sm transition-all"
              >
                {editingJob ? 'حفظ التعديلات' : 'إنشاء أمر الشغل والبدء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL / DRAWER: INTERACTIVE JOB DOSSIER ==================== */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 my-6 flex flex-col max-h-[90vh]">
            {/* Dossier Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 p-5 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-black text-amber-400">{viewingJob.code}</span>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {viewingJob.status === 'delivered' ? 'تم التسليم والفوترة' : 'قيد التشغيل'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-1">
                  العميل: {viewingJob.customerName} {viewingJob.companyName ? `(${viewingJob.companyName})` : ''} | المطبوع: {viewingJob.productTitle} ({viewingJob.quantity.toLocaleString('en-US')} {viewingJob.unit})
                </div>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="text-gray-300 hover:text-white text-3xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Live Profitability Banner (المعادلة الفورية للربحية) */}
            <div className="bg-gray-100 p-4 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">سعر بيع العميل</span>
                <div className="text-lg font-black text-indigo-700">
                  {viewingJob.clientSalePrice.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">التكلفة الفعلية المعتمدة</span>
                <div className="text-lg font-black text-amber-700">
                  {viewingJob.totalActualCost.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">صافي الربح الفوري</span>
                <div className={`text-lg font-black ${viewingJob.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {viewingJob.grossProfit.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">هامش الربح</span>
                <div className={`text-lg font-black ${viewingJob.profitMarginPercent >= 25 ? 'text-green-700' : 'text-orange-600'}`}>
                  {viewingJob.profitMarginPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Stages / Operations List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-black text-gray-800">
                  مراحل وخط سير التشغيل ({viewingJob.operations.length} مرحلة):
                </h3>
                <span className="text-xs text-gray-500">
                  اضغط "اعتماد وترحيل القيد" لتسجيل استحقاق كل مورد فور إتمام مرحلته
                </span>
              </div>

              {viewingJob.operations.map((op, idx) => {
                const isCompleted = op.status === 'completed';

                return (
                  <div
                    key={op.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-gray-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Operation Name & Mode */}
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">{op.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              op.executionType === 'internal'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {op.executionType === 'internal' ? '🏢 تصنيع داخلي' : '🚚 لدى الغير'}
                            </span>
                          </div>

                          <span className="text-xs text-gray-500">
                            {isCompleted
                              ? `مكتملة ومرحّلة بنجاح ${op.completedAt ? `(${new Date(op.completedAt).toLocaleDateString('ar-EG')})` : ''}`
                              : 'في انتظار الاعتماد'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Supplier, Cost & Action */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle Internal / External if not completed */}
                        {!isCompleted && (
                          <select
                            value={op.executionType}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].executionType = e.target.value as any;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs"
                          >
                            <option value="external">🚚 لدى الغير</option>
                            <option value="internal">🏢 داخلي</option>
                          </select>
                        )}

                        {/* Supplier Selector if External */}
                        {op.executionType === 'external' && (
                          <select
                            disabled={isCompleted}
                            value={op.supplierId || ''}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].supplierId = e.target.value;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs max-w-[160px] disabled:bg-gray-100"
                          >
                            <option value="">-- اختر المورد --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.name})</option>
                            ))}
                          </select>
                        )}

                        {/* Cost Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            disabled={isCompleted}
                            placeholder="التكلفة ج.م"
                            value={op.cost || ''}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].cost = Number(e.target.value) || 0;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="w-24 p-1.5 border border-gray-200 rounded-lg text-xs font-bold disabled:bg-gray-100"
                          />
                          <span className="text-xs text-gray-500">ج.م</span>
                        </div>

                        {/* Complete & Post Button */}
                        {!isCompleted ? (
                          <button
                            onClick={() => handleExecuteStage(viewingJob.id, idx, {
                              cost: op.cost,
                              supplierId: op.supplierId,
                              executionType: op.executionType
                            })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                          >
                            <span>اعتماد وترحيل القيد ✅</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <span>✓</span>
                              <span>مرحّل بالحسابات</span>
                              {op.cost > 0 && <span className="font-mono">({op.cost.toLocaleString('en-US')} ج.م)</span>}
                            </span>

                            {viewingJob.status !== 'delivered' && (
                              <button
                                onClick={() => handleUndoStage(viewingJob.id, idx)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                title="إلغاء اعتماد المرحلة لتصحيح التكلفة أو تغيير المورد وإعادة ترحيلها"
                              >
                                <span>↩️</span>
                                <span>تراجع / إلغاء الاعتماد</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dossier Footer / Final Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {hasPerm('duplicate_printing_job') && (
                  <button
                    onClick={() => {
                      handleDuplicateJob(viewingJob);
                      setViewingJob(null);
                    }}
                    className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>🔄</span>
                    <span>تكرار هذا الشغل</span>
                  </button>
                )}

                {viewingJob.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      const job = viewingJob;
                      setViewingJob(null);
                      handleOpenCreateModal(job);
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    title="تعديل مواصفات أو كميات أو سعر أمر الشغل"
                  >
                    <span>✏️</span>
                    <span>تعديل بيانات الطلبية</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteJobOrder(viewingJob.id)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  title="حذف أمر الشغل نهائياً مع فواتير الموردين والقيود المرتبطة"
                >
                  <span>🗑️</span>
                  <span>حذف أمر الشغل</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingJob(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300 transition-all"
                >
                  إغلاق
                </button>

                {viewingJob.status === 'delivered' ? (
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('sales');
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>🧾</span>
                    <span>عرض فاتورة البيع في المبيعات ({viewingJob.salesInvoiceId || 'فاتورة المبيعات'})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeliverJobOrder(viewingJob)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>📦</span>
                    <span>تسليم الطلبية للعميل وإصدار الفاتورة الرسمية</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONSOLIDATED VENDOR INVOICE (FEATURE 5) ==================== */}
      {isConsolidatedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 my-8">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">تسجيل فاتورة مورد مجمعة (أكثر من طلبية)</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  إثبات فاتورة واحدة للمطبعة أو تاجر الورق وتوزيع بنودها على طلبيات العملاء المختلفة
                </p>
              </div>
              <button
                onClick={() => setIsConsolidatedModalOpen(false)}
                className="text-white hover:text-emerald-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Supplier & Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المورد *</label>
                  <select
                    value={consForm.supplierId}
                    onChange={e => setConsForm(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم فاتورة المورد</label>
                  <input
                    type="text"
                    placeholder="مثال: INV-9842"
                    value={consForm.invoiceNumber}
                    onChange={e => setConsForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={consForm.date}
                    onChange={e => setConsForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-800">بنود الفاتورة وتوزيعها على الطلبيات:</span>
                  <button
                    type="button"
                    onClick={handleAddConsolidatedLine}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>➕</span>
                    <span>إضافة سطر طلبية</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {consForm.lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center">
                      {/* Job Order Selector */}
                      <select
                        value={line.jobOrderId}
                        onChange={e => {
                          const newLines = [...consForm.lines];
                          newLines[idx].jobOrderId = e.target.value;
                          setConsForm(prev => ({ ...prev, lines: newLines }));
                        }}
                        className="p-1.5 border border-gray-300 rounded-lg text-xs flex-1 min-w-[180px]"
                      >
                        <option value="">-- اختر أمر الشغل --</option>
                        {jobOrders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.code} - {o.customerName} ({o.productTitle})
                          </option>
                        ))}
                      </select>

                      {/* Operation Selector */}
                      <select
                        value={line.operationId}
                        onChange={e => {
                          const newLines = [...consForm.lines];
                          newLines[idx].operationId = e.target.value as any;
                          setConsForm(prev => ({ ...prev, lines: newLines }));
                        }}
                        className="p-1.5 border border-gray-300 rounded-lg text-xs min-w-[120px]"
                      >
                        {STANDARD_PRINTING_OPERATIONS.map(op => (
                          <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                      </select>

                      {/* Amount */}
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          placeholder="المبلغ"
                          value={line.amount || ''}
                          onChange={e => {
                            const newLines = [...consForm.lines];
                            newLines[idx].amount = Number(e.target.value) || 0;
                            setConsForm(prev => ({ ...prev, lines: newLines }));
                          }}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-bold text-emerald-800"
                        />
                        <span className="text-[10px] text-gray-500">ج.م</span>
                      </div>

                      {/* Remove Line */}
                      {consForm.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveConsolidatedLine(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl flex justify-between items-center text-sm font-bold text-emerald-900">
                  <span>إجمالي الفاتورة المجمعة:</span>
                  <span className="text-base font-black">
                    {consForm.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0).toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConsolidatedModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveConsolidatedInvoice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                حفظ وترحيل الفاتورة وتوزيع التكاليف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingJobOrders;
