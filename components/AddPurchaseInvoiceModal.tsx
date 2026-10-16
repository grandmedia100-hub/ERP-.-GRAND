
import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier, Product, InvoiceItem, PurchaseInvoice, Expense } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddPurchaseInvoiceModalProps {
    onClose: () => void;
    onSave: (invoice: Omit<PurchaseInvoice, 'id'> & { id?: string }, type?: 'purchase' | 'return') => void;
    suppliers: Supplier[];
    products: Product[];
    invoiceToEdit: PurchaseInvoice | null;
    existingInvoices: PurchaseInvoice[];
    onAddExpense?: (expense: Expense) => void;
}

const AddPurchaseInvoiceModal: React.FC<AddPurchaseInvoiceModalProps> = ({ onClose, onSave, suppliers, products, invoiceToEdit, existingInvoices, onAddExpense }) => {
    // State
    const [supplierId, setSupplierId] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ productId: '', productName: '', quantity: 1, price: 0, unit: 'عدد', priceType: 'سعر الوحدة', itemType: 'product' }]);
    const [paymentMethod, setPaymentMethod] = useState<'نقدي' | 'اجل' | 'شيك'>('اجل');
    const [notes, setNotes] = useState('');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    // Search State
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

    const isEditing = !!invoiceToEdit && !!invoiceToEdit.id;

    // Derived State
    const uniqueCompanyNames = useMemo(() => {
        const names = new Set(existingInvoices.map(inv => inv.companyName).filter(Boolean));
        return Array.from(names);
    }, [existingInvoices]);

    const subTotal = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }, [items]);

    const total = useMemo(() => {
        let final = subTotal;
        if (discountType === 'percentage') {
            final = subTotal - (subTotal * (discountValue / 100));
        } else {
            final = subTotal - discountValue;
        }
        return Math.max(0, final);
    }, [subTotal, discountValue, discountType]);

    // Effects
    useEffect(() => {
        if (isEditing && invoiceToEdit) {
            setSupplierId(invoiceToEdit.supplierId);
            setCompanyName(invoiceToEdit.companyName || '');
            setDate(invoiceToEdit.date);
            setItems(invoiceToEdit.items.map(i => ({ ...i }))); // Deep copy items
            setPaymentMethod(invoiceToEdit.paymentMethod);
            setNotes(invoiceToEdit.notes || '');
            setDiscountValue(invoiceToEdit.discountValue || 0);
            setDiscountType(invoiceToEdit.discountType || 'percentage');
            // Set search term for supplier
            const supplier = suppliers.find(s => s.id === invoiceToEdit.supplierId);
            setSupplierSearchTerm(supplier ? supplier.name : '');
        } else {
            // Reset form for new invoice
            setSupplierId('');
            setCompanyName('');
            setDate(new Date().toISOString().split('T')[0]);
            setItems([{ productId: '', productName: '', quantity: 1, price: 0, unit: 'عدد', priceType: 'سعر الوحدة', itemType: 'product' }]);
            setPaymentMethod('اجل');
            setNotes('');
            setDiscountValue(0);
            setDiscountType('percentage');
            setSupplierSearchTerm('');
        }
    }, [invoiceToEdit, isEditing, suppliers]);

    // Handlers
    const showAlert = (msg: string) => {
        setAlertMessage(msg);
        setIsAlertOpen(true);
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCompanyName(e.target.value);
    };

    // Handle Supplier Search Change
    const handleSupplierSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSupplierSearchTerm(value);
        setShowSupplierDropdown(true);

        // If search is cleared, clear selection
        if (!value) {
            setSupplierId('');
        }
    };

    // Handle Supplier Selection from dropdown
    const handleSupplierSelect = (supplier: Supplier) => {
        setSupplierId(supplier.id);
        setSupplierSearchTerm(supplier.name);
        setShowSupplierDropdown(false);
    };

    // Filter suppliers based on search term
    const filteredSuppliers = useMemo(() => {
        if (!supplierSearchTerm) return suppliers;
        const searchLower = supplierSearchTerm.toLowerCase();
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchLower) ||
            (s.companyName && s.companyName.toLowerCase().includes(searchLower))
        );
    }, [suppliers, supplierSearchTerm]);

    // Item Management
    const calculateItemTotal = (item: Partial<InvoiceItem>) => {
        const qty = item.quantity || 0;
        const price = item.price || 0;
        if (item.unit === 'كيلو' && item.priceType === 'سعر الطن') {
            return (qty / 1000) * price;
        }
        return qty * price;
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Auto-fill details if product selected
        if (field === 'productName') {
            // Handle product selection (optional: auto-fill price from product list if available)
            const product = products.find(p => p.name === value);
            if (product) {
                item.productId = product.id;
                if (!item.price) item.price = product.costPrice; // Use cost price for purchases
            }
        }

        item.total = calculateItemTotal(item);
        newItems[index] = item;
        setItems(newItems);
    };

    const addItemRow = () => {
        setItems([...items, { productId: '', productName: '', quantity: 1, price: 0, unit: 'عدد', priceType: 'سعر الوحدة', itemType: 'product' }]);
    };

    const removeItemRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleAutoExpense = (invoiceId: string, item: InvoiceItem) => {
        if (item.itemType === 'expense' && onAddExpense) {
            const newExpense: Expense = {
                id: `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                voucherNumber: invoiceId,
                date: date,
                category: item.productName, // Use item name as category
                description: `شراء: ${item.productName} - فاتورة ${invoiceId}`,
                amount: item.total,
                status: 'active'
            };
            onAddExpense(newExpense);
        }
    };

    const handleSubmit = () => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) { showAlert('الرجاء اختيار مورد'); return; }

        const finalItems = items.filter(item => item.productName && (item.quantity || 0) > 0).map(item => ({
            ...item,
            unit: item.unit || 'عدد',
            priceType: item.priceType || 'سعر الوحدة',
            itemType: item.itemType || 'product'
        } as InvoiceItem));

        if (finalItems.length === 0) { showAlert('الرجاء إضافة صنف واحد على الأقل وتحديد الكمية'); return; }

        const isDuplicate = existingInvoices.some(inv =>
            inv.status !== 'voided' &&
            inv.id !== invoiceToEdit?.id &&
            inv.supplierId === supplierId &&
            inv.date === date &&
            Math.abs(inv.total - total) < 0.01 &&
            inv.paymentMethod === paymentMethod
        );

        if (isDuplicate) {
            showAlert('تنبيه: توجد فاتورة شراء مسجلة بنفس البيانات (المورد، التاريخ، المبلغ). يرجى التحقق.');
            return;
        }

        setIsSubmitting(true);

        // Generate ID if new
        const currentYear = new Date().getFullYear();
        const tempId = invoiceToEdit?.id || `PUR-${currentYear}-${(existingInvoices.length + 1).toString().padStart(3, '0')}`;

        // Process Auto Expenses for new invoices
        if (!isEditing && onAddExpense) {
            finalItems.forEach(item => handleAutoExpense(tempId, item));
        }

        onSave({
            id: invoiceToEdit?.id,
            supplierId,
            supplierName: supplier.name,
            companyName,
            date,
            items: finalItems,
            subTotal,
            discountValue,
            discountType,
            total,
            paymentMethod,
            notes,
            invoiceType: invoiceToEdit?.invoiceType || 'purchase'
        }, invoiceToEdit?.invoiceType || 'purchase');
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            aria-modal="true" role="dialog" onClick={onClose}
        >
            <datalist id="products-datalist">
                {products.map(p => (
                    <option key={p.id} value={p.name}>{`تكلفة: ${p.costPrice} - كمية: ${p.quantity}`}</option>
                ))}
            </datalist>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                        {isEditing
                            ? `تعديل فاتورة ${invoiceToEdit.invoiceType === 'return' ? 'مرتجع' : ''} ${invoiceToEdit.id}`
                            : (invoiceToEdit?.invoiceType === 'return' ? 'فاتورة مرتجع مشتريات جديدة' : 'فاتورة مشتريات جديدة')
                        }
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Company Name */}
                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">اسم الشركة (اختياري)</label>
                            <select
                                id="companyName"
                                value={companyName}
                                onChange={handleCompanyChange}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white"
                            >
                                <option value="">-- اختر شركة --</option>
                                {uniqueCompanyNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 2. Supplier */}
                        <div className="relative">
                            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
                            <input
                                id="supplier"
                                type="text"
                                value={supplierSearchTerm}
                                onChange={handleSupplierSearchChange}
                                onFocus={() => setShowSupplierDropdown(true)}
                                onBlur={() => setTimeout(() => setShowSupplierDropdown(false), 200)}
                                placeholder="ابحث عن مورد..."
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            />
                            {showSupplierDropdown && filteredSuppliers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredSuppliers.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => handleSupplierSelect(s)}
                                            className="p-2 hover:bg-green-50 cursor-pointer border-b last:border-b-0"
                                        >
                                            <div className="font-semibold text-gray-800">{s.name}</div>
                                            {s.companyName && <div className="text-xs text-gray-500">{s.companyName}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">طريقة السداد</label>
                            <select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="اجل">اجل</option>
                                <option value="نقدي">نقدي</option>
                                <option value="شيك">شيك</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-right min-w-[900px]">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-sm font-semibold tracking-wide w-[12%]">النوع</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide w-[25%]">الصنف / المصروف</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">الكمية</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">الوحدة</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">السعر</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">نوع السعر</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">الإجمالي</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item, index) => (
                                    <tr className="border-b" key={index}>
                                        <td className="p-2 align-top">
                                            <select
                                                value={item.itemType || 'product'}
                                                onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                                                className={`w-full p-2 border rounded-md text-sm font-bold ${item.itemType === 'expense' ? 'text-red-600 bg-red-50 border-red-200' : 'text-gray-700 bg-white border-gray-300'}`}
                                            >
                                                <option value="product">صنف (مخزون)</option>
                                                <option value="expense">مصروف</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="text"
                                                list={item.itemType === 'expense' ? undefined : "products-datalist"}
                                                value={item.productName || ''}
                                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                placeholder={item.itemType === 'expense' ? "اسم المصروف" : "اكتب اسم الصنف أو اختر"}
                                                className="w-full p-2 border rounded-md"
                                            />
                                            <textarea
                                                value={item.description || ''}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                placeholder="المواصفات (اختياري)"
                                                className="w-full p-1 mt-1 border rounded-md text-xs text-gray-600"
                                                rows={1}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="number"
                                                value={item.quantity || 1}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                                min="1"
                                                className="w-20 p-2 border rounded-md text-center"
                                                disabled={!item.productName}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <select
                                                value={item.unit || 'عدد'}
                                                onChange={(e) => handleItemChange(index, 'unit', e.target.value as 'عدد' | 'كيلو')}
                                                className="w-20 p-2 border rounded-md"
                                                disabled={!item.productName}
                                            >
                                                <option value="عدد">عدد</option>
                                                <option value="كيلو">كيلو</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="number"
                                                value={item.price || 0}
                                                onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                className="w-24 p-2 border rounded-md text-center"
                                                disabled={!item.productName}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <select
                                                value={item.priceType || 'سعر الوحدة'}
                                                onChange={(e) => handleItemChange(index, 'priceType', e.target.value as 'سعر الوحدة' | 'سعر الطن')}
                                                className="w-28 p-2 border rounded-md text-xs"
                                                disabled={!item.productName || item.unit !== 'كيلو'}
                                            >
                                                <option value="سعر الوحدة">سعر الوحدة</option>
                                                <option value="سعر الطن">سعر الطن</option>
                                            </select>
                                        </td>
                                        <td className="p-2 text-center align-top font-bold">{item.total?.toLocaleString('en-US') || 0}</td>
                                        <td className="p-2 text-center align-top">
                                            <button onClick={() => removeItemRow(index)} className="text-red-500 hover:text-red-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button onClick={addItemRow} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm">+ إضافة صنف</button>

                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="w-full md:w-1/2">
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={4}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                                placeholder="أي ملاحظات إضافية على الفاتورة"
                            />
                        </div>
                        <div className="w-full md:w-1/2 lg:w-2/5 space-y-3 self-end border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold text-gray-700">المجموع الفرعي:</span>
                                <span className="font-bold text-gray-800">{subTotal.toLocaleString('en-US')} ج.م</span>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-700">الخصم:</span>
                                    <select
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value as any)}
                                        className="text-xs border rounded p-1"
                                    >
                                        <option value="percentage">نسبة (%)</option>
                                        <option value="amount">مبلغ ثابت</option>
                                    </select>
                                </div>
                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    className="w-24 p-1 border rounded text-center font-bold"
                                    min="0"
                                />
                            </div>

                            <div className="flex justify-between items-center text-xl pt-2 border-t border-gray-300">
                                <span className="font-bold text-gray-800">الصافي:</span>
                                <span className="font-bold text-green-600">{total.toLocaleString('en-US')} ج.م</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100" disabled={isSubmitting}>إلغاء</button>
                    <button onClick={handleSubmit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'حفظ الفاتورة')}</button>
                </div>
            </div>
            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={alertMessage}
            />
        </div>
    );
};

export default AddPurchaseInvoiceModal;
