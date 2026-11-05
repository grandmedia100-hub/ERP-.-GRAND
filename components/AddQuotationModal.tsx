import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, Product, InvoiceItem, Quotation, QuotationNoteItem } from '../types.ts';

interface AddQuotationModalProps {
    onClose: () => void;
    onSave: (quotation: Omit<Quotation, 'id'> & { id?: string }) => void;
    customers: Customer[];
    products: Product[];
    quotationToEdit?: Quotation | null;
}

export interface EditableNoteItem {
    id: string;
    text: string;
    color: string;
}

export const NOTE_COLOR_PRESETS = [
    { label: 'أحمر عاجل / تنبيهي', color: '#dc2626' },
    { label: 'برتقالي تحذيري', color: '#d97706' },
    { label: 'أزرق ملكي / أساسي', color: '#2563eb' },
    { label: 'أخضر معتمد / إيجابي', color: '#059669' },
    { label: 'بنفسجي مميز', color: '#7c3aed' },
    { label: 'كحلي داكن / قياسي', color: '#1e293b' }
];

export const DEFAULT_NOTE_COLOR = '#1e293b';

export const getPresetDefaultColor = (preset: string): string => {
    if (preset.includes('دفعة مقدمة') || preset.includes('صلاحية هذا العرض') || preset.includes('لا ترد ولا تستبدل')) {
        return '#dc2626'; // Red for critical terms
    }
    if (preset.includes('غير شاملة ضريبة') || preset.includes('غير شاملة تجهيزات') || preset.includes('الأسعار قابلة للتغير') || preset.includes('لا تشمل')) {
        return '#d97706'; // Amber/warning
    }
    if (preset.includes('شاملة ضريبة') || preset.includes('شاملة تجهيزات')) {
        return '#059669'; // Green/positive
    }
    if (preset.includes('مدة العمل') || preset.includes('اعتماد البروفة') || preset.includes('الاستلام')) {
        return '#2563eb'; // Blue
    }
    return '#1e293b'; // Slate default
};

const AddQuotationModal: React.FC<AddQuotationModalProps> = ({ onClose, onSave, customers, products, quotationToEdit }) => {
    // Original State
    const [customerId, setCustomerId] = useState<string>('');
    const [companyName, setCompanyName] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [expirationDate, setExpirationDate] = useState<string>('');
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [editableNotes, setEditableNotes] = useState<EditableNoteItem[]>([]);
    const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
    const [deliveryDuration, setDeliveryDuration] = useState<string>(''); // New State



    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // New State
    const [isManualCustomer, setIsManualCustomer] = useState(false);
    const [manualCustomerName, setManualCustomerName] = useState('');
    const [delegateName, setDelegateName] = useState(''); // Added Delegate Name
    const [showTotalInPrint, setShowTotalInPrint] = useState(true); // Default true

    const PRESET_GROUPS = [
        {
            title: '⚙️ شروط التجهيزات والضريبة والاستلام:',
            presets: [
                'الأسعار غير شاملة تجهيزات الطباعة',
                'الأسعار شاملة تجهيزات الطباعة',
                'الأسعار غير شاملة ضريبة القيمة المضافة (14%)',
                'الأسعار شاملة ضريبة القيمة المضافة (14%)',
                'الاستلام أرض المصنع',
                'الاستلام في مقر العميل'
            ]
        },
        {
            title: '📌 شروط الدفع والتعاقد والتوريد:',
            presets: [
                'دفعة مقدمة 50% عند التعاقد والباقي عند الاستلام.',
                'صلاحية هذا العرض 7 أيام من تاريخه.',
                'الأسعار قابلة للتغير ما لم يتم تثبيت العرض بدفعة مقدمة.',
                'مدة العمل تبدأ من تاريخ اعتماد البروفة النهائية ودفع المقدم.',
                'الأسعار لا تشمل تكلفة التصميم.',
                'الاستلام من مقر الشركة خلال مواعيد العمل الرسمية.',
                'البضاعة المباعة لا ترد ولا تستبدل بعد الاستلام.'
            ]
        }
    ];

    const togglePreset = (preset: string) => {
        setEditableNotes(prev => {
            const exists = prev.some(n => n.text === preset);
            if (exists) {
                return prev.filter(n => n.text !== preset);
            } else {
                // Mutually exclusive replacement
                let next = prev;
                if (preset.includes('تجهيزات الطباعة')) {
                    next = next.filter(n => !n.text.includes('تجهيزات الطباعة'));
                } else if (preset.includes('ضريبة القيمة المضافة')) {
                    next = next.filter(n => !n.text.includes('ضريبة القيمة المضافة'));
                } else if (preset.includes('الاستلام أرض المصنع') || preset.includes('الاستلام في مقر العميل')) {
                    next = next.filter(n => !(n.text.includes('الاستلام أرض المصنع') || n.text.includes('الاستلام في مقر العميل')));
                }
                return [...next, { id: Math.random().toString(), text: preset, color: getPresetDefaultColor(preset) }];
            }
        });
    };
    
    const updateNoteText = (id: string, newText: string) => {
        setEditableNotes(prev => prev.map(n => n.id === id ? { ...n, text: newText } : n));
    };

    const updateNoteColor = (id: string, newColor: string) => {
        setEditableNotes(prev => prev.map(n => n.id === id ? { ...n, color: newColor } : n));
    };

    const removeNote = (id: string) => {
        setEditableNotes(prev => prev.filter(n => n.id !== id));
    };

    const addCustomNote = () => {
        setEditableNotes(prev => [...prev, { id: Math.random().toString(), text: '', color: DEFAULT_NOTE_COLOR }]);
    };

    const handleMoveNoteUp = (index: number) => {
        if (index <= 0) return;
        setEditableNotes(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[index - 1];
            next[index - 1] = temp;
            return next;
        });
    };

    const handleMoveNoteDown = (index: number) => {
        if (index >= editableNotes.length - 1) return;
        setEditableNotes(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[index + 1];
            next[index + 1] = temp;
            return next;
        });
    };

    // Edit Mode Initialization
    useEffect(() => {
        if (quotationToEdit) {
            setCustomerId(quotationToEdit.customerId);
            setCompanyName(quotationToEdit.companyName || '');
            setDate(quotationToEdit.date);
            setExpirationDate(quotationToEdit.expirationDate || '');
            setItems(quotationToEdit.items);
            
            if (quotationToEdit.notesDetails && quotationToEdit.notesDetails.length > 0) {
                setEditableNotes(quotationToEdit.notesDetails.map(n => ({
                    id: n.id || Math.random().toString(),
                    text: n.text.replace(/^- /, '').trim(),
                    color: n.color || DEFAULT_NOTE_COLOR
                })));
            } else if (quotationToEdit.notes) {
                const splitNotes = quotationToEdit.notes.split('\n')
                                    .map(n => n.replace(/^- /, '').trim())
                                    .filter(n => n.length > 0);
                
                setEditableNotes(splitNotes.map(text => ({ 
                    id: Math.random().toString(), 
                    text,
                    color: getPresetDefaultColor(text)
                })));
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

    const handleMoveItemUp = (index: number) => {
        if (index <= 0) return;
        setItems(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[index - 1];
            next[index - 1] = temp;
            return next;
        });
    };

    const handleMoveItemDown = (index: number) => {
        if (index >= items.length - 1) return;
        setItems(prev => {
            const next = [...prev];
            const temp = next[index];
            next[index] = next[index + 1];
            next[index + 1] = temp;
            return next;
        });
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

        const cleanNotesItems: QuotationNoteItem[] = editableNotes
            .filter(n => n.text.trim().length > 0)
            .map(n => ({
                id: n.id,
                text: n.text.trim(),
                color: n.color || DEFAULT_NOTE_COLOR
            }));

        const finalNotes = cleanNotesItems.map(n => `- ${n.text}`).join('\n');

        try {
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
                notesDetails: cleanNotesItems,
                delegateName, // Save delegate name
                status,
                deliveryDuration,
                showTotalInPrint
            });
        } finally {
            onClose();
        }
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
                                <tr className="bg-gray-100 text-xs text-gray-700">
                                    <th className="p-2 border w-10 text-center">#</th>
                                    <th className="p-2 border">المنتج / البيان</th>
                                    <th className="p-2 border w-24 text-center">الكمية</th>
                                    <th className="p-2 border w-28 text-center">السعر</th>
                                    <th className="p-2 border w-24 text-center">ترتيب / إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <React.Fragment key={index}>
                                        <tr className={item.pricingTiers && item.pricingTiers.length > 0 ? 'bg-blue-50/60' : 'hover:bg-gray-50/50'}>
                                            <td className="p-2 border text-center align-middle font-bold text-xs text-gray-500 bg-gray-50">
                                                {index + 1}
                                            </td>
                                            <td className="p-2 border">
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={item.productName}
                                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                                        className="w-full p-1.5 border rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
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
                                                            className="w-full p-1.5 border rounded text-center"
                                                        />
                                                    </td>
                                                    <td className="p-2 border align-top">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.price}
                                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                            className="w-full p-1.5 border rounded text-center font-semibold"
                                                        />
                                                    </td>
                                                </>
                                            )}
                                            <td className="p-2 border text-center align-middle bg-gray-50/50">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={index === 0}
                                                        onClick={() => handleMoveItemUp(index)}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
                                                        title="تحريك البند لأعلى (↑)"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={index === items.length - 1}
                                                        onClick={() => handleMoveItemDown(index)}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-white hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
                                                        title="تحريك البند لأسفل (↓)"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="w-7 h-7 flex items-center justify-center rounded bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 border border-red-200 transition-all font-bold text-base"
                                                        title="حذف هذا البند"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>


                    <div className="mb-4 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                            <label className="block text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                <span className="text-amber-600">📝</span>
                                <span>شروط وملاحظات العرض</span>
                            </label>
                            <span className="text-xs text-gray-500">اضغط على أي شرط لإضافته أو حذفه، وحدد لون الخط المخصص لكل سطر</span>
                        </div>

                        {/* Presets Chips grouped */}
                        <div className="space-y-3 mb-4">
                            {PRESET_GROUPS.map((group, gIdx) => (
                                <div key={gIdx} className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs">
                                    <div className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                                        <span>{group.title}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {group.presets.map((preset, idx) => {
                                            const isSelected = editableNotes.some(n => n.text === preset);
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => togglePreset(preset)}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-semibold'
                                                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                                                        }`}
                                                >
                                                    <span className="font-bold">{isSelected ? '✓' : '+'}</span>
                                                    <span>{preset}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Editable Notes Rows */}
                        <div className="space-y-2 mt-4">
                            {editableNotes.map((note, noteIdx) => (
                                <div
                                    key={note.id}
                                    className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2.5 rounded-lg border border-gray-200 shadow-2xs hover:border-blue-300 transition-all"
                                >
                                    {/* Line Number & Reordering Up/Down */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                            #{noteIdx + 1}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={noteIdx === 0}
                                            onClick={() => handleMoveNoteUp(noteIdx)}
                                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                            title="تحريك السطر لأعلى (↑)"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            disabled={noteIdx === editableNotes.length - 1}
                                            onClick={() => handleMoveNoteDown(noteIdx)}
                                            className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 hover:bg-blue-100 text-gray-600 hover:text-blue-700 border border-gray-200 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                            title="تحريك السطر لأسفل (↓)"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Text Input with Styled Color & Bold */}
                                    <input
                                        type="text"
                                        value={note.text}
                                        onChange={e => updateNoteText(note.id, e.target.value)}
                                        style={{ color: note.color, fontWeight: 'bold' }}
                                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="اكتب نص الشرط أو الملاحظة هنا..."
                                    />

                                    {/* Color Palette & Custom Picker */}
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                                        <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">اللون:</span>
                                        {NOTE_COLOR_PRESETS.map((preset) => {
                                            const isActive = (note.color || DEFAULT_NOTE_COLOR).toLowerCase() === preset.color.toLowerCase();
                                            return (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() => updateNoteColor(note.id, preset.color)}
                                                    style={{ backgroundColor: preset.color }}
                                                    className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${isActive ? 'ring-2 ring-offset-1 ring-blue-600 scale-125 border border-white' : 'opacity-80 hover:opacity-100'}`}
                                                    title={preset.label}
                                                />
                                            );
                                        })}
                                        {/* Custom Color Native Picker */}
                                        <label className="relative cursor-pointer flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 transition-colors" title="اختيار لون خط مخصص">
                                            <span className="text-xs">🎨</span>
                                            <input
                                                type="color"
                                                value={note.color || DEFAULT_NOTE_COLOR}
                                                onChange={e => updateNoteColor(note.id, e.target.value)}
                                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                            />
                                        </label>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        type="button" 
                                        onClick={() => removeNote(note.id)} 
                                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors font-bold text-lg"
                                        title="حذف هذا الشرط"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}

                            <button 
                                type="button" 
                                onClick={addCustomNote} 
                                className="inline-flex items-center gap-1 text-sm text-blue-600 font-bold hover:text-blue-800 hover:underline mt-2 p-1"
                            >
                                <span>+</span>
                                <span>إضافة سطر ملاحظة جديد</span>
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
