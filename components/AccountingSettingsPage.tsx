import React, { useState, useEffect } from 'react';
import type { Account, ModulePostingSettings, Page } from '../types.ts';
import { defaultSettingsValues, moduleTabs } from './ModuleAccountingSettingsModal.tsx';

interface AccountingSettingsPageProps {
  accounts: Account[];
  postingSettings: ModulePostingSettings;
  setPostingSettings: React.Dispatch<React.SetStateAction<ModulePostingSettings>>;
  onNavigate?: (page: Page) => void;
}

type TabType = 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse' | 'all';

const AccountingSettingsPage: React.FC<AccountingSettingsPageProps> = ({
  accounts,
  postingSettings,
  setPostingSettings,
  onNavigate
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>('sales');
  const [formData, setFormData] = useState<ModulePostingSettings>({
    ...defaultSettingsValues,
    ...(postingSettings || {})
  });
  const [accountFilterText, setAccountFilterText] = useState('');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState('');

  useEffect(() => {
    if (postingSettings && Object.keys(postingSettings).length > 0) {
      setFormData(prev => ({
        ...defaultSettingsValues,
        ...postingSettings
      }));
    }
  }, [postingSettings]);

  const selectableAccounts = accounts.filter(a => !a.isGroup);

  const filteredAccounts = accountFilterText.trim()
    ? selectableAccounts.filter(a =>
        (a.name || '').toLowerCase().includes(accountFilterText.toLowerCase()) ||
        (a.code || '').toLowerCase().includes(accountFilterText.toLowerCase())
      )
    : selectableAccounts;

  const handleChange = (field: keyof ModulePostingSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetDefaults = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في استعادة جميع الحسابات المحاسبية الافتراضية للنظام؟')) {
      const reset = { ...defaultSettingsValues };
      setFormData(reset);
      setPostingSettings(reset);
      setSavedSuccessMessage('تمت استعادة كافة الحسابات المحاسبية الافتراضية بنجاح');
      setTimeout(() => setSavedSuccessMessage(''), 4000);
    }
  };

  const handleSave = () => {
    setPostingSettings(formData);
    setSavedSuccessMessage('تم حفظ وتطبيق توجيهات القيود المحاسبية بنجاح لكافة الصفحات');
    setTimeout(() => setSavedSuccessMessage(''), 4000);
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
      <div className="bg-slate-50/80 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 transition-colors shadow-sm">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-1.5">
          <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <span>{label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded bg-white dark:bg-gray-700 border font-mono ${badgeColor}`}>
              الافتراضي: {defaultAccId}
            </span>
          </label>
          {currentAccount && (
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {currentAccount.code} - {currentAccount.name}
            </span>
          )}
        </div>

        <select
          value={currentValue}
          onChange={e => handleChange(field, e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-xs font-semibold bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {filteredAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.code} - {a.name} ({a.type === 'Asset' || a.type === 'مدين' ? 'أصول/مدين' : 'خصوم/دائن'})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{description}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Top Main Banner */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 flex items-center justify-center text-2xl shadow-inner">
            ⚖️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                إعدادات التوجيه والترحيل المحاسبي
              </h1>
              <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                إعدادات متقدمة
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              التحكم الشامل في حسابات قيود اليومية التلقائية للمبيعات، المشتريات، التصنيع، الخزينة، والمخازن
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🔄</span>
            <span>استعادة الافتراضيات</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>حفظ وتطبيق التوجيهات</span>
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
              title="العودة للإعدادات العامة"
            >
              العودة للإعدادات
            </button>
          )}
        </div>
      </div>

      {savedSuccessMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 p-3.5 rounded-xl text-xs font-bold text-center shadow-sm">
          ✓ {savedSuccessMessage}
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
        {moduleTabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCurrentTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === t.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.title}</span>
          </button>
        ))}
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 تصفية الحسابات بالاسم أو الكود لتسهيل الاختيار في كافة القوائم..."
            value={accountFilterText}
            onChange={e => setAccountFilterText(e.target.value)}
            className="w-full text-xs p-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 text-right focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {accountFilterText && (
            <button
              onClick={() => setAccountFilterText('')}
              className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Module Content */}
      <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
        {/* ===================== SALES ===================== */}
        {(currentTab === 'sales' || currentTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  توجيهات موديول المبيعات (فواتير، عروض أسعار، ومرتجعات)
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">7 حسابات توجيه</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب العملاء (المدينون)', 'salesReceivablesAccountId', '1103', 'يُسجل مديناً بإجمالي الفاتورة الآجلة أو دائناً بالمرتجع والسداد')}
              {renderAccountField('حساب إيرادات المبيعات', 'salesRevenueAccountId', '4101', 'يُسجل دائناً بقيمة المبيعات المحققة لصافي الفاتورة')}
              {renderAccountField('حساب مرتجعات ومسموحات المبيعات', 'salesReturnsAccountId', '4102', 'يُسجل مديناً عند عمل مرتجع بيع أو إلغاء فاتورة بيع')}
              {renderAccountField('حساب تكلفة البضاعة المباعة (COGS)', 'salesCogsAccountId', '5101', 'يُسجل مديناً بتكلفة الأصناف المباعة وفق نظام الجرد المستمر')}
              {renderAccountField('حساب المخزون الافتراضي للمبيعات', 'salesDefaultInventoryAccountId', '1104', 'يُسجل دائناً بتكلفة الأصناف المباعة لخفض قيمة المخزون')}
              {renderAccountField('حساب ضريبة القيمة المضافة المحصلة', 'salesVatAccountId', '2105', 'حساب التزام وسيط لضريبة المبيعات المحصلة لصالح مصلحة الضرائب')}
              {renderAccountField('حساب الخصم المسموح به', 'salesDiscountAccountId', '5301', 'يُسجل مديناً عند منح خصم تجاري أو تعجيلي للعميل على الفاتورة')}
            </div>
          </div>
        )}

        {/* ===================== PURCHASES ===================== */}
        {(currentTab === 'purchases' || currentTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛒</span>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  توجيهات موديول المشتريات (فواتير، طلبات، وأوامر توريد)
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">6 حسابات توجيه</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الموردين (الدائنون)', 'purchasePayablesAccountId', '2101', 'يُسجل دائناً بإجمالي فاتورة الشراء الآجلة أو مديناً بالمرتجع وسداد الدفعات')}
              {renderAccountField('حساب مخزون الخامات والمشتريات', 'purchaseDefaultInventoryAccountId', '110401', 'يُسجل مديناً بقيمة المواد المشتراة لزيادة رصيد وقيمة المخزون')}
              {renderAccountField('حساب مصروفات المشتريات والشحن', 'purchaseExpensesAccountId', '5201', 'حساب التكلفة للبنود الخدمية والمصروفات المصاحبة للشراء (نقل، شحن، جمارك)')}
              {renderAccountField('حساب ضريبة القيمة المضافة مدخلات', 'purchaseVatAccountId', '1106', 'حساب ضريبة المشتريات القابلة للخصم والاسترداد الضريبي')}
              {renderAccountField('حساب الخصم المكتسب من الموردين', 'purchaseDiscountAccountId', '4202', 'يُسجل دائناً كإيراد بقيمة الخصومات المكتسبة من الموردين')}
              {renderAccountField('حساب اعتمادات وبضاعة بالطريق', 'purchaseGoodsInTransitAccountId', '110404', 'للتوريدات المؤجلة والاعتمادات المستندية قبل وصولها الفعلي للمخازن')}
            </div>
          </div>
        )}

        {/* ===================== MANUFACTURING ===================== */}
        {(currentTab === 'manufacturing' || currentTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  توجيهات موديول التصنيع والتشغيل وأوامر الإنتاج
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">7 حسابات توجيه</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الإنتاج تحت التشغيل (WIP)', 'mfgWipAccountId', '110402', 'يُحمل مديناً بجميع تكاليف المواد والمصنعيات والمصروفات أثناء مراحل التصنيع')}
              {renderAccountField('حساب مخزون الخامات المستهلكة', 'mfgRawMaterialAccountId', '110401', 'يُسجل دائناً بتكلفة الخامات المنصرفة لأمر الإنتاج لخصمها من المستودع')}
              {renderAccountField('حساب مخزون الإنتاج التام النهائي', 'mfgFinishedGoodsAccountId', '110403', 'يُسجل مديناً بالتكلفة الإجمالية للمنتج النهائي التام المورد للمخزن')}
              {renderAccountField('حساب مصنعيات الغير ومقاولي الباطن', 'mfgSubcontractorAccountId', '2101', 'يُسجل دائناً بتكلفة العمليات الخارجية المنفذة لدى الغير')}
              {renderAccountField('حساب خسائر وهالك الإنتاج (Scrap)', 'mfgScrapLossAccountId', '5203', 'يُسجل مديناً بتكلفة الهالك والتالف الخارج عن المعدلات الطبيعية')}
              {renderAccountField('حساب أجور ومصروفات التشغيل المباشرة', 'mfgDirectLaborAccountId', '5102', 'أجور عمال الإنتاج وتكاليف التشغيل المباشرة المحملة على أمر التصنيع')}
              {renderAccountField('حساب المصروفات الصناعية غير المباشرة', 'mfgDefaultExpenseAccountId', '5201', 'الكهرباء والصيانة والمصروفات الخدمية المحملة على المصنع')}
            </div>
          </div>
        )}

        {/* ===================== TREASURY ===================== */}
        {(currentTab === 'treasury' || currentTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏦</span>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  توجيهات موديول الخزينة والبنوك وحركات النقدية
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">6 حسابات توجيه</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الخزينة النقدية الرئيسية', 'treasuryMainCashAccountId', '1101', 'الحساب النقدي لصندوق النقدية الرئيسي')}
              {renderAccountField('حساب البنك الرئيسي', 'treasuryBankAccountId', '1102', 'حساب المعاملات البنكية والشيكات والتحويلات المصرفية')}
              {renderAccountField('حساب المحافظ الإلكترونية (فودافون كاش)', 'treasuryVodafoneCashAccountId', '1106', 'حساب المعاملات النقدية عبر محافظ الهواتف الذكية')}
              {renderAccountField('حساب شبكة المدفوعات اللحظية (إنستاباي)', 'treasuryInstapayAccountId', '1107', 'حساب التحويلات الفورية عبر منظومة إنستاباي')}
              {renderAccountField('حساب مصاريف وعمولات بنكية', 'treasuryBankFeesAccountId', '5201', 'يُحمل بالعمولات والمصاريف الإدارية المقتطعة على التحويلات')}
              {renderAccountField('حساب جاري الشركاء الافتراضي', 'treasuryPartnerCurrentAccountId', '3102', 'مسحوبات وإيداعات الشركاء والتمويلات الشخصية')}
            </div>
          </div>
        )}

        {/* ===================== WAREHOUSE & ASSETS ===================== */}
        {(currentTab === 'warehouse' || currentTab === 'all') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏭</span>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  توجيهات المخازن والتسويات الجردية والأصول الثابتة
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-semibold">4 حسابات توجيه</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب عجز الجرد والتسويات السالبة', 'inventoryAdjustmentLossAccountId', '5201', 'يُسجل مديناً بقيمة العجز والتلف المخزني المكتشف أثناء الجرد')}
              {renderAccountField('حساب فائض الجرد والتسويات الموجبة', 'inventoryAdjustmentGainAccountId', '4201', 'يُسجل دائناً كإيراد رأس مالي ناتج عن الزيادات الجردية')}
              {renderAccountField('حساب مجمع إهلاك الأصول الثابتة', 'fixedAssetsAccumDepreciationAccountId', '1202', 'حساب الخصوم المقابل للأصول لتراكم الإهلاك السنوي')}
              {renderAccountField('حساب مصروف إهلاك الأصول الثابتة', 'fixedAssetsDepreciationExpenseAccountId', '5204', 'يُسجل مديناً ضمن مصروفات الفترة بقسط الإهلاك الدفتري')}
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
          <div className="text-xs text-gray-500">
            * تنطبق هذه الحسابات فوراً وبشكل تلقائي على كافة قيود اليومية التي يتم إنشاؤها في أي موديول.
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-8 rounded-xl text-xs shadow-lg flex items-center gap-2 transition-all"
          >
            <span>💾</span>
            <span>حفظ وتطبيق التوجيهات المحاسبية</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountingSettingsPage;
