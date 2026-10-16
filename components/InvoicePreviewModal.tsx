import React, { useEffect, useCallback } from 'react';
import type { SalesInvoice, PurchaseInvoice, CompanyInfo } from '../types.ts';

interface InvoicePreviewModalProps {
    onClose: () => void;
    invoice: SalesInvoice | PurchaseInvoice;
    type: 'sales' | 'purchase';
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ onClose, invoice, type }) => {
    const handleEsc = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
    }, [onClose]);

    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
        ? JSON.parse(companyInfoString)
        : { name: 'Ø´Ø±ÙƒØªÙƒ', address: 'Ø¹Ù†ÙˆØ§Ù†Ùƒ', phone: 'Ù‡Ø§ØªÙÙƒ', logo: '' };

    useEffect(() => {
        window.addEventListener('keydown', handleEsc);
        return () => { window.removeEventListener('keydown', handleEsc); };
    }, [handleEsc]);

    const isSales = type === 'sales';
    const entityName = isSales ? (invoice as SalesInvoice).customerName : (invoice as PurchaseInvoice).supplierName;
    const entityLabel = isSales ? 'Ø§Ù„Ø¹Ù…ÙŠÙ„' : 'Ø§Ù„Ù…ÙˆØ±Ø¯';
    const title = isSales ? 'ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª' : 'ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª';
    const headerColor = isSales ? 'bg-blue-600' : 'bg-green-600';
    const borderColor = isSales ? 'border-blue-600' : 'border-green-600';
    const textColor = isSales ? 'text-blue-700' : 'text-green-700';
    const bgColor = isSales ? 'bg-blue-50' : 'bg-green-50';
    const textDark = isSales ? 'text-blue-800' : 'text-green-800';
    const headerHex = isSales ? '#2563eb' : '#16a34a';
    const bgHex = isSales ? '#eff6ff' : '#f0fdf4';
    const textHex = isSales ? '#1d4ed8' : '#15803d';
    const darkHex = isSales ? '#1e3a8a' : '#14532d';

    // ===== Open dedicated print window (logo renders correctly in PDF) =====
    const getPrintContent = () => {
        const logoHtml = companyInfo.logo
            ? `<img src="${companyInfo.logo}" alt="Logo" onload="window.logoLoaded = true;"
                 style="width:150px;height:auto;max-height:100px;display:block;object-fit:contain;" />`
            : `<div style="width:72px;height:72px;border-radius:8px;background:${headerHex};display:flex;
                 align-items:center;justify-content:center;color:white;font-size:2rem;font-weight:bold;">
                 ${companyInfo.name.charAt(0)}
               </div>`;

        const discountHtml = (invoice.discountValue && invoice.discountValue > 0) ? `
            <div style="display:flex;justify-content:space-between;padding:6px 12px;background:#f9fafb;
                border-radius:6px;border:1px solid #e5e7eb;font-size:13px;margin-bottom:4px;">
                <span style="color:#4b5563;font-weight:600;">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ</span>
                <span style="font-weight:700;">${(invoice.subTotal || invoice.total).toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 12px;background:#fef2f2;
                border-radius:6px;border:1px solid #fee2e2;font-size:13px;margin-bottom:4px;">
                <span style="color:#dc2626;font-weight:600;">Ø§Ù„Ø®ØµÙ… (${invoice.discountType === 'percentage' ? invoice.discountValue + '%' : 'Ù…Ø¨Ù„Øº'})</span>
                <span style="color:#dc2626;font-weight:700;">- ${invoice.discountType === 'percentage'
                    ? ((invoice.subTotal || invoice.total) * ((invoice.discountValue || 0) / 100)).toLocaleString()
                    : (invoice.discountValue || 0).toLocaleString()}</span>
            </div>` : '';

        const itemsHtml = invoice.items.map((item, idx) => {
            const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
            return `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace;font-size:12px;color:#374151;font-weight:600;">
                    ${itemCode || '-'}
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">
                    <div style="font-weight:700;color:#1f2937;">${item.productName}</div>
                    ${item.description ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${item.description}</div>` : ''}
                </td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity} ${item.unit || ''}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.price.toLocaleString()}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${item.total.toLocaleString()}</td>
            </tr>`;
        }).join('');

        const scheduleHtml = isSales && (invoice as SalesInvoice).paymentSchedule?.length ? `
            <div style="margin-top:16px;">
                <h4 style="font-size:13px;font-weight:700;color:${darkHex};margin-bottom:8px;">Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¯ÙØ¹Ø§Øª (Ø§Ù„Ø£Ù‚Ø³Ø§Ø·):</h4>
                <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb;">
                    <thead style="background:#f3f4f6;">
                        <tr>
                            <th style="padding:6px;text-align:center;border-bottom:1px solid #e5e7eb;">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                            <th style="padding:6px;text-align:center;border-bottom:1px solid #e5e7eb;">Ø§Ù„Ù‚ÙŠÙ…Ø©</th>
                            <th style="padding:6px;text-align:center;border-bottom:1px solid #e5e7eb;">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice as SalesInvoice).paymentSchedule!.map(inst => `
                            <tr>
                                <td style="padding:6px;text-align:center;border-bottom:1px solid #f3f4f6;">${inst.date}</td>
                                <td style="padding:6px;text-align:center;font-weight:700;">${inst.amount.toLocaleString()}</td>
                                <td style="padding:6px;text-align:center;color:${inst.isPaid ? '#16a34a' : '#dc2626'};font-weight:${inst.isPaid ? '700' : '400'};">
                                    ${inst.isPaid ? 'Ù…Ø¯ÙÙˆØ¹ âœ“' : 'Ù…Ø³ØªØ­Ù‚'}
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '';

        const notesHtml = invoice.notes ? `
            <div style="margin-bottom:16px;">
                <h4 style="font-size:13px;font-weight:700;color:#374151;margin-bottom:6px;text-decoration:underline;">Ù…Ù„Ø§Ø­Ø¸Ø§Øª:</h4>
                <p style="color:#4b5563;font-size:13px;background:#f9fafb;padding:12px;border-radius:8px;line-height:1.6;">${invoice.notes}</p>
            </div>` : '';

        const printContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8"/>
    <title>${title} #${invoice.id}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl;
               background: white; color: #1f2937; padding: 32px; font-size: 14px; line-height: 1.5; }
        img { display: block; }
        @media print { @page { size: A4; margin: 1.5cm; } body { padding: 0; } }
    </style>
</head>
<body>
    <table style="width:100%;margin-bottom:24px;border-bottom:3px solid ${headerHex};padding-bottom:16px;">
        <tr>
            <td style="text-align:right;vertical-align:middle;width:65%;">
                <div style="display:flex;align-items:center;gap:16px;">
                    ${logoHtml}
                    <div>
                        <h1 style="font-size:22px;font-weight:700;color:${textHex};margin-bottom:4px;">${companyInfo.name}</h1>
                        ${companyInfo.address ? `<p style="color:#6b7280;font-size:12px;margin-bottom:2px;">${companyInfo.address}</p>` : ''}
                        ${companyInfo.phone ? `<p style="color:#6b7280;font-size:12px;">${companyInfo.phone}</p>` : ''}
                        ${(companyInfo as any).email ? `<p style="color:#6b7280;font-size:12px;">${(companyInfo as any).email}</p>` : ''}
                        ${(companyInfo as any).taxNumber ? `<p style="color:#6b7280;font-size:12px;">Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ø¶Ø±ÙŠØ¨ÙŠ: ${(companyInfo as any).taxNumber}</p>` : ''}
                    </div>
                </div>
            </td>
            <td style="text-align:left;vertical-align:middle;width:35%;">
                <div style="margin-bottom:10px;">
                    <span style="display:block;color:#6b7280;font-size:11px;font-weight:600;margin-bottom:4px;">Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©</span>
                    <span style="font-weight:700;font-size:18px;padding:4px 10px;background:${bgHex};color:${darkHex};border-radius:6px;border:1px solid ${headerHex};">#${invoice.id}</span>
                </div>
                <div>
                    <span style="display:block;color:#6b7280;font-size:11px;font-weight:600;margin-bottom:4px;">Ø§Ù„ØªØ§Ø±ÙŠØ®</span>
                    <span style="font-weight:700;color:#374151;">${invoice.date}</span>
                </div>
            </td>
        </tr>
    </table>

    <div style="background:${headerHex};color:white;text-align:center;padding:10px;border-radius:8px;
         margin-bottom:20px;font-size:18px;font-weight:700;letter-spacing:1px;">${title}</div>

    <div style="background:${bgHex};border:1px solid ${headerHex};border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <span style="display:block;font-size:13px;font-weight:700;color:${darkHex};margin-bottom:4px;">Ø¨ÙŠØ§Ù†Ø§Øª ${entityLabel}:</span>
                <span style="font-size:16px;font-weight:700;color:#1f2937;">${entityName}</span>
                ${invoice.companyName ? `<div style="font-size:13px;color:#4b5563;margin-top:2px;">Ø´Ø±ÙƒØ©: ${invoice.companyName}</div>` : ''}
            </div>
            <div>
                <span style="display:block;font-size:12px;font-weight:700;color:${darkHex};margin-bottom:4px;">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹:</span>
                <span style="display:inline-block;padding:4px 12px;background:white;border-radius:20px;border:1px solid #e5e7eb;font-size:12px;">${invoice.paymentMethod}</span>
            </div>
        </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e5e7eb;">
        <thead>
            <tr style="background:${headerHex};color:white;">
                <th style="padding:12px;text-align:center;font-weight:600;width:15%;">كود الصنف</th>
                <th style="padding:12px;text-align:right;font-weight:600;">الصنف</th>
                <th style="padding:12px;text-align:center;font-weight:600;width:12%;">الكمية</th>
                <th style="padding:12px;text-align:center;font-weight:600;width:15%;">السعر</th>
                <th style="padding:12px;text-align:center;font-weight:600;width:18%;">الإجمالي</th>
            </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
    </table>

    <table style="width:100%;margin-bottom:32px;">
        <tr>
            <td style="width:55%;vertical-align:top;padding-left:16px;">
                ${notesHtml}${scheduleHtml}
            </td>
            <td style="width:45%;vertical-align:top;">
                <div style="float:left;width:260px;">
                    ${discountHtml}
                    <div style="display:flex;justify-content:space-between;align-items:center;
                         padding:14px 16px;background:${headerHex};color:white;border-radius:10px;
                         box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                        <span style="font-weight:700;font-size:16px;">ØµØ§ÙÙŠ Ø§Ù„Ù…Ø·Ø§Ù„Ø¨Ø©</span>
                        <span style="font-weight:700;font-size:18px;">${invoice.total.toLocaleString()} Ø¬.Ù…</span>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <div style="margin-top:48px;display:flex;justify-content:space-between;padding:0 32px;">
        <div style="text-align:center;">
            <p style="font-weight:700;margin-bottom:16px;font-size:13px;">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙ„Ù…</p>
            <div style="border-top:1px solid #d1d5db;width:160px;margin:0 auto;"></div>
        </div>
        <div style="text-align:center;">
            <p style="font-weight:700;margin-bottom:16px;font-size:13px;">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø§Ù„ÙŠ / Ø§Ù„Ø®ØªÙ…</p>
            <div style="border-top:1px solid #d1d5db;width:160px;margin:0 auto;"></div>
        </div>
    </div>

    <div style="margin-top:32px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;">
        ØªÙ… Ø¥ØµØ¯Ø§Ø± Ù‡Ø°Ù‡ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø¢Ù„ÙŠØ§Ù‹ Ø¨ÙˆØ§Ø³Ø·Ø© Ù†Ø¸Ø§Ù… ${companyInfo.name} Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ÙˆØ§Ø±Ø¯.
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.focus();
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;

                return printContent;
    };

    const handlePrint = () => {
        const content = getPrintContent();
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة للطباعة.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(content);
        printWindow.document.close();
    };

    const handleSavePDF = async () => {
        const isElectron = window && window.process && window.process.type;
        if (!isElectron) {
            alert('هذه الميزة متاحة فقط في نسخة سطح المكتب.');
            return;
        }
        try {
            const { ipcRenderer } = window.require('electron');
            let content = getPrintContent();
            content = content.replace('window.print();', ''); 
            const result = await ipcRenderer.invoke('print-html-to-pdf', content, Invoice.pdf);
            if (result.success) {
                alert('تم حفظ ملف الـ PDF بنجاح!');
            } else if (!result.canceled) {
                alert('حدث خطأ أثناء الحفظ: ' + result.error);
            }
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء الاتصال بالنظام לחفظ الـ PDF.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4"
            aria-modal="true" role="dialog" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`flex justify-between items-center p-4 border-b ${headerColor} text-white rounded-t-lg`}>
                    <h2 className="text-xl font-bold">{title} #{invoice.id}</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-3xl font-light leading-none">&times;</button>
                </div>

                {/* Preview Content */}
                <div className="p-8 overflow-y-auto font-sans flex-1">

                    {/* Invoice Header */}
                    <table className="w-full mb-8 border-b pb-4">
                        <tbody>
                            <tr>
                                <td className="text-right align-top" style={{ width: '70%', direction: 'rtl' }}>
                                    <div className="flex items-center gap-4">
                                        {companyInfo.logo ? (
                                            <img src={companyInfo.logo} alt="Logo"
                                                style={{ width: '150px', height: 'auto', maxHeight: '100px', display: 'block', objectFit: 'contain' }} />
                                        ) : (
                                            <div className={`w-20 h-20 rounded-lg ${headerColor} flex items-center justify-center text-white font-bold text-3xl`}>
                                                {companyInfo.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <h1 className={`text-2xl font-bold ${textColor} mb-1`}>{companyInfo.name}</h1>
                                            <p className="text-gray-500 text-xs">{companyInfo.address}</p>
                                            <p className="text-gray-500 text-xs">{companyInfo.phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-left align-top" style={{ width: '30%' }}>
                                    <div className="mb-2 text-left">
                                        <span className="text-gray-500 text-xs block font-bold mb-1">Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©</span>
                                        <span className={`font-bold text-xl px-2 py-1 ${isSales ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'} rounded border border-current`}>#{invoice.id}</span>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-gray-500 text-xs block font-bold mb-1">Ø§Ù„ØªØ§Ø±ÙŠØ®</span>
                                        <span className="font-bold text-gray-700">{invoice.date}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Entity Info */}
                    <div className={`${bgColor} p-4 rounded-lg mb-6 border ${borderColor}`}>
                        <div className="flex justify-between">
                            <div>
                                <span className={`block text-sm font-bold ${textDark}`}>Ø¨ÙŠØ§Ù†Ø§Øª {entityLabel}:</span>
                                <span className="text-lg font-bold text-gray-800">{entityName}</span>
                                {invoice.companyName && <div className="text-sm text-gray-600">Ø´Ø±ÙƒØ©: {invoice.companyName}</div>}
                            </div>
                            <div className="text-left text-xs">
                                <span className={`block font-bold ${textDark}`}>Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹:</span>
                                <span className="inline-block px-3 py-0.5 rounded-full bg-white border text-xs font-medium">{invoice.paymentMethod}</span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-right mb-6 border-collapse">
                        <thead>
                            <tr className={`${bgColor} ${textDark}`}>
                                <th className="p-3 border-b border-t font-semibold text-center w-[15%]">كود الصنف</th>
                                <th className="p-3 border-b border-t font-semibold">الصنف</th>
                                <th className="p-3 border-b border-t font-semibold text-center w-[12%]">الكمية</th>
                                <th className="p-3 border-b border-t font-semibold text-center w-[15%]">السعر</th>
                                <th className="p-3 border-b border-t font-semibold text-center w-[18%]">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, idx) => {
                                const itemCode = item.productCode || item.sku || (item.productId && !item.productId.startsWith('MANUAL') ? item.productId : '');
                                return (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="p-3 text-center font-mono text-xs text-gray-700 font-semibold">
                                        {itemCode || '-'}
                                    </td>
                                    <td className="p-3">
                                        <div className="font-bold text-gray-800">{item.productName}</div>
                                        {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                                    </td>
                                    <td className="p-3 text-center">{item.quantity} {item.unit || ''}</td>
                                    <td className="p-3 text-center">{item.price.toLocaleString()}</td>
                                    <td className="p-3 text-center font-bold">{item.total.toLocaleString()}</td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="mb-4">
                            <h4 className="text-sm font-bold text-gray-700 mb-1 underline">Ù…Ù„Ø§Ø­Ø¸Ø§Øª:</h4>
                            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded leading-relaxed">{invoice.notes}</p>
                        </div>
                    )}

                    {/* Payment Schedule */}
                    {isSales && (invoice as SalesInvoice).paymentSchedule && (invoice as SalesInvoice).paymentSchedule!.length > 0 && (
                        <div className="mb-6">
                            <h4 className={`text-sm font-bold ${textDark} mb-2`}>Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø¯ÙØ¹Ø§Øª (Ø§Ù„Ø£Ù‚Ø³Ø§Ø·):</h4>
                            <div className="border rounded-lg overflow-hidden text-xs">
                                <table className="w-full">
                                    <thead className="bg-gray-50 font-bold">
                                        <tr>
                                            <th className="p-1 border-b text-center">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                                            <th className="p-1 border-b text-center">Ø§Ù„Ù‚ÙŠÙ…Ø©</th>
                                            <th className="p-1 border-b text-center">Ø§Ù„Ø­Ø§Ù„Ø©</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(invoice as SalesInvoice).paymentSchedule!.map((inst, i) => (
                                            <tr key={i} className="border-b">
                                                <td className="p-1 text-center">{inst.date}</td>
                                                <td className="p-1 text-center font-bold">{inst.amount.toLocaleString()}</td>
                                                <td className="p-1 text-center">
                                                    <span className={inst.isPaid ? 'text-green-600 font-bold' : 'text-red-600'}>{inst.isPaid ? 'Ù…Ø¯ÙÙˆØ¹' : 'Ù…Ø³ØªØ­Ù‚'}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="flex justify-end mb-8">
                        <div className="w-64 space-y-2">
                            {(invoice.discountValue && invoice.discountValue > 0) && (
                                <>
                                    <div className="flex justify-between items-center py-1 px-3 bg-gray-50 rounded-md border text-xs">
                                        <span className="text-gray-600 font-semibold">Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ</span>
                                        <span className="font-bold text-gray-800">{(invoice.subTotal || invoice.total).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 px-3 bg-red-50 rounded-md border border-red-100 text-xs">
                                        <span className="text-red-600 font-semibold">Ø§Ù„Ø®ØµÙ… ({invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Ù…Ø¨Ù„Øº'})</span>
                                        <span className="font-bold text-red-600">
                                            {invoice.discountType === 'percentage'
                                                ? `- ${((invoice.subTotal || invoice.total) * ((invoice.discountValue || 0) / 100)).toLocaleString()}`
                                                : `- ${(invoice.discountValue || 0).toLocaleString()}`}
                                        </span>
                                    </div>
                                </>
                            )}
                            <div className={`flex justify-between items-center p-3 ${headerColor} text-white rounded-lg shadow-md`}>
                                <span className="font-bold text-lg">ØµØ§ÙÙŠ Ø§Ù„Ù…Ø·Ø§Ù„Ø¨Ø©</span>
                                <span className="font-bold text-xl">{invoice.total.toLocaleString()} Ø¬.Ù…</span>
                            </div>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-12 flex justify-between px-8 text-sm">
                        <div className="text-center">
                            <p className="font-bold mb-4">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø³ØªÙ„Ù…</p>
                            <div style={{ borderTop: '1px solid #ccc', width: '150px', display: 'inline-block', marginTop: '10px' }}></div>
                        </div>
                        <div className="text-center">
                            <p className="font-bold mb-4">ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…ÙˆØ¸Ù Ø§Ù„Ù…Ø§Ù„ÙŠ / Ø§Ù„Ø®ØªÙ…</p>
                            <div style={{ borderTop: '1px solid #ccc', width: '150px', display: 'inline-block', marginTop: '10px' }}></div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end items-center p-4 border-t bg-gray-50 gap-2 rounded-b-lg">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-6 rounded-lg border hover:bg-gray-100">Ø¥ØºÙ„Ø§Ù‚</button>
                    <button
                        onClick={() => {
                            const message = `*${title}* Ø±Ù‚Ù… #${invoice.id}\nØ§Ù„Ø¹Ù…ÙŠÙ„/Ø§Ù„Ù…ÙˆØ±Ø¯: ${entityName}\nØ§Ù„ØªØ§Ø±ÙŠØ®: ${invoice.date}\nØ§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${invoice.total.toLocaleString()} Ø¬.Ù…`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <span>Ù…Ø´Ø§Ø±ÙƒØ© ÙˆØ§ØªØ³Ø§Ø¨</span>
                    </button>
                                        <button
                        onClick={handleSavePDF}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 flex items-center gap-2"
                        title="حفظ كـ PDF (نسخة سطح المكتب فقط)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>حفظ PDF</span>
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Ø·Ø¨Ø§Ø¹Ø© / PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;

