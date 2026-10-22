import React, { useMemo, useEffect } from 'react';
import type { Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment } from '../types.ts';

interface AgingReportModalProps {
    onClose: () => void;
    customers: Customer[];
    suppliers: Supplier[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    customerPayments: CustomerPayment[];
    supplierPayments: SupplierPayment[];
}

const AgingReportModal: React.FC<AgingReportModalProps> = ({
    onClose,
    customers,
    suppliers,
    salesInvoices,
    purchaseInvoices,
    customerPayments,
    supplierPayments
}) => {
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const reportData = useMemo(() => {
        const today = new Date();

        const calculateAging = (entities: (Customer | Supplier)[], invoices: (SalesInvoice | PurchaseInvoice)[], payments: (CustomerPayment | SupplierPayment)[], type: 'customer' | 'supplier') => {
            return entities.map(entity => {
                // Calculate Total Balance
                const entityInvoices = invoices.filter(inv =>
                    (type === 'customer' ? (inv as SalesInvoice).customerId : (inv as PurchaseInvoice).supplierId) === entity.id
                    && inv.status !== 'voided'
                );
                const entityPayments = payments.filter(pay =>
                    (type === 'customer' ? (pay as CustomerPayment).customerId : (pay as SupplierPayment).supplierId) === entity.id
                    && pay.status !== 'voided'
                );

                const totalInvoiced = entityInvoices.reduce((sum, inv) => sum + inv.total, 0);
                const totalPaid = entityPayments.reduce((sum, pay) => sum + pay.amount, 0);
                const currentBalance = ((entity as any).openingBalance || 0) + totalInvoiced - totalPaid;

                // Bucket Logic
                // Strategy: We allocate payments to the OLDEST invoices first (FIFO) to determine which invoices are STILL unpaid.
                // Then we calculate age of those remaining unpaid invoices.

                // 1. Sort invoices by date (Oldest first)
                const sortedInvoices = [...entityInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                let remainingPayment = totalPaid;
                let buckets = {
                    '0-30': 0,
                    '31-60': 0,
                    '61-90': 0,
                    '90+': 0
                };

                sortedInvoices.forEach(inv => {
                    if (remainingPayment >= inv.total) {
                        // Fully paid
                        remainingPayment -= inv.total;
                    } else {
                        // Partially paid or Unpaid
                        const unpaidAmount = inv.total - remainingPayment;
                        remainingPayment = 0; // Usage exhausted

                        // Calculate Age
                        const invDate = new Date(inv.date);
                        const diffTime = Math.abs(today.getTime() - invDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays <= 30) buckets['0-30'] += unpaidAmount;
                        else if (diffDays <= 60) buckets['31-60'] += unpaidAmount;
                        else if (diffDays <= 90) buckets['61-90'] += unpaidAmount;
                        else buckets['90+'] += unpaidAmount;
                    }
                });

                // If there's NEGATIVE balance (Overpayment), it doesn't fit in aging. We just show it in total.
                // Typically Aging focuses on POSITIVE debt.

                return {
                    id: entity.id,
                    name: entity.name,
                    phone: (entity as any).phone || '',
                    totalMood: currentBalance,
                    buckets
                };
            }).filter(r => r.totalMood > 1); // Only show relevant debts > 1 EGP
        };

        const customersAging = calculateAging(customers, salesInvoices, customerPayments, 'customer');
        const suppliersAging = calculateAging(suppliers, purchaseInvoices, supplierPayments, 'supplier');

        return { customersAging, suppliersAging };
    }, [customers, suppliers, salesInvoices, purchaseInvoices, customerPayments, supplierPayments]);

    const handleSendWhatsAppDemand = (c: any) => {
        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo = companyInfoString ? JSON.parse(companyInfoString) : { name: 'جراند ميديا' };
        
        let phone = c.phone;
        if (!phone) {
            phone = prompt(`يرجى إدخال رقم هاتف العميل (${c.name}) لإرسال المطالبة عبر الواتساب:`);
        }
        if (!phone) return;

        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('01')) {
            cleanPhone = '2' + cleanPhone;
        } else if (cleanPhone.startsWith('1') && cleanPhone.length === 10) {
            cleanPhone = '20' + cleanPhone;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const message = 
`عناية السادة / *${c.name}* المحترمين
تحية طيبة وبعد من شركة *${companyInfo.name || 'جراند ميديا'}*،

نود إحاطة سيادتكم علماً ببيان المستحقات المالية المسجلة لديكم حتى تاريخ (${todayStr}):
📊 *إجمالي المديونية المستحقة:* ${c.totalMood.toLocaleString('en-US')} ج.م

تفاصيل الفترات وأعمار الديون:
• مستحق (0 إلى 30 يوم): ${c.buckets['0-30'].toLocaleString('en-US')} ج.م
• متأخر (31 إلى 60 يوم): ${c.buckets['31-60'].toLocaleString('en-US')} ج.م
• متأخر (61 إلى 90 يوم): ${c.buckets['61-90'].toLocaleString('en-US')} ج.م
• متأخر أكثر من 90 يوم: ${c.buckets['90+'].toLocaleString('en-US')} ج.م

يرجى التكرم بجدولة وسداد المبالغ المتأخرة عبر حساباتنا البنكية أو المحافظ الإلكترونية المعتمدة.
شاكرين ومقدرين حسن تعاونكم الدائم معنا.`;

        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handlePrint = () => {
        // Print logic (Standard HTML print)
        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo = companyInfoString ? JSON.parse(companyInfoString) : { name: 'Company', logo: '' };

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
        <html>
          <head>
            <title>تقرير أعمار الديون</title>
            <style>
               @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
               body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
               table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
               th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
               th { background-color: #f3f4f6; }
               .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
               <h1>${companyInfo.name}</h1>
               <h2>تقرير أعمار الديون (Aging Report)</h2>
               <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>

            <h3>العملاء (مستحقات لنا)</h3>
            <table>
              <thead>
                <tr>
                   <th style="text-align: right">العميل</th>
                   <th>الإجمالي المستحق</th>
                   <th style="background-color: #dcfce7">0-30 يوم</th>
                   <th style="background-color: #fef9c3">31-60 يوم</th>
                   <th style="background-color: #ffedd5">61-90 يوم</th>
                   <th style="background-color: #fee2e2">+90 يوم</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.customersAging.map(c => `
                   <tr>
                     <td style="text-align: right; font-weight: bold;">${c.name}</td>
                     <td style="font-weight: bold;">${c.totalMood.toLocaleString('en-US')}</td>
                     <td>${c.buckets['0-30'].toLocaleString('en-US')}</td>
                     <td>${c.buckets['31-60'].toLocaleString('en-US')}</td>
                     <td>${c.buckets['61-90'].toLocaleString('en-US')}</td>
                     <td style="color: red; font-weight: bold;">${c.buckets['90+'].toLocaleString('en-US')}</td>
                   </tr>
                `).join('')}
              </tbody>
            </table>

            <h3>الموردين (مستحقات علينا)</h3>
            <table>
              <thead>
                <tr>
                   <th style="text-align: right">المورد</th>
                   <th>الإجمالي المستحق</th>
                   <th>0-30 يوم</th>
                   <th>31-60 يوم</th>
                   <th>61-90 يوم</th>
                   <th>+90 يوم</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.suppliersAging.map(s => `
                   <tr>
                     <td style="text-align: right; font-weight: bold;">${s.name}</td>
                     <td style="font-weight: bold;">${s.totalMood.toLocaleString('en-US')}</td>
                     <td>${s.buckets['0-30'].toLocaleString('en-US')}</td>
                     <td>${s.buckets['31-60'].toLocaleString('en-US')}</td>
                     <td>${s.buckets['61-90'].toLocaleString('en-US')}</td>
                     <td style="color: red; font-weight: bold;">${s.buckets['90+'].toLocaleString('en-US')}</td>
                   </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
        printWindow?.document.close();
        printWindow?.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">تقرير أعمار الديون (Aging Report)</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Section 1: Customers */}
                    <h3 className="text-lg font-bold text-blue-700 mb-4 border-b pb-2">أرصدة العملاء (مستحقات التحصيل)</h3>
                    <table className="w-full text-right mb-8">
                        <thead className="bg-gray-100 text-sm">
                            <tr>
                                <th className="p-3">اسم العميل</th>
                                <th className="p-3">الإجمالي</th>
                                <th className="p-3 bg-green-50 text-green-800">0-30 يوم</th>
                                <th className="p-3 bg-yellow-50 text-yellow-800">31-60 يوم</th>
                                <th className="p-3 bg-orange-50 text-orange-800">61-90 يوم</th>
                                <th className="p-3 bg-red-50 text-red-800">+90 يوم</th>
                                <th className="p-3 text-center">إجراء التحصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {reportData.customersAging.length > 0 ? reportData.customersAging.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-700">{c.name}</td>
                                    <td className="p-3 font-bold">{c.totalMood.toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{c.buckets['0-30'].toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{c.buckets['31-60'].toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{c.buckets['61-90'].toLocaleString('en-US')}</td>
                                    <td className="p-3 font-bold text-red-600">{c.buckets['90+'].toLocaleString('en-US')}</td>
                                    <td className="p-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleSendWhatsAppDemand(c)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-sm mx-auto transition-transform active:scale-95"
                                            title="إرسال رسالة مطالبة ودية بالمديونية وتفاصيل الفترات عبر الواتساب"
                                        >
                                            <span>💬</span>
                                            <span>مطالبة واتساب</span>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="text-center p-4 text-gray-500">لا توجد مديونيات على العملاء</td></tr>
                            )}
                        </tbody>
                    </table>

                    {/* Section 2: Suppliers */}
                    <h3 className="text-lg font-bold text-red-700 mb-4 border-b pb-2">أرصدة الموردين (مستحقات السداد)</h3>
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 text-sm">
                            <tr>
                                <th className="p-3">اسم المورد</th>
                                <th className="p-3">الإجمالي</th>
                                <th className="p-3">0-30 يوم</th>
                                <th className="p-3">31-60 يوم</th>
                                <th className="p-3">61-90 يوم</th>
                                <th className="p-3">+90 يوم</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {reportData.suppliersAging.length > 0 ? reportData.suppliersAging.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-700">{s.name}</td>
                                    <td className="p-3 font-bold">{s.totalMood.toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{s.buckets['0-30'].toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{s.buckets['31-60'].toLocaleString('en-US')}</td>
                                    <td className="p-3 text-gray-600">{s.buckets['61-90'].toLocaleString('en-US')}</td>
                                    <td className="p-3 font-bold text-red-600">{s.buckets['90+'].toLocaleString('en-US')}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="text-center p-4 text-gray-500">لا توجد مستحقات للموردين</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
                    <button
                        onClick={() => {
                            import('../utils/exportToExcel.ts').then(({ exportToExcel }) => {
                                // Prepare data for export - Flat structure
                                const customersExport = reportData.customersAging.map(c => ({
                                    Type: 'Customer',
                                    Name: c.name,
                                    Total: c.totalMood,
                                    '0-30': c.buckets['0-30'],
                                    '31-60': c.buckets['31-60'],
                                    '61-90': c.buckets['61-90'],
                                    '90+': c.buckets['90+']
                                }));
                                const suppliersExport = reportData.suppliersAging.map(s => ({
                                    Type: 'Supplier',
                                    Name: s.name,
                                    Total: s.totalMood,
                                    '0-30': s.buckets['0-30'],
                                    '31-60': s.buckets['31-60'],
                                    '61-90': s.buckets['61-90'],
                                    '90+': s.buckets['90+']
                                }));
                                exportToExcel([...customersExport, ...suppliersExport], 'Aging_Report');
                            });
                        }}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>تصدير إكسيل</span>
                    </button>
                    <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        <span>طباعة التقرير</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgingReportModal;
