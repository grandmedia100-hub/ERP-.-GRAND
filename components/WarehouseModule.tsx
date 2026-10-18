import React, { useState, useMemo, useCallback } from 'react';
import type { Product, StockTransaction, Warehouse } from '../types.ts';
import ExcelImportModal from './ExcelImportModal.tsx';

interface WarehouseModuleProps {
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
    stockTransactions: StockTransaction[];
    setStockTransactions: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
    createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string }) => void;
    logAction: (action: string) => void;
    warehouses: Warehouse[];
    setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
    accounts: any[];
}

type Tab = 'products' | 'stock_card' | 'adjustments' | 'physical_count' | 'warehouses';

const WarehouseModule: React.FC<WarehouseModuleProps> = ({
    products, setProducts, stockTransactions, setStockTransactions, createJournalEntry, logAction,
    warehouses, setWarehouses, accounts
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('products');

    // Products tab state
    const [isAddProductOpen, setIsAddProductOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [filterWarehouseId, setFilterWarehouseId] = useState<string>('');
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [productForm, setProductForm] = useState({ name: '', sku: '', unit: 'عدد', costPrice: 0, salePrice: 0, lowStockThreshold: 0, warehouseId: '', warehouseName: '' });

    // Stock card tab state
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [cardDateStart, setCardDateStart] = useState('');
    const [cardDateEnd, setCardDateEnd] = useState('');

    // Adjustment tab state
    const [adjForm, setAdjForm] = useState({ productId: '', type: 'adjustment_in', quantity: 0, unitCost: 0, notes: '', date: new Date().toISOString().split('T')[0] });

    // Physical count state
    const [countItems, setCountItems] = useState<{ productId: string; systemQty: number; actualQty: number }[]>([]);
    const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
    const [countSubmitted, setCountSubmitted] = useState(false);

    // ── Helpers ─────────────────────────────────────────────────────────────
    const typeLabel: Record<string, string> = {
        opening_balance: 'رصيد افتتاحي',
        purchase: 'مشتريات',
        purchase_return: 'مرتجع مشتريات',
        sale: 'مبيعات',
        sale_return: 'مرتجع مبيعات',
        adjustment_in: 'إذن إضافة',
        adjustment_out: 'إذن صرف',
        count_adjustment: 'تسوية جردية',
    };
    const typeBadge: Record<string, string> = {
        opening_balance: 'bg-purple-100 text-purple-700',
        purchase: 'bg-green-100 text-green-700',
        purchase_return: 'bg-red-100 text-red-700',
        sale: 'bg-blue-100 text-blue-700',
        sale_return: 'bg-yellow-100 text-yellow-700',
        adjustment_in: 'bg-teal-100 text-teal-700',
        adjustment_out: 'bg-orange-100 text-orange-700',
        count_adjustment: 'bg-gray-100 text-gray-700',
    };

    // ── Products CRUD ────────────────────────────────────────────────────────
    // Generate clean 4 or 5 digit numeric SKU (e.g. 1001, 1002... up to 99999)
    const generateSku = useCallback(() => {
        let maxNum = 1000;
        products.forEach(prod => {
            const code = (prod.sku || prod.id || '').replace(/\D/g, '');
            if (code && code.length >= 4 && code.length <= 5) {
                const num = parseInt(code, 10);
                if (!isNaN(num) && num > maxNum && num < 100000) {
                    maxNum = num;
                }
            }
        });
        return String(maxNum + 1);
    }, [products]);

    const handleOpenAddProduct = (p?: Product) => {
        if (p) {
            setEditingProduct(p);
            setProductForm({ name: p.name, sku: p.sku || '', unit: p.unit || 'عدد', costPrice: p.costPrice, salePrice: p.salePrice, lowStockThreshold: p.lowStockThreshold, warehouseId: p.warehouseId || '', warehouseName: p.warehouseName || '' });
        } else {
            setEditingProduct(null);
            // Default to filtered warehouse or first active warehouse
            const defaultWhId = (filterWarehouseId && filterWarehouseId !== '__unassigned__') ? filterWarehouseId : (warehouses.find(w => w.isActive)?.id || '');
            const newSku = generateSku();
            const wh = warehouses.find(w => w.id === defaultWhId);
            setProductForm({ name: '', sku: newSku, unit: 'عدد', costPrice: 0, salePrice: 0, lowStockThreshold: 0, warehouseId: defaultWhId, warehouseName: wh?.name || '' });
        }
        setIsAddProductOpen(true);
    };

    const handleSaveProduct = () => {
        if (!productForm.name.trim()) return;
        const finalSku = productForm.sku.trim() || generateSku();
        const wh = warehouses.find(w => w.id === productForm.warehouseId);
        const updatedForm = { ...productForm, sku: finalSku, warehouseId: productForm.warehouseId, warehouseName: wh?.name || '' };
        if (editingProduct) {
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updatedForm } : p));
            logAction(`تعديل بيانات الصنف: ${productForm.name}`);
        } else {
            const newProduct: Product = { id: `PROD-${Date.now()}`, quantity: 0, ...updatedForm, costPrice: Number(productForm.costPrice), salePrice: Number(productForm.salePrice), lowStockThreshold: Number(productForm.lowStockThreshold) };
            setProducts(prev => [...prev, newProduct]);
            logAction(`إضافة صنف جديد: ${productForm.name} - كود: ${finalSku} - مخزن: ${wh?.name || 'غير محدد'}`);
        }
        setIsAddProductOpen(false);
    };

    const handleImportProducts = (rows: any[]) => {
        let currentCode = 1000;
        products.forEach(p => {
            const code = (p.sku || p.id || '').replace(/\D/g, '');
            if (code && code.length >= 4 && code.length <= 5) {
                const num = parseInt(code, 10);
                if (!isNaN(num) && num > currentCode && num < 100000) currentCode = num;
            }
        });

        const newProducts: Product[] = rows.map(r => {
            let finalSku = (r.sku || '').trim();
            if (!finalSku || finalSku.length > 6) {
                currentCode++;
                finalSku = String(currentCode);
            }
            return {
                id: finalSku || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: r.name || '',
                sku: finalSku,
                unit: r.unit || 'عدد',
                quantity: Number(r.quantity) || 0,
                costPrice: Number(r.costPrice) || 0,
                salePrice: Number(r.salePrice) || 0,
                lowStockThreshold: Number(r.lowStockThreshold) || 5,
                warehouseId: r.warehouseId || '',
                warehouseName: r.warehouseName || '',
                category: r.category || '',
                barcode: r.barcode || '',
                productType: r.productType || '',
            };
        });
        setProducts(prev => [...prev, ...newProducts]);
        logAction(`استيراد ${newProducts.length} صنف من ملف Excel`);
    };

    const handleDeleteProduct = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
            setProducts(prev => prev.filter(p => p.id !== id));
            setStockTransactions(prev => prev.filter(t => t.productId !== id));
        }
    };

    // ── Stock Card ───────────────────────────────────────────────────────────
    const cardTransactions = useMemo(() => {
        return stockTransactions
            .filter(t => {
                const productMatch = !selectedProductId || t.productId === selectedProductId;
                const startMatch = !cardDateStart || t.date >= cardDateStart;
                const endMatch = !cardDateEnd || t.date <= cardDateEnd;
                return productMatch && startMatch && endMatch;
            })
            .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    }, [stockTransactions, selectedProductId, cardDateStart, cardDateEnd]);

    const cardProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    // ── Manual Adjustments ───────────────────────────────────────────────────
    const handleSaveAdjustment = useCallback(() => {
        if (!adjForm.productId || adjForm.quantity <= 0) {
            alert('يرجى اختيار الصنف وإدخال كمية صحيحة');
            return;
        }
        const product = products.find(p => p.id === adjForm.productId);
        if (!product) return;

        const qty = Number(adjForm.quantity);
        const cost = Number(adjForm.unitCost) || product.costPrice;
        const isIn = adjForm.type === 'adjustment_in';
        const newQty = isIn ? product.quantity + qty : product.quantity - qty;

        if (!isIn && newQty < 0) {
            alert('لا يمكن صرف كمية أكبر من الرصيد المتاح');
            return;
        }

        const txId = `ADJ-${Date.now()}`;
        const tx: StockTransaction = {
            id: txId,
            date: adjForm.date,
            productId: product.id,
            productName: product.name,
            type: adjForm.type as any,
            quantityIn: isIn ? qty : 0,
            quantityOut: isIn ? 0 : qty,
            unitCost: cost,
            totalCost: qty * cost,
            balanceAfter: newQty,
            referenceId: txId,
            referenceType: 'Adjustment',
            notes: adjForm.notes,
            createdAt: new Date().toISOString(),
        };

        setStockTransactions(prev => [...prev, tx]);
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: newQty, costPrice: isIn ? cost : p.costPrice } : p));

        // Journal Entry
        const whId = product.warehouseId || 'WH-0001';
        const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
        const invAccId = whAcc ? whAcc.id : '1104';
        const invAccName = whAcc ? whAcc.name : 'المخزون';

        if (isIn) {
            createJournalEntry({
                description: `إذن إضافة مخزون - ${product.name} - ${adjForm.notes || ''}`,
                lines: [
                    { accountId: invAccId, accountName: invAccName, debit: qty * cost, credit: 0 },
                    { accountId: '4201', accountName: 'إيرادات أخرى / فروق جرد', debit: 0, credit: qty * cost },
                ],
                referenceType: 'Manual', referenceId: txId, date: adjForm.date,
            });
        } else {
            createJournalEntry({
                description: `إذن صرف مخزون - ${product.name} - ${adjForm.notes || ''}`,
                lines: [
                    { accountId: '5201', accountName: 'خسائر / هالك / فروق جرد', debit: qty * cost, credit: 0 },
                    { accountId: invAccId, accountName: invAccName, debit: 0, credit: qty * cost },
                ],
                referenceType: 'Manual', referenceId: txId, date: adjForm.date,
            });
        }

        logAction(`${isIn ? 'إذن إضافة' : 'إذن صرف'} - ${product.name} - كمية: ${qty}`);
        setAdjForm({ productId: '', type: 'adjustment_in', quantity: 0, unitCost: 0, notes: '', date: new Date().toISOString().split('T')[0] });
        alert('تم حفظ الإذن وإنشاء القيد المحاسبي بنجاح ✓');
    }, [adjForm, products, setProducts, setStockTransactions, createJournalEntry, logAction]);

    // ── Physical Count ────────────────────────────────────────────────────────
    const initPhysicalCount = () => {
        setCountItems(products.map(p => ({ productId: p.id, systemQty: p.quantity, actualQty: p.quantity })));
        setCountSubmitted(false);
    };

    const handleSavePhysicalCount = () => {
        const differences = countItems.filter(c => c.actualQty !== c.systemQty);
        if (differences.length === 0) {
            alert('لا توجد فروقات، الجرد متطابق مع النظام');
            return;
        }

        const batchId = `COUNT-${Date.now()}`;
        const newTxs: StockTransaction[] = [];
        const journalLines: any[] = [];

        differences.forEach(diff => {
            const product = products.find(p => p.id === diff.productId)!;
            const diffQty = diff.actualQty - diff.systemQty;
            const cost = product.costPrice;
            const tx: StockTransaction = {
                id: `${batchId}-${product.id}`,
                date: countDate,
                productId: product.id,
                productName: product.name,
                type: 'count_adjustment',
                quantityIn: diffQty > 0 ? diffQty : 0,
                quantityOut: diffQty < 0 ? Math.abs(diffQty) : 0,
                unitCost: cost,
                totalCost: Math.abs(diffQty) * cost,
                balanceAfter: diff.actualQty,
                referenceId: batchId,
                referenceType: 'Adjustment',
                notes: `تسوية جردية - من ${diff.systemQty} إلى ${diff.actualQty}`,
                createdAt: new Date().toISOString(),
            };
            newTxs.push(tx);

            const whId = product.warehouseId || 'WH-0001';
            const whAcc = accounts.find(a => a.linkedWarehouseId === whId);
            const invAccId = whAcc ? whAcc.id : '1104';
            const invAccName = whAcc ? whAcc.name : 'المخزون';

            const value = Math.abs(diffQty) * cost;
            if (diffQty > 0) {
                journalLines.push({ accountId: invAccId, accountName: invAccName, debit: value, credit: 0 });
                journalLines.push({ accountId: '4201', accountName: 'فروق جرد دائنة', debit: 0, credit: value });
            } else {
                journalLines.push({ accountId: '5201', accountName: 'فروق جرد مدينة', debit: value, credit: 0 });
                journalLines.push({ accountId: invAccId, accountName: invAccName, debit: 0, credit: value });
            }
        });

        setStockTransactions(prev => [...prev, ...newTxs]);
        setProducts(prev => prev.map(p => {
            const diff = differences.find(d => d.productId === p.id);
            return diff ? { ...p, quantity: diff.actualQty } : p;
        }));

        createJournalEntry({
            description: `تسوية جردية شاملة - ${differences.length} أصناف - ${countDate}`,
            lines: journalLines,
            referenceType: 'Manual', referenceId: batchId, date: countDate,
        });

        logAction(`تسوية جردية: ${differences.length} أصناف بتاريخ ${countDate}`);
        setCountSubmitted(true);
        alert(`تم حفظ التسوية الجردية بنجاح لـ ${differences.length} أصناف ✓`);
    };

    // Total inventory value
    const totalInventoryValue = useMemo(() => products.reduce((s, p) => s + p.quantity * p.costPrice, 0), [products]);
    const lowStockProducts = useMemo(() => products.filter(p => p.quantity <= p.lowStockThreshold && p.lowStockThreshold > 0), [products]);

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'warehouses', label: 'دليل المخازن', icon: '🏪' },
        { id: 'products', label: 'دليل الأصناف', icon: '📦' },
        { id: 'stock_card', label: 'كارت الصنف', icon: '📋' },
        { id: 'adjustments', label: 'أذون المخازن', icon: '🔄' },
        { id: 'physical_count', label: 'الجرد والتسوية', icon: '🔢' },
    ];

    // ── Filter products by selected warehouse in products tab ─────────────
    const displayedProducts = useMemo(() => {
        if (!filterWarehouseId) return products;
        if (filterWarehouseId === '__unassigned__') {
            return products.filter(p => !p.warehouseId && !p.warehouseName);
        }
        const selWh = warehouses.find(w => w.id === filterWarehouseId);
        return products.filter(p => {
            if (p.warehouseId && p.warehouseId === filterWarehouseId) return true;
            if (selWh && p.warehouseName && p.warehouseName.trim() === selWh.name.trim()) return true;
            return false;
        });
    }, [products, filterWarehouseId, warehouses]);

    // ── Warehouse CRUD ────────────────────────────────────────────────────
    const [warehouseForm, setWarehouseForm] = useState({ name: '', code: '', location: '' });
    const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
    const [isWarehouseFormOpen, setIsWarehouseFormOpen] = useState(false);

    const generateWarehouseCode = (name: string): string => {
        // Auto-generate 3-letter uppercase code from Arabic/English name
        const words = name.trim().split(/\s+/);
        if (words.length >= 2) {
            return words.slice(0, 3).map(w => w[0]?.toUpperCase() || '').join('').substring(0, 3);
        }
        return name.replace(/[\u0600-\u06FF\s]/g, '').toUpperCase().substring(0, 3) ||
               name.substring(0, 3).toUpperCase();
    };

    const handleOpenWarehouseForm = (wh?: Warehouse) => {
        if (wh) {
            setEditingWarehouse(wh);
            setWarehouseForm({ name: wh.name, code: wh.code, location: wh.location || '' });
        } else {
            setEditingWarehouse(null);
            setWarehouseForm({ name: '', code: '', location: '' });
        }
        setIsWarehouseFormOpen(true);
    };

    const handleSaveWarehouse = () => {
        if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) return;
        const code = warehouseForm.code.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
        if (editingWarehouse) {
            setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? { ...w, ...warehouseForm, code } : w));
            logAction(`تعديل بيانات المخزن: ${warehouseForm.name}`);
        } else {
            const newWh: Warehouse = {
                id: `WH-${Date.now()}`,
                code,
                name: warehouseForm.name,
                location: warehouseForm.location,
                isActive: true,
            };
            setWarehouses(prev => [...prev, newWh]);
            logAction(`إضافة مخزن جديد: ${warehouseForm.name} (${code})`);
        }
        setIsWarehouseFormOpen(false);
    };

    const handleDeleteWarehouse = (wh: Warehouse) => {
        const linked = products.filter(p => p.warehouseId === wh.id).length;
        if (linked > 0) {
            alert(`لا يمكن حذف المخزن "${wh.name}" لأنه مرتبط بـ ${linked} صنف. يرجى إعادة تعيين الأصناف أولاً.`);
            return;
        }
        if (window.confirm(`هل تريد حذف المخزن "${wh.name}"؟`)) {
            setWarehouses(prev => prev.filter(w => w.id !== wh.id));
            logAction(`حذف المخزن: ${wh.name}`);
        }
    };

    const handleToggleWarehouseActive = (id: string) => {
        setWarehouses(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">🏭 إدارة المخازن</h1>
                <div className="flex gap-3">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-center">
                        <div className="text-xs text-purple-500 font-medium">المخازن النشطة</div>
                        <div className="text-lg font-bold text-purple-700">{warehouses.filter(w => w.isActive).length} مخزن</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-center">
                        <div className="text-xs text-blue-500 font-medium">قيمة المخزون</div>
                        <div className="text-lg font-bold text-blue-700">{totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
                        <div className="text-xs text-red-500 font-medium">مخزون منخفض</div>
                        <div className="text-lg font-bold text-red-600">{lowStockProducts.length} صنف</div>
                    </div>
                </div>
            </div>

            {/* Low stock alert */}
            {lowStockProducts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center gap-2 text-sm text-yellow-800">
                    <span>⚠️</span>
                    <span>تنبيه: {lowStockProducts.map(p => p.name).join('، ')} - كميتها منخفضة</span>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === t.id ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}>
                            <span>{t.icon}</span>{t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* ── Tab: Warehouses Directory ── */}
                    {activeTab === 'warehouses' && (
                        <div>
                            <div className="flex justify-between items-center mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-700">دليل المخازن ({warehouses.length})</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">إدارة المخازن وتعيين كود البادئة لكل مخزن - يُستخدم لتكويد الأصناف تلقائياً</p>
                                </div>
                                <button onClick={() => handleOpenWarehouseForm()} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm font-semibold shadow-sm">
                                    <span>+</span> إضافة مخزن جديد
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {warehouses.map(wh => {
                                    const whProducts = products.filter(p => p.warehouseId === wh.id);
                                    const whValue = whProducts.reduce((s, p) => s + p.quantity * p.costPrice, 0);
                                    return (
                                        <div key={wh.id} className={`rounded-xl border-2 p-4 transition-all ${wh.isActive ? 'border-purple-200 bg-white shadow-sm hover:shadow-md' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm font-mono">{wh.code}</div>
                                                    <div>
                                                        <div className="font-bold text-gray-800 text-sm">{wh.name}</div>
                                                        {wh.location && <div className="text-xs text-gray-400 mt-0.5">📍 {wh.location}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleOpenWarehouseForm(wh)} title="تعديل" className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                    </button>
                                                    <button onClick={() => handleToggleWarehouseActive(wh.id)} title={wh.isActive ? 'إيقاف' : 'تفعيل'} className={`p-1.5 rounded-lg transition-colors ${wh.isActive ? 'hover:bg-yellow-100 text-yellow-600' : 'hover:bg-green-100 text-green-600'}`}>
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={wh.isActive ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'} /></svg>
                                                    </button>
                                                    <button onClick={() => handleDeleteWarehouse(wh)} title="حذف" className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                                                <div className="text-center">
                                                    <div className="text-lg font-bold text-blue-700">{whProducts.length}</div>
                                                    <div className="text-xs text-gray-500">صنف</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-lg font-bold text-green-700">{whValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                                                    <div className="text-xs text-gray-500">ج.م قيمة</div>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${wh.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                                    {wh.isActive ? '● نشط' : '○ موقوف'}
                                                </span>
                                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono mr-1">بادئة: {wh.code}-</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {warehouses.length === 0 && (
                                    <div className="col-span-3 text-center py-12 text-gray-400">
                                        <div className="text-5xl mb-3">🏪</div>
                                        <p>لا توجد مخازن. أضف مخزناً جديداً للبدء.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Products ── */}
                    {activeTab === 'products' && (
                        <div>
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                                <h2 className="text-lg font-bold text-gray-700">جميع الأصناف ({displayedProducts.length} / {products.length})</h2>
                                <div className="flex flex-wrap gap-2 items-center">
                                    {/* Filter by warehouse */}
                                    <select value={filterWarehouseId} onChange={e => setFilterWarehouseId(e.target.value)} className="border border-gray-300 rounded-lg p-2 text-sm text-gray-700 bg-white font-medium shadow-sm">
                                        <option value="">جميع المخازن ({products.length})</option>
                                        {warehouses.map(w => {
                                            const count = products.filter(p => p.warehouseId === w.id || (p.warehouseName && p.warehouseName.trim() === w.name.trim())).length;
                                            return <option key={w.id} value={w.id}>{w.name} ({count})</option>;
                                        })}
                                        <option value="__unassigned__">أصناف بدون مخزن ({products.filter(p => !p.warehouseId && !p.warehouseName).length})</option>
                                    </select>
                                    <button onClick={() => setIsImportOpen(true)} className="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 text-sm font-semibold shadow-sm">
                                        <span>📊</span> استيراد Excel
                                    </button>
                                    <button onClick={() => handleOpenAddProduct()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-semibold shadow-sm">
                                        <span>+</span> إضافة صنف جديد
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            {['كود الصنف', 'اسم الصنف', 'المخزن', 'الوحدة', 'الرصيد', 'سعر التكلفة', 'سعر البيع', 'القيمة', 'الحالة', 'إجراءات'].map(h => (
                                                <th key={h} className="p-3 text-xs font-semibold text-gray-600 tracking-wide">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {displayedProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-3 font-mono text-sm font-bold text-blue-700 bg-blue-50/50 rounded">{p.sku || p.id}</td>
                                                <td className="p-3 font-semibold text-gray-800">{p.name}</td>
                                                <td className="p-3">
                                                    <select
                                                        value={p.warehouseId || warehouses.find(w => w.name.trim() === (p.warehouseName || '').trim())?.id || ''}
                                                        onChange={(e) => {
                                                            const newWhId = e.target.value;
                                                            const newWh = warehouses.find(w => w.id === newWhId);
                                                            setProducts(prev => prev.map(item => item.id === p.id ? { ...item, warehouseId: newWhId, warehouseName: newWh?.name || '' } : item));
                                                            logAction(`تحديث مخزن الصنف ${p.name}: ${newWh?.name || 'غير محدد'}`);
                                                        }}
                                                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700 focus:ring-1 focus:ring-purple-500 font-medium cursor-pointer"
                                                    >
                                                        <option value="">-- غير محدد --</option>
                                                        {warehouses.map(w => (
                                                            <option key={w.id} value={w.id}>{w.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3 text-gray-600">{p.unit || 'عدد'}</td>
                                                <td className="p-3 font-bold text-center text-gray-800">{p.quantity.toLocaleString()}</td>
                                                <td className="p-3 text-center text-gray-700">{p.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-3 text-center text-gray-700">{p.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-3 text-center font-semibold text-blue-700">{(p.quantity * p.costPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-3 text-center">
                                                    {p.quantity <= 0 ? (
                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">نفد</span>
                                                    ) : p.quantity <= p.lowStockThreshold && p.lowStockThreshold > 0 ? (
                                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">منخفض</span>
                                                    ) : (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">متوفر</span>
                                                    )}
                                                </td>
                                                <td className="p-3 flex gap-2">
                                                    <button onClick={() => handleOpenAddProduct(p)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">تعديل</button>
                                                    <button onClick={() => { setSelectedProductId(p.id); setActiveTab('stock_card'); }} className="text-purple-500 hover:text-purple-700 text-xs font-medium">الكارت</button>
                                                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">حذف</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {displayedProducts.length === 0 && (
                                            <tr><td colSpan={10} className="p-8 text-center text-gray-400">لا توجد أصناف. أضف صنفاً جديداً للبدء.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Stock Card ── */}
                    {activeTab === 'stock_card' && (
                        <div>
                            <h2 className="text-lg font-bold text-gray-700 mb-4">كارت الصنف - حركة المخزون</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">اختر الصنف</label>
                                    <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                                        <option value="">-- جميع الأصناف --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">من تاريخ</label>
                                    <input type="date" value={cardDateStart} onChange={e => setCardDateStart(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">إلى تاريخ</label>
                                    <input type="date" value={cardDateEnd} onChange={e => setCardDateEnd(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={() => { setCardDateStart(''); setCardDateEnd(''); setSelectedProductId(''); }} className="w-full bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300">إعادة تعيين</button>
                                </div>
                            </div>

                            {cardProduct && (
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                                        <div className="text-xs text-blue-500">الرصيد الحالي</div>
                                        <div className="text-xl font-bold text-blue-700">{cardProduct.quantity.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                                        <div className="text-xs text-green-600">سعر التكلفة</div>
                                        <div className="text-xl font-bold text-green-700">{cardProduct.costPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                                        <div className="text-xs text-purple-600">إجمالي القيمة</div>
                                        <div className="text-xl font-bold text-purple-700">{(cardProduct.quantity * cardProduct.costPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            {['التاريخ', 'الصنف', 'نوع الحركة', 'وارد', 'صادر', 'سعر التكلفة', 'القيمة', 'الرصيد', 'المرجع', 'ملاحظات'].map(h => (
                                                <th key={h} className="p-2.5 text-xs font-semibold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {cardTransactions.map((tx, i) => (
                                            <tr key={tx.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                                                <td className="p-2.5 text-gray-600" style={{ direction: 'ltr', textAlign: 'right' }}>{tx.date}</td>
                                                <td className="p-2.5 font-medium text-gray-800">{tx.productName}</td>
                                                <td className="p-2.5">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge[tx.type]}`}>{typeLabel[tx.type]}</span>
                                                </td>
                                                <td className="p-2.5 text-center font-bold text-green-700">{tx.quantityIn > 0 ? tx.quantityIn.toLocaleString() : '-'}</td>
                                                <td className="p-2.5 text-center font-bold text-red-600">{tx.quantityOut > 0 ? tx.quantityOut.toLocaleString() : '-'}</td>
                                                <td className="p-2.5 text-center text-gray-600">{tx.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-2.5 text-center text-gray-700">{tx.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-2.5 text-center font-bold text-blue-700">{tx.balanceAfter.toLocaleString()}</td>
                                                <td className="p-2.5 text-xs text-gray-500 font-mono">{tx.referenceId || '-'}</td>
                                                <td className="p-2.5 text-xs text-gray-500">{tx.notes || '-'}</td>
                                            </tr>
                                        ))}
                                        {cardTransactions.length === 0 && (
                                            <tr><td colSpan={10} className="p-8 text-center text-gray-400">لا توجد حركات مطابقة للبحث</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {cardTransactions.length > 0 && (
                                <div className="mt-4 flex justify-end gap-6 text-sm font-semibold text-gray-700 bg-gray-50 p-3 rounded-lg border">
                                    <span className="text-green-700">إجمالي الوارد: {cardTransactions.reduce((s, t) => s + t.quantityIn, 0).toLocaleString()}</span>
                                    <span className="text-red-600">إجمالي الصادر: {cardTransactions.reduce((s, t) => s + t.quantityOut, 0).toLocaleString()}</span>
                                    <span className="text-blue-700">إجمالي القيمة: {cardTransactions.reduce((s, t) => s + t.totalCost, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: Adjustments ── */}
                    {activeTab === 'adjustments' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h2 className="text-lg font-bold text-gray-700 mb-4">إنشاء إذن مخازن يدوي</h2>
                                <div className="space-y-4 p-5 bg-gray-50 rounded-xl border">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">الصنف *</label>
                                        <select value={adjForm.productId} onChange={e => setAdjForm(f => ({ ...f, productId: e.target.value }))} className="w-full p-2.5 border rounded-lg">
                                            <option value="">-- اختر الصنف --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (رصيد: {p.quantity})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">نوع الإذن *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setAdjForm(f => ({ ...f, type: 'adjustment_in' }))}
                                                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${adjForm.type === 'adjustment_in' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-300'}`}>
                                                ➕ إذن إضافة
                                            </button>
                                            <button onClick={() => setAdjForm(f => ({ ...f, type: 'adjustment_out' }))}
                                                className={`p-3 rounded-lg border-2 text-sm font-bold transition-all ${adjForm.type === 'adjustment_out' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600 hover:border-red-300'}`}>
                                                ➖ إذن صرف
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">الكمية *</label>
                                            <input type="number" min="0" value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: Number(e.target.value) }))} className="w-full p-2.5 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">سعر التكلفة للوحدة</label>
                                            <input type="number" min="0" value={adjForm.unitCost} onChange={e => setAdjForm(f => ({ ...f, unitCost: Number(e.target.value) }))} className="w-full p-2.5 border rounded-lg" placeholder="اتركه فارغاً للسعر الافتراضي" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">التاريخ</label>
                                        <input type="date" value={adjForm.date} onChange={e => setAdjForm(f => ({ ...f, date: e.target.value }))} className="w-full p-2.5 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-600 mb-1">السبب / الملاحظات</label>
                                        <input type="text" value={adjForm.notes} onChange={e => setAdjForm(f => ({ ...f, notes: e.target.value }))} className="w-full p-2.5 border rounded-lg" placeholder="مثال: بضاعة تالفة، تسوية جرد..." />
                                    </div>
                                    <button onClick={handleSaveAdjustment} className={`w-full py-3 rounded-lg font-bold text-white transition-colors shadow ${adjForm.type === 'adjustment_in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                        {adjForm.type === 'adjustment_in' ? '✅ حفظ إذن الإضافة' : '🗑️ حفظ إذن الصرف'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-gray-700 mb-4">آخر الأذون</h2>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {stockTransactions.filter(t => t.type === 'adjustment_in' || t.type === 'adjustment_out').slice().reverse().slice(0, 20).map(tx => (
                                        <div key={tx.id} className={`p-3 rounded-lg border text-sm ${tx.type === 'adjustment_in' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-800">{tx.productName}</span>
                                                <span className={`font-bold ${tx.type === 'adjustment_in' ? 'text-green-700' : 'text-red-700'}`}>
                                                    {tx.type === 'adjustment_in' ? '+' : '-'}{(tx.quantityIn || tx.quantityOut).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                                <span>{tx.date}</span>
                                                <span>{tx.notes}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {!stockTransactions.some(t => t.type === 'adjustment_in' || t.type === 'adjustment_out') && (
                                        <div className="text-center text-gray-400 py-8">لا توجد أذون سابقة</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab: Physical Count ── */}
                    {activeTab === 'physical_count' && (
                        <div>
                            <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-700">الجرد الفعلي والتسوية</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">أدخل الكميات الفعلية بعد الجرد وسيقوم النظام بحساب الفروقات وعمل قيد التسوية تلقائياً</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ الجرد</label>
                                        <input type="date" value={countDate} onChange={e => setCountDate(e.target.value)} className="p-2 border rounded-lg text-sm" />
                                    </div>
                                    <button onClick={initPhysicalCount} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-bold mt-4">
                                        🔄 بدء الجرد
                                    </button>
                                </div>
                            </div>

                            {countItems.length > 0 ? (
                                <>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-gray-800 text-white">
                                                <tr>
                                                    {['الصنف', 'رصيد النظام', 'الكمية الفعلية', 'الفرق', 'الحالة'].map(h => (
                                                        <th key={h} className="p-3 text-xs font-semibold">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {countItems.map(ci => {
                                                    const diff = ci.actualQty - ci.systemQty;
                                                    const product = products.find(p => p.id === ci.productId)!;
                                                    return (
                                                        <tr key={ci.productId} className={`${diff !== 0 ? 'bg-yellow-50' : 'bg-white'} hover:bg-gray-50`}>
                                                            <td className="p-3 font-semibold text-gray-800">{product?.name}</td>
                                                            <td className="p-3 text-center text-gray-600 font-mono">{ci.systemQty}</td>
                                                            <td className="p-3 text-center">
                                                                <input
                                                                    type="number" min="0"
                                                                    value={ci.actualQty}
                                                                    onChange={e => setCountItems(prev => prev.map(c => c.productId === ci.productId ? { ...c, actualQty: Number(e.target.value) } : c))}
                                                                    className={`w-24 p-1.5 border rounded-lg text-center font-bold ${diff !== 0 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}`}
                                                                    disabled={countSubmitted}
                                                                />
                                                            </td>
                                                            <td className={`p-3 text-center font-bold ${diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                                {diff > 0 ? `+${diff}` : diff < 0 ? diff : '✓'}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {diff > 0 ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">زيادة</span>
                                                                    : diff < 0 ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">عجز</span>
                                                                        : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">متطابق</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {!countSubmitted && (
                                        <div className="flex justify-between items-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                            <div className="text-sm text-orange-800">
                                                <strong>ملاحظة:</strong> سيتم إنشاء قيود تسوية تلقائية لكل فرق ويتم تحديث الرصيد فوراً
                                            </div>
                                            <button onClick={handleSavePhysicalCount} className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-bold text-sm">
                                                💾 اعتماد الجرد
                                            </button>
                                        </div>
                                    )}
                                    {countSubmitted && (
                                        <div className="p-4 bg-green-50 border border-green-300 rounded-lg text-green-800 font-semibold text-center">
                                            ✅ تم اعتماد الجرد وتسوية الفروقات بنجاح
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16 text-gray-400">
                                    <div className="text-5xl mb-4">🔢</div>
                                    <p className="text-lg font-medium">اضغط "بدء الجرد" لإدخال الكميات الفعلية</p>
                                    <p className="text-sm mt-2">سيتم تحميل جميع الأصناف مع رصيدها الحالي من النظام</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Product Modal */}
            {isAddProductOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-5">{editingProduct ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h2>
                        <div className="space-y-4">
                            {/* Warehouse Selector - Most important field first */}
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <label className="block text-sm font-bold text-purple-700 mb-2">🏪 المخزن <span className="text-red-500">*</span></label>
                                <select
                                    value={productForm.warehouseId}
                                    onChange={e => {
                                        const whId = e.target.value;
                                        const wh = warehouses.find(w => w.id === whId);
                                        const newSku = !editingProduct && !productForm.sku ? generateSku() : productForm.sku;
                                        setProductForm(f => ({ ...f, warehouseId: whId, warehouseName: wh?.name || '', sku: newSku }));
                                    }}
                                    className="w-full p-2.5 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-300"
                                >
                                    <option value="">-- اختر المخزن --</option>
                                    {warehouses.filter(w => w.isActive).map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-600 mb-1">اسم الصنف *</label>
                                    <input type="text" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} className="w-full p-2.5 border rounded-lg" placeholder="مثال: ورق A4" autoFocus />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">كود الصنف (4-5 أرقام)</label>
                                    <input
                                        type="text"
                                        value={productForm.sku}
                                        onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                                        className="w-full p-2.5 border rounded-lg font-mono bg-gray-50 focus:bg-white text-blue-700 font-bold"
                                        placeholder="مثال: 1017"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">كود رقمي من 4 أو 5 أرقام يسهل حفظه</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">وحدة القياس</label>
                                    <select value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} className="w-full p-2.5 border rounded-lg">
                                        {['عدد', 'كيلو', 'طن', 'متر', 'لتر', 'صندوق', 'رزمة', 'كارتون'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">سعر التكلفة</label>
                                    <input type="number" min="0" value={productForm.costPrice} onChange={e => setProductForm(f => ({ ...f, costPrice: Number(e.target.value) }))} className="w-full p-2.5 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">سعر البيع</label>
                                    <input type="number" min="0" value={productForm.salePrice} onChange={e => setProductForm(f => ({ ...f, salePrice: Number(e.target.value) }))} className="w-full p-2.5 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">حد التنبيه (منخفض)</label>
                                    <input type="number" min="0" value={productForm.lowStockThreshold} onChange={e => setProductForm(f => ({ ...f, lowStockThreshold: Number(e.target.value) }))} className="w-full p-2.5 border rounded-lg" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsAddProductOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">إلغاء</button>
                            <button onClick={handleSaveProduct} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">حفظ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Warehouse Modal */}
            {isWarehouseFormOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-5">{editingWarehouse ? 'تعديل المخزن' : 'إضافة مخزن جديد'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">اسم المخزن *</label>
                                <input
                                    type="text" autoFocus
                                    value={warehouseForm.name}
                                    onChange={e => {
                                        const name = e.target.value;
                                        // Auto-generate code if not editing
                                        if (!editingWarehouse && !warehouseForm.code) {
                                            setWarehouseForm(f => ({ ...f, name, code: generateWarehouseCode(name) }));
                                        } else {
                                            setWarehouseForm(f => ({ ...f, name }));
                                        }
                                    }}
                                    className="w-full p-2.5 border rounded-lg"
                                    placeholder="مثال: مخزن القاهرة"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">كود البادئة (تلقائي) *</label>
                                <input
                                    type="text"
                                    value={warehouseForm.code}
                                    onChange={e => setWarehouseForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5) }))}
                                    className="w-full p-2.5 border rounded-lg font-mono bg-gray-50 uppercase"
                                    placeholder="مثال: CAI"
                                    maxLength={5}
                                />
                                <p className="text-xs text-gray-500 mt-1">سيُستخدم هذا الكود بادئة لكود كل صنف في هذا المخزن (مثال: CAI-0001)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">الموقع / العنوان</label>
                                <input
                                    type="text"
                                    value={warehouseForm.location}
                                    onChange={e => setWarehouseForm(f => ({ ...f, location: e.target.value }))}
                                    className="w-full p-2.5 border rounded-lg"
                                    placeholder="اختياري"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsWarehouseFormOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">إلغاء</button>
                            <button
                                onClick={handleSaveWarehouse}
                                disabled={!warehouseForm.name.trim() || !warehouseForm.code.trim()}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                حفظ المخزن
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Import Modal */}
            {isImportOpen && (
                <ExcelImportModal
                    importType="products"
                    onClose={() => setIsImportOpen(false)}
                    onImport={handleImportProducts}
                    warehouses={warehouses}
                    existingProducts={products}
                />
            )}
        </div>
    );
};

export default WarehouseModule;
