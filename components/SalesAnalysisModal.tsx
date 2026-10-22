
import React, { useState, useMemo, useEffect } from 'react';
import type { SalesInvoice, Product, CompanyInfo } from '../types.ts';

interface SalesAnalysisModalProps {
  onClose: () => void;
  salesInvoices: SalesInvoice[];
  products: Product[];
}

const SalesAnalysisModal: React.FC<SalesAnalysisModalProps> = ({ onClose, salesInvoices, products }) => {
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const analysis = useMemo(() => {
    // Filter invoices by date
    const filteredInvoices = salesInvoices.filter(inv => {
      const invDate = new Date(inv.date);
      const isVoided = (inv as any).status === 'voided';
      return invDate >= new Date(startDate) && invDate <= new Date(endDate) && !isVoided;
    });

    // 1. Total Sales
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // 2. Average Invoice Value
    const invoiceCount = filteredInvoices.length;
    const averageInvoiceValue = invoiceCount > 0 ? totalSales / invoiceCount : 0;

    // 3. Top Selling Products
    const productStats: Record<string, { quantity: number; revenue: number }> = {};

    filteredInvoices.forEach(inv => {
      const rawItems = Array.isArray(inv.items)
        ? inv.items
        : (typeof inv.items === 'string' ? (() => { try { return JSON.parse(inv.items); } catch { return []; } })() : []);
      (rawItems || []).forEach(item => {
        const name = item.productName;
        if (!productStats[name]) {
          productStats[name] = { quantity: 0, revenue: 0 };
        }
        productStats[name].quantity += (Number(item.quantity) || 0);
        productStats[name].revenue += (Number(item.total) || 0);
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity) // Sort by quantity descending
      .slice(0, 5); // Take top 5

    // Find max quantity for progress bar scaling
    const maxQuantity = topProducts.length > 0 ? topProducts[0].quantity : 0;

    return {
      filteredInvoices,
      totalSales,
      invoiceCount,
      averageInvoiceValue,
      topProducts,
      maxQuantity
    };
  }, [salesInvoices, startDate, endDate]);

  const handlePrint = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const printContent = `
      <html>
        <head>
          <title>تقرير تحليل المبيعات</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .summary-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; text-align: center; }
            .card h3 { margin: 0 0 10px 0; color: #666; font-size: 14px; }
            .card p { margin: 0; font-size: 20px; font-weight: bold; color: #007bff; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f4f8; padding: 10px; text-align: right; border: 1px solid #ddd; }
            td { padding: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name}</h1>
            <h2>تقرير تحليل المبيعات</h2>
            <p>من: ${startDate} | إلى: ${endDate}</p>
          </div>

          <div class="summary-grid">
            <div class="card">
              <h3>إجمالي المبيعات</h3>
              <p>${analysis.totalSales.toLocaleString('en-US')} ج.م</p>
            </div>
            <div class="card">
              <h3>عدد الفواتير</h3>
              <p>${analysis.invoiceCount}</p>
            </div>
            <div class="card">
              <h3>متوسط قيمة الفاتورة</h3>
              <p>${analysis.averageInvoiceValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م</p>
            </div>
          </div>

          <h3>المنتجات الأكثر مبيعاً (Top 5)</h3>
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية المباعة</th>
                <th>إجمالي الإيراد</th>
              </tr>
            </thead>
            <tbody>
              ${analysis.topProducts.map(p => `
                <tr>
                  <td>${p.name}</td>
                  <td>${p.quantity.toLocaleString('en-US')}</td>
                  <td>${p.revenue.toLocaleString('en-US')} ج.م</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">تحليل المبيعات</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-600 font-semibold mb-1">إجمالي المبيعات</p>
              <p className="text-3xl font-bold text-blue-800">{analysis.totalSales.toLocaleString('en-US')} ج.م</p>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border border-green-100">
              <p className="text-sm text-green-600 font-semibold mb-1">عدد الفواتير</p>
              <p className="text-3xl font-bold text-green-800">{analysis.invoiceCount}</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
              <p className="text-sm text-purple-600 font-semibold mb-1">متوسط قيمة الفاتورة</p>
              <p className="text-3xl font-bold text-purple-800">
                {analysis.averageInvoiceValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} ج.م
              </p>
            </div>
          </div>

          {/* Top Products */}
          <h3 className="text-lg font-bold text-gray-800 mb-4">المنتجات الأكثر مبيعاً (Top 5)</h3>
          <div className="space-y-4">
            {analysis.topProducts.length > 0 ? (
              analysis.topProducts.map((product, index) => (
                <div key={index} className="bg-white border p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-700">{index + 1}. {product.name}</span>
                    <span className="text-sm text-gray-500">{product.revenue.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full"
                        style={{ width: `${(product.quantity / analysis.maxQuantity) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-blue-700 min-w-[60px] text-left" style={{ direction: 'ltr' }}>
                      {product.quantity.toLocaleString('en-US')} Unit
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">لا توجد مبيعات في هذه الفترة</p>
            )}
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">طباعة التقرير</button>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalysisModal;
