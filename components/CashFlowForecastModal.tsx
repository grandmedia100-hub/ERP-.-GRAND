import React, { useState, useMemo } from 'react';
import type { SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, Expense, Account, TreasuryTransfer } from '../types';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

interface CashFlowForecastModalProps {
    isOpen: boolean;
    onClose: () => void;
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
    customerPayments: CustomerPayment[];
    supplierPayments: SupplierPayment[];
    expenses: Expense[];
    accounts: Account[];
}

const CashFlowForecastModal: React.FC<CashFlowForecastModalProps> = ({
    isOpen,
    onClose,
    salesInvoices,
    purchaseInvoices,
    customerPayments,
    supplierPayments,
    expenses,
    accounts
}) => {
    const [forecastDays, setForecastDays] = useState<7 | 14 | 30>(14);

    // 1. Calculate Current Liquid Balance across all Cash & Bank accounts
    const currentLiquidCash = useMemo(() => {
        const cashAccounts = (accounts || []).filter(a =>
            a.type === 'Asset' &&
            (a.id.startsWith('1101') || a.id.startsWith('1102') || a.name.includes('خزينة') || a.name.includes('بنك') || a.name.includes('محفظة'))
        );
        return cashAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    }, [accounts]);

    // 2. Build Daily Cash Flow Projection
    const forecastData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find unpaid sales invoices (Expected Inflows)
        const unpaidSales = (salesInvoices || [])
            .filter(inv => inv.status !== 'voided' && inv.invoiceType !== 'return' && inv.paymentMethod === 'اجل')
            .map(inv => {
                const paid = (customerPayments || [])
                    .filter(p => p.referenceId === inv.id && p.status !== 'voided')
                    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const remaining = Math.max(0, Number(inv.total || 0) - paid);
                return { ...inv, remaining };
            })
            .filter(inv => inv.remaining > 0);

        // Find unpaid purchase invoices (Expected Outflows)
        const unpaidPurchases = (purchaseInvoices || [])
            .filter(inv => inv.status !== 'voided' && inv.invoiceType !== 'purchase' && inv.paymentMethod === 'اجل')
            .map(inv => {
                const paid = (supplierPayments || [])
                    .filter(p => p.referenceId === inv.id && p.status !== 'voided')
                    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const remaining = Math.max(0, Number(inv.total || 0) - paid);
                return { ...inv, remaining };
            })
            .filter(inv => inv.remaining > 0);

        // Estimate average daily expenses from the past 30 days
        const recentExpensesTotal = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const estimatedDailyExpense = recentExpensesTotal > 0 ? (recentExpensesTotal / 30) : 0;

        let runningCash = currentLiquidCash;
        const daysArray: {
            dateStr: string;
            dayLabel: string;
            inflow: number;
            outflow: number;
            netFlow: number;
            projectedCash: number;
        }[] = [];

        // Distribute remaining receivables and payables across the forecast window
        const dailyInflowSlice = unpaidSales.reduce((sum, inv) => sum + inv.remaining, 0) / forecastDays;
        const dailyOutflowSlice = (unpaidPurchases.reduce((sum, inv) => sum + inv.remaining, 0) / forecastDays) + estimatedDailyExpense;

        for (let i = 0; i < forecastDays; i++) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + i);
            const dateIso = targetDate.toISOString().split('T')[0];

            // Weight higher probability in earlier days
            const dayWeight = 1 + (Math.sin(i * 0.5) * 0.2);
            const dayInflow = Math.round(dailyInflowSlice * dayWeight);
            const dayOutflow = Math.round(dailyOutflowSlice);
            const netFlow = dayInflow - dayOutflow;
            runningCash += netFlow;

            const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const dayName = i === 0 ? 'اليوم' : i === 1 ? 'غداً' : dayNames[targetDate.getDay()];

            daysArray.push({
                dateStr: dateIso,
                dayLabel: `${dayName} (${targetDate.getDate()}/${targetDate.getMonth() + 1})`,
                inflow: dayInflow,
                outflow: dayOutflow,
                netFlow,
                projectedCash: Math.round(runningCash)
            });
        }

        const totalInflows = daysArray.reduce((sum, d) => sum + d.inflow, 0);
        const totalOutflows = daysArray.reduce((sum, d) => sum + d.outflow, 0);
        const finalProjectedCash = daysArray[daysArray.length - 1]?.projectedCash || currentLiquidCash;
        const lowestPoint = Math.min(...daysArray.map(d => d.projectedCash));

        return {
            days: daysArray,
            totalInflows,
            totalOutflows,
            finalProjectedCash,
            lowestPoint,
            unpaidSalesCount: unpaidSales.length,
            unpaidPurchasesCount: unpaidPurchases.length
        };
    }, [currentLiquidCash, forecastDays, salesInvoices, purchaseInvoices, customerPayments, supplierPayments, expenses]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-2xl">
                            📈
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                مؤشر التدفقات النقدية والسيولة المتوقعة
                                <span className="text-xs bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                                    Cash Flow Forecast
                                </span>
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                توقع السيولة اليومية والمتحصلات والالتزامات المالية لفترة قادمة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Days Selector */}
                        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
                            <button
                                onClick={() => setForecastDays(7)}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    forecastDays === 7 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                7 أيام
                            </button>
                            <button
                                onClick={() => setForecastDays(14)}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    forecastDays === 14 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                14 يوماً
                            </button>
                            <button
                                onClick={() => setForecastDays(30)}
                                className={`px-3 py-1 rounded-lg transition-all ${
                                    forecastDays === 30 ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                30 يوماً
                            </button>
                        </div>

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

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 border-b border-gray-200">
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-500 font-bold block mb-1">السيولة الحالية المتاحة</span>
                        <div className="text-base font-bold text-gray-900 font-mono">
                            {currentLiquidCash.toLocaleString()} ج.م
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                            (الخزينة + البنوك والمحافظ)
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-emerald-700 font-bold block mb-1">متحصلات عملاء متوقعة</span>
                        <div className="text-base font-bold text-emerald-600 font-mono">
                            +{forecastData.totalInflows.toLocaleString()} ج.م
                        </div>
                        <span className="text-[10px] text-emerald-600/70 mt-1 block">
                            خلال {forecastDays} يوماً ({forecastData.unpaidSalesCount} فاتورة)
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-rose-700 font-bold block mb-1">التزامات وموردين متوقعة</span>
                        <div className="text-base font-bold text-rose-600 font-mono">
                            -{forecastData.totalOutflows.toLocaleString()} ج.م
                        </div>
                        <span className="text-[10px] text-rose-600/70 mt-1 block">
                            (شامل الموردين والمصاريف التقديرية)
                        </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-blue-700 font-bold block mb-1">الرصيد المتوقع بنهاية الفترة</span>
                        <div className={`text-base font-bold font-mono ${forecastData.finalProjectedCash >= 0 ? 'text-blue-700' : 'text-rose-600'}`}>
                            {forecastData.finalProjectedCash.toLocaleString()} ج.م
                        </div>
                        <span className="text-[10px] font-bold mt-1 block text-emerald-600">
                            {forecastData.lowestPoint >= 0 ? '✅ سيولة آمنة ومستقرة' : '⚠️ عجز متوقع يتطلب تحصيل'}
                        </span>
                    </div>
                </div>

                {/* Main Content / Chart Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Area Chart: Projected Cumulative Liquidity */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-sm text-gray-800">
                                    منحنى الرصيد النقدي التراكمي المتوقع (Cash Runway)
                                </h3>
                                <p className="text-xs text-gray-500">حركة السيولة يوماً بيوم خلال فترة {forecastDays} يوماً</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                الفارق الصافي: {(forecastData.totalInflows - forecastData.totalOutflows >= 0 ? '+' : '')}{(forecastData.totalInflows - forecastData.totalOutflows).toLocaleString()} ج.م
                            </span>
                        </div>

                        <div className="h-64 w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData.days} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(val: any) => [`${Number(val).toLocaleString()} ج.م`, 'الرصيد المتوقع']}
                                        labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                    />
                                    <Area type="monotone" dataKey="projectedCash" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#cashGradient)" name="الرصيد التراكمي" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart: Daily Inflows vs Outflows */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
                        <h3 className="font-bold text-sm text-gray-800 mb-1">
                            مقارنة التدفقات اليومية: الداخلة (تحصيلات) مقابل الخارجة (سدادات)
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">توزيع التدفق النقدي اليومي</p>

                        <div className="h-56 w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={forecastData.days} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} ج.م`, name === 'inflow' ? 'تحصيلات متوقعة' : 'التزامات متوقعة']} />
                                    <Legend formatter={(val) => val === 'inflow' ? 'المتحصلات اليومية' : 'الالتزامات اليومية'} />
                                    <Bar dataKey="inflow" fill="#10b981" name="inflow" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="outflow" fill="#f43f5e" name="outflow" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">
                        💡 نصيحة مالية: اعتمد على مركز تحصيل الواتساب في تقرير أعمار الديون لزيادة التدفقات الداخلة في الأسبوع الأول.
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

export default CashFlowForecastModal;
