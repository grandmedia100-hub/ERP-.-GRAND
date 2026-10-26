import React, { useState, useMemo } from 'react';
import type {
  PrintingJobOrder, JobOperationItem, PrintingOperationId, PrintingOperationDefinition,
  ConsolidatedVendorInvoice, ConsolidatedVendorInvoiceLine, Customer, Supplier, Account,
  JournalEntry, ModulePostingSettings, Permission, SalesInvoice, PurchaseInvoice,
  OperationBillingStatus, CartonBoxSpecs
} from '../types.ts';
import { showNotification } from '../services/notificationService.ts';

// ==================== 21 Standard Printing & Carton Operations Catalog ====================
export const STANDARD_PRINTING_OPERATIONS: PrintingOperationDefinition[] = [
  { id: 'paper_supply', name: 'توريد ورق خام / بكر وشيتات', category: 'prepress', icon: '📜', defaultUnit: 'طن / رزمة / كجم' },
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
  { id: 'corrugated_flute', name: 'شيتات كرتون مضلع سينجل فيس', category: 'converting', icon: '📦', defaultUnit: 'لوح / شيت' },
  { id: 'flute_lamination', name: 'كستوة / لصف / تبطين (Lamination)', category: 'converting', icon: '🥞', defaultUnit: 'فرخ' },
  { id: 'die_cutting', name: 'تكسير وريجة', category: 'converting', icon: '⚙️', defaultUnit: 'فرخ' },
  { id: 'gluing', name: 'لزق وتجميع', category: 'converting', icon: '🧴', defaultUnit: 'علبة' },
  { id: 'staple_binding', name: 'دبوس (تجليد)', category: 'binding', icon: '📎', defaultUnit: 'نسخة' },
  { id: 'spiral_binding', name: 'سلك لولبي', category: 'binding', icon: '🌀', defaultUnit: 'نسخة' },
  { id: 'packaging', name: 'تغليف وشرنكة', category: 'logistics', icon: '📦', defaultUnit: 'طرد' },
  { id: 'shipping', name: 'شحن ونقل', category: 'logistics', icon: '🚚', defaultUnit: 'نقلة' },
];

export const PRINTING_TEMPLATES: { name: string; icon: string; desc: string; operations: PrintingOperationId[] }[] = [
  {
    name: 'علب كرتون مضلع مبطن أوفست (Litho-Laminated)',
    icon: '📦',
    desc: 'توريد ورق + زنكات + طباعة + سلوفان + شيتات سينجل فيس + كستوة/تبطين + فورمة + تكسير + لزق وتقفيل + تغليف',
    operations: ['paper_supply', 'paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping']
  },
  {
    name: 'علب كرتون وتغليف فاخر (دوبلكس مصمت)',
    icon: '🎁',
    desc: 'توريد ورق + زنكات + فورمة + طباعة + متلايز + سلوفان + سبوت UV + بصمة + كوفراج + تكسير + شباك + لزق + تغليف',
    operations: ['paper_supply', 'paper_cutting', 'ctp_plates', 'laser_die', 'printing', 'gold_metalized', 'lamination', 'spot_uv', 'hot_foil', 'embossing', 'die_cutting', 'pvc_window', 'gluing', 'packaging', 'shipping']
  },
  {
    name: 'بروشور وفلاير تجاري',
    icon: '📄',
    desc: 'توريد ورق + قص + زنكات + طباعة + سلوفان + تكسير وريجة + تغليف + شحن',
    operations: ['paper_supply', 'paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging', 'shipping']
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
  const [activeTab, setActiveTab] = useState<'orders' | 'consolidated' | 'kiosk'>('orders');

  // Shop Floor Kiosk State (صالة الإنتاج والماكينات)
  const [kioskStation, setKioskStation] = useState<PrintingOperationId>('paper_cutting');
  const [kioskConfirmModal, setKioskConfirmModal] = useState<{
    orderId: string;
    opIndex: number;
    orderCode: string;
    opName: string;
    targetQty: number;
    goodQty: number;
    scrapQty: number;
    notes: string;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<PrintingJobOrder | null>(null);
  const [viewingJob, setViewingJob] = useState<PrintingJobOrder | null>(null);
  const [isConsolidatedModalOpen, setIsConsolidatedModalOpen] = useState(false);

  // Material / Stage Physical Delivery Modal (تسجيل استلام الخامات والوزن الفعلي)
  const [receiveDeliveryModal, setReceiveDeliveryModal] = useState<{
    orderId: string;
    opIndex: number;
    orderCode: string;
    opName: string;
    supplierName: string;
    unit: string;
    estimatedQty: number;
    actualQuantity: number;
    deliveryNoteNumber: string;
    notes: string;
  } | null>(null);

  // Supplier Invoice Reconciliation & Posting Modal (مطابقة واعتماد فاتورة المورد الرسمية)
  const [reconcileSupplierModal, setReconcileSupplierModal] = useState<{
    orderId: string;
    opIndex: number;
    orderCode: string;
    customerName: string;
    opName: string;
    supplierId: string;
    supplierName: string;
    unit: string;
    // Estimated
    estimatedQty: number;
    estimatedRate: number;
    estimatedCost: number;
    // Received
    receivedQty: number;
    deliveryNoteNumber: string;
    // Actual Supplier Invoice inputs
    supplierInvoiceNumber: string;
    actualQuantity: number;
    actualRate: number;
    actualCost: number;
    invoiceDate: string;
    paymentMethod: 'نقدي' | 'اجل';
    notes: string;
  } | null>(null);

  

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
    productCategory: 'كرتون وتغليف ومطبوعات',
    quantity: 1000,
    unit: 'علبة',
    clientSalePrice: 0,
    deliveryDate: '',
    notes: '',
    selectedOps: ['paper_supply', 'paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping']
  });

  const handleOpenCreateModal = (orderToEdit?: PrintingJobOrder) => {
    if (orderToEdit) {
      setEditingJob(orderToEdit);
      setFormData({
        customerId: orderToEdit.customerId,
        productTitle: orderToEdit.productTitle,
        productCategory: orderToEdit.productCategory || 'كرتون وتغليف ومطبوعات',
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
        productCategory: 'كرتون وتغليف ومطبوعات',
        quantity: 1000,
        unit: 'علبة',
        clientSalePrice: 0,
        deliveryDate: '',
        notes: '',
        selectedOps: ['paper_supply', 'paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping']
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
      const updatedOrders = jobOrders.map(ord => {
        if (ord.id !== editingJob.id) return ord;

        const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
          const existingOp = ord.operations.find(o => o.operationId === opId);
          if (existingOp) return existingOp;
          const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
          return {
            id: `OP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            operationId: opId,
            name: def?.name || opId,
            executionType: (opId === 'paper_supply' || opId === 'corrugated_flute' || opId === 'ctp_plates' || opId === 'laser_die' || opId === 'lamination') ? 'external' : 'internal',
            status: 'pending',
            billingStatus: 'provisional',
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
      logAction(`تحديث أمر تشغيل: ${editingJob.code} للعميل ${customer?.name}`);
      showNotification('تم تحديث أمر الشغل بنجاح', 'success');
    } else {
      const nextNum = jobOrders.length + 1;
      const orderCode = `JOB-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const newId = `JOB_${Date.now()}`;

      const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
        const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
        return {
          id: `OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          operationId: opId,
          name: def?.name || opId,
          executionType: (opId === 'paper_supply' || opId === 'corrugated_flute' || opId === 'ctp_plates' || opId === 'laser_die' || opId === 'lamination') ? 'external' : 'internal',
          status: 'pending',
          billingStatus: 'provisional',
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
      logAction(`إنشاء أمر شغل مطبوعات جديد: ${orderCode} للعميل ${customer?.name || 'عميل نقدي'}`);
      showNotification(`تم إنشاء أمر الشغل (${orderCode}) وبدء خط سير التشغيل بنجاح 🚀`, 'success');
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

  // ==================== Shop Floor Kiosk Handlers (صالة الإنتاج والماكينات) ====================
  const handleStartKioskStage = (orderId: string, opIndex: number) => {
    setJobOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const newOps = [...order.operations];
      newOps[opIndex] = {
        ...newOps[opIndex],
        status: 'in_progress',
        startedAt: new Date().toISOString()
      };
      return { ...order, operations: newOps, status: 'in_progress' };
    }));
    showNotification('تم بدء تشغيل المرحلة على الماكينة بنجاح ▶️', 'info');
  };

  const handleOpenKioskComplete = (order: PrintingJobOrder, opIndex: number) => {
    const op = order.operations[opIndex];
    setKioskConfirmModal({
      orderId: order.id,
      opIndex,
      orderCode: order.code,
      opName: op.name,
      targetQty: order.quantity,
      goodQty: order.quantity,
      scrapQty: 0,
      notes: ''
    });
  };

  const handleSubmitKioskComplete = () => {
    if (!kioskConfirmModal) return;
    const { orderId, opIndex, goodQty, scrapQty, notes } = kioskConfirmModal;

    setJobOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const newOps = [...order.operations];
      newOps[opIndex] = {
        ...newOps[opIndex],
        status: 'completed',
        completedAt: new Date().toISOString(),
        goodQuantity: Number(goodQty) || 0,
        scrapQuantity: Number(scrapQty) || 0,
        operatorNotes: notes
      };
      const nextIdx = Math.min(opIndex + 1, newOps.length - 1);
      const allDone = newOps.every(o => o.status === 'completed');
      return {
        ...order,
        operations: newOps,
        currentStageIndex: nextIdx,
        status: allDone ? 'completed' : 'in_progress'
      };
    }));

    logAction(`صالة الإنتاج: إتمام مرحلة (${kioskConfirmModal.opName}) بأمر شغل ${kioskConfirmModal.orderCode} (سليم: ${goodQty}، هالك: ${scrapQty})`);
    showNotification(`تم إتمام وتسليم مرحلة (${kioskConfirmModal.opName}) ونقلها للمرحلة التالية بنجاح ✅`, 'success');
    setKioskConfirmModal(null);
  };

  // Filter jobs for Kiosk view (only active jobs matching the selected kiosk station)
  const kioskJobs = useMemo(() => {
    return jobOrders.filter(order => {
      if (order.status === 'delivered' || order.status === 'cancelled') return false;
      const op = order.operations.find(o => o.operationId === kioskStation);
      return Boolean(op);
    }).map(order => {
      const opIndex = order.operations.findIndex(o => o.operationId === kioskStation);
      const op = order.operations[opIndex];
      return { order, op, opIndex };
    });
  }, [jobOrders, kioskStation]);

  // ==================== Stage Execution & Accounting ====================
  // 1. Operational Stage Completion (إتمام تشغيل المرحلة دون ترحيل مالي للمورد)
  const handleExecuteStage = (orderId: string, opIndex: number, updatedFields: Partial<JobOperationItem>) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;

    const op = order.operations[opIndex];
    if (!op) return;

    const executionType = updatedFields.executionType || op.executionType || 'internal';
    const cost = Number(updatedFields.cost ?? op.cost) || 0;
    const supplierId = updatedFields.supplierId || op.supplierId;
    const supplier = suppliers.find(s => s.id === supplierId);

    // Update operation item operationally
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      ...updatedFields,
      executionType,
      supplierId: executionType === 'internal' ? undefined : supplierId,
      supplierName: executionType === 'internal' ? undefined : (supplier?.name || supplier?.companyName || op.supplierName),
      status: 'completed',
      cost,
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

    logAction(`إتمام مرحلة (${op.name}) تشغيلياً بأمر شغل ${order.code} (${executionType === 'internal' ? 'داخلياً' : 'لدى الغير'})`);
    showNotification(
      executionType === 'internal'
        ? `تم إتمام مرحلة (${op.name}) داخلياً ونقل الطلبية للخطوة التالية بنجاح ✅`
        : `تم إتمام تشغيل مرحلة (${op.name}) ونقلها للمرحلة التالية. يمكنك ترحيل فاتورة المورد عند وصولها ⏩`,
      'success'
    );
  };

  // Reopen an unposted stage for operational adjustment (إعادة فتح مرحلة غير مرحلة مالياً)
  const handleReopenStage = (orderId: string, opIndex: number) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;
    const op = order.operations[opIndex];
    if (!op || op.status !== 'completed') return;

    if (op.purchaseInvoiceId || op.billingStatus === 'confirmed_posted') {
      handleUndoStage(orderId, opIndex);
      return;
    }

    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      status: 'pending',
      completedAt: undefined
    };

    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    const updatedOrder: PrintingJobOrder = {
      ...order,
      operations: newOps,
      currentStageIndex: Math.min(order.currentStageIndex, opIndex),
      totalActualCost,
      grossProfit,
      profitMarginPercent
    };

    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    logAction(`إعادة فتح مرحلة (${op.name}) بأمر شغل ${order.code} للمتابعة`);
    showNotification(`تم إعادة فتح مرحلة (${op.name}) بنجاح`, 'info');
  };

  // 1. Save Physical Delivery Receipt (تسجيل إذن الاستلام والوزن الفعلي دون ترحيل مالي)
  const handleSaveDeliveryReceipt = (
    orderId: string,
    opIndex: number,
    data: { actualQuantity: number; deliveryNoteNumber: string; notes: string }
  ) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;
    const op = order.operations[opIndex];
    if (!op) return;

    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      billingStatus: 'received_pending_invoice',
      actualQuantity: data.actualQuantity,
      deliveryNoteNumber: data.deliveryNoteNumber,
      notes: data.notes ? `${op.notes ? `${op.notes} | ` : ''}إذن استلام: ${data.deliveryNoteNumber} (${data.actualQuantity} ${op.unit || ''})` : op.notes
    };

    const updatedOrder = { ...order, operations: newOps };
    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    logAction(`تسجيل استلام خامات مرحلة (${op.name}) بأمر شغل ${order.code} بإذن رقم (${data.deliveryNoteNumber}) بكمية ${data.actualQuantity} ${op.unit || ''}`);
    showNotification(`تم تسجيل استلام الكمية الفعلية (${data.actualQuantity} ${op.unit || ''}) بنجاح. في انتظار فاتورة المورد للاعتماد المالي.`, 'success');
    setReceiveDeliveryModal(null);
  };

  // 2. Reconcile and Confirm Official Supplier Invoice (مطابقة الفاتورة الرسمية والترحيل للمورد)
  const handleConfirmSupplierInvoice = (
    orderId: string,
    opIndex: number,
    data: {
      supplierInvoiceNumber: string;
      actualQuantity: number;
      actualRate: number;
      actualCost: number;
      invoiceDate: string;
      paymentMethod: 'نقدي' | 'اجل';
      notes: string;
    }
  ) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;
    const op = order.operations[opIndex];
    if (!op) return;

    const supplierId = op.supplierId;
    if (!supplierId) {
      showNotification('يرجى تحديد المورد المسؤول أولاً', 'error');
      return;
    }
    const supplier = suppliers.find(s => s.id === supplierId);
    const supplierName = supplier?.name || supplier?.companyName || 'مورد تشغيل';

    const actualCost = Number(data.actualCost) || 0;
    if (actualCost <= 0) {
      showNotification('يرجى إدخال إجمالي المبلغ الفعلي في فاتورة المورد', 'error');
      return;
    }

    const cleanInvNum = data.supplierInvoiceNumber.trim();
    if (!cleanInvNum) {
      showNotification('يرجى إدخال رقم فاتورة المورد الرسمية أو كشف الحساب', 'error');
      return;
    }

    const pinvCount = (purchaseInvoices?.length || 0) + 1;
    const yearStr = (data.invoiceDate || new Date().toISOString().split('T')[0]).split('-')[0];
    const pInvId = `PINV-${cleanInvNum.replace(/[^a-zA-Z0-9_-]/g, '') || `${yearStr}-${String(pinvCount).padStart(4, '0')}`}`;

    // Create Purchase Invoice
    const newPurchaseInvoice: PurchaseInvoice = {
      id: pInvId,
      supplierId,
      supplierName,
      companyName: supplier?.companyName,
      date: data.invoiceDate || new Date().toISOString().split('T')[0],
      items: [
        {
          productId: `SRV-${op.operationId}`,
          productName: `${op.name} (فاتورة مورد: ${cleanInvNum} - أمر شغل ${order.code} - ${order.customerName})`,
          quantity: data.actualQuantity || op.quantity || 1,
          price: data.actualRate || actualCost,
          total: actualCost,
          unit: (op.unit as any) || 'عدد',
          itemType: 'expense',
          cost: actualCost
        }
      ],
      subTotal: actualCost,
      total: actualCost,
      paymentMethod: data.paymentMethod || op.paymentMethod || 'اجل',
      invoiceType: 'purchase',
      notes: `فاتورة مورد رسمية رقم ${cleanInvNum} عن ${op.name} بأمر شغل ${order.code} للعميل ${order.customerName}${data.notes ? ` - ${data.notes}` : ''}`,
      status: 'active',
      branchId: currentBranchId
    };

    if (setPurchaseInvoices) {
      setPurchaseInvoices(prev => [newPurchaseInvoice, ...prev]);
    }

    // Create Journal Entry
    const entryDesc = `فاتورة مشتريات مورد ${cleanInvNum} (${pInvId}) - تكلفة ${op.name} - أمر شغل ${order.code} - مورد: ${supplierName}`;
    const jeId = createJournalEntry({
      description: entryDesc,
      date: data.invoiceDate || new Date().toISOString().split('T')[0],
      referenceType: 'PurchaseInvoice',
      referenceId: pInvId,
      branchId: currentBranchId,
      lines: [
        {
          accountId: wipAccountId,
          accountName: `${wipAccountName} (${order.code})`,
          debit: actualCost,
          credit: 0
        },
        {
          accountId: payablesAccountId,
          accountName: `الموردين - ${supplierName}`,
          debit: 0,
          credit: actualCost
        }
      ]
    });

    const estCost = Number(op.estimatedCost || op.cost) || 0;
    const costVariance = actualCost - estCost;

    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      status: 'completed',
      billingStatus: 'confirmed_posted',
      cost: actualCost,
      actualCost: actualCost,
      actualQuantity: data.actualQuantity || op.actualQuantity,
      actualRate: data.actualRate || (data.actualQuantity ? actualCost / data.actualQuantity : actualCost),
      supplierInvoiceNumber: cleanInvNum,
      invoiceDate: data.invoiceDate,
      paymentMethod: data.paymentMethod,
      costVariance,
      reconciledAt: new Date().toISOString(),
      purchaseInvoiceId: pInvId,
      journalEntryId: jeId,
      completedAt: new Date().toISOString()
    };

    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;
    const nextStageIndex = opIndex === order.currentStageIndex ? Math.min(order.operations.length - 1, opIndex + 1) : order.currentStageIndex;

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

    logAction(`اعتماد ومطابقة فاتورة مورد رقم (${cleanInvNum}) لمرحلة (${op.name}) بأمر شغل ${order.code} لحساب ${supplierName} بقيمة ${actualCost} ج.م`);
    showNotification(`تم اعتماد وترحيل فاتورة المورد (${cleanInvNum}) لحساب المورد والأستاذ العام بنجاح ✅`, 'success');
    setReconcileSupplierModal(null);
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

    // 3. Reset operation state to pending/unposted
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      status: 'pending',
      billingStatus: op.actualQuantity ? 'received_pending_invoice' : 'provisional',
      journalEntryId: undefined,
      purchaseInvoiceId: undefined,
      supplierInvoiceNumber: undefined,
      reconciledAt: undefined,
      costVariance: undefined,
      cost: op.estimatedCost || op.cost,
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
              actualCost: Number(updatedOps[opIndex].cost || 0) + line.amount,
              supplierInvoiceNumber: consForm.invoiceNumber,
              billingStatus: 'confirmed_posted',
              reconciledAt: new Date().toISOString(),
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
          onClick={() => setActiveTab('kiosk')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'kiosk'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
              : 'border-transparent text-gray-500 hover:text-emerald-700'
          }`}
        >
          <span>🖥️</span>
          <span>شاشات صالة الإنتاج (Kiosk)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            شاشات الماكينات
          </span>
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
              <span className="text-xs font-bold text-purple-700">أوامر مكتملة ومسلمة</span>
              <div className="text-2xl font-black text-purple-900 mt-1">
                {kpis.delivered} أمر
              </div>
              <span className="text-xs text-purple-600 font-medium">تم إنجازها بنجاح</span>
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

      {/* ==================== TAB 4: SHOP FLOOR / KIOSK VIEW (شاشات الماكينات) ==================== */}
      {activeTab === 'kiosk' && (
        <div className="space-y-6">
          {/* Kiosk Station Selector Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-800 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h2 className="text-lg font-black tracking-tight">شاشات صالة الإنتاج والماكينات (Kiosk Floor Mode)</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  واجهة لمس مخصصة لعمال الماكينات لمتابعة وبدء وتسليم مراحل التشغيل بدون أي بيانات مالية سرية
                </p>
              </div>

              <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-amber-400">
                🔒 وضع أمان صالة الإنتاج: حجب الأسعار والأرباح وحسابات العملاء تلقائياً
              </div>
            </div>

            {/* Station Quick Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { id: 'paper_cutting', name: 'قص الورق', icon: '✂️' },
                { id: 'ctp_plates', name: 'الزنكات CTP', icon: '💿' },
                { id: 'printing', name: 'طباعة أوفست', icon: '🖨️' },
                { id: 'lamination', name: 'سلوفان وورنيش', icon: '✨' },
                { id: 'corrugated_flute', name: 'شيتات سينجل فيس', icon: '📦' },
                { id: 'flute_lamination', name: 'كستوة وتبطين', icon: '🥞' },
                { id: 'laser_die', name: 'فورمة التكسير', icon: '📐' },
                { id: 'die_cutting', name: 'ماكينة التكسير', icon: '⚙️' },
                { id: 'gluing', name: 'لزق وتقفيل', icon: '🧴' },
                { id: 'packaging', name: 'تحزيم وتغليف', icon: '📦' },
                { id: 'shipping', name: 'شحن وتسليم', icon: '🚚' },
              ].map(st => {
                const count = jobOrders.filter(o => 
                  o.status !== 'delivered' && 
                  o.status !== 'cancelled' && 
                  o.operations.some(op => op.operationId === st.id && op.status !== 'completed')
                ).length;
                const isSelected = kioskStation === st.id;

                return (
                  <button
                    key={st.id}
                    onClick={() => setKioskStation(st.id as PrintingOperationId)}
                    className={`px-4 py-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{st.icon}</span>
                    <span>{st.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Station Active Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kioskJobs.map(({ order, op, opIndex }) => {
              const isPending = op.status === 'pending';
              const isInProgress = op.status === 'in_progress';
              const isDone = op.status === 'completed';
              const specs = order.cartonSpecs;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border-2 transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                    isInProgress
                      ? 'border-indigo-600 ring-2 ring-indigo-200'
                      : isDone
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black font-mono text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                            {order.code}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isInProgress
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isInProgress ? '⚡ جاري العمل على الماكينة' : isDone ? '✅ مكتملة ومسلّمة' : '⏳ في انتظار التشغيل'}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-900 text-base mt-1.5">{order.productTitle}</h3>
                        <p className="text-xs text-gray-500 font-medium">العميل: {order.customerName}</p>
                      </div>

                      <div className="text-left bg-gray-50 p-2.5 rounded-xl border border-gray-200 min-w-[100px]">
                        <span className="text-[10px] font-bold text-gray-500 block">الكمية المطلوبة</span>
                        <span className="text-lg font-black text-gray-900 font-mono">
                          {order.quantity.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 block">{order.unit}</span>
                      </div>
                    </div>

                    {/* Technical Specs & Carton Layout Box */}
                    {specs ? (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span>📦</span>
                            <span>{specs.structureName}</span>
                          </span>
                          {specs.fluteType && (
                            <span className="bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded text-[11px]">
                              {specs.fluteType} {specs.topPaperType ? `+ ${specs.topPaperType}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                          {specs.length && specs.width && specs.height ? (
                            <div>• الأبعاد: <strong className="font-mono text-slate-900">{specs.length} × {specs.width} × {specs.height}</strong> سم</div>
                          ) : null}
                          <div>• مسطح التكسير: <strong className="font-mono text-indigo-700">{specs.blankLength} × {specs.blankWidth}</strong> سم</div>
                          <div>• مقاس الفرخ: <strong className="font-mono text-slate-900">{specs.sheetLength} × {specs.sheetWidth}</strong> سم</div>
                          <div>• عدد العلب بالفرخ: <strong className="font-mono text-emerald-700">{specs.upsPerSheet} علبة</strong></div>
                          <div className="col-span-2 text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 font-bold">
                            ⚠️ إجمالي الأفرخ المطلوب سحبها لهذه الماكينة: <span className="font-mono text-sm">{specs.totalSheetsRequired.toLocaleString('en-US')}</span> فرخ
                          </div>
                        </div>

                        {/* Mini Imposition Grid */}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">
                            مخطط رص وتقسيم العلب بالفرخ ({specs.upsPerSheet} علبة):
                          </span>
                          <div className="w-full bg-slate-200 p-2 rounded-lg border border-slate-300 flex items-center justify-center">
                            <div className="grid gap-1 bg-white p-1 rounded border border-slate-300 w-full max-w-[200px]" style={{
                              gridTemplateColumns: `repeat(${Math.min(specs.upsPerSheet > 4 ? 4 : specs.upsPerSheet, 4)}, minmax(0, 1fr))`
                            }}>
                              {Array.from({ length: Math.min(specs.upsPerSheet, 12) }).map((_, i) => (
                                <div key={i} className="h-6 bg-indigo-100 border border-indigo-300 rounded text-[9px] font-bold text-indigo-700 flex items-center justify-center">
                                  علبة {i + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700">
                        <span className="font-bold text-gray-800">مواصفات المطبوع التجاري:</span>
                        <div className="mt-1 font-medium">{order.productTitle} - كمية: {order.quantity.toLocaleString('en-US')} {order.unit}</div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="text-xs bg-yellow-50/80 border border-yellow-200 p-2.5 rounded-lg text-yellow-900">
                        <span className="font-bold">ملاحظات فنية:</span> {order.notes}
                      </div>
                    )}

                    {isDone && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs flex justify-between items-center text-emerald-900 font-bold">
                        <span>✓ تم إنجاز المرحلة</span>
                        <span>سليم: {(op.goodQuantity ?? order.quantity).toLocaleString('en-US')} | هالك: {op.scrapQuantity ?? 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Kiosk Action Buttons */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    {isPending ? (
                      <button
                        onClick={() => handleStartKioskStage(order.id, opIndex)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                      >
                        <span className="text-lg">▶️</span>
                        <span>بدء التشغيل على الماكينة</span>
                      </button>
                    ) : isInProgress ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => {
                            const reason = window.prompt('سبب التوقف أو العطل المؤقت:');
                            if (reason) logAction(`توقف مرحلة (${op.name}) بأمر شغل ${order.code}: ${reason}`);
                          }}
                          className="px-3 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl text-xs"
                          title="تسجيل عطل أو توقف مؤقت"
                        >
                          ⏸️ عطل / توقف
                        </button>

                        <button
                          onClick={() => handleOpenKioskComplete(order, opIndex)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
                        >
                          <span className="text-lg">✅</span>
                          <span>إنهاء وتسليم للمرحلة التالية</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full text-center py-2 text-xs font-bold text-emerald-700">
                        تم تسليم هذه المرحلة للمحطة اللاحقة ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {kioskJobs.length === 0 && (
              <div className="col-span-1 md:col-span-2 p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
                <span className="text-5xl block">🎉</span>
                <h3 className="text-lg font-black text-gray-800">لا توجد طلبيات قيد الانتظار في هذه المحطة حالياً</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  جميع أوامر الشغل الخاصة بمحطة ({STANDARD_PRINTING_OPERATIONS.find(o => o.id === kioskStation)?.name}) إما تم إنجازها أو لم تصل بعد من المراحل السابقة.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: KIOSK STAGE COMPLETION ==================== */}
      {kioskConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">تسجيل إنهاء المرحلة وتسليمها</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  أمر شغل: {kioskConfirmModal.orderCode} | المرحلة: {kioskConfirmModal.opName}
                </p>
              </div>
              <button
                onClick={() => setKioskConfirmModal(null)}
                className="text-white hover:text-emerald-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Good Units Count */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  العدد السليم المنجز *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: Math.max(0, prev.goodQty - 50) }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    -50
                  </button>
                  <input
                    type="number"
                    value={kioskConfirmModal.goodQty}
                    onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: Number(e.target.value) || 0 }) : null)}
                    className="w-full p-3 border-2 border-emerald-400 rounded-xl text-center text-xl font-black text-emerald-800"
                  />
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: prev.goodQty + 50 }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Scrap / Waste Units Count */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عدد الوحدات التالفة / الهالك (أفرخ ضبط أو تلف)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: Math.max(0, prev.scrapQty - 5) }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    value={kioskConfirmModal.scrapQty}
                    onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: Number(e.target.value) || 0 }) : null)}
                    className="w-full p-2.5 border-2 border-rose-300 rounded-xl text-center text-lg font-black text-rose-700"
                  />
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: prev.scrapQty + 5 }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات المشغل / الوردية (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظة بخصوص جودة السحب أو سبب الهالك..."
                  value={kioskConfirmModal.notes}
                  onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setKioskConfirmModal(null)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmitKioskComplete}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.98]"
              >
                تأكيد وتسليم للمرحلة التالية ✅
              </button>
            </div>
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
              {/* Job Type Selector Tabs */}
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

            {/* Stages / Operations List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="text-sm font-black text-gray-800">
                    مراحل وخط سير التشغيل ({viewingJob.operations.length} مرحلة):
                  </h3>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    العمليات لدى الموردين تبدأ كـ (تقديري أولي ⏳) ثم (استلام فعلي 📦) ولا ترحل لحساب المورد إلا عند مطابقة الفاتورة الرسمية (🧾).
                  </span>
                </div>
              </div>

              {viewingJob.operations.map((op, idx) => {
                const isCompleted = op.status === 'completed';
                const isExternal = op.executionType === 'external';
                const isConfirmedPosted = isCompleted && !!op.purchaseInvoiceId;
                const isReceivedPending = op.billingStatus === 'received_pending_invoice';
                const isProvisional = isExternal && !isConfirmedPosted && !isReceivedPending;
                const opSupplier = suppliers.find(s => s.id === op.supplierId);

                return (
                  <div
                    key={op.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isConfirmedPosted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isReceivedPending
                        ? 'bg-blue-50/40 border-blue-200'
                        : isCompleted
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-white border-gray-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Operation Name & Status Badges */}
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isConfirmedPosted
                            ? 'bg-emerald-600 text-white'
                            : isReceivedPending
                            ? 'bg-blue-600 text-white'
                            : isCompleted
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 text-sm">{op.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              op.executionType === 'internal'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {op.executionType === 'internal' ? '🏢 داخلي' : '🚚 لدى الغير'}
                            </span>

                            {/* Billing Status Pill */}
                            {isExternal && (
                              <>
                                {isConfirmedPosted ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>✅</span>
                                    <span>مرحّل للمورد (فاتورة {op.supplierInvoiceNumber || op.invoiceNumber})</span>
                                  </span>
                                ) : isReceivedPending ? (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>📦</span>
                                    <span>مستلم بالمخزن (بانتظار الفاتورة)</span>
                                  </span>
                                ) : (
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span>⏳</span>
                                    <span>تقديري أولي (غير مرحّل مالياً)</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                            {isConfirmedPosted ? (
                              <>
                                <span className="text-emerald-800 font-bold">
                                  معتمد بفاتورة رسمية: {op.cost.toLocaleString('en-US')} ج.م
                                </span>
                                {op.costVariance !== undefined && op.costVariance !== 0 && (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                    op.costVariance < 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {op.costVariance < 0
                                      ? `وفـر: ${Math.abs(op.costVariance).toLocaleString('en-US')} ج.م`
                                      : `زيادة: +${op.costVariance.toLocaleString('en-US')} ج.م`}
                                  </span>
                                )}
                                {op.reconciledAt && (
                                  <span className="text-gray-400 text-[10px]">
                                    ({new Date(op.reconciledAt).toLocaleDateString('ar-EG')})
                                  </span>
                                )}
                              </>
                            ) : isReceivedPending ? (
                              <span className="text-blue-700 font-bold">
                                مستلم فعلياً: {op.actualQuantity} {op.unit || ''}
                                {op.deliveryNoteNumber ? ` (إذن: ${op.deliveryNoteNumber})` : ''}
                                {op.cost > 0 ? ` • التقديري: ${op.cost.toLocaleString('en-US')} ج.م` : ''}
                              </span>
                            ) : isExternal ? (
                              <span className="text-amber-700 font-medium">
                                التكلفة التقديرية: {op.cost ? `${op.cost.toLocaleString('en-US')} ج.م` : 'لم تحدد'}
                                {opSupplier ? ` • مورد: ${opSupplier.name}` : ''}
                              </span>
                            ) : (
                              <span>
                                {isCompleted ? 'مكتملة داخلياً' : 'في انتظار بدء التشغيل الداخلي'}
                              </span>
                            )}

                            {op.goodQuantity !== undefined && (
                              <span className="text-emerald-700 font-bold text-[11px]">
                                (إنتاج سليم: {op.goodQuantity.toLocaleString('en-US')} {op.scrapQuantity ? ` | هالك: ${op.scrapQuantity}` : ''})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Supplier, Cost & Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Toggle Internal / External if not financially confirmed */}
                        {!isConfirmedPosted && (
                          <select
                            value={op.executionType}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].executionType = e.target.value as any;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs bg-white font-medium"
                          >
                            <option value="external">🚚 لدى الغير</option>
                            <option value="internal">🏢 داخلي</option>
                          </select>
                        )}

                        {/* Supplier Selector if External and not confirmed */}
                        {isExternal && !isConfirmedPosted && (
                          <select
                            value={op.supplierId || ''}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].supplierId = e.target.value;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs max-w-[150px] bg-white"
                          >
                            <option value="">-- اختر المورد --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.name})</option>
                            ))}
                          </select>
                        )}

                        {/* Estimated Cost Input if External and not confirmed */}
                        {isExternal && !isConfirmedPosted && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="تقديري ج.م"
                              value={op.cost || ''}
                              onChange={e => {
                                const newOps = [...viewingJob.operations];
                                newOps[idx].cost = Number(e.target.value) || 0;
                                newOps[idx].estimatedCost = Number(e.target.value) || 0;
                                setViewingJob({ ...viewingJob, operations: newOps });
                              }}
                              className="w-24 p-1.5 border border-amber-300 bg-amber-50/50 rounded-lg text-xs font-bold text-center"
                              title="التكلفة التقديرية الأولية قبل وصول الفاتورة"
                            />
                            <span className="text-[11px] text-gray-500">ج.م</span>
                          </div>
                        )}

                        {/* --- CASE 1: Stage NOT completed operationally yet (!isCompleted) --- */}
                        {!isCompleted && (
                          <>
                            {isExternal ? (
                              <>
                                {/* External Operational Completion (Advances stage without financial debt) */}
                                <button
                                  type="button"
                                  onClick={() => handleExecuteStage(viewingJob.id, idx, {
                                    executionType: 'external',
                                    cost: op.cost
                                  })}
                                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                                  title="إنهاء تشغيل المرحلة واستلامها تشغيلياً ونقل الطلبية للمرحلة التالية في صالة الإنتاج دون ترحيل مالي"
                                >
                                  <span>⏩</span>
                                  <span>إتمام التشغيل والمرحلة</span>
                                </button>

                                {/* Option to execute internally instead */}
                                <button
                                  type="button"
                                  onClick={() => handleExecuteStage(viewingJob.id, idx, {
                                    executionType: 'internal',
                                    cost: op.cost
                                  })}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                                  title="تنفيذ هذه المرحلة داخل الورشة داخلياً بدلاً من إرسالها لمورد خارجي"
                                >
                                  <span>🏢</span>
                                  <span>إتمام داخلياً</span>
                                </button>

                                {/* Delivery Receipt Modal Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!op.supplierId) {
                                      showNotification('يرجى اختيار المورد المسؤول أولاً', 'error');
                                      return;
                                    }
                                    setReceiveDeliveryModal({
                                      orderId: viewingJob.id,
                                      opIndex: idx,
                                      orderCode: viewingJob.code,
                                      opName: op.name,
                                      supplierName: opSupplier?.name || opSupplier?.companyName || 'مورد تشغيل',
                                      unit: op.unit || 'طن',
                                      estimatedQty: op.estimatedQuantity || op.quantity || 0,
                                      actualQuantity: op.actualQuantity || op.estimatedQuantity || 0,
                                      deliveryNoteNumber: op.deliveryNoteNumber || '',
                                      notes: op.notes || ''
                                    });
                                  }}
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold px-2 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
                                  title="تسجيل وصول الخامات أو المصنعية الفعلية بالمخزن مع رقم الإذن دون ترحيل مالي"
                                >
                                  <span>📦</span>
                                  <span>{isReceivedPending ? 'تعديل الاستلام' : 'استلام خامات'}</span>
                                </button>

                                {/* Official Invoice Reconciliation Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!op.supplierId) {
                                      showNotification('يرجى اختيار المورد المسؤول أولاً', 'error');
                                      return;
                                    }
                                    const est = Number(op.estimatedCost || op.cost) || 0;
                                    setReconcileSupplierModal({
                                      orderId: viewingJob.id,
                                      opIndex: idx,
                                      orderCode: viewingJob.code,
                                      customerName: viewingJob.customerName,
                                      opName: op.name,
                                      supplierId: op.supplierId,
                                      supplierName: opSupplier?.name || opSupplier?.companyName || 'مورد تشغيل',
                                      unit: op.unit || 'طن',
                                      estimatedQty: op.estimatedQuantity || op.quantity || 0,
                                      estimatedRate: op.estimatedRate || 0,
                                      estimatedCost: est,
                                      receivedQty: op.actualQuantity || 0,
                                      deliveryNoteNumber: op.deliveryNoteNumber || '',
                                      supplierInvoiceNumber: op.supplierInvoiceNumber || '',
                                      actualQuantity: op.actualQuantity || op.estimatedQuantity || op.quantity || 0,
                                      actualRate: op.actualRate || op.estimatedRate || 0,
                                      actualCost: op.actualCost || (op.actualRate && op.actualQuantity ? op.actualRate * op.actualQuantity : (op.cost || est)),
                                      invoiceDate: new Date().toISOString().split('T')[0],
                                      paymentMethod: op.paymentMethod || 'اجل',
                                      notes: ''
                                    });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                                  title="مطابقة فاتورة أو كشف حساب المورد النهائي وترحيل القيد لحساب المورد رسمياً"
                                >
                                  <span>🧾</span>
                                  <span>مطابقة الفاتورة والترحيل</span>
                                </button>
                              </>
                            ) : (
                              /* Internal Stage Completion */
                              <button
                                type="button"
                                onClick={() => handleExecuteStage(viewingJob.id, idx, {
                                  cost: op.cost,
                                  executionType: 'internal'
                                })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                              >
                                <span>إتمام المرحلة داخلياً ✅</span>
                              </button>
                            )}
                          </>
                        )}

                        {/* --- CASE 2: External Stage Operationally Completed BUT Waiting for Official Supplier Invoice --- */}
                        {isCompleted && isExternal && !isConfirmedPosted && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <span>✓</span>
                              <span>مكتملة تشغيلياً</span>
                              <span className="text-[10px] text-teal-600 font-normal">(بانتظار الفاتورة)</span>
                            </span>

                            {/* Reconcile Invoice is accessible anytime */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!op.supplierId) {
                                  showNotification('يرجى اختيار المورد المسؤول أولاً', 'error');
                                  return;
                                }
                                const est = Number(op.estimatedCost || op.cost) || 0;
                                setReconcileSupplierModal({
                                  orderId: viewingJob.id,
                                  opIndex: idx,
                                  orderCode: viewingJob.code,
                                  customerName: viewingJob.customerName,
                                  opName: op.name,
                                  supplierId: op.supplierId,
                                  supplierName: opSupplier?.name || opSupplier?.companyName || 'مورد تشغيل',
                                  unit: op.unit || 'طن',
                                  estimatedQty: op.estimatedQuantity || op.quantity || 0,
                                  estimatedRate: op.estimatedRate || 0,
                                  estimatedCost: est,
                                  receivedQty: op.actualQuantity || 0,
                                  deliveryNoteNumber: op.deliveryNoteNumber || '',
                                  supplierInvoiceNumber: op.supplierInvoiceNumber || '',
                                  actualQuantity: op.actualQuantity || op.estimatedQuantity || op.quantity || 0,
                                  actualRate: op.actualRate || op.estimatedRate || 0,
                                  actualCost: op.actualCost || (op.actualRate && op.actualQuantity ? op.actualRate * op.actualQuantity : (op.cost || est)),
                                  invoiceDate: new Date().toISOString().split('T')[0],
                                  paymentMethod: op.paymentMethod || 'اجل',
                                  notes: ''
                                });
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                              title="مطابقة فاتورة أو كشف حساب المورد النهائي وترحيل القيد لحساب المورد رسمياً"
                            >
                              <span>🧾</span>
                              <span>مطابقة الفاتورة والترحيل</span>
                            </button>

                            {/* Reopen stage */}
                            {viewingJob.status !== 'delivered' && (
                              <button
                                type="button"
                                onClick={() => handleReopenStage(viewingJob.id, idx)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-2 py-1.5 rounded-lg transition-all"
                                title="إعادة فتح المرحلة للمتابعة التشغيلية"
                              >
                                <span>↩️ إعادة فتح</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* --- CASE 3: Internal Stage Completed --- */}
                        {isCompleted && !isExternal && (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <span>✓</span>
                              <span>مكتمل داخلياً</span>
                              {op.cost > 0 && <span className="font-mono">({op.cost.toLocaleString('en-US')} ج.م)</span>}
                            </span>

                            {viewingJob.status !== 'delivered' && (
                              <button
                                type="button"
                                onClick={() => handleReopenStage(viewingJob.id, idx)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                title="إعادة فتح المرحلة لتعديلها"
                              >
                                <span>↩️ تعديل / إعادة فتح</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* --- CASE 4: Confirmed & Posted to Accounting (External) --- */}
                        {isConfirmedPosted && (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <span>✓</span>
                              <span>مرحّل بالحسابات</span>
                              {op.supplierInvoiceNumber && <span className="text-[10px] text-emerald-700 font-mono">(فاتورة: {op.supplierInvoiceNumber})</span>}
                              {op.cost > 0 && <span className="font-mono">({op.cost.toLocaleString('en-US')} ج.م)</span>}
                            </span>

                            {viewingJob.status !== 'delivered' && (
                              <button
                                type="button"
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

      {/* ==================== MODAL: PHYSICAL DELIVERY RECEIPT ==================== */}
      {receiveDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm flex items-center gap-2">
                  <span>📦</span>
                  <span>تسجيل الاستلام الفعلي للخامات / المصنعية</span>
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  أمر شغل: {receiveDeliveryModal.orderCode} • {receiveDeliveryModal.opName}
                </p>
              </div>
              <button
                onClick={() => setReceiveDeliveryModal(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-700">المورد:</span>
                  <span className="font-black text-blue-900">{receiveDeliveryModal.supplierName}</span>
                </div>
                {receiveDeliveryModal.estimatedQty > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">الكمية/الوزن المطلوب تقديرياً:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {receiveDeliveryModal.estimatedQty} {receiveDeliveryModal.unit}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  الكمية / الوزن الفعلي المستلم * ({receiveDeliveryModal.unit || 'طن / فرخ / كجم'})
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="مثال: 2.540 أو 5100"
                  value={receiveDeliveryModal.actualQuantity || ''}
                  onChange={e => setReceiveDeliveryModal({
                    ...receiveDeliveryModal,
                    actualQuantity: parseFloat(e.target.value) || 0
                  })}
                  className="w-full p-2.5 border border-blue-300 rounded-xl font-black text-blue-900 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  سجل الوزن الفعلي على البسكول أو عدد الطرود/الأفرخ المستلمة فعلياً
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  رقم إذن الاستلام / بوليصة الشحن / وزن البسكول
                </label>
                <input
                  type="text"
                  placeholder="مثال: بوليصة 10482 أو إذن مخزن 301"
                  value={receiveDeliveryModal.deliveryNoteNumber}
                  onChange={e => setReceiveDeliveryModal({
                    ...receiveDeliveryModal,
                    deliveryNoteNumber: e.target.value
                  })}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ملاحظات الاستلام أو الجودة</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات تخص حالة الورق، التغليف، أو عيوب تشغيل..."
                  value={receiveDeliveryModal.notes}
                  onChange={e => setReceiveDeliveryModal({
                    ...receiveDeliveryModal,
                    notes: e.target.value
                  })}
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                ℹ️ <strong>تنبيه مالي:</strong> تسجيل الاستلام يثبت وصول الخامات للمخزن فقط، <strong>ولا يرحل أي مبالغ لحساب المورد</strong> حتى وصول الفاتورة الرسمية أو كشف الحساب ومطابقتها.
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiveDeliveryModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleSaveDeliveryReceipt(
                  receiveDeliveryModal.orderId,
                  receiveDeliveryModal.opIndex,
                  {
                    actualQuantity: receiveDeliveryModal.actualQuantity,
                    deliveryNoteNumber: receiveDeliveryModal.deliveryNoteNumber,
                    notes: receiveDeliveryModal.notes
                  }
                )}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
              >
                <span>📦</span>
                <span>حفظ إذن الاستلام الفعلي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: SUPPLIER INVOICE RECONCILIATION & POSTING ==================== */}
      {reconcileSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 my-6">
            <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm flex items-center gap-2">
                  <span>🧾</span>
                  <span>مطابقة واعتماد فاتورة المورد الرسمية والترحيل للحسابات</span>
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  أمر شغل: {reconcileSupplierModal.orderCode} • عميل: {reconcileSupplierModal.customerName}
                </p>
              </div>
              <button
                onClick={() => setReconcileSupplierModal(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Stage & Supplier Banner */}
              <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="text-gray-500 block text-[10px]">المرحلة التشغيلية:</span>
                  <span className="font-black text-gray-900 text-sm">{reconcileSupplierModal.opName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">المورد:</span>
                  <span className="font-black text-emerald-800 text-sm">{reconcileSupplierModal.supplierName}</span>
                </div>
              </div>

              {/* Comparison: Estimated vs Received */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900 block mb-1">⏳ المسجل مبدئياً بأمر الشغل:</span>
                  <div className="space-y-1 text-gray-700">
                    <div className="flex justify-between">
                      <span>الكمية/الوزن:</span>
                      <span className="font-mono font-bold">{reconcileSupplierModal.estimatedQty || '-'} {reconcileSupplierModal.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>التكلفة التقديرية:</span>
                      <span className="font-mono font-bold text-amber-800">
                        {reconcileSupplierModal.estimatedCost.toLocaleString('en-US')} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900 block mb-1">📦 إذن الاستلام الفعلي بالمخزن:</span>
                  <div className="space-y-1 text-gray-700">
                    <div className="flex justify-between">
                      <span>الكمية/الوزن المستلم:</span>
                      <span className="font-mono font-bold text-blue-800">
                        {reconcileSupplierModal.receivedQty || '-'} {reconcileSupplierModal.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>رقم إذن الاستلام:</span>
                      <span className="font-mono">{reconcileSupplierModal.deliveryNoteNumber || 'لا يوجد'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Supplier Invoice Inputs */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <span className="font-black text-gray-900 block text-xs">
                  بيانات فاتورة / كشف حساب المورد الفعلي:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      رقم فاتورة المورد الرسمية *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: INV-98432 أو كشف حساب 42"
                      value={reconcileSupplierModal.supplierInvoiceNumber}
                      onChange={e => setReconcileSupplierModal({
                        ...reconcileSupplierModal,
                        supplierInvoiceNumber: e.target.value
                      })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl font-bold text-gray-900 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      value={reconcileSupplierModal.invoiceDate}
                      onChange={e => setReconcileSupplierModal({
                        ...reconcileSupplierModal,
                        invoiceDate: e.target.value
                      })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">الكمية/الوزن المفوتر</label>
                    <input
                      type="number"
                      step="any"
                      value={reconcileSupplierModal.actualQuantity || ''}
                      onChange={e => {
                        const q = parseFloat(e.target.value) || 0;
                        const rate = reconcileSupplierModal.actualRate || 0;
                        const newCost = (rate > 0 && q > 0) ? Math.round(q * rate) : reconcileSupplierModal.actualCost;
                        setReconcileSupplierModal({
                          ...reconcileSupplierModal,
                          actualQuantity: q,
                          actualCost: newCost
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-xl font-mono text-center text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">سعر الوحدة/الطن ج.م</label>
                    <input
                      type="number"
                      step="any"
                      value={reconcileSupplierModal.actualRate || ''}
                      onChange={e => {
                        const rate = parseFloat(e.target.value) || 0;
                        const q = reconcileSupplierModal.actualQuantity || 0;
                        const newCost = (rate > 0 && q > 0) ? Math.round(q * rate) : reconcileSupplierModal.actualCost;
                        setReconcileSupplierModal({
                          ...reconcileSupplierModal,
                          actualRate: rate,
                          actualCost: newCost
                        });
                      }}
                      className="w-full p-2 border border-gray-300 rounded-xl font-mono text-center text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-emerald-800 text-xs">إجمالي الفاتورة الفعلي (ج.م) *</label>
                      <button
                        type="button"
                        onClick={() => setReconcileSupplierModal(prev => prev ? ({ ...prev, actualCost: prev.estimatedCost }) : null)}
                        className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded font-bold"
                        title="نسخ التكلفة التقديرية المسجلة بأمر الشغل"
                      >
                        نسخ التقديري ({reconcileSupplierModal.estimatedCost.toLocaleString('en-US')})
                      </button>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="أدخل مبلغ الفاتورة المراد ترحيله"
                      value={reconcileSupplierModal.actualCost || ''}
                      onChange={e => setReconcileSupplierModal({
                        ...reconcileSupplierModal,
                        actualCost: parseFloat(e.target.value) || 0
                      })}
                      className="w-full p-2 border-2 border-emerald-500 rounded-xl font-black text-emerald-900 text-center text-sm bg-emerald-50/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">طريقة السداد</label>
                    <select
                      value={reconcileSupplierModal.paymentMethod}
                      onChange={e => setReconcileSupplierModal({
                        ...reconcileSupplierModal,
                        paymentMethod: e.target.value as any
                      })}
                      className="w-full p-2 border border-gray-300 rounded-xl text-xs"
                    >
                      <option value="اجل">أجل (حساب جاري المورد)</option>
                      <option value="نقدي">نقدي (من الخزينة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">ملاحظات المطابقة</label>
                    <input
                      type="text"
                      placeholder="مثال: متطابق مع كشف حساب شهر أكتوبر"
                      value={reconcileSupplierModal.notes}
                      onChange={e => setReconcileSupplierModal({
                        ...reconcileSupplierModal,
                        notes: e.target.value
                      })}
                      className="w-full p-2 border border-gray-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live Variance Analysis Pill */}
              {(() => {
                const diff = (reconcileSupplierModal.actualCost || 0) - (reconcileSupplierModal.estimatedCost || 0);
                return (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    diff < 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : diff > 0
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span>{diff < 0 ? '🟢' : diff > 0 ? '🟠' : '🔵'}</span>
                      <span>
                        {diff < 0
                          ? `وفر في التكلفة مقارنة بالتقديري: ${Math.abs(diff).toLocaleString('en-US')} ج.م`
                          : diff > 0
                          ? `تكلفة إضافية مقارنة بالتقديري: +${diff.toLocaleString('en-US')} ج.م`
                          : 'مطابق تماماً للتكلفة التقديرية المبدئية'}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-black">
                      {reconcileSupplierModal.actualCost.toLocaleString('en-US')} ج.م
                    </span>
                  </div>
                );
              })()}

              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700">
                💡 <strong>الأثر المالي:</strong> عند الضغط على زر الاعتماد أدناه، سيتم تلقائياً إصدار فاتورة مشتريات رسمية برقم <strong>{reconcileSupplierModal.supplierInvoiceNumber || '...'}</strong> وترحيل قيد دائن لحساب المورد <strong>{reconcileSupplierModal.supplierName}</strong> في كشف الحساب والأستاذ العام بمبلغ <strong>{reconcileSupplierModal.actualCost.toLocaleString('en-US')} ج.م</strong>.
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReconcileSupplierModal(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSupplierInvoice(
                  reconcileSupplierModal.orderId,
                  reconcileSupplierModal.opIndex,
                  {
                    supplierInvoiceNumber: reconcileSupplierModal.supplierInvoiceNumber,
                    actualQuantity: reconcileSupplierModal.actualQuantity,
                    actualRate: reconcileSupplierModal.actualRate,
                    actualCost: reconcileSupplierModal.actualCost,
                    invoiceDate: reconcileSupplierModal.invoiceDate,
                    paymentMethod: reconcileSupplierModal.paymentMethod,
                    notes: reconcileSupplierModal.notes
                  }
                )}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all"
              >
                <span>✅</span>
                <span>اعتماد وترحيل الفاتورة رسمياً لحساب المورد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingJobOrders;
