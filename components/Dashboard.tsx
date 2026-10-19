import React, { useMemo, useState, useEffect } from 'react';
import type { SalesInvoice, PurchaseInvoice } from '../types.ts';
import { generateFinancialAnalysis } from '../services/geminiService.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
    salesInvoices: SalesInvoice[];
    purchaseInvoices: PurchaseInvoice[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4 space-x-reverse transform hover:scale-105 transition-transform duration-200">
        <div className={`rounded-full p-4 ${color}`}>
            <span className="text-3xl">{icon}</span>
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({
    salesInvoices,
    purchaseInvoices
}) => {
    const [financialAnalysis, setFinancialAnalysis] = useState<string>('يتم التحليل الآن...');
    const [isLoading, setIsLoading] = useState(true);

    const stats = useMemo(() => {
        // Filter out voided invoices for all KPI calculations
        const activeSales = salesInvoices.filter(inv => inv.status !== 'voided');
        const activePurchases = purchaseInvoices.filter(inv => inv.status !== 'voided');

        const totalSales = activeSales
            .filter(inv => inv.invoiceType !== 'return')
            .reduce((sum, inv) => sum + inv.total, 0);

        const totalReturns = activeSales
            .filter(inv => inv.invoiceType === 'return')
            .reduce((sum, inv) => sum + inv.total, 0);

        const netSales = totalSales - totalReturns;

        const totalPurchases = activePurchases
            .filter(inv => inv.invoiceType !== 'return')
            .reduce((sum, inv) => sum + inv.total, 0);

        // Gross profit = Net Sales - Total Purchases (approximation until COGS is tracked separately)
        const grossProfit = netSales - totalPurchases;

        return { totalSales: netSales, totalPurchases, grossProfit };
    }, [salesInvoices, purchaseInvoices]);

    // Chart Data Preparation
    const salesData = useMemo(() => {
        // Group by Date (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const daySales = salesInvoices
                .filter(inv => inv.date === date && inv.status !== 'voided')
                .reduce((sum, inv) => sum + inv.total, 0);
            return { name: date, sales: daySales };
        });
    }, [salesInvoices]);

    const topProductsData = useMemo(() => {
        const productCounts: Record<string, number> = {};
        salesInvoices.forEach(inv => {
            if (inv.status !== 'voided') {
                inv.items.forEach(item => {
                    if (productCounts[item.productName]) {
                        productCounts[item.productName] += item.quantity;
                    } else {
                        productCounts[item.productName] = item.quantity;
                    }
                });
            }
        });

        return Object.entries(productCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5
    }, [salesInvoices]);

    // Notifications Logic
    const notifications = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const alerts: { id: string, customer: string, date: string, amount: number, type: 'today' | 'overdue' | 'upcoming', invoiceId: string }[] = [];

        salesInvoices.forEach(inv => {
            if (inv.paymentSchedule && inv.paymentSchedule.length > 0) {
                inv.paymentSchedule.forEach(inst => {
                    if (!inst.isPaid) {
                        const dueDate = new Date(inst.date);
                        dueDate.setHours(0, 0, 0, 0);

                        if (dueDate.getTime() === today.getTime()) {
                            alerts.push({ ...inst, customer: inv.customerName, type: 'today', invoiceId: inv.id });
                        } else if (dueDate < today) {
                            alerts.push({ ...inst, customer: inv.customerName, type: 'overdue', invoiceId: inv.id });
                        } else if (dueDate <= nextWeek) {
                            alerts.push({ ...inst, customer: inv.customerName, type: 'upcoming', invoiceId: inv.id });
                        }
                    }
                });
            }
        });

        return alerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [salesInvoices]);

    useEffect(() => {
        const getAnalysis = async () => {
            // Mock Analysis to save API calls in development if needed, but keeping logic
            // For now, simpler message or actual API
            setIsLoading(true);
            try {
                // Short circuit if no data
                if (stats.totalSales === 0) {
                    setFinancialAnalysis("لا توجد بيانات كافية للتحليل.");
                    return;
                }
                const analysis = await generateFinancialAnalysis(
                    stats.totalSales,
                    stats.totalPurchases,
                    0,
                    stats.grossProfit
                );
                setFinancialAnalysis(analysis);
            } catch (error) {
                console.error("Failed to get financial analysis:", error);
                setFinancialAnalysis("تعذر الاتصال بخدمة التحليل الذكي.");
            } finally {
                setIsLoading(false);
            }
        };

        if (stats.totalSales > 0 || stats.totalPurchases > 0) {
            getAnalysis();
        } else {
            setIsLoading(false);
            setFinancialAnalysis("ابدأ بإدخال المبيعات والمشتريات لتمكين التحليل الذكي.");
        }
    }, [stats]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">لوحة القيادة</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="إجمالي المبيعات"
                    value={`${stats.totalSales.toLocaleString('en-US')} ج.م`}
                    icon="📈"
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    title="إجمالي المشتريات"
                    value={`${stats.totalPurchases.toLocaleString('en-US')} ج.م`}
                    icon="🛒"
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    title="مجمل الربح"
                    value={`${stats.grossProfit.toLocaleString('en-US')} ج.م`}
                    icon={stats.grossProfit >= 0 ? '😊' : '😟'}
                    color={stats.grossProfit >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend Bar Chart */}
                <div className="bg-white p-6 rounded-xl shadow-md h-80">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">حركة المبيعات (آخر 7 أيام)</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', direction: 'rtl' }}
                                formatter={(value: number) => [`${value.toLocaleString()} ج.م`, 'المبيعات']}
                            />
                            <Bar dataKey="sales" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-md h-80">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">أكثر المنتجات مبيعاً</h2>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={topProductsData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {topProductsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${value} قطعة`, 'الكمية']} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Due Payments Notifications */}
                <div className="bg-white p-6 rounded-xl shadow-md lg:col-span-1">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span>🔔</span>
                        تنبيهات السداد
                    </h2>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">لا توجد تنبيهات حالياً.</p>
                        ) : (
                            notifications.map((notif, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border-r-4 shadow-sm text-sm ${notif.type === 'overdue' ? 'bg-red-50 border-red-500' :
                                        notif.type === 'today' ? 'bg-yellow-50 border-yellow-500' :
                                            'bg-blue-50 border-blue-500'
                                    }`}>
                                    <div className="flex justify-between font-bold mb-1">
                                        <span className="text-gray-800 truncate max-w-[120px]">{notif.customer}</span>
                                        <span className={`${notif.type === 'overdue' ? 'text-red-700' :
                                                notif.type === 'today' ? 'text-yellow-700' : 'text-blue-700'
                                            }`}>{notif.amount.toLocaleString('en-US')} ج.م</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>#{notif.invoiceId}</span>
                                        <span dir="ltr">{notif.date}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* AI Analysis (Simplified View) */}
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-md border border-blue-100">
                    <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                        <span>🤖</span>
                        التحليل الذكي
                    </h2>
                    {isLoading ? (
                        <div className="flex items-center text-blue-600 animate-pulse">
                            جاري تحليل بياناتك المالية...
                        </div>
                    ) : (
                        <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-line">{financialAnalysis}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
