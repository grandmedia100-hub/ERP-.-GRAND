import React, { useMemo, useEffect } from 'react';
import type { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, CompanyInfo, Expense, Partner, PartnerTransaction, JournalEntry, Account } from '../types.ts';

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
  journalEntries?: JournalEntry[];
  accounts?: Account[];
}

interface TrialBalanceRow {
  code: string;
  account: string;
  totalDebit: number;
  totalCredit: number;
  debit: number;
  credit: number;
}

const TrialBalanceModal: React.FC<TrialBalanceModalProps> = ({
  onClose, products, customers, suppliers, salesInvoices, purchaseInvoices, 
  customerPayments, supplierPayments, expenses, partners, partnerTransactions,
  journalEntries = [], accounts = []
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

  const isBeforeOrOn = (dateStr: string) => {
    if (!dateStr) return false;
    if (!asOfDate) return true;
    return new Date(dateStr) <= new Date(asOfDate);
  };

  const { rows: data, isFromJournal } = useMemo(() => {
    // 1. Preferred Method: True double-entry trial balance from Journal Entries
    if (journalEntries && journalEntries.length > 0) {
      const accountMap: Record<string, { code: string; name: string; totalDebit: number; totalCredit: number }> = {};

      // Seed with Chart of Accounts
      if (accounts && accounts.length > 0) {
        accounts.filter(a => !a.isGroup).forEach(a => {
          accountMap[a.id] = {
            code: a.code || a.id,
            name: a.name,
            totalDebit: 0,
            totalCredit: 0
          };
        });
      }

      // Aggregate journal entry lines up to asOfDate
      journalEntries.filter(je => isBeforeOrOn(je.date)).forEach(je => {
        (je.lines || []).forEach(line => {
          const accId = line.accountId;
          if (!accountMap[accId]) {
            accountMap[accId] = {
              code: accId,
              name: line.accountName || accId,
              totalDebit: 0,
              totalCredit: 0
            };
          }
          accountMap[accId].totalDebit += (Number(line.debit) || 0);
          accountMap[accId].totalCredit += (Number(line.credit) || 0);
        });
      });

      const reportRows: TrialBalanceRow[] = [];
      Object.values(accountMap).forEach(acc => {
        if (acc.totalDebit === 0 && acc.totalCredit === 0) return;
        const net = acc.totalDebit - acc.totalCredit;
        reportRows.push({
          code: acc.code,
          account: acc.name,
          totalDebit: acc.totalDebit,
          totalCredit: acc.totalCredit,
          debit: net > 0 ? net : 0,
          credit: net < 0 ? Math.abs(net) : 0
        });
      });

      // Sort by account code
      reportRows.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      return { rows: reportRows, isFromJournal: true };
    }

    // 2. Fallback: Entity-based synthesis if no journal entries exist
    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString ? JSON.parse(companyInfoString) : { treasuryOpeningBalance: 0 };

    const cashInSales = salesInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashInPayments = customerPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutPurchases = purchaseInvoices.filter(i => i.paymentMethod === 'نقدي' && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const cashOutPayments = supplierPayments.filter(p => p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((sum, p) => sum + p.amount, 0);
    const cashOutExpenses = expenses.filter(e => e.status !== 'voided' && isBeforeOrOn(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const partnersDeposits = partnerTransactions.filter(t => t.type === 'إيداع' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);
    const partnersWithdrawals = partnerTransactions.filter(t => t.type === 'سحب' && t.status !== 'voided' && isBeforeOrOn(t.date)).reduce((sum, t) => sum + t.amount, 0);

    const cashBalance = (companyInfo.treasuryOpeningBalance || 0) + cashInSales + cashInPayments + partnersDeposits - (cashOutPurchases + cashOutPayments + cashOutExpenses + partnersWithdrawals);
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.costPrice), 0);

    const accountsReceivable = customers.reduce((sum, c) => {
      const invTotal = salesInvoices.filter(i => i.customerId === c.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = customerPayments.filter(p => p.customerId === c.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (c.openingBalance + invTotal - paidTotal);
    }, 0);

    const accountsPayable = suppliers.reduce((sum, s) => {
      const invTotal = purchaseInvoices.filter(i => i.supplierId === s.id && i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((s, i) => s + i.total, 0);
      const paidTotal = supplierPayments.filter(p => p.supplierId === s.id && p.status !== 'voided' && isBeforeOrOn(p.date)).reduce((s, p) => s + p.amount, 0);
      return sum + (s.openingBalance + invTotal - paidTotal);
    }, 0);

    const partnersCapital = partners.reduce((sum, p) => {
      const pTrans = partnerTransactions.filter(t => t.partnerId === p.id && t.status !== 'voided' && isBeforeOrOn(t.date));
      const deposits = pTrans.filter(t => t.type === 'إيداع').reduce((s, t) => s + t.amount, 0);
      const withdrawals = pTrans.filter(t => t.type === 'سحب').reduce((s, t) => s + t.amount, 0);
      return sum + (p.openingBalance + deposits - withdrawals);
    }, 0);

    const totalExpenses = expenses.filter(e => e.status !== 'voided' && isBeforeOrOn(e.date)).reduce((sum, e) => sum + e.amount, 0);
    const totalSales = salesInvoices.filter(i => i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);
    const totalPurchases = purchaseInvoices.filter(i => i.status !== 'voided' && isBeforeOrOn(i.date)).reduce((sum, i) => sum + i.total, 0);

    const reportRows: TrialBalanceRow[] = [
      { code: '1101', account: 'الخزينة (النقدية)', totalDebit: cashBalance > 0 ? cashBalance : 0, totalCredit: cashBalance < 0 ? Math.abs(cashBalance) : 0, debit: cashBalance > 0 ? cashBalance : 0, credit: cashBalance < 0 ? Math.abs(cashBalance) : 0 },
      { code: '1104', account: 'المخزون (بضاعة آخر المدة)', totalDebit: inventoryValue, totalCredit: 0, debit: inventoryValue, credit: 0 },
      { code: '1103', account: 'العملاء (المدينون)', totalDebit: accountsReceivable, totalCredit: 0, debit: accountsReceivable, credit: 0 },
      { code: '5201', account: 'المصروفات العمومية والتشغيلية', totalDebit: totalExpenses, totalCredit: 0, debit: totalExpenses, credit: 0 },
      { code: '2101', account: 'الموردين (الدائنون)', totalDebit: 0, totalCredit: accountsPayable, debit: 0, credit: accountsPayable },
      { code: '3101', account: 'رأس المال (الشركاء)', totalDebit: 0, totalCredit: partnersCapital, debit: 0, credit: partnersCapital },
      { code: '4101', account: 'المبيعات', totalDebit: 0, totalCredit: totalSales, debit: 0, credit: totalSales },
      { code: '5101', account: 'المشتريات / التكلفة', totalDebit: totalPurchases, totalCredit: 0, debit: totalPurchases, credit: 0 }
    ];

    const totalDebit = reportRows.reduce((sum, r) => sum + r.debit, 0);
    const totalCredit = reportRows.reduce((sum, r) => sum + r.credit, 0);

    if (totalDebit !== totalCredit) {
      const diff = totalDebit - totalCredit;
      if (diff > 0) {
        reportRows.push({ code: '3201', account: 'فروقات ميزان / أرباح مرحلة', totalDebit: 0, totalCredit: diff, debit: 0, credit: diff });
      } else {
        reportRows.push({ code: '3201', account: 'فروقات ميزان / خسائر مرحلة', totalDebit: Math.abs(diff), totalCredit: 0, debit: Math.abs(diff), credit: 0 });
      }
    }

    return { rows: reportRows, isFromJournal: false };
  }, [products, customers, suppliers, partners, partnerTransactions, salesInvoices, purchaseInvoices, expenses, customerPayments, supplierPayments, journalEntries, accounts, asOfDate]);

  const totalSumDebit = data.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalSumCredit = data.reduce((sum, r) => sum + r.totalCredit, 0);
  const totalBalanceDebit = data.reduce((sum, r) => sum + r.debit, 0);
  const totalBalanceCredit = data.reduce((sum, r) => sum + r.credit, 0);

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
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 20px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${companyInfo.name}</h1>
            <h2>ميزان المراجعة بالمجاميع والأرصدة</h2>
            <p>حتى تاريخ: ${asOfDate} | المصدر: ${isFromJournal ? 'دفتر اليومية العامة ودليل الحسابات' : 'تقديري'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">كود الحساب</th>
                <th rowspan="2">اسم الحساب</th>
                <th colspan="2">المجاميع</th>
                <th colspan="2">الأرصدة</th>
              </tr>
              <tr>
                <th>مدين</th>
                <th>دائن</th>
                <th>مدين</th>
                <th>دائن</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  <td>${row.code}</td>
                  <td style="text-align: right; font-weight: bold;">${row.account}</td>
                  <td>${row.totalDebit > 0 ? row.totalDebit.toLocaleString('en-US') : '-'}</td>
                  <td>${row.totalCredit > 0 ? row.totalCredit.toLocaleString('en-US') : '-'}</td>
                  <td style="color: #047857; font-weight: bold;">${row.debit > 0 ? row.debit.toLocaleString('en-US') : '-'}</td>
                  <td style="color: #1d4ed8; font-weight: bold;">${row.credit > 0 ? row.credit.toLocaleString('en-US') : '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #e0f2f1; font-weight: bold; font-size: 14px;">
                <td colspan="2" style="text-align: right;">الإجمالي العام</td>
                <td>${totalSumDebit.toLocaleString('en-US')}</td>
                <td>${totalSumCredit.toLocaleString('en-US')}</td>
                <td>${totalBalanceDebit.toLocaleString('en-US')}</td>
                <td>${totalBalanceCredit.toLocaleString('en-US')}</td>
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
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">ميزان المراجعة بالمجاميع والأرصدة</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isFromJournal ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isFromJournal ? '✓ مطابق لقيود اليومية العامة' : 'تقديري'}
              </span>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-2 space-x-reverse mt-1">
              <span>حتى تاريخ:</span>
              <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="border rounded px-2 py-1 text-sm font-semibold" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead className="bg-slate-100 sticky top-0 shadow-sm">
              <tr>
                <th rowSpan={2} className="p-3 border text-xs font-bold tracking-wide w-24">كود الحساب</th>
                <th rowSpan={2} className="p-3 border text-xs font-bold tracking-wide">اسم الحساب</th>
                <th colSpan={2} className="p-2 border text-xs font-bold tracking-wide text-center bg-slate-200">المجاميع (Totals)</th>
                <th colSpan={2} className="p-2 border text-xs font-bold tracking-wide text-center bg-blue-100 text-blue-900">الأرصدة (Balances)</th>
              </tr>
              <tr>
                <th className="p-2 border text-xs font-semibold text-center bg-slate-150">مدين</th>
                <th className="p-2 border text-xs font-semibold text-center bg-slate-150">دائن</th>
                <th className="p-2 border text-xs font-semibold text-center bg-emerald-50 text-emerald-800">مدين</th>
                <th className="p-2 border text-xs font-semibold text-center bg-blue-50 text-blue-800">دائن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="p-2.5 border text-xs font-mono font-bold text-gray-500">{row.code}</td>
                  <td className="p-2.5 border font-semibold text-gray-800">{row.account}</td>
                  <td className="p-2.5 border text-center text-gray-600">{row.totalDebit > 0 ? row.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="p-2.5 border text-center text-gray-600">{row.totalCredit > 0 ? row.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="p-2.5 border text-center font-bold text-emerald-700 bg-emerald-50/30">{row.debit > 0 ? row.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                  <td className="p-2.5 border text-center font-bold text-blue-700 bg-blue-50/30">{row.credit > 0 ? row.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-bold sticky bottom-0 border-t-2 border-slate-300">
              <tr>
                <td colSpan={2} className="p-3 border text-left">الإجمالي العام</td>
                <td className="p-3 border text-center text-gray-800">{totalSumDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="p-3 border text-center text-gray-800">{totalSumCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className={`p-3 border text-center text-emerald-800 ${totalBalanceDebit !== totalBalanceCredit ? 'text-red-600' : ''}`}>
                  {totalBalanceDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className={`p-3 border text-center text-blue-800 ${totalBalanceDebit !== totalBalanceCredit ? 'text-red-600' : ''}`}>
                  {totalBalanceCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {totalBalanceDebit === totalBalanceCredit ? (
                <tr className="bg-emerald-100/60 text-emerald-800 text-xs font-bold">
                  <td colSpan={6} className="p-2 text-center">
                    ✓ الميزان متوازن تماماً (الفرق = 0.00 ج.م)
                  </td>
                </tr>
              ) : (
                <tr className="bg-red-100 text-red-800 text-xs font-bold">
                  <td colSpan={6} className="p-2 text-center">
                    ⚠️ يوجد فرق غير متوازن بمقدار {Math.abs(totalBalanceDebit - totalBalanceCredit).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          <button
            onClick={() => {
              const dataToExport = data.map(row => ({
                'كود الحساب': row.code,
                'اسم الحساب': row.account,
                'مجاميع مدينة': row.totalDebit,
                'مجاميع دائنة': row.totalCredit,
                'أرصدة مدينة': row.debit,
                'أرصدة دائنة': row.credit
              }));
              dataToExport.push({
                'كود الحساب': 'TOT',
                'اسم الحساب': 'الإجمالي',
                'مجاميع مدينة': totalSumDebit,
                'مجاميع دائنة': totalSumCredit,
                'أرصدة مدينة': totalBalanceDebit,
                'أرصدة دائنة': totalBalanceCredit
              });
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
              const message = `*ميزان المراجعة*\nإجمالي المدين: ${totalBalanceDebit.toLocaleString('en-US')} ج.م\nإجمالي الدائن: ${totalBalanceCredit.toLocaleString('en-US')} ج.م\nالحالة: ${totalBalanceDebit === totalBalanceCredit ? 'متوازن تماماً ✓' : 'يوجد فرق'}\n\n*يرجى إرفاق ملف الـ PDF يدوياً.*`;
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