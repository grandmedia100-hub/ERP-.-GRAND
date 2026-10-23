
import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, SalesInvoice, CustomerPayment, CompanyInfo } from '../types.ts';
import InvoicePreviewModal from './InvoicePreviewModal.tsx';
import { generateCustomerStatementWhatsAppText, openWhatsAppWithMessage } from '../utils/whatsappHelper.ts';

interface CustomerStatementModalProps {
    onClose: () => void;
    customers: Customer[];
    invoices: SalesInvoice[];
    payments: CustomerPayment[];
}

const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({ onClose, customers, invoices, payments }) => {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('2024-01-01');
    const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [previewInvoice, setPreviewInvoice] = useState<SalesInvoice | null>(null);

    const statementData = useMemo(() => {
        if (!selectedCustomerId) return null;
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) return null;

        const customerInvoices = invoices.filter(inv => inv.customerId === selectedCustomerId && inv.status !== 'voided');
        const customerPayments = payments.filter(p => p.customerId === selectedCustomerId && p.status !== 'voided');

        const allTransactions = [
            ...customerInvoices.flatMap(inv => {
                const rawItems = Array.isArray(inv.items)
                    ? inv.items
                    : (typeof inv.items === 'string' ? (() => { try { return JSON.parse(inv.items); } catch { return []; } })() : []);
                // Create a row for each item in the invoice
                const rows = (rawItems || []).map((item, index) => ({
                    id: `${inv.id}-item-${index}`,
                    invoiceId: inv.id,
                    date: inv.date,
                    type: 'invoice' as const,
                    description: `فاتورة #${inv.id} - ${item.productName} (${item.quantity} × ${(Number(item.price) || 0).toLocaleString()} ج.م)`,
                    debit: item.total || (item.quantity * item.price),
                    credit: 0,
                    originalObject: inv,
                    isSubItem: true,
                    itemDetails: {
                        productName: item.productName,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.total || (item.quantity * item.price)
                    }
                }));

                // Add discount row if exists
                if (inv.discountValue && inv.discountValue > 0) {
                    let discountAmount = 0;
                    if (inv.discountType === 'percentage') {
                        discountAmount = (inv.subTotal || 0) * (inv.discountValue / 100);
                    } else {
                        discountAmount = inv.discountValue;
                    }

                    if (discountAmount > 0) {
                        rows.push({
                            id: `${inv.id}-discount`,
                            invoiceId: inv.id,
                            date: inv.date,
                            type: 'invoice' as const,
                            description: `خصم على فاتورة #${inv.id}`,
                            debit: 0,
                            credit: discountAmount,
                            originalObject: inv,
                            isSubItem: true,
                            itemDetails: {
                                productName: 'خصم',
                                quantity: 1,
                                price: discountAmount,
                                total: discountAmount
                            }
                        } as any);
                    }
                }

                return rows;
            }),
            ...customerPayments.map(p => ({
                id: p.id,
                date: p.date,
                type: 'payment' as const,
                description: `دفعة مستلمة #${p.id}`,
                debit: 0,
                credit: p.amount,
                originalObject: null,
                isSubItem: false
            }))
        ];

        const balanceBeforePeriod = allTransactions
            .filter(t => new Date(t.date) < new Date(startDate))
            .reduce((balance, t) => balance + t.debit - t.credit, customer.openingBalance);

        const transactionsInPeriod = allTransactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = balanceBeforePeriod;
        const processedTransactions = transactionsInPeriod.map(t => {
            runningBalance += t.debit - t.credit;
            return { ...t, balance: runningBalance };
        });

        return {
            customer,
            transactions: processedTransactions,
            balanceBeforePeriod,
            closingBalance: runningBalance
        };

    }, [selectedCustomerId, customers, invoices, payments, startDate, endDate]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !previewInvoice) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, previewInvoice]);

    const buildPrintContent = (companyInfo: CompanyInfo, logoBase64: string) => {
        if (!statementData) return '';
        return `
          <html>
            <head>
              <title>كشف حساب عميل - ${statementData.customer.name}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                @page { size: A4; margin: 10mm; }
                body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 10px; background-color: #fff; }
                .statement-box { width: 100%; max-width: 100%; margin: auto; padding-bottom: 80px; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #007bff; }
                .header > div { flex: 1; }
                .logo-section { text-align: right; }
                .logo-section img { max-width: 180px; max-height: 100px; object-fit: contain; }
                .title-section { text-align: center; }
                .title-section h2 { margin: 0; font-size: 28px; color: #333; font-weight: 700; }
                .title-section p { margin: 5px 0 0; color: #666; font-size: 16px; }
                .name-section { text-align: left; }
                .name-section h1 { margin: 0; font-size: 28px; color: #007bff; font-weight: 800; }
                .statement-info { display: flex; justify-content: space-between; background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #eee; }
                .info-group strong { display: block; color: #007bff; margin-bottom: 5px; font-size: 16px; }
                .info-group span { font-size: 16px; font-weight: 600; color: #333; }
                table { width: 100%; text-align: right; border-collapse: collapse; font-size: 14px; }
                table th { background-color: #007bff; color: white; padding: 12px; border: 1px solid #007bff; font-size: 15px; }
                table td { padding: 10px; border: 1px solid #ddd; }
                table tr:nth-child(even) { background-color: #f9f9f9; }
                .balance-row { background-color: #e3f2fd !important; font-weight: bold; color: #0d47a1; }
                .closing-balance-row { background-color: #007bff !important; color: white; font-weight: bold; font-size: 16px; }
                .closing-balance-row td { border: 1px solid #007bff; }
                .footer { margin-top: 30px; border-top: 2px solid #007bff; padding: 10px 0 4px; text-align: center; font-size: 13px; color: #444; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="statement-box">
                <div class="header">
                  <div class="logo-section">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
                  </div>
                  <div class="title-section">
                    <h2>كشف حساب عميل</h2>
                    <p>Customer Statement</p>
                  </div>
                  <div class="name-section">
                    <h1>${companyInfo.name}</h1>
                  </div>
                </div>
                <div class="statement-info">
                    <div class="info-group">
                        <strong>بيانات العميل</strong>
                        <span>${statementData.customer.name}${statementData.customer.phone ? ' - ' + statementData.customer.phone : ''}${statementData.customer.address ? ' - ' + statementData.customer.address : ''}</span>
                    </div>
                    <div class="info-group" style="text-align: left;">
                        <strong>فترة الكشف</strong>
                        <span>من: ${startDate} &nbsp;&nbsp; إلى: ${endDate}</span>
                    </div>
                </div>
                 <table>
                   <thead>
                     <tr>
                       <th width="15%">التاريخ</th>
                       <th width="35%">البيان</th>
                       <th width="15%">مدين</th>
                       <th width="15%">دائن</th>
                       <th width="15%">الرصيد</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr class="balance-row">
                       <td colspan="4">رصيد ما قبل الفترة</td>
                       <td>${(Number(statementData.balanceBeforePeriod) || 0).toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                     </tr>
                     ${statementData.transactions.map(t => `
                       <tr>
                         <td style="direction: ltr; text-align: right;">${t.date}</td>
                         <td>${t.description}</td>
                         <td style="color: #d32f2f;">${t.debit > 0 ? t.debit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : '-'}</td>
                         <td style="color: #388e3c;">${t.credit > 0 ? t.credit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : '-'}</td>
                         <td style="direction: ltr; text-align: right; font-weight: bold;">${(t as any).balance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                       </tr>
                     `).join('')}
                     <tr class="closing-balance-row">
                       <td colspan="4" style="text-align: center;">الرصيد الختامي</td>
                       <td style="direction: ltr; text-align: right;">${(Number(statementData.closingBalance) || 0).toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                     </tr>
                   </tbody>
                 </table>
              </div>
              <div class="footer">
                <span>${companyInfo.name}${companyInfo.address ? ' - ' + companyInfo.address : ''}${companyInfo.phone ? ' - هاتف: ' + companyInfo.phone : ''}</span>
              </div>
            </body>
          </html>
        `;
    };

    const handlePrint = () => {
        if (!statementData) return;

        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo: CompanyInfo = companyInfoString
            ? JSON.parse(companyInfoString)
            : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

        const logoSrc = companyInfo.logo || '';

        const doPrint = (logoBase64: string) => {
            const printContent = buildPrintContent(companyInfo, logoBase64);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(printContent);
                printWindow.document.close();
                printWindow.onload = () => {
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                    }, 300);
                };
            }
        };

        // If logo is already base64, use it directly
        if (!logoSrc || logoSrc.startsWith('data:')) {
            doPrint(logoSrc);
        } else {
            // Convert blob/http URL to base64 via canvas
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    doPrint(canvas.toDataURL('image/png'));
                } else {
                    doPrint(logoSrc);
                }
            };
            img.onerror = () => doPrint('');
            img.src = logoSrc;
        }
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
                    <h2 className="text-xl font-bold text-gray-800">كشف حساب عميل</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto" id="printable-statement">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 no-print">
                        <div className="md:col-span-1">
                            <label htmlFor="customer-select" className="block text-sm font-medium text-gray-700 mb-1">العميل:</label>
                            <select id="customer-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="">-- اختر عميل --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
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
                            <div className="py-2 px-3 bg-gray-50 rounded-lg mb-3 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-800">{statementData.customer.name}</span>
                                <span className="text-gray-500">من: {startDate} &nbsp;—&nbsp; إلى: {endDate}</span>
                            </div>
                            <table className="w-full text-right">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">البيان</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">مدين</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">دائن</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-sm text-gray-700 font-semibold">رصيد الفترة السابقة</td>
                                        <td className="p-3 text-sm text-gray-700 font-bold">{(Number(statementData.balanceBeforePeriod) || 0).toLocaleString('en-US')} ج.م</td>
                                    </tr>
                                    {statementData.transactions.map((t, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="p-3 text-sm text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{t.date}</td>
                                            <td className="p-3 text-sm text-gray-700 flex items-center gap-2">
                                                {t.description}
                                                {t.type === 'invoice' && (
                                                    <button
                                                        onClick={() => setPreviewInvoice(t.originalObject as SalesInvoice)}
                                                        className="text-blue-500 hover:text-blue-700"
                                                        title="عرض الفاتورة"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3 text-sm text-red-600">{t.debit > 0 ? t.debit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                                            <td className="p-3 text-sm text-green-600">{t.credit > 0 ? t.credit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                                            <td className="p-3 text-sm text-gray-700 font-bold">{(Number(t.balance) || 0).toLocaleString('en-US')} ج.م</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-100 font-bold border-t-2">
                                        <td colSpan={4} className="p-3 text-sm">الرصيد الختامي</td>
                                        <td className="p-3 text-sm">{(Number(statementData.closingBalance) || 0).toLocaleString('en-US')} ج.م</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* On-screen footer */}
                            {(() => {
                                const ci = (() => { try { const s = localStorage.getItem('companyInfo'); return s ? JSON.parse(s) : null; } catch { return null; } })();
                                if (!ci) return null;
                                return (
                                    <div className="mt-6 border-t-2 border-blue-600 pt-3 text-center text-sm font-bold text-gray-600">
                                        <span>
                                            {ci.name}
                                            {ci.address ? ` - ${ci.address}` : ''}
                                            {ci.phone ? ` - هاتف: ${ci.phone}` : ''}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg no-print">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
                    {statementData && (
                        <>
                            <button
                                onClick={() => {
                                    const dataToExport = [
                                        { 'التاريخ': '', 'البيان': 'رصيد ما قبل الفترة', 'مدين': statementData.balanceBeforePeriod, 'دائن': '' },
                                        ...statementData.transactions.map(t => ({
                                            'التاريخ': t.date,
                                            'البيان': t.description,
                                            'مدين': t.debit || '',
                                            'دائن': t.credit || ''
                                        })),
                                        { 'التاريخ': '', 'البيان': 'الرصيد الختامي', 'مدين': statementData.closingBalance, 'دائن': '' }
                                    ];
                                    import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                                        exportToExcel(dataToExport, `كشف_حساب_${statementData.customer.name}`);
                                    });
                                }}
                                className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                <span>تصدير إكسيل</span>
                            </button>
                            <button
                                onClick={() => {
                                    const companyInfoStr = localStorage.getItem('companyInfo');
                                    const companyName = companyInfoStr ? JSON.parse(companyInfoStr).name : undefined;
                                    const msg = generateCustomerStatementWhatsAppText(
                                        statementData.customer,
                                        {
                                            openingBalance: statementData.openingBalance,
                                            totalSales: statementData.totalDebits,
                                            totalPaid: statementData.totalCredits,
                                            closingBalance: statementData.closingBalance
                                        },
                                        companyName
                                    );
                                    openWhatsAppWithMessage(statementData.customer.phone || '', msg);
                                }}
                                className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 flex items-center space-x-2 space-x-reverse shadow-xs transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.248 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                <span>مشاركة واتساب</span>
                            </button>
                            <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">طباعة</button>
                        </>
                    )}
                </div>
            </div>

            {previewInvoice && (
                <InvoicePreviewModal
                    invoice={previewInvoice}
                    type="sales"
                    onClose={() => setPreviewInvoice(null)}
                />
            )}
        </div>
    );
};
export default CustomerStatementModal;
