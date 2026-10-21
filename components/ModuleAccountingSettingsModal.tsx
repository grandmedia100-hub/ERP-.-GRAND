import React, { useState } from 'react';
import type { Account, ModulePostingSettings } from '../types.ts';

interface ModuleAccountingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse';
  accounts: Account[];
  settings: ModulePostingSettings;
  onSaveSettings: (newSettings: ModulePostingSettings) => void;
}

const moduleTitles: Record<string, { title: string; desc: string; icon: string }> = {
  sales: {
    title: 'إعدادات التوجيه المحاسبي لموديول المبيعات',
    desc: 'تحديد الحسابات الافتراضية للعملاء، الإيرادات، المرتجعات، وتكلفة البضاعة المباعة',
    icon: '📈'
  },
  purchases: {
    title: 'إعدادات التوجيه المحاسبي لموديول المشتريات',
    desc: 'تحديد الحسابات الافتراضية للموردين، مخزون المشتريات، والمصروفات',
    icon: '🛒'
  },
  manufacturing: {
    title: 'إعدادات التوجيه المحاسبي لموديول التصنيع والتشغيل',
    desc: 'تحديد حسابات التشغيل تحت التشغيل (WIP)، مخزون الخامات والتام، مصنعيات الغير، وهالك الإنتاج',
    icon: '🏗️'
  },
  treasury: {
    title: 'إعدادات التوجيه المحاسبي لموديول الخزينة والبنوك',
    desc: 'تحديد الحسابات الافتراضية للخزينة، البنك، ومصاريف العمولات البنكية',
    icon: '🏦'
  },
  warehouse: {
    title: 'إعدادات التوجيه المحاسبي لموديول إدارة المخازن',
    desc: 'تحديد حسابات التسويات الجردية (عجز المخزون وفائض المخزون)',
    icon: '🏭'
  }
};

const ModuleAccountingSettingsModal: React.FC<ModuleAccountingSettingsModalProps> = ({
  isOpen,
  onClose,
  module,
  accounts,
  settings,
  onSaveSettings
}) => {
  const [formData, setFormData] = useState<ModulePostingSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Filter accounts for dropdown selection (exclude group headers if possible)
  const selectableAccounts = accounts.filter(a => !a.isGroup);

  const handleChange = (field: keyof ModulePostingSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const moduleInfo = moduleTitles[module] || { title: 'إعدادات الموديول', desc: '', icon: '⚙️' };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-xl transition-all"
          >
            ✕
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-white/10 rounded-xl">{moduleInfo.icon}</span>
            <div>
              <h2 className="text-xl font-bold">{moduleInfo.title}</h2>
              <p className="text-blue-100 text-xs mt-1">{moduleInfo.desc}</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2">
              <span>✓</span> تم حفظ وتفعيل إعدادات التوجيه المحاسبي بنجاح!
            </div>
          )}

          {/* ===================== SALES MODULE ===================== */}
          {module === 'sales' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب العملاء (المدينون) - الافتراضي: 1103
                </label>
                <select
                  value={formData.salesReceivablesAccountId || '1103'}
                  onChange={e => handleChange('salesReceivablesAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين عند إصدار فاتورة بيع آجلة</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب إيرادات المبيعات - الافتراضي: 4101
                </label>
                <select
                  value={formData.salesRevenueAccountId || '4101'}
                  onChange={e => handleChange('salesRevenueAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن عند تحقيق الإيراد</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب مرتجعات ومسموحات المبيعات - الافتراضي: 4102
                </label>
                <select
                  value={formData.salesReturnsAccountId || '4102'}
                  onChange={e => handleChange('salesReturnsAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين عند إلغاء أو عمل مرتجع مبيعات</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب تكلفة البضاعة المباعة (COGS) - الافتراضي: 5101
                </label>
                <select
                  value={formData.salesCogsAccountId || '5101'}
                  onChange={e => handleChange('salesCogsAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين لإثبات تكلفة البضاعة المباعة من المخزون</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب المخزون الافتراضي للمنتجات المباعة - الافتراضي: 1104 / 110403
                </label>
                <select
                  value={formData.salesDefaultInventoryAccountId || '1104'}
                  onChange={e => handleChange('salesDefaultInventoryAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن الذي يُخصم منه المخزون (في حال عدم ربط المخزن بحساب مخصص)</span>
              </div>
            </div>
          )}

          {/* ===================== PURCHASES MODULE ===================== */}
          {module === 'purchases' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب الموردين (الدائنون) - الافتراضي: 2101
                </label>
                <select
                  value={formData.purchasePayablesAccountId || '2101'}
                  onChange={e => handleChange('purchasePayablesAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن عند تسجيل فاتورة مشتريات</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب مخزون المشتريات الافتراضي - الافتراضي: 110401 (مخزون الخامات)
                </label>
                <select
                  value={formData.purchaseDefaultInventoryAccountId || '110401'}
                  onChange={e => handleChange('purchaseDefaultInventoryAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين الذي تضاف إليه بضاعة المشتريات في المخزن</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب مصروفات المشتريات الافتراضي - الافتراضي: 5201
                </label>
                <select
                  value={formData.purchaseExpensesAccountId || '5201'}
                  onChange={e => handleChange('purchaseExpensesAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين لبنود المصروفات المضافة داخل فواتير الشراء</span>
              </div>
            </div>
          )}

          {/* ===================== MANUFACTURING MODULE ===================== */}
          {module === 'manufacturing' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب الإنتاج تحت التشغيل (WIP) - الافتراضي: 110402
                </label>
                <select
                  value={formData.mfgWipAccountId || '110402'}
                  onChange={e => handleChange('mfgWipAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الوسيط لتجميع تكاليف أمر التشغيل أثناء الإنتاج</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب مخزون الخامات المنصرفة - الافتراضي: 110401
                </label>
                <select
                  value={formData.mfgRawMaterialAccountId || '110401'}
                  onChange={e => handleChange('mfgRawMaterialAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن الذي تُخصم منه قيمة الخامات المستهلكة في أمر الشغل</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب مخزون الإنتاج التام - الافتراضي: 110403
                </label>
                <select
                  value={formData.mfgFinishedGoodsAccountId || '110403'}
                  onChange={e => handleChange('mfgFinishedGoodsAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين الذي يستلم قيمة المنتجات التامة الصنع بعد الإقفال</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب الموردين لمصنعيات الغير (مقاول باطن) - الافتراضي: 2101
                </label>
                <select
                  value={formData.mfgSubcontractorAccountId || '2101'}
                  onChange={e => handleChange('mfgSubcontractorAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن لمستحقات خدمات ما بعد الطباعة والمصنعيات الخارجية</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب خسائر هالك وتالف الإنتاج - الافتراضي: 5203
                </label>
                <select
                  value={formData.mfgScrapLossAccountId || '5203'}
                  onChange={e => handleChange('mfgScrapLossAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين لإثبات تكلفة العوادم والدشت والتالف</span>
              </div>
            </div>
          )}

          {/* ===================== TREASURY MODULE ===================== */}
          {module === 'treasury' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب الخزينة الرئيسية (النقدية) - الافتراضي: 1101
                </label>
                <select
                  value={formData.treasuryMainCashAccountId || '1101'}
                  onChange={e => handleChange('treasuryMainCashAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">حساب النقدية بالصندوق للمعاملات النقدية</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب البنك الافتراضي - الافتراضي: 1102
                </label>
                <select
                  value={formData.treasuryBankAccountId || '1102'}
                  onChange={e => handleChange('treasuryBankAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">حساب البنك المالي للمعاملات المصرفية</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب عمولات ومصاريف بنكية - الافتراضي: 5201 / 5202
                </label>
                <select
                  value={formData.treasuryBankFeesAccountId || '5201'}
                  onChange={e => handleChange('treasuryBankFeesAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">حساب مدين لتسجيل رسوم التحويلات والسندات</span>
              </div>
            </div>
          )}

          {/* ===================== WAREHOUSE MODULE ===================== */}
          {module === 'warehouse' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب خسائر عجز الجرد المخزني - الافتراضي: 5203 / 5201
                </label>
                <select
                  value={formData.inventoryAdjustmentLossAccountId || '5203'}
                  onChange={e => handleChange('inventoryAdjustmentLossAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب المدين عند تسوية نقص أو عجز في كميات المخزون</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  حساب أرباح فائض الجرد المخزني - الافتراضي: 4101
                </label>
                <select
                  value={formData.inventoryAdjustmentGainAccountId || '4101'}
                  onChange={e => handleChange('inventoryAdjustmentGainAccountId', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  {selectableAccounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500">الحساب الدائن عند تسوية زيادة أو فائض في كميات المخزون</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <span>✓</span> حفظ وتطبيق التوجيهات
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleAccountingSettingsModal;
