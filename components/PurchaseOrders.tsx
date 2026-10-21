import React, { useState, useMemo } from 'react';
import type { PurchaseOrder, Supplier, Product, InvoiceItem, CompanyInfo, Page } from '../types.ts';
import { exportToExcel } from '../utils/exportToExcel.ts';

interface PurchaseOrdersProps {
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  suppliers: Supplier[];
  products: Product[];
  onConvertToInvoice: (order: PurchaseOrder) => void;
  onNavigate: (page: Page) => void;
  onOpenSettings?: () => void;
  logAction?: (action: string) => void;
  initialOrderData?: Partial<PurchaseOrder> | null;
  onClearInitialOrder?: () => void;
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({
  orders,
  setOrders,
  suppliers,
  products,
  onConvertToInvoice,
  onNavigate,
  onOpenSettings,
  logAction,
  initialOrderData,
  onClearInitialOrder
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'partially_received' | 'completed' | 'cancelled'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  // Form State
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formDeliveryLocation, setFormDeliveryLocation] = useState('المخزن الرئيسي');
  const [formPaymentTerms, setFormPaymentTerms] = useState('آجل 30 يوم');
  const [formRequestId, setFormRequestId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDiscountValue, setFormDiscountValue] = useState(0);
  const [formDiscountType, setFormDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [formTaxRate, setFormTaxRate] = useState(0);

  const [formItems, setFormItems] = useState<InvoiceItem[]>([
    { productId: '', productName: '', quantity: 1, price: 0, total: 0, unit: 'عدد' }
  ]);

  // Handle Initial Data (e.g. converted from Purchase Request)
  React.useEffect(() => {
    if (initialOrderData) {
      setEditingOrder(null);
      setFormSupplierId(initialOrderData.supplierId || (suppliers[0]?.id || ''));
      setFormDate(initialOrderData.date || new Date().toISOString().split('T')[0]);
      setFormDeliveryDate(initialOrderData.expectedDeliveryDate || '');
      setFormDeliveryLocation(initialOrderData.deliveryLocation || 'المخزن الرئيسي');
      setFormPaymentTerms(initialOrderData.paymentTerms || 'آجل 30 يوم');
      setFormRequestId(initialOrderData.requestId || '');
      setFormNotes(initialOrderData.notes || '');
      if (initialOrderData.items && initialOrderData.items.length > 0) {
        setFormItems([...initialOrderData.items]);
      }
      setIsModalOpen(true);
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialOrderData, suppliers, onClearInitialOrder]);

  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setFormSupplierId(suppliers[0]?.id || '');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDeliveryDate('');
    setFormDeliveryLocation('المخزن الرئيسي');
    setFormPaymentTerms('آجل 30 يوم');
    setFormRequestId('');
    setFormNotes('');
    setFormDiscountValue(0);
    setFormDiscountType('amount');
    setFormTaxRate(0);
    setFormItems([{ productId: '', productName: '', quantity: 1, price: 0, total: 0, unit: 'عدد' }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setFormSupplierId(order.supplierId);
    setFormDate(order.date);
    setFormDeliveryDate(order.expectedDeliveryDate || '');
    setFormDeliveryLocation(order.deliveryLocation || 'المخزن الرئيسي');
    setFormPaymentTerms(order.paymentTerms || 'آجل 30 يوم');
    setFormRequestId(order.requestId || '');
    setFormNotes(order.notes || '');
    setFormDiscountValue(order.discountValue || 0);
    setFormDiscountType(order.discountType || 'amount');
    setFormTaxRate(order.taxRate || 0);
    setFormItems(order.items && order.items.length > 0 ? [...order.items] : [
      { productId: '', productName: '', quantity: 1, price: 0, total: 0, unit: 'عدد' }
    ]);
    setIsModalOpen(true);
  };

  const handleItemProductChange = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    setFormItems(prev => {
      const updated = [...prev];
      const prodName = selectedProd ? selectedProd.name : '';
      const unitCost = selectedProd ? (selectedProd.costPrice || 0) : 0;
      const unit = (selectedProd?.unit as any) || 'عدد';
      const qty = updated[index].quantity || 1;
      updated[index] = {
        ...updated[index],
        productId,
        productName: prodName,
        productCode: selectedProd?.sku || selectedProd?.barcode || '',
        price: unitCost,
        unit,
        total: qty * unitCost
      };
      return updated;
    });
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const validQty = Math.max(0, qty);
      const price = updated[index].price || 0;
      updated[index] = {
        ...updated[index],
        quantity: validQty,
        total: validQty * price
      };
      return updated;
    });
  };

  const handleItemPriceChange = (index: number, price: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const validPrice = Math.max(0, price);
      const qty = updated[index].quantity || 0;
      updated[index] = {
        ...updated[index],
        price: validPrice,
        total: qty * validPrice
      };
      return updated;
    });
  };

  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: 1, price: 0, total: 0, unit: 'عدد' }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const subTotal = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [formItems]);

  const discountAmount = useMemo(() => {
    if (formDiscountType === 'percentage') {
      return (subTotal * (formDiscountValue || 0)) / 100;
    }
    return formDiscountValue || 0;
  }, [subTotal, formDiscountValue, formDiscountType]);

  const taxAmount = useMemo(() => {
    const afterDiscount = Math.max(0, subTotal - discountAmount);
    return (afterDiscount * (formTaxRate || 0)) / 100;
  }, [subTotal, discountAmount, formTaxRate]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subTotal - discountAmount + taxAmount);
  }, [subTotal, discountAmount, taxAmount]);

  const handleSaveOrder = () => {
    if (!formSupplierId) {
      alert('يرجى اختيار المورد لأمر الشراء');
      return;
    }

    const supplier = suppliers.find(s => s.id === formSupplierId);
    const validItems = formItems.filter(i => (i.productName || i.productId) && i.quantity > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل محدد الكمية');
      return;
    }

    if (editingOrder) {
      const updated: PurchaseOrder = {
        ...editingOrder,
        supplierId: formSupplierId,
        supplierName: supplier?.name || 'مورد غير محدد',
        companyName: supplier?.companyName,
        date: formDate,
        expectedDeliveryDate: formDeliveryDate,
        deliveryLocation: formDeliveryLocation,
        paymentTerms: formPaymentTerms,
        requestId: formRequestId,
        items: validItems,
        subTotal,
        discountValue: formDiscountValue,
        discountType: formDiscountType,
        taxRate: formTaxRate,
        taxAmount,
        total: grandTotal,
        notes: formNotes
      };
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      if (logAction) logAction(`تعديل أمر شراء رقم ${updated.id}`);
    } else {
      const newId = `PO-${Date.now().toString().slice(-6)}`;
      const newOrder: PurchaseOrder = {
        id: newId,
        supplierId: formSupplierId,
        supplierName: supplier?.name || 'مورد غير محدد',
        companyName: supplier?.companyName,
        date: formDate,
        expectedDeliveryDate: formDeliveryDate,
        deliveryLocation: formDeliveryLocation,
        paymentTerms: formPaymentTerms,
        requestId: formRequestId,
        items: validItems,
        subTotal,
        discountValue: formDiscountValue,
        discountType: formDiscountType,
        taxRate: formTaxRate,
        taxAmount,
        total: grandTotal,
        notes: formNotes,
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      setOrders(prev => [newOrder, ...prev]);
      if (logAction) logAction(`إنشاء أمر شراء جديد رقم ${newId} للمورد: ${supplier?.name}`);
    }

    setIsModalOpen(false);
  };

  const handleStatusChange = (orderId: string, newStatus: PurchaseOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (logAction) logAction(`تحديث حالة أمر الشراء ${orderId} إلى ${newStatus}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    if (confirm(`هل أنت متأكد من حذف أمر الشراء رقم ${orderId}؟`)) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (logAction) logAction(`حذف أمر شراء رقم ${orderId}`);
    }
  };

  const handlePrintOrder = (order: PurchaseOrder) => {
    const companyInfoStr = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoStr
      ? JSON.parse(companyInfoStr)
      : { name: 'شركتك', address: 'العنوان', phone: 'الهاتف', logo: '' };

    const supplier = suppliers.find(s => s.id === order.supplierId);

    const printContent = `
      <html>
        <head>
          <title>أمر شراء رسمي رقم ${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1f2937; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .po-badge { font-size: 26px; font-weight: bold; color: #1e40af; margin: 0; }
            .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-size: 13px; }
            th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
            .totals { margin-top: 20px; width: 320px; margin-right: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .totals table { margin: 0; }
            .totals td { padding: 8px 12px; }
            .final-total { background: #eff6ff; font-weight: bold; font-size: 15px; color: #1e40af; }
            .terms { margin-top: 30px; font-size: 12px; color: #475569; background: #fafafa; padding: 12px; border-radius: 6px; }
            .signatures { margin-top: 45px; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 13px; }
            .sig-line { margin-top: 40px; border-top: 1px dashed #64748b; width: 75%; margin-inline: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="po-badge">أمر شراء بضائع ومستلزمات (Purchase Order)</div>
              <div style="font-size: 13px; color: #64748b;">رقم أمر الشراء: <strong>${order.id}</strong></div>
              ${order.requestId ? `<div style="font-size: 12px; color: #7c3aed;">مرجع طلب الشراء: ${order.requestId}</div>` : ''}
            </div>
            <div style="text-align: left;">
              <h2 style="margin: 0; color: #1e3a8a;">${companyInfo.name}</h2>
              <div style="font-size: 12px; color: #64748b;">${companyInfo.address || ''} - ${companyInfo.phone || ''}</div>
            </div>
          </div>

          <div class="meta-box">
            <div>
              <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">بيانات المورد المكلف:</div>
              <div><strong>اسم المورد:</strong> ${order.supplierName}</div>
              <div><strong>الشركة:</strong> ${order.companyName || supplier?.companyName || '—'}</div>
              <div><strong>الهاتف:</strong> ${supplier?.phone || '—'}</div>
              <div><strong>العنوان:</strong> ${supplier?.address || '—'}</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">تفاصيل التوريد والتعاقد:</div>
              <div><strong>تاريخ الأمر:</strong> ${order.date}</div>
              <div><strong>تاريخ التسليم المطلوب:</strong> ${order.expectedDeliveryDate || 'بحسب الاتفاق'}</div>
              <div><strong>موقع الاستلام:</strong> ${order.deliveryLocation || 'المخزن الرئيسي'}</div>
              <div><strong>شروط السداد:</strong> ${order.paymentTerms || 'آجل'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>اسم الصنف / البيان</th>
                <th>كود الصنف</th>
                <th style="text-align: center;">الكمية المطلوبة</th>
                <th style="text-align: center;">الوحدة</th>
                <th style="text-align: center;">سعر الوحدة</th>
                <th style="text-align: center;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${item.productName}</strong></td>
                  <td>${item.productCode || item.sku || '—'}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.unit || 'عدد'}</td>
                  <td style="text-align: center;">${(item.price || 0).toLocaleString()} ج.م</td>
                  <td style="text-align: center;">${(item.total || 0).toLocaleString()} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <table>
              <tr>
                <td>المجموع قبل الخصم:</td>
                <td style="text-align: left;">${(order.subTotal || order.total).toLocaleString()} ج.م</td>
              </tr>
              ${order.discountValue ? `
                <tr>
                  <td>الخصم التجاري:</td>
                  <td style="text-align: left; color: #dc2626;">-${(order.discountType === 'percentage' ? ((order.subTotal || 0) * order.discountValue / 100) : order.discountValue).toLocaleString()} ج.م</td>
                </tr>
              ` : ''}
              ${order.taxAmount ? `
                <tr>
                  <td>ضريبة القيمة المضافة (${order.taxRate}%):</td>
                  <td style="text-align: left;">+${(order.taxAmount || 0).toLocaleString()} ج.م</td>
                </tr>
              ` : ''}
              <tr class="final-total">
                <td>الإجمالي المستحق للتوريد:</td>
                <td style="text-align: left;">${(order.total || 0).toLocaleString()} ج.م</td>
              </tr>
            </table>
          </div>

          ${order.notes ? `
            <div style="margin-top: 15px; padding: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 13px;">
              <strong>ملاحظات وشروط خاصة:</strong> ${order.notes}
            </div>
          ` : ''}

          <div class="terms">
            <strong>شروط وأحكام أمر الشراء:</strong><br />
            1. يجب فحص ومطابقة جميع البضائع الموردة مع المواصفات الفنية المعتمدة قبل القبول النهائي.<br />
            2. يجب إرفاق أصل أمر الشراء هذا مع إذن التوريد وفاتورة المورد عند الاستلام في المخزن.<br />
            3. لا يُعتد بأي تعديل في الأسعار أو الكميات إلا بموافقة خطية مسبقة من إدارة المشتريات.
          </div>

          <div class="signatures">
            <div>
              <strong>مسؤول المشتريات</strong>
              <div class="sig-line"></div>
            </div>
            <div>
              <strong>مدير الحسابات</strong>
              <div class="sig-line"></div>
            </div>
            <div>
              <strong>اعتماد الإدارة العامة</strong>
              <div class="sig-line"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 350);
    }
  };

  const handleExportExcel = () => {
    const data = filteredOrders.map(o => ({
      'رقم أمر الشراء': o.id,
      'التاريخ': o.date,
      'المورد': o.supplierName,
      'تاريخ الاستلام المتوقع': o.expectedDeliveryDate || '',
      'عدد البنود': o.items.length,
      'الإجمالي': o.total,
      'شروط السداد': o.paymentTerms || '',
      'الحالة': o.status === 'completed' ? 'مكتمل ومُفوتر' : o.status === 'sent' ? 'مرسل للمورد' : o.status === 'partially_received' ? 'مستلم جزئياً' : o.status === 'cancelled' ? 'ملغي' : 'مسودة',
      'مرجع طلب الشراء': o.requestId || ''
    }));
    exportToExcel(data, 'أوامر_الشراء_PO');
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.requestId && o.requestId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        o.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: orders.length,
      draft: orders.filter(o => o.status === 'draft').length,
      sent: orders.filter(o => o.status === 'sent').length,
      completed: orders.filter(o => o.status === 'completed').length,
      totalValue: orders.reduce((sum, o) => sum + (o.total || 0), 0)
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Top Documentary Cycle Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('purchaseRequests')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all border border-gray-200"
          >
            <span>📝</span>
            <span>طلبات الشراء (PR)</span>
          </button>
          <button
            onClick={() => onNavigate('purchaseOrders')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-purple-600 text-white shadow-sm transition-all"
          >
            <span>📑</span>
            <span>أوامر الشراء (PO)</span>
            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">{orders.length}</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all border border-gray-200"
          >
            <span>🧾</span>
            <span>فواتير ومرتجعات المشتريات</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="bg-white border border-gray-300 text-gray-700 hover:text-purple-600 hover:bg-gray-50 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-sm text-sm"
              title="إعدادات التوجيه المحاسبي للمشتريات"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">إعدادات التوجيه</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="bg-green-600 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-700 flex items-center gap-1.5 text-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 flex items-center gap-1.5 text-sm shadow-sm"
          >
            <span>+</span>
            <span>إنشاء أمر شراء رسمي</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold mb-1">إجمالي أوامر الشراء</div>
          <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-xs text-blue-700 font-semibold mb-1">أوامر مرسلة للموردين</div>
          <div className="text-2xl font-bold text-blue-800">{summary.sent}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs text-emerald-700 font-semibold mb-1">أوامر مكتملة ومُفوترة</div>
          <div className="text-2xl font-bold text-emerald-800">{summary.completed}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-xs text-purple-700 font-semibold mb-1">إجمالي مبالغ التعاقد</div>
          <div className="text-2xl font-bold text-purple-800">{summary.totalValue.toLocaleString()} ج.م</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="بحث برقم أمر الشراء، المورد، أو اسم الصنف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">مرسل للمورد</option>
            <option value="partially_received">مستلم جزئياً</option>
            <option value="completed">مكتمل ومُفوتر</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">رقم الأمر</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">المورد المكلف</th>
                <th className="p-3">تاريخ التسليم</th>
                <th className="p-3">الأصناف</th>
                <th className="p-3">إجمالي القيمة</th>
                <th className="p-3">شروط الدفع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    لا توجد أوامر شراء مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const statusBadge =
                    order.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'sent'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'partially_received'
                      ? 'bg-amber-100 text-amber-800'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-purple-700">
                        {order.id}
                        {order.requestId && (
                          <div className="text-[10px] text-gray-400 font-normal">عن: {order.requestId}</div>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{order.date}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {order.supplierName}
                        {order.companyName && <span className="text-xs text-gray-500 block">{order.companyName}</span>}
                      </td>
                      <td className="p-3 text-gray-600">{order.expectedDeliveryDate || '—'}</td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate text-xs text-gray-600" title={order.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}>
                          {order.items.map(i => `${i.productName} (${i.quantity} ${i.unit || 'عدد'})`).join('، ')}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-gray-800">
                        {(order.total || 0).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-xs text-gray-600">{order.paymentTerms || 'آجل'}</td>
                      <td className="p-3">
                        <select
                          value={order.status}
                          onChange={e => handleStatusChange(order.id, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded-md border-0 cursor-pointer ${statusBadge}`}
                        >
                          <option value="draft">مسودة</option>
                          <option value="sent">مرسل للمورد</option>
                          <option value="partially_received">مستلم جزئياً</option>
                          <option value="completed">مكتمل ومُفوتر ✓</option>
                          <option value="cancelled">ملغي ✗</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Convert to Purchase Invoice */}
                          <button
                            onClick={() => onConvertToInvoice(order)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                            title="تحويل إلى فاتورة مشتريات رسمية (Purchase Invoice)"
                          >
                            <span>🧾</span>
                            <span>فاتورة</span>
                          </button>

                          {/* Print PO */}
                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded text-xs"
                            title="طباعة أمر الشراء الرسمي"
                          >
                            🖨️
                          </button>

                          {/* Edit PO */}
                          <button
                            onClick={() => handleOpenEditModal(order)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-1.5 rounded text-xs"
                            title="تعديل أمر الشراء"
                          >
                            ✏️
                          </button>

                          {/* Delete PO */}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded text-xs"
                            title="حذف أمر الشراء"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Purchase Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingOrder ? `تعديل أمر الشراء (${editingOrder.id})` : 'إنشاء أمر شراء رسمي جديد (Purchase Order)'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">المورد المكلف بالطلب *</label>
                  <select
                    value={formSupplierId}
                    onChange={e => setFormSupplierId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} {s.companyName ? `(${s.companyName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ أمر الشراء</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ الاستلام والتوريد المتوقع</label>
                  <input
                    type="date"
                    value={formDeliveryDate}
                    onChange={e => setFormDeliveryDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">موقع / مخزن الاستلام</label>
                  <input
                    type="text"
                    value={formDeliveryLocation}
                    onChange={e => setFormDeliveryLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">شروط السداد والدفع</label>
                  <input
                    type="text"
                    value={formPaymentTerms}
                    onChange={e => setFormPaymentTerms(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">مرجع طلب الشراء (PR Ref)</label>
                  <input
                    type="text"
                    placeholder="مثال: PR-123456"
                    value={formRequestId}
                    onChange={e => setFormRequestId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-800">الأصناف والخامات المطلوبة للتوريد</h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-200"
                  >
                    + إضافة صنف
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap md:flex-nowrap gap-2 items-center">
                      <div className="w-8 text-center text-xs font-bold text-gray-400">#{idx + 1}</div>

                      <div className="flex-1 min-w-[200px]">
                        <select
                          value={item.productId}
                          onChange={e => handleItemProductChange(idx, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white"
                        >
                          <option value="">-- اختر من دليل الأصناف أو اكتب اسم الصنف --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                          ))}
                        </select>
                        {!item.productId && (
                          <input
                            type="text"
                            placeholder="أو اكتب اسم مادة مخصصة..."
                            value={item.productName}
                            onChange={e => {
                              const val = e.target.value;
                              setFormItems(prev => {
                                const u = [...prev];
                                u[idx].productName = val;
                                return u;
                              });
                            }}
                            className="w-full mt-1 p-1.5 border border-gray-300 rounded text-xs bg-white"
                          />
                        )}
                      </div>

                      <div className="w-24">
                        <label className="text-[10px] text-gray-500 block mb-0.5">الكمية</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleItemQtyChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-20">
                        <label className="text-[10px] text-gray-500 block mb-0.5">الوحدة</label>
                        <input
                          type="text"
                          value={item.unit || 'عدد'}
                          onChange={e => {
                            const val = e.target.value;
                            setFormItems(prev => {
                              const u = [...prev];
                              u[idx].unit = val as any;
                              return u;
                            });
                          }}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] text-gray-500 block mb-0.5">سعر الوحدة</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.price}
                          onChange={e => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-28 text-left">
                        <label className="text-[10px] text-gray-500 block mb-0.5">الإجمالي</label>
                        <div className="text-xs font-bold text-gray-800 p-1.5">
                          {(item.total || 0).toLocaleString()} ج.م
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={formItems.length <= 1}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded disabled:opacity-30"
                        title="حذف السطر"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>

                {/* Calculation Summary Footer */}
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">الخصم التجاري الممنوح</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={formDiscountValue}
                        onChange={e => setFormDiscountValue(parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded-lg text-sm bg-white"
                      />
                      <select
                        value={formDiscountType}
                        onChange={e => setFormDiscountType(e.target.value as any)}
                        className="p-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value="amount">ج.م</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-600 block mb-1">ضريبة القيمة المضافة (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formTaxRate}
                      onChange={e => setFormTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 border rounded-lg text-sm bg-white"
                      placeholder="مثال: 14"
                    />
                  </div>

                  <div className="text-left md:border-r md:pr-4">
                    <div className="text-xs text-gray-500">المجموع قبل الضريبة: {subTotal.toLocaleString()} ج.م</div>
                    {discountAmount > 0 && (
                      <div className="text-xs text-red-600">الخصم: -{discountAmount.toLocaleString()} ج.م</div>
                    )}
                    {taxAmount > 0 && (
                      <div className="text-xs text-blue-600">الضريبة ({formTaxRate}%): +{taxAmount.toLocaleString()} ج.م</div>
                    )}
                    <div className="text-base font-bold text-purple-700 mt-1">
                      الإجمالي النهائي: {grandTotal.toLocaleString()} ج.م
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">ملاحظات وشروط خاصة</label>
                <textarea
                  rows={2}
                  placeholder="شروط التسليم، شهادات الجودة المطلوبة، طريقة التغليف، إلخ..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-md"
              >
                {editingOrder ? 'حفظ التعديلات' : 'حفظ أمر الشراء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;