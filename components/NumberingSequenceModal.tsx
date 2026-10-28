import React, { useState, useEffect } from 'react';
import type { SequenceModuleKey, SequenceConfig, NumberingSequenceSettings } from '../types.ts';
import { getSequenceSettings, saveSequenceSettings, DEFAULT_SEQUENCE_SETTINGS, previewSequence } from '../utils/sequenceManager.ts';
import { showNotification } from '../services/notificationService.ts';

interface NumberingSequenceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ModuleInfo {
    key: SequenceModuleKey;
    label: string;
    description: string;
    icon: string;
    category: 'treasury' | 'sales' | 'purchases' | 'manufacturing' | 'entities';
}

const MODULES_CATALOG: ModuleInfo[] = [
    // Treasury
    { key: 'customerPayments', label: 'سندات القبض (العملاء)', description: 'تحصيلات الخزينة والبنك من العملاء', icon: '📥', category: 'treasury' },
    { key: 'supplierPayments', label: 'سندات الصرف (الموردين والمصروفات)', description: 'مدفوعات الخزينة للموردين والجهات', icon: '📤', category: 'treasury' },
    { key: 'treasuryTransfers', label: 'التحويلات المالية بين الحسابات', description: 'التحويل بين الخزائن والبنوك والشركات الشقيقة', icon: '🔄', category: 'treasury' },
    { key: 'expenses', label: 'سندات المصروفات النثرية', description: 'مصروفات التشغيل والعمومية الإدارية', icon: '🧾', category: 'treasury' },

    // Sales
    { key: 'salesInvoices', label: 'فواتير المبيعات', description: 'فواتير البيع للعملاء وتوريدات المطبوعات', icon: '💰', category: 'sales' },
    { key: 'quotations', label: 'عروض الأسعار', description: 'عروض الأسعار المقدمة للعملاء', icon: '📋', category: 'sales' },

    // Purchases
    { key: 'purchaseInvoices', label: 'فواتير المشتريات', description: 'فواتير شراء الخامات والورق ومستلزمات الإنتاج', icon: '🛒', category: 'purchases' },
    { key: 'purchaseRequests', label: 'طلبات الشراء (PR)', description: 'طلبات الاحتياج والشراء الداخلية', icon: '📝', category: 'purchases' },
    { key: 'purchaseOrders', label: 'أوامر الشراء (PO)', description: 'أوامر التوريد الصادرة للموردين', icon: '📑', category: 'purchases' },

    // Manufacturing & Printing
    { key: 'printingJobOrders', label: 'أوامر تشغيل المطبوعات والتوريدات', description: 'أوامر الشغل لمراحل التشغيل والطباعة لدى الغير', icon: '🖨️', category: 'manufacturing' },
    { key: 'productionOrders', label: 'أوامر تصنيع الكرتون والتشغيل الداخلي', description: 'أوامر الإنتاج وتصنيع العلب والكرتون', icon: '⚙️', category: 'manufacturing' },

    // Entities & General Ledger
    { key: 'customers', label: 'تكويد العملاء', description: 'أكواد ملفات وبيانات العملاء', icon: '👥', category: 'entities' },
    { key: 'suppliers', label: 'تكويد الموردين', description: 'أكواد ومطابقات الموردين وجهات التشغيل', icon: '🏭', category: 'entities' },
    { key: 'products', label: 'تكويد الأصناف والمنتجات', description: 'أكواد الخامات والمنتجات التامة والمطبوعات', icon: '📦', category: 'entities' },
    { key: 'journalEntries', label: 'قيود اليومية العامة', description: 'القيود المحاسبية الآلية واليدوية', icon: '⚖️', category: 'entities' },
];

const CATEGORIES = [
    { id: 'treasury', label: 'الخزينة والمعاملات المالية', icon: '🏦' },
    { id: 'sales', label: 'المبيعات وعروض الأسعار', icon: '💰' },
    { id: 'purchases', label: 'المشتريات والتوريدات', icon: '🛒' },
    { id: 'manufacturing', label: 'التشغيل وأوامر الشغل', icon: '⚙️' },
    { id: 'entities', label: 'الأطراف والدليل المحاسبي', icon: '📁' },
];

const NumberingSequenceModal: React.FC<NumberingSequenceModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<NumberingSequenceSettings>(getSequenceSettings);
    const [activeCategory, setActiveCategory] = useState<string>('treasury');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showIntercompanyHelp, setShowIntercompanyHelp] = useState<boolean>(true);

    useEffect(() => {
        if (isOpen) {
            setSettings(getSequenceSettings());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (key: SequenceModuleKey, field: keyof SequenceConfig, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value,
            }
        }));
    };

    const handleResetSingle = (key: SequenceModuleKey) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...DEFAULT_SEQUENCE_SETTINGS[key] }
        }));
    };

    const handleResetAll = () => {
        if (window.confirm('هل أنت متأكد من استعادة كافة إعدادات التكويد الافتراضية لجميع المديولات؟')) {
            setSettings({ ...DEFAULT_SEQUENCE_SETTINGS });
        }
    };

    const handleSave = () => {
        saveSequenceSettings(settings);
        showNotification({
            type: 'success',
            title: 'تم حفظ إعدادات التكويد بنجاح',
            message: 'تم تحديث قواعد التسلسل والتكويد التلقائي لجميع السندات والفواتير',
            category: 'system'
        });
        onClose();
    };

    const filteredModules = MODULES_CATALOG.filter(mod => {
        const matchesCategory = searchTerm ? true : mod.category === activeCategory;
        const matchesSearch = !searchTerm || mod.label.includes(searchTerm) || mod.description.includes(searchTerm) || mod.key.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl shadow-inner">
                            🔢
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">إدارة التكويد والتسلسل الرقمي التلقائي</h2>
                            <p className="text-xs text-indigo-200/80 mt-0.5">تخصيص بادئات الترقيم، خانات الأصفار، ودمج السنوات لكافة السندات والفواتير والمستندات</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleResetAll}
                            className="px-3 py-1.5 text-xs font-medium text-amber-200 hover:text-amber-100 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-600/40 rounded-lg transition-colors flex items-center gap-1.5"
                            title="استعادة الافتراضي لكافة المديولات"
                        >
                            <span>↺</span>
                            <span>استعادة الافتراضي</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Subheader / Tabs */}
                <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                    activeCategory === cat.id && !searchTerm
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="relative min-w-[220px]">
                        <input
                            type="text"
                            placeholder="بحث في الموديولات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 pr-8 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="absolute right-2.5 top-2 text-slate-400 text-xs">🔍</span>
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute left-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50">
                    
                    {/* Inter-company & Architecture Info Card */}
                    {showIntercompanyHelp && (
                        <div className="bg-gradient-to-l from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 text-xs text-slate-700 relative shadow-sm">
                            <button
                                onClick={() => setShowIntercompanyHelp(false)}
                                className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 text-sm font-bold"
                                title="إخفاء التوضيح"
                            >
                                ✕
                            </button>
                            <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2 mb-1.5">
                                <span>💡</span>
                                <span>هندسة وبناء تسلسل السندات والشركات الشقيقة (Inter-company):</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 leading-relaxed pr-1">
                                <div>
                                    <p className="font-semibold text-slate-800 mb-0.5">• المعاملات الأساسية للفرع الأصلي:</p>
                                    <p>تأخذ الكود المباشر طبقاً للتنسيق المحدد أدناه (مثل: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">CP001</code> لسند القبض، <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">SP001</code> لسند الصرف، و <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700 font-bold">TR001</code> للتحويلات).</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 mb-0.5">• التماثل والشركات الشقيقة (Inter-company Mirroring):</p>
                                    <p>عند التحصيل أو الصرف نيابة عن فرع شقيق، يقوم النظام بإنشاء سند مقابل متطابق تلقائياً يحمل الرمز <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-purple-700 font-bold">CP-IC-xxx</code> أو <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-purple-700 font-bold">SP-IC-xxx</code> مع قيد مالي مزدوج على حساب <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-bold text-emerald-700">2102</code> (جاري الشركات الشقيقة).</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sequence Table */}
                    <div className="space-y-3">
                        {filteredModules.map(mod => {
                            const config = settings[mod.key] || DEFAULT_SEQUENCE_SETTINGS[mod.key];
                            const preview = previewSequence(config);

                            return (
                                <div
                                    key={mod.key}
                                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                                >
                                    {/* Left: Info */}
                                    <div className="lg:w-1/3 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0 mt-0.5">
                                            {mod.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-sm">{mod.label}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[11px] font-semibold text-slate-500">المعاينة:</span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide">
                                                    {preview}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Controls */}
                                    <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-center">
                                        {/* Prefix */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">البادئة (Prefix)</label>
                                            <input
                                                type="text"
                                                value={config.prefix}
                                                onChange={(e) => handleChange(mod.key, 'prefix', e.target.value)}
                                                className="w-full text-xs font-bold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                                placeholder="مثال: CP"
                                            />
                                        </div>

                                        {/* Delimiter */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">الفاصل</label>
                                            <select
                                                value={config.delimiter}
                                                onChange={(e) => handleChange(mod.key, 'delimiter', e.target.value)}
                                                className="w-full text-xs font-bold px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                            >
                                                <option value="">بدون فاصل</option>
                                                <option value="-">شرطة (-)</option>
                                                <option value="/">مائل (/)</option>
                                                <option value="_">سفلي (_)</option>
                                            </select>
                                        </div>

                                        {/* Include Year */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">تضمين السنة</label>
                                            <button
                                                type="button"
                                                onClick={() => handleChange(mod.key, 'includeYear', !config.includeYear)}
                                                className={`w-full py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                                                    config.includeYear
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                        : 'bg-slate-100 text-slate-600 border-slate-300'
                                                }`}
                                            >
                                                <span>{config.includeYear ? '✓ نعم' : '✗ لا'}</span>
                                            </button>
                                        </div>

                                        {/* Padding */}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">خانات الأصفار</label>
                                            <select
                                                value={config.padding}
                                                onChange={(e) => handleChange(mod.key, 'padding', Number(e.target.value))}
                                                className="w-full text-xs font-bold px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                            >
                                                <option value={2}>2 (مثال: 01)</option>
                                                <option value={3}>3 (مثال: 001)</option>
                                                <option value={4}>4 (مثال: 0001)</option>
                                                <option value={5}>5 (مثال: 00001)</option>
                                                <option value={6}>6 (مثال: 000001)</option>
                                            </select>
                                        </div>

                                        {/* Start Number & Reset */}
                                        <div className="flex items-end gap-1.5">
                                            <div className="flex-1">
                                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">البداية</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={config.startNumber}
                                                    onChange={(e) => handleChange(mod.key, 'startNumber', Math.max(1, Number(e.target.value) || 1))}
                                                    className="w-full text-xs font-bold px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleResetSingle(mod.key)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-300 transition-colors"
                                                title="استعادة الافتراضي لهذا البند"
                                            >
                                                ↺
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                    <div className="text-xs text-slate-500 hidden sm:block">
                        💡 سيتم اعتماد التنسيقات فوراً عند إنشاء أي سند أو فاتورة جديدة في النظام.
                    </div>
                    <div className="flex items-center gap-2 mr-auto">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5"
                        >
                            <span>✓</span>
                            <span>حفظ الإعدادات وتطبيق التكويد</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NumberingSequenceModal;
