
import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, Product, InvoiceItem, SalesInvoice, PaymentInstallment } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddSalesInvoiceModalProps {
    onClose: () => void;
    onSave: (invoice: Omit<SalesInvoice, 'id'> & { id?: string }, type?: 'sale' | 'return') => void;
    customers: Customer[];
    products: Product[];
    invoiceToEdit: SalesInvoice | null;
    existingInvoices: SalesInvoice[];
    branches?: { id: string; name: string }[];
    currentBranchId?: string;
}

const AddSalesInvoiceModal: React.FC<AddSalesInvoiceModalProps> = ({ onClose, onSave, customers, products, invoiceToEdit, existingInvoices, branches, currentBranchId }) => {
    const [customerId, setCustomerId] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ productName: '', description: '', quantity: 1, price: 0, cost: 0, total: 0, itemType: 'product' }]);
    const [paymentMethod, setPaymentMethod] = useState<'نقدي' | 'اجل' | 'شيك'>('اجل');
    const [notes, setNotes] = useState('');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');

    // Inter-company state
    const [isIntercompany, setIsIntercompany] = useState<boolean>(false);
    const [targetBranchId, setTargetBranchId] = useState<string>('');

    // Payment Schedule State
    const [schedule, setSchedule] = useState<PaymentInstallment[]>([]);
    const [showSchedule, setShowSchedule] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Alert State
    const [alertMessage, setAlertMessage] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    // Search State
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const isEditing = !!invoiceToEdit && !!invoiceToEdit.id;

    // Extract unique company names for the dropdown
    const uniqueCompanyNames = useMemo(() => {
        const names = new Set(customers.map(c => c.companyName).filter(Boolean));
        return Array.from(names) as string[];
    }, [customers]);

    // Auto-fill on initial load if editing
    useEffect(() => {
        if (isEditing && invoiceToEdit) {
            setCustomerId(invoiceToEdit.customerId);
            setCompanyName(invoiceToEdit.companyName || '');
            setDate(invoiceToEdit.date);
            setItems((invoiceToEdit.items || []).map(item => {
                const prod = products.find(p => p.id === item.productId || p.name === item.productName);
                return {
                    ...item,
                    productCode: item.productCode || item.sku || prod?.sku || prod?.barcode || prod?.id || ''
                };
            }));
            setPaymentMethod(invoiceToEdit.paymentMethod);
            setNotes(invoiceToEdit.notes || '');
            setSchedule(invoiceToEdit.paymentSchedule || []);
            setShowSchedule((invoiceToEdit.paymentSchedule && invoiceToEdit.paymentSchedule.length > 0) || false);
            setDiscountValue(invoiceToEdit.discountValue || 0);
            setDiscountType(invoiceToEdit.discountType || 'percentage');
            setIsIntercompany(!!invoiceToEdit.isIntercompany);
            setTargetBranchId(invoiceToEdit.targetBranchId || '');
            // Set search term for customer
            const customer = customers.find(c => c.id === invoiceToEdit.customerId);
            setCustomerSearchTerm(customer ? customer.name : (invoiceToEdit.customerName || ''));
        } else {
            // Reset for new invoice (or new return)
            setCustomerId('');
            setCompanyName('');
            setDate(new Date().toISOString().split('T')[0]);
            setItems([{ productName: '', productCode: '', description: '', quantity: 1, price: 0, cost: 0, total: 0, itemType: 'product' }]);
            setPaymentMethod('اجل');
            setNotes('');
            setSchedule([]);
            setShowSchedule(false);
            setDiscountValue(0);
            setDiscountType('percentage');
            setCustomerSearchTerm('');
            setIsIntercompany(false);
            setTargetBranchId('');
        }
    }, [invoiceToEdit, isEditing, customers]);

    // Handle Customer Search Change
    const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCustomerSearchTerm(value);
        setShowCustomerDropdown(true);

        if (value) {
            checkAndAutoSetIntercompany(value, companyName);
        } else {
            setCustomerId('');
            setCompanyName('');
        }
    };

    const checkAndAutoSetIntercompany = (name: string, company: string = '') => {
        const text = (name + ' ' + company).toLowerCase();
        const otherBranch = branches?.find(b => b.id !== currentBranchId && (
            text.includes(b.name.toLowerCase()) ||
            (b.name.includes('برو') && text.includes('برو')) ||
            (b.name.includes('جراند') && text.includes('جراند')) ||
            (b.name.includes('مصنع') && text.includes('مصنع'))
        ));
        if (otherBranch) {
            setIsIntercompany(true);
            setTargetBranchId(otherBranch.id);
        }
    };

    // Handle Customer Selection from dropdown
    const handleCustomerSelect = (customer: Customer) => {
        setCustomerId(customer.id);
        setCustomerSearchTerm(customer.name);
        setCompanyName(customer.companyName || '');
        checkAndAutoSetIntercompany(customer.name, customer.companyName || '');
        setShowCustomerDropdown(false);
    };

    // Filter customers based on search term
    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm) return customers;
        const searchLower = customerSearchTerm.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(searchLower) ||
            (c.companyName && c.companyName.toLowerCase().includes(searchLower))
        );
    }, [customers, customerSearchTerm]);

    // Handle Company Selection Change -> Auto fill Customer
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCompany = e.target.value;
        setCompanyName(selectedCompany);

        // Find the first customer associated with this company
        const associatedCustomer = customers.find(c => c.companyName === selectedCompany);
        if (associatedCustomer) {
            setCustomerId(associatedCustomer.id);
            setCustomerSearchTerm(associatedCustomer.name);
            checkAndAutoSetIntercompany(associatedCustomer.name, selectedCompany);
        } else {
            checkAndAutoSetIntercompany('', selectedCompany);
        }
    };

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isAlertOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isAlertOpen]);

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        const currentItem = { ...newItems[index] };
        (currentItem as any)[field] = value;

        if (field === 'itemType') {
            // Reset fields when type changes
            currentItem.productId = undefined;
            currentItem.productName = '';
            currentItem.productCode = '';
            currentItem.sku = '';
            currentItem.barcode = '';
            currentItem.price = 0;
            currentItem.cost = 0;
            currentItem.total = 0;
        }

        if (field === 'productName' && currentItem.itemType !== 'expense') {
            const trimmed = (value || '').trim();
            const product = products.find(p =>
                p.name.toLowerCase() === trimmed.toLowerCase() ||
                (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase()) ||
                (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
                p.id.toLowerCase() === trimmed.toLowerCase()
            );
            if (product) {
                currentItem.productId = product.id;
                currentItem.productName = product.name;
                currentItem.productCode = product.sku || product.barcode || product.id;
                currentItem.sku = product.sku;
                currentItem.barcode = product.barcode;
                currentItem.price = product.salePrice;
                currentItem.cost = product.costPrice || 0; // Default to product cost if available
            } else {
                currentItem.productId = undefined;
            }
        }

        if (field === 'productCode' && currentItem.itemType !== 'expense') {
            const trimmed = (value || '').trim();
            const product = products.find(p =>
                (p.sku && p.sku.toLowerCase() === trimmed.toLowerCase()) ||
                (p.barcode && p.barcode.toLowerCase() === trimmed.toLowerCase()) ||
                p.id.toLowerCase() === trimmed.toLowerCase() ||
                p.name.toLowerCase() === trimmed.toLowerCase()
            );
            if (product) {
                currentItem.productId = product.id;
                currentItem.productName = product.name;
                currentItem.productCode = product.sku || product.barcode || product.id;
                currentItem.sku = product.sku;
                currentItem.barcode = product.barcode;
                currentItem.price = product.salePrice;
                currentItem.cost = product.costPrice || 0;
            } else {
                currentItem.productCode = value;
            }
        }

        currentItem.total = (currentItem.quantity || 0) * (currentItem.price || 0);
        newItems[index] = currentItem;
        setItems(newItems);
    };

    const addItemRow = () => setItems([...items, { productName: '', productCode: '', description: '', quantity: 1, price: 0, cost: 0, total: 0, itemType: 'product' }]);
    const removeItemRow = (index: number) => setItems(items.filter((_, i) => i !== index));

    const subTotal = useMemo(() => {
        return items.reduce((acc, item) => acc + (item.total || 0), 0);
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

    // Credit Limit & Overdue Checks
    const selectedCustomer = useMemo(() => {
        return customers.find(c => c.id === customerId);
    }, [customers, customerId]);

    const customerCurrentBalance = useMemo(() => {
        if (!customerId) return 0;
        const cust = customers.find(c => c.id === customerId);
        const openBal = cust?.openingBalance || 0;
        const invoicesTotal = (existingInvoices || [])
            .filter(inv => inv.customerId === customerId && inv.status !== 'voided')
            .reduce((sum, inv) => inv.invoiceType === 'return' ? sum - inv.total : sum + inv.total, 0);
        return openBal + invoicesTotal;
    }, [customerId, customers, existingInvoices]);

    const creditLimitExceededInfo = useMemo(() => {
        if (!selectedCustomer || paymentMethod !== 'اجل') return null;
        if (selectedCustomer.isCreditLocked) {
            return {
                isLocked: true,
                reason: 'البيع الآجل مجمد يدوياً لهذا العميل بأمر الإدارة.'
            };
        }
        if (selectedCustomer.creditLimit && selectedCustomer.creditLimit > 0) {
            const projectedBalance = customerCurrentBalance + total;
            if (projectedBalance > selectedCustomer.creditLimit) {
                const diff = projectedBalance - selectedCustomer.creditLimit;
                return {
                    isLocked: false,
                    isExceeded: true,
                    limit: selectedCustomer.creditLimit,
                    current: customerCurrentBalance,
                    projected: projectedBalance,
                    diff,
                    reason: `تجاوز الحد الائتماني بمقدار ${diff.toLocaleString()} ج.م (الحد: ${selectedCustomer.creditLimit.toLocaleString()} ج.م / الرصيد بعد الفاتورة: ${projectedBalance.toLocaleString()} ج.م)`
                };
            }
        }
        return null;
    }, [selectedCustomer, paymentMethod, customerCurrentBalance, total]);

    // Schedule Handlers
    const addInstallment = () => {
        const remainingAmount = total - schedule.reduce((sum, i) => sum + i.amount, 0);
        const newInstallment: PaymentInstallment = {
            id: `INST-${Date.now()}`,
            date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Default 30 days
            amount: remainingAmount > 0 ? remainingAmount : 0,
            isPaid: false
        };
        setSchedule([...schedule, newInstallment]);
    };

    const updateInstallment = (index: number, field: keyof PaymentInstallment, value: any) => {
        const newSchedule = [...schedule];
        (newSchedule[index] as any)[field] = value;
        setSchedule(newSchedule);
    };

    const removeInstallment = (index: number) => {
        setSchedule(schedule.filter((_, i) => i !== index));
    };

    const showAlert = (msg: string) => {
        setAlertMessage(msg);
        setIsAlertOpen(true);
    };

    const handleSubmit = () => {
        let customer = customers.find(c => c.id === customerId);
        if (!customer && isIntercompany && targetBranchId) {
            const targetName = branches?.find(b => b.id === targetBranchId)?.name || 'الكيان الشقيق';
            customer = {
                id: customerId || `ic_${targetBranchId}`,
                name: customerSearchTerm || targetName,
                openingBalance: 0,
                phone: '',
                address: ''
            };
        }
        if (!customer) { showAlert('الرجاء اختيار عميل'); return; }

        const finalItems = items.filter(item => item.productName && (item.quantity || 0) > 0).map(item => ({
            ...item,
            itemType: item.itemType || 'product'
        } as InvoiceItem));

        if (finalItems.length === 0) { showAlert('الرجاء إضافة صنف واحد على الأقل وتحديد الكمية'); return; }

        // Credit Limit and Locked Account Check
        if (creditLimitExceededInfo) {
            if (creditLimitExceededInfo.isLocked) {
                showAlert('🚫 عفواً: لا يمكن إصدار فاتورة آجلة لهذا العميل، حيث أن البيع الآجل مجمد حالياً لهذا الحساب بأمر الإدارة.');
                return;
            }
            if (creditLimitExceededInfo.isExceeded) {
                const proceed = window.confirm(
                    `⚠️ تنبيه ائتماني:\n${creditLimitExceededInfo.reason}\n\nهل ترغب في تجاوز الحد الائتماني واعتماد الفاتورة (اعتماد إداري)؟`
                );
                if (!proceed) return;
            }
        }

        // Logical Duplicate Check (Ignore voided)
        const isDuplicate = existingInvoices.some(inv =>
            inv.status !== 'voided' &&
            inv.id !== invoiceToEdit?.id && // Don't match self
            inv.customerId === customerId &&
            inv.date === date &&
            Math.abs(inv.total - total) < 0.01 && // Float comparison
            inv.paymentMethod === paymentMethod
        );

        if (isDuplicate) {
            showAlert('تنبيه: توجد فاتورة أخرى مسجلة بنفس البيانات (العميل، التاريخ، المبلغ، وطريقة الدفع). يرجى التحقق لمنع التكرار.');
            return;
        }

        setIsSubmitting(true);

        onSave({
            id: invoiceToEdit?.id,
            customerId: customer.id,
            customerName: customer.name,
            companyName,
            date,
            items: finalItems,
            subTotal,
            discountValue,
            discountType,
            total,
            paymentMethod,
            notes,
            paymentSchedule: schedule,
            invoiceType: invoiceToEdit?.invoiceType || 'sale',
            isIntercompany,
            targetBranchId: isIntercompany ? targetBranchId : undefined
        }, invoiceToEdit?.invoiceType || 'sale');
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            aria-modal="true" role="dialog" onClick={onClose}
        >
            <datalist id="products-datalist-sales">
                {products.map(p => (
                    <option key={p.id} value={p.name}>{`كود: ${p.sku || p.id} | سعر: ${p.salePrice} | رصيد: ${p.quantity}`}</option>
                ))}
            </datalist>
            <datalist id="products-codes-datalist-sales">
                {products.map(p => (
                    <option key={p.id} value={p.sku || p.id}>{`${p.name} (سعر: ${p.salePrice})`}</option>
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
                            : (invoiceToEdit?.invoiceType === 'return' ? 'فاتورة مرتجع مبيعات جديدة' : 'فاتورة مبيعات جديدة')
                        }
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Inter-Company Movement Option */}
                    {branches && branches.length > 1 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={isIntercompany}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setIsIntercompany(checked);
                                            if (checked) {
                                                const defaultTarget = branches.find(b => b.id !== currentBranchId);
                                                if (defaultTarget) {
                                                    setTargetBranchId(defaultTarget.id);
                                                    setCustomerSearchTerm(defaultTarget.name);
                                                    setCustomerId(`ic_${defaultTarget.id}`);
                                                }
                                            }
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                                        <span>🏢</span>
                                        <span>تسجيل كـ حركة بينية (إنشاء فاتورة مشتريات مقابلة تلقائياً)</span>
                                    </span>
                                </label>
                                {isIntercompany && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-700">الكيان المستلم:</span>
                                        <select
                                            value={targetBranchId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTargetBranchId(val);
                                                const b = branches.find(x => x.id === val);
                                                if (b) {
                                                    setCustomerSearchTerm(b.name);
                                                    setCustomerId(`ic_${b.id}`);
                                                }
                                            }}
                                            className="p-1.5 border border-blue-300 rounded-md text-sm bg-white font-medium text-blue-900 shadow-sm"
                                        >
                                            {branches.filter(b => b.id !== currentBranchId).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {isIntercompany && (
                                <p className="text-xs text-blue-700 mt-2 mr-6">
                                    💡 بمجرد حفظ الفاتورة، سيقوم النظام تلقائياً بإنشاء فاتورة مشتريات واردة في دفاتر <strong>{branches.find(b => b.id === targetBranchId)?.name}</strong> بنفس الأصناف والأسعار دون الحاجة لإعادة كتابتها.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. Company Name (Swapped to First) */}
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

                        {/* 2. Customer (Swapped to Second) */}
                        <div className="relative">
                            <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                            <input
                                id="customer"
                                type="text"
                                value={customerSearchTerm}
                                onChange={handleCustomerSearchChange}
                                onFocus={() => setShowCustomerDropdown(true)}
                                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                placeholder="ابحث عن عميل..."
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            />
                            {showCustomerDropdown && filteredCustomers.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    {filteredCustomers.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => handleCustomerSelect(c)}
                                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                        >
                                            <div className="font-semibold text-gray-800">{c.name}</div>
                                            {c.companyName && <div className="text-xs text-gray-500">{c.companyName}</div>}
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

                    {/* Credit Limit Alert Banner */}
                    {creditLimitExceededInfo && (
                        <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-fadeIn ${
                            creditLimitExceededInfo.isLocked
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                            <span className="text-base shrink-0">{creditLimitExceededInfo.isLocked ? '🚫' : '⚠️'}</span>
                            <div className="flex-1">
                                <span className="font-bold block">
                                    {creditLimitExceededInfo.isLocked ? 'حساب العميل مجمد ائتمانياً' : 'تنبيه: تجاوز سقف الائتمان المسموح به'}
                                </span>
                                <p className="mt-0.5 leading-relaxed">{creditLimitExceededInfo.reason}</p>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-right min-w-[700px]">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-sm font-semibold tracking-wide w-[11%]">النوع</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide w-[14%]">كود الصنف</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide w-[25%]">الصنف / الخدمة</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">الكمية</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide">السعر</th>
                                    <th className="p-3 text-sm font-semibold tracking-wide text-gray-500">التكلفة (تقديري)</th>
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
                                                className={`w-full p-2 border rounded-md text-sm font-bold ${item.itemType === 'expense' ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-gray-700 bg-white border-gray-300'}`}
                                            >
                                                <option value="product">صنف (مخزون)</option>
                                                <option value="expense">خدمة / آخر</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            {item.itemType === 'expense' ? (
                                                <span className="text-xs text-gray-400 block pt-2 text-center">-</span>
                                            ) : (
                                                <input
                                                    type="text"
                                                    list="products-codes-datalist-sales"
                                                    value={item.productCode || ''}
                                                    onChange={(e) => handleItemChange(index, 'productCode', e.target.value)}
                                                    placeholder="كود الصنف"
                                                    className="w-full p-2 border border-gray-300 rounded-md font-mono text-xs text-blue-900 bg-gray-50 focus:bg-white"
                                                />
                                            )}
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="text"
                                                list={item.itemType === 'expense' ? undefined : "products-datalist-sales"}
                                                value={item.productName || ''}
                                                onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                placeholder={item.itemType === 'expense' ? "اسم الخدمة (مثل شحن)" : "اكتب اسم الصنف أو اختر"}
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
                                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10))}
                                                min="1"
                                                className="w-24 p-2 border rounded-md text-center"
                                                disabled={!item.productName}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="number"
                                                value={item.price || 0}
                                                onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                className="w-28 p-2 border rounded-md text-center"
                                                disabled={!item.productName}
                                            />
                                        </td>
                                        <td className="p-2 align-top">
                                            <input
                                                type="number"
                                                value={item.cost || 0}
                                                onChange={(e) => handleItemChange(index, 'cost', parseFloat(e.target.value) || 0)}
                                                min="0"
                                                step="0.01"
                                                className="w-24 p-2 border border-gray-300 bg-gray-50 rounded-md text-center text-gray-600 text-xs"
                                                placeholder="التكلفة"
                                                title="التكلفة التقديرية لهذا البند"
                                            />
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
                    <button onClick={addItemRow} className="bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm">+ إضافة بند</button>

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
                                <span className="font-bold text-blue-600">{total.toLocaleString('en-US')} ج.م</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Schedule Section */}
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                جدولة الدفعات (الأقساط)
                            </h3>
                            <button
                                onClick={() => setShowSchedule(!showSchedule)}
                                className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                            >
                                {showSchedule ? 'إخفاء الجدولة' : 'إظهار الجدولة'}
                            </button>
                        </div>

                        {showSchedule && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <table className="w-full text-right mb-2">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-sm text-gray-600">تاريخ الاستحقاق</th>
                                            <th className="p-2 text-sm text-gray-600">المبلغ</th>
                                            <th className="p-2 text-sm text-gray-600">الحالة</th>
                                            <th className="p-2 text-sm text-gray-600">ملاحظات</th>
                                            <th className="p-2 text-sm"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedule.map((inst, idx) => (
                                            <tr key={idx} className="border-b border-blue-200">
                                                <td className="p-2">
                                                    <input
                                                        type="date"
                                                        value={inst.date}
                                                        onChange={(e) => updateInstallment(idx, 'date', e.target.value)}
                                                        className="p-1 border rounded w-full text-sm"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={inst.amount}
                                                        onChange={(e) => updateInstallment(idx, 'amount', parseFloat(e.target.value))}
                                                        className="p-1 border rounded w-full text-sm font-bold"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <select
                                                        value={inst.isPaid ? 'true' : 'false'}
                                                        onChange={(e) => updateInstallment(idx, 'isPaid', e.target.value === 'true')}
                                                        className={`p-1 border rounded w-full text-sm ${inst.isPaid ? 'text-green-600 font-bold' : 'text-red-600'}`}
                                                    >
                                                        <option value="false">غير مدفوع</option>
                                                        <option value="true">مدفوع</option>
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={inst.notes || ''}
                                                        onChange={(e) => updateInstallment(idx, 'notes', e.target.value)}
                                                        placeholder="ملاحظات"
                                                        className="p-1 border rounded w-full text-sm"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => removeInstallment(idx)} className="text-red-500 hover:text-red-700">
                                                        &times;
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-between items-center">
                                    <button onClick={addInstallment} className="text-blue-600 hover:underline text-sm font-bold">+ إضافة دفعة</button>
                                    <div className="text-sm">
                                        <span className="text-gray-600 ml-2">الإجمالي المجدول:</span>
                                        <span className={`font-bold ${schedule.reduce((s, i) => s + i.amount, 0) === total ? 'text-green-600' : 'text-red-600'}`}>
                                            {schedule.reduce((s, i) => s + i.amount, 0).toLocaleString('en-US')} ج.م
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                    <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100" disabled={isSubmitting}>إلغاء</button>
                    <button onClick={handleSubmit} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'حفظ الفاتورة')}</button>
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

export default AddSalesInvoiceModal;
