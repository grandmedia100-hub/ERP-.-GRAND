import React, { useState } from 'react';
import type { Account, ModulePostingSettings } from '../types.ts';

interface ModuleAccountingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse' | 'all';
  accounts: Account[];
  settings: ModulePostingSettings;
  onSaveSettings: (newSettings: ModulePostingSettings) => void;
}

type TabType = 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse' | 'all';

export const moduleTabs: { id: TabType; title: string; icon: string }[] = [
  { id: 'sales', title: 'المبيعات', icon: '📈' },
  { id: 'purchases', title: 'المشتريات', icon: '🛒' },
  { id: 'manufacturing', title: 'التصنيع والتشغيل', icon: '🏗️' },
  { id: 'treasury', title: 'الخزينة والبنوك', icon: '🏦' },
  { id: 'warehouse', title: 'المخازن والأصول', icon: '🏭' },
  { id: 'all', title: 'شامل كل الصفحات', icon: '📑' }
];

export const defaultSettingsValues: ModulePostingSettings = {
  salesReceivablesAccountId: '1103',
  salesRevenueAccountId: '4101',
  salesReturnsAccountId: '4102',
  salesVatAccountId: '2105',
  salesDiscountAccountId: '5301',
  salesCogsAccountId: '5101',
  salesDefaultInventoryAccountId: '1104',

  purchasePayablesAccountId: '2101',
  purchaseDefaultInventoryAccountId: '110401',
  purchaseVatAccountId: '1106',
  purchaseDiscountAccountId: '4202',
  purchaseExpensesAccountId: '5201',
  purchaseGoodsInTransitAccountId: '110404',

  mfgWipAccountId: '110402',
  mfgRawMaterialAccountId: '110401',
  mfgFinishedGoodsAccountId: '110403',
  mfgSubcontractorAccountId: '2101',
  mfgScrapLossAccountId: '5203',
  mfgDirectLaborAccountId: '5102',
  mfgDefaultExpenseAccountId: '5201',

  treasuryMainCashAccountId: '1101',
  treasuryBankAccountId: '1102',
  treasuryVodafoneCashAccountId: '1106',
  treasuryInstapayAccountId: '1107',
  treasuryBankFeesAccountId: '5201',
  treasuryPartnerCurrentAccountId: '3102',

  inventoryAdjustmentLossAccountId: '5201',
  inventoryAdjustmentGainAccountId: '4201',
  fixedAssetsAccumDepreciationAccountId: '1202',
  fixedAssetsDepreciationExpenseAccountId: '5204'
};

const ModuleAccountingSettingsModal: React.FC<ModuleAccountingSettingsModalProps> = ({
  isOpen,
  onClose,
  module = 'sales',
  accounts,
  settings,
  onSaveSettings
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>(module);
  const [formData, setFormData] = useState<ModulePostingSettings>({
    ...defaultSettingsValues,
    ...settings
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [accountFilterText, setAccountFilterText] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  if (!isOpen) return null;

  const selectableAccounts = accounts.filter(a => !a.isGroup);

  const filteredAccounts = accountFilterText.trim()
    ? selectableAccounts.filter(a =>
        a.name.toLowerCase().includes(accountFilterText.toLowerCase()) ||
        a.code.toLowerCase().includes(accountFilterText.toLowerCase())
      )
    : selectableAccounts;

  const handleChange = (field: keyof ModulePostingSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetDefaults = () => {
    if (confirm('هل تريد استعادة جميع الحسابات المحاسبية الافتراضية للنظام؟')) {
      setFormData({ ...defaultSettingsValues });
    }
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  const renderAccountField = (
    label: string,
    field: keyof ModulePostingSettings,
    defaultAccId: string,
    description: string,
    nature: 'مدين' | 'دائن' | 'أصل' | 'التزام' | 'إيراد' | 'مصروف' = 'مدين'
  ) => {
    const currentValue = formData[field] || defaultAccId;
    const isCustomized = currentValue !== defaultAccId;
    const currentAccount = accounts.find(a => a.id === currentValue);

    const natureBadgeClasses = nature === 'مدين' || nature === 'أصل' || nature === 'مصروف'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';

    return (
      <div className={`p-4 rounded-2xl border-2 transition-all duration-200 shadow-xs ${
        isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200'
      } ${
        isCustomized ? 'border-indigo-400 ring-1 ring-indigo-200' : 'hover:border-slate-300'
      }`}>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-1.5">
          <label className={`text-xs font-black flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <span>{label}</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${natureBadgeClasses}`}>
              {nature}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              الافتراضي: {defaultAccId}
            </span>
            {isCustomized && (
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-300">
                مخصص ✨
              </span>
            )}
          </div>
        </div>

        {/* Current Account Tag */}
        <div className={`mb-2 p-2 rounded-lg border flex items-center justify-between text-xs ${
          isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            {currentAccount ? (
              <span className="truncate">
                <strong className={`font-mono ml-1 px-1 py-0.5 rounded border font-black ${
                  isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}>{currentAccount.code}</strong>
                <span className={`font-black ${isDarkMode ? 'text-gray-100' : 'text-slate-800'}`}>{currentAccount.name}</span>
              </span>
            ) : (
              <span className="text-red-600 font-bold">⚠️ حساب غير مسجل</span>
            )}
          </div>
          {isCustomized && (
            <button
              type="button"
              onClick={() => handleChange(field, defaultAccId)}
              className="text-[10px] text-indigo-600 hover:underline font-bold flex-shrink-0"
              title="استعادة الافتراضي"
            >
              ↩️ استعادة
            </button>
          )}
        </div>

        <select
          value={currentValue}
          onChange={e => handleChange(field, e.target.value)}
          className={`w-full border-2 rounded-xl p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {filteredAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name} ({a.type === 'Asset' || a.type === 'مدين' ? 'مدين' : 'دائن'})
            </option>
          ))}
        </select>
        <p className={`text-[11px] mt-1.5 leading-relaxed font-medium ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
          💡 {description}
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className={`rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border-2 flex flex-col max-h-[92vh] ${
        isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200'
      }`}>
        {/* Header Hero */}
        <div className={`p-6 relative flex-shrink-0 border-b-2 ${
          isDarkMode
            ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-gray-700'
            : 'bg-gradient-to-r from-white via-slate-50 to-indigo-50 text-slate-900 border-indigo-100'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-3 bg-indigo-50 text-indigo-700 rounded-2xl ring-2 ring-indigo-100">⚖️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black">لوحة التحكم في التوجيه والترحيل المحاسبي</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full font-black border border-emerald-300">
                    نشط وتلقائي
                  </span>
                </div>
                <p className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-indigo-200' : 'text-slate-600'}`}>
                  تحديد وضبط حسابات القيود المحاسبية التلقائية لكافة صفحات وموديولات النظام
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Day / Night Mode Toggle inside modal */}
              <div className="flex items-center bg-white dark:bg-gray-800 p-1 rounded-xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsDarkMode(false)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                    !isDarkMode
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="الوضع النهاري الفاتح"
                >
                  <span>☀️</span>
                  <span>نهاري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDarkMode(true)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                    isDarkMode
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="الوضع الليلي"
                >
                  <span>🌙</span>
                  <span>ليلي</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl w-8 h-8 flex items-center justify-center text-sm font-black transition-all border border-slate-200"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-200/60">
            {moduleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
                  currentTab === t.id
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar inside modal */}
        <div className={`px-6 py-3 border-b-2 flex flex-wrap justify-between items-center gap-3 text-xs flex-shrink-0 ${
          isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="font-bold">🔍 تصفية:</span>
            <input
              type="text"
              placeholder="اكتب كود أو اسم حساب لتسهيل الاختيار..."
              value={accountFilterText}
              onChange={e => setAccountFilterText(e.target.value)}
              className={`p-2 border-2 rounded-xl text-xs w-full outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-slate-600 hover:text-red-600 text-xs font-black underline flex items-center gap-1"
          >
            <span>🔄</span>
            <span>استعادة الحسابات الافتراضية للنظام</span>
          </button>
        </div>

        {/* Form Body */}
        <div className={`p-6 overflow-y-auto space-y-6 flex-1 ${
          isDarkMode ? 'bg-gray-900' : 'bg-slate-50/50'
        }`}>
          {savedSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 px-4 py-3 rounded-2xl font-black text-sm text-center flex items-center justify-center gap-2 shadow-xs">
              <span>✅</span> تم حفظ وتفعيل إعدادات التوجيه المحاسبي بنجاح لكافة الصفحات!
            </div>
          )}

          {/* ===================== SALES MODULE ===================== */}
          {(currentTab === 'sales' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-200">
                <span className="text-xl">📈</span>
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  توجيهات موديول المبيعات (فواتير، عروض، مرتجعات)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderAccountField('حساب العملاء (المدينون)', 'salesReceivablesAccountId', '1103', 'يُسجل مديناً بإجمالي الفاتورة الآجلة أو دائناً بالمرتجع', 'أصل')}
                {renderAccountField('حساب إيرادات المبيعات', 'salesRevenueAccountId', '4101', 'يُسجل دائناً بقيمة المبيعات المحققة لصافي الفاتورة', 'إيراد')}
                {renderAccountField('حساب مرتجعات ومسموحات المبيعات', 'salesReturnsAccountId', '4102', 'يُسجل مديناً عند عمل مرتجع بيع أو إلغاء فاتورة', 'إيراد')}
                {renderAccountField('حساب تكلفة البضاعة المباعة (COGS)', 'salesCogsAccountId', '5101', 'يُسجل مديناً بتكلفة الأصناف المباعة وفق الجرد المستمر', 'مصروف')}
                {renderAccountField('حساب المخزون الافتراضي للمبيعات', 'salesDefaultInventoryAccountId', '1104', 'يُسجل دائناً بتكلفة الأصناف المباعة لخفض المخزون', 'أصل')}
                {renderAccountField('حساب ضريبة القيمة المضافة المحصلة', 'salesVatAccountId', '2105', 'حساب وسيط لضريبة المبيعات المحصلة لصالح الضرائب', 'التزام')}
                {renderAccountField('حساب الخصم المسموح به', 'salesDiscountAccountId', '5301', 'يُسجل مديناً عند منح خصم تجاري أو تعجيلي للعميل', 'مصروف')}
              </div>
            </div>
          )}

          {/* ===================== PURCHASES MODULE ===================== */}
          {(currentTab === 'purchases' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-amber-200">
                <span className="text-xl">🛒</span>
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  توجيهات موديول المشتريات (فواتير، طلبات، أوامر)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderAccountField('حساب الموردين (الدائنون)', 'purchasePayablesAccountId', '2101', 'يُسجل دائناً بإجمالي فاتورة الشراء الآجلة أو مديناً بالمرتجع', 'التزام')}
                {renderAccountField('حساب مخزون الخامات والمشتريات', 'purchaseDefaultInventoryAccountId', '110401', 'يُسجل مديناً بقيمة المواد المشتراة لزيادة رصيد المخزون', 'أصل')}
                {renderAccountField('حساب مصروفات المشتريات والشحن', 'purchaseExpensesAccountId', '5201', 'حساب التكلفة للبنود الخدمية والمصروفات المصاحبة للشراء', 'مصروف')}
                {renderAccountField('حساب ضريبة القيمة المضافة مدخلات', 'purchaseVatAccountId', '1106', 'حساب ضريبة المشتريات القابلة للخصم والاسترداد', 'أصل')}
                {renderAccountField('حساب الخصم المكتسب من الموردين', 'purchaseDiscountAccountId', '4202', 'يُسجل دائناً بقيمة الخصومات المكتسبة من الموردين', 'إيراد')}
                {renderAccountField('حساب اعتمادات وبضاعة بالطريق', 'purchaseGoodsInTransitAccountId', '110404', 'للتوريدات المؤجلة والاعتمادات المستندية قبل وصولها الفعلي للمخازن', 'أصل')}
              </div>
            </div>
          )}

          {/* ===================== MANUFACTURING MODULE ===================== */}
          {(currentTab === 'manufacturing' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-purple-200">
                <span className="text-xl">🏗️</span>
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  توجيهات موديول التصنيع والتشغيل وأوامر الإنتاج
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderAccountField('حساب الإنتاج تحت التشغيل (WIP)', 'mfgWipAccountId', '110402', 'يُحمل مديناً بجميع تكاليف المواد والمصنعيات والمصروفات أثناء مراحل التصنيع', 'أصل')}
                {renderAccountField('حساب مخزون الخامات المستهلكة', 'mfgRawMaterialAccountId', '110401', 'يُسجل دائناً بتكلفة الخامات المنصرفة لأمر الإنتاج', 'أصل')}
                {renderAccountField('حساب مخزون الإنتاج التام النهائي', 'mfgFinishedGoodsAccountId', '110403', 'يُسجل مديناً بالتكلفة الإجمالية للمنتج النهائي التام المورد للمخزن', 'أصل')}
                {renderAccountField('حساب مصنعيات الغير ومقاولي الباطن', 'mfgSubcontractorAccountId', '2101', 'يُسجل دائناً بتكلفة العمليات الخارجية المنفذة لدى الغير', 'التزام')}
                {renderAccountField('حساب خسائر وهالك الإنتاج (Scrap)', 'mfgScrapLossAccountId', '5203', 'يُسجل مديناً بتكلفة الهالك والتالف الخارج عن المعدلات الطبيعية', 'مصروف')}
                {renderAccountField('حساب أجور ومصروفات التشغيل المباشرة', 'mfgDirectLaborAccountId', '5102', 'أجور عمال الإنتاج وتكاليف التشغيل المباشرة المحملة على أمر التصنيع', 'مصروف')}
                {renderAccountField('حساب المصروفات الصناعية غير المباشرة', 'mfgDefaultExpenseAccountId', '5201', 'الكهرباء والصيانة والمصروفات الخدمية المحملة على المصنع', 'مصروف')}
              </div>
            </div>
          )}

          {/* ===================== TREASURY MODULE ===================== */}
          {(currentTab === 'treasury' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-sky-200">
                <span className="text-xl">🏦</span>
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  توجيهات موديول الخزينة والبنوك وحركات النقدية
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderAccountField('حساب الخزينة النقدية الرئيسية', 'treasuryMainCashAccountId', '1101', 'الحساب النقدي لصندوق النقدية الرئيسي لمقبوضات ومدفوعات الكاش', 'أصل')}
                {renderAccountField('حساب البنك الرئيسي', 'treasuryBankAccountId', '1102', 'حساب المعاملات البنكية والشيكات والتحويلات المصرفية الجارية', 'أصل')}
                {renderAccountField('حساب المحافظ الإلكترونية (فودافون كاش)', 'treasuryVodafoneCashAccountId', '1106', 'حساب المعاملات النقدية عبر محافظ الهواتف الذكية والتطبيقات', 'أصل')}
                {renderAccountField('حساب شبكة المدفوعات اللحظية (إنستاباي)', 'treasuryInstapayAccountId', '1107', 'حساب التحويلات الفورية عبر منظومة إنستاباي والمدفوعات الإلكترونية', 'أصل')}
                {renderAccountField('حساب مصاريف وعمولات بنكية', 'treasuryBankFeesAccountId', '5201', 'يُحمل بالعمولات والمصاريف الإدارية المقتطعة على التحويلات والتحصيلات', 'مصروف')}
                {renderAccountField('حساب جاري الشركاء الافتراضي', 'treasuryPartnerCurrentAccountId', '3102', 'مسحوبات وإيداعات الشركاء والتمويلات الشخصية المؤقتة', 'التزام')}
              </div>
            </div>
          )}

          {/* ===================== WAREHOUSE & ASSETS ===================== */}
          {(currentTab === 'warehouse' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-rose-200">
                <span className="text-xl">🏭</span>
                <h3 className={`font-black text-base ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  توجيهات المستودعات والتسويات الجردية والأصول الثابتة
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {renderAccountField('حساب عجز الجرد والتسويات السالبة', 'inventoryAdjustmentLossAccountId', '5201', 'يُسجل مديناً بقيمة العجز والتلف المخزني المكتشف أثناء الجرد', 'مصروف')}
                {renderAccountField('حساب فائض الجرد والتسويات الموجبة', 'inventoryAdjustmentGainAccountId', '4201', 'يُسجل دائناً كإيراد رأس مالي ناتج عن الزيادات الجردية', 'إيراد')}
                {renderAccountField('حساب مجمع إهلاك الأصول الثابتة', 'fixedAssetsAccumDepreciationAccountId', '1202', 'حساب الخصوم المقابل للأصول لتراكم الإهلاك السنوي الدفتري', 'التزام')}
                {renderAccountField('حساب مصروف إهلاك الأصول الثابتة', 'fixedAssetsDepreciationExpenseAccountId', '5204', 'يُسجل مديناً ضمن مصروفات الفترة بقسط الإهلاك الدفتري للأصل', 'مصروف')}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`p-5 border-t-2 flex justify-between items-center flex-shrink-0 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-xs transition-all"
          >
            إلغاء وإغلاق
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>💾</span>
            <span>حفظ وتطبيق التوجيهات المحاسبية</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleAccountingSettingsModal;
