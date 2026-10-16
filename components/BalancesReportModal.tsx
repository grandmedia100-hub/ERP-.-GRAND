
import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, CompanyInfo, Partner, PartnerTransaction } from '../types.ts';

interface BalancesReportModalProps {
  onClose: () => void;
  customers: Customer[];
  suppliers: Supplier[];
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
}

const BalancesReportModal: React.FC<BalancesReportModalProps> = ({
  onClose, customers, suppliers, salesInvoices, purchaseInvoices, customerPayments, supplierPayments, partners, partnerTransactions
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'partners'>('customers');

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const customerBalances = useMemo(() => {
    return customers.map(customer => {
      const totalSales = salesInvoices
        .filter(inv => inv.customerId === customer.id && inv.status !== 'voided')
        .reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = customerPayments
        .filter(pay => pay.customerId === customer.id && pay.status !== 'voided')
        .reduce((sum, pay) => sum + pay.amount, 0);
      const currentBalance = customer.openingBalance + totalSales - totalPaid;
      return { ...customer, currentBalance };
    }).filter(c => c.currentBalance !== 0).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [customers, salesInvoices, customerPayments]);

  const supplierBalances = useMemo(() => {
    return suppliers.map(supplier => {
      const totalPurchases = purchaseInvoices
        .filter(inv => inv.supplierId === supplier.id && inv.status !== 'voided')
        .reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = supplierPayments
        .filter(pay => pay.supplierId === supplier.id && pay.status !== 'voided')
        .reduce((sum, pay) => sum + pay.amount, 0);
      const currentBalance = supplier.openingBalance + totalPurchases - totalPaid;
      return { ...supplier, currentBalance };
    }).filter(s => s.currentBalance !== 0).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [suppliers, purchaseInvoices, supplierPayments]);

  const partnerBalances = useMemo(() => {
    return partners.map(partner => {
      const totalTxs = partnerTransactions
        .filter(tx => tx.partnerId === partner.id && tx.status !== 'voided')
        .reduce((sum, tx) => sum + (tx.type === 'إيداع' ? tx.amount : -tx.amount), 0);
      const currentBalance = partner.openingBalance + totalTxs;
      return { ...partner, currentBalance };
    }).filter(p => p.currentBalance !== 0).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [partners, partnerTransactions]);

  const totalCustomerDebts = customerBalances.reduce((sum, c) => sum + c.currentBalance, 0);
  const totalSupplierDebts = supplierBalances.reduce((sum, s) => sum + s.currentBalance, 0);
  const totalPartnerBalances = partnerBalances.reduce((sum, p) => sum + p.currentBalance, 0);

  const handlePrint = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const isCustomer = activeTab === 'customers';
    const isSupplier = activeTab === 'suppliers';
    const title = isCustomer ? 'تقرير أرصدة العملاء (مديونيات)' : isSupplier ? 'تقرير أرصدة الموردين (مستحقات)' : 'تقرير أرصدة الشركاء (رؤوس الأموال)';
    const data = isCustomer ? customerBalances : isSupplier ? supplierBalances : partnerBalances;
    const total = isCustomer ? totalCustomerDebts : isSupplier ? totalSupplierDebts : totalPartnerBalances;
    const colorClass = isCustomer ? '#007bff' : isSupplier ? '#28a745' : '#8B5CF6';

    const printContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${colorClass}; padding-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; color: ${colorClass}; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f4f8; padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 10px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total-row { font-weight: bold; background-color: ${colorClass} !important; color: white; }
            .total-row td { border: 1px solid ${colorClass}; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyInfo.name}</div>
            <h2>${title}</h2>
            <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>الكود</th>
                <th>الاسم</th>
                <th>رقم الهاتف</th>
                <th>العنوان</th>
                <th>الرصيد المستحق</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td style="font-family: monospace;">${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.phone}</td>
                  <td>${item.address}</td>
                  <td style="font-weight: bold; direction: ltr; text-align: right;">${item.currentBalance.toLocaleString('en-US')} ج.م</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: center;">الإجمالي</td>
                <td style="direction: ltr; text-align: right;">${total.toLocaleString('en-US')} ج.م</td>
              </tr>
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
          <h2 className="text-xl font-bold text-gray-800">تقرير الأرصدة المجمعة</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="flex border-b bg-gray-50">
          <button
            className={`flex-1 py-4 text-center font-bold text-lg transition-colors ${activeTab === 'customers' ? 'bg-white border-t-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('customers')}
          >
            أرصدة العملاء (مديونيات)
          </button>
          <button
            className={`flex-1 py-4 text-center font-bold text-lg transition-colors ${activeTab === 'suppliers' ? 'bg-white border-t-2 border-green-600 text-green-600' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('suppliers')}
          >
            أرصدة الموردين (مستحقات)
          </button>
          <button
            className={`flex-1 py-4 text-center font-bold text-lg transition-colors ${activeTab === 'partners' ? 'bg-white border-t-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('partners')}
          >
            أرصدة الشركاء (رؤوس الأموال)
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'customers' ? (
            <div>
              <div className="flex justify-between items-center mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div>
                  <h3 className="text-lg font-bold text-blue-800">إجمالي الديون المستحقة</h3>
                  <p className="text-sm text-blue-600">المبالغ التي يجب تحصيلها من العملاء</p>
                </div>
                <div className="text-2xl font-bold text-blue-700">{totalCustomerDebts.toLocaleString('en-US')} ج.م</div>
              </div>
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الكود</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">العميل</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">رقم الهاتف</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الرصيد المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customerBalances.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3 border text-sm text-gray-600 font-mono">{c.id}</td>
                      <td className="p-3 border text-sm text-gray-800 font-bold">{c.name}</td>
                      <td className="p-3 border text-sm text-gray-600">{c.phone}</td>
                      <td className="p-3 border text-sm font-bold text-blue-600">{c.currentBalance.toLocaleString('en-US')} ج.م</td>
                    </tr>
                  ))}
                  {customerBalances.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">لا توجد أرصدة مستحقة حالياً.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'suppliers' ? (
            <div>
              <div className="flex justify-between items-center mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <div>
                  <h3 className="text-lg font-bold text-green-800">إجمالي المستحقات للموردين</h3>
                  <p className="text-sm text-green-600">المبالغ التي يجب سدادها للموردين</p>
                </div>
                <div className="text-2xl font-bold text-green-700">{totalSupplierDebts.toLocaleString('en-US')} ج.م</div>
              </div>
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الكود</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">المورد</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">رقم الهاتف</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الرصيد المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supplierBalances.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="p-3 border text-sm text-gray-600 font-mono">{s.id}</td>
                      <td className="p-3 border text-sm text-gray-800 font-bold">{s.name}</td>
                      <td className="p-3 border text-sm text-gray-600">{s.phone}</td>
                      <td className="p-3 border text-sm font-bold text-green-600">{s.currentBalance.toLocaleString('en-US')} ج.م</td>
                    </tr>
                  ))}
                  {supplierBalances.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">لا توجد أرصدة مستحقة حالياً.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div>
                  <h3 className="text-lg font-bold text-purple-800">إجمالي أرصدة الشركاء</h3>
                  <p className="text-sm text-purple-600">مجموع رؤوس الأموال والحسابات الجارية للشركاء</p>
                </div>
                <div className="text-2xl font-bold text-purple-700">{totalPartnerBalances.toLocaleString('en-US')} ج.م</div>
              </div>
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الكود</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الشريك</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">رقم الهاتف</th>
                    <th className="p-3 border text-sm font-semibold tracking-wide">الرصيد الحالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partnerBalances.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 border text-sm text-gray-600 font-mono">{p.id}</td>
                      <td className="p-3 border text-sm text-gray-800 font-bold">{p.name}</td>
                      <td className="p-3 border text-sm text-gray-600">{p.phone || '-'}</td>
                      <td className={`p-3 border text-sm font-bold ${p.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {p.currentBalance.toLocaleString('en-US')} ج.م
                      </td>
                    </tr>
                  ))}
                  {partnerBalances.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-gray-500">لا توجد أرصدة حالياً.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          <button onClick={handlePrint} className={`text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 ${activeTab === 'customers' ? 'bg-blue-600' : activeTab === 'suppliers' ? 'bg-green-600' : 'bg-purple-600'}`}>طباعة الكشف</button>
        </div>
      </div>
    </div>
  );
};

export default BalancesReportModal;
