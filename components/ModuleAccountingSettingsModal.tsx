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

const moduleTabs: { id: TabType; title: string; icon: string }[] = [
  { id: 'sales', title: 'المبيعات', icon: '📈' },
  { id: 'purchases', title: 'المشتريات', icon: '🛒' },
  { id: 'manufacturing', title: 'التصنيع والتشغيل', icon: '🏗️' },
  { id: 'treasury', title: 'الخزينة والبنوك', icon: '🏦' },
  { id: 'warehouse', title: 'المخازن والأصول', icon: '🏭' },
  { id: 'all', title: 'شامل كل الصفحات', icon: '📑' }
];

const defaultSettingsValues: ModulePostingSettings = {
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
    badgeColor: string = 'text-blue-600'
  ) => {
    const currentValue = formData[field] || defaultAccId;
    const currentAccount = accounts.find(a => a.id === currentValue);

    return (
      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-gray-200/80 hover:border-blue-300 transition-colors">
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <span>{label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded bg-white border font-mono ${badgeColor}`}>
              الافتراضي: {defaultAccId}
            </span>
          </label>
          {currentAccount && (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {currentAccount.code} - {currentAccount.name}
            </span>
          )}
        </div>

        <select
          value={currentValue}
          onChange={e => handleChange(field, e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {filteredAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name} ({a.type === 'Asset' ? 'أصول' : a.type === 'Liability' ? 'خصوم' : a.type === 'Revenue' ? 'إيرادات' : a.type === 'Expense' ? 'مصروفات' : 'حقوق ملكية'})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 mt-1">{description}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 text-white p-5 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-xl transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-white/10 rounded-2xl">⚙️</span>
            <div>
              <h2 className="text-xl font-bold">لوحة التحكم في التوجيه والترحيل المحاسبي</h2>
              <p className="text-blue-200 text-xs mt-0.5">
                تحديد وضبط حسابات القيود المحاسبية التلقائية لكافة صفحات وموديولات النظام
              </p>
            </div>
          </div>

          {/* Module Switcher Tabs */}
          <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-white/10">
            {moduleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setCurrentTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentTab === t.id
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-white/30'
                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter bar inside modal */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-200 flex justify-between items-center text-xs text-gray-600 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span>🔍 تصفية الحسابات:</span>
            <input
              type="text"
              placeholder="اكتب كود أو اسم حساب لتسهيل الاختيار..."
              value={accountFilterText}
              onChange={e => setAccountFilterText(e.target.value)}
              className="p-1.5 border border-gray-300 rounded-lg text-xs bg-white w-full outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-gray-500 hover:text-red-600 text-xs font-semibold underline flex items-center gap-1"
          >
            <span>🔄</span>
            <span>استعادة الحسابات الافتراضية للنظام</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
              <span>✓</span> تم حفظ وتفعيل إعدادات التوجيه المحاسبي بنجاح لكافة الصفحات!
            </div>
          )}

          {/* ===================== SALES MODULE ===================== */}
          {(currentTab === 'sales' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                <span className="text-xl">📈</span>
                <h3 className="font-bold text-base text-gray-800">توجيهات موديول المبيعات (فواتير، عروض، مرتجعات)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderAccountField('حساب العملاء (المدينون)', 'salesReceivablesAccountId', '1103', 'يُسجل مديناً بإجمالي الفاتورة الآجلة أو دائناً بالمرتجع')}
                {renderAccountField('حساب إيرادات المبيعات', 'salesRevenueAccountId', '4101', 'يُسجل دائناً بقيمة المبيعات المحققة')}
                {renderAccountField('حساب مرتجعات ومسموحات المبيعات', 'salesReturnsAccountId', '4102', 'يُسجل مديناً عند عمل مرتجع بيع أو إلغاء فاتورة')}
                {renderAccountField('حساب تكلفة البضاعة المباعة (COGS)', 'salesCogsAccountId', '5101', 'يُسجل مديناً بتكلفة الأصناف المباعة وفق الجرد المستمر')}
                {renderAccountField('حساب المخزون الافتراضي للمبيعات', 'salesDefaultInventoryAccountId', '1104', 'يُسجل دائناً بتكلفة الأصناف المباعة لخفض المخزون')}
                {renderAccountField('حساب ضريبة القيمة المضافة المحصلة', 'salesVatAccountId', '2105', 'حساب وسيط لضريبة المبيعات المحصلة لصالح الضرائب')}
                {renderAccountField('حساب الخصم المسموح به', 'salesDiscountAccountId', '5301', 'يُسجل مديناً عند منح خصم تجاري أو تعجيلي للعميل')}
              </div>
            </div>
          )}

          {/* ===================== PURCHASES MODULE ===================== */}
          {(currentTab === 'purchases' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                <span className="text-xl">🛒</span>
                <h3 className="font-bold text-base text-gray-800">توجيهات موديول المشتريات (فواتير، طلبات، أوامر)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderAccountField('حساب الموردين (الدائنون)', 'purchasePayablesAccountId', '2101', 'يُسجل دائناً بإجمالي فاتورة الشراء الآجلة أو مديناً بالمرتجع')}
                {renderAccountField('حساب مخزون الخامات والمشتريات', 'purchaseDefaultInventoryAccountId', '110401', 'يُسجل مديناً بقيمة المواد المشتراة لزيادة رصيد المخزون')}
                {renderAccountField('حساب مصروفات المشتريات والشحن', 'purchaseExpensesAccountId', '5201', 'حساب التكلفة للبنود الخدمية والمصروفات المصاحبة للشراء')}
                {renderAccountField('حساب ضريبة القيمة المضافة مدخلات', 'purchaseVatAccountId', '1106', 'حساب ضريبة المشتريات القابلة للخصم والاسترداد')}
                {renderAccountField('حساب الخصم المكتسب من الموردين', 'purchaseDiscountAccountId', '4202', 'يُسجل دائناً بقيمة الخصومات المكتسبة من الموردين')}
                {renderAccountField('حساب اعتمادات وبضاعة بالطريق', 'purchaseGoodsInTransitAccountId', '110404', 'للتوريدات المؤجلة قبل وصولها الفعلي للمخازن')}
              </div>
            </div>
          )}

          {/* ===================== MANUFACTURING MODULE ===================== */}
          {(currentTab === 'manufacturing' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                <span className="text-xl">🏗️</span>
                <h3 className="font-bold text-base text-gray-800">توجيهات موديول التصنيع والتشغيل والأوامر</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderAccountField('حساب الإنتاج تحت التشغيل (WIP)', 'mfgWipAccountId', '110402', 'يُحمل بجميع تكاليف المواد والمصنعيات والمصروفات أثناء التصنيع')}
                {renderAccountField('حساب مخزون الخامات المستهلكة', 'mfgRawMaterialAccountId', '110401', 'يُسجل دائناً بتكلفة الخامات المنصرفة لأمر الإنتاج')}
                {renderAccountField('حساب مخزون الإنتاج التام النهائي', 'mfgFinishedGoodsAccountId', '110403', 'يُسجل مديناً بالتكلفة الإجمالية للمنتج النهائي التام')}
                {renderAccountField('حساب مصنعيات الغير ومقاولي الباطن', 'mfgSubcontractorAccountId', '2101', 'يُسجل دائناً بتكلفة العمليات الخارجية المنفذة لدى الغير')}
                {renderAccountField('حساب خسائر وهالك الإنتاج (Scrap)', 'mfgScrapLossAccountId', '5203', 'يُسجل مديناً بتكلفة الهالك والتالف الخارج عن المعدلات الطبيعية')}
                {renderAccountField('حساب أجور ومصروفات التشغيل المباشرة', 'mfgDirectLaborAccountId', '5102', 'أجور عمال الإنتاج وتكاليف التشغيل المحملة على الأمر')}
                {renderAccountField('حساب المصروفات الصناعية غير المباشرة', 'mfgDefaultExpenseAccountId', '5201', 'الكهرباء والصيانة والمصروفات الخدمية للمصنع')}
              </div>
            </div>
          )}

          {/* ===================== TREASURY MODULE ===================== */}
          {(currentTab === 'treasury' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                <span className="text-xl">🏦</span>
                <h3 className="font-bold text-base text-gray-800">توجيهات موديول الخزينة والبنوك وحركات النقدية</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderAccountField('حساب الخزينة النقدية الرئيسية', 'treasuryMainCashAccountId', '1101', 'الحساب النقدي لصندوق النقدية الرئيسي')}
                {renderAccountField('حساب البنك الرئيسي', 'treasuryBankAccountId', '1102', 'حساب المعاملات البنكية والشيكات')}
                {renderAccountField('حساب المحافظ الإلكترونية (فودافون كاش)', 'treasuryVodafoneCashAccountId', '1106', 'حساب المعاملات النقدية عبر محافظ الهواتف')}
                {renderAccountField('حساب شبكة المدفوعات اللحظية (إنستاباي)', 'treasuryInstapayAccountId', '1107', 'حساب التحويلات الفورية اللحظية')}
                {renderAccountField('حساب مصاريف وعمولات بنكية', 'treasuryBankFeesAccountId', '5201', 'يُحمل بالعمولات والمصاريف الإدارية المقتطعة')}
                {renderAccountField('حساب جاري الشركاء الافتراضي', 'treasuryPartnerCurrentAccountId', '3102', 'مسحوبات وإيداعات الشركاء والتمويلات الشخصية')}
              </div>
            </div>
          )}

          {/* ===================== WAREHOUSE & ASSETS MODULE ===================== */}
          {(currentTab === 'warehouse' || currentTab === 'all') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-gray-200">
                <span className="text-xl">🏭</span>
                <h3 className="font-bold text-base text-gray-800">توجيهات المخازن والتسويات الجردية والأصول الثابتة</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderAccountField('حساب عجز الجرد والتسويات السالبة', 'inventoryAdjustmentLossAccountId', '5201', 'يُسجل مديناً بقيمة العجز والتلف المخزني المكتشف أثناء الجرد')}
                {renderAccountField('حساب فائض الجرد والتسويات الموجبة', 'inventoryAdjustmentGainAccountId', '4201', 'يُسجل دائناً كإيراد رأس مالي ناتج عن الزيادات الجردية')}
                {renderAccountField('حساب مجمع إهلاك الأصول الثابتة', 'fixedAssetsAccumDepreciationAccountId', '1202', 'حساب الخصوم المقابل للأصول لتراكم الإهلاك السنوي')}
                {renderAccountField('حساب مصروف إهلاك الأصول الثابتة', 'fixedAssetsDepreciationExpenseAccountId', '5204', 'يُسجل مديناً ضمن مصروفات الفترة بقسط الإهلاك الدفتري')}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500">
            * تنعكس هذه الإعدادات فوراً وبشكل تلقائي على كافة قيود اليومية المنشأة مستقبلاً.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg text-xs"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>حفظ وتطبيق التوجيهات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleAccountingSettingsModal;