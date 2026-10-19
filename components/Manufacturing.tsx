import React, { useState, useMemo } from 'react';
import type {
  Product, Warehouse, BillOfMaterials, BOMItem, ProductionOrder, ProductionPlan,
  StockTransaction, ProductionExpense, ProductionOperation, ProductionScrap, ProductionPlanItem
} from '../types.ts';

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
  initialOrderData?: Partial<ProductionOrder> | null;
  onClearInitialData?: () => void;
}

// ==================== Helper ====================
const generateCode = (prefix: string) => `${prefix}${String(Math.floor(Math.random() * 900000) + 100000).padStart(6, '0')}`;

const statusBadge = (status: string) => {
  const map: Record<string, { label: string; color: string }> = {
    draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-600' },
    active: { label: 'نشط', color: 'bg-emerald-100 text-emerald-700' },
    inactive: { label: 'غير نشط', color: 'bg-gray-100 text-gray-600' },
  };
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>;
};

// ==================== Main Component ====================
const Manufacturing: React.FC<ManufacturingProps> = ({
  products, setProducts, warehouses, billsOfMaterials, setBillsOfMaterials,
  productionOrders, setProductionOrders, productionPlans, setProductionPlans,
  stockTransactions, setStockTransactions, createJournalEntry, logAction, accounts, customers = [],
  initialOrderData, onClearInitialData
}) => {
  const [activeTab, setActiveTab] = useState<'bom' | 'plans' | 'orders'>('orders');

  // ---- Modals ----
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executingOrder, setExecutingOrder] = useState<ProductionOrder | null>(null);
  const [actualQty, setActualQty] = useState(0);

  // ---- BOM Form ----
  const emptyBOM = (): Partial<BillOfMaterials> => ({
    code: generateCode('BOM'), name: '', outputProductId: '', outputQuantity: 1, items: [], status: 'active', notes: ''
  });
  const [bomForm, setBomForm] = useState<Partial<BillOfMaterials>>(emptyBOM());

  const handleAddBOMItem = () => setBomForm(p => ({ ...p, items: [...(p.items || []), { productId: '', productName: '', quantity: 1, unit: '' }] }));
  const handleBOMItemChange = (idx: number, field: string, val: any) => {
    const items = [...(bomForm.items || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      items[idx] = { ...items[idx], productId: val, productName: prod?.name || '', unit: prod?.unit || '', unitCost: prod?.costPrice || 0 };
    } else {
      items[idx] = { ...items[idx], [field]: val };
    }
    setBomForm(p => ({ ...p, items }));
  };
  const handleRemoveBOMItem = (idx: number) => setBomForm(p => ({ ...p, items: (p.items || []).filter((_, i) => i !== idx) }));

  const handleSaveBOM = () => {
    if (!bomForm.name || !bomForm.outputProductId || !(bomForm.items || []).length)
      return alert('الرجاء إكمال البيانات وإضافة خامة واحدة على الأقل');
    const prod = products.find(p => p.id === bomForm.outputProductId);
    const bom: BillOfMaterials = {
      id: `BOM-${Date.now()}`, code: bomForm.code || generateCode('BOM'), name: bomForm.name!,
      outputProductId: bomForm.outputProductId!, outputProductName: prod?.name || '',
      outputQuantity: Number(bomForm.outputQuantity), outputUnit: prod?.unit || 'قطعة',
      items: bomForm.items || [], status: bomForm.status || 'active', notes: bomForm.notes,
      totalCost: (bomForm.items || []).reduce((s, i) => {
        const p = products.find(x => x.id === i.productId);
        return s + (i.quantity * (p?.costPrice || 0));
      }, 0),
      isDefault: true, createdAt: new Date().toISOString()
    };
    setBillsOfMaterials(prev => [bom, ...prev]);
    logAction(`إضافة قائمة مواد: ${bom.name}`);
    setShowBOMModal(false);
    setBomForm(emptyBOM());
  };

  // ---- Plan Form ----
  const emptyPlan = (): Partial<ProductionPlan> => ({
    code: generateCode('PLN'), name: '', description: '', date: new Date().toISOString().split('T')[0],
    fromDate: '', toDate: '', customerId: '', employeeIds: [], sourceType: '', sourceRef: '',
    warehouseId: '', costAccountId: '', items: [], status: 'draft'
  });
  const [planForm, setPlanForm] = useState<Partial<ProductionPlan>>(emptyPlan());

  const handleAddPlanItem = () => setPlanForm(p => ({
    ...p, items: [...(p.items || []), { productId: '', productName: '', bomId: '', bomName: '', quantity: 1 }]
  }));
  const handlePlanItemChange = (idx: number, field: string, val: any) => {
    const items = [...(planForm.items || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      items[idx] = { ...items[idx], productId: val, productName: prod?.name || '' };
    } else if (field === 'bomId') {
      const bom = billsOfMaterials.find(b => b.id === val);
      items[idx] = { ...items[idx], bomId: val, bomName: bom?.name || '' };
    } else {
      items[idx] = { ...items[idx], [field]: val };
    }
    setPlanForm(p => ({ ...p, items }));
  };
  const handleRemovePlanItem = (idx: number) => setPlanForm(p => ({ ...p, items: (p.items || []).filter((_, i) => i !== idx) }));

  const handleSavePlan = () => {
    if (!planForm.name) return alert('أدخل اسم الخطة');
    const plan: ProductionPlan = {
      id: `PLAN-${Date.now()}`, code: planForm.code || generateCode('PLN'), name: planForm.name!,
      description: planForm.description || '', date: planForm.date!, fromDate: planForm.fromDate || '',
      toDate: planForm.toDate || '', customerId: planForm.customerId, customerName: customers.find(c => c.id === planForm.customerId)?.name,
      employeeIds: planForm.employeeIds || [], sourceType: planForm.sourceType, sourceRef: planForm.sourceRef,
      warehouseId: planForm.warehouseId || '', costAccountId: planForm.costAccountId || '',
      items: planForm.items || [], status: 'draft', createdAt: new Date().toISOString()
    };
    setProductionPlans(prev => [plan, ...prev]);
    logAction(`إضافة خطة إنتاج: ${plan.name}`);
    setShowPlanModal(false);
    setPlanForm(emptyPlan());
  };

  // ---- Order Form ----
  const emptyOrder = (): Partial<ProductionOrder> => ({
    code: generateCode('MFG'), name: '', bomId: '', date: new Date().toISOString().split('T')[0],
    fromDate: new Date().toISOString().split('T')[0], toDate: '',
    customerId: '', employeeIds: [], accountId: '', plannedQuantity: 1,
    bomItems: [], expenses: [], operations: [], scraps: [],
    rawMaterialCost: 0, expensesTotalCost: 0, operationsTotalCost: 0,
    scrapTotalCost: 0, totalCost: 0, unitCost: 0, status: 'draft'
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

  const handleOrderBOMChange = (bomId: string) => {
    const bom = billsOfMaterials.find(b => b.id === bomId);
    if (!bom) return setOrderForm(p => ({ ...p, bomId: '', bomName: '', bomItems: [], outputProductId: '', outputProductName: '' }));
    const prod = products.find(x => x.id === bom.outputProductId);
    const bomItems = bom.items.map(i => {
      const p = products.find(x => x.id === i.productId);
      const qty = i.quantity * Number(orderForm.plannedQuantity || 1);
      const uc = p?.costPrice || 0;
      return { ...i, quantity: qty, unitCost: uc, totalCost: qty * uc };
    });
    const rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
    setOrderForm(p => ({
      ...p, bomId, bomName: bom.name, bomItems, rawMaterialCost: rawCost,
      outputProductId: bom.outputProductId, outputProductName: prod?.name || '',
      outputWarehouseId: warehouses[0]?.id || ''
    }));
  };

  const handleOrderQtyChange = (qty: number) => {
    const bom = billsOfMaterials.find(b => b.id === orderForm.bomId);
    if (bom) {
      const bomItems = bom.items.map(i => {
        const p = products.find(x => x.id === i.productId);
        const newQty = i.quantity * qty;
        const uc = p?.costPrice || 0;
        return { ...i, quantity: newQty, unitCost: uc, totalCost: newQty * uc };
      });
      const rawCost = bomItems.reduce((s, i) => s + (i.totalCost || 0), 0);
      setOrderForm(p => ({ ...p, plannedQuantity: qty, bomItems, rawMaterialCost: rawCost }));
    } else {
      setOrderForm(p => ({ ...p, plannedQuantity: qty }));
    }
  };

  // Expenses
  const addExpense = () => setOrderForm(p => ({ ...p, expenses: [...(p.expenses || []), { id: `E-${Date.now()}`, description: '', accountId: '', accountName: '', amount: 0 }] }));
  const updateExpense = (idx: number, field: string, val: any) => {
    const exp = [...(orderForm.expenses || [])];
    if (field === 'accountId') {
      const acc = accounts.find(a => a.id === val);
      exp[idx] = { ...exp[idx], accountId: val, accountName: acc?.name || '' };
    } else { exp[idx] = { ...exp[idx], [field]: val }; }
    const total = exp.reduce((s, e) => s + Number(e.amount), 0);
    setOrderForm(p => ({ ...p, expenses: exp, expensesTotalCost: total }));
  };
  const removeExpense = (idx: number) => {
    const exp = (orderForm.expenses || []).filter((_, i) => i !== idx);
    setOrderForm(p => ({ ...p, expenses: exp, expensesTotalCost: exp.reduce((s, e) => s + Number(e.amount), 0) }));
  };

  // Operations
  const addOperation = () => setOrderForm(p => ({ ...p, operations: [...(p.operations || []), { id: `OP-${Date.now()}`, name: '', totalCost: 0 }] }));
  const updateOperation = (idx: number, field: string, val: any) => {
    const ops = [...(orderForm.operations || [])];
    ops[idx] = { ...ops[idx], [field]: val };
    const total = ops.reduce((s, o) => s + Number(o.totalCost), 0);
    setOrderForm(p => ({ ...p, operations: ops, operationsTotalCost: total }));
  };
  const removeOperation = (idx: number) => {
    const ops = (orderForm.operations || []).filter((_, i) => i !== idx);
    setOrderForm(p => ({ ...p, operations: ops, operationsTotalCost: ops.reduce((s, o) => s + Number(o.totalCost), 0) }));
  };

  // Scraps
  const addScrap = () => setOrderForm(p => ({ ...p, scraps: [...(p.scraps || []), { id: `SC-${Date.now()}`, productId: '', productName: '', quantity: 0, unit: '' }] }));
  const updateScrap = (idx: number, field: string, val: any) => {
    const scraps = [...(orderForm.scraps || [])];
    if (field === 'productId') {
      const prod = products.find(x => x.id === val);
      scraps[idx] = { ...scraps[idx], productId: val, productName: prod?.name || '', unit: prod?.unit || '', unitCost: prod?.costPrice || 0, totalCost: scraps[idx].quantity * (prod?.costPrice || 0) };
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
    if (!orderForm.name || !orderForm.bomId) return alert('أكمل البيانات الأساسية (الاسم والمقايسة)');
    const order: ProductionOrder = {
      id: `MFG-${Date.now()}`, code: orderForm.code || generateCode('MFG'), name: orderForm.name!,
      bomId: orderForm.bomId!, bomName: orderForm.bomName || '', date: orderForm.date!,
      fromDate: orderForm.fromDate || '', toDate: orderForm.toDate || '',
      customerId: orderForm.customerId, customerName: customers.find(c => c.id === orderForm.customerId)?.name,
      employeeIds: orderForm.employeeIds || [], accountId: orderForm.accountId, accountName: accounts.find(a => a.id === orderForm.accountId)?.name,
      plannedQuantity: Number(orderForm.plannedQuantity), producedQuantity: 0, wasteQuantity: 0,
      status: asDraft ? 'draft' : 'in_progress',
      bomItems: orderForm.bomItems || [], rawMaterialCost: orderForm.rawMaterialCost || 0,
      expenses: orderForm.expenses || [], expensesTotalCost: orderForm.expensesTotalCost || 0,
      operations: orderForm.operations || [], operationsTotalCost: orderForm.operationsTotalCost || 0,
      scraps: orderForm.scraps || [], scrapTotalCost: orderForm.scrapTotalCost || 0,
      totalCost: totalOrderCost, unitCost: totalOrderCost / Number(orderForm.plannedQuantity || 1),
      outputProductId: orderForm.outputProductId || '', outputProductName: orderForm.outputProductName || '',
      outputWarehouseId: orderForm.outputWarehouseId || warehouses[0]?.id || '',
      notes: orderForm.notes, createdAt: new Date().toISOString()
    };
    setProductionOrders(prev => [order, ...prev]);
    logAction(`إنشاء أمر تصنيع: ${order.code}`);
    setShowOrderModal(false);
    setOrderForm(emptyOrder());
    setOrderSubTab('materials');
  };

  // ---- Execute / Post Order ----
  const executeProduction = () => {
    if (!executingOrder) return;
    if (actualQty <= 0) return alert('الكمية المنتجة غير صحيحة');
    const bom = billsOfMaterials.find(b => b.id === executingOrder.bomId);
    if (!bom) return;

    // BUG FIX: executingOrder.bomItems are already scaled by plannedQuantity at creation time.
    // So ratio = actualQty / plannedQuantity (not actualQty / bom.outputQuantity which causes double-scaling).
    // If bomItems is empty (edge case), fall back to bom.items with ratio = actualQty / bom.outputQuantity.
    const useBomItems = executingOrder.bomItems.length > 0;
    const ratio = useBomItems
      ? (actualQty / executingOrder.plannedQuantity)   // bomItems already scaled → just scale to actual ratio
      : (actualQty / bom.outputQuantity);              // bom.items are base quantities → scale normally

    // BUG FIX: Prorate expenses and operations for partial production
    const productionRatio = actualQty / executingOrder.plannedQuantity; // 0..1 for partial, >1 for over-production
    const proratedExpensesCost = executingOrder.expensesTotalCost * productionRatio;
    const proratedOperationsCost = executingOrder.operationsTotalCost * productionRatio;

    let totalRawCost = 0;
    const stockUpdates: StockTransaction[] = [];
    const productUpdates = [...products];
    let hasError = false;
    const warnings: string[] = [];

    // 1. Deduct raw materials
    (useBomItems ? executingOrder.bomItems : bom.items).forEach(item => {
      const requiredQty = item.quantity * ratio;
      const pIdx = productUpdates.findIndex(p => p.id === item.productId);
      if (pIdx === -1) { hasError = true; return; }
      const prod = productUpdates[pIdx];

      // BUG FIX: Warn if insufficient stock (don't silently go negative)
      if (prod.quantity < requiredQty) {
        warnings.push(`⚠️ تحذير: ${prod.name} - المتاح ${prod.quantity.toFixed(2)} والمطلوب ${requiredQty.toFixed(2)}`);
      }

      const itemCost = requiredQty * prod.costPrice;
      totalRawCost += itemCost;
      const newQty = prod.quantity - requiredQty; // Allow negative to be recorded (for investigation)
      productUpdates[pIdx] = { ...prod, quantity: newQty };
      stockUpdates.push({
        id: `ST-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        date: executingOrder.date, productId: prod.id, productName: prod.name,
        type: 'production_out', quantityOut: requiredQty, quantityIn: 0, balanceAfter: newQty,
        referenceId: executingOrder.id, notes: `صرف خامات لأمر إنتاج ${executingOrder.id}`,
        unitCost: prod.costPrice, totalCost: itemCost, createdAt: new Date().toISOString()
      });
    });
    if (hasError) return;

    if (warnings.length > 0) {
      const proceed = window.confirm(`${warnings.join('\n')}\n\nهل تريد المتابعة مع نقص المواد؟`);
      if (!proceed) return;
    }

    // 2. Add finished goods with CORRECT prorated cost
    const totalCostAll = totalRawCost + proratedExpensesCost + proratedOperationsCost;
    const unitCost = actualQty > 0 ? totalCostAll / actualQty : 0;

    const outIdx = productUpdates.findIndex(p => p.id === executingOrder.outputProductId);
    if (outIdx !== -1) {
      const outProd = productUpdates[outIdx];
      // BUG FIX: Use weighted average cost for finished goods (not simple replacement)
      const existingValue = outProd.quantity * outProd.costPrice;
      const newValue = actualQty * unitCost;
      const totalNewQty = outProd.quantity + actualQty;
      const weightedAvgCost = totalNewQty > 0 ? (existingValue + newValue) / totalNewQty : unitCost;

      productUpdates[outIdx] = { ...outProd, quantity: totalNewQty, costPrice: weightedAvgCost };
      stockUpdates.push({
        id: `ST-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        date: executingOrder.date, productId: outProd.id, productName: outProd.name,
        type: 'production_in', quantityIn: actualQty, quantityOut: 0, balanceAfter: totalNewQty,
        referenceId: executingOrder.id, notes: `إنتاج تام - أمر ${executingOrder.id}`,
        unitCost: unitCost, totalCost: totalCostAll, createdAt: new Date().toISOString()
      });
    }

    setProducts(productUpdates);
    setStockTransactions(prev => [...stockUpdates, ...prev]);

    // 3. Update order
    const updatedOrder: ProductionOrder = {
      ...executingOrder, status: 'completed', producedQuantity: actualQty,
      rawMaterialCost: totalRawCost,
      expensesTotalCost: proratedExpensesCost,
      operationsTotalCost: proratedOperationsCost,
      totalCost: totalCostAll, unitCost
    };
    setProductionOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));

    // 4. Journal Entry - Correct accounting flow for manufacturing
    const jLines: any[] = [
      // Debit WIP with full incoming cost
      { accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: totalCostAll, credit: 0 },
      // Credit raw materials inventory for raw material cost
      { accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: totalRawCost },
    ];
    // Credit each expense account
    executingOrder.expenses.forEach(e => {
      const proratedAmt = e.amount * productionRatio;
      if (proratedAmt > 0) {
        jLines.push({ accountId: e.accountId, accountName: e.accountName, debit: 0, credit: proratedAmt });
      }
    });
    // Credit operations (subcontractors/manufacturing services)
    if (proratedOperationsCost > 0) {
      jLines.push({ accountId: '2101', accountName: 'الموردين - مصنعيات الغير', debit: 0, credit: proratedOperationsCost });
    }
    // Transfer from WIP to Finished Goods
    jLines.push({ accountId: '110403', accountName: 'مخزون الإنتاج التام', debit: totalCostAll, credit: 0 });
    jLines.push({ accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: 0, credit: totalCostAll });

    // Scrap loss (if any) - only if separate from BOM deductions
    if (executingOrder.scrapTotalCost > 0) {
      jLines.push({ accountId: '520000', accountName: 'خسائر هالك الإنتاج', debit: executingOrder.scrapTotalCost, credit: 0 });
      jLines.push({ accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: executingOrder.scrapTotalCost });
    }

    createJournalEntry({
      description: `تنفيذ أمر تصنيع ${updatedOrder.code} - ${updatedOrder.outputProductName} (${actualQty} وحدة)`,
      date: new Date().toISOString().split('T')[0],
      referenceType: 'Manual', referenceId: updatedOrder.id, lines: jLines
    });

    logAction(`تنفيذ أمر تصنيع: ${updatedOrder.code} - إنتاج ${actualQty} وحدة - تكلفة الوحدة: ${unitCost.toFixed(2)} ج.م`);
    setShowExecuteModal(false);
    setExecutingOrder(null);
    alert(`✅ تم تنفيذ أمر التصنيع بنجاح!\n📦 ${actualQty} وحدة تامة بتكلفة ${unitCost.toFixed(2)} ج.م/وحدة\n💰 إجمالي التكلفة: ${totalCostAll.toFixed(2)} ج.م`);
  };

  // ---- Render ----
  const tabBtn = (id: typeof activeTab, label: string, icon: string) => (
    <button
      className={`pb-3 px-5 font-semibold text-base flex items-center gap-2 border-b-2 transition-colors ${activeTab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
      onClick={() => setActiveTab(id)}
    >{icon} {label}</button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-3xl font-bold text-gray-800">التصنيع</h1>
        <div className="flex gap-2">
          {activeTab === 'bom' && (
            <button onClick={() => { setBomForm(emptyBOM()); setShowBOMModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
              + إضافة قائمة مواد
            </button>
          )}
          {activeTab === 'plans' && (
            <button onClick={() => { setPlanForm(emptyPlan()); setShowPlanModal(true); }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
              + إضافة خطة الإنتاج
            </button>
          )}
          {activeTab === 'orders' && (
            <button onClick={() => { setOrderForm(emptyOrder()); setOrderSubTab('materials'); setShowOrderModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2">
              + أضف أمر التصنيع
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabBtn('bom', 'قوائم مواد الإنتاج', '📐')}
        {tabBtn('plans', 'خطط الإنتاج', '📅')}
        {tabBtn('orders', 'أوامر التصنيع', '📋')}
      </div>

      {/* ===================== BOM Tab ===================== */}
      {activeTab === 'bom' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-right">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="p-4 text-sm font-semibold text-blue-800">الاسم</th>
                <th className="p-4 text-sm font-semibold text-blue-800">المنتج الرئيسي</th>
                <th className="p-4 text-sm font-semibold text-blue-800">كمية الإنتاج</th>
                <th className="p-4 text-sm font-semibold text-blue-800">التكلفة الإجمالية</th>
                <th className="p-4 text-sm font-semibold text-blue-800">افتراضي</th>
                <th className="p-4 text-sm font-semibold text-blue-800">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {billsOfMaterials.map(bom => (
                <tr key={bom.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{bom.name}</div>
                    <div className="text-xs text-gray-400">{bom.code}</div>
                  </td>
                  <td className="p-4 text-gray-700">{bom.outputProductName}</td>
                  <td className="p-4 text-gray-600">{bom.outputQuantity} {bom.outputUnit}</td>
                  <td className="p-4 font-bold text-blue-700">{(bom.totalCost || 0).toLocaleString('en', { minimumFractionDigits: 2 })} ج.م</td>
                  <td className="p-4">{bom.isDefault ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="p-4">{statusBadge(bom.status)}</td>
                </tr>
              ))}
              {billsOfMaterials.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">لا توجد قوائم مواد إنتاج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== Plans Tab ===================== */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-right">
            <thead className="bg-purple-50 border-b border-purple-100">
              <tr>
                <th className="p-4 text-sm font-semibold text-purple-800">الاسم</th>
                <th className="p-4 text-sm font-semibold text-purple-800">العميل</th>
                <th className="p-4 text-sm font-semibold text-purple-800">الحالة</th>
                <th className="p-4 text-sm font-semibold text-purple-800">من تاريخ</th>
                <th className="p-4 text-sm font-semibold text-purple-800">إلى تاريخ</th>
                <th className="p-4 text-sm font-semibold text-purple-800">المنتجات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productionPlans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{plan.name}</div>
                    <div className="text-xs text-gray-400">{plan.code}</div>
                  </td>
                  <td className="p-4 text-gray-600">{plan.customerName || '—'}</td>
                  <td className="p-4">{statusBadge(plan.status)}</td>
                  <td className="p-4 text-gray-600">{plan.fromDate || '—'}</td>
                  <td className="p-4 text-gray-600">{plan.toDate || '—'}</td>
                  <td className="p-4 text-gray-600">{(plan.items || []).length} منتج</td>
                </tr>
              ))}
              {productionPlans.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400">لا توجد خطط إنتاج</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== Orders Tab ===================== */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-right">
            <thead className="bg-emerald-50 border-b border-emerald-100">
              <tr>
                <th className="p-4 text-sm font-semibold text-emerald-800">الاسم</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">التاريخ</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">المنتج الرئيسي</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">الكمية</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">التكلفة الإجمالية</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">الحالة</th>
                <th className="p-4 text-sm font-semibold text-emerald-800">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productionOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{order.name}</div>
                    <div className="text-xs text-gray-400">{order.code}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-gray-500">بدأً: <span className="text-blue-600">{order.fromDate}</span></div>
                    <div className="text-xs text-gray-500">ينتهي: <span className="text-red-500">{order.toDate}</span></div>
                  </td>
                  <td className="p-4 text-gray-700 font-semibold">{order.outputProductName}</td>
                  <td className="p-4 text-gray-600">{order.plannedQuantity}</td>
                  <td className="p-4 font-bold text-emerald-700">{(order.totalCost || 0).toLocaleString('en', { minimumFractionDigits: 2 })} ج.م</td>
                  <td className="p-4">{statusBadge(order.status)}</td>
                  <td className="p-4">
                    {(order.status === 'draft' || order.status === 'in_progress') && (
                      <button
                        onClick={() => { setExecutingOrder(order); setActualQty(order.plannedQuantity); setShowExecuteModal(true); }}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1 rounded-lg text-sm font-bold">
                        تنفيذ وترحيل
                      </button>
                    )}
                    {order.status === 'completed' && <span className="text-xs text-gray-400">مرحّل</span>}
                  </td>
                </tr>
              ))}
              {productionOrders.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400">لا توجد أوامر تصنيع</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== BOM Modal ===================== */}
      {showBOMModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-blue-600 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">إضافة قائمة مواد الإنتاج (BOM)</h2>
              <button onClick={() => setShowBOMModal(false)} className="text-white hover:text-blue-200 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الكود *</label>
                  <input className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={bomForm.code} readOnly />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم *</label>
                  <input className="w-full p-2.5 border border-gray-200 rounded-lg" value={bomForm.name} onChange={e => setBomForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">المنتج النهائي *</label>
                  <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={bomForm.outputProductId} onChange={e => setBomForm(p => ({ ...p, outputProductId: e.target.value }))}>
                    <option value="">-- اختر المنتج --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">كمية التجهيز</label>
                  <input type="number" min="1" className="w-full p-2.5 border border-gray-200 rounded-lg" value={bomForm.outputQuantity} onChange={e => setBomForm(p => ({ ...p, outputQuantity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">الحالة</label>
                  <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={bomForm.status} onChange={e => setBomForm(p => ({ ...p, status: e.target.value as any }))}>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ملاحظات</label>
                  <input className="w-full p-2.5 border border-gray-200 rounded-lg" value={bomForm.notes} onChange={e => setBomForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>

              {/* BOM Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-800">الخامات المكونة</h3>
                  <button onClick={handleAddBOMItem} className="text-sm text-blue-600 font-bold hover:underline">+ إضافة</button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3">الصنف (خامة)</th>
                        <th className="p-3 w-28">الكمية</th>
                        <th className="p-3 w-20">الوحدة</th>
                        <th className="p-3 w-28">سعر التكلفة</th>
                        <th className="p-3 w-28">الإجمالي</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bomForm.items || []).map((item, idx) => {
                        const prod = products.find(x => x.id === item.productId);
                        const tc = item.quantity * (prod?.costPrice || 0);
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="p-2">
                              <select className="w-full p-2 border border-gray-200 rounded bg-white" value={item.productId} onChange={e => handleBOMItemChange(idx, 'productId', e.target.value)}>
                                <option value="">-- اختر --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="p-2"><input type="number" className="w-full p-2 border border-gray-200 rounded" value={item.quantity} onChange={e => handleBOMItemChange(idx, 'quantity', Number(e.target.value))} /></td>
                            <td className="p-2 text-center text-gray-500">{prod?.unit || '—'}</td>
                            <td className="p-2 text-center text-gray-600">{(prod?.costPrice || 0).toFixed(2)}</td>
                            <td className="p-2 text-center font-bold text-blue-700">{tc.toFixed(2)}</td>
                            <td className="p-2 text-center"><button onClick={() => handleRemoveBOMItem(idx)} className="text-red-500 hover:text-red-700 font-bold">✕</button></td>
                          </tr>
                        );
                      })}
                      {(bomForm.items || []).length === 0 && (
                        <tr><td colSpan={6} className="p-6 text-center text-gray-400">لا توجد خامات. اضغط "+ إضافة"</td></tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={4} className="p-3 text-left font-bold text-gray-700">الإجمالي</td>
                        <td className="p-3 font-bold text-blue-700">
                          {(bomForm.items || []).reduce((s, i) => { const p = products.find(x => x.id === i.productId); return s + i.quantity * (p?.costPrice || 0); }, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowBOMModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={handleSaveBOM} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Plan Modal ===================== */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b bg-purple-600 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">إضافة خطة الإنتاج</h2>
              <button onClick={() => setShowPlanModal(false)} className="text-white hover:text-purple-200 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* معلومات خطة الإنتاج */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-4">معلومات خطة الإنتاج</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم *</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg" value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الكود *</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={planForm.code} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">التاريخ من</label>
                    <input type="date" className="w-full p-2.5 border border-gray-200 rounded-lg" value={planForm.fromDate} onChange={e => setPlanForm(p => ({ ...p, fromDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">التاريخ إلى</label>
                    <input type="date" className="w-full p-2.5 border border-gray-200 rounded-lg" value={planForm.toDate} onChange={e => setPlanForm(p => ({ ...p, toDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">العميل</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={planForm.customerId} onChange={e => setPlanForm(p => ({ ...p, customerId: e.target.value }))}>
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الموظفين</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="اسم الموظف..." value={(planForm.employeeIds || []).join(', ')} onChange={e => setPlanForm(p => ({ ...p, employeeIds: e.target.value.split(',').map(s => s.trim()) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">نوع المصدر</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={planForm.sourceType} onChange={e => setPlanForm(p => ({ ...p, sourceType: e.target.value }))}>
                      <option value="">-- اختر --</option>
                      <option value="sales_order">أمر بيع</option>
                      <option value="manual">يدوي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">معرف المصدر</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg" value={planForm.sourceRef} onChange={e => setPlanForm(p => ({ ...p, sourceRef: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الوصف</label>
                    <textarea rows={2} className="w-full p-2.5 border border-gray-200 rounded-lg" value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-700">📦 المنتجات ({(planForm.items || []).length})</h3>
                  <button onClick={handleAddPlanItem} className="text-sm text-purple-600 font-bold hover:underline">+ إضافة منتج</button>
                </div>
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3">المنتج</th>
                      <th className="p-3">قائمة المواد</th>
                      <th className="p-3 w-28">الكمية</th>
                      <th className="p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(planForm.items || []).map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-100">
                        <td className="p-2">
                          <select className="w-full p-2 border border-gray-200 rounded bg-white" value={item.productId} onChange={e => handlePlanItemChange(idx, 'productId', e.target.value)}>
                            <option value="">-- اختر --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <select className="w-full p-2 border border-gray-200 rounded bg-white" value={item.bomId} onChange={e => handlePlanItemChange(idx, 'bomId', e.target.value)}>
                            <option value="">-- قائمة المواد --</option>
                            {billsOfMaterials.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2"><input type="number" className="w-full p-2 border border-gray-200 rounded" value={item.quantity} onChange={e => handlePlanItemChange(idx, 'quantity', Number(e.target.value))} /></td>
                        <td className="p-2 text-center"><button onClick={() => handleRemovePlanItem(idx)} className="text-red-500 hover:text-red-700">✕</button></td>
                      </tr>
                    ))}
                    {(planForm.items || []).length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-gray-400">لا توجد منتجات. اضغط "+ إضافة منتج"</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowPlanModal(false)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={() => handleSavePlan()} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-sm">حفظ الخطة</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Order Modal ===================== */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-emerald-600 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">إضافة أمر تصنيع</h2>
                <span className="bg-emerald-500 text-white text-sm px-3 py-1 rounded-full">{orderForm.code}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSaveOrder(true)} className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold">💾 حفظ كمسودة</button>
                <button onClick={() => handleSaveOrder(false)} className="bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-bold">✅ حفظ</button>
                <button onClick={() => setShowOrderModal(false)} className="text-white hover:text-emerald-200 text-2xl ml-2">✕</button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* معلومات أمر التصنيع */}
              <div className="border border-gray-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">معلومات أمر التصنيع</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم *</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg" value={orderForm.name} onChange={e => setOrderForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الكود *</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={orderForm.code} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">التاريخ من</label>
                    <input type="date" className="w-full p-2.5 border border-gray-200 rounded-lg" value={orderForm.fromDate} onChange={e => setOrderForm(p => ({ ...p, fromDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">التاريخ إلى</label>
                    <input type="date" className="w-full p-2.5 border border-gray-200 rounded-lg" value={orderForm.toDate} onChange={e => setOrderForm(p => ({ ...p, toDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الحساب</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={orderForm.accountId} onChange={e => setOrderForm(p => ({ ...p, accountId: e.target.value }))}>
                      <option value="">-- اختر الحساب --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الموظفين</label>
                    <input className="w-full p-2.5 border border-gray-200 rounded-lg" placeholder="اسم الموظف..." value={(orderForm.employeeIds || []).join(', ')} onChange={e => setOrderForm(p => ({ ...p, employeeIds: e.target.value.split(',').map(s => s.trim()) }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">العميل</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={orderForm.customerId} onChange={e => setOrderForm(p => ({ ...p, customerId: e.target.value }))}>
                      <option value="">-- اختر العميل --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">المنتج *</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={orderForm.bomId} onChange={e => handleOrderBOMChange(e.target.value)}>
                      <option value="">-- اختر قائمة المواد --</option>
                      {billsOfMaterials.map(b => <option key={b.id} value={b.id}>{b.outputProductName} ({b.name})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">الكمية المطلوبة *</label>
                    <input type="number" min="1" className="w-full p-2.5 border border-gray-200 rounded-lg" value={orderForm.plannedQuantity} onChange={e => handleOrderQtyChange(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">مخزن الإنتاج</label>
                    <select className="w-full p-2.5 border border-gray-200 rounded-lg bg-gray-50" value={orderForm.outputWarehouseId} onChange={e => setOrderForm(p => ({ ...p, outputWarehouseId: e.target.value }))}>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sub-tabs */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {([
                    { id: 'materials', label: `سند (${(orderForm.bomItems || []).length})`, icon: '📦' },
                    { id: 'expenses', label: `المصاريف (${(orderForm.expenses || []).length})`, icon: '💰' },
                    { id: 'operations', label: `عمليات التصنيع (${(orderForm.operations || []).length})`, icon: '⚙️' },
                    { id: 'scraps', label: `المواد الهالكة (${(orderForm.scraps || []).length})`, icon: '🗑️' },
                  ] as const).map(t => (
                    <button key={t.id}
                      className={`px-5 py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${orderSubTab === t.id ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                      onClick={() => setOrderSubTab(t.id as any)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {/* Materials */}
                  {orderSubTab === 'materials' && (
                    <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-3">صنف</th>
                          <th className="p-3 w-32">الكمية المحددة</th>
                          <th className="p-3 w-20">الوحدة</th>
                          <th className="p-3 w-28">السعر البدئي</th>
                          <th className="p-3 w-28">الإجمالي الفرعي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(orderForm.bomItems || []).map((item, idx) => (
                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="p-3 font-semibold text-gray-800">{item.productName || '—'}</td>
                            <td className="p-3 text-gray-600">{item.quantity}</td>
                            <td className="p-3 text-gray-500">{item.unit}</td>
                            <td className="p-3 text-gray-600">{(item.unitCost || 0).toFixed(2)}</td>
                            <td className="p-3 font-bold text-emerald-700">{(item.totalCost || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                        {(orderForm.bomItems || []).length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-gray-400">اختر قائمة مواد أولاً</td></tr>
                        )}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                        <tr>
                          <td colSpan={4} className="p-3 font-bold text-gray-700 text-left">إجمالي</td>
                          <td className="p-3 font-bold text-emerald-700 text-lg">{(orderForm.rawMaterialCost || 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}

                  {/* Expenses */}
                  {orderSubTab === 'expenses' && (
                    <div>
                      <div className="flex justify-end mb-3">
                        <button onClick={addExpense} className="text-sm text-blue-600 font-bold hover:underline">+ إضافة</button>
                      </div>
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3">الوصف</th>
                            <th className="p-3">الحساب</th>
                            <th className="p-3 w-32">المبلغ</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(orderForm.expenses || []).map((exp, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="p-2"><input className="w-full p-2 border border-gray-200 rounded" value={exp.description} onChange={e => updateExpense(idx, 'description', e.target.value)} /></td>
                              <td className="p-2">
                                <select className="w-full p-2 border border-gray-200 rounded bg-white" value={exp.accountId} onChange={e => updateExpense(idx, 'accountId', e.target.value)}>
                                  <option value="">-- اختر حساب --</option>
                                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                </select>
                              </td>
                              <td className="p-2"><input type="number" className="w-full p-2 border border-gray-200 rounded" value={exp.amount} onChange={e => updateExpense(idx, 'amount', Number(e.target.value))} /></td>
                              <td className="p-2 text-center"><button onClick={() => removeExpense(idx)} className="text-red-500 hover:text-red-700">✕</button></td>
                            </tr>
                          ))}
                          {(orderForm.expenses || []).length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد مصاريف. اضغط "+ إضافة"</td></tr>
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                          <tr>
                            <td colSpan={2} className="p-3 font-bold text-gray-700 text-left">إجمالي</td>
                            <td className="p-3 font-bold text-blue-700">{(orderForm.expensesTotalCost || 0).toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Operations */}
                  {orderSubTab === 'operations' && (
                    <div>
                      <div className="flex justify-end mb-3">
                        <button onClick={addOperation} className="text-sm text-blue-600 font-bold hover:underline">+ إضافة</button>
                      </div>
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3">اسم العملية</th>
                            <th className="p-3">مركز العمل</th>
                            <th className="p-3 w-32">التكلفة الإجمالية</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(orderForm.operations || []).map((op, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="p-2"><input className="w-full p-2 border border-gray-200 rounded" value={op.name} onChange={e => updateOperation(idx, 'name', e.target.value)} /></td>
                              <td className="p-2"><input className="w-full p-2 border border-gray-200 rounded" value={op.workCenterName || ''} onChange={e => updateOperation(idx, 'workCenterName', e.target.value)} /></td>
                              <td className="p-2"><input type="number" className="w-full p-2 border border-gray-200 rounded" value={op.totalCost} onChange={e => updateOperation(idx, 'totalCost', Number(e.target.value))} /></td>
                              <td className="p-2 text-center"><button onClick={() => removeOperation(idx)} className="text-red-500 hover:text-red-700">✕</button></td>
                            </tr>
                          ))}
                          {(orderForm.operations || []).length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد عمليات تصنيع. اضغط "+ إضافة"</td></tr>
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                          <tr>
                            <td colSpan={2} className="p-3 font-bold text-gray-700 text-left">إجمالي</td>
                            <td className="p-3 font-bold text-purple-700">{(orderForm.operationsTotalCost || 0).toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Scraps */}
                  {orderSubTab === 'scraps' && (
                    <div>
                      <div className="flex justify-end mb-3">
                        <button onClick={addScrap} className="text-sm text-blue-600 font-bold hover:underline">+ إضافة</button>
                      </div>
                      <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-3">الصنف</th>
                            <th className="p-3 w-28">الكمية</th>
                            <th className="p-3 w-24">الوحدة</th>
                            <th className="p-3 w-28">سعر التكلفة</th>
                            <th className="p-3 w-28">الإجمالي</th>
                            <th className="p-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(orderForm.scraps || []).map((sc, idx) => (
                            <tr key={idx} className="border-t border-gray-100">
                              <td className="p-2">
                                <select className="w-full p-2 border border-gray-200 rounded bg-white" value={sc.productId} onChange={e => updateScrap(idx, 'productId', e.target.value)}>
                                  <option value="">-- اختر --</option>
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </td>
                              <td className="p-2"><input type="number" className="w-full p-2 border border-gray-200 rounded" value={sc.quantity} onChange={e => updateScrap(idx, 'quantity', Number(e.target.value))} /></td>
                              <td className="p-2 text-center text-gray-500">{sc.unit || '—'}</td>
                              <td className="p-2 text-center text-gray-600">{(sc.unitCost || 0).toFixed(2)}</td>
                              <td className="p-2 font-bold text-red-600">{(sc.totalCost || 0).toFixed(2)}</td>
                              <td className="p-2 text-center"><button onClick={() => removeScrap(idx)} className="text-red-500 hover:text-red-700">✕</button></td>
                            </tr>
                          ))}
                          {(orderForm.scraps || []).length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد مواد هالكة. اضغط "+ إضافة"</td></tr>
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                          <tr>
                            <td colSpan={4} className="p-3 font-bold text-gray-700 text-left">إجمالي الهالك</td>
                            <td className="p-3 font-bold text-red-600">{(orderForm.scrapTotalCost || 0).toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Total summary */}
                <div className="border-t border-gray-200 bg-emerald-50 p-4 flex flex-wrap justify-end gap-6 text-sm">
                  <div className="text-gray-600">خامات: <span className="font-bold text-gray-800">{(orderForm.rawMaterialCost || 0).toFixed(2)} ج.م</span></div>
                  <div className="text-gray-600">مصاريف: <span className="font-bold text-blue-700">{(orderForm.expensesTotalCost || 0).toFixed(2)} ج.م</span></div>
                  <div className="text-gray-600">عمليات: <span className="font-bold text-purple-700">{(orderForm.operationsTotalCost || 0).toFixed(2)} ج.م</span></div>
                  <div className="text-base font-bold text-emerald-800">إجمالي التكلفة: {totalOrderCost.toFixed(2)} ج.م</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Execute Modal ===================== */}
      {showExecuteModal && executingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">تنفيذ وترحيل أمر التصنيع</h2>
            <p className="text-sm text-gray-500 mb-5">
              سيتم سحب الخامات من المخزون، إضافة المنتج التام، وتسجيل القيد المحاسبي الشامل تلقائياً.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">الأمر:</span><span className="font-bold">{executingOrder.code}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">المنتج:</span><span className="font-bold">{executingOrder.outputProductName}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">الكمية المخططة:</span><span className="font-bold">{executingOrder.plannedQuantity}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">إجمالي التكلفة:</span><span className="font-bold text-emerald-700">{executingOrder.totalCost.toFixed(2)} ج.م</span></div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-1">الكمية الفعلية المنتجة</label>
              <input type="number" className="w-full p-3 border-2 border-emerald-300 rounded-lg text-lg font-bold" value={actualQty} onChange={e => setActualQty(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowExecuteModal(false); setExecutingOrder(null); }} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">إلغاء</button>
              <button onClick={executeProduction} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm">تنفيذ وترحيل 📤</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manufacturing;
