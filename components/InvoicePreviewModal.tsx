import React, { useState, useEffect, useCallback } from 'react';
import type { SalesInvoice, PurchaseInvoice, CompanyInfo, PrintSettings } from '../types.ts';
import PrintSettingsModal from './PrintSettingsModal.tsx';
import { getPrintSettings, getPrintStyles } from '../utils/printEngine.ts';

interface InvoicePreviewModalProps {
    onClose: () => void;
    invoice: SalesInvoice | PurchaseInvoice;
    type: 'sales' | 'purchase';
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ onClose, invoice, type }) => {
    const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
    const [printSettings, setPrintSettings] = useState<PrintSettings>(getPrintSettings());

    const handleEsc = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isPrintSettingsOpen) onClose();
    }, [onClose, isPrintSettingsOpen]);

    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
        ? JSON.parse(companyInfoString)
        : { name: 'جراند ميديا للدعاية والإنتاج', address: 'مصر', phone: '01000000000', logo: '' };

    useEffect(() => {
        window.addEventListener('keydown', handleEsc);
        return () => { window.removeEventListener('keydown', handleEsc); };
    }, [handleEsc]);

    useEffect(() => {
        const handleUpdate = () => {
            setPrintSettings(getPrintSettings());
        };
        window.addEventListener('printSettingsUpdated', handleUpdate);
        return () => window.removeEventListener('printSettingsUpdated', handleUpdate);
    }, []);

    const isSales = type === 'sales';
    const entityName = isSales ? (invoice as SalesInvoice).customerName : (invoice as PurchaseInvoice).supplierName;
    const entityLabel = isSales ? 'العميل' : 'المورد';
    const title = isSales ? 'فاتورة مبيعات' : 'فاتورة مشتريات';
    
    // Theme colors driven by printSettings
    const primaryHex = printSettings.primaryColor || (isSales ? '#1e40af' : '#16a34a');
    const bgLightHex = isSales ? '#eff6ff' : '#f0fdf4';

    // ===== Dedicated Print HTML Generator =====
    const getPrintContent = () => {
        const logoHtml = printSettings.showLogo && companyInfo.logo
            ? `<img src="${companyInfo.logo}" alt="Logo" onload="window.logoLoaded = true;"
                 style="max-height:${printSettings.logoSize === 'sm' ? '50px' : printSettings.logoSize === 'lg' ? '90px' : '70px'};
                 max-width:160px;object-fit:contain;display:block;" />`
            : `<div style="width:60px;height:60px;border-radius:10px;background:${primaryHex};display:flex;
                 align-items:center;justify-content:center;color:white;font-size:1.8rem;font-weight:bold;">
                 ${(companyInfo.name || 'G').charAt(0)}
               </div>`;

        const discountHtml = (invoice.discountValue && invoice.discountValue > 0) ? `
            <div style="display:flex;justify-content:space-between;padding:6px 12px;background:#f9fafb;
                border-radius:6px;border:1px solid #e5e7eb;font-size:12px;margin-bottom:4px;">
                <span style="color:#4b5563;font-weight:600;">المجموع الفرعي</span>
                <span style="font-weight:700;">${(invoice.subTotal || invoice.total).toLocaleString()} ج.م</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 12px;background:#fef2f2;
                border-radius:6px;border:1px solid #fee2e2;font-size:12px;margin-bottom:4px;">
                <span style="color:#dc2626;font-weight:600;">الخصم (${invoice.discountType === 'percentage' ? invoice.discountValue + '%' : 'مبلغ'})</span>
                <span style="color:#dc2626;font-weight:700;">- ${invoice.discountType === 'percentage'
                    ? ((invoice.subTotal || invoice.total) * ((invoice.discountValue || 0) / 100)).toLocaleString()
                    : (invoice.discountValue || 0).toLocaleString()} ج.م</span>
            </div>` : '';

        const itemsHtml = invoice.items.map((item, idx) => {
            const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
            return `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;font-size:11px;color:#374151;font-weight:600;">
                    ${itemCode || (idx + 1)}
                </td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">
                    <div style="font-weight:700;color:#1e293b;">${item.productName}</div>
                    ${item.description ? `<div style="font-size:10.5px;color:#64748b;margin-top:2px;">${item.description}</div>` : ''}
                </td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;">${item.quantity} ${item.unit || ''}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-family:monospace;">${item.price.toLocaleString()}</td>
                <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:700;font-family:monospace;">${item.total.toLocaleString()}</td>
            </tr>`;
        }).join('');

        const scheduleHtml = isSales && (invoice as SalesInvoice).paymentSchedule?.length ? `
            <div style="margin-top:16px;">
                <h4 style="font-size:12px;font-weight:700;color:${primaryHex};margin-bottom:6px;">جدول الدفعات (الأقساط):</h4>
                <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;">
                    <thead style="background:#f1f5f9;">
                        <tr>
                            <th style="padding:5px;text-align:center;border-bottom:1px solid #e2e8f0;">التاريخ</th>
                            <th style="padding:5px;text-align:center;border-bottom:1px solid #e2e8f0;">القيمة</th>
                            <th style="padding:5px;text-align:center;border-bottom:1px solid #e2e8f0;">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice as SalesInvoice).paymentSchedule!.map(inst => `
                            <tr>
                                <td style="padding:5px;text-align:center;border-bottom:1px solid #f1f5f9;">${inst.date}</td>
                                <td style="padding:5px;text-align:center;font-weight:700;">${inst.amount.toLocaleString()} ج.م</td>
                                <td style="padding:5px;text-align:center;color:${inst.isPaid ? '#16a34a' : '#dc2626'};font-weight:${inst.isPaid ? '700' : '400'};">
                                    ${inst.isPaid ? 'مدفوع ✓' : 'مستحق'}
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '';

        const notesHtml = invoice.notes ? `
            <div style="margin-top:12px;margin-bottom:12px;">
                <h4 style="font-size:11px;font-weight:700;color:#334155;margin-bottom:4px;">ملاحظات الفاتورة:</h4>
                <p style="color:#475569;font-size:11px;background:#f8fafc;padding:8px 12px;border-radius:6px;border:1px dashed #cbd5e1;line-height:1.5;">${invoice.notes}</p>
            </div>` : '';

        const signaturesHtml = printSettings.showSignatures && printSettings.paperSize !== 'thermal80' ? `
            <div class="signatures-row">
                <div class="sig-block">
                    <div class="sig-title">${printSettings.signature1 || 'إعداد / المحاسب'}</div>
                    <div class="sig-line"></div>
                </div>
                <div class="sig-block">
                    <div class="sig-title">${printSettings.signature2 || 'المستلم / ' + entityLabel}</div>
                    <div class="sig-line"></div>
                </div>
                <div class="sig-block">
                    <div class="sig-title">${printSettings.signature3 || 'اعتماد الإدارة'}</div>
                    <div class="sig-line"></div>
                </div>
            </div>` : '';

        const termsHtml = printSettings.footerNotes ? `
            <div style="margin-top:14px;padding:8px 12px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;font-size:10px;color:#64748b;line-height:1.5;">
                <b>الشروط والأحكام:</b> ${printSettings.footerNotes}
            </div>` : '';

        const greetingHtml = printSettings.footerGreeting ? `
            <div style="text-align:center;margin-top:12px;font-size:11px;font-weight:700;color:${primaryHex};">
                ${printSettings.footerGreeting}
            </div>` : '';

        const printContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8"/>
    <title>${title} #${invoice.id}</title>
    <style>
        ${getPrintStyles(printSettings)}
    </style>
</head>
<body>
    <!-- Top Header -->
    <table style="width:100%;margin-bottom:16px;border-bottom:2px solid ${primaryHex};padding-bottom:12px;">
        <tr>
            <td style="text-align:right;vertical-align:top;width:60%;">
                <div style="display:flex;align-items:center;gap:14px;">
                    ${logoHtml}
                    <div>
                        <h1 style="font-size:19px;font-weight:800;color:${primaryHex};margin:0 0 4px 0;line-height:1.2;">${companyInfo.name || 'جراند ميديا'}</h1>
                        ${printSettings.showCompanyDetails ? `
                            <div style="color:#64748b;font-size:11px;line-height:1.4;">
                                ${companyInfo.address ? `<div>📍 ${companyInfo.address}</div>` : ''}
                                ${companyInfo.phone ? `<div>📞 ${companyInfo.phone}</div>` : ''}
                                ${printSettings.taxNumber || companyInfo.taxNumber ? `<span>ر.ض: ${printSettings.taxNumber || companyInfo.taxNumber} </span>` : ''}
                                ${printSettings.commercialRegister || companyInfo.commercialRegister ? `<span> | س.ت: ${printSettings.commercialRegister || companyInfo.commercialRegister}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </td>
            <td style="text-align:left;vertical-align:top;width:40%;">
                <div style="margin-bottom:6px;">
                    <span style="font-size:13px;font-weight:800;background:${primaryHex};color:#ffffff;padding:4px 12px;border-radius:6px;display:inline-block;">${title}</span>
                </div>
                <div style="font-size:12px;font-weight:bold;color:#1e293b;margin-top:4px;">
                    رقم المستند: <span style="font-family:monospace;font-size:13px;">#${invoice.id}</span>
                </div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">
                    التاريخ: <span style="font-family:monospace;">${invoice.date}</span>
                </div>
            </td>
        </tr>
    </table>

    <!-- Entity Info Box -->
    <div style="background:${bgLightHex};border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr>
                <td style="text-align:right;width:65%;">
                    <span style="font-size:11px;color:#64748b;font-weight:bold;">بيانات ${entityLabel}:</span>
                    <div style="font-size:14px;font-weight:800;color:#0f172a;margin-top:2px;">${entityName}</div>
                    ${invoice.companyName ? `<div style="font-size:11px;color:#475569;">شركة: ${invoice.companyName}</div>` : ''}
                </td>
                <td style="text-align:left;width:35%;">
                    <span style="font-size:11px;color:#64748b;font-weight:bold;">طريقة السداد:</span>
                    <div style="font-size:12px;font-weight:bold;color:${primaryHex};margin-top:2px;">${invoice.paymentMethod || 'نقدي'}</div>
                </td>
            </tr>
        </table>
    </div>

    <!-- Items Table -->
    <table class="print-table">
        <thead>
            <tr>
                <th style="width:12%;text-align:center;">كود الصنف</th>
                <th style="text-align:right;">الصنف والبيان</th>
                <th style="width:12%;text-align:center;">الكمية</th>
                <th style="width:14%;text-align:center;">السعر</th>
                <th style="width:16%;text-align:center;">الإجمالي</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>

    <!-- Totals Section -->
    <div style="display:flex;justify-content:flex-end;margin-top:10px;">
        <div class="totals-box">
            ${discountHtml}
            <div class="totals-row final">
                <span>صافي المطالبة:</span>
                <span style="font-family:monospace;">${invoice.total.toLocaleString()} ج.م</span>
            </div>
        </div>
    </div>

    <!-- Payment Schedule if available -->
    ${scheduleHtml}

    <!-- Invoice Specific Notes -->
    ${notesHtml}

    <!-- Terms & Policies -->
    ${termsHtml}

    <!-- Signatures Section -->
    ${signaturesHtml}

    <!-- Footer Greeting -->
    ${greetingHtml}

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 400);
        };
    </script>
</body>
</html>`;

        return printContent;
    };

    const handlePrint = () => {
        const content = getPrintContent();
        const printWindow = window.open('', '_blank', 'width=950,height=750');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleSavePDF = async () => {
        const isElectron = window && (window as any).process && (window as any).process.type;
        if (!isElectron) {
            handlePrint();
            return;
        }
        try {
            const { ipcRenderer } = (window as any).require('electron');
            let content = getPrintContent();
            content = content.replace('window.print();', ''); 
            const result = await ipcRenderer.invoke('print-html-to-pdf', content, `Invoice_${invoice.id}.pdf`);
            if (result.success) {
                alert('تم حفظ ملف الـ PDF بنجاح!');
            } else if (!result.canceled) {
                alert('حدث خطأ أثناء الحفظ: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            handlePrint();
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex justify-center items-center p-4"
                aria-modal="true" role="dialog" onClick={onClose}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100"
                    onClick={e => e.stopPropagation()}>

                    {/* Modal Top Bar */}
                    <div className="flex justify-between items-center px-6 py-4 border-b text-white"
                        style={{ backgroundColor: primaryHex }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
                                {isSales ? '💰' : '🛒'}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    {title} #{invoice.id}
                                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-normal">
                                        مقاس الطباعة: {printSettings.paperSize.toUpperCase()}
                                    </span>
                                </h2>
                                <p className="text-xs text-white/80 mt-0.5">معاينة المستند قبل الطباعة أو التصدير</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPrintSettingsOpen(true)}
                                className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/25 flex items-center gap-1.5 transition-all"
                                title="تعديل قالب ونموذج الطباعة"
                            >
                                <span>⚙️</span>
                                <span>تنسيق الطباعة</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                            >
                                &times;
                            </button>
                        </div>
                    </div>

                    {/* Preview Content */}
                    <div className="p-8 overflow-y-auto font-sans flex-1 bg-slate-50/50" style={{ fontFamily: printSettings.fontFamily }}>

                        {/* Invoice Header */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-6">
                            <table className="w-full">
                                <tbody>
                                    <tr>
                                        <td className="text-right align-top" style={{ width: '65%', direction: 'rtl' }}>
                                            <div className="flex items-center gap-4">
                                                {printSettings.showLogo && companyInfo.logo ? (
                                                    <img
                                                        src={companyInfo.logo}
                                                        alt="Logo"
                                                        style={{
                                                            maxHeight: printSettings.logoSize === 'sm' ? '45px' : printSettings.logoSize === 'lg' ? '85px' : '65px',
                                                            maxWidth: '150px',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                ) : null}
                                                <div>
                                                    <h1 className="text-xl font-black" style={{ color: primaryHex }}>
                                                        {companyInfo.name || 'جراند ميديا'}
                                                    </h1>
                                                    {printSettings.showCompanyDetails && (
                                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                            {companyInfo.address && <p>📍 {companyInfo.address}</p>}
                                                            {companyInfo.phone && <p>📞 {companyInfo.phone}</p>}
                                                            {(printSettings.commercialRegister || companyInfo.commercialRegister) && (
                                                                <p>س.ت: {printSettings.commercialRegister || companyInfo.commercialRegister}</p>
                                                            )}
                                                            {(printSettings.taxNumber || companyInfo.taxNumber) && (
                                                                <p>ر.ض: {printSettings.taxNumber || companyInfo.taxNumber}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-left align-top" style={{ width: '35%' }}>
                                            <div>
                                                <span className="text-white text-xs font-bold px-3 py-1 rounded-md" style={{ backgroundColor: primaryHex }}>
                                                    {title}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs font-bold text-gray-700">
                                                رقم الفاتورة: <span className="font-mono text-sm text-gray-900">#{invoice.id}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                التاريخ: <span className="font-mono">{invoice.date}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Customer / Supplier Box */}
                        <div className="p-4 rounded-xl border border-gray-200 mb-6 flex justify-between items-center"
                            style={{ backgroundColor: bgLightHex }}>
                            <div>
                                <span className="text-xs font-bold text-gray-500 block mb-1">بيانات {entityLabel}:</span>
                                <span className="text-base font-bold text-gray-800">{entityName}</span>
                                {invoice.companyName && <div className="text-xs text-gray-600 mt-0.5">شركة: {invoice.companyName}</div>}
                            </div>
                            <div className="text-left">
                                <span className="text-xs font-bold text-gray-500 block mb-1">طريقة السداد:</span>
                                <span className="inline-block px-3 py-1 bg-white rounded-lg border border-gray-200 text-xs font-bold text-gray-700 shadow-sm">
                                    {invoice.paymentMethod || 'نقدي'}
                                </span>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr style={{ backgroundColor: primaryHex, color: '#ffffff' }}>
                                        <th className="p-3 text-center w-16">كود الصنف</th>
                                        <th className="p-3">الصنف / البيان</th>
                                        <th className="p-3 text-center w-24">الكمية</th>
                                        <th className="p-3 text-center w-28">السعر</th>
                                        <th className="p-3 text-center w-32">الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoice.items.map((item, index) => {
                                        const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
                                        return (
                                            <tr key={index} className="hover:bg-gray-50/70">
                                                <td className="p-3 text-center font-mono text-gray-500 font-semibold">{itemCode || (index + 1)}</td>
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-800">{item.productName}</div>
                                                    {item.description && <div className="text-gray-400 text-[11px] mt-0.5">{item.description}</div>}
                                                </td>
                                                <td className="p-3 text-center font-mono">{item.quantity} {item.unit || ''}</td>
                                                <td className="p-3 text-center font-mono">{item.price.toLocaleString()}</td>
                                                <td className="p-3 text-center font-mono font-bold text-gray-900">{item.total.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Schedule if exists */}
                        {isSales && (invoice as SalesInvoice).paymentSchedule && (invoice as SalesInvoice).paymentSchedule!.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                                <h4 className="text-xs font-bold text-gray-700 mb-2">جدول سداد الأقساط:</h4>
                                <table className="w-full text-xs text-center border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="p-2 border">التاريخ</th>
                                            <th className="p-2 border">القيمة</th>
                                            <th className="p-2 border">الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(invoice as SalesInvoice).paymentSchedule!.map((inst, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="p-2 font-mono">{inst.date}</td>
                                                <td className="p-2 font-mono font-bold">{inst.amount.toLocaleString()} ج.م</td>
                                                <td className="p-2">
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${inst.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {inst.isPaid ? 'مدفوع' : 'مستحق'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Totals Box */}
                        <div className="flex justify-end mb-6">
                            <div className="w-72 space-y-2">
                                {(invoice.discountValue && invoice.discountValue > 0) && (
                                    <>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-gray-50 rounded-lg border text-xs">
                                            <span className="text-gray-600 font-semibold">المجموع الفرعي:</span>
                                            <span className="font-bold text-gray-800 font-mono">{(invoice.subTotal || invoice.total).toLocaleString()} ج.م</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-red-50 rounded-lg border border-red-100 text-xs">
                                            <span className="text-red-600 font-semibold">الخصم ({invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'مبلغ'}):</span>
                                            <span className="font-bold text-red-600 font-mono">
                                                {invoice.discountType === 'percentage'
                                                    ? `- ${((invoice.subTotal || invoice.total) * ((invoice.discountValue || 0) / 100)).toLocaleString()}`
                                                    : `- ${(invoice.discountValue || 0).toLocaleString()}`} ج.م
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div
                                    className="flex justify-between items-center p-3.5 text-white rounded-xl shadow-md"
                                    style={{ backgroundColor: primaryHex }}
                                >
                                    <span className="font-bold text-sm">صافي المطالبة:</span>
                                    <span className="font-bold text-lg font-mono">{invoice.total.toLocaleString()} ج.م</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes & Terms */}
                        {printSettings.footerNotes && (
                            <div className="p-3 bg-white rounded-xl border border-dashed border-gray-300 text-xs text-gray-500 mb-6">
                                <b className="text-gray-700">الشروط والأحكام:</b> {printSettings.footerNotes}
                            </div>
                        )}

                        {/* Signatures */}
                        {printSettings.showSignatures && (
                            <div className="mt-8 flex justify-between px-6 text-xs text-gray-600">
                                <div className="text-center">
                                    <p className="font-bold mb-6">{printSettings.signature1 || 'إعداد / المحاسب'}</p>
                                    <div className="border-t border-dashed border-gray-400 w-36"></div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold mb-6">{printSettings.signature2 || 'المستلم / ' + entityLabel}</p>
                                    <div className="border-t border-dashed border-gray-400 w-36"></div>
                                </div>
                                <div className="text-center">
                                    <p className="font-bold mb-6">{printSettings.signature3 || 'اعتماد الإدارة'}</p>
                                    <div className="border-t border-dashed border-gray-400 w-36"></div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap justify-between items-center p-4 border-t bg-gray-50 gap-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPrintSettingsOpen(true)}
                                className="bg-white hover:bg-gray-100 text-indigo-700 font-bold py-2 px-3.5 rounded-xl border border-indigo-200 text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                                <span>⚙️</span>
                                <span>تعديل تنسيق الطباعة</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={onClose}
                                className="bg-white text-gray-700 font-bold py-2 px-4 rounded-xl border hover:bg-gray-100 text-xs transition-colors"
                            >
                                إغلاق
                            </button>

                            <button
                                onClick={() => {
                                    const message = `*${title}* رقم #${invoice.id}\nالطرف: ${entityName}\nالتاريخ: ${invoice.date}\nالإجمالي: ${invoice.total.toLocaleString()} ج.م`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl hover:bg-emerald-700 flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                            >
                                <span>💬</span>
                                <span>واتساب</span>
                            </button>

                            <button
                                onClick={handleSavePDF}
                                className="bg-slate-800 text-white font-bold py-2 px-4 rounded-xl hover:bg-slate-900 flex items-center gap-1.5 text-xs transition-colors shadow-sm"
                            >
                                <span>📥</span>
                                <span>حفظ PDF</span>
                            </button>

                            <button
                                onClick={handlePrint}
                                className="text-white font-bold py-2 px-5 rounded-xl flex items-center gap-1.5 text-xs transition-all shadow-md active:scale-95"
                                style={{ backgroundColor: primaryHex }}
                            >
                                <span>🖨️</span>
                                <span>طباعة فورية</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print Settings Modal */}
            {isPrintSettingsOpen && (
                <PrintSettingsModal onClose={() => setIsPrintSettingsOpen(false)} />
            )}
        </>
    );
};

export default InvoicePreviewModal;
