
import React, { useState, useMemo, useEffect } from 'react';
import type { CompanyInfo, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment } from '../types.ts';

interface TreasuryStatementModalProps {
    onClose: () => void;
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    expenses?: any[];
    customerPayments: CustomerPayment[];
    supplierPayments: SupplierPayment[];
}

const TreasuryStatementModal: React.FC<TreasuryStatementModalProps> = ({
    onClose, salesInvoices, purchaseInvoices, expenses = [], customerPayments, supplierPayments
}) => {
    const [startDate, setStartDate] = useState<string>('2024-01-01');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const statementData = useMemo(() => {
        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo: CompanyInfo = companyInfoString
            ? JSON.parse(companyInfoString)
            : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '', treasuryOpeningBalance: 0 };

        const cashSales = salesInvoices
            .filter(inv => inv.paymentMethod === 'نقدي' && inv.status !== 'voided')
            .map(inv => ({
                date: inv.date,
                docId: inv.id,
                description: `فاتورة مبيعات نقدية`,
                debit: inv.total,
                credit: 0
            }));

        const cashPurchases = purchaseInvoices
            .filter(inv => inv.paymentMethod === 'نقدي' && inv.status !== 'voided')
            .map(inv => ({
                date: inv.date,
                docId: inv.id,
                description: `فاتورة مشتريات نقدية`,
                debit: 0,
                credit: inv.total
            }));



        const allCustomerPayments = customerPayments
            .filter(p => p.status !== 'voided')
            .map(p => ({
                date: p.date,
                docId: p.id,
                description: `سند قبض من ${p.customerName}`,
                debit: p.amount,
                credit: 0
            }));

        const allSupplierPayments = supplierPayments
            .filter(p => p.status !== 'voided')
            .map(p => ({
                date: p.date,
                docId: p.id,
                description: `سند صرف إلى ${p.supplierName}`,
                debit: 0,
                credit: p.amount
            }));

        const allExpenses = (expenses || [])
            .filter(e => e.status !== 'voided')
            .map(e => ({
                date: e.date,
                docId: e.id,
                description: `مصروف: ${e.category || ''} - ${e.description || ''}`,
                debit: 0,
                credit: Number(e.amount) || 0
            }));

        const allTransactions = [
            ...cashSales,
            ...cashPurchases,
            ...allCustomerPayments,
            ...allSupplierPayments,
            ...allExpenses
        ];

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        const balanceBeforePeriod = allTransactions
            .filter(t => start && new Date(t.date) < start)
            .reduce((balance, t) => balance + t.debit - t.credit, companyInfo.treasuryOpeningBalance);

        const transactionsInPeriod = allTransactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                if (start && transactionDate < start) return false;
                if (end && transactionDate > end) return false;
                return true;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = balanceBeforePeriod;
        const processedTransactions = transactionsInPeriod.map(t => {
            runningBalance += t.debit - t.credit;
            return { ...t, balance: runningBalance };
        });

        return {
            companyInfo,
            transactions: processedTransactions,
            balanceBeforePeriod,
            closingBalance: runningBalance
        };

    }, [salesInvoices, purchaseInvoices, customerPayments, supplierPayments, startDate, endDate]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handlePrint = () => {
        if (!statementData) return;
        const { companyInfo } = statementData;

        const printContent = `
          <html>
            <head>
              <title>كشف حساب الخزينة</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 20px; background-color: #fff; }
                .statement-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .05); font-size: 16px; line-height: 24px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #007bff; }
                .company-details { text-align: right; }
                .company-details h1 { font-size: 1.8em; margin: 0; color: #007bff; }
                .company-logo img { max-width: 120px; max-height: 80px; }
                .statement-info { margin-bottom: 20px; }
                .statement-info div { margin-bottom: 5px; }
                table { width: 100%; line-height: inherit; text-align: right; border-collapse: collapse; }
                table td, table th { padding: 10px; vertical-align: top; }
                table th { background-color: #f2f7ff; font-weight: bold; border-bottom: 2px solid #ddd; }
                table tbody tr { border-bottom: 1px solid #eee; }
                .balance-row { background-color: #f9f9f9; font-weight: bold; }
                .closing-balance-row { background-color: #e9f5ff; font-weight: bold; border-top: 2px solid #007bff; }
              </style>
            </head>
            <body>
              <div class="statement-box">
                <div class="header">
                  <div class="company-logo">
                    ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo">` : ''}
                  </div>
                  <div class="company-details">
                    <h1>${companyInfo.name}</h1>
                    <p>${companyInfo.address}<br>${companyInfo.phone}</p>
                  </div>
                </div>
                <h2>كشف حساب الخزينة</h2>
                <div class="statement-info">
                    <div><strong>الفترة:</strong> من ${startDate} إلى ${endDate}</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>رقم السند</th>
                      <th>البيان</th>
                      <th>وارد (مدين)</th>
                      <th>صادر (دائن)</th>
                      <th>الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="balance-row">
                      <td colspan="5">رصيد الفترة السابقة</td>
                      <td>${statementData.balanceBeforePeriod.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                    ${statementData.transactions.map(t => `
                      <tr>
                        <td style="direction: ltr; text-align: right;">${t.date}</td>
                        <td>${t.docId}</td>
                        <td>${t.description}</td>
                        <td>${t.debit > 0 ? t.debit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : ''}</td>
                        <td>${t.credit > 0 ? t.credit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : ''}</td>
                        <td>${t.balance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                      </tr>
                    `).join('')}
                    <tr class="closing-balance-row">
                      <td colspan="5">الرصيد الختامي</td>
                      <td>${statementData.closingBalance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                  </tbody>
                </table>
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
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 p-4"
            aria-modal="true" role="dialog" onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">كشف حساب الخزينة</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex justify-start items-end gap-4 mb-4 no-print">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">من تاريخ:</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ:</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>

                    {statementData && (
                        <div>
                            <div className="p-4 bg-gray-50 rounded-lg mb-4 text-center">
                                <h3 className="text-lg font-bold">كشف حساب الخزينة</h3>
                                <p>عن الفترة من {startDate} إلى {endDate}</p>
                            </div>
                            <table className="w-full text-right">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">رقم السند</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">البيان</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">وارد (مدين)</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">صادر (دائن)</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td colSpan={5} className="p-3 text-sm text-gray-700 font-semibold">رصيد الفترة السابقة</td>
                                        <td className="p-3 text-sm text-gray-700 font-bold">{statementData.balanceBeforePeriod.toLocaleString('en-US')} ج.م</td>
                                    </tr>
                                    {statementData.transactions.map((t, index) => (
                                        <tr key={index}>
                                            <td className="p-3 text-sm text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{t.date}</td>
                                            <td className="p-3 text-sm text-gray-700 font-mono">{t.docId}</td>
                                            <td className="p-3 text-sm text-gray-700">{t.description}</td>
                                            <td className="p-3 text-sm text-green-600">{t.debit > 0 ? t.debit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                                            <td className="p-3 text-sm text-red-600">{t.credit > 0 ? t.credit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                                            <td className="p-3 text-sm text-gray-700 font-bold">{t.balance.toLocaleString('en-US')} ج.م</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-bold border-t-2">
                                        <td colSpan={5} className="p-3 text-sm">الرصيد الختامي</td>
                                        <td className="p-3 text-sm">{statementData.closingBalance.toLocaleString('en-US')} ج.م</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg no-print">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
                    {statementData && <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">طباعة</button>}
                </div>
            </div>
        </div>
    );
};
export default TreasuryStatementModal;
