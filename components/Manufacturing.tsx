import React, { useState, useMemo } from 'react';
import type {
  Product, Warehouse, BillOfMaterials, BOMItem, ProductionOrder, ProductionPlan,
  StockTransaction, ProductionExpense, ProductionOperation, ProductionScrap, ProductionPlanItem,
  ModulePostingSettings, JournalEntry
} from '../types.ts';
import { showNotification } from '../services/notificationService.ts';

interface ManufacturingProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  warehouses: Warehouse[];
  billsOfMaterials: BillOfMaterials[];
  setBillsOfMaterials: React.Dispatch<React.SetStateAction<BillOfMaterials[]>>;
  productionOrders: ProductionOrder[];
  setProductionOrders: React.Dispatch<React.SetStateAction<ProductionOrder[]>>;
  productionPlans: ProductionPlan[];
  setProductionPlans: React.Dispatch<React.SetStateAction<ProductionPlan[]>>;
  stockTransactions: StockTransaction[];
  setStockTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
  createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string }) => void;
  logAction: (action: string) => void;
  accounts: any[];
  customers?: any[];
  journalEntries?: JournalEntry[];
  setJournalEntries?: React.Dispatch<React.SetStateAction<any[]>>;
  initialOrderData?: Partial<ProductionOrder> | null;
  onClearInitialData?: () => void;
  postingSettings?: ModulePostingSettings;
  onOpenSettings?: () => void;
}

// ==================== Helper ====================
const generateCode = (prefix: string) => `${prefix}${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`;

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 border border-gray-300' },
    in_progress: { label: 'قيد التشغيل', color: 'bg-blue-100 text-blue-800 border border-blue-200' },
    completed: { label: 'مكتمل ومرحّل', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700 border border-red-200' },
    active: { label: 'نشط', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-600 border border-gray-200' },
  };
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${s.color}`}>{s.label}</span>;
};

// ==================== Main Component ====================
const Manufacturing: React.FC<ManufacturingProps> = ({
  products, setProducts, warehouses, billsOfMaterials, setBillsOfMaterials,
  productionOrders, setProductionOrders, productionPlans, setProductionPlans,
  stockTransactions, setStockTransactions, createJournalEntry, logAction, accounts, customers = [],
  journalEntries = [], setJournalEntries,
  initialOrderData, onClearInitialData, postingSettings, onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'bom' | 'plans'>('orders');

  // ---- Filtering & Search ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ---- Modals Visibility ----
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [editingBOMId, setEditingBOMId] = useState<string | null>(null);
  const [viewingBOM, setViewingBOM] = useState<BillOfMaterials | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<ProductionPlan | null>(null);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  const [viewingOrderTab, setViewingOrderTab] = useState<'details' | 'materials' | 'stock' | 'journal'>('details');

  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executingOrder, setExecutingOrder] = useState<ProductionOrder | null>(null);
  const [actualQty, setActualQty] = useState(0);

  const [printingOrder, setPrintingOrder] = useState<ProductionOrder | null>(null);

  // ---- BOM Form ----
  const emptyBOM = (): Partial<BillOfMaterials> => ({
    code: generateCode('BOM'), name: '', outputProductId: '', outputQuantity: 1, items: [], status: 'active', notes: ''
  });
  const [bomForm, setBomForm] = useState<Partial<BillOfMaterials>>(emptyBOM());

  const selectedBOMOutputProd = useMemo(() => {
    return products.find(p => p.id === bomForm.outputProductId);
  }, [bomForm.outputProductId, products]);

  const handleAddBOMItem = () => setBomForm(p => ({
    ...p,
    items: [...(p.items || []), { productId: '', productName: '', quantity: 1, unit: '', unitCost: 0, totalCost: 0 }]
  }));

  const handleBOMItemChange = (idx: number, field: string, val: any) => {
    const items = [...(bomForm.items || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      const q = items[idx]?.quantity || 1;
      const uc = prod?.costPrice || 0;
      items[idx] = {
        ...items[idx],
        productId: val,
        productName: prod?.name || '',
        unit: prod?.unit || 'قطعة',
        unitCost: uc,
        totalCost: q * uc
      };
    } else if (field === 'quantity') {
      const q = Number(val);
      const uc = items[idx]?.unitCost || 0;
      items[idx] = { ...items[idx], quantity: q, totalCost: q * uc };
    } else {
      items[idx] = { ...items[idx], [field]: val };
    }
    setBomForm(p => ({ ...p, items }));
  };

  const handleRemoveBOMItem = (idx: number) => setBomForm(p => ({
    ...p,
    items: (p.items || []).filter((_, i) => i !== idx)
  }));

  const handleSaveBOM = () => {
    if (!bomForm.name || !bomForm.outputProductId || !(bomForm.items || []).length) {
      return alert('الرجاء إدخال اسم القائمة وتحديد المنتج النهائي وإضافة خامة واحدة على الأقل');
    }
    const prod = products.find(p => p.id === bomForm.outputProductId);
    const totalCost = (bomForm.items || []).reduce((s, i) => {
      const p = products.find(x => x.id === i.productId);
      return s + (i.quantity * (p?.costPrice || i.unitCost || 0));
    }, 0);

    if (editingBOMId) {
      setBillsOfMaterials(prev => prev.map(b => b.id === editingBOMId ? {
        ...b,
        name: bomForm.name!,
        outputProductId: bomForm.outputProductId!,
        outputProductName: prod?.name || b.outputProductName,
        outputQuantity: Number(bomForm.outputQuantity) || 1,
        outputUnit: prod?.unit || b.outputUnit,
        items: bomForm.items || [],
        status: bomForm.status || 'active',
        notes: bomForm.notes,
        totalCost
      } : b));
      logAction(`تعديل قائمة مواد الإنتاج: ${bomForm.name}`);
      alert('✅ تم تعديل قائمة المواد بنجاح');
    } else {
      const bom: BillOfMaterials = {
        id: `BOM-${Date.now()}`,
        code: bomForm.code || generateCode('BOM'),
        name: bomForm.name!,
        outputProductId: bomForm.outputProductId!,
        outputProductName: prod?.name || '',
        outputQuantity: Number(bomForm.outputQuantity) || 1,
        outputUnit: prod?.unit || 'قطعة',
        items: bomForm.items || [],
        status: bomForm.status || 'active',
        notes: bomForm.notes,
        totalCost,
        isDefault: true,
        createdAt: new Date().toISOString()
      };
      setBillsOfMaterials(prev => [bom, ...prev]);
      logAction(`إضافة قائمة مواد جديدة: ${bom.name}`);
      alert('✅ تم حفظ قائمة المواد الجديدة بنجاح');
    }

    setShowBOMModal(false);
    setEditingBOMId(null);
    setBomForm(emptyBOM());
  };

  const handleEditBOM = (bom: BillOfMaterials) => {
    setEditingBOMId(bom.id);
    setBomForm({ ...bom });
    setShowBOMModal(true);
  };

  const handleDeleteBOM = (bom: BillOfMaterials) => {
    if (window.confirm(`هل أنت متأكد من حذف قائمة المواد (${bom.name})؟`)) {
      setBillsOfMaterials(prev => prev.filter(b => b.id !== bom.id));
      logAction(`حذف قائمة مواد: ${bom.name}`);
    }
  };

  // ---- Plan Form ----
  const emptyPlan = (): Partial<ProductionPlan> => ({
    code: generateCode('PLN'), name: '', description: '', date: new Date().toISOString().split('T')[0],
    fromDate: '', toDate: '', customerId: '', employeeIds: [], sourceType: '', sourceRef: '',
    warehouseId: warehouses[0]?.id || '', costAccountId: '', items: [], status: 'draft'
  });
  const [planForm, setPlanForm] = useState<Partial<ProductionPlan>>(emptyPlan());

  const handleAddPlanItem = () => setPlanForm(p => ({
    ...p, items: [...(p.items || []), { productId: '', productName: '', bomId: '', bomName: '', quantity: 1 }]
  }));

  const handlePlanItemChange = (idx: number, field: string, val: any) => {
    const items = [...(planForm.items || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      // Auto find default or first BOM for this product
      const matchingBOM = billsOfMaterials.find(b => b.outputProductId === val && b.status === 'active');
      items[idx] = {
        ...items[idx],
        productId: val,
        productName: prod?.name || '',
        bomId: matchingBOM?.id || '',
        bomName: matchingBOM?.name || ''
      };
    } else if (field === 'bomId') {
      const bom = billsOfMaterials.find(b => b.id === val);
      items[idx] = {
        ...items[idx],
        bomId: val,
        bomName: bom?.name || '',
        productId: bom?.outputProductId || items[idx].productId,
        productName: bom?.outputProductName || items[idx].productName
      };
    } else {
      items[idx] = { ...items[idx], [field]: val };
    }
    setPlanForm(p => ({ ...p, items }));
  };

  const handleRemovePlanItem = (idx: number) => setPlanForm(p => ({
    ...p, items: (p.items || []).filter((_, i) => i !== idx)
  }));

  const handleSavePlan = () => {
    if (!planForm.name || !(planForm.items || []).length) {
      return alert('الرجاء إدخال اسم الخطة وإضافة منتج واحد على الأقل للإنتاج');
    }
    const plan: ProductionPlan = {
      id: `PLAN-${Date.now()}`,
      code: planForm.code || generateCode('PLN'),
      name: planForm.name!,
      description: planForm.description || '',
      date: planForm.date || new Date().toISOString().split('T')[0],
      fromDate: planForm.fromDate || '',
      toDate: planForm.toDate || '',
      customerId: planForm.customerId,
      customerName: customers.find(c => c.id === planForm.customerId)?.name,
      employeeIds: planForm.employeeIds || [],
      sourceType: planForm.sourceType,
      sourceRef: planForm.sourceRef,
      warehouseId: planForm.warehouseId || warehouses[0]?.id || '',
      costAccountId: planForm.costAccountId || '',
      items: planForm.items || [],
      status: 'draft',
      createdAt: new Date().toISOString()
    };
    setProductionPlans(prev => [plan, ...prev]);
    logAction(`إضافة خطة تشغيل: ${plan.name}`);
    setShowPlanModal(false);
    setPlanForm(emptyPlan());
    alert('✅ تم حفظ خطة التشغيل بنجاح');
  };

  const handleConvertPlanItemToOrder = (plan: ProductionPlan, item: ProductionPlanItem) => {
    const bom = billsOfMaterials.find(b => b.id === item.bomId) || billsOfMaterials.find(b => b.outputProductId === item.productId);
    const prod = products.find(p => p.id === item.productId);
    const plannedQty = item.quantity || 1;

    let bomItems: BOMItem[] = [];
    let rawCost = 0;
    if (bom) {
      bomItems = bom.items.map(i => {
        const p = products.find(x => x.id === i.productId);
        const qty = i.quantity * plannedQty;
        const uc = p?.costPrice || i.unitCost || 0;
        return { ...i, quantity: qty, unitCost: uc, totalCost: qty * uc };
      });
      rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
    }

    const newOrder: Partial<ProductionOrder> = {
      code: generateCode('MFG'),
      name: `أمر تصنيع: ${item.productName} (خطة ${plan.code})`,
      planId: plan.id,
      date: new Date().toISOString().split('T')[0],
      fromDate: plan.fromDate || new Date().toISOString().split('T')[0],
      toDate: plan.toDate || '',
      customerId: plan.customerId,
      customerName: plan.customerName,
      plannedQuantity: plannedQty,
      bomId: bom?.id || '',
      bomName: bom?.name || '',
      outputProductId: item.productId,
      outputProductName: item.productName || prod?.name || '',
      outputWarehouseId: plan.warehouseId || warehouses[0]?.id || '',
      bomItems,
      rawMaterialCost: rawCost,
      status: 'in_progress',
      notes: `منشأ بناءً على خطة الإنتاج (${plan.name} - كود ${plan.code})`
    };

    setOrderForm(newOrder);
    setEditingOrderId(null);
    setActiveTab('orders');
    setShowOrderModal(true);
  };

  // ---- Order Form ----
  const emptyOrder = (): Partial<ProductionOrder> => ({
    code: generateCode('MFG'), name: '', bomId: '', date: new Date().toISOString().split('T')[0],
    fromDate: new Date().toISOString().split('T')[0], toDate: '',
    customerId: '', employeeIds: [], accountId: '', plannedQuantity: 1,
    bomItems: [], expenses: [], operations: [], scraps: [],
    rawMaterialCost: 0, expensesTotalCost: 0, operationsTotalCost: 0,
    scrapTotalCost: 0, totalCost: 0, unitCost: 0, status: 'in_progress',
    outputProductId: '', outputProductName: '', outputWarehouseId: warehouses[0]?.id || ''
  });
  const [orderForm, setOrderForm] = useState<Partial<ProductionOrder>>(emptyOrder());
  const [orderSubTab, setOrderSubTab] = useState<'materials' | 'expenses' | 'operations' | 'scraps'>('materials');

  React.useEffect(() => {
    if (initialOrderData) {
      setActiveTab('orders');
      setOrderForm(prev => ({ ...prev, ...initialOrderData }));
      setShowOrderModal(true);
      if (onClearInitialData) onClearInitialData();
    }
  }, [initialOrderData, onClearInitialData]);

  // When output product is changed directly
  const handleOrderOutputProductChange = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) {
      return setOrderForm(p => ({
        ...p, outputProductId: '', outputProductName: '', bomId: '', bomName: '', bomItems: [], rawMaterialCost: 0
      }));
    }
    // Find matching BOM
    const matchingBOM = billsOfMaterials.find(b => b.outputProductId === prodId && b.status === 'active') || billsOfMaterials.find(b => b.outputProductId === prodId);
    if (matchingBOM) {
      handleOrderBOMChange(matchingBOM.id, prodId);
    } else {
      setOrderForm(p => ({
        ...p,
        outputProductId: prodId,
        outputProductName: prod.name,
        name: p.name || `أمر تصنيع: ${prod.name}`,
        bomId: '',
        bomName: '',
        bomItems: [],
        rawMaterialCost: 0
      }));
    }
  };

  const handleOrderBOMChange = (bomId: string, overrideProdId?: string) => {
    const bom = billsOfMaterials.find(b => b.id === bomId);
    if (!bom) {
      return setOrderForm(p => ({ ...p, bomId: '', bomName: '', bomItems: [], rawMaterialCost: 0 }));
    }
    const targetProdId = overrideProdId || bom.outputProductId;
    const prod = products.find(x => x.id === targetProdId);
    const plannedQty = Number(orderForm.plannedQuantity || 1);
    const bomItems = bom.items.map(i => {
      const p = products.find(x => x.id === i.productId);
      const qty = i.quantity * plannedQty;
      const uc = p?.costPrice || i.unitCost || 0;
      return { ...i, quantity: qty, unitCost: uc, totalCost: qty * uc };
    });
    const rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
    setOrderForm(p => ({
      ...p,
      bomId,
      bomName: bom.name,
      bomItems,
      rawMaterialCost: rawCost,
      outputProductId: targetProdId,
      outputProductName: prod?.name || bom.outputProductName,
      name: p.name || `تصنيع: ${prod?.name || bom.outputProductName}`,
      outputWarehouseId: p.outputWarehouseId || warehouses[0]?.id || ''
    }));
  };

  const handleOrderQtyChange = (qty: number) => {
    const validQty = Math.max(1, qty || 1);
    const bom = billsOfMaterials.find(b => b.id === orderForm.bomId);
    if (bom) {
      const bomItems = bom.items.map(i => {
        const p = products.find(x => x.id === i.productId);
        const newQty = i.quantity * validQty;
        const uc = p?.costPrice || i.unitCost || 0;
        return { ...i, quantity: newQty, unitCost: uc, totalCost: newQty * uc };
      });
      const rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
      setOrderForm(p => ({ ...p, plannedQuantity: validQty, bomItems, rawMaterialCost: rawCost }));
    } else if (orderForm.bomItems && orderForm.bomItems.length > 0) {
      // Scale existing items proportionally
      const oldQty = orderForm.plannedQuantity || 1;
      const scale = validQty / oldQty;
      const bomItems = orderForm.bomItems.map(i => {
        const newQty = i.quantity * scale;
        const uc = i.unitCost || 0;
        return { ...i, quantity: newQty, totalCost: newQty * uc };
      });
      const rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
      setOrderForm(p => ({ ...p, plannedQuantity: validQty, bomItems, rawMaterialCost: rawCost }));
    } else {
      setOrderForm(p => ({ ...p, plannedQuantity: validQty }));
    }
  };

  // Manual raw material add/edit inside order
  const handleAddOrderMaterial = () => {
    setOrderForm(p => ({
      ...p,
      bomItems: [...(p.bomItems || []), { productId: '', productName: '', quantity: 1, unit: 'قطعة', unitCost: 0, totalCost: 0 }]
    }));
  };

  const handleOrderMaterialChange = (idx: number, field: string, val: any) => {
    const items = [...(orderForm.bomItems || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      const q = items[idx]?.quantity || 1;
      const uc = prod?.costPrice || 0;
      items[idx] = { ...items[idx], productId: val, productName: prod?.name || '', unit: prod?.unit || 'قطعة', unitCost: uc, totalCost: q * uc };
    } else if (field === 'quantity') {
      const q = Number(val);
      const uc = items[idx]?.unitCost || 0;
      items[idx] = { ...items[idx], quantity: q, totalCost: q * uc };
    } else if (field === 'unitCost') {
      const uc = Number(val);
      const q = items[idx]?.quantity || 0;
      items[idx] = { ...items[idx], unitCost: uc, totalCost: q * uc };
    } else {
      items[idx] = { ...items[idx], [field]: val };
    }
    const rawCost = items.reduce((s, i) => s + (i.totalCost || 0), 0);
    setOrderForm(p => ({ ...p, bomItems: items, rawMaterialCost: rawCost }));
  };

  const handleRemoveOrderMaterial = (idx: number) => {
    const items = (orderForm.bomItems || []).filter((_, i) => i !== idx);
    const rawCost = items.reduce((s, i) => s + (i.totalCost || 0), 0);
    setOrderForm(p => ({ ...p, bomItems: items, rawMaterialCost: rawCost }));
  };

  // Expenses
  const addExpense = () => setOrderForm(p => ({ ...p, expenses: [...(p.expenses || []), { id: `E-${Date.now()}`, description: '', accountId: '', accountName: '', amount: 0 }] }));
  const updateExpense = (idx: number, field: string, val: any) => {
    const exp = [...(orderForm.expenses || [])];
    if (field === 'accountId') {
      const acc = accounts.find(a => a.id === val);
      exp[idx] = { ...exp[idx], accountId: val, accountName: acc?.name || '' };
    } else { exp[idx] = { ...exp[idx], [field]: val }; }
    const total = exp.reduce((s, e) => s + Number(e.amount || 0), 0);
    setOrderForm(p => ({ ...p, expenses: exp, expensesTotalCost: total }));
  };
  const removeExpense = (idx: number) => {
    const exp = (orderForm.expenses || []).filter((_, i) => i !== idx);
    setOrderForm(p => ({ ...p, expenses: exp, expensesTotalCost: exp.reduce((s, e) => s + Number(e.amount || 0), 0) }));
  };

  // Operations
  const addOperation = () => setOrderForm(p => ({ ...p, operations: [...(p.operations || []), { id: `OP-${Date.now()}`, name: '', totalCost: 0 }] }));
  const updateOperation = (idx: number, field: string, val: any) => {
    const ops = [...(orderForm.operations || [])];
    ops[idx] = { ...ops[idx], [field]: val };
    const total = ops.reduce((s, o) => s + Number(o.totalCost || 0), 0);
    setOrderForm(p => ({ ...p, operations: ops, operationsTotalCost: total }));
  };
  const removeOperation = (idx: number) => {
    const ops = (orderForm.operations || []).filter((_, i) => i !== idx);
    setOrderForm(p => ({ ...p, operations: ops, operationsTotalCost: ops.reduce((s, o) => s + Number(o.totalCost || 0), 0) }));
  };

  // Scraps
  const addScrap = () => setOrderForm(p => ({ ...p, scraps: [...(p.scraps || []), { id: `SC-${Date.now()}`, productId: '', productName: '', quantity: 0, unit: '' }] }));
  const updateScrap = (idx: number, field: string, val: any) => {
    const scraps = [...(orderForm.scraps || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      scraps[idx] = { ...scraps[idx], productId: val, productName: prod?.name || '', unit: prod?.unit || '', unitCost: prod?.costPrice || 0, totalCost: (scraps[idx].quantity || 0) * (prod?.costPrice || 0) };
    } else if (field === 'quantity') {
      scraps[idx] = { ...scraps[idx], quantity: Number(val), totalCost: Number(val) * (scraps[idx].unitCost || 0) };
    } else { scraps[idx] = { ...scraps[idx], [field]: val }; }
    const total = scraps.reduce((s, sc) => s + (sc.totalCost || 0), 0);
    setOrderForm(p => ({ ...p, scraps, scrapTotalCost: total }));
  };
  const removeScrap = (idx: number) => {
    const scraps = (orderForm.scraps || []).filter((_, i) => i !== idx);
    setOrderForm(p => ({ ...p, scraps, scrapTotalCost: scraps.reduce((s, sc) => s + (sc.totalCost || 0), 0) }));
  };

  const totalOrderCost = useMemo(() => {
    const raw = orderForm.rawMaterialCost || 0;
    const exp = orderForm.expensesTotalCost || 0;
    const ops = orderForm.operationsTotalCost || 0;
    return raw + exp + ops;
  }, [orderForm.rawMaterialCost, orderForm.expensesTotalCost, orderForm.operationsTotalCost]);

  const handleSaveOrder = (asDraft = false) => {
    if (!orderForm.name || !orderForm.outputProductId) {
      return alert('الرجاء إدخال اسم أمر التصنيع وتحديد المنتج النهائي المراد إنتاجه');
    }
    const plannedQty = Number(orderForm.plannedQuantity || 1);
    const unitCost = plannedQty > 0 ? totalOrderCost / plannedQty : 0;

    if (editingOrderId) {
      setProductionOrders(prev => prev.map(o => o.id === editingOrderId ? {
        ...o,
        name: orderForm.name!,
        bomId: orderForm.bomId || '',
        bomName: orderForm.bomName || '',
        date: orderForm.date!,
        fromDate: orderForm.fromDate || '',
        toDate: orderForm.toDate || '',
        customerId: orderForm.customerId,
        customerName: customers.find(c => c.id === orderForm.customerId)?.name,
        employeeIds: orderForm.employeeIds || [],
        accountId: orderForm.accountId,
        accountName: accounts.find(a => a.id === orderForm.accountId)?.name,
        plannedQuantity: plannedQty,
        status: asDraft ? 'draft' : (o.status === 'draft' ? 'in_progress' : o.status),
        bomItems: orderForm.bomItems || [],
        rawMaterialCost: orderForm.rawMaterialCost || 0,
        expenses: orderForm.expenses || [],
        expensesTotalCost: orderForm.expensesTotalCost || 0,
        operations: orderForm.operations || [],
        operationsTotalCost: orderForm.operationsTotalCost || 0,
        scraps: orderForm.scraps || [],
        scrapTotalCost: orderForm.scrapTotalCost || 0,
        totalCost: totalOrderCost,
        unitCost,
        outputProductId: orderForm.outputProductId || '',
        outputProductName: orderForm.outputProductName || '',
        outputWarehouseId: orderForm.outputWarehouseId || warehouses[0]?.id || '',
        notes: orderForm.notes
      } : o));
      logAction(`تعديل أمر تصنيع: ${orderForm.code}`);
      alert('✅ تم تعديل أمر التصنيع بنجاح');
    } else {
      const order: ProductionOrder = {
        id: `MFG-${Date.now()}`,
        code: orderForm.code || generateCode('MFG'),
        name: orderForm.name!,
        bomId: orderForm.bomId || '',
        bomName: orderForm.bomName || '',
        date: orderForm.date || new Date().toISOString().split('T')[0],
        fromDate: orderForm.fromDate || '',
        toDate: orderForm.toDate || '',
        customerId: orderForm.customerId,
        customerName: customers.find(c => c.id === orderForm.customerId)?.name,
        employeeIds: orderForm.employeeIds || [],
        accountId: orderForm.accountId,
        accountName: accounts.find(a => a.id === orderForm.accountId)?.name,
        plannedQuantity: plannedQty,
        producedQuantity: 0,
        wasteQuantity: 0,
        status: asDraft ? 'draft' : 'in_progress',
        bomItems: orderForm.bomItems || [],
        rawMaterialCost: orderForm.rawMaterialCost || 0,
        expenses: orderForm.expenses || [],
        expensesTotalCost: orderForm.expensesTotalCost || 0,
        operations: orderForm.operations || [],
        operationsTotalCost: orderForm.operationsTotalCost || 0,
        scraps: orderForm.scraps || [],
        scrapTotalCost: orderForm.scrapTotalCost || 0,
        totalCost: totalOrderCost,
        unitCost,
        outputProductId: orderForm.outputProductId || '',
        outputProductName: orderForm.outputProductName || '',
        outputWarehouseId: orderForm.outputWarehouseId || warehouses[0]?.id || '',
        notes: orderForm.notes,
        createdAt: new Date().toISOString()
      };
      setProductionOrders(prev => [order, ...prev]);
      logAction(`إنشاء أمر تصنيع: ${order.code} (${order.name})`);
      alert('✅ تم إنشاء أمر التصنيع بنجاح');
    }

    setShowOrderModal(false);
    setEditingOrderId(null);
    setOrderForm(emptyOrder());
    setOrderSubTab('materials');
  };

  const handleEditOrder = (order: ProductionOrder) => {
    if (order.status === 'completed') {
      return alert('لا يمكن تعديل أمر تصنيع تم تنفيذه وترحيله مسبقاً. يمكنك إلغاء الترحيل أولاً لإعادة التعديل.');
    }
    setEditingOrderId(order.id);
    setOrderForm({ ...order });
    setShowOrderModal(true);
  };

  const handleDeleteOrder = (order: ProductionOrder) => {
    if (order.status === 'completed') {
      return alert('لا يمكن حذف أمر تصنيع مرحّل ومكتمل. يرجى إلغاء الترحيل أولاً لحذف القيود والحركات المخزنية.');
    }
    if (window.confirm(`هل أنت متأكد من حذف أمر التصنيع رقم (${order.code})؟`)) {
      setProductionOrders(prev => prev.filter(o => o.id !== order.id));
      logAction(`حذف أمر تصنيع: ${order.code}`);
    }
  };

  // ---- Execute / Post Order ----
  const executeProduction = () => {
    if (!executingOrder) return;
    if (actualQty <= 0) return alert('الكمية المنتجة غير صحيحة');

    const useBomItems = (executingOrder.bomItems || []).length > 0;
    const ratio = useBomItems
      ? (actualQty / (executingOrder.plannedQuantity || 1))
      : 1;

    const productionRatio = actualQty / (executingOrder.plannedQuantity || 1);
    const proratedExpensesCost = (executingOrder.expensesTotalCost || 0) * productionRatio;
    const proratedOperationsCost = (executingOrder.operationsTotalCost || 0) * productionRatio;

    let totalRawCost = 0;
    const stockUpdates: StockTransaction[] = [];
    const productUpdates = [...products];
    const warnings: string[] = [];

    // 1. Deduct raw materials
    (executingOrder.bomItems || []).forEach(item => {
      const requiredQty = item.quantity * ratio;
      const pIdx = productUpdates.findIndex(p => p.id === item.productId);
      if (pIdx === -1) return;
      const prod = productUpdates[pIdx];

      if (prod.quantity < requiredQty) {
        warnings.push(`⚠️ نقص خامة: ${prod.name} (المتاح بالمخزن: ${prod.quantity.toFixed(2)} - المطلوب للصرف: ${requiredQty.toFixed(2)})`);
      }

      const itemCost = requiredQty * (prod.costPrice || item.unitCost || 0);
      totalRawCost += itemCost;
      const newQty = prod.quantity - requiredQty;
      productUpdates[pIdx] = { ...prod, quantity: newQty };

      stockUpdates.push({
        id: `ST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: executingOrder.date,
        productId: prod.id,
        productName: prod.name,
        type: 'production_out',
        quantityOut: requiredQty,
        quantityIn: 0,
        balanceAfter: newQty,
        referenceId: executingOrder.id,
        notes: `صرف خامات لأمر تصنيع ${executingOrder.code} (${executingOrder.name})`,
        unitCost: prod.costPrice || item.unitCost || 0,
        totalCost: itemCost,
        createdAt: new Date().toISOString()
      });
    });

    // 1b. Scrap deduction
    if (executingOrder.scraps && executingOrder.scraps.length > 0) {
      executingOrder.scraps.forEach(scrap => {
        if (!scrap.productId || scrap.quantity <= 0) return;
        const pIdx = productUpdates.findIndex(p => p.id === scrap.productId);
        if (pIdx !== -1) {
          const prod = productUpdates[pIdx];
          const newQty = prod.quantity - scrap.quantity;
          productUpdates[pIdx] = { ...prod, quantity: newQty };
          const itemCost = scrap.quantity * (prod.costPrice || scrap.unitCost || 0);
          stockUpdates.push({
            id: `ST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            date: executingOrder.date,
            productId: prod.id,
            productName: prod.name,
            type: 'adjustment_out',
            quantityIn: 0,
            quantityOut: scrap.quantity,
            balanceAfter: newQty,
            referenceId: executingOrder.id,
            notes: `هالك إنتاج - أمر تصنيع ${executingOrder.code}`,
            unitCost: prod.costPrice || scrap.unitCost || 0,
            totalCost: itemCost,
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    if (warnings.length > 0) {
      const proceed = window.confirm(`${warnings.join('\n')}\n\nهل تريد المتابعة بالترحيل وصرف المواد بالسالب؟`);
      if (!proceed) return;
    }

    // 2. Add finished goods with weighted average cost
    const totalCostAll = totalRawCost + proratedExpensesCost + proratedOperationsCost;
    const unitCost = actualQty > 0 ? totalCostAll / actualQty : 0;

    const outIdx = productUpdates.findIndex(p => p.id === executingOrder.outputProductId);
    if (outIdx !== -1) {
      const outProd = productUpdates[outIdx];
      const existingValue = outProd.quantity * outProd.costPrice;
      const newValue = actualQty * unitCost;
      const totalNewQty = outProd.quantity + actualQty;
      const weightedAvgCost = totalNewQty > 0 ? (existingValue + newValue) / totalNewQty : unitCost;

      productUpdates[outIdx] = { ...outProd, quantity: totalNewQty, costPrice: weightedAvgCost };
      stockUpdates.push({
        id: `ST-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: executingOrder.date,
        productId: outProd.id,
        productName: outProd.name,
        type: 'production_in',
        quantityIn: actualQty,
        quantityOut: 0,
        balanceAfter: totalNewQty,
        referenceId: executingOrder.id,
        notes: `توريد إنتاج تام - أمر تصنيع ${executingOrder.code}`,
        unitCost: unitCost,
        totalCost: totalCostAll,
        createdAt: new Date().toISOString()
      });
    }

    setProducts(productUpdates);
    setStockTransactions(prev => [...stockUpdates, ...prev]);

    // 3. Accounting Journal Entry
    const wipAccId = postingSettings?.mfgWipAccountId || '110402';
    const wipAccName = accounts.find(a => a.id === wipAccId)?.name || 'حساب التصنيع (WIP)';
    const rawAccId = postingSettings?.mfgRawMaterialAccountId || '110401';
    const rawAccName = accounts.find(a => a.id === rawAccId)?.name || 'مخزون الخامات';
    const subAccId = postingSettings?.mfgSubcontractorAccountId || '2101';
    const subAccName = accounts.find(a => a.id === subAccId)?.name || 'الموردين - مصنعيات الغير';
    const fgAccId = postingSettings?.mfgFinishedGoodsAccountId || '110403';
    const fgAccName = accounts.find(a => a.id === fgAccId)?.name || 'مخزون الإنتاج التام';
    const scrapAccId = postingSettings?.mfgScrapLossAccountId || '5203';
    const scrapAccName = accounts.find(a => a.id === scrapAccId)?.name || 'هالك إنتاج';

    const jLines: any[] = [
      { accountId: wipAccId, accountName: wipAccName, debit: totalCostAll, credit: 0 },
      { accountId: rawAccId, accountName: rawAccName, debit: 0, credit: totalRawCost },
    ];

    executingOrder.expenses.forEach(e => {
      const proratedAmt = e.amount * productionRatio;
      if (proratedAmt > 0) {
        jLines.push({ accountId: e.accountId, accountName: e.accountName, debit: 0, credit: proratedAmt });
      }
    });

    if (proratedOperationsCost > 0) {
      jLines.push({ accountId: subAccId, accountName: subAccName, debit: 0, credit: proratedOperationsCost });
    }

    // Move from WIP to Finished Goods
    jLines.push({ accountId: fgAccId, accountName: fgAccName, debit: totalCostAll, credit: 0 });
    jLines.push({ accountId: wipAccId, accountName: wipAccName, debit: 0, credit: totalCostAll });

    if (executingOrder.scrapTotalCost > 0) {
      jLines.push({ accountId: scrapAccId, accountName: scrapAccName, debit: executingOrder.scrapTotalCost, credit: 0 });
      jLines.push({ accountId: rawAccId, accountName: rawAccName, debit: 0, credit: executingOrder.scrapTotalCost });
    }

    const createdEntryId = createJournalEntry({
      description: `تنفيذ وترحيل أمر تصنيع ${executingOrder.code} - ${executingOrder.outputProductName} (${actualQty} وحدة)`,
      date: new Date().toISOString().split('T')[0],
      referenceType: 'Manual',
      referenceId: executingOrder.id,
      lines: jLines
    });

    // 4. Update order with completed status and entry link
    const updatedOrder: ProductionOrder = {
      ...executingOrder,
      status: 'completed',
      producedQuantity: actualQty,
      rawMaterialCost: totalRawCost,
      expensesTotalCost: proratedExpensesCost,
      operationsTotalCost: proratedOperationsCost,
      totalCost: totalCostAll,
      unitCost,
      journalEntryId: (createdEntryId as any) || undefined
    };
    setProductionOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    logAction(`تنفيذ أمر تصنيع: ${updatedOrder.code} - إنتاج ${actualQty} وحدة - تكلفة الوحدة: ${unitCost.toFixed(2)} ج.م`);

    showNotification({
      type: 'success',
      title: 'تم إتمام أمر الإنتاج والتصنيع',
      message: `أمر #${updatedOrder.code} - إنتاج ${actualQty} من (${updatedOrder.outputProductName}) بتكلفة ${totalCostAll.toLocaleString()} ج.م`,
      sound: 'success',
      category: 'manufacturing'
    });

    setShowExecuteModal(false);
    setExecutingOrder(null);
    alert(`✅ تم تنفيذ وترحيل أمر التصنيع بنجاح!\n📦 تم توريد ${actualQty} وحدة تامة إلى المخزن بتكلفة ${unitCost.toFixed(2)} ج.م/وحدة\n💰 إجمالي تكلفة الأمر: ${totalCostAll.toFixed(2)} ج.م\n📝 تم تسجيل القيد المحاسبي وحركات الصرف والإضافة تلقائياً.`);
  };

  // ---- ROLLBACK / REVERSE EXECUTED ORDER ----
  const handleRollbackOrder = (order: ProductionOrder) => {
    if (order.status !== 'completed') return;

    const confirmRollback = window.confirm(
      `هل أنت متأكد تماماً من رغبتك في إلغاء ترحيل أمر التصنيع رقم (${order.code})؟\n\n` +
      `سيترتب على هذا الإجراء:\n` +
      `1. استرجاع كميات الخامات المسحوبة بالكامل إلى المخزون.\n` +
      `2. خصم كمية المنتج التام (${order.producedQuantity || order.plannedQuantity}) من رصيد المخزون.\n` +
      `3. إلغاء وحذف كافة القيود المحاسبية وحركات المخزون الناتجة عن هذا الأمر.\n` +
      `4. إعادة حالة أمر التصنيع إلى (قيد التشغيل) لتتمكن من التعديل عليه أو إعادة تنفيذه لاحقاً.`
    );
    if (!confirmRollback) return;

    const relatedTransactions = stockTransactions.filter(st => st.referenceId === order.id);
    const productUpdates = [...products];
    const warnings: string[] = [];

    // 1. Restore Raw Materials
    relatedTransactions
      .filter(st => st.type === 'production_out')
      .forEach(tx => {
        const pIdx = productUpdates.findIndex(p => p.id === tx.productId);
        if (pIdx !== -1) {
          const p = productUpdates[pIdx];
          productUpdates[pIdx] = { ...p, quantity: p.quantity + tx.quantityOut };
        }
      });

    // 1b. Restore Scrap
    relatedTransactions
      .filter(st => st.type === 'adjustment_out')
      .forEach(tx => {
        const pIdx = productUpdates.findIndex(p => p.id === tx.productId);
        if (pIdx !== -1) {
          const p = productUpdates[pIdx];
          productUpdates[pIdx] = { ...p, quantity: p.quantity + tx.quantityOut };
        }
      });

    // 2. Deduct Finished Goods
    const fgTx = relatedTransactions.find(st => st.type === 'production_in');
    const qtyToDeduct = fgTx ? fgTx.quantityIn : (order.producedQuantity || order.plannedQuantity);
    const fgIdx = productUpdates.findIndex(p => p.id === order.outputProductId);
    if (fgIdx !== -1) {
      const fg = productUpdates[fgIdx];
      if (fg.quantity < qtyToDeduct) {
        warnings.push(`⚠️ تنبيه: رصيد المنتج التام بالمخزن حالياً (${fg.quantity}) أقل من الكمية المصنعة المراد استرجاعها (${qtyToDeduct}). سيصبح الرصيد سالباً.`);
      }
      productUpdates[fgIdx] = { ...fg, quantity: fg.quantity - qtyToDeduct };
    }

    if (warnings.length > 0) {
      const proceed = window.confirm(`${warnings.join('\n')}\n\nهل تريد المتابعة وإتمام إلغاء الترحيل؟`);
      if (!proceed) return;
    }

    // Apply Product Updates
    setProducts(productUpdates);

    // Remove Stock Transactions
    setStockTransactions(prev => prev.filter(st => st.referenceId !== order.id));

    // Remove Linked Journal Entry
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(je => je.referenceId !== order.id && je.id !== order.journalEntryId));
    }

    // Reset Order Status back to in_progress
    const revertedOrder: ProductionOrder = {
      ...order,
      status: 'in_progress',
      producedQuantity: 0,
      journalEntryId: undefined
    };
    setProductionOrders(prev => prev.map(o => o.id === order.id ? revertedOrder : o));

    if (viewingOrder?.id === order.id) {
      setViewingOrder(revertedOrder);
    }

    logAction(`إلغاء ترحيل أمر التصنيع: ${order.code} - استعادة الخامات وإلغاء القيود`);
    alert(`✅ تم إلغاء ترحيل أمر التصنيع (${order.code}) بنجاح!\nتمت استعادة الخامات في المخزن، وخصم المنتج التام، وإلغاء القيد المحاسبي وحركات المخزون، وعاد الأمر لحالة (قيد التشغيل).`);
  };

  // ---- Filtered Orders ----
  const filteredOrders = useMemo(() => {
    return productionOrders.filter(order => {
      const matchesSearch =
        (order.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.outputProductName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [productionOrders, searchQuery, filterStatus]);

  // Tab Button
  const tabBtn = (id: typeof activeTab, label: string, icon: string, count: number) => (
    <button
      className={`pb-3 px-5 font-bold text-sm md:text-base flex items-center gap-2 border-b-2 transition-all ${
        activeTab === id
          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-lg'
          : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
      onClick={() => setActiveTab(id)}
    >
      <span>{icon}</span>
      <span>{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === id ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 flex items-center gap-2">
            <span>⚙️</span>
            <span>التصنيع والإنتاج</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            إدارة قوائم مواد المنتجات (BOM)، خطط التشغيل، أوامر التصنيع، وحساب تكاليف الإنتاج والترحيل المحاسبي التلقائي.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="bg-gray-50 hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm text-sm transition-all"
              title="إعدادات التوجيه المحاسبي لموديول التصنيع"
            >
              <span>⚙️</span>
              <span>إعدادات التوجيه</span>
            </button>
          )}

          {activeTab === 'bom' && (
            <button
              onClick={() => { setEditingBOMId(null); setBomForm(emptyBOM()); setShowBOMModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 text-sm transition-all shadow-blue-200"
            >
              <span>+</span>
              <span>إضافة قائمة مواد (BOM)</span>
            </button>
          )}

          {activeTab === 'plans' && (
            <button
              onClick={() => { setPlanForm(emptyPlan()); setShowPlanModal(true); }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 text-sm transition-all shadow-purple-200"
            >
              <span>+</span>
              <span>إضافة خطة تشغيل</span>
            </button>
          )}

          {activeTab === 'orders' && (
            <button
              onClick={() => { setEditingOrderId(null); setOrderForm(emptyOrder()); setOrderSubTab('materials'); setShowOrderModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 text-sm transition-all shadow-emerald-200"
            >
              <span>+</span>
              <span>أمر تصنيع جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200 gap-2 bg-white px-4 pt-2 rounded-xl shadow-sm">
        {tabBtn('orders', 'أوامر التصنيع والتشغيل', '📋', productionOrders.length)}
        {tabBtn('bom', 'قوائم مواد الإنتاج (BOM)', '📐', billsOfMaterials.length)}
        {tabBtn('plans', 'خطط التشغيل والإنتاج', '📅', productionPlans.length)}
      </div>

      {/* ===================== TAB 1: ORDERS ===================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500">الحالة:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'in_progress', label: 'قيد التشغيل' },
                { id: 'completed', label: 'مكتمل ومرحّل' },
                { id: 'draft', label: 'مسودة' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterStatus === f.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="بحث برقم الأمر، المنتج، العميل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-emerald-50/70 border-b border-emerald-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-emerald-900">الكود والاسم</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">المنتج النهائي المطلوب</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">الكمية</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">العميل / التواريخ</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">إجمالي التكلفة</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">تكلفة الوحدة</th>
                    <th className="p-4 text-xs font-bold text-emerald-900">الحالة</th>
                    <th className="p-4 text-xs font-bold text-emerald-900 text-center">إجراءات وتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{order.name}</div>
                        <div className="text-xs font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {order.code}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{order.outputProductName || '—'}</div>
                        <div className="text-xs text-gray-500">
                          {order.bomName ? `المقايسة: ${order.bomName}` : 'مباشر (بدون مقايسة)'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-800">
                          {order.status === 'completed' ? (
                            <span>{order.producedQuantity} <span className="text-xs text-gray-400 font-normal">من {order.plannedQuantity}</span></span>
                          ) : (
                            <span>{order.plannedQuantity}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {(order.bomItems || []).length} خامات مكونة
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-gray-700 font-semibold">{order.customerName || 'مخزون داخلي'}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {order.fromDate} {order.toDate ? `إلى ${order.toDate}` : ''}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-700">
                        {(order.totalCost || 0).toLocaleString('en', { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-4 font-semibold text-gray-700">
                        {(order.unitCost || 0).toFixed(2)} ج.م
                      </td>
                      <td className="p-4">
                        {statusBadge(order.status)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* View Details Button */}
                          <button
                            onClick={() => { setViewingOrder(order); setViewingOrderTab('details'); }}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="عرض تفاصيل ومكونات الأمر"
                          >
                            <span>👁️</span>
                            <span>التفاصيل</span>
                          </button>

                          {/* Print Job Card Button */}
                          <button
                            onClick={() => setPrintingOrder(order)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title="طباعة بطاقة أمر التشغيل"
                          >
                            <span>🖨️</span>
                            <span>طباعة</span>
                          </button>

                          {/* If in progress or draft: Execute button */}
                          {(order.status === 'draft' || order.status === 'in_progress') && (
                            <>
                              <button
                                onClick={() => { setExecutingOrder(order); setActualQty(order.plannedQuantity); setShowExecuteModal(true); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                              >
                                <span>📤</span>
                                <span>تنفيذ وترحيل</span>
                              </button>
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded-lg text-xs font-bold transition-colors"
                                title="تعديل أمر التشغيل"
                              >
                                <span>✏️</span>
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg text-xs font-bold transition-colors"
                                title="حذف"
                              >
                                <span>🗑️</span>
                              </button>
                            </>
                          )}

                          {/* If completed: ROLLBACK / CONTROL BUTTON */}
                          {order.status === 'completed' && (
                            <button
                              onClick={() => handleRollbackOrder(order)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="إلغاء الترحيل وإعادة الخامات للمخزن وإلغاء القيد"
                            >
                              <span>↩️</span>
                              <span>إلغاء الترحيل</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400">
                        <div className="text-4xl mb-2">📋</div>
                        <div className="font-bold text-gray-600 text-base">لا توجد أوامر تصنيع مطابقة</div>
                        <div className="text-xs text-gray-400 mt-1">اضغط على زر "+ أمر تصنيع جديد" لإضافة أول أمر تشغيل</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: BOM ===================== */}
      {activeTab === 'bom' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-blue-50/70 border-b border-blue-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-blue-900">الكود والاسم</th>
                    <th className="p-4 text-xs font-bold text-blue-900">المنتج النهائي</th>
                    <th className="p-4 text-xs font-bold text-blue-900">كمية الإنتاج والوحدة</th>
                    <th className="p-4 text-xs font-bold text-blue-900">عدد الخامات</th>
                    <th className="p-4 text-xs font-bold text-blue-900">إجمالي تكلفة الخامات</th>
                    <th className="p-4 text-xs font-bold text-blue-900">تكلفة القطعة التقديرية</th>
                    <th className="p-4 text-xs font-bold text-blue-900">الحالة</th>
                    <th className="p-4 text-xs font-bold text-blue-900 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {billsOfMaterials.map(bom => {
                    const unitCost = bom.outputQuantity > 0 ? (bom.totalCost || 0) / bom.outputQuantity : 0;
                    return (
                      <tr key={bom.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-800">{bom.name}</div>
                          <div className="text-xs font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {bom.code}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800">{bom.outputProductName}</div>
                        </td>
                        <td className="p-4 text-gray-700 font-semibold">
                          {bom.outputQuantity} {bom.outputUnit}
                        </td>
                        <td className="p-4 text-gray-600">
                          <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full font-bold">
                            {(bom.items || []).length} خامات
                          </span>
                        </td>
                        <td className="p-4 font-bold text-blue-700">
                          {(bom.totalCost || 0).toLocaleString('en', { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="p-4 font-bold text-emerald-700">
                          {unitCost.toFixed(2)} ج.م
                        </td>
                        <td className="p-4">{statusBadge(bom.status)}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Components */}
                            <button
                              onClick={() => setViewingBOM(bom)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                              title="عرض خامات ومكونات القائمة"
                            >
                              <span>👁️</span>
                              <span>المكونات</span>
                            </button>
                            {/* Create Order */}
                            <button
                              onClick={() => {
                                handleOrderBOMChange(bom.id);
                                setActiveTab('orders');
                                setShowOrderModal(true);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                              title="إنشاء أمر تصنيع من هذه القائمة فوراً"
                            >
                              <span>⚡</span>
                              <span>أمر تشغيل</span>
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => handleEditBOM(bom)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded-lg text-xs font-bold"
                              title="تعديل"
                            >
                              <span>✏️</span>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBOM(bom)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg text-xs font-bold"
                              title="حذف"
                            >
                              <span>🗑️</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {billsOfMaterials.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-gray-400">
                        <div className="text-4xl mb-2">📐</div>
                        <div className="font-bold text-gray-600 text-base">لا توجد قوائم مواد إنتاج (BOM)</div>
                        <div className="text-xs text-gray-400 mt-1">اضغط على زر "+ إضافة قائمة مواد" لتعريف مقايسات خامات المنتجات</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PLANS ===================== */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-purple-50/70 border-b border-purple-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-purple-900">الكود والاسم</th>
                    <th className="p-4 text-xs font-bold text-purple-900">العميل المستهدف</th>
                    <th className="p-4 text-xs font-bold text-purple-900">فترة التشغيل</th>
                    <th className="p-4 text-xs font-bold text-purple-900">المنتجات المخططة</th>
                    <th className="p-4 text-xs font-bold text-purple-900">الحالة</th>
                    <th className="p-4 text-xs font-bold text-purple-900 text-center">إجراءات وتحويل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {productionPlans.map(plan => (
                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800">{plan.name}</div>
                        <div className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {plan.code}
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 font-semibold">{plan.customerName || 'خطة إنتاج عامة'}</td>
                      <td className="p-4 text-xs text-gray-600">
                        <div>من: <span className="font-semibold text-gray-800">{plan.fromDate || plan.date}</span></div>
                        <div>إلى: <span className="font-semibold text-gray-800">{plan.toDate || '—'}</span></div>
                      </td>
                      <td className="p-4">
                        <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-bold">
                          {(plan.items || []).length} منتجات
                        </span>
                      </td>
                      <td className="p-4">{statusBadge(plan.status)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Plan Details */}
                          <button
                            onClick={() => setViewingPlan(plan)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                            title="عرض تفاصيل الخطة واحتياجات الخامات الإجمالية"
                          >
                            <span>👁️</span>
                            <span>التفاصيل والخامات</span>
                          </button>
                          {/* Delete Plan */}
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف الخطة (${plan.name})؟`)) {
                                setProductionPlans(prev => prev.filter(p => p.id !== plan.id));
                                logAction(`حذف خطة إنتاج: ${plan.name}`);
                              }
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg text-xs font-bold"
                            title="حذف"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {productionPlans.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400">
                        <div className="text-4xl mb-2">📅</div>
                        <div className="font-bold text-gray-600 text-base">لا توجد خطط تشغيل حالياً</div>
                        <div className="text-xs text-gray-400 mt-1">اضغط على زر "+ إضافة خطة تشغيل" لتنظيم جداول الإنتاج الأسبوعية أو الشهرية</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: BOM FORM (ADD / EDIT) ===================== */}
      {showBOMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b bg-blue-600 text-white rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📐</span>
                  <span>{editingBOMId ? 'تعديل قائمة مواد الإنتاج (BOM)' : 'إضافة قائمة مواد الإنتاج ومقايسة الخامات (BOM)'}</span>
                </h2>
                <p className="text-xs text-blue-100 mt-0.5">تحديد معايير الخامات والمكونات المطلوبة لإنتاج كمية محددة من المنتج التام</p>
              </div>
              <button onClick={() => setShowBOMModal(false)} className="text-white hover:text-blue-200 text-2xl">✕</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Product Info & BOM Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المنتج النهائي المراد تصنيعه *</label>
                  <select
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                    value={bomForm.outputProductId}
                    onChange={e => {
                      const pId = e.target.value;
                      const prod = products.find(p => p.id === pId);
                      setBomForm(p => ({
                        ...p,
                        outputProductId: pId,
                        name: p.name || (prod ? `قائمة تشغيل: ${prod.name}` : '')
                      }));
                    }}
                  >
                    <option value="">-- اختر المنتج التام --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code || 'بدون كود'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اسم قائمة المواد (BOM) *</label>
                  <input
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
                    placeholder="مثال: مقايسة تشغيل كرتونة عصير..."
                    value={bomForm.name || ''}
                    onChange={e => setBomForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">كمية التجهيز القياسية *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white font-bold text-center"
                      value={bomForm.outputQuantity || 1}
                      onChange={e => setBomForm(p => ({ ...p, outputQuantity: Math.max(1, Number(e.target.value)) }))}
                    />
                    <span className="p-2.5 bg-gray-200 rounded-lg text-xs font-bold text-gray-700 min-w-16 text-center">
                      {selectedBOMOutputProd?.unit || 'قطعة'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Output Product Data Card */}
              {selectedBOMOutputProd && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-950">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-blue-900">{selectedBOMOutputProd.name}</span>
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px]">
                      {selectedBOMOutputProd.code || 'SKU'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div>
                      <span className="text-gray-500">التكلفة الحالية المسجلة: </span>
                      <span className="font-bold text-blue-800">{(selectedBOMOutputProd.costPrice || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div>
                      <span className="text-gray-500">سعر البيع: </span>
                      <span className="font-bold text-emerald-700">{(selectedBOMOutputProd.salePrice || 0).toFixed(2)} ج.م</span>
                    </div>
                    <div>
                      <span className="text-gray-500">الرصيد المتاح بالمخزن: </span>
                      <span className={`font-bold px-2 py-0.5 rounded ${selectedBOMOutputProd.quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedBOMOutputProd.quantity} {selectedBOMOutputProd.unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Materials Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                      <span>📦</span>
                      <span>الخامات والمكونات المطلوبة</span>
                    </h3>
                    <p className="text-[11px] text-gray-500">حدد الخامات والكميات اللازمة لإنتاج {bomForm.outputQuantity || 1} {selectedBOMOutputProd?.unit || 'قطعة'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBOMItem}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>إضافة خامة</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">الخامة المكونة (الصنف)</th>
                        <th className="p-3 w-32">الكمية المطلوبة</th>
                        <th className="p-3 w-20">الوحدة</th>
                        <th className="p-3 w-28">سعر التكلفة</th>
                        <th className="p-3 w-32">إجمالي تكلفة الخامة</th>
                        <th className="p-3 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(bomForm.items || []).map((item, idx) => {
                        const rawProd = products.find(x => x.id === item.productId);
                        const tc = (item.quantity || 0) * (rawProd?.costPrice || item.unitCost || 0);
                        const isAvailable = rawProd && rawProd.quantity >= (item.quantity || 0);

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2">
                              <select
                                className="w-full p-2 border border-gray-300 rounded-lg bg-white font-medium text-xs"
                                value={item.productId}
                                onChange={e => handleBOMItemChange(idx, 'productId', e.target.value)}
                              >
                                <option value="">-- اختر الخامة من الأصناف --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (رصيد: {p.quantity} {p.unit})
                                  </option>
                                ))}
                              </select>
                              {rawProd && (
                                <div className="flex items-center gap-2 mt-1 text-[10px]">
                                  <span className="text-gray-500 font-mono">كود: {rawProd.code || '—'}</span>
                                  <span className={`px-1.5 py-0.2 rounded font-bold ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    الرصيد المتاح: {rawProd.quantity} {rawProd.unit}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-xs"
                                value={item.quantity}
                                onChange={e => handleBOMItemChange(idx, 'quantity', e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-center text-gray-600 font-medium">
                              {rawProd?.unit || item.unit || '—'}
                            </td>
                            <td className="p-2 text-center text-gray-700 font-medium">
                              {(rawProd?.costPrice || item.unitCost || 0).toFixed(2)}
                            </td>
                            <td className="p-2 text-center font-bold text-blue-700">
                              {tc.toFixed(2)} ج.م
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBOMItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1 font-bold text-sm"
                                title="حذف الخامة"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {(bomForm.items || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            لا توجد خامات مضافة بعد. اضغط "+ إضافة خامة" للبدء في إدخال مكونات المنتج.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 font-bold">
                      <tr>
                        <td colSpan={4} className="p-3 text-left text-gray-700">إجمالي تكلفة الخامات المطلوبة للكمية:</td>
                        <td className="p-3 text-center text-sm font-extrabold text-blue-700">
                          {(bomForm.items || []).reduce((s, i) => {
                            const p = products.find(x => x.id === i.productId);
                            return s + ((i.quantity || 0) * (p?.costPrice || i.unitCost || 0));
                          }, 0).toFixed(2)} ج.م
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* BOM Cost Calculation Box */}
                {(bomForm.items || []).length > 0 && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">التكلفة التقديرية للقطعة الواحدة من المنتج التام:</span>
                      <span className="font-extrabold text-sm text-emerald-800">
                        {(
                          (bomForm.items || []).reduce((s, i) => {
                            const p = products.find(x => x.id === i.productId);
                            return s + ((i.quantity || 0) * (p?.costPrice || i.unitCost || 0));
                          }, 0) / (bomForm.outputQuantity || 1)
                        ).toFixed(2)} ج.م
                      </span>
                    </div>
                    {selectedBOMOutputProd && (
                      <div className="text-[11px] text-gray-600">
                        التكلفة المسجلة حالياً ببطاقة الصنف: <span className="font-bold">{(selectedBOMOutputProd.costPrice || 0).toFixed(2)} ج.م</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات وتعليمات التشغيل</label>
                <textarea
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="ملاحظات فنية للعمال، نسب هالك متوقعة، معايير الجودة..."
                  value={bomForm.notes || ''}
                  onChange={e => setBomForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowBOMModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveBOM}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 text-xs shadow-md transition-all"
              >
                {editingBOMId ? 'حفظ التعديلات' : 'حفظ قائمة المواد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: VIEW BOM COMPONENTS ===================== */}
      {viewingBOM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl text-right overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b bg-blue-600 text-white">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span>📐</span>
                  <span>تفاصيل ومكونات قائمة المواد: {viewingBOM.name}</span>
                </h2>
                <span className="text-xs text-blue-100 font-mono">كود: {viewingBOM.code}</span>
              </div>
              <button onClick={() => setViewingBOM(null)} className="text-white hover:text-blue-200 text-2xl">✕</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Output Info */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-gray-500">المنتج النهائي: </span>
                  <span className="font-bold text-sm text-blue-900">{viewingBOM.outputProductName}</span>
                </div>
                <div>
                  <span className="text-gray-500">كمية التجهيز القياسية: </span>
                  <span className="font-bold text-gray-800">{viewingBOM.outputQuantity} {viewingBOM.outputUnit}</span>
                </div>
                <div>
                  <span className="text-gray-500">إجمالي التكلفة: </span>
                  <span className="font-bold text-blue-700">{(viewingBOM.totalCost || 0).toFixed(2)} ج.م</span>
                </div>
                <div>
                  <span className="text-gray-500">تكلفة الوحدة: </span>
                  <span className="font-bold text-emerald-700">
                    {viewingBOM.outputQuantity > 0 ? ((viewingBOM.totalCost || 0) / viewingBOM.outputQuantity).toFixed(2) : 0} ج.م
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-sm text-gray-800 mb-2">جدول الخامات والمكونات:</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-3">م</th>
                        <th className="p-3">اسم الخامة</th>
                        <th className="p-3">الكمية المطلوبة</th>
                        <th className="p-3">الوحدة</th>
                        <th className="p-3">سعر التكلفة</th>
                        <th className="p-3">إجمالي التكلفة</th>
                        <th className="p-3">الرصيد الحالي بالمخزن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(viewingBOM.items || []).map((item, idx) => {
                        const rawProd = products.find(x => x.id === item.productId);
                        const isAvail = rawProd && rawProd.quantity >= item.quantity;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold text-gray-800">{item.productName || rawProd?.name}</td>
                            <td className="p-3 font-bold text-blue-700">{item.quantity}</td>
                            <td className="p-3 text-gray-600">{item.unit || rawProd?.unit}</td>
                            <td className="p-3 text-gray-700">{(item.unitCost || rawProd?.costPrice || 0).toFixed(2)}</td>
                            <td className="p-3 font-bold text-emerald-700">{(item.totalCost || (item.quantity * (item.unitCost || 0))).toFixed(2)} ج.م</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {rawProd ? `${rawProd.quantity} ${rawProd.unit}` : 'غير محدد'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingBOM.notes && (
                <div className="bg-gray-50 p-3 rounded-xl border text-xs text-gray-600">
                  <span className="font-bold text-gray-700">ملاحظات: </span>{viewingBOM.notes}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  const b = viewingBOM;
                  setViewingBOM(null);
                  handleOrderBOMChange(b.id);
                  setActiveTab('orders');
                  setShowOrderModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <span>⚡</span>
                <span>إنشاء أمر تشغيل من هذه القائمة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingBOM(null)}
                className="px-5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ORDER FORM (CREATE / EDIT) ===================== */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col text-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-emerald-600 text-white rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <h2 className="text-xl font-bold">
                    {editingOrderId ? 'تعديل أمر التصنيع' : 'إنشاء أمر تصنيع وتشغيل جديد'}
                  </h2>
                  <span className="bg-emerald-700 text-emerald-100 text-xs px-2.5 py-0.5 rounded-full font-mono mt-0.5 inline-block">
                    {orderForm.code}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveOrder(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm"
                >
                  💾 حفظ كمسودة
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveOrder(false)}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold shadow-md"
                >
                  ✅ اعتماد وأمر تشغيل
                </button>
                <button onClick={() => setShowOrderModal(false)} className="text-white hover:text-emerald-200 text-2xl mr-2">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Order Info */}
              <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50/50 space-y-4">
                <h3 className="font-bold text-sm text-gray-800 border-b pb-2 flex items-center gap-2">
                  <span>📌</span>
                  <span>البيانات الأساسية للمنتج والتشغيل</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Select Target Product directly */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">المنتج المراد إنتاجه *</label>
                    <select
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                      value={orderForm.outputProductId}
                      onChange={e => handleOrderOutputProductChange(e.target.value)}
                    >
                      <option value="">-- اختر المنتج التام --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code || 'بدون كود'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Select BOM */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">قائمة المواد / المقايسة (BOM)</label>
                    <select
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white text-xs"
                      value={orderForm.bomId}
                      onChange={e => handleOrderBOMChange(e.target.value)}
                    >
                      <option value="">-- مباشر (بدون مقايسة) --</option>
                      {billsOfMaterials
                        .filter(b => !orderForm.outputProductId || b.outputProductId === orderForm.outputProductId)
                        .map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.outputProductName})</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الكمية المطلوب إنتاجها *</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white font-bold text-center text-sm"
                      value={orderForm.plannedQuantity || 1}
                      onChange={e => handleOrderQtyChange(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">مستودع استلام المنتج التام</label>
                    <select
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white"
                      value={orderForm.outputWarehouseId}
                      onChange={e => setOrderForm(p => ({ ...p, outputWarehouseId: e.target.value }))}
                    >
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم / وصف أمر التشغيل *</label>
                    <input
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white font-semibold"
                      placeholder="أمر تصنيع كرتونة عصير..."
                      value={orderForm.name || ''}
                      onChange={e => setOrderForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">العميل المرتبط (اختياري)</label>
                    <select
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white"
                      value={orderForm.customerId || ''}
                      onChange={e => setOrderForm(p => ({ ...p, customerId: e.target.value }))}
                    >
                      <option value="">-- مخزون داخلي (بدون عميل) --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ البدء المتوقع</label>
                    <input
                      type="date"
                      className="w-full p-2.5 text-xs border border-gray-300 rounded-lg bg-white"
                      value={orderForm.fromDate || ''}
                      onChange={e => setOrderForm(p => ({ ...p, fromDate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Live Output Product Card inside Order Modal */}
                {orderForm.outputProductId && (
                  (() => {
                    const prod = products.find(p => p.id === orderForm.outputProductId);
                    if (!prod) return null;
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs text-emerald-950">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-900">📦 بيانات المنتج: {prod.name}</span>
                          <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px]">{prod.code || 'SKU'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div><span className="text-gray-500">الوحدة: </span><span className="font-bold">{prod.unit || 'قطعة'}</span></div>
                          <div><span className="text-gray-500">متوسط التكلفة الحالي: </span><span className="font-bold">{(prod.costPrice || 0).toFixed(2)} ج.م</span></div>
                          <div>
                            <span className="text-gray-500">الرصيد بالمستودع: </span>
                            <span className={`font-bold px-2 py-0.5 rounded ${prod.quantity > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {prod.quantity} {prod.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Sub-tabs for Details (Materials, Expenses, Operations, Scraps) */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {[
                    { id: 'materials', label: `الخامات المستهلكة (${(orderForm.bomItems || []).length})`, icon: '📦' },
                    { id: 'expenses', label: `المصروفات الإضافية (${(orderForm.expenses || []).length})`, icon: '💰' },
                    { id: 'operations', label: `مراحل ومصنعيات التشغيل (${(orderForm.operations || []).length})`, icon: '⚙️' },
                    { id: 'scraps', label: `الهالك والمخلفات (${(orderForm.scraps || []).length})`, icon: '🗑️' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className={`px-5 py-3 text-xs md:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                        orderSubTab === t.id
                          ? 'border-emerald-600 text-emerald-700 bg-white'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                      onClick={() => setOrderSubTab(t.id as any)}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {/* Tab: Materials */}
                  {orderSubTab === 'materials' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          قائمة الخامات التي سيتم خصمها من المخزن عند تنفيذ هذا الأمر. يمكنك تعديل الكميات أو إضافة خامات إضافية يدوياً.
                        </span>
                        <button
                          type="button"
                          onClick={handleAddOrderMaterial}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>إضافة خامة يدوياً</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                            <tr>
                              <th className="p-3">الخامة المكونة</th>
                              <th className="p-3 w-32">الكمية المطلوبة</th>
                              <th className="p-3 w-20">الوحدة</th>
                              <th className="p-3 w-28">سعر التكلفة</th>
                              <th className="p-3 w-32">الإجمالي</th>
                              <th className="p-3 w-36">الرصيد المتاح بالمخزن</th>
                              <th className="p-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(orderForm.bomItems || []).map((item, idx) => {
                              const rawProd = products.find(x => x.id === item.productId);
                              const isSufficient = rawProd && rawProd.quantity >= item.quantity;
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="p-2">
                                    <select
                                      className="w-full p-2 border border-gray-300 rounded-lg bg-white font-medium text-xs"
                                      value={item.productId}
                                      onChange={e => handleOrderMaterialChange(idx, 'productId', e.target.value)}
                                    >
                                      <option value="">-- اختر الخامة --</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      min="0.001"
                                      step="any"
                                      className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-xs"
                                      value={item.quantity}
                                      onChange={e => handleOrderMaterialChange(idx, 'quantity', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2 text-center text-gray-600 font-medium">{rawProd?.unit || item.unit}</td>
                                  <td className="p-2 text-center text-gray-700 font-medium">
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-20 p-1 border border-gray-200 rounded text-center text-xs"
                                      value={item.unitCost || 0}
                                      onChange={e => handleOrderMaterialChange(idx, 'unitCost', e.target.value)}
                                    />
                                  </td>
                                  <td className="p-2 text-center font-bold text-emerald-700">
                                    {(item.totalCost || 0).toFixed(2)} ج.م
                                  </td>
                                  <td className="p-2 text-center">
                                    {rawProd ? (
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isSufficient ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                                        {rawProd.quantity} {rawProd.unit} {isSufficient ? '✓' : '(عجز)'}
                                      </span>
                                    ) : '—'}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOrderMaterial(idx)}
                                      className="text-red-500 hover:text-red-700 font-bold"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}

                            {(orderForm.bomItems || []).length === 0 && (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-gray-400">
                                  اختر قائمة مواد من الأعلى، أو اضغط "+ إضافة خامة يدوياً" لإدراج الخامات المكونة لهذا الأمر.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t font-bold">
                            <tr>
                              <td colSpan={4} className="p-3 text-left text-gray-700">إجمالي تكلفة الخامات:</td>
                              <td className="p-3 text-center text-emerald-800 text-sm font-extrabold">
                                {(orderForm.rawMaterialCost || 0).toFixed(2)} ج.م
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab: Expenses */}
                  {orderSubTab === 'expenses' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">المصروفات المباشرة الخاصة بأمر التشغيل (كهرباء، استهلاك قوالب، عمالة يومية...).</span>
                        <button
                          type="button"
                          onClick={addExpense}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>إضافة مصروف</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                            <tr>
                              <th className="p-3">بيان المصروف</th>
                              <th className="p-3">حساب المصروف</th>
                              <th className="p-3 w-36">المبلغ (ج.م)</th>
                              <th className="p-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(orderForm.expenses || []).map((exp, idx) => (
                              <tr key={idx}>
                                <td className="p-2">
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                                    placeholder="وصف المصروف..."
                                    value={exp.description}
                                    onChange={e => updateExpense(idx, 'description', e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                                    value={exp.accountId}
                                    onChange={e => updateExpense(idx, 'accountId', e.target.value)}
                                  >
                                    <option value="">-- اختر الحساب --</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-xs"
                                    value={exp.amount}
                                    onChange={e => updateExpense(idx, 'amount', e.target.value)}
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => removeExpense(idx)} className="text-red-500 font-bold">✕</button>
                                </td>
                              </tr>
                            ))}
                            {(orderForm.expenses || []).length === 0 && (
                              <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد مصاريف إضافية مسجلة</td></tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t font-bold">
                            <tr>
                              <td colSpan={2} className="p-3 text-left">إجمالي المصروفات:</td>
                              <td className="p-3 text-center text-blue-700 font-bold">{(orderForm.expensesTotalCost || 0).toFixed(2)} ج.م</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab: Operations */}
                  {orderSubTab === 'operations' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">مراحل التصنيع ومصنعيات ومقاولات التشغيل لدى الغير (تكسير، سلوفان، طباعة خارجية...).</span>
                        <button
                          type="button"
                          onClick={addOperation}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>إضافة مرحلة / مصنعية</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                            <tr>
                              <th className="p-3">اسم العملية / المرحلة</th>
                              <th className="p-3">مركز العمل / الورشة</th>
                              <th className="p-3 w-36">تكلفة التشغيل (ج.م)</th>
                              <th className="p-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(orderForm.operations || []).map((op, idx) => (
                              <tr key={idx}>
                                <td className="p-2">
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                                    placeholder="مثال: مرحلة التكسير أو السلوفان..."
                                    value={op.name}
                                    onChange={e => updateOperation(idx, 'name', e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                                    placeholder="اسم الماكينة أو ورشة المقاول..."
                                    value={op.workCenterName || ''}
                                    onChange={e => updateOperation(idx, 'workCenterName', e.target.value)}
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-xs"
                                    value={op.totalCost}
                                    onChange={e => updateOperation(idx, 'totalCost', e.target.value)}
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => removeOperation(idx)} className="text-red-500 font-bold">✕</button>
                                </td>
                              </tr>
                            ))}
                            {(orderForm.operations || []).length === 0 && (
                              <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد مراحل تشغيل أو مصنعيات خارجية مسجلة</td></tr>
                            )}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t font-bold">
                            <tr>
                              <td colSpan={2} className="p-3 text-left">إجمالي تكلفة العمليات:</td>
                              <td className="p-3 text-center text-purple-700 font-bold">{(orderForm.operationsTotalCost || 0).toFixed(2)} ج.م</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tab: Scraps */}
                  {orderSubTab === 'scraps' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">حصر مخلفات وهالك التشغيل (قصاصات ورق، دشت، كراتين تالفة...).</span>
                        <button
                          type="button"
                          onClick={addScrap}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <span>+</span>
                          <span>إضافة هالك</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                            <tr>
                              <th className="p-3">صنف الهالك / المادة</th>
                              <th className="p-3 w-28">الكمية</th>
                              <th className="p-3 w-20">الوحدة</th>
                              <th className="p-3 w-28">سعر التكلفة</th>
                              <th className="p-3 w-32">قيمة الهالك</th>
                              <th className="p-3 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(orderForm.scraps || []).map((sc, idx) => (
                              <tr key={idx}>
                                <td className="p-2">
                                  <select
                                    className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                                    value={sc.productId}
                                    onChange={e => updateScrap(idx, 'productId', e.target.value)}
                                  >
                                    <option value="">-- اختر الصنف --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-xs"
                                    value={sc.quantity}
                                    onChange={e => updateScrap(idx, 'quantity', e.target.value)}
                                  />
                                </td>
                                <td className="p-2 text-center text-gray-600">{sc.unit || '—'}</td>
                                <td className="p-2 text-center text-gray-600">{(sc.unitCost || 0).toFixed(2)}</td>
                                <td className="p-2 text-center font-bold text-red-600">{(sc.totalCost || 0).toFixed(2)} ج.م</td>
                                <td className="p-2 text-center">
                                  <button type="button" onClick={() => removeScrap(idx)} className="text-red-500 font-bold">✕</button>
                                </td>
                              </tr>
                            ))}
                            {(orderForm.scraps || []).length === 0 && (
                              <tr><td colSpan={6} className="p-6 text-center text-gray-400">لا يوجد هالك مسجل</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Summary Footer */}
                <div className="border-t border-gray-200 bg-emerald-50/70 p-4 flex flex-wrap justify-between items-center gap-4 text-xs font-bold text-gray-700">
                  <div className="flex flex-wrap gap-4">
                    <span>الخامات: <span className="text-emerald-800">{(orderForm.rawMaterialCost || 0).toFixed(2)} ج.م</span></span>
                    <span>المصروفات: <span className="text-blue-700">{(orderForm.expensesTotalCost || 0).toFixed(2)} ج.م</span></span>
                    <span>العمليات: <span className="text-purple-700">{(orderForm.operationsTotalCost || 0).toFixed(2)} ج.م</span></span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-sm text-emerald-950 font-extrabold">
                      إجمالي تكلفة أمر التصنيع: {totalOrderCost.toFixed(2)} ج.م
                    </span>
                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                      تكلفة القطعة التقديرية: {(orderForm.plannedQuantity ? totalOrderCost / orderForm.plannedQuantity : 0).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="px-5 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleSaveOrder(false)}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-xs shadow-md"
              >
                {editingOrderId ? 'حفظ التعديلات' : 'اعتماد أمر التشغيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EXECUTE / POST PRODUCTION ===================== */}
      {showExecuteModal && executingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 text-right">
            <div className="flex items-center gap-2 text-emerald-700 mb-2 font-bold text-lg">
              <span>📤</span>
              <span>تنفيذ وترحيل أمر التصنيع</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              سيقوم النظام بخصم الخامات المستهلكة من المخزن، وتوريد المنتج النهائي التام، وتسجيل القيد المحاسبي الشامل آلياً.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">أمر التشغيل:</span><span className="font-bold">{executingOrder.code} - {executingOrder.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">المنتج التام:</span><span className="font-bold text-emerald-800">{executingOrder.outputProductName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">الكمية المخططة:</span><span className="font-bold">{executingOrder.plannedQuantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">إجمالي التكلفة المقدرة:</span><span className="font-bold text-emerald-700">{executingOrder.totalCost.toFixed(2)} ج.م</span></div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-800 mb-1">الكمية الفعلية المنتجة (التي تم استلامها بالمخزن) *</label>
              <input
                type="number"
                min="1"
                step="any"
                className="w-full p-3 border-2 border-emerald-400 rounded-xl text-xl font-extrabold text-center text-emerald-900 bg-emerald-50/50"
                value={actualQty}
                onChange={e => setActualQty(Number(e.target.value))}
              />
              <p className="text-[11px] text-gray-400 mt-1">سيتم احتساب نسب استهلاك الخامات والمصاريف بناءً على هذه الكمية الفعلية.</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowExecuteModal(false); setExecutingOrder(null); }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeProduction}
                className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md text-xs flex items-center gap-1.5"
              >
                <span>🚀</span>
                <span>تأكيد الترحيل وتوريد المخزن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: VIEW COMPREHENSIVE ORDER DETAILS ===================== */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl text-right overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-900 text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{viewingOrder.name}</h2>
                    {statusBadge(viewingOrder.status)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">كود الأمر: {viewingOrder.code}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingOrder.status === 'completed' && (
                  <button
                    onClick={() => handleRollbackOrder(viewingOrder)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                    title="إلغاء ترحيل هذا الأمر"
                  >
                    <span>↩️</span>
                    <span>إلغاء الترحيل</span>
                  </button>
                )}
                <button
                  onClick={() => setPrintingOrder(viewingOrder)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <span>🖨️</span>
                  <span>طباعة</span>
                </button>
                <button onClick={() => setViewingOrder(null)} className="text-gray-400 hover:text-white text-2xl mr-2">✕</button>
              </div>
            </div>

            {/* Navigation Tabs inside View Order */}
            <div className="flex border-b border-gray-200 bg-gray-50 px-5">
              {[
                { id: 'details', label: 'الملخص والتكاليف', icon: '📊' },
                { id: 'materials', label: `الخامات المستهلكة (${(viewingOrder.bomItems || []).length})`, icon: '📦' },
                { id: 'stock', label: 'الحركات المخزنية', icon: '🏬' },
                { id: 'journal', label: 'القيد المحاسبي', icon: '📝' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setViewingOrderTab(t.id as any)}
                  className={`py-3 px-4 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                    viewingOrderTab === t.id
                      ? 'border-emerald-600 text-emerald-700 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Tab 1: Overview & Costs */}
              {viewingOrderTab === 'details' && (
                <div className="space-y-4">
                  {/* Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 border p-3.5 rounded-xl">
                      <div className="text-gray-500 mb-1">المنتج التام</div>
                      <div className="font-bold text-gray-800 text-sm">{viewingOrder.outputProductName}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                      <div className="text-emerald-700 mb-1">الكمية الفعلية المنتجة</div>
                      <div className="font-extrabold text-emerald-900 text-base">
                        {viewingOrder.status === 'completed' ? viewingOrder.producedQuantity : `مخطط ${viewingOrder.plannedQuantity}`}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                      <div className="text-blue-700 mb-1">إجمالي تكلفة الإنتاج</div>
                      <div className="font-extrabold text-blue-900 text-base">
                        {(viewingOrder.totalCost || 0).toLocaleString('en', { minimumFractionDigits: 2 })} ج.م
                      </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl">
                      <div className="text-purple-700 mb-1">تكلفة القطعة الواحدة</div>
                      <div className="font-extrabold text-purple-900 text-base">
                        {(viewingOrder.unitCost || 0).toFixed(2)} ج.م
                      </div>
                    </div>
                  </div>

                  {/* Operational Details */}
                  <div className="bg-gray-50 border rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div><span className="text-gray-500">العميل المستهدف: </span><span className="font-bold">{viewingOrder.customerName || 'مخزون داخلي'}</span></div>
                    <div><span className="text-gray-500">تاريخ البدء: </span><span className="font-bold">{viewingOrder.fromDate || viewingOrder.date}</span></div>
                    <div><span className="text-gray-500">تاريخ الانتهاء: </span><span className="font-bold">{viewingOrder.toDate || '—'}</span></div>
                    <div><span className="text-gray-500">المقايسة المرجعية: </span><span className="font-bold">{viewingOrder.bomName || 'تشغيل مباشر'}</span></div>
                    <div><span className="text-gray-500">مستودع الاستلام: </span><span className="font-bold">{warehouses.find(w => w.id === viewingOrder.outputWarehouseId)?.name || 'الرئيسي'}</span></div>
                    <div><span className="text-gray-500">تاريخ الإنشاء: </span><span className="font-bold">{new Date(viewingOrder.createdAt).toLocaleDateString('ar-EG')}</span></div>
                  </div>

                  {/* Cost Breakdown */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-2">توزيع عناصر التكلفة:</h4>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-right">
                        <thead className="bg-gray-100 font-bold border-b">
                          <tr>
                            <th className="p-2.5">عنصر التكلفة</th>
                            <th className="p-2.5">المبلغ (ج.م)</th>
                            <th className="p-2.5">النسبة المئوية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          <tr>
                            <td className="p-2.5 font-semibold text-gray-800">خامات ومواد أولية مستهلكة</td>
                            <td className="p-2.5 font-bold text-emerald-700">{(viewingOrder.rawMaterialCost || 0).toFixed(2)} ج.م</td>
                            <td className="p-2.5 text-gray-500">{viewingOrder.totalCost > 0 ? (((viewingOrder.rawMaterialCost || 0) / viewingOrder.totalCost) * 100).toFixed(1) : 0}%</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-gray-800">مصروفات صناعية مباشرة وغير مباشرة</td>
                            <td className="p-2.5 font-bold text-blue-700">{(viewingOrder.expensesTotalCost || 0).toFixed(2)} ج.م</td>
                            <td className="p-2.5 text-gray-500">{viewingOrder.totalCost > 0 ? (((viewingOrder.expensesTotalCost || 0) / viewingOrder.totalCost) * 100).toFixed(1) : 0}%</td>
                          </tr>
                          <tr>
                            <td className="p-2.5 font-semibold text-gray-800">عمليات ومصنعيات تشغيل لدى الغير</td>
                            <td className="p-2.5 font-bold text-purple-700">{(viewingOrder.operationsTotalCost || 0).toFixed(2)} ج.م</td>
                            <td className="p-2.5 text-gray-500">{viewingOrder.totalCost > 0 ? (((viewingOrder.operationsTotalCost || 0) / viewingOrder.totalCost) * 100).toFixed(1) : 0}%</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-gray-50 font-bold border-t">
                          <tr>
                            <td className="p-2.5">الإجمالي الكلي:</td>
                            <td className="p-2.5 text-emerald-800 font-extrabold" colSpan={2}>{(viewingOrder.totalCost || 0).toFixed(2)} ج.م</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Consumed Materials */}
              {viewingOrderTab === 'materials' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-right">
                      <thead className="bg-gray-100 font-bold border-b">
                        <tr>
                          <th className="p-3">م</th>
                          <th className="p-3">الخامة</th>
                          <th className="p-3">الكمية المستهلكة</th>
                          <th className="p-3">الوحدة</th>
                          <th className="p-3">سعر التكلفة</th>
                          <th className="p-3">إجمالي التكلفة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(viewingOrder.bomItems || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                            <td className="p-3 font-bold text-gray-800">{item.productName}</td>
                            <td className="p-3 font-bold text-blue-700">{item.quantity}</td>
                            <td className="p-3 text-gray-600">{item.unit}</td>
                            <td className="p-3 text-gray-700">{(item.unitCost || 0).toFixed(2)}</td>
                            <td className="p-3 font-bold text-emerald-700">{(item.totalCost || 0).toFixed(2)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Stock Transactions */}
              {viewingOrderTab === 'stock' && (
                <div className="space-y-3">
                  <p className="text-gray-500">حركات الإضافة والصرف المخزني المسجلة بهذا الأمر في سجل المخازن العام:</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-right">
                      <thead className="bg-gray-100 font-bold border-b">
                        <tr>
                          <th className="p-3">نوع الحركة</th>
                          <th className="p-3">الصنف</th>
                          <th className="p-3">الكمية الصادرة</th>
                          <th className="p-3">الكمية الواردة</th>
                          <th className="p-3">الرصيد بعد الحركة</th>
                          <th className="p-3">البيان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stockTransactions
                          .filter(st => st.referenceId === viewingOrder.id)
                          .map((st, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3">
                                {st.type === 'production_in' ? (
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">وارد إنتاج تام</span>
                                ) : st.type === 'production_out' ? (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">صرف خامات</span>
                                ) : (
                                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">هالك تشغيل</span>
                                )}
                              </td>
                              <td className="p-3 font-bold text-gray-800">{st.productName}</td>
                              <td className="p-3 font-bold text-red-600">{st.quantityOut > 0 ? st.quantityOut : '—'}</td>
                              <td className="p-3 font-bold text-emerald-700">{st.quantityIn > 0 ? st.quantityIn : '—'}</td>
                              <td className="p-3 font-mono text-gray-700">{st.balanceAfter}</td>
                              <td className="p-3 text-gray-500">{st.notes}</td>
                            </tr>
                          ))}

                        {stockTransactions.filter(st => st.referenceId === viewingOrder.id).length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                              لم يتم ترحيل حركات مخزنية بعد لهذا الأمر (أمر غير مرحّل أو مسودة)
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: Linked Journal Entry */}
              {viewingOrderTab === 'journal' && (
                <div className="space-y-3">
                  {(() => {
                    const linkedEntry = journalEntries.find(je => je.referenceId === viewingOrder.id || je.id === viewingOrder.journalEntryId);
                    if (!linkedEntry) {
                      return (
                        <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border">
                          لا يوجد قيد محاسبي مسجل لهذا الأمر بعد (الأمر قيد التشغيل ولم يتم ترحيله).
                        </div>
                      );
                    }
                    return (
                      <div className="border rounded-xl overflow-hidden space-y-3 p-4 bg-gray-50">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <span className="font-bold text-sm text-gray-800">قيد يومية رقم: {linkedEntry.entryNumber || linkedEntry.id}</span>
                            <div className="text-[11px] text-gray-500 mt-0.5">{linkedEntry.description}</div>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{linkedEntry.date}</span>
                        </div>

                        <table className="w-full text-right bg-white rounded-lg border">
                          <thead className="bg-gray-100 font-bold border-b">
                            <tr>
                              <th className="p-2.5">الحساب</th>
                              <th className="p-2.5 w-32">مدين (ج.م)</th>
                              <th className="p-2.5 w-32">دائن (ج.م)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(linkedEntry.lines || []).map((line, lIdx) => (
                              <tr key={lIdx}>
                                <td className="p-2.5 font-semibold text-gray-800">{line.accountName || accounts.find(a => a.id === line.accountId)?.name}</td>
                                <td className="p-2.5 font-bold text-blue-700">{line.debit > 0 ? Number(line.debit).toFixed(2) : '—'}</td>
                                <td className="p-2.5 font-bold text-emerald-700">{line.credit > 0 ? Number(line.credit).toFixed(2) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <span className="text-xs text-gray-500">تم تسجيل الأمر بنظام التصنيع الشامل</span>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-900"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: VIEW PRODUCTION PLAN ===================== */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl text-right overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-5 border-b bg-purple-700 text-white">
              <div>
                <h2 className="text-xl font-bold">خطة التشغيل والإنتاج: {viewingPlan.name}</h2>
                <span className="text-xs text-purple-200 font-mono">كود الخطة: {viewingPlan.code}</span>
              </div>
              <button onClick={() => setViewingPlan(null)} className="text-white hover:text-purple-200 text-2xl">✕</button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div><span className="text-gray-500">العميل المستهدف: </span><span className="font-bold">{viewingPlan.customerName || 'عام'}</span></div>
                <div><span className="text-gray-500">فترة الخطة: </span><span className="font-bold">من {viewingPlan.fromDate || viewingPlan.date} إلى {viewingPlan.toDate || '—'}</span></div>
                <div><span className="text-gray-500">مستودع الاستلام: </span><span className="font-bold">{warehouses.find(w => w.id === viewingPlan.warehouseId)?.name || 'الرئيسي'}</span></div>
              </div>

              {/* Plan Items */}
              <div>
                <h4 className="font-bold text-sm text-gray-800 mb-2">المنتجات المدرجة بالخطة:</h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 font-bold border-b">
                      <tr>
                        <th className="p-3">م</th>
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3">المقايسة (BOM)</th>
                        <th className="p-3">الكمية المخططة</th>
                        <th className="p-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(viewingPlan.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-gray-800">{item.productName}</td>
                          <td className="p-3 text-purple-700 font-semibold">{item.bomName || '—'}</td>
                          <td className="p-3 font-extrabold text-blue-700 text-sm">{item.quantity}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPlan(null);
                                handleConvertPlanItemToOrder(viewingPlan, item);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              ⚡ تحويل لأمر تصنيع
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Consolidated Raw Materials Shopping / Requisition List */}
              <div>
                <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-1.5">
                  <span>🛒</span>
                  <span>الاحتياجات الكلية من الخامات لتنفيذ هذه الخطة بالكامل:</span>
                </h4>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-right">
                    <thead className="bg-gray-100 font-bold border-b">
                      <tr>
                        <th className="p-3">الخامة</th>
                        <th className="p-3">الكمية الإجمالية المطلوبة للخطة</th>
                        <th className="p-3">الرصيد المتاح بالمخزن</th>
                        <th className="p-3">حالة التوفر بالمستودع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const neededMaterials: Record<string, { name: string; unit: string; totalQty: number }> = {};
                        (viewingPlan.items || []).forEach(pItem => {
                          const bom = billsOfMaterials.find(b => b.id === pItem.bomId) || billsOfMaterials.find(b => b.outputProductId === pItem.productId);
                          if (bom) {
                            bom.items.forEach(bItem => {
                              const qtyNeeded = bItem.quantity * (pItem.quantity || 1);
                              if (!neededMaterials[bItem.productId]) {
                                neededMaterials[bItem.productId] = { name: bItem.productName, unit: bItem.unit, totalQty: 0 };
                              }
                              neededMaterials[bItem.productId].totalQty += qtyNeeded;
                            });
                          }
                        });

                        const entries = Object.entries(neededMaterials);
                        if (entries.length === 0) {
                          return <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد قوائم مواد مرتبطة لحساب الخامات</td></tr>;
                        }

                        return entries.map(([pId, mat]) => {
                          const prod = products.find(p => p.id === pId);
                          const avail = prod?.quantity || 0;
                          const isOk = avail >= mat.totalQty;
                          return (
                            <tr key={pId} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-800">{mat.name}</td>
                              <td className="p-3 font-bold text-blue-700">{mat.totalQty.toFixed(2)} {mat.unit}</td>
                              <td className="p-3 font-mono">{avail.toFixed(2)} {mat.unit}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                                  {isOk ? 'متوفرة بالكامل ✓' : `عجز بمقدار ${(mat.totalQty - avail).toFixed(2)} ${mat.unit} (يلزم شراؤها)`}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PRINTABLE WORK ORDER / JOB CARD ===================== */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl text-right p-8 space-y-6 max-h-[95vh] overflow-y-auto border">
            {/* Action Bar (hidden in print) */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>طباعة بطاقة التشغيل الآن</span>
                </button>
              </div>
              <button onClick={() => setPrintingOrder(null)} className="text-gray-400 hover:text-gray-700 text-2xl">✕</button>
            </div>

            {/* Printable Content */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">أمر تشغيل وبطاقة إنتاج</h2>
                  <div className="text-xs text-gray-500 font-semibold mt-1">بطاقة متابعة الورش والمخازن - Production Job Card</div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-lg font-black text-emerald-800">{printingOrder.code}</div>
                  <div className="text-xs text-gray-500">التاريخ: {printingOrder.date}</div>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border text-xs">
                <div><span className="text-gray-500">اسم أمر التشغيل: </span><span className="font-bold text-gray-800">{printingOrder.name}</span></div>
                <div><span className="text-gray-500">المنتج المستهدف: </span><span className="font-bold text-emerald-900">{printingOrder.outputProductName}</span></div>
                <div><span className="text-gray-500">الكمية المطلوبة: </span><span className="font-bold text-base text-blue-700">{printingOrder.plannedQuantity}</span></div>
                <div><span className="text-gray-500">العميل: </span><span className="font-bold">{printingOrder.customerName || 'مخزون داخلي'}</span></div>
                <div><span className="text-gray-500">تاريخ البدء: </span><span className="font-bold">{printingOrder.fromDate}</span></div>
                <div><span className="text-gray-500">تاريخ التسليم: </span><span className="font-bold">{printingOrder.toDate || '—'}</span></div>
              </div>

              {/* Materials Checklist */}
              <div>
                <h4 className="font-bold text-sm text-gray-900 mb-2 border-b pb-1">إذن صرف وتجهيز الخامات (المخزن):</h4>
                <table className="w-full text-right text-xs border">
                  <thead className="bg-gray-100 font-bold border-b">
                    <tr>
                      <th className="p-2 border">م</th>
                      <th className="p-2 border">اسم الخامة</th>
                      <th className="p-2 border">الكمية المطلوبة</th>
                      <th className="p-2 border">الوحدة</th>
                      <th className="p-2 border text-center w-24">تم الصرف [✓]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(printingOrder.bomItems || []).map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 border text-center font-bold">{idx + 1}</td>
                        <td className="p-2 border font-bold">{item.productName}</td>
                        <td className="p-2 border font-extrabold text-blue-800">{item.quantity}</td>
                        <td className="p-2 border">{item.unit}</td>
                        <td className="p-2 border text-center text-gray-300 font-mono">[ &nbsp; &nbsp; ]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Operations Checklist if any */}
              {(printingOrder.operations || []).length > 0 && (
                <div>
                  <h4 className="font-bold text-sm text-gray-900 mb-2 border-b pb-1">مراحل وخطوات التشغيل:</h4>
                  <table className="w-full text-right text-xs border">
                    <thead className="bg-gray-100 font-bold border-b">
                      <tr>
                        <th className="p-2 border">م</th>
                        <th className="p-2 border">اسم المرحلة</th>
                        <th className="p-2 border">مركز العمل / الماكينة</th>
                        <th className="p-2 border text-center w-24">اكتمال [✓]</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printingOrder.operations.map((op, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2 border text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border font-bold">{op.name}</td>
                          <td className="p-2 border">{op.workCenterName || '—'}</td>
                          <td className="p-2 border text-center text-gray-300 font-mono">[ &nbsp; &nbsp; ]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {printingOrder.notes && (
                <div className="border p-3 rounded-lg text-xs bg-gray-50">
                  <span className="font-bold">تعليمات هامة: </span>{printingOrder.notes}
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t text-center text-xs">
                <div>
                  <div className="font-bold mb-8">مسؤول التخطيط والإنتاج</div>
                  <div className="border-t border-dashed pt-1 text-gray-400">التوقيع</div>
                </div>
                <div>
                  <div className="font-bold mb-8">أمين مخزن الخامات</div>
                  <div className="border-t border-dashed pt-1 text-gray-400">التوقيع</div>
                </div>
                <div>
                  <div className="font-bold mb-8">مراقب الجودة والاستلام</div>
                  <div className="border-t border-dashed pt-1 text-gray-400">التوقيع</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manufacturing;