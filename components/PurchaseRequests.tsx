import React, { useState, useMemo } from 'react';
import type { PurchaseRequest, PurchaseRequestItem, Product, CompanyInfo, Page } from '../types.ts';
import { exportToExcel } from '../utils/exportToExcel.ts';

interface PurchaseRequestsProps {
  requests: PurchaseRequest[];
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
  products: Product[];
  onConvertToOrder: (request: PurchaseRequest) => void;
  onNavigate: (page: Page) => void;
  onOpenSettings?: () => void;
  logAction?: (action: string) => void;
}

const PurchaseRequests: React.FC<PurchaseRequestsProps> = ({
  requests,
  setRequests,
  products,
  onConvertToOrder,
  onNavigate,
  onOpenSettings,
  logAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'converted'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent' | 'critical'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null);

  // Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDepartment, setFormDepartment] = useState('الإنتاج');
  const [formRequester, setFormRequester] = useState('');
  const [formPriority, setFormPriority] = useState<'normal' | 'urgent' | 'critical'>('normal');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<PurchaseRequestItem[]>([
    { productId: '', productName: '', quantity: 1, unit: 'عدد', estimatedUnitPrice: 0, estimatedTotal: 0 }
  ]);

  const departments = ['الإنتاج', 'المخازن', 'الصيانة', 'المبيعات', 'الإدارة العامة', 'الجودة', 'المشتريات'];

  const handleOpenAddModal = () => {
    setEditingRequest(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDepartment('الإنتاج');
    setFormRequester('');
    setFormPriority('normal');
    setFormNotes('');
    setFormItems([{ productId: '', productName: '', quantity: 1, unit: 'عدد', estimatedUnitPrice: 0, estimatedTotal: 0 }]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (req: PurchaseRequest) => {
    setEditingRequest(req);
    setFormDate(req.date);
    setFormDepartment(req.department || 'الإنتاج');
    setFormRequester(req.requesterName || '');
    setFormPriority(req.priority);
    setFormNotes(req.notes || '');
    setFormItems(req.items && req.items.length > 0 ? [...req.items] : [
      { productId: '', productName: '', quantity: 1, unit: 'عدد', estimatedUnitPrice: 0, estimatedTotal: 0 }
    ]);
    setIsModalOpen(true);
  };

  const handleItemProductChange = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    setFormItems(prev => {
      const updated = [...prev];
      const prodName = selectedProd ? selectedProd.name : '';
      const unitCost = selectedProd ? (selectedProd.costPrice || 0) : 0;
      const unit = selectedProd?.unit || 'عدد';
      const qty = updated[index].quantity || 1;
      updated[index] = {
        ...updated[index],
        productId,
        productName: prodName,
        productCode: selectedProd?.sku || selectedProd?.barcode || '',
        unit,
        estimatedUnitPrice: unitCost,
        estimatedTotal: unitCost * qty
      };
      return updated;
    });
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    setFormItems(prev => {
      const updated = [...prev];
      const validQty = Math.max(0, qty);
      const price = updated[index].estimatedUnitPrice || 0;
      updated[index] = {
        ...updated[index],
        quantity: validQty,
        estimatedTotal: validQty * price
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
        estimatedUnitPrice: validPrice,
        estimatedTotal: qty * validPrice
      };
      return updated;
    });
  };

  const handleAddItemRow = () => {
    setFormItems(prev => [
      ...prev,
      { productId: '', productName: '', quantity: 1, unit: 'عدد', estimatedUnitPrice: 0, estimatedTotal: 0 }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  const formEstimatedTotal = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.estimatedTotal || 0), 0);
  }, [formItems]);

  const handleSaveRequest = () => {
    const validItems = formItems.filter(i => (i.productName || i.productId) && i.quantity > 0);
    if (validItems.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل محدد الكمية في طلب الشراء');
      return;
    }

    if (editingRequest) {
      const updated: PurchaseRequest = {
        ...editingRequest,
        date: formDate,
        department: formDepartment,
        requesterName: formRequester,
        priority: formPriority,
        notes: formNotes,
        items: validItems,
        totalEstimatedAmount: formEstimatedTotal
      };
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      if (logAction) logAction(`تعديل طلب شراء رقم ${updated.id}`);
    } else {
      const newId = `PR-${Date.now().toString().slice(-6)}`;
      const newRequest: PurchaseRequest = {
        id: newId,
        date: formDate,
        department: formDepartment,
        requesterName: formRequester || 'مسؤول المشتريات',
        priority: formPriority,
        notes: formNotes,
        items: validItems,
        totalEstimatedAmount: formEstimatedTotal,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setRequests(prev => [newRequest, ...prev]);
      if (logAction) logAction(`إنشاء طلب شراء جديد رقم ${newId} للقسم: ${formDepartment}`);
    }

    setIsModalOpen(false);
  };

  const handleStatusChange = (requestId: string, newStatus: PurchaseRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    if (logAction) logAction(`تغيير حالة طلب الشراء ${requestId} إلى ${newStatus}`);
  };

  const handleDeleteRequest = (requestId: string) => {
    if (confirm(`هل أنت متأكد من حذف طلب الشراء رقم ${requestId}؟`)) {
      setRequests(prev => prev.filter(r => r.id !== requestId));
      if (logAction) logAction(`حذف طلب شراء رقم ${requestId}`);
    }
  };

  const handlePrintRequest = (req: PurchaseRequest) => {
    const companyInfoStr = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoStr
      ? JSON.parse(companyInfoStr)
      : { name: 'شركتك', address: 'العنوان', phone: 'الهاتف', logo: '' };

    const priorityLabel = req.priority === 'critical' ? 'طارئ جداً' : req.priority === 'urgent' ? 'عاجل' : 'عادي';
    const statusLabel = req.status === 'approved' ? 'معتمد' : req.status === 'converted' ? 'تم التحويل لأمر شراء' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة';

    const printContent = `
      <html>
        <head>
          <title>طلب شراء رقم ${req.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; color: #1f2937; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 24px; font-bold: true; color: #1e40af; margin: 0; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; font-size: 13px; }
            th { background-color: #f1f5f9; color: #334155; }
            .total-box { margin-top: 20px; text-align: left; font-size: 16px; font-weight: bold; }
            .signatures { margin-top: 50px; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 14px; }
            .sig-line { margin-top: 40px; border-top: 1px dashed #64748b; width: 80%; margin-inline: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">طلب شراء مواد ومستلزمات (Purchase Requisition)</h1>
              <div style="font-size: 12px; color: #64748b;">رقم المستند: ${req.id}</div>
            </div>
            <div style="text-align: left;">
              <h3 style="margin: 0; color: #1e3a8a;">${companyInfo.name}</h3>
              <div style="font-size: 12px; color: #64748b;">${companyInfo.phone || ''}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div><strong>تاريخ الطلب:</strong> ${req.date}</div>
            <div><strong>القسم الطالب:</strong> ${req.department || 'غير محدد'}</div>
            <div><strong>مقدم الطلب:</strong> ${req.requesterName || '—'}</div>
            <div><strong>درجة الأهمية:</strong> ${priorityLabel}</div>
            <div><strong>حالة المستند:</strong> ${statusLabel}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>اسم الصنف / المادة المطلوبة</th>
                <th>كود الصنف</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: center;">الوحدة</th>
                <th style="text-align: center;">السعر التقديري</th>
                <th style="text-align: center;">الإجمالي التقديري</th>
              </tr>
            </thead>
            <tbody>
              ${req.items.map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td><strong>${item.productName}</strong></td>
                  <td>${item.productCode || '—'}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.unit || 'عدد'}</td>
                  <td style="text-align: center;">${(item.estimatedUnitPrice || 0).toLocaleString()} ج.م</td>
                  <td style="text-align: center;">${(item.estimatedTotal || 0).toLocaleString()} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-box">
            إجمالي التكلفة التقديرية: ${(req.totalEstimatedAmount || 0).toLocaleString()} ج.م
          </div>

          ${req.notes ? `
            <div style="margin-top: 20px; padding: 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px;">
              <strong>ملاحظات الغرض من الشراء:</strong><br />
              ${req.notes.replace(/\n/g, '<br />')}
            </div>
          ` : ''}

          <div class="signatures">
            <div>
              <strong>مقدم الطلب</strong>
              <div class="sig-line"></div>
            </div>
            <div>
              <strong>مدير القسم الطالب</strong>
              <div class="sig-line"></div>
            </div>
            <div>
              <strong>اعتماد إدارة المشتريات</strong>
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
    const data = filteredRequests.map(r => ({
      'رقم الطلب': r.id,
      'التاريخ': r.date,
      'القسم الطالب': r.department || '',
      'مقدم الطلب': r.requesterName || '',
      'درجة الأهمية': r.priority === 'critical' ? 'طارئ' : r.priority === 'urgent' ? 'عاجل' : 'عادي',
      'عدد البنود': r.items.length,
      'القيمة التقديرية': r.totalEstimatedAmount,
      'الحالة': r.status === 'approved' ? 'معتمد' : r.status === 'converted' ? 'محول لأمر شراء' : r.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة',
      'ملاحظات': r.notes || ''
    }));
    exportToExcel(data, 'طلبات_الشراء_PR');
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchSearch =
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.requesterName && r.requesterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || r.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      converted: requests.filter(r => r.status === 'converted').length,
      totalEstValue: requests.reduce((sum, r) => sum + (r.totalEstimatedAmount || 0), 0)
    };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Top Documentary Cycle Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('purchaseRequests')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white shadow-sm transition-all"
          >
            <span>📝</span>
            <span>طلبات الشراء (PR)</span>
            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>
          </button>
          <button
            onClick={() => onNavigate('purchaseOrders')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 transition-all border border-gray-200"
          >
            <span>📑</span>
            <span>أوامر الشراء (PO)</span>
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
              className="bg-white border border-gray-300 text-gray-700 hover:text-blue-600 hover:bg-gray-50 font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 shadow-sm text-sm"
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
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm shadow-sm"
          >
            <span>+</span>
            <span>إنشاء طلب شراء جديد</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 font-semibold mb-1">إجمالي طلبات الشراء</div>
          <div className="text-2xl font-bold text-gray-800">{summary.total}</div>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-xs text-amber-700 font-semibold mb-1">قيد المراجعة والاعتماد</div>
          <div className="text-2xl font-bold text-amber-800">{summary.pending}</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs text-emerald-700 font-semibold mb-1">طلبات معتمدة جاهزة</div>
          <div className="text-2xl font-bold text-emerald-800">{summary.approved}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="text-xs text-purple-700 font-semibold mb-1">تحولت لأوامر شراء</div>
          <div className="text-2xl font-bold text-purple-800">{summary.converted}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="بحث برقم الطلب، القسم، مقدم الطلب، أو اسم الصنف..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="approved">معتمد</option>
            <option value="converted">تم التحويل</option>
            <option value="rejected">مرفوض</option>
          </select>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as any)}
            className="p-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="all">كافة الأولويات</option>
            <option value="normal">عادي</option>
            <option value="urgent">عاجل</option>
            <option value="critical">طارئ جداً</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-gray-700 font-bold border-b border-gray-200">
              <tr>
                <th className="p-3">رقم الطلب</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">القسم الطالب</th>
                <th className="p-3">مقدم الطلب</th>
                <th className="p-3">الأولوية</th>
                <th className="p-3">الأصناف المطلوبة</th>
                <th className="p-3">التكلفة التقديرية</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    لا توجد طلبات شراء مطابقة للمعايير المحددة.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const priorityBadge =
                    req.priority === 'critical'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : req.priority === 'urgent'
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                  const statusBadge =
                    req.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'converted'
                      ? 'bg-purple-100 text-purple-800'
                      : req.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-blue-600">{req.id}</td>
                      <td className="p-3 text-gray-600">{req.date}</td>
                      <td className="p-3 font-medium text-gray-800">{req.department || '—'}</td>
                      <td className="p-3 text-gray-700">{req.requesterName || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityBadge}`}>
                          {req.priority === 'critical' ? 'طارئ' : req.priority === 'urgent' ? 'عاجل' : 'عادي'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate text-xs text-gray-600" title={req.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}>
                          {req.items.map(i => `${i.productName} (${i.quantity} ${i.unit || 'عدد'})`).join('، ')}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-gray-800">
                        {(req.totalEstimatedAmount || 0).toLocaleString()} ج.م
                      </td>
                      <td className="p-3">
                        <select
                          value={req.status}
                          onChange={e => handleStatusChange(req.id, e.target.value as any)}
                          className={`text-xs font-bold px-2 py-1 rounded-md border-0 cursor-pointer ${statusBadge}`}
                        >
                          <option value="pending">قيد المراجعة</option>
                          <option value="approved">معتمد ✓</option>
                          <option value="converted">محول لأمر شراء 📑</option>
                          <option value="rejected">مرفوض ✗</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Convert to Purchase Order */}
                          <button
                            onClick={() => onConvertToOrder(req)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-sm"
                            title="تحويل إلى أمر شراء رسمي (Purchase Order)"
                          >
                            <span>📑</span>
                            <span>أمر شراء</span>
                          </button>

                          {/* Print Request */}
                          <button
                            onClick={() => handlePrintRequest(req)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded text-xs"
                            title="طباعة طلب الشراء"
                          >
                            🖨️
                          </button>

                          {/* Edit Request */}
                          <button
                            onClick={() => handleOpenEditModal(req)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-1.5 rounded text-xs"
                            title="تعديل طلب الشراء"
                          >
                            ✏️
                          </button>

                          {/* Delete Request */}
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded text-xs"
                            title="حذف طلب الشراء"
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

      {/* Add / Edit Purchase Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-gray-800">
                {editingRequest ? `تعديل طلب شراء (${editingRequest.id})` : 'إنشاء طلب شراء مواد ومستلزمات جديد'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ الطلب</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">القسم الطالب</label>
                  <select
                    value={formDepartment}
                    onChange={e => setFormDepartment(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">اسم مقدم الطلب</label>
                  <input
                    type="text"
                    placeholder="مثال: م. أحمد عبد الله"
                    value={formRequester}
                    onChange={e => setFormRequester(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">درجة الأهمية</label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="normal">عادي</option>
                    <option value="urgent">عاجل</option>
                    <option value="critical">طارئ جداً</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-800">الأصناف والخامات المطلوبة</h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200"
                  >
                    + إضافة سطر صنف
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap md:flex-nowrap gap-2 items-center">
                      <div className="w-8 text-center text-xs font-bold text-gray-400">#{idx + 1}</div>

                      <div className="flex-1 min-w-[180px]">
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
                              u[idx].unit = val;
                              return u;
                            });
                          }}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] text-gray-500 block mb-0.5">سعر تقديري</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.estimatedUnitPrice || 0}
                          onChange={e => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs text-center"
                        />
                      </div>

                      <div className="w-28 text-left">
                        <label className="text-[10px] text-gray-500 block mb-0.5">الإجمالي</label>
                        <div className="text-xs font-bold text-gray-800 p-1.5">
                          {(item.estimatedTotal || 0).toLocaleString()} ج.م
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

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center text-sm">
                  <span className="font-bold text-blue-900">إجمالي القيمة التقديرية للطلب:</span>
                  <span className="text-lg font-bold text-blue-700">{formEstimatedTotal.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">ملاحظات والغرض من الشراء</label>
                <textarea
                  rows={2}
                  placeholder="سبب الاحتياج ومكان الاستخدام أو أي مواصفات فنية إضافية..."
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
                onClick={handleSaveRequest}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-md"
              >
                {editingRequest ? 'حفظ التعديلات' : 'حفظ طلب الشراء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequests;