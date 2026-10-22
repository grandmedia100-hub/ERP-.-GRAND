import React, { useState, useMemo } from 'react';
import type { SalesInvoice, PurchaseInvoice, Customer, Supplier, CompanyInfo } from '../types';
import { exportToExcel } from '../utils/exportToExcel';

interface VATDeclarationModalProps {
    isOpen: boolean;
    onClose: () => void;
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    customers: Customer[];
    suppliers: Supplier[];
}

const VATDeclarationModal: React.FC<VATDeclarationModalProps> = ({
    isOpen,
    onClose,
    salesInvoices,
    purchaseInvoices,
    customers,
    suppliers
}) => {
    // Current month by default
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);
    const [vatRate, setVatRate] = useState<number>(14); // 14% Standard VAT
    const [activeTab, setActiveTab] = useState<'summary' | 'sales' | 'purchases'>('summary');

    // Retrieve company info
    const companyInfo = useMemo(() => {
        try {
            const raw = localStorage.getItem('companyInfo');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }, []);

    // Filter Invoices by Period
    const filteredSales = useMemo(() => {
        return (salesInvoices || []).filter(inv =>
            inv.status !== 'voided' &&
            inv.date >= startDate &&
            inv.date <= endDate
        );
    }, [salesInvoices, startDate, endDate]);

    const filteredPurchases = useMemo(() => {
        return (purchaseInvoices || []).filter(inv =>
            inv.status !== 'voided' &&
            inv.date >= startDate &&
            inv.date <= endDate
        );
    }, [purchaseInvoices, startDate, endDate]);

    // Financial calculations
    const vatCalculations = useMemo(() => {
        const rateMultiplier = vatRate / 100;

        // Sales (Output VAT)
        let totalSalesGross = 0;
        let totalReturnsGross = 0;

        filteredSales.forEach(inv => {
            const amt = Number(inv.total || 0);
            if (inv.invoiceType === 'return') {
                totalReturnsGross += amt;
            } else {
                totalSalesGross += amt;
            }
        });

        const netSalesGross = totalSalesGross - totalReturnsGross;
        // In gross amount: Base = Gross / (1 + rate), VAT = Gross - Base
        const salesBase = netSalesGross / (1 + rateMultiplier);
        const outputVAT = netSalesGross - salesBase;

        // Purchases (Input VAT)
        let totalPurchasesGross = 0;
        let totalPurchaseReturnsGross = 0;

        filteredPurchases.forEach(inv => {
            const amt = Number(inv.total || 0);
            if (inv.invoiceType === 'return') {
                totalPurchaseReturnsGross += amt;
            } else {
                totalPurchasesGross += amt;
            }
        });

        const netPurchasesGross = totalPurchasesGross - totalPurchaseReturnsGross;
        const purchasesBase = netPurchasesGross / (1 + rateMultiplier);
        const inputVAT = netPurchasesGross - purchasesBase;

        // Net VAT Payable
        const netVATPayable = outputVAT - inputVAT;

        return {
            totalSalesGross,
            totalReturnsGross,
            netSalesGross,
            salesBase,
            outputVAT,
            totalPurchasesGross,
            totalPurchaseReturnsGross,
            netPurchasesGross,
            purchasesBase,
            inputVAT,
            netVATPayable
        };
    }, [filteredSales, filteredPurchases, vatRate]);

    if (!isOpen) return null;

    const handleExportExcel = () => {
        const summaryRows = [
            { 'البند': 'إجمالي المبيعات (شامل الضريبة)', 'القيمة': vatCalculations.netSalesGross },
            { 'البند': 'وعاء المبيعات الخاضع للضريبة', 'القيمة': vatCalculations.salesBase },
            { 'البند': `ضريبة المخرجات على المبيعات (${vatRate}%)`, 'القيمة': vatCalculations.outputVAT },
            { 'البند': 'إجمالي المشتريات (شامل الضريبة)', 'القيمة': vatCalculations.netPurchasesGross },
            { 'البند': 'وعاء المشتريات الخاضع للضريبة', 'القيمة': vatCalculations.purchasesBase },
            { 'البند': `ضريبة المدخلات القابلة للخصم (${vatRate}%)`, 'القيمة': vatCalculations.inputVAT },
            { 'البند': 'صافي الضريبة المستحقة للسداد', 'القيمة': vatCalculations.netVATPayable },
        ];
        exportToExcel(summaryRows, `VAT_Declaration_${startDate}_to_${endDate}`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-2xl">
                            🏛️
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                إقرار ضريبة القيمة المضافة ومساعد الفاتورة الضريبية
                                <span className="text-xs bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                                    VAT Center ({vatRate}%)
                                </span>
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                إعداد وحساب إقرار ضريبة القيمة المضافة (ضريبة المخرجات - ضريبة المدخلات)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            <span>📊 تصدير Excel</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            <span>🖨️ طباعة الإقرار</span>
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

                {/* Filter and Period Selection Bar */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <label className="font-bold text-gray-700">الفترة من:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="p-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="font-bold text-gray-700">إلى:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="p-1.5 border border-gray-300 rounded-lg text-xs bg-white font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <label className="font-bold text-gray-700">نسبة الضريبة:</label>
                            <select
                                value={vatRate}
                                onChange={e => setVatRate(Number(e.target.value))}
                                className="p-1.5 border border-gray-300 rounded-lg text-xs font-bold bg-white"
                            >
                                <option value={14}>14% (النسبة العامة بمصر)</option>
                                <option value={10}>10% (خدمات تشغيل)</option>
                                <option value={5}>5% (آلات ومعدات)</option>
                                <option value={0}>0% (معفاة / تصدير)</option>
                            </select>
                        </div>

                        {companyInfo.taxNumber && (
                            <span className="bg-blue-100 text-blue-900 font-mono font-bold px-2.5 py-1 rounded-lg">
                                الرقم الضريبي: {companyInfo.taxNumber}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tax Net Payable Banner */}
                <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${
                    vatCalculations.netVATPayable >= 0 ? 'bg-amber-50/80 border-amber-200' : 'bg-emerald-50/80 border-emerald-200'
                }`}>
                    <div>
                        <span className="text-xs font-bold text-gray-600 block">
                            {vatCalculations.netVATPayable >= 0 ? 'صافي ضريبة القيمة المضافة المستحقة للسداد للمصلحة:' : 'رصيد ضريبي دائن مسترد لصالح الشركة:'}
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className={`text-2xl font-bold font-mono ${vatCalculations.netVATPayable >= 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                                {Math.abs(vatCalculations.netVATPayable).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                                ({vatCalculations.outputVAT.toLocaleString()} ضريبة مبيعات - {vatCalculations.inputVAT.toLocaleString()} ضريبة مشتريات)
                            </span>
                        </div>
                    </div>

                    <div className="text-xs text-gray-600 bg-white/80 p-2.5 rounded-xl border border-gray-200 shadow-2xs font-mono">
                        <span>وعاء المبيعات: {vatCalculations.salesBase.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span>وعاء المشتريات: {vatCalculations.purchasesBase.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م</span>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-200 bg-white px-4 gap-2 text-xs font-bold pt-2">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`pb-2.5 px-3 border-b-2 transition-all ${
                            activeTab === 'summary' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        ملخص الإقرار الضريبي الرسمي
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'sales' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>فواتير المبيعات (المخرجات)</span>
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full text-[10px]">
                            {filteredSales.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                            activeTab === 'purchases' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        <span>فواتير المشتريات والخامات (المدخلات)</span>
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full text-[10px]">
                            {filteredPurchases.length}
                        </span>
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-5">
                    {/* SUMMARY TAB */}
                    {activeTab === 'summary' && (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {/* Official Declaration Table */}
                            <div className="border border-gray-300 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-100 text-gray-800 border-b border-gray-300 font-bold">
                                        <tr>
                                            <th className="p-3">البند الضريبي</th>
                                            <th className="p-3 text-center">الوعاء الخاضع (القيمة)</th>
                                            <th className="p-3 text-center">نسبة الضريبة</th>
                                            <th className="p-3 text-center">قيمة الضريبة المستحقة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 font-mono">
                                        {/* Sales Row */}
                                        <tr className="hover:bg-blue-50/30">
                                            <td className="p-3 font-sans font-bold text-gray-900">
                                                أولاً: المبيعات المحلية الخاضعة للضريبة (ضريبة المخرجات)
                                            </td>
                                            <td className="p-3 text-center text-gray-800">
                                                {vatCalculations.salesBase.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                                            </td>
                                            <td className="p-3 text-center font-bold text-blue-700">{vatRate}%</td>
                                            <td className="p-3 text-center font-bold text-blue-900">
                                                {vatCalculations.outputVAT.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                                            </td>
                                        </tr>

                                        {/* Purchases Row */}
                                        <tr className="hover:bg-blue-50/30">
                                            <td className="p-3 font-sans font-bold text-gray-900">
                                                ثانياً: المشتريات والخامات القابلة للخصم (ضريبة المدخلات)
                                            </td>
                                            <td className="p-3 text-center text-gray-800">
                                                {vatCalculations.purchasesBase.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                                            </td>
                                            <td className="p-3 text-center font-bold text-emerald-700">{vatRate}%</td>
                                            <td className="p-3 text-center font-bold text-emerald-900">
                                                {vatCalculations.inputVAT.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                                            </td>
                                        </tr>

                                        {/* Net Tax Row */}
                                        <tr className="bg-gray-100/80 font-bold">
                                            <td className="p-3.5 font-sans text-sm text-gray-900">
                                                صافي الضريبة المستحقة للسداد (المخرجات - المدخلات):
                                            </td>
                                            <td className="p-3.5 text-center text-gray-500 font-sans">-</td>
                                            <td className="p-3.5 text-center text-gray-500 font-sans">-</td>
                                            <td className={`p-3.5 text-center text-sm ${vatCalculations.netVATPayable >= 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                                                {Math.abs(vatCalculations.netVATPayable).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures & Certification Box */}
                            <div className="grid grid-cols-2 gap-6 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50 text-xs">
                                <div>
                                    <span className="font-bold text-gray-700 block mb-1">اسم المسؤول عن إعداد الإقرار:</span>
                                    <span className="text-gray-500 font-mono">..........................................</span>
                                    <span className="font-bold text-gray-700 block mt-3 mb-1">التوقيع:</span>
                                    <span className="text-gray-500 font-mono">..........................................</span>
                                </div>
                                <div className="text-left">
                                    <span className="font-bold text-gray-700 block mb-1">خاتم الشركة / المصنع:</span>
                                    <div className="w-24 h-24 border border-gray-300 rounded-lg inline-block text-gray-300 flex items-center justify-center">
                                        (الخاتم)
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SALES TAB */}
                    {activeTab === 'sales' && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-gray-100 text-gray-700 font-bold">
                                    <tr>
                                        <th className="p-2.5">رقم الفاتورة</th>
                                        <th className="p-2.5">التاريخ</th>
                                        <th className="p-2.5">اسم العميل</th>
                                        <th className="p-2.5">الرقم الضريبي للعميل</th>
                                        <th className="p-2.5 text-center">النوع</th>
                                        <th className="p-2.5 text-center">إجمالي الفاتورة</th>
                                        <th className="p-2.5 text-center">الضريبة ({vatRate}%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredSales.map(inv => {
                                        const customer = customers.find(c => c.id === inv.customerId);
                                        const gross = Number(inv.total || 0);
                                        const base = gross / (1 + (vatRate / 100));
                                        const tax = gross - base;
                                        return (
                                            <tr key={inv.id} className="hover:bg-blue-50/30">
                                                <td className="p-2.5 font-mono font-bold text-gray-800">{inv.id}</td>
                                                <td className="p-2.5 text-gray-600">{inv.date}</td>
                                                <td className="p-2.5 font-bold text-gray-900">{inv.customerName}</td>
                                                <td className="p-2.5 font-mono text-gray-500">{customer?.taxNumber || '-'}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        inv.invoiceType === 'return' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {inv.invoiceType === 'return' ? 'مرتجع' : 'مبيعات'}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 font-mono text-center text-gray-800">
                                                    {gross.toLocaleString('ar-EG')} ج.م
                                                </td>
                                                <td className="p-2.5 font-mono text-center font-bold text-blue-700">
                                                    {tax.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} ج.م
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PURCHASES TAB */}
                    {activeTab === 'purchases' && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-right text-xs">
                                <thead className="bg-gray-100 text-gray-700 font-bold">
                                    <tr>
                                        <th className="p-2.5">رقم الفاتورة</th>
                                        <th className="p-2.5">التاريخ</th>
                                        <th className="p-2.5">اسم المورد</th>
                                        <th className="p-2.5">الرقم الضريبي للمورد</th>
                                        <th className="p-2.5 text-center">النوع</th>
                                        <th className="p-2.5 text-center">إجمالي الفاتورة</th>
                                        <th className="p-2.5 text-center">ضريبة المدخلات ({vatRate}%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPurchases.map(inv => {
                                        const supplier = suppliers.find(s => s.id === inv.supplierId);
                                        const gross = Number(inv.total || 0);
                                        const base = gross / (1 + (vatRate / 100));
                                        const tax = gross - base;
                                        return (
                                            <tr key={inv.id} className="hover:bg-blue-50/30">
                                                <td className="p-2.5 font-mono font-bold text-gray-800">{inv.id}</td>
                                                <td className="p-2.5 text-gray-600">{inv.date}</td>
                                                <td className="p-2.5 font-bold text-gray-900">{inv.supplierName}</td>
                                                <td className="p-2.5 font-mono text-gray-500">{supplier?.taxNumber || '-'}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                        inv.invoiceType === 'return' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                                    }`}>
                                                        {inv.invoiceType === 'return' ? 'مرتجع' : 'مشتريات'}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 font-mono text-center text-gray-800">
                                                    {gross.toLocaleString('ar-EG')} ج.م
                                                </td>
                                                <td className="p-2.5 font-mono text-center font-bold text-emerald-700">
                                                    {tax.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} ج.م
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                        * يستند هذا الإقرار إلى الفواتير المسجلة بالنظام للفترة المحددة وفقاً للقانون الضريبي.
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-6 py-2 rounded-xl transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VATDeclarationModal;
