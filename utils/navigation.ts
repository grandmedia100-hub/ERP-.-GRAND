import type { Page } from '../types.ts';

export const PAGE_TITLES: Record<Page, string> = {
    dashboard: 'لوحة التحكم الرئيسية',
    sales: 'فواتير ومرتجعات المبيعات',
    quotations: 'عروض الأسعار',
    purchaseRequests: 'طلبات الشراء (PR)',
    purchaseOrders: 'أوامر الشراء (PO)',
    purchases: 'فواتير المشتريات',
    purchaseReturns: 'مرتجعات المشتريات (إشعارات الخصم)',
    inventory: 'إدارة المخزون والأصناف',
    warehouse: 'إدارة المستودعات والجرد',
    manufacturing: 'تصنيع الكرتون والتشغيل الداخلي',
    printingJobs: 'أوامر تشغيل المطبوعات والتوريدات',
    customers: 'حسابات العملاء والتحصيلات',
    suppliers: 'حسابات الموردين والمدفوعات',
    treasury: 'الخزينة والمصارف',
    reports: 'التقارير والقوائم المالية',
    journalEntries: 'القيود اليومية',
    chartOfAccounts: 'دليل الحسابات',
    fixedAssets: 'الأصول الثابتة والإهلاك',
    settings: 'الإعدادات العامة والشركة',
    accountingSettings: 'إعدادات التوجيه المحاسبي',
    users: 'المستخدمين والصلاحيات',
    backup: 'النسخ الاحتياطي والأمان',
    auditLog: 'سجل العمليات والرقابة',
};

/**
 * Builds a reliable, portable URL to open any page in current or new window/tab
 */
export const getPageUrl = (page: Page): string => {
    try {
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        url.hash = '';
        return url.toString();
    } catch {
        return `?page=${page}`;
    }
};

/**
 * Safely parses the target page from URL search params or hash
 */
export const getInitialPageFromUrl = (): Page => {
    try {
        // 1. Check URL search query (?page=...)
        const searchParams = new URLSearchParams(window.location.search);
        const pageParam = searchParams.get('page') as Page;
        if (pageParam && PAGE_TITLES[pageParam]) {
            return pageParam;
        }

        // 2. Check hash (#/sales, #sales, #?page=sales, etc.)
        if (window.location.hash) {
            const rawHash = window.location.hash;
            if (rawHash.includes('page=')) {
                const cleanQuery = rawHash.replace(/^#\??\/?/, '');
                const hashParams = new URLSearchParams(cleanQuery);
                const hp = hashParams.get('page') as Page;
                if (hp && PAGE_TITLES[hp]) return hp;
            }
            const clean = rawHash.replace(/^#[/?]*/, '').split('?')[0].split('/')[0] as Page;
            if (clean && PAGE_TITLES[clean]) return clean;
        }
    } catch (e) {
        console.error('Error resolving initial page from URL:', e);
    }
    return 'dashboard';
};

/**
 * Open a page in a new window/tab safely without getting blocked by popup blockers
 */
export const openPageInNewWindow = (page: Page, e?: React.MouseEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const targetUrl = getPageUrl(page);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
};
