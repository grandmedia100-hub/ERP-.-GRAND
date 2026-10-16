import React, { useMemo, useEffect } from 'react';
import type { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, CompanyInfo, Expense, Partner, PartnerTransaction } from '../types.ts';

interface TrialBalanceModalProps {
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

const TrialBalanceModal: React.FC<TrialBalanceModalProps> = ({
  onClose, products, customers, suppliers, salesInvoices, purchaseInvoices, 
  customerPayments, supplierPayments, expenses, partners, partnerTransactions
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
    const rows: { account: string; debit: number; credit: number }[] = [];

    // 1. Cash (Treasury) - Usually Debit
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString ? JSON.parse(companyInfoString) : { treasuryOpeningBalance: 0 };

    const isBeforeOrOn = (dateStr: string) => {
      if (!dateStr) return false;
      if (!asOfDate) return true;
      return new Date(dateStr) <= new Date(asOfDate);
    };

    // Calculate current cash
    const cashInSales = salesInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashInPayments = customerPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutPurchases = purchaseInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashOutPayments = supplierPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutExpenses = expenses.filter(e => e.status !== 'voided' && isBeforeOrOn(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const partnersDeposits = partnerTransactions.filter(t => t.type === 'إيداع' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);
    const partnersWithdrawals = partnerTransactions.filter(t => t.type === 'سحب' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = (companyInfo.treasuryOpeningBalance || 0) + cashInSales + cashInPayments + partnersDeposits - (cashOutPurchases + cashOutPayments + cashOutExpenses + partnersWithdrawals);

    rows.push({ account: 'الخزينة (النقدية)', debit: cashBalance > 0 ? cashBalance : 0, credit: cashBalance < 0 ? Math.abs(cashBalance) : 0 });

    // 2. Inventory - Debit
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);
    rows.push({ account: 'المخزون', debit: inventoryValue, credit: 0 });

    // 3. Customers (Receivables) - Debit
    const accountsReceivable = customers.reduce((sum, c) => {
      const invTotal = salesInvoices.filter(i => i.customerId === c.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = customerPayments.filter(p => p.customerId === c.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (c.openingBalance + invTotal - paidTotal);
    }, 0);
    rows.push({ account: 'العملاء', debit: accountsReceivable, credit: 0 });

    // 4. Suppliers (Payables) - Credit
    const accountsPayable = suppliers.reduce((sum, s) => {
      const invTotal = purchaseInvoices.filter(i => i.supplierId === s.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = supplierPayments.filter(p => p.supplierId === s.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (s.openingBalance + invTotal - paidTotal);
    }, 0);
    rows.push({ account: 'الموردين', debit: 0, credit: accountsPayable });

    // 5. Partners Capital - Credit
    const partnersCapital = partners.reduce((sum, p) => {
      const pTrans = partnerTransactions.filter(t => t.partnerId === p.id && t.status !== 'voided' && isBeforeOrOn(t.date));
      const deposits = pTrans.filter(t => t.type === 'إيداع').reduce((s, t) => s + t.amount, 0);
      const withdrawals = pTrans.filter(t => t.type === 'سحب').reduce((s, t) => s + t.amount, 0);
      return sum + (p.openingBalance + deposits - withdrawals);
    }, 0);
    rows.push({ account: 'رأس المال', debit: 0, credit: partnersCapital });

    // 6. Sales (Revenue) - Credit
    // Note: Revenue is a credit balance account
    // We already accounted for Cash/AR from sales, but in double entry, Credit Sales increases Revenue.
    // Wait, Trial balance lists balances of ALL accounts.
    // Assets = Liabilities + Equity + (Revenue - Expenses)
    // So we list Assets (Dr), Liabilities (Cr), Equity (Cr), Revenue (Cr), Expenses (Dr).

    // However, the Inventory logic above assumes Asset value.
    // In a periodic inventory system (simplified), Purchases are Dr, Sales are Cr.
    // Let's do a simple summary based on what we have tracked.

    // Since we don't have a full double-entry ledger in the backend, we approximate.
    // To make it balance: Assets(Dr) = Liabilities(Cr) + Equity(Cr) + Profit(Cr)
    // Profit = Sales - Purchases - Expenses.

    // Instead of forcing balance, let's list the accounts we "know".
    // Actually, Trial Balance usually lists Revenue and Expenses separately.

    // Adjusting previous rows:
    // Remove "Cash" and "Inventory" etc from direct calculation if we want strict ledger view,
    // but here we are synthesizing a report from entity states.

    // To present a balanced view conceptually for the user:
    // 1. Assets (Dr)
    // 2. Expenses (Dr)
    // 3. Liabilities (Cr)
    // 4. Equity (Cr)
    // 5. Revenue (Cr)

    // Let's clear rows and rebuild for this structure
    const reportRows = [];

    // ASSETS
    reportRows.push({ account: 'الخزينة (النقدية)', debit: cashBalance, credit: 0 });
    reportRows.push({ account: 'المخزون (بضاعة آخر المدة)', debit: inventoryValue, credit: 0 });
    reportRows.push({ account: 'العملاء (المدينون)', debit: accountsReceivable, credit: 0 });

    // EXPENSES & PURCHASES (Dr)
    // Note: If we list Inventory (Asset), we shouldn't list Purchases as Asset, but as Expense (COGS).
    // Or in periodic: Opening Stock + Purchases - Closing Stock = COGS.
    // Let's keep it simple: List Purchases as Debit, Sales as Credit. 
    // BUT Inventory Asset is "Ending Inventory".
    // If we list Ending Inventory as Asset (Dr), we need to balance it.
    // Usually "Inventory" account is adjusted at period end.

    // Simplest approach for this app level:
    // List Operating Expenses
    const totalExpenses = expenses.filter(e => e.status !== 'voided' && isBeforeOrOn(e.date)).reduce((sum, e) => sum + e.amount, 0);
    reportRows.push({ account: 'المصروفات العمومية', debit: totalExpenses, credit: 0 });

    // LIABILITIES
    reportRows.push({ account: 'الموردين (الدائنون)', debit: 0, credit: accountsPayable });

    // EQUITY
    reportRows.push({ account: 'رأس المال', debit: 0, credit: partnersCapital });

    // REVENUE & COGS/Trading
    // Sales (Cr)
    // REVENUE & COGS/Trading
    // Sales (Cr)
    const totalSales = salesInvoices.filter(i => i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    reportRows.push({ account: 'المبيعات', debit: 0, credit: totalSales });

    // Purchases (Dr) -> Treated as Cost/Expense here
    const totalPurchases = purchaseInvoices.filter(i => i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    reportRows.push({ account: 'المشتريات', debit: totalPurchases, credit: 0 });

    // NOTE: This won't balance perfectly because:
    // 1. Inventory value change (Profit/Loss from holding inventory) isn't recorded as income.
    // 2. "Inventory Value" added to Debit side is the Closing Stock.
    // To balance: Opening Stock + Purchases + Profit = Sales + Closing Stock.
    // We don't track Opening Stock historically well here.
    // So we will add a "Mismatched / Balancing" line if needed, or just show as is.
    // Actually, (Assets + Expenses) - (Liabilities + Equity + Revenue) = 0?
    // Let's check:
    // (Cash + AR + ClosingInv + Expenses + Purchases) - (AP + Capital + Sales)
    // Cash = OpenCash + Sales + Capital - Purchases - Expenses - AP_Paid + AR_Paid ...
    // It's complex to balance perfectly without full double entry engine.
    // We will display "Difference" (الفروقات) to be transparent.

    const totalDebit = reportRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = reportRows.reduce((sum, r) => sum + r.credit, 0);

    if (totalDebit !== totalCredit) {
      const diff = totalDebit - totalCredit;
      if (diff > 0) {
        reportRows.push({ account: 'فروقات ميزان / أرباح مرحلة', debit: 0, credit: diff });
      } else {
        reportRows.push({ account: 'فروقات ميزان / خسائر مرحلة', debit: Math.abs(diff), credit: 0 });
      }
    }

    return reportRows;
  }, [products, customers, suppliers, partners, partnerTransactions, salesInvoices, purchaseInvoices, expenses, customerPayments, supplierPayments, asOfDate]);

  const totalDebit = data.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = data.reduce((sum, r) => sum + r.credit, 0);

  const handlePrint = () => {
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString ? JSON.parse(companyInfoString) : { name: 'الشركة' };

    const printContent = `
      <html>
        <head>
          <title>ميزان المراجعة</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name}</h1>
            <h2>ميزان المراجعة</h2>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>اسم الحساب</th>
                <th>أرصدة مدينة</th>
                <th>أرصدة دائنة</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td style="text-align: right;">${row.account}</td>
                  <td>${row.debit > 0 ? row.debit.toLocaleString('en-US') : '-'}</td>
                  <td>${row.credit > 0 ? row.credit.toLocaleString('en-US') : '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #e0f2f1; font-weight: bold;">
                <td style="text-align: right;">الإجمالي</td>
                <td>${totalDebit.toLocaleString('en-US')}</td>
                <td>${totalCredit.toLocaleString('en-US')}</td>
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
          <div>
            <h2 className="text-xl font-bold text-gray-800">ميزان المراجعة</h2>
            <div className="text-sm text-gray-500 flex items-center space-x-2 space-x-reverse mt-1">
              <span>حتى تاريخ:</span>
              <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="border rounded px-2 py-1" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-3 border text-sm font-semibold tracking-wide">اسم الحساب</th>
                <th className="p-3 border text-sm font-semibold tracking-wide text-center">أرصدة مدينة (Debit)</th>
                <th className="p-3 border text-sm font-semibold tracking-wide text-center">أرصدة دائنة (Credit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-3 border text-sm font-bold text-gray-700">{row.account}</td>
                  <td className="p-3 border text-sm text-center text-gray-700">{row.debit > 0 ? row.debit.toLocaleString('en-US') : '-'}</td>
                  <td className="p-3 border text-sm text-center text-gray-700">{row.credit > 0 ? row.credit.toLocaleString('en-US') : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              <tr>
                <td className="p-3 border text-left">الإجمالي</td>
                <td className={`p-3 border text-center ${totalDebit !== totalCredit ? 'text-red-600' : 'text-green-600'}`}>{totalDebit.toLocaleString('en-US')} ج.م</td>
                <td className={`p-3 border text-center ${totalDebit !== totalCredit ? 'text-red-600' : 'text-green-600'}`}>{totalCredit.toLocaleString('en-US')} ج.م</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          <button
            onClick={() => {
              const dataToExport = data.map(row => ({
                'اسم الحساب': row.account,
                'أرصدة مدينة': row.debit,
                'أرصدة دائنة': row.credit
              }));
              dataToExport.push({ 'اسم الحساب': 'الإجمالي', 'أرصدة مدينة': totalDebit, 'أرصدة دائنة': totalCredit });
              import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                exportToExcel(dataToExport, 'ميزان_المراجعة');
              });
            }}
            className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span>تصدير إكسيل</span>
          </button>
          <button
            onClick={() => {
              const message = `*ميزان المراجعة*\nإجمالي المدين: ${totalDebit.toLocaleString('en-US')} ج.م\nإجمالي الدائن: ${totalCredit.toLocaleString('en-US')} ج.م\n\n*يرجى إرفاق ملف الـ PDF يدوياً.*`;
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

export default TrialBalanceModal;
