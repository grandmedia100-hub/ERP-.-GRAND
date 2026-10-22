import React, { useState, useMemo, useEffect } from 'react';
import type { SalesInvoice, Product, Customer, CompanyInfo } from '../types.ts';
import { exportToExcel } from '../utils/exportToExcel.ts';

interface DetailedSalesByItemReportProps {
    onClose: () => void;
    salesInvoices: SalesInvoice[];
    products: Product[];
    customers: Customer[];
}

const DetailedSalesByItemReport: React.FC<DetailedSalesByItemReportProps> = ({ onClose, salesInvoices, products, customers }) => {
    const [startDate, setStartDate] = useState<string>(new Date().getFullYear() + '-01-01');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const reportData = useMemo(() => {
        let filteredInvoices = salesInvoices.filter(inv => inv.status !== 'voided');

        if (startDate) {
            filteredInvoices = filteredInvoices.filter(inv => new Date(inv.date) >= new Date(startDate));
        }
        if (endDate) {
            filteredInvoices = filteredInvoices.filter(inv => new Date(inv.date) <= new Date(endDate));
        }
        if (selectedCustomerId) {
            filteredInvoices = filteredInvoices.filter(inv => inv.customerId === selectedCustomerId);
        }

        // Flatten items
        const allItems = filteredInvoices.flatMap(inv => {
            const rawItems = Array.isArray(inv.items)
                ? inv.items
                : (typeof inv.items === 'string' ? (() => { try { return JSON.parse(inv.items); } catch { return []; } })() : []);
            return (rawItems || []).map(item => ({
                ...item,
                invoiceId: inv.id,
                date: inv.date,
                customerName: inv.customerName,
                companyName: inv.companyName
            }));
        });

        // Filter by product
        const filteredItems = selectedProductId
            ? allItems.filter(item => item.productId === selectedProductId)
            : allItems;

        // Sort by date desc
        filteredItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = filteredItems.reduce((sum, item) => sum + item.total, 0);
        const totalCost = filteredItems.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
        const totalProfit = totalRevenue - totalCost;

        return { items: filteredItems, totalQuantity, totalRevenue, totalProfit };
    }, [salesInvoices, startDate, endDate, selectedCustomerId, selectedProductId]);

    const handleExport = () => {
        const exportData = reportData.items.map(item => ({
            'رقم الفاتورة': item.invoiceId,
            'التاريخ': item.date,
            'العميل': item.customerName,
            'الصنف': item.productName,
            'الكمية': item.quantity,
            'سعر الوحدة': item.price,
            'التكلفة': item.cost || 0,
            'الإجمالي': item.total,
            'الربح': item.total - ((item.cost || 0) * item.quantity)
        }));
        exportToExcel(exportData, 'تقرير_المبيعات_بالأصناف');
    };

    const handlePrint = () => {
        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo: CompanyInfo = companyInfoString
            ? JSON.parse(companyInfoString)
            : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

        let filterText = `من: ${startDate} | إلى: ${endDate}`;
        if (selectedCustomerId) {
            const customer = customers.find(c => c.id === selectedCustomerId);
            filterText += ` | العميل: ${customer?.name}`;
        }
        if (selectedProductId) {
            const product = products.find(p => p.id === selectedProductId);
            filterText += ` | الصنف: ${product?.name}`;
        }

        const printContent = `
      <html>
        <head>
          <title>تقرير تفصيلي بالمبيعات (أصناف)</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; font-size: 14px; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f4f8; padding: 8px; text-align: right; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 8px; border: 1px solid #ddd; }
            .totals { margin-top: 20px; display: flex; gap: 20px; justify-content: flex-end; font-weight: bold; font-size: 16px; }
            .total-box { padding: 10px 20px; background: #f9f9f9; border: 1px solid #ddd; rounded: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name}</h1>
            <h2>تقرير تفصيلي بالمبيعات (أصناف)</h2>
            <p>${filterText}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ</th>
                <th>العميل</th>
                <th>الصنف</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>التكلفة</th>
                <th>الإجمالي</th>
                <th>الربح</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.items.map(item => `
                <tr>
                  <td>${item.invoiceId}</td>
                  <td style="direction:ltr; text-align:right">${item.date}</td>
                  <td>${item.customerName}</td>
                  <td>${item.productName}</td>
                  <td>${item.quantity.toLocaleString('en-US')}</td>
                  <td>${item.price.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                  <td>${(item.cost || 0).toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                  <td>${item.total.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                  <td style="font-weight:bold; color:${item.total - ((item.cost || 0) * item.quantity) >= 0 ? 'green' : 'red'}">
                    ${(item.total - ((item.cost || 0) * item.quantity)).toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
             <div class="total-box">إجمالي الكمية: ${reportData.totalQuantity.toLocaleString('en-US')}</div>
             <div class="total-box">إجمالي الإيراد: ${reportData.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</div>
             <div class="total-box" style="border-color:#4caf50; background:#e8f5e9;">صافي الربح: ${reportData.totalProfit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</div>
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
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">تقرير المبيعات التفصيلي (بالأصناف)</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                        <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">كل العملاء</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
                        <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">كل الأصناف</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="flex justify-between mb-4">
                        <div className="bg-blue-50 px-4 py-2 rounded border border-blue-200 text-blue-800 font-bold">
                            إجمالي الإيراد: {reportData.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}
                        </div>
                        <div className="bg-green-50 px-4 py-2 rounded border border-green-200 text-green-800 font-bold">
                            إجمالي الكمية: {reportData.totalQuantity.toLocaleString('en-US')}
                        </div>
                        <div className="bg-emerald-50 px-4 py-2 rounded border border-emerald-200 text-emerald-800 font-bold">
                            الربح: {reportData.totalProfit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}
                        </div>
                    </div>

                    <table className="w-full text-right border collapse">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 border">رقم الفاتورة</th>
                                <th className="p-3 border">التاريخ</th>
                                <th className="p-3 border">العميل</th>
                                <th className="p-3 border">الصنف</th>
                                <th className="p-3 border">الكمية</th>
                                <th className="p-3 border">السعر</th>
                                <th className="p-3 border">التكلفة</th>
                                <th className="p-3 border">الإجمالي</th>
                                <th className="p-3 border">الربح</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.items.length > 0 ? reportData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 border font-mono text-sm">{item.invoiceId}</td>
                                    <td className="p-3 border text-sm" style={{ direction: 'ltr', textAlign: 'right' }}>{item.date}</td>
                                    <td className="p-3 border text-sm">{item.customerName}</td>
                                    <td className="p-3 border font-semibold">{item.productName}</td>
                                    <td className="p-3 border font-bold">{item.quantity}</td>
                                    <td className="p-3 border">{item.price.toLocaleString('en-US')}</td>
                                    <td className="p-3 border text-gray-500 text-xs">{(item.cost || 0).toLocaleString('en-US')}</td>
                                    <td className="p-3 border font-bold text-blue-600">{item.total.toLocaleString('en-US')}</td>
                                    <td className={`p-3 border font-bold ${item.total - ((item.cost || 0) * item.quantity) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(item.total - ((item.cost || 0) * item.quantity)).toLocaleString('en-US')}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">لا توجد بيانات مطابقة للفلاتر</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
                    <button onClick={onClose} className="px-4 py-2 bg-white border rounded hover:bg-gray-100">إغلاق</button>
                    <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        تصدير إكسيل
                    </button>
                    <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                        طباعة التقرير
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DetailedSalesByItemReport;
