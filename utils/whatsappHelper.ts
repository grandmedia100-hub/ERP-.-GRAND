// WhatsApp Message Formatter and Sender for MediaHive ERP

import type { SalesInvoice, Customer, Supplier } from '../types';

/**
 * Clean and standardize phone number for WhatsApp international URL
 */
export function sanitizePhoneNumber(phone: string): string {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean) return '';

    // Egyptian mobile standard (010, 011, 012, 015)
    if (clean.startsWith('01') && clean.length === 11) {
        clean = '2' + clean;
    } else if (clean.startsWith('1') && clean.length === 10) {
        clean = '20' + clean;
    }

    return clean;
}

export function openWhatsAppWithMessage(phone: string, text: string): boolean {
    const cleanPhone = sanitizePhoneNumber(phone);
    if (!cleanPhone) {
        alert('عفواً: رقم الهاتف غير مسجل أو غير صحيح لإرسال الرسالة عبر واتساب.');
        return false;
    }

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    return true;
}

/**
 * Generate formatted WhatsApp message for a Sales Invoice
 */
export function generateInvoiceWhatsAppText(invoice: SalesInvoice, companyName = 'جراند ميديا للطباعة والتغليف'): string {
    const isReturn = invoice.invoiceType === 'return';
    const total = Number(invoice.total || 0).toLocaleString('ar-EG');
    const date = invoice.date;

    const itemsText = (invoice.items || [])
        .map((item, idx) => `  ${idx + 1}. *${item.productName}* (${item.quantity} × ${Number(item.price || 0).toLocaleString('ar-EG')} ج.م) = ${Number(item.total || 0).toLocaleString('ar-EG')} ج.م`)
        .join('\n');

    const paymentInfo = invoice.paymentMethod === 'نقدي' 
        ? '✅ مسددة بالكامل (نقداً)' 
        : `⏳ طريقة السداد: ${invoice.paymentMethod}`;

    let msg = `*${companyName}*\n`;
    msg += `📄 *${isReturn ? 'إشعار مرتجع مبيعات' : 'فاتورة مبيعات رقم #' + invoice.id}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *العميل:* ${invoice.customerName}\n`;
    msg += `📅 *التاريخ:* ${date}\n`;
    msg += `💳 *حالة السداد:* ${paymentInfo}\n\n`;

    if (itemsText) {
        msg += `📋 *تفاصيل البنود والكميات:*\n${itemsText}\n\n`;
    }

    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *إجمالي الفاتورة:* *${total} ج.م*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    msg += `💳 *طرق الدفع والتحويل البنكي:*\n`;
    msg += `• البنك الأهلي المصري: 12345678901234\n`;
    msg += `• بنك مصر: 98765432109876\n`;
    msg += `• فودافون كاش / إنستاباي: 01000000000\n\n`;

    msg += `نشكركم لثقتكم ويسعدنا دائماً خدمتكم. ✨`;

    return msg;
}

/**
 * Generate formatted WhatsApp message for a Customer Account Statement
 */
export function generateCustomerStatementWhatsAppText(
    customer: Customer,
    stats: {
        openingBalance: number;
        totalSales: number;
        totalPaid: number;
        closingBalance: number;
        openInvoicesCount?: number;
    },
    companyName = 'جراند ميديا للطباعة والتغليف'
): string {
    const balance = stats.closingBalance;
    const isCredit = balance > 0;

    let msg = `*${companyName}*\n`;
    msg += `📑 *كشف حساب مالي رسمي*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *السادة:* ${customer.companyName ? `${customer.companyName} (${customer.name})` : customer.name}\n`;
    msg += `📅 *تاريخ الاستخراج:* ${new Date().toLocaleDateString('ar-EG')}\n\n`;

    msg += `📊 *ملخص الحركة المالية:*\n`;
    msg += `• الرصيد الافتتاحي: ${stats.openingBalance.toLocaleString('ar-EG')} ج.م\n`;
    msg += `• إجمالي المبيعات: ${stats.totalSales.toLocaleString('ar-EG')} ج.م\n`;
    msg += `• إجمالي المدفوعات والتحصيلات: ${stats.totalPaid.toLocaleString('ar-EG')} ج.م\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `⚖️ *صافي الرصيد الحالي:* *${Math.abs(balance).toLocaleString('ar-EG')} ج.م* ${isCredit ? '(مستحق عليكم)' : '(رصيد دائن لكم)'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (isCredit) {
        msg += `يرجى التكرم بمطابقة الرصيد وترتيب السداد في أقرب وقت.\n\n`;
        msg += `💳 *الحسابات المتاحة للتحويل:*\n`;
        msg += `• تحويل بنكي / إنستاباي / فودافون كاش.\n\n`;
    }

    msg += `شاكرين حسن تعاونكم الدائم معنا. 🌸`;

    return msg;
}
