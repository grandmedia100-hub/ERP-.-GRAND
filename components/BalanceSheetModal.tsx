import React, { useMemo, useEffect } from 'react';
import type { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, CompanyInfo, Expense, Partner, PartnerTransaction } from '../types.ts';

interface BalanceSheetModalProps {
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  expenses: Expense[];
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
}

const BalanceSheetModal: React.FC<BalanceSheetModalProps> = ({
  onClose, products, customers, suppliers,
  salesInvoices, purchaseInvoices, customerPayments, supplierPayments,
  expenses, partners, partnerTransactions
}) => {
  // Date Filter
  const [asOfDate, setAsOfDate] = React.useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  const data = useMemo(() => {
    // 1. Assets
    // Cash / Treasury
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString ? JSON.parse(companyInfoString) : { treasuryOpeningBalance: 0 };

    const isBeforeOrOn = (dateStr: string) => {
      if (!dateStr) return false;
      if (!asOfDate) return true;
      return new Date(dateStr) <= new Date(asOfDate);
    };

    const cashInSales = salesInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashInPayments = customerPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutPurchases = purchaseInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashOutPayments = supplierPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutExpenses = expenses.filter(e => e.status !== 'voided' && isBeforeOrOn(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const partnersDeposits = partnerTransactions.filter(t => t.type === 'إيداع' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);
    const partnersWithdrawals = partnerTransactions.filter(t => t.type === 'سحب' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = (companyInfo.treasuryOpeningBalance || 0) + cashInSales + cashInPayments + partnersDeposits - (cashOutPurchases + cashOutPayments + cashOutExpenses + partnersWithdrawals);

    // Inventory Value (Cost)
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);

    // Accounts Receivable (Debtors)
    const accountsReceivable = customers.reduce((sum, c) => {
      const invTotal = salesInvoices.filter(i => i.customerId === c.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = customerPayments.filter(p => p.customerId === c.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (c.openingBalance + invTotal - paidTotal);
    }, 0);

    const totalAssets = cashBalance + inventoryValue + accountsReceivable;

    // 2. Liabilities
    // Accounts Payable (Creditors)
    const accountsPayable = suppliers.reduce((sum, s) => {
      const invTotal = purchaseInvoices.filter(i => i.supplierId === s.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = supplierPayments.filter(p => p.supplierId === s.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (s.openingBalance + invTotal - paidTotal);
    }, 0);

    const totalLiabilities = accountsPayable;

    // 3. Equity
    // Partners Capital
    const partnersCapital = partners.reduce((sum, p) => {
      const pTrans = partnerTransactions.filter(t => t.partnerId === p.id && t.status !== 'voided' && isBeforeOrOn(t.date));
      const deposits = pTrans.filter(t => t.type === 'إيداع').reduce((s, t) => s + t.amount, 0);
      const withdrawals = pTrans.filter(t => t.type === 'سحب').reduce((s, t) => s + t.amount, 0);
      return sum + (p.openingBalance + deposits - withdrawals);
    }, 0);

    // Retained Earnings (Net Profit)
    // Simple calc: Total Revenue - Total Expenses (COGS + Operating)
    // Note: This is a simplified equity calculation to balance the sheet
    // Assets = Liabilities + Equity
    // Equity = Assets - Liabilities
    // Ideally calculated as: Opening Equity + Net Income - Drawings
    // Here we derive it to ensure balance, but display components

    // True COGS from sales invoices (Cost of goods sold)
    const totalCOGS = salesInvoices
      .filter(i => i.status !== 'voided' && isBeforeOrOn(i.date))
      .reduce((sum, inv) => {
        const isReturn = inv.invoiceType === 'return';
        const invCost = (inv.items || []).reduce((iSum, item) => {
          const cost = item.cost !== undefined && item.cost >= 0
            ? item.cost
            : (products.find(p => p.id === item.productId)?.costPrice || 0);
          return iSum + cost * (item.quantity || 0);
        }, 0);
        return sum + (isReturn ? -invCost : invCost);
      }, 0);

    const netProfit = totalRevenue - totalCOGS - cashOutExpenses;

    // Calculated Equity to balance
    const totalEquity = totalAssets - totalLiabilities;
    // The discrepancy is mostly due to initial setup balances not tracking history fully or simplified COGS

    return {
      cashBalance,
      inventoryValue,
      accountsReceivable,
      totalAssets,
      accountsPayable,
      totalLiabilities,
      partnersCapital,
      netProfit,
      totalEquity,
      companyInfo
    };
  }, [products, customers, suppliers, partners, partnerTransactions, salesInvoices, purchaseInvoices, expenses, customerPayments, supplierPayments, asOfDate]);

  const handlePrint = () => {
    const { companyInfo } = data;
    const printContent = `
      <html>
        <head>
          <title>الميزانية العمومية</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
            .section { margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
            .section-title { font-weight: bold; font-size: 18px; color: #007bff; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .total-row { font-weight: bold; background-color: #f0f4f8; padding: 10px; border-radius: 4px; margin-top: 10px; }
            .main-total { font-size: 20px; text-align: center; background-color: #007bff; color: white; padding: 10px; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name || 'اسم الشركة'}</h1>
            <h2>الميزانية العمومية (Balance Sheet)</h2>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>

          <div class="section">
            <div class="section-title">الأصول (Assets)</div>
            <div class="row"><span>النقدية وما في حكمها (الخزينة)</span><span>${data.cashBalance.toLocaleString('en-US')} ج.م</span></div>
            <div class="row"><span>المخزون (البضاعة)</span><span>${data.inventoryValue.toLocaleString('en-US')} ج.م</span></div>
            <div class="row"><span>المدينون (العملاء)</span><span>${data.accountsReceivable.toLocaleString('en-US')} ج.م</span></div>
            <div class="row total-row"><span>إجمالي الأصول</span><span>${data.totalAssets.toLocaleString('en-US')} ج.م</span></div>
          </div>

          <div class="section">
            <div class="section-title">الخصوم (Liabilities)</div>
            <div class="row"><span>الدائنون (الموردين)</span><span>${data.accountsPayable.toLocaleString('en-US')} ج.م</span></div>
            <div class="row total-row"><span>إجمالي الخصوم</span><span>${data.totalLiabilities.toLocaleString('en-US')} ج.م</span></div>
          </div>

          <div class="section">
            <div class="section-title">حقوق الملكية (Equity)</div>
            <div class="row"><span>رأس المال (الشركاء)</span><span>${data.partnersCapital.toLocaleString('en-US')} ج.م</span></div>
            <div class="row"><span>الأرباح المرحلة / الفروقات</span><span>${(data.totalEquity - data.partnersCapital).toLocaleString('en-US')} ج.م</span></div>
            <div class="row total-row"><span>إجمالي حقوق الملكية</span><span>${data.totalEquity.toLocaleString('en-US')} ج.م</span></div>
          </div>

          <div class="main-total">
             إجمالي الخصوم وحقوق الملكية: ${(data.totalLiabilities + data.totalEquity).toLocaleString('en-US')} ج.م
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
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">الميزانية العمومية</h2>
            <div className="text-sm text-gray-500 flex items-center space-x-2 space-x-reverse mt-1">
              <span>حتى تاريخ:</span>
              <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="border rounded px-2 py-1" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Assets */}
            <div className="border rounded-xl p-4 bg-green-50">
              <h3 className="text-lg font-bold text-green-800 mb-4 border-b border-green-200 pb-2">الأصول</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-700">النقدية (الخزينة)</span>
                  <span className="font-bold">{data.cashBalance.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">المخزون</span>
                  <span className="font-bold">{data.inventoryValue.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">العملاء (المدينون)</span>
                  <span className="font-bold">{data.accountsReceivable.toLocaleString('en-US')} ج.م</span>
                </div>
                <div className="pt-4 border-t border-green-200 flex justify-between text-lg font-bold text-green-900">
                  <span>إجمالي الأصول</span>
                  <span>{data.totalAssets.toLocaleString('en-US')} ج.م</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Liabilities */}
              <div className="border rounded-xl p-4 bg-red-50">
                <h3 className="text-lg font-bold text-red-800 mb-4 border-b border-red-200 pb-2">الخصوم</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">الموردين (الدائنون)</span>
                    <span className="font-bold">{data.accountsPayable.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="pt-4 border-t border-red-200 flex justify-between text-lg font-bold text-red-900">
                    <span>إجمالي الخصوم</span>
                    <span>{data.totalLiabilities.toLocaleString('en-US')} ج.م</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div className="border rounded-xl p-4 bg-blue-50">
                <h3 className="text-lg font-bold text-blue-800 mb-4 border-b border-blue-200 pb-2">حقوق الملكية</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-700">رأس المال (الشركاء)</span>
                    <span className="font-bold">{data.partnersCapital.toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span className="text-gray-600">الأرباح المرحلة (متمم حسابي)</span>
                    <span className="font-bold">{(data.totalEquity - data.partnersCapital).toLocaleString('en-US')} ج.م</span>
                  </div>
                  <div className="pt-4 border-t border-blue-200 flex justify-between text-lg font-bold text-blue-900">
                    <span>إجمالي حقوق الملكية</span>
                    <span>{data.totalEquity.toLocaleString('en-US')} ج.م</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          <button
            onClick={() => {
              const dataToExport = [
                { 'القسم': 'الأصول', 'البند': 'النقدية (الخزينة)', 'القيمة': data.cashBalance },
                { 'القسم': 'الأصول', 'البند': 'المخزون', 'القيمة': data.inventoryValue },
                { 'القسم': 'الأصول', 'البند': 'العملاء (المدينون)', 'القيمة': data.accountsReceivable },
                { 'القسم': 'الأصول', 'البند': 'إجمالي الأصول', 'القيمة': data.totalAssets },
                { 'الsection': 'الخصوم', 'البند': 'الموردين (الدائنون)', 'القيمة': data.accountsPayable },
                { 'القسم': 'الخصوم', 'البند': 'إجمالي الالتزامات', 'القيمة': data.totalLiabilities },
                { 'القسم': 'حقوق الملكية', 'البند': 'رأس المال', 'القيمة': data.partnersCapital },
                { 'القسم': 'حقوق الملكية', 'البند': 'الأرباح المرحلة', 'القيمة': data.totalEquity - data.partnersCapital },
                { 'القسم': 'حقوق الملكية', 'البند': 'إجمالي حقوق الملكية', 'القيمة': data.totalEquity },
              ];
              import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                exportToExcel(dataToExport, 'الميزانية_العمومية');
              });
            }}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => {
              const message = `*الميزانية العمومية*\nإجمالي الأصول: ${data.totalAssets.toLocaleString('en-US')} ج.م\nإجمالي الخصوم: ${data.totalLiabilities.toLocaleString('en-US')} ج.م\nإجمالي حقوق الملكية: ${data.totalEquity.toLocaleString('en-US')} ج.م\n\n*يرجى إرفاق ملف الـ PDF يدوياً.*`;
              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            }}
            className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.248 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
            <span>مشاركة واتساب</span>
          </button>
          <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">طباعة التقرير</button>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetModal;
