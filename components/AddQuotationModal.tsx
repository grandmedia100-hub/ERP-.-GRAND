import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, Product, InvoiceItem, Quotation } from '../types.ts';

interface AddQuotationModalProps {
    onClose: () => void;
    onSave: (quotation: Omit<Quotation, 'id'> & { id?: string }) => void;
    customers: Customer[];
    products: Product[];
    quotationToEdit?: Quotation | null;
}

const AddQuotationModal: React.FC<AddQuotationModalProps> = ({ onClose, onSave, customers, products, quotationToEdit }) => {
    // Original State
    const [customerId, setCustomerId] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [expirationDate, setExpirationDate] = useState<string>('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [editableNotes, setEditableNotes] = useState<{ id: string, text: string }[]>([]);
    const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const [deliveryDuration, setDeliveryDuration] = useState<string>(''); // New State



    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // New State
    const [isManualCustomer, setIsManualCustomer] = useState(false);
    const [manualCustomerName, setManualCustomerName] = useState('');
    const [delegateName, setDelegateName] = useState(''); // Added Delegate Name
    const [showTotalInPrint, setShowTotalInPrint] = useState(true); // Default true

    const [options, setOptions] = useState({
        prep: 'non_inclusive', // non_inclusive, inclusive
        vat: 'non_inclusive',  // non_inclusive, inclusive
        delivery: 'factory'    // factory, client_site
    });

    const PREDEFINED_NOTES = [
        "صلاحية هذا العرض 7 أيام من تاريخه.",
        "دفعة مقدمة 50% عند التعاقد والباقي عند الاستلام.",
        "الأسعار قابلة للتغير ما لم يتم تثبيت العرض بدفعة مقدمة.",
        "الأسعار لا تشمل تكلفة التصميم.",
        "مدة العمل تبدأ من تاريخ اعتماد البروفة النهائية ودفع المقدم.",
        "الاستلام من مقر الشركة خلال مواعيد العمل الرسمية."
    ];

    const togglePreset = (preset: string) => {
        setEditableNotes(prev => {
            const exists = prev.some(n => n.text === preset);
            if (exists) {
                return prev.filter(n => n.text !== preset);
            } else {
                return [...prev, { id: Math.random().toString(), text: preset }];
            }
        });
    };
    
    const updateNote = (id: string, newText: string) => {
        setEditableNotes(prev => prev.map(n => n.id === id ? { ...n, text: newText } : n));
    };

    const removeNote = (id: string) => {
        setEditableNotes(prev => prev.filter(n => n.id !== id));
    };

    const addCustomNote = () => {
        setEditableNotes(prev => [...prev, { id: Math.random().toString(), text: '' }]);
    };

    // Edit Mode Initialization
    useEffect(() => {
        if (quotationToEdit) {
            setCustomerId(quotationToEdit.customerId);
            setCompanyName(quotationToEdit.companyName || '');
            setDate(quotationToEdit.date);
            setExpirationDate(quotationToEdit.expirationDate || '');
            setItems(quotationToEdit.items);
            
            if (quotationToEdit.notes) {
                const patternsToRemove = [
                    /الأسعار (شاملة|غير شاملة) تجهيزات الطباعة/,
                    /الأسعار (شاملة|غير شاملة) ضريبة القيمة المضافة/,
                    /الاستلام (أرض المصنع|في مقر العميل)/
                ];
                
                const splitNotes = quotationToEdit.notes.split('\n')
                                    .map(n => n.replace(/^- /, '').trim())
                                    .filter(n => n.length > 0)
                                    .filter(n => !patternsToRemove.some(regex => regex.test(n)));
                
                setEditableNotes(splitNotes.map(text => ({ id: Math.random().toString(), text })));
            }
            
            setStatus(quotationToEdit.status);
            setDelegateName(quotationToEdit.delegateName || ''); // Init delegate name
            setDeliveryDuration(quotationToEdit.deliveryDuration || ''); // Init delivery duration
            setShowTotalInPrint(quotationToEdit.showTotalInPrint !== undefined ? quotationToEdit.showTotalInPrint : true);

            // Check if manual customer (no ID but has name)
            if (!quotationToEdit.customerId && quotationToEdit.customerName) {
                setIsManualCustomer(true);
                setManualCustomerName(quotationToEdit.customerName);
            }
        }
    }, [quotationToEdit]);

    const uniqueCompanyNames = useMemo(() => {
        const names = new Set(customers.filter(c => c.companyName).map(c => c.companyName));
        return Array.from(names) as string[];
    }, [customers]);

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedCompany = e.target.value;
        setCompanyName(selectedCompany);
        setCustomerId(''); // Reset customer when company changes
    };

    const filteredCustomers = useMemo(() => {
        if (!companyName) return customers;
        return customers.filter(c => c.companyName === companyName);
    }, [customers, companyName]);

    const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        setCustomerId(selectedId);

        // Auto-fill company name if not selected
        if (!companyName) {
            const customer = customers.find(c => c.id === selectedId);
            if (customer && customer.companyName) {
                setCompanyName(customer.companyName);
            }
        }
    };

    // Removed handleAddItem


    const handleAddManualItem = () => {
        const newItem: InvoiceItem = {
            productId: `MANUAL-${Date.now()}`,
            productName: '', // Empty for user to fill
            quantity: 1,
            price: 0,
            total: 0,
            unit: 'عدد',
            priceType: 'سعر الوحدة',
            itemType: 'product', // Treat as product but manual
            size: '',
            variantName: '',
            pricingTiers: []
        };
        setItems([...items, newItem]);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        const item = newItems[index];

        if (field === 'quantity' || field === 'price') {
            item[field] = Number(value);
            // Only update total if NOT using pricing tiers
            if (!item.pricingTiers || item.pricingTiers.length === 0) {
                item.total = item.quantity * item.price;
            }
        } else {
            // @ts-ignore
            item[field] = value;
        }
        setItems(newItems);
    };

    const handleTierChange = (index: number, tierIndex: number, field: 'quantity' | 'price', value: number) => {
        const newItems = [...items];
        const item = newItems[index];
        if (!item.pricingTiers) item.pricingTiers = [];

        // Ensure tiers exist up to this index
        while (item.pricingTiers.length <= tierIndex) {
            item.pricingTiers.push({ quantity: 0, price: 0 });
        }

        item.pricingTiers[tierIndex][field] = value;
        setItems(newItems);
    };

    const togglePricingTiers = (index: number) => {
        const newItems = [...items];
        const item = newItems[index];
        if (item.pricingTiers && item.pricingTiers.length > 0) {
            // Disable tiers
            item.pricingTiers = [];
        } else {
            // Enable tiers with 3 defaults
            item.pricingTiers = [
                { quantity: 1000, price: 0 },
                { quantity: 2000, price: 0 },
                { quantity: 3000, price: 0 },
            ];
            item.total = 0; // Reset total as it's ambiguous
        }
        setItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const total = items.reduce((sum, item) => {
        if (item.pricingTiers && item.pricingTiers.length > 0) return sum; // Don't add tiered items to total for now
        return sum + item.total;
    }, 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let finalCustomerId = customerId;
        let finalCustomerName = '';

        if (isManualCustomer) {
            if (!manualCustomerName.trim()) {
                setAlertMessage('يرجى إدخال اسم العميل');
                setIsAlertOpen(true);
                return;
            }
            finalCustomerId = '';
            finalCustomerName = manualCustomerName;
        } else {
            if (!customerId) {
                setAlertMessage('يرجى اختيار العميل');
                setIsAlertOpen(true);
                return;
            }
            const selectedCustomer = customers.find(c => c.id === customerId);
            finalCustomerName = selectedCustomer ? selectedCustomer.name : 'Unknown';
        }

        if (items.length === 0) {
            setAlertMessage('يجب إضافة منتج واحد على الأقل');
            setIsAlertOpen(true);
            return;
        }

        // Generate Options String
        const optionsText = [
            options.prep === 'inclusive' ? '- الأسعار شاملة تجهيزات الطباعة' : '- الأسعار غير شاملة تجهيزات الطباعة',
            options.vat === 'inclusive' ? '- الأسعار شاملة ضريبة القيمة المضافة' : '- الأسعار غير شاملة ضريبة القيمة المضافة',
            options.delivery === 'factory' ? '- الاستلام أرض المصنع' : '- الاستلام في مقر العميل'
        ].join('\n');

        // Sanitize editableNotes: Remove any that look like our options
        const patternsToRemove = [
            /الأسعار (شاملة|غير شاملة) تجهيزات الطباعة/,
            /الأسعار (شاملة|غير شاملة) ضريبة القيمة المضافة/,
            /الاستلام (أرض المصنع|في مقر العميل)/
        ];

        const cleanNotesArray = editableNotes
            .map(n => n.text.trim())
            .filter(n => n.length > 0)
            .filter(n => !patternsToRemove.some(regex => regex.test(n)));

        const userNotesStr = cleanNotesArray.map(n => `- ${n}`).join('\n');
        const finalNotes = userNotesStr ? `${userNotesStr}\n\n${optionsText}` : optionsText;

        onSave({
            id: quotationToEdit?.id,
            customerId: finalCustomerId,
            customerName: finalCustomerName,
            companyName,
            date,
            expirationDate,
            items,
            total,
            notes: finalNotes,
            delegateName, // Save delegate name
            status,
            deliveryDuration,
            showTotalInPrint
        });
        onClose();
    };



    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{quotationToEdit ? 'تعديل عرض سعر' : 'إنشاء عرض سعر جديد'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1">
                    {/* Customer Selection */}
                    <div className="flex justify-end mb-2">
                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isManualCustomer} onChange={() => setIsManualCustomer(!isManualCustomer)} />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900">عميل يدوي / نقدي</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الشركة (اختياري)</label>
                            <select
                                value={companyName}
                                onChange={handleCompanyChange}
                                disabled={isManualCustomer}
                                className={`w-full p-2 border border-gray-300 rounded-md ${isManualCustomer ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            >
                                <option value="">كل المعارض / الشركات</option>
                                {uniqueCompanyNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
                            {isManualCustomer ? (
                                <input
                                    type="text"
                                    value={manualCustomerName}
                                    onChange={e => setManualCustomerName(e.target.value)}
                                    placeholder="أدخل اسم العميل..."
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    required
                                />
                            ) : (
                                <select
                                    value={customerId}
                                    onChange={handleCustomerChange}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    required
                                >
                                    <option value="">اختر العميل</option>
                                    {filteredCustomers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المندوب</label>
                        <input
                            type="text"
                            value={delegateName}
                            onChange={e => setDelegateName(e.target.value)}
                            placeholder="أدخل اسم المندوب..."
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Quotation Options */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-3 text-sm border-b pb-2">شروط العرض</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">تجهيزات الطباعة</label>
                                <select value={options.prep} onChange={e => setOptions({ ...options, prep: e.target.value as any })} className="w-full p-1.5 text-sm border rounded">
                                    <option value="non_inclusive">غير شاملة التجهيزات</option>
                                    <option value="inclusive">شاملة التجهيزات</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">ضريبة القيمة المضافة</label>
                                <select value={options.vat} onChange={e => setOptions({ ...options, vat: e.target.value as any })} className="w-full p-1.5 text-sm border rounded">
                                    <option value="non_inclusive">غير شاملة الضريبة (14%)</option>
                                    <option value="inclusive">شاملة الضريبة (14%)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">مكان الاستلام</label>
                                <select value={options.delivery} onChange={e => setOptions({ ...options, delivery: e.target.value as any })} className="w-full p-1.5 text-sm border rounded">
                                    <option value="factory">أرض المصنع</option>
                                    <option value="client_site">مقر العميل</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ العرض</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
                            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">مدة الاستلام</label>
                            <input
                                type="text"
                                value={deliveryDuration}
                                onChange={e => setDeliveryDuration(e.target.value)}
                                placeholder="مثال: 15 يوم عمل"
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>

                    <div className="mb-6 flex items-center">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={showTotalInPrint}
                                onChange={(e) => setShowTotalInPrint(e.target.checked)}
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ms-3 text-sm font-medium text-gray-900">إظهار الإجمالي في الطباعة (PDF)</span>
                        </label>
                    </div>

                    {/* Add Products */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">إضافة بنود العرض</label>
                            <button
                                type="button"
                                onClick={handleAddManualItem}
                                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md font-medium whitespace-nowrap border border-blue-700 shadow-sm flex items-center gap-2"
                            >
                                <span className="text-xl font-light">+</span> إضافة بند جديد
                            </button>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-6 overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border">المنتج / البيان</th>
                                    <th className="p-2 border w-24">الكمية</th>
                                    <th className="p-2 border w-32">السعر</th>
                                    <th className="p-2 border w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <React.Fragment key={index}>
                                        <tr className={item.pricingTiers && item.pricingTiers.length > 0 ? 'bg-blue-50' : ''}>
                                            <td className="p-2 border">
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={item.productName}
                                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                        className="w-full p-1 border rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                                        placeholder="اسم المنتج أو الخدمة"
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            value={item.size || ''}
                                                            onChange={(e) => handleItemChange(index, 'size', e.target.value)}
                                                            className="w-full p-1 text-xs border rounded bg-gray-50 focus:bg-white"
                                                            placeholder="المقاس (مثال: 10x15)"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.variantName || ''}
                                                            onChange={(e) => handleItemChange(index, 'variantName', e.target.value)}
                                                            className="w-full p-1 text-xs border rounded bg-red-50 text-red-700 placeholder-red-300 focus:bg-white focus:text-red-900 font-medium"
                                                            placeholder="إضافة / خامة (مميزة بلون)"
                                                        />
                                                    </div>
                                                    <div className="flex items-center mt-1">
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={!!(item.pricingTiers && item.pricingTiers.length > 0)}
                                                                onChange={() => togglePricingTiers(index)}
                                                            />
                                                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                            <span className="ms-2 text-xs font-medium text-gray-900">عرض كميات (3 خيارات)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </td>
                                            {item.pricingTiers && item.pricingTiers.length > 0 ? (
                                                <td colSpan={2} className="p-2 border bg-white">
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {item.pricingTiers.map((tier, tIndex) => (
                                                            <div key={tIndex} className="flex items-center gap-2 text-sm">
                                                                <span className="w-16 font-bold text-gray-500">خيار {tIndex + 1}:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="الكمية"
                                                                    value={tier.quantity}
                                                                    onChange={(e) => handleTierChange(index, tIndex, 'quantity', Number(e.target.value))}
                                                                    className="w-24 p-1 border rounded text-center"
                                                                />
                                                                <span className="text-gray-400">×</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="السعر"
                                                                    value={tier.price}
                                                                    onChange={(e) => handleTierChange(index, tIndex, 'price', Number(e.target.value))}
                                                                    className="w-24 p-1 border rounded text-center"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            ) : (
                                                <>
                                                    <td className="p-2 border align-top">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            className="w-full p-1 border rounded"
                                                        />
                                                    </td>
                                                    <td className="p-2 border align-top">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            className="w-full p-1 border rounded"
                                                        />
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-2 border text-center align-top">
                                                <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700">&times;</button>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>


                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات وشروط إضافية</label>

                        <div className="flex flex-wrap gap-2 mb-3">
                            {PREDEFINED_NOTES.map((preset, idx) => {
                                const isSelected = editableNotes.some(n => n.text === preset);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => togglePreset(preset)}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${isSelected
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {isSelected ? '✓ ' : '+ '}{preset}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-2 mt-4">
                            {editableNotes.map((note) => (
                                <div key={note.id} className="flex gap-2 items-center">
                                    <span className="text-gray-400 font-bold">-</span>
                                    <input
                                        type="text"
                                        value={note.text}
                                        onChange={e => updateNote(note.id, e.target.value)}
                                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="اكتب الشرط هنا..."
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeNote(note.id)} 
                                        className="text-red-500 hover:text-red-700 px-2 py-1"
                                        title="حذف"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={addCustomNote} 
                                className="text-sm text-blue-600 font-medium hover:underline mt-2"
                            >
                                + إضافة ملاحظة جديدة
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
                        <button type="button" onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">
                            {quotationToEdit ? 'حفظ التعديلات' : 'إنشاء العرض'}
                        </button>
                    </div>
                </form>

                {isAlertOpen && (
                    <div className="absolute inset-0 flex justify-center items-center z-50">
                        <div className="bg-black bg-opacity-30 absolute inset-0" onClick={() => setIsAlertOpen(false)}></div>
                        <div className="bg-white p-6 rounded-lg shadow-xl relative z-10 max-w-sm w-full text-center">
                            <p className="text-lg mb-4 text-gray-800">{alertMessage}</p>
                            <button onClick={() => setIsAlertOpen(false)} className="bg-blue-600 text-white px-4 py-2 rounded">حسناً</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddQuotationModal;
