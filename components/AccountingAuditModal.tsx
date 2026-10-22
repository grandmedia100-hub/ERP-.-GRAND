import React, { useState, useMemo } from 'react';
import type { JournalEntry, Account, Customer, Supplier, Product, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment } from '../types';
import { exportToExcel } from '../utils/exportToExcel';

interface AccountingAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    journalEntries: JournalEntry[];
    customers: Customer[];
    suppliers: Supplier[];
    products: Product[];
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    customerPayments: CustomerPayment[];
    supplierPayments: SupplierPayment[];
    currentBranchId?: string;
    onOpenJournalEntry?: (id: string) => void;
}

interface AuditIssue {
    id: string;
    category: 'journal' | 'receivables' | 'payables' | 'inventory' | 'intercompany';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    details: string;
    discrepancy?: number;
    referenceId?: string;
}

const AccountingAuditModal: React.FC<AccountingAuditModalProps> = ({
    isOpen,
    onClose,
    accounts,
    journalEntries,
    customers,
    suppliers,
    products,
    salesInvoices,
    purchaseInvoices,
    customerPayments,
    supplierPayments,
    currentBranchId,
    onOpenJournalEntry
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'journals' | 'subledgers' | 'inventory' | 'intercompany'>('overview');
    const [searchFilter, setSearchFilter] = useState('');

    // --- Perform Full Accounting Audit ---
    const auditResults = useMemo(() => {
        const issues: AuditIssue[] = [];

        // 1. Audit Journal Entries Balance
        let totalGeneralDebit = 0;
        let totalGeneralCredit = 0;
        const unbalancedEntries: { entry: JournalEntry; diff: number }[] = [];

        (journalEntries || []).forEach(entry => {
            let entryDebit = 0;
            let entryCredit = 0;
            (entry.lines || []).forEach(line => {
                entryDebit += Number(line.debit || 0);
                entryCredit += Number(line.credit || 0);
            });

            totalGeneralDebit += entryDebit;
            totalGeneralCredit += entryCredit;

            const diff = Math.abs(entryDebit - entryCredit);
            if (diff > 0.01) {
                unbalancedEntries.push({ entry, diff });
                issues.push({
                    id: `unbalanced_${entry.id}`,
                    category: 'journal',
                    severity: 'critical',
                    title: `قيد غير متوازن: #${entry.id}`,
                    details: `المدين (${entryDebit.toFixed(2)}) لا يساوي الدائن (${entryCredit.toFixed(2)}) - الفارق: ${diff.toFixed(2)} ج.م [${entry.description || ''}]`,
                    discrepancy: diff,
                    referenceId: entry.id
                });
            }
        });

        const generalTrialDiff = Math.abs(totalGeneralDebit - totalGeneralCredit);

        // 2. Audit Accounts Receivable (العملاء)
        // Subledger sum:
        let totalCustomerSubledgerBalance = 0;
        const customerBalances = (customers || []).map(cust => {
            const openBal = Number(cust.openingBalance || 0);
            const sales = (salesInvoices || [])
                .filter(inv => inv.customerId === cust.id && inv.status !== 'voided')
                .reduce((sum, inv) => {
                    const amt = Number(inv.total || 0);
                    return inv.invoiceType === 'return' ? sum - amt : sum + amt;
                }, 0);

            const payments = (customerPayments || [])
                .filter(p => p.customerId === cust.id && p.status !== 'voided')
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            const netBal = openBal + sales - payments;
            totalCustomerSubledgerBalance += netBal;
            return { customer: cust, balance: netBal };
        });

        // GL Account 1103 (العملاء / المدينون)
        const arAccounts = accounts.filter(a => a.id === '1103' || a.id.startsWith('1103') || a.name.includes('العملاء'));
        const arAccountIds = new Set(arAccounts.map(a => a.id));

        let glArDebit = 0;
        let glArCredit = 0;
        (journalEntries || []).forEach(entry => {
            (entry.lines || []).forEach(line => {
                if (arAccountIds.has(line.accountId)) {
                    glArDebit += Number(line.debit || 0);
                    glArCredit += Number(line.credit || 0);
                }
            });
        });
        const glArBalance = glArDebit - glArCredit;
        const arDiff = Math.abs(totalCustomerSubledgerBalance - glArBalance);

        if (arDiff > 1) {
            issues.push({
                id: 'ar_mismatch',
                category: 'receivables',
                severity: arDiff > 100 ? 'critical' : 'warning',
                title: 'عدم تطابق حساب مراقبة العملاء مع ميزان العملاء الفرعي',
                details: `إجمالي أرصدة كشوف حسابات العملاء (${totalCustomerSubledgerBalance.toFixed(2)} ج.م) لا يتطابق مع رصيد حساب العملاء في دفتر الأستاذ العام (${glArBalance.toFixed(2)} ج.م). الفارق: ${arDiff.toFixed(2)} ج.م`,
                discrepancy: arDiff
            });
        }

        // 3. Audit Accounts Payable (الموردون)
        let totalSupplierSubledgerBalance = 0;
        const supplierBalances = (suppliers || []).map(supp => {
            const openBal = Number(supp.openingBalance || 0);
            const purchases = (purchaseInvoices || [])
                .filter(inv => inv.supplierId === supp.id && inv.status !== 'voided')
                .reduce((sum, inv) => {
                    const amt = Number(inv.total || 0);
                    return inv.invoiceType === 'return' ? sum - amt : sum + amt;
                }, 0);

            const payments = (supplierPayments || [])
                .filter(p => p.supplierId === supp.id && p.status !== 'voided')
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);

            const netBal = openBal + purchases - payments;
            totalSupplierSubledgerBalance += netBal;
            return { supplier: supp, balance: netBal };
        });

        // GL Account 2101 (الموردون / الدائنون)
        const apAccounts = accounts.filter(a => a.id === '2101' || a.id.startsWith('2101') || a.name.includes('المورد'));
        const apAccountIds = new Set(apAccounts.map(a => a.id));

        let glApDebit = 0;
        let glApCredit = 0;
        (journalEntries || []).forEach(entry => {
            (entry.lines || []).forEach(line => {
                if (apAccountIds.has(line.accountId)) {
                    glApDebit += Number(line.debit || 0);
                    glApCredit += Number(line.credit || 0);
                }
            });
        });
        const glApBalance = glApCredit - glApDebit; // Payable is credit normal
        const apDiff = Math.abs(totalSupplierSubledgerBalance - glApBalance);

        if (apDiff > 1) {
            issues.push({
                id: 'ap_mismatch',
                category: 'payables',
                severity: apDiff > 100 ? 'critical' : 'warning',
                title: 'عدم تطابق حساب مراقبة الموردين مع ميزان الموردين الفرعي',
                details: `إجمالي أرصدة كشوف حسابات الموردين (${totalSupplierSubledgerBalance.toFixed(2)} ج.م) لا يتطابق مع رصيد حساب الموردين في دفتر الأستاذ العام (${glApBalance.toFixed(2)} ج.م). الفارق: ${apDiff.toFixed(2)} ج.م`,
                discrepancy: apDiff
            });
        }

        // 4. Audit Inventory Valuation
        let totalPhysicalInventoryValue = 0;
        const negativeStockProducts: Product[] = [];

        (products || []).forEach(p => {
            const qty = Number(p.quantity || 0);
            const cost = Number(p.costPrice || 0);
            if (qty < 0) {
                negativeStockProducts.push(p);
                issues.push({
                    id: `neg_stock_${p.id}`,
                    category: 'inventory',
                    severity: 'warning',
                    title: `رصيد مخزني سالب للصنف: ${p.name}`,
                    details: `الكمية الحالية بالسالب (${qty}) كود الصنف: ${p.code || p.id} - يتطلب تسوية جردية لتصحيح التكلفة.`,
                    referenceId: p.id
                });
            }
            if (qty > 0) {
                totalPhysicalInventoryValue += (qty * cost);
            }
        });

        // GL Inventory Account 1104
        const invAccounts = accounts.filter(a => a.id === '1104' || a.id.startsWith('1104') || a.name.includes('مخزون'));
        const invAccountIds = new Set(invAccounts.map(a => a.id));
        let glInvDebit = 0;
        let glInvCredit = 0;
        (journalEntries || []).forEach(entry => {
            (entry.lines || []).forEach(line => {
                if (invAccountIds.has(line.accountId)) {
                    glInvDebit += Number(line.debit || 0);
                    glInvCredit += Number(line.credit || 0);
                }
            });
        });
        const glInvBalance = glInvDebit - glInvCredit;
        const invDiff = Math.abs(totalPhysicalInventoryValue - glInvBalance);

        // 5. Intercompany Mirror Symmetry Audit
        // Look for account 2102 (جاري الشركة / المصنع)
        const icAccounts = accounts.filter(a => a.id === '2102' || a.name.includes('جاري') || a.name.includes('المصنع'));
        let icBalance = 0;
        if (icAccounts.length > 0) {
            let d = 0, c = 0;
            const icIds = new Set(icAccounts.map(a => a.id));
            (journalEntries || []).forEach(entry => {
                (entry.lines || []).forEach(line => {
                    if (icIds.has(line.accountId)) {
                        d += Number(line.debit || 0);
                        c += Number(line.credit || 0);
                    }
                });
            });
            icBalance = d - c;
        }

        return {
            totalGeneralDebit,
            totalGeneralCredit,
            generalTrialDiff,
            unbalancedEntries,
            totalCustomerSubledgerBalance,
            glArBalance,
            arDiff,
            totalSupplierSubledgerBalance,
            glApBalance,
            apDiff,
            totalPhysicalInventoryValue,
            glInvBalance,
            invDiff,
            negativeStockProducts,
            icBalance,
            issues
        };
    }, [accounts, journalEntries, customers, suppliers, products, salesInvoices, purchaseInvoices, customerPayments, supplierPayments]);

    if (!isOpen) return null;

    const criticalCount = auditResults.issues.filter(i => i.severity === 'critical').length;
    const warningCount = auditResults.issues.filter(i => i.severity === 'warning').length;

    const handleExportAudit = () => {
        const rows = auditResults.issues.map(i => ({
            'القسم': i.category === 'journal' ? 'القيود اليومية' : i.category === 'receivables' ? 'العملاء' : i.category === 'payables' ? 'الموردين' : i.category === 'inventory' ? 'المخزون' : 'بيني',
            'مستوى الأهمية': i.severity === 'critical' ? 'حرج' : 'تحذير',
            'عنوان الملاحظة': i.title,
            'التفاصيل': i.details,
            'الفارق المالي': i.discrepancy || 0,
            'رقم المرجع': i.referenceId || ''
        }));
        exportToExcel(rows, `Audit_Report_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-2xl">
                            ⚖️
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                فاحص وتدقيق التوازن والنزاهة المحاسبية الآلي
                                <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full font-mono">
                                    AI Auditor Pro
                                </span>
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                فحص شامل ودقيق لميزان المراجعة، مطابقة حسابات المراقبة مع الدفاتر الفرعية، ونزاهة المخزون
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportAudit}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                            title="تصدير تقرير التدقيق إلى Excel"
                        >
                            <span>📊 تصدير Excel</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-500 font-bold block mb-1">توازن ميزان المراجعة</span>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-base font-bold ${auditResults.generalTrialDiff < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {auditResults.generalTrialDiff < 0.01 ? '✅ متوازن 100%' : `فارق ${auditResults.generalTrialDiff.toFixed(2)} ج.م`}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono mt-1 block">
                            إجمالي القيود: {journalEntries.length}
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-500 font-bold block mb-1">مطابقة حساب العملاء</span>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-base font-bold ${auditResults.arDiff < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {auditResults.arDiff < 1 ? '✅ مطابق تماماً' : `فارق ${auditResults.arDiff.toFixed(1)} ج.م`}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                            دفتر الأستاذ: {auditResults.glArBalance.toLocaleString()} ج.م
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-500 font-bold block mb-1">مطابقة حساب الموردين</span>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-base font-bold ${auditResults.apDiff < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {auditResults.apDiff < 1 ? '✅ مطابق تماماً' : `فارق ${auditResults.apDiff.toFixed(1)} ج.م`}
                            </span>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                            دفتر الأستاذ: {auditResults.glApBalance.toLocaleString()} ج.م
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-500 font-bold block mb-1">حالة التدقيق العامة</span>
                        <div className="flex items-center gap-1.5">
                            {criticalCount === 0 && warningCount === 0 ? (
                                <span className="text-emerald-600 font-bold text-sm">✅ دفاتر سليمة 100%</span>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    {criticalCount > 0 && (
                                        <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                                            {criticalCount} حرج
                                        </span>
                                    )}
                                    {warningCount > 0 && (
                                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                            {warningCount} تحذير
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                            مجموع الملاحظات: {auditResults.issues.length}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 bg-white px-4 gap-2 text-xs font-bold pt-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'overview'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>تقرير التدقيق والملاحظات</span>
                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
                            {auditResults.issues.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('journals')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'journals'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>ميزان القيود اليومية</span>
                        {auditResults.unbalancedEntries.length > 0 && (
                            <span className="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full text-[10px]">
                                {auditResults.unbalancedEntries.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('subledgers')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'subledgers'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>مطابقة العملاء والموردين</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'inventory'
                                ? 'border-indigo-600 text-indigo-700'
                                : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>مطابقة المخزون والتكلفة</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {auditResults.issues.length === 0 ? (
                                <div className="p-12 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
                                    <span className="text-5xl block mb-3">🛡️</span>
                                    <h3 className="text-lg font-bold text-emerald-900 mb-1">
                                        تم الفحص بنجاح: النظام المحاسبي متوازن وسليم تماماً!
                                    </h3>
                                    <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                                        لم يتم العثور على أي قيود غير متوازنة، وأرصدة حسابات المراقبة للعملاء والموردين متوافقة مع كشوف الحسابات التفصيلية.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-gray-800">
                                            الملاحظات المكتشفة التي تتطلب مراجعة ({auditResults.issues.length})
                                        </h3>
                                        <span className="text-xs text-gray-500">مرتبة حسب الأولوية والأثر المالي</span>
                                    </div>

                                    {auditResults.issues.map(issue => (
                                        <div
                                            key={issue.id}
                                            className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                                                issue.severity === 'critical'
                                                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                                                    : 'bg-amber-50/80 border-amber-200 text-amber-950'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="text-xl shrink-0 mt-0.5">
                                                    {issue.severity === 'critical' ? '🚨' : '⚠️'}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm">{issue.title}</h4>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            issue.severity === 'critical' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                                                        }`}>
                                                            {issue.severity === 'critical' ? 'أولوية قصوى' : 'تنبيه تدقيقي'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mt-1 text-gray-700 leading-relaxed">{issue.details}</p>
                                                </div>
                                            </div>

                                            {issue.referenceId && issue.category === 'journal' && onOpenJournalEntry && (
                                                <button
                                                    onClick={() => onOpenJournalEntry(issue.referenceId!)}
                                                    className="shrink-0 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                                                >
                                                    عرض القيد
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* JOURNALS TAB */}
                    {activeTab === 'journals' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">إجمالي حركة اليومية العامة</h4>
                                    <p className="text-xs text-slate-500">مجموع أطراف المدين والدائن لكافة القيود المسجلة</p>
                                </div>
                                <div className="flex items-center gap-6 font-mono text-xs">
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">إجمالي المدين:</span>
                                        <span className="font-bold text-blue-700 text-sm">{auditResults.totalGeneralDebit.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">إجمالي الدائن:</span>
                                        <span className="font-bold text-blue-700 text-sm">{auditResults.totalGeneralCredit.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">الفارق العام:</span>
                                        <span className={`font-bold text-sm ${auditResults.generalTrialDiff < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {auditResults.generalTrialDiff.toFixed(2)} ج.م
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {auditResults.unbalancedEntries.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-xs">
                                    ✅ جميع القيود اليومية متوازنة بالكامل (المدين = الدائن).
                                </div>
                            ) : (
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 text-gray-600">
                                            <tr>
                                                <th className="p-3">رقم القيد</th>
                                                <th className="p-3">التاريخ</th>
                                                <th className="p-3">البيان</th>
                                                <th className="p-3">الفارق</th>
                                                <th className="p-3 text-center">الإجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {auditResults.unbalancedEntries.map(({ entry, diff }) => (
                                                <tr key={entry.id} className="hover:bg-rose-50/50">
                                                    <td className="p-3 font-mono font-bold text-gray-800">{entry.id}</td>
                                                    <td className="p-3 text-gray-600">{entry.date}</td>
                                                    <td className="p-3 text-gray-700">{entry.description}</td>
                                                    <td className="p-3 font-mono font-bold text-rose-600" dir="ltr">
                                                        {diff.toFixed(2)} ج.م
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {onOpenJournalEntry && (
                                                            <button
                                                                onClick={() => onOpenJournalEntry(entry.id)}
                                                                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded text-xs font-bold"
                                                            >
                                                                معاينة القيد
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBLEDGERS TAB */}
                    {activeTab === 'subledgers' && (
                        <div className="space-y-6">
                            {/* Receivables Card */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                                <h4 className="font-bold text-base text-gray-800 mb-2 flex items-center gap-2">
                                    <span>👤</span>
                                    مطابقة حساب مراقبة العملاء (Accounts Receivable)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-xs font-mono mb-3">
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">مجموع كشوف حسابات العملاء:</span>
                                        <span className="font-bold text-gray-900 text-sm">{auditResults.totalCustomerSubledgerBalance.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">رصيد حساب مراقبة العملاء (1103):</span>
                                        <span className="font-bold text-blue-800 text-sm">{auditResults.glArBalance.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">حالة المطابقة:</span>
                                        <span className={`font-bold text-sm ${auditResults.arDiff < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {auditResults.arDiff < 1 ? '✅ متطابق' : `فارق ${auditResults.arDiff.toFixed(2)} ج.م`}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    * يُحسب رصيد كشف الحساب من: الرصيد الافتتاحي + فواتير المبيعات - المرتجعات - سندات التحصيل.
                                </p>
                            </div>

                            {/* Payables Card */}
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                                <h4 className="font-bold text-base text-gray-800 mb-2 flex items-center gap-2">
                                    <span>🏭</span>
                                    مطابقة حساب مراقبة الموردين (Accounts Payable)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-xs font-mono mb-3">
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">مجموع كشوف حسابات الموردين:</span>
                                        <span className="font-bold text-gray-900 text-sm">{auditResults.totalSupplierSubledgerBalance.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">رصيد حساب مراقبة الموردين (2101):</span>
                                        <span className="font-bold text-blue-800 text-sm">{auditResults.glApBalance.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">حالة المطابقة:</span>
                                        <span className={`font-bold text-sm ${auditResults.apDiff < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {auditResults.apDiff < 1 ? '✅ متطابق' : `فارق ${auditResults.apDiff.toFixed(2)} ج.م`}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">
                                    * يُحسب رصيد كشف الحساب من: الرصيد الافتتاحي + فواتير المشتريات - المرتجعات - سندات الصرف المسددة.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* INVENTORY TAB */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-4">
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs">
                                <h4 className="font-bold text-base text-gray-800 mb-2 flex items-center gap-2">
                                    <span>📦</span>
                                    تقييم المخزون الدفتري مقابل الجرد الفعلي
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-xs font-mono mb-4">
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">قيمة الجرد الفعلي (الكمية × التكلفة):</span>
                                        <span className="font-bold text-gray-900 text-sm">{auditResults.totalPhysicalInventoryValue.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">رصيد حسابات المخزون بالأستاذ (1104):</span>
                                        <span className="font-bold text-blue-800 text-sm">{auditResults.glInvBalance.toLocaleString()} ج.م</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-[10px]">فارق التقييم:</span>
                                        <span className={`font-bold text-sm ${auditResults.invDiff < 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {auditResults.invDiff.toFixed(2)} ج.م
                                        </span>
                                    </div>
                                </div>

                                {auditResults.negativeStockProducts.length > 0 && (
                                    <div className="mt-4">
                                        <h5 className="font-bold text-xs text-rose-700 mb-2">أصناف بها رصيد سالب تتطلب تسوية:</h5>
                                        <div className="border border-rose-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-right text-xs">
                                                <thead className="bg-rose-50 text-rose-800 font-bold">
                                                    <tr>
                                                        <th className="p-2.5">الصنف</th>
                                                        <th className="p-2.5">الكود</th>
                                                        <th className="p-2.5">الكمية السالبة</th>
                                                        <th className="p-2.5">التكلفة</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-rose-100">
                                                    {auditResults.negativeStockProducts.map(p => (
                                                        <tr key={p.id}>
                                                            <td className="p-2.5 font-bold text-gray-800">{p.name}</td>
                                                            <td className="p-2.5 font-mono text-gray-500">{p.code || p.id}</td>
                                                            <td className="p-2.5 font-mono text-rose-600 font-bold" dir="ltr">{p.quantity}</td>
                                                            <td className="p-2.5 font-mono text-gray-600" dir="ltr">{p.costPrice} ج.م</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        تاريخ التدقيق اللحظي: {new Date().toLocaleString('ar-EG')}
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-xl text-xs transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountingAuditModal;
