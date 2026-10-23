import React, { useState, useEffect, useMemo } from 'react';
import type { Account, ModulePostingSettings, Page, ThemeSettings } from '../types.ts';
import { defaultSettingsValues, moduleTabs } from './ModuleAccountingSettingsModal.tsx';

interface AccountingSettingsPageProps {
  accounts: Account[];
  postingSettings: ModulePostingSettings;
  setPostingSettings: React.Dispatch<React.SetStateAction<ModulePostingSettings>>;
  onNavigate?: (page: Page) => void;
  onOpenAuditModal?: () => void;
  themeSettings?: ThemeSettings;
  setThemeSettings?: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  currentBranchName?: string;
  currentUserName?: string;
}

type TabType = 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse' | 'all';
type AccountTypeFilter = 'all' | 'customized' | 'asset' | 'liability' | 'revenue' | 'expense';

interface ModuleConfig {
  id: TabType;
  title: string;
  icon: string;
  color: string;
  lightBg: string;
  lightBorder: string;
  badgeBg: string;
  badgeText: string;
  lightTabClass: string;
  count: number;
}

const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  sales: {
    id: 'sales',
    title: 'المبيعات ومرتجعات البيع',
    icon: '📈',
    color: 'emerald',
    lightBg: 'bg-emerald-50/60',
    lightBorder: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-800',
    lightTabClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
    count: 7
  },
  purchases: {
    id: 'purchases',
    title: 'المشتريات وتوريدات الموردين',
    icon: '🛒',
    color: 'amber',
    lightBg: 'bg-amber-50/60',
    lightBorder: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
    lightTabClass: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
    count: 6
  },
  manufacturing: {
    id: 'manufacturing',
    title: 'التصنيع وتكاليف التشغيل',
    icon: '🏗️',
    color: 'purple',
    lightBg: 'bg-purple-50/60',
    lightBorder: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeText: 'text-purple-800',
    lightTabClass: 'bg-purple-600 text-white shadow-md shadow-purple-600/20',
    count: 7
  },
  treasury: {
    id: 'treasury',
    title: 'الخزينة والمصارف والبنوك',
    icon: '🏦',
    color: 'blue',
    lightBg: 'bg-sky-50/60',
    lightBorder: 'border-sky-200',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeText: 'text-blue-800',
    lightTabClass: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
    count: 6
  },
  warehouse: {
    id: 'warehouse',
    title: 'المستودعات والجرد والأصول',
    icon: '🏭',
    color: 'rose',
    lightBg: 'bg-rose-50/60',
    lightBorder: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeText: 'text-rose-800',
    lightTabClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/20',
    count: 4
  },
  all: {
    id: 'all',
    title: 'شامل كل الموديولات',
    icon: '📑',
    color: 'indigo',
    lightBg: 'bg-slate-50',
    lightBorder: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    badgeText: 'text-slate-800',
    lightTabClass: 'bg-slate-800 text-white shadow-md shadow-slate-800/20',
    count: 30
  }
};

const AccountingSettingsPage: React.FC<AccountingSettingsPageProps> = ({
  accounts,
  postingSettings,
  setPostingSettings,
  onNavigate,
  onOpenAuditModal,
  themeSettings,
  setThemeSettings,
  currentBranchName = 'جراند ميديا',
  currentUserName = 'المسؤول'
}) => {
  const [currentTab, setCurrentTab] = useState<TabType>('sales');
  const [formData, setFormData] = useState<ModulePostingSettings>({
    ...defaultSettingsValues,
    ...(postingSettings || {})
  });
  const [accountFilterText, setAccountFilterText] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountTypeFilter>('all');
  const [savedSuccessMessage, setSavedSuccessMessage] = useState('');

  // Local day/night mode toggle
  const isDarkMode = (themeSettings?.theme === 'dark');

  const handleToggleTheme = (mode: 'light' | 'dark') => {
    if (setThemeSettings) {
      setThemeSettings(prev => ({
        ...prev,
        theme: mode === 'light' ? 'default' : 'dark'
      }));
    }
  };

  useEffect(() => {
    if (postingSettings && Object.keys(postingSettings).length > 0) {
      setFormData(prev => ({
        ...defaultSettingsValues,
        ...postingSettings
      }));
    }
  }, [postingSettings]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    const currentSaved = postingSettings || defaultSettingsValues;
    for (const key of Object.keys(defaultSettingsValues) as (keyof ModulePostingSettings)[]) {
      const formVal = formData[key] || defaultSettingsValues[key];
      const savedVal = currentSaved[key] || defaultSettingsValues[key];
      if (formVal !== savedVal) return true;
    }
    return false;
  }, [formData, postingSettings]);

  // Count customized accounts vs default
  const customizedCount = useMemo(() => {
    return Object.entries(defaultSettingsValues).filter(
      ([key, defVal]) => formData[key as keyof ModulePostingSettings] && formData[key as keyof ModulePostingSettings] !== defVal
    ).length;
  }, [formData]);

  const selectableAccounts = useMemo(() => {
    return accounts.filter(a => !a.isGroup);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = selectableAccounts;
    if (accountFilterText.trim()) {
      const q = accountFilterText.toLowerCase();
      list = list.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.code || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter === 'asset') {
      list = list.filter(a => (a.code && a.code.startsWith('1')) || a.type === 'مدين');
    } else if (typeFilter === 'liability') {
      list = list.filter(a => (a.code && a.code.startsWith('2')) || a.type === 'دائن');
    } else if (typeFilter === 'revenue') {
      list = list.filter(a => a.code && a.code.startsWith('4'));
    } else if (typeFilter === 'expense') {
      list = list.filter(a => a.code && a.code.startsWith('5'));
    }
    return list;
  }, [selectableAccounts, accountFilterText, typeFilter]);

  const handleChange = (field: keyof ModulePostingSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResetSingleField = (field: keyof ModulePostingSettings, defaultAccId: string) => {
    handleChange(field, defaultAccId);
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

  const handleDiscardChanges = () => {
    setFormData({
      ...defaultSettingsValues,
      ...(postingSettings || {})
    });
  };

  // Helper to render account field cards in bright, high-contrast light mode
  const renderAccountField = (
    label: string,
    field: keyof ModulePostingSettings,
    defaultAccId: string,
    description: string,
    moduleKey: 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse',
    nature: 'مدين' | 'دائن' | 'أصل' | 'التزام' | 'إيراد' | 'مصروف' = 'مدين'
  ) => {
    const currentValue = formData[field] || defaultAccId;
    const isCustomized = currentValue !== defaultAccId;
    const currentAccount = accounts.find(a => a.id === currentValue);
    const config = MODULE_CONFIGS[moduleKey];

    if (typeFilter === 'customized' && !isCustomized) {
      return null;
    }

    const natureBadgeClasses = nature === 'مدين' || nature === 'أصل' || nature === 'مصروف'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';

    return (
      <div
        className={`group relative rounded-2xl border-2 transition-all duration-200 p-5 shadow-sm hover:shadow-md bg-white ${
          isCustomized
            ? 'border-indigo-400 ring-2 ring-indigo-100'
            : `${config.lightBorder} hover:border-gray-400`
        }`}
      >
        {/* Accent Bar on Right Side */}
        <div className={`absolute top-0 right-0 bottom-0 w-1.5 rounded-r-2xl ${
          moduleKey === 'sales' ? 'bg-emerald-500' :
          moduleKey === 'purchases' ? 'bg-amber-500' :
          moduleKey === 'manufacturing' ? 'bg-purple-500' :
          moduleKey === 'treasury' ? 'bg-blue-500' : 'bg-rose-500'
        }`} />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            <label className="text-sm font-black text-slate-900">
              {label}
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${natureBadgeClasses}`}>
              {nature}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold" title="كود الحساب الافتراضي">
              الافتراضي: {defaultAccId}
            </span>
            {isCustomized && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300">
                مُخصّص ✨
              </span>
            )}
          </div>
        </div>

        {/* Selected Account Status Pill */}
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${currentAccount ? 'bg-emerald-500 shadow-sm' : 'bg-red-500'}`} />
            {currentAccount ? (
              <div className="truncate text-xs">
                <span className="font-mono font-black text-slate-900 ml-1.5 bg-white px-2 py-0.5 rounded border border-slate-300 shadow-xs">
                  {currentAccount.code}
                </span>
                <span className="font-black text-slate-800">
                  {currentAccount.name}
                </span>
                <span className="text-[10px] text-slate-500 mr-1.5 font-bold">
                  ({currentAccount.type || (currentAccount.code.startsWith('1') || currentAccount.code.startsWith('5') ? 'مدين' : 'دائن')})
                </span>
              </div>
            ) : (
              <span className="text-xs text-red-600 font-bold">
                ⚠️ الحساب المحدد برقم ({currentValue}) غير مسجل بالدليل
              </span>
            )}
          </div>

          {isCustomized && (
            <button
              type="button"
              onClick={() => handleResetSingleField(field, defaultAccId)}
              className="text-[11px] font-extrabold text-indigo-700 hover:text-indigo-900 hover:underline flex-shrink-0 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200"
              title="استعادة الحساب الافتراضي لهذا البند"
            >
              <span>↩️</span>
              <span>استعادة</span>
            </button>
          )}
        </div>

        {/* Select Input with High Contrast */}
        <div className="relative">
          <select
            value={currentValue}
            onChange={e => handleChange(field, e.target.value)}
            className="w-full border-2 border-slate-300 rounded-xl p-2.5 text-xs font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow shadow-xs"
          >
            {filteredAccounts.map(a => (
              <option key={a.id} value={a.id} className="text-slate-900 font-medium">
                {a.code} - {a.name} ({a.type === 'Asset' || a.type === 'مدين' ? 'مدين' : 'دائن'})
              </option>
            ))}
          </select>
        </div>

        {/* Accounting Description */}
        <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 leading-relaxed flex items-start gap-1.5">
          <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">💡</span>
          <span>{description}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans" dir="rtl">
      {/* Top Main Banner Hero Card - Clean Light Mode */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-indigo-50/70 p-6 md:p-8 rounded-3xl shadow-sm border-2 border-indigo-100">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl shadow-md ring-4 ring-indigo-50">
              ⚖️
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                  إعدادات التوجيه والترحيل المحاسبي
                </h1>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مفعل ونشط تلقائياً
                </span>
                {customizedCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs px-2.5 py-1 rounded-full font-black">
                    {customizedCount} حساب مخصص
                  </span>
                )}
              </div>

              {/* Branch & User Context Pills */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-lg font-black flex items-center gap-1">
                  <span>🏢</span>
                  <span>الفرع: {currentBranchName}</span>
                </span>
                <span className="text-xs bg-gray-100 text-gray-800 border border-gray-200 px-2.5 py-0.5 rounded-lg font-black flex items-center gap-1">
                  <span>👤</span>
                  <span>المستخدم: {currentUserName}</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  (يتم حفظ المظهر والألوان والتفضيلات بشكل مستقل لهذا الفرع والمستخدم)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Day / Night Mode Toggle Switch */}
            <div className="flex items-center bg-white p-1 rounded-xl border-2 border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => handleToggleTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  !isDarkMode
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="الوضع النهاري الفاتح - ألوان واضحة ومشرقة لسهولة الرؤية"
              >
                <span>☀️</span>
                <span>نهاري فاتح</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  isDarkMode
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="الوضع الليلي - ألوان داكنة"
              >
                <span>🌙</span>
                <span>ليلي</span>
              </button>
            </div>

            {onOpenAuditModal && (
              <button
                type="button"
                onClick={onOpenAuditModal}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-2 border-indigo-200 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs"
                title="فحص اتزان ونزاهة القيود المحاسبية آلياً"
              >
                <span>🛡️</span>
                <span>فحص النزاهة المحاسبية</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleResetDefaults}
              className="bg-white hover:bg-slate-100 text-slate-700 border-2 border-slate-300 px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
            >
              <span>🔄</span>
              <span>استعادة الافتراضيات</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>💾</span>
              <span>حفظ وتطبيق التوجيهات</span>
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors border border-slate-300"
                title="العودة للإعدادات العامة"
              >
                العودة للإعدادات
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {savedSuccessMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-2xl text-xs font-black flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>{savedSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSavedSuccessMessage('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 text-base"
          >
            ✕
          </button>
        </div>
      )}

      {/* Interactive Module KPI Overview Cards in Light Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {(['sales', 'purchases', 'manufacturing', 'treasury', 'warehouse'] as TabType[]).map(key => {
          const cfg = MODULE_CONFIGS[key];
          const isActive = currentTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCurrentTab(key)}
              className={`p-4 rounded-2xl border-2 text-right transition-all duration-200 ${
                isActive
                  ? `${cfg.lightBg} border-${cfg.color}-500 ring-2 ring-${cfg.color}-400/40 shadow-sm transform -translate-y-0.5`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{cfg.icon}</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}>
                  {cfg.count} حسابات
                </span>
              </div>
              <div className="font-black text-sm text-slate-900 truncate">
                {cfg.title.split(' ')[0]}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                توجيهات {cfg.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-xs border-2 border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {moduleTabs.map(t => {
            const isActive = currentTab === t.id;
            const cfg = MODULE_CONFIGS[t.id];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrentTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? cfg.lightTabClass
                    : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {cfg.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-bold px-3 hidden md:block">
          {selectableAccounts.length} حساب مسجل بالدليل
        </div>
      </div>

      {/* Search & Account Type Filter Chips */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border-2 border-slate-200 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 بحث سريع في الحسابات بالاسم أو الكود..."
            value={accountFilterText}
            onChange={e => setAccountFilterText(e.target.value)}
            className="w-full text-xs p-3 pr-10 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-right focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
          />
          {accountFilterText && (
            <button
              onClick={() => setAccountFilterText('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700 text-sm font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-black text-slate-700">
          <span className="text-[11px] text-slate-500 font-bold">تصفية حسب الطبيعة:</span>
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            كل الحسابات
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('customized')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'customized'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            المعدلة فقط ({customizedCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('asset')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'asset'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            الأصول (1)
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('liability')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'liability'
                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            الخصوم (2)
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('revenue')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'revenue'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            الإيرادات (4)
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('expense')}
            className={`px-3 py-1 rounded-lg border-2 transition-all ${
              typeFilter === 'expense'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            المصروفات (5)
          </button>
        </div>
      </div>

      {/* Main Content Panels - Bright & Clear */}
      <div className="space-y-8">
        {/* ===================== SALES ===================== */}
        {(currentTab === 'sales' || currentTab === 'all') && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border-2 border-emerald-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-emerald-100 gap-2">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
                  📈
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    توجيهات موديول المبيعات ومرتجعات البيع
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    توليد قيود استحقاق الإيراد، تخفيض المخزون بتكلفة البضاعة المباعة (COGS)، واحتساب الضريبة والخصم
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                7 حسابات توجيه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب العملاء (المدينون)', 'salesReceivablesAccountId', '1103', 'يُسجل مديناً بإجمالي الفاتورة الآجلة أو دائناً بالمرتجع وسداد التحصيلات', 'sales', 'أصل')}
              {renderAccountField('حساب إيرادات المبيعات', 'salesRevenueAccountId', '4101', 'يُسجل دائناً بقيمة المبيعات المحققة لصافي الفاتورة', 'sales', 'إيراد')}
              {renderAccountField('حساب مرتجعات ومسموحات المبيعات', 'salesReturnsAccountId', '4102', 'يُسجل مديناً عند عمل مرتجع بيع أو إلغاء فاتورة بيع لخفض الإيراد', 'sales', 'إيراد')}
              {renderAccountField('حساب تكلفة البضاعة المباعة (COGS)', 'salesCogsAccountId', '5101', 'يُسجل مديناً بتكلفة الأصناف المباعة وفق نظام الجرد المستمر', 'sales', 'مصروف')}
              {renderAccountField('حساب المخزون الافتراضي للمبيعات', 'salesDefaultInventoryAccountId', '1104', 'يُسجل دائناً بتكلفة الأصناف المباعة لخفض قيمة المخزون الدفتري', 'sales', 'أصل')}
              {renderAccountField('حساب ضريبة القيمة المضافة المحصلة', 'salesVatAccountId', '2105', 'حساب التزام وسيط لضريبة المبيعات المحصلة لصالح مصلحة الضرائب', 'sales', 'التزام')}
              {renderAccountField('حساب الخصم المسموح به', 'salesDiscountAccountId', '5301', 'يُسجل مديناً عند منح خصم تجاري أو تعجيلي للعميل على الفاتورة', 'sales', 'مصروف')}
            </div>
          </div>
        )}

        {/* ===================== PURCHASES ===================== */}
        {(currentTab === 'purchases' || currentTab === 'all') && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border-2 border-amber-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-amber-100 gap-2">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
                  🛒
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    توجيهات موديول المشتريات ومرتجعات الشراء (Debit Notes)
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    إثبات استحقاقات الموردين، زيادة أرصدة الخامات والمستودعات، تسوية ضريبة المدخلات ومصاريف الشحن
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                6 حسابات توجيه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الموردين (الدائنون)', 'purchasePayablesAccountId', '2101', 'يُسجل دائناً بإجمالي فاتورة الشراء الآجلة أو مديناً بالمرتجع وسداد الدفعات', 'purchases', 'التزام')}
              {renderAccountField('حساب مخزون الخامات والمشتريات', 'purchaseDefaultInventoryAccountId', '110401', 'يُسجل مديناً بقيمة المواد المشتراة لزيادة رصيد وقيمة المخزون', 'purchases', 'أصل')}
              {renderAccountField('حساب مصروفات المشتريات والشحن', 'purchaseExpensesAccountId', '5201', 'حساب التكلفة للبنود الخدمية والمصروفات المصاحبة للشراء (نقل، شحن، جمارك)', 'purchases', 'مصروف')}
              {renderAccountField('حساب ضريبة القيمة المضافة مدخلات', 'purchaseVatAccountId', '1106', 'حساب ضريبة المشتريات القابلة للخصم والاسترداد الضريبي', 'purchases', 'أصل')}
              {renderAccountField('حساب الخصم المكتسب من الموردين', 'purchaseDiscountAccountId', '4202', 'يُسجل دائناً كإيراد بقيمة الخصومات المكتسبة من الموردين', 'purchases', 'إيراد')}
              {renderAccountField('حساب اعتمادات وبضاعة بالطريق', 'purchaseGoodsInTransitAccountId', '110404', 'للتوريدات المؤجلة والاعتمادات المستندية قبل وصولها الفعلي للمخازن', 'purchases', 'أصل')}
            </div>
          </div>
        )}

        {/* ===================== MANUFACTURING ===================== */}
        {(currentTab === 'manufacturing' || currentTab === 'all') && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border-2 border-purple-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-purple-100 gap-2">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl font-bold">
                  🏗️
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    توجيهات موديول التصنيع والتشغيل وأوامر الإنتاج
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    ترحيل حسابات التشغيل (WIP)، استهلاك الخامات، إضافة المنتج النهائي، وأجور العمالة ومقاولي الباطن
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                7 حسابات توجيه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الإنتاج تحت التشغيل (WIP)', 'mfgWipAccountId', '110402', 'يُحمل مديناً بجميع تكاليف المواد والمصنعيات والمصروفات أثناء مراحل التصنيع', 'manufacturing', 'أصل')}
              {renderAccountField('حساب مخزون الخامات المستهلكة', 'mfgRawMaterialAccountId', '110401', 'يُسجل دائناً بتكلفة الخامات المنصرفة لأمر الإنتاج لخصمها من المستودع', 'manufacturing', 'أصل')}
              {renderAccountField('حساب مخزون الإنتاج التام النهائي', 'mfgFinishedGoodsAccountId', '110403', 'يُسجل مديناً بالتكلفة الإجمالية للمنتج النهائي التام المورد للمخزن', 'manufacturing', 'أصل')}
              {renderAccountField('حساب مصنعيات الغير ومقاولي الباطن', 'mfgSubcontractorAccountId', '2101', 'يُسجل دائناً بتكلفة العمليات الخارجية المنفذة لدى الغير', 'manufacturing', 'التزام')}
              {renderAccountField('حساب خسائر وهالك الإنتاج (Scrap)', 'mfgScrapLossAccountId', '5203', 'يُسجل مديناً بتكلفة الهالك والتالف الخارج عن المعدلات الطبيعية', 'manufacturing', 'مصروف')}
              {renderAccountField('حساب أجور ومصروفات التشغيل المباشرة', 'mfgDirectLaborAccountId', '5102', 'أجور عمال الإنتاج وتكاليف التشغيل المباشرة المحملة على أمر التصنيع', 'manufacturing', 'مصروف')}
              {renderAccountField('حساب المصروفات الصناعية غير المباشرة', 'mfgDefaultExpenseAccountId', '5201', 'الكهرباء والصيانة والمصروفات الخدمية المحملة على المصنع', 'manufacturing', 'مصروف')}
            </div>
          </div>
        )}

        {/* ===================== TREASURY ===================== */}
        {(currentTab === 'treasury' || currentTab === 'all') && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border-2 border-sky-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-sky-100 gap-2">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-xl font-bold">
                  🏦
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    توجيهات موديول الخزينة والبنوك وحركات النقدية
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    ربط الصناديق النقدية، الحسابات المصرفية، المحافظ الذكية (فودافون كاش)، وشبكة إنستاباي
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                6 حسابات توجيه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب الخزينة النقدية الرئيسية', 'treasuryMainCashAccountId', '1101', 'الحساب النقدي لصندوق النقدية الرئيسي لمقبوضات ومدفوعات الكاش', 'treasury', 'أصل')}
              {renderAccountField('حساب البنك الرئيسي', 'treasuryBankAccountId', '1102', 'حساب المعاملات البنكية والشيكات والتحويلات المصرفية الجارية', 'treasury', 'أصل')}
              {renderAccountField('حساب المحافظ الإلكترونية (فودافون كاش)', 'treasuryVodafoneCashAccountId', '1106', 'حساب المعاملات النقدية عبر محافظ الهواتف الذكية والتطبيقات', 'treasury', 'أصل')}
              {renderAccountField('حساب شبكة المدفوعات اللحظية (إنستاباي)', 'treasuryInstapayAccountId', '1107', 'حساب التحويلات الفورية عبر منظومة إنستاباي والمدفوعات الإلكترونية', 'treasury', 'أصل')}
              {renderAccountField('حساب مصاريف وعمولات بنكية', 'treasuryBankFeesAccountId', '5201', 'يُحمل بالعمولات والمصاريف الإدارية المقتطعة على التحويلات والتحصيلات', 'treasury', 'مصروف')}
              {renderAccountField('حساب جاري الشركاء الافتراضي', 'treasuryPartnerCurrentAccountId', '3102', 'مسحوبات وإيداعات الشركاء والتمويلات الشخصية المؤقتة', 'treasury', 'التزام')}
            </div>
          </div>
        )}

        {/* ===================== WAREHOUSE & ASSETS ===================== */}
        {(currentTab === 'warehouse' || currentTab === 'all') && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xs border-2 border-rose-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-rose-100 gap-2">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-xl font-bold">
                  🏭
                </span>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    توجيهات المستودعات والتسويات الجردية والأصول الثابتة
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    معالجة فوارق الجرد الفعلي (عجز / فائض)، وتوجيه إهلاكات ومجمعات الأصول الثابتة
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                4 حسابات توجيه
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountField('حساب عجز الجرد والتسويات السالبة', 'inventoryAdjustmentLossAccountId', '5201', 'يُسجل مديناً بقيمة العجز والتلف المخزني المكتشف أثناء الجرد', 'warehouse', 'مصروف')}
              {renderAccountField('حساب فائض الجرد والتسويات الموجبة', 'inventoryAdjustmentGainAccountId', '4201', 'يُسجل دائناً كإيراد رأس مالي ناتج عن الزيادات الجردية', 'warehouse', 'إيراد')}
              {renderAccountField('حساب مجمع إهلاك الأصول الثابتة', 'fixedAssetsAccumDepreciationAccountId', '1202', 'حساب الخصوم المقابل للأصول لتراكم الإهلاك السنوي الدفتري', 'warehouse', 'التزام')}
              {renderAccountField('حساب مصروف إهلاك الأصول الثابتة', 'fixedAssetsDepreciationExpenseAccountId', '5204', 'يُسجل مديناً ضمن مصروفات الفترة بقسط الإهلاك الدفتري للأصل', 'warehouse', 'مصروف')}
            </div>
          </div>
        )}
      </div>

      {/* Floating / Sticky Unsaved Changes Notification Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-40 bg-white border-2 border-indigo-400 text-slate-900 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-bounce-subtle">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-spin">⚙️</span>
            <div>
              <div className="font-black text-sm text-slate-900">لديك تعديلات غير محفوظة في التوجيه المحاسبي!</div>
              <div className="text-xs text-slate-600 font-medium">اضغط على زر الحفظ لتطبيق التوجيهات فوراً على القيود اليومية الجديدة.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              تراجع عن التعديل
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>حفظ التعديلات الآن</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingSettingsPage;
