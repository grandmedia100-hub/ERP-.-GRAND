import React, { useMemo, useEffect } from 'react';
import type { SalesInvoice, PurchaseInvoice, JournalEntry } from '../types.ts';

interface IncomeStatementModalProps {
    onClose: () => void;
    sales: SalesInvoice[];
    purchases: PurchaseInvoice[];
    journalEntries: JournalEntry[];
}

const IncomeStatementModal: React.FC<IncomeStatementModalProps> = ({ onClose, sales, purchases, journalEntries }) => {
    // Date Filters
    const [startDate, setStartDate] = React.useState<string>('');
    const [endDate, setEndDate] = React.useState<string>('');

    const reportData = useMemo(() => {
        // Filter Functions
        const isInRange = (dateStr: string) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        };

        const filteredSales = sales.filter(inv => inv.status !== 'voided' && isInRange(inv.date));

        const totalRevenue = filteredSales.reduce((sum, inv) => sum + inv.total, 0);

        // Accurate COGS and Expenses from Journal Entries
        let costOfGoodsSold = 0;
        let totalExpenses = 0;

        if (journalEntries) {
            journalEntries.forEach(entry => {
                if (isInRange(entry.date)) {
                    const rawLines: any[] = Array.isArray(entry.lines)
                        ? entry.lines
                        : (typeof entry.lines === 'string' ? (() => { try { return JSON.parse(entry.lines); } catch { return []; } })() : []);
                    rawLines.forEach(line => {
                        // COGS Account 5101
                        if (line.accountId === '5101' || line.accountId.startsWith('51')) {
                            costOfGoodsSold += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                        }
                        // Operating Expenses Accounts (52xx) - مصروفات التشغيل
                        if (line.accountId.startsWith('52')) {
                            totalExpenses += (Number(line.debit) || 0) - (Number(line.credit) || 0);
                        }
                    });
                }
            });
        }

        const grossProfit = totalRevenue - costOfGoodsSold;
        const netProfit = grossProfit - totalExpenses;

        return {
            totalRevenue,
            costOfGoodsSold,
            grossProfit,
            totalExpenses,
            netProfit
        };
    }, [sales, purchases, journalEntries, startDate, endDate]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handlePrint = () => {
        const savedInfo = localStorage.getItem('companyInfo');
        const companyInfo = savedInfo ? JSON.parse(savedInfo) : { name: 'اسم الشركة' };

        const printContent = `
          <html dir="rtl" lang="ar">
            <head>
              <title>قائمة الدخل</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 25px; margin: 0; }
                .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
                .header h1 { margin: 0 0 8px 0; color: #1e3a8a; }
                .header h2 { margin: 0 0 8px 0; color: #374151; font-size: 20px; }
                .header p { margin: 0; color: #6b7280; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
                th, td { padding: 12px 14px; border-bottom: 1px solid #e5e7eb; }
                .section-header { background: #f8fafc; font-weight: bold; color: #1e293b; font-size: 15px; }
                .bold-row { font-weight: bold; background: #f1f5f9; }
                .net-row { font-weight: bold; font-size: 17px; background: #eff6ff; border-top: 2px solid #2563eb; border-bottom: 2px solid #2563eb; }
                .positive { color: #16a34a; }
                .negative { color: #dc2626; }
                .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; color: #4b5563; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${companyInfo.name || 'MediaHive ERP'}</h1>
                <h2>قائمة الدخل والأرباح (Income Statement)</h2>
                <p>الفترة: ${startDate ? 'من ' + startDate : 'من بداية النشاط'} ${endDate ? 'إلى ' + endDate : ''}</p>
                <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')}</p>
              </div>
              <table>
                <tbody>
                  <tr class="section-header">
                    <td colspan="2">الإيرادات والمبيعات</td>
                  </tr>
                  <tr>
                    <td>إجمالي المبيعات المحققة</td>
                    <td style="text-align: left; font-weight: bold;">${reportData.totalRevenue.toLocaleString('en-US')} ج.م</td>
                  </tr>
                  <tr class="section-header">
                    <td colspan="2">تكلفة البضاعة المباعة (COGS)</td>
                  </tr>
                  <tr>
                    <td>إجمالي تكلفة الأصناف المباعة</td>
                    <td style="text-align: left; color: #dc2626;">(${reportData.costOfGoodsSold.toLocaleString('en-US')}) ج.م</td>
                  </tr>
                  <tr class="bold-row">
                    <td>مجمل الربح (Gross Profit)</td>
                    <td style="text-align: left; color: ${reportData.grossProfit >= 0 ? '#16a34a' : '#dc2626'};">${reportData.grossProfit.toLocaleString('en-US')} ج.م</td>
                  </tr>
                  <tr class="section-header">
                    <td colspan="2">المصروفات التشغيلية والإدارية</td>
                  </tr>
                  <tr>
                    <td>إجمالي المصروفات التشغيلية</td>
                    <td style="text-align: left; color: #dc2626;">(${reportData.totalExpenses.toLocaleString('en-US')}) ج.م</td>
                  </tr>
                  <tr class="net-row">
                    <td>صافي الربح / (الخسارة) للفترة</td>
                    <td style="text-align: left;" class="${reportData.netProfit >= 0 ? 'positive' : 'negative'}">
                      ${reportData.netProfit.toLocaleString('en-US')} ج.م
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="footer">
                <div>إعداد: المحاسب المالي</div>
                <div>اعتماد: الإدارة المالية</div>
              </div>
            </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
            return;
        }
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            aria-modal="true" role="dialog" onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">تقرير قائمة الدخل</h2>
                        <div className="text-sm text-gray-500 flex items-center space-x-2 space-x-reverse mt-1">
                            <span>من:</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1" />
                            <span>إلى:</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1" />
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto" id="printable-report">
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #printable-report, #printable-report * {
                                visibility: visible;
                            }
                            #printable-report {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                        }
                    `}</style>
                    <table className="w-full text-right">
                        <tbody>
                            <tr className="border-b"><td className="py-2 pr-2 font-semibold">الإيرادات</td><td></td></tr>
                            <tr className="border-b"><td className="py-2 pr-6">إجمالي المبيعات</td><td className="py-2 text-left">{reportData.totalRevenue.toLocaleString('en-US')} ج.م</td></tr>

                            <tr className="border-b"><td className="py-3 pr-2 font-semibold">تكلفة البضاعة المباعة</td><td></td></tr>
                            <tr className="border-b"><td className="py-2 pr-6">إجمالي التكلفة</td><td className="py-2 text-left">({reportData.costOfGoodsSold.toLocaleString('en-US')}) ج.م</td></tr>

                            <tr className="border-b bg-gray-50 font-bold"><td className="py-3 pr-2">مجمل الربح</td><td className="py-3 text-left">{reportData.grossProfit.toLocaleString('en-US')} ج.م</td></tr>

                            <tr className="border-b"><td className="py-3 pr-2 font-semibold">المصروفات التشغيلية</td><td></td></tr>
                            <tr className="border-b bg-gray-50"><td className="py-2 pr-6 font-semibold">إجمالي المصروفات</td><td className="py-2 text-left font-semibold">({reportData.totalExpenses.toLocaleString('en-US')}) ج.م</td></tr>

                            <tr className="border-t-2 border-black bg-blue-50 font-bold text-lg"><td className="py-4 pr-2">صافي الربح / (الخسارة)</td><td className={`py-4 text-left ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{reportData.netProfit.toLocaleString('en-US')} ج.م</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">

                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
                    <button
                        onClick={() => {
                            const dataToExport = [
                                { 'البند': 'إجمالي المبيعات', 'القيمية': reportData.totalRevenue },
                                { 'البند': 'تكلفة البضاعة المباعة', 'القيمية': reportData.costOfGoodsSold },
                                { 'البند': 'مجمل الربح', 'القيمية': reportData.grossProfit },
                                { 'البند': 'إجمالي المصروفات', 'القيمية': reportData.totalExpenses },
                                { 'البند': 'صافي الربح', 'القيمية': reportData.netProfit },
                            ];
                            import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                                exportToExcel(dataToExport, 'قائمة_الدخل');
                            });
                        }}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span>تصدير إكسيل</span>
                    </button>
                    <button
                        onClick={() => {
                            const message = `*قائمة الدخل*\n\nإجمالي المبيعات: ${reportData.totalRevenue.toLocaleString('en-US')} ج.م\nمجمل الربح: ${reportData.grossProfit.toLocaleString('en-US')} ج.م\nصافي الربح: ${reportData.netProfit.toLocaleString('en-US')} ج.م\n\n*يرجى إرفاق ملف الـ PDF يدوياً.*`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 flex items-center space-x-2 space-x-reverse"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.248 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                        <span>مشاركة واتساب</span>
                    </button>
                    <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>طباعة التقرير</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default IncomeStatementModal;
