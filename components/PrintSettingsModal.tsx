import React, { useState, useEffect } from 'react';
import type { PrintSettings, CompanyInfo } from '../types.ts';
import {
  getPrintSettings,
  savePrintSettings,
  DEFAULT_PRINT_SETTINGS,
  COLOR_PALETTES,
  getPrintStyles,
  generatePrintHeader,
  generatePrintFooter,
  executePrint
} from '../utils/printEngine.ts';

interface PrintSettingsModalProps {
  onClose: () => void;
}

const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<PrintSettings>(getPrintSettings());
  const [activeTab, setActiveTab] = useState<'branding' | 'layout' | 'colors' | 'terms'>('branding');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'جراند ميديا للدعاية والإنتاج',
    address: 'المنطقة الصناعية - العاشر من رمضان',
    phone: '01000000000',
    logo: '',
    treasuryOpeningBalance: 0,
    commercialRegister: '12345',
    taxNumber: '100-200-300'
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('companyInfo');
      if (savedInfo) {
        setCompanyInfo(prev => ({ ...prev, ...JSON.parse(savedInfo) }));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleChange = <K extends keyof PrintSettings>(field: K, value: PrintSettings[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    savePrintSettings(settings);
    // Also save CR & Tax Number to companyInfo if updated
    if (settings.taxNumber !== undefined || settings.commercialRegister !== undefined) {
      try {
        const updatedInfo: CompanyInfo = {
          ...companyInfo,
          taxNumber: settings.taxNumber || companyInfo.taxNumber,
          commercialRegister: settings.commercialRegister || companyInfo.commercialRegister
        };
        localStorage.setItem('companyInfo', JSON.stringify(updatedInfo));
        setCompanyInfo(updatedInfo);
      } catch (e) {
        console.error(e);
      }
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleReset = () => {
    if (window.confirm('هل تريد استعادة جميع إعدادات وتنسيقات الطباعة الافتراضية؟')) {
      setSettings({ ...DEFAULT_PRINT_SETTINGS });
      savePrintSettings(DEFAULT_PRINT_SETTINGS);
    }
  };

  const handleTestPrint = () => {
    const headerHtml = generatePrintHeader(companyInfo, settings, {
      title: 'فاتورة تجريبية (نموذج اختبار)',
      docNumber: 'TEST-2026-001',
      date: new Date().toISOString().split('T')[0],
      secondPartyName: 'شركة النور للطباعة والتوزيع',
      secondPartyLabel: 'العميل'
    });

    const bodyHtml = `
      <table class="print-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>الصنف / البيان</th>
            <th style="width: 70px; text-align: center;">الكمية</th>
            <th style="width: 90px; text-align: center;">السعر</th>
            <th style="width: 100px; text-align: center;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><b>كرتون دوبلكس 350 جرام</b> - طباعة 4 لون + سلوفان مط</td>
            <td style="text-align: center;">5,000</td>
            <td style="text-align: center;">4.50</td>
            <td style="text-align: center; font-weight: bold;">22,500.00</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><b>علب شحن مضلعة E-Flute</b> - مقاس 25x15x10</td>
            <td style="text-align: center;">2,000</td>
            <td style="text-align: center;">3.00</td>
            <td style="text-align: center; font-weight: bold;">6,000.00</td>
          </tr>
        </tbody>
      </table>

      <div class="totals-box">
        <div class="totals-row">
          <span>المجموع الفرعي:</span>
          <b>28,500.00 ج.م</b>
        </div>
        <div class="totals-row">
          <span>ضريبة القيمة المضافة (14%):</span>
          <span>3,990.00 ج.م</span>
        </div>
        <div class="totals-row final">
          <span>الإجمالي النهائي المستحق:</span>
          <span>32,490.00 ج.م</span>
        </div>
      </div>
    `;

    const footerHtml = generatePrintFooter(settings, companyInfo);

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>نموذج طباعة تجريبي</title>
          <meta charset="utf-8">
          <style>${getPrintStyles(settings)}</style>
        </head>
        <body>
          ${headerHtml}
          ${bodyHtml}
          ${footerHtml}
        </body>
      </html>
    `;

    executePrint(fullHtml, 'نموذج طباعة تجريبي');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <span className="text-xl">🖨️</span>
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                إعدادات وتنسيق نماذج الطباعة والفواتير
                <span className="text-xs bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-normal">
                  تنسيق شامل لجميع الملفات
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                تخصيص الهوية البصرية، مقاسات الورق (A4 / A5 / حراري)، الخطوط، الترويسة، والتوقيعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPrint}
              type="button"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>🖨️</span>
              <span>طباعة تجريبية</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 flex gap-2">
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'branding'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>🏢</span>
            <span>الهوية والترويسة</span>
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'layout'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>📄</span>
            <span>مقاس الورق والخطوط</span>
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'colors'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>🎨</span>
            <span>الألوان والتصميم</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'terms'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>✍️</span>
            <span>الشروط والتوقيعات</span>
          </button>
        </div>

        {/* Content Body: Left is Form, Right is Real-time Visual Preview */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Controls Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">

            {/* TAB 1: Branding & Header */}
            {activeTab === 'branding' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b">
                  <span>🏢</span> بيانات الهوية والترويسة العلوية
                </h3>

                {/* Show logo toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <div className="text-xs font-bold text-gray-800">إظهار شعار الشركة (Logo)</div>
                    <div className="text-[11px] text-gray-500">طباعة الشعار الرسمي أعلى الفواتير والمستندات</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showLogo}
                      onChange={(e) => handleChange('showLogo', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {settings.showLogo && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">حجم الشعار في الطباعة:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'sm', label: 'صغير (50px)' },
                        { id: 'md', label: 'متوسط (70px)' },
                        { id: 'lg', label: 'كبير (90px)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleChange('logoSize', item.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            settings.logoSize === item.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Header Layout */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">تخطيط الترويسة العلوية:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'standard', label: 'كلاسيكي (جانبي)', desc: 'اللوجو والشركة يميناً وبيانات الفاتورة يساراً' },
                      { id: 'centered', label: 'موسط (رسمي)', desc: 'اللوجو والشركة في المنتصف' },
                      { id: 'modern', label: 'عصري (شريط)', desc: 'شريط ملون مع خط تمييز جانبي' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleChange('headerLayout', item.id as any)}
                        className={`p-2.5 rounded-xl text-right border transition-all ${
                          settings.headerLayout === item.id
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show Details toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <div className="text-xs font-bold text-gray-800">إظهار العنوان والهاتف والبيانات الرسمية</div>
                    <div className="text-[11px] text-gray-500">طباعة العنوان ورقم الهاتف أسفل اسم الشركة</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showCompanyDetails}
                      onChange={(e) => handleChange('showCompanyDetails', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* CR & Tax fields */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">السجل التجاري (س.ت):</label>
                    <input
                      type="text"
                      placeholder="مثال: 102938"
                      value={settings.commercialRegister || ''}
                      onChange={(e) => handleChange('commercialRegister', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الرقم الضريبي (ر.ض):</label>
                    <input
                      type="text"
                      placeholder="مثال: 300-120-450"
                      value={settings.taxNumber || ''}
                      onChange={(e) => handleChange('taxNumber', e.target.value)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Page Layout & Typography */}
            {activeTab === 'layout' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b">
                  <span>📄</span> مقاسات الورق والهوامش والخطوط
                </h3>

                {/* Paper Size */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">حجم الورق (Paper Size):</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'A4', label: 'ورق A4 قياسي', desc: 'مناسب لجميع الطابعات المكتبية والتقارير' },
                      { id: 'A5', label: 'ورق A5 (نصف صفحة)', desc: 'مناسب للإيصالات وسندات القبض' },
                      { id: 'thermal80', label: 'رول حراري (80mm)', desc: 'طابعات البونات والفواتير المصغرة' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleChange('paperSize', item.id as any)}
                        className={`p-2.5 rounded-xl text-right border transition-all ${
                          settings.paperSize === item.id
                            ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation & Margins */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">اتجاه الصفحة:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleChange('orientation', 'portrait')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                          settings.orientation === 'portrait'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        طولي (Portrait)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('orientation', 'landscape')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                          settings.orientation === 'landscape'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        عرضي (Landscape)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">هوامش الصفحة (Margins):</label>
                    <select
                      value={settings.margins}
                      onChange={(e) => handleChange('margins', e.target.value as any)}
                      className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="normal">عادي (15 مم) - مريح وأنيق</option>
                      <option value="compact">مضغوط (8 مم) - استيعاب بنود أكثر</option>
                      <option value="minimal">مصغر (4 مم) - أقصى مساحة ممكنة</option>
                    </select>
                  </div>
                </div>

                {/* Font Family & Size */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع الخط العربي:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['Cairo', 'Tajawal', 'Almarai', 'Amiri'].map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => handleChange('fontFamily', font as any)}
                          style={{ fontFamily: font }}
                          className={`py-2 px-2 rounded-lg text-xs font-bold border text-center ${
                            settings.fontFamily === font
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-gray-200 text-gray-700'
                          }`}
                        >
                          {font === 'Cairo' ? 'خط كايرو (Cairo)' : font === 'Tajawal' ? 'خط تجوال (Tajawal)' : font === 'Almarai' ? 'خط المراعي (Almarai)' : 'خط أميري (Amiri)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">حجم الخط الأساسي:</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'sm', label: 'صغير (11px)' },
                        { id: 'base', label: 'متوسط (12px)' },
                        { id: 'lg', label: 'كبير (14px)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleChange('fontSize', item.id as any)}
                          className={`py-2 px-1 rounded-lg text-xs font-bold border text-center ${
                            settings.fontSize === item.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Colors & Styling */}
            {activeTab === 'colors' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b">
                  <span>🎨</span> ألوان وتصميم القالب الموحد
                </h3>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">اختر باليتة ألوان جاهزة ومريحة للعين:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COLOR_PALETTES.map((p) => {
                      const isSelected = settings.primaryColor.toLowerCase() === p.primary.toLowerCase();
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleChange('primaryColor', p.primary)}
                          className={`p-3 rounded-xl border flex items-center justify-between text-right transition-all ${
                            isSelected
                              ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-6 h-6 rounded-lg shadow-sm border border-black/10 inline-block"
                              style={{ backgroundColor: p.primary }}
                            />
                            <span className="text-xs font-bold text-gray-800">{p.name}</span>
                          </div>
                          {isSelected && <span className="text-xs text-indigo-600 font-bold">✓ مفعل</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Input */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">لون مخصص بالكامل (HEX Code):</label>
                    <div className="text-[11px] text-gray-500">اختر أي لون يتناسب مع هويتك البصرية</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="w-10 h-10 p-0.5 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => handleChange('primaryColor', e.target.value)}
                      className="text-xs font-mono font-bold border border-gray-300 rounded-lg px-2.5 py-1.5 w-24 text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Terms & Signatures */}
            {activeTab === 'terms' && (
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 pb-2 border-b">
                  <span>✍️</span> الشروط والأحكام وخانات التوقيع الرسمية
                </h3>

                {/* Signatures Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <div className="text-xs font-bold text-gray-800">تفعيل خانات التوقيع والاعتماد</div>
                    <div className="text-[11px] text-gray-500">إظهار مربعات توقيع المحاسب والمستلم والإدارة أسفل الصفحة</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showSignatures}
                      onChange={(e) => handleChange('showSignatures', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {settings.showSignatures && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">الخانة الأولى:</label>
                      <input
                        type="text"
                        value={settings.signature1 || ''}
                        onChange={(e) => handleChange('signature1', e.target.value)}
                        placeholder="إعداد / المحاسب"
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">الخانة الثانية:</label>
                      <input
                        type="text"
                        value={settings.signature2 || ''}
                        onChange={(e) => handleChange('signature2', e.target.value)}
                        placeholder="المستلم / الطرف الآخر"
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">الخانة الثالثة:</label>
                      <input
                        type="text"
                        value={settings.signature3 || ''}
                        onChange={(e) => handleChange('signature3', e.target.value)}
                        placeholder="اعتماد الإدارة"
                        className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Greeting */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">عبارة الشكر والترحيب (في نهاية المستند):</label>
                  <input
                    type="text"
                    value={settings.footerGreeting || ''}
                    onChange={(e) => handleChange('footerGreeting', e.target.value)}
                    placeholder="شكراً لتعاملكم معنا ونسعد بخدمتكم دائماً."
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Footer Notes / Terms */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الشروط والأحكام وسياسة الاسترجاع المطبوعة:</label>
                  <textarea
                    rows={3}
                    value={settings.footerNotes || ''}
                    onChange={(e) => handleChange('footerNotes', e.target.value)}
                    placeholder="اكتب الشروط والأحكام الافتراضية للفواتير وعروض الأسعار هنا..."
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Real-Time Live Preview Column (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span>👁️</span> معاينة حية فورية للنموذج
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                تحديث فوري
              </span>
            </div>

            {/* Simulated Sheet Paper */}
            <div className="flex-1 bg-white border border-gray-300 rounded-xl shadow-lg p-4 overflow-y-auto max-h-[500px] flex flex-col justify-between text-xs scale-[0.98] origin-top">
              
              {/* Header Preview */}
              <div
                className="pb-3 border-b-2"
                style={{
                  borderColor: settings.primaryColor,
                  fontFamily: settings.fontFamily,
                  textAlign: settings.headerLayout === 'centered' ? 'center' : 'right'
                }}
              >
                <div className={`flex items-center gap-2 mb-1 ${settings.headerLayout === 'centered' ? 'justify-center flex-col' : 'justify-between'}`}>
                  <div className="flex items-center gap-2">
                    {settings.showLogo && companyInfo.logo && (
                      <img
                        src={companyInfo.logo}
                        alt="Logo"
                        style={{
                          height: settings.logoSize === 'sm' ? '30px' : settings.logoSize === 'lg' ? '50px' : '40px',
                          objectFit: 'contain'
                        }}
                      />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm" style={{ color: settings.primaryColor }}>
                        {companyInfo.name || 'جراند ميديا'}
                      </h4>
                      {settings.showCompanyDetails && (
                        <div className="text-[9px] text-gray-500">
                          {companyInfo.address} | هاتف: {companyInfo.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={settings.headerLayout === 'centered' ? 'mt-1' : 'text-left'}>
                    <span
                      className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      فاتورة مبيعات
                    </span>
                    <div className="text-[9px] font-mono text-gray-600 mt-0.5">#INV-2026-001</div>
                  </div>
                </div>
              </div>

              {/* Sample Table */}
              <div className="my-3">
                <table className="w-full text-right text-[10px] border-collapse" style={{ fontFamily: settings.fontFamily }}>
                  <thead>
                    <tr style={{ backgroundColor: settings.primaryColor, color: '#ffffff' }}>
                      <th className="p-1 border border-black/10">الصنف</th>
                      <th className="p-1 border border-black/10 text-center">الكمية</th>
                      <th className="p-1 border border-black/10 text-left">السعر</th>
                      <th className="p-1 border border-black/10 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="p-1 font-semibold text-gray-800">كرتون مضلع E-Flute</td>
                      <td className="p-1 text-center font-mono">1,000</td>
                      <td className="p-1 text-left font-mono">5.00</td>
                      <td className="p-1 text-left font-mono font-bold">5,000.00</td>
                    </tr>
                    <tr className="bg-gray-50/70 border-b border-gray-100">
                      <td className="p-1 font-semibold text-gray-800">علب دوائية دوبلكس</td>
                      <td className="p-1 text-center font-mono">2,500</td>
                      <td className="p-1 text-left font-mono">2.00</td>
                      <td className="p-1 text-left font-mono font-bold">5,000.00</td>
                    </tr>
                  </tbody>
                </table>

                {/* Mini Totals */}
                <div
                  className="mt-2.5 p-1.5 border rounded text-[10px] flex justify-between font-bold"
                  style={{
                    borderColor: settings.primaryColor,
                    backgroundColor: '#f8fafc',
                    color: settings.primaryColor
                  }}
                >
                  <span>الإجمالي النهائي:</span>
                  <span className="font-mono">10,000.00 ج.م</span>
                </div>
              </div>

              {/* Footer Preview */}
              <div className="pt-2 border-t border-gray-200 text-[9px]" style={{ fontFamily: settings.fontFamily }}>
                {settings.footerGreeting && (
                  <div className="text-center font-bold mb-1" style={{ color: settings.primaryColor }}>
                    {settings.footerGreeting}
                  </div>
                )}
                {settings.footerNotes && (
                  <div className="p-1.5 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500 leading-tight">
                    {settings.footerNotes}
                  </div>
                )}

                {settings.showSignatures && (
                  <div className="flex justify-between mt-3 text-center text-gray-600 font-semibold">
                    <div>{settings.signature1 || 'المحاسب'}</div>
                    <div>{settings.signature2 || 'المستلم'}</div>
                    <div>{settings.signature3 || 'اعتماد الإدارة'}</div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-gray-500 hover:text-red-600 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <span>🔄</span>
            <span>استعادة الإعدادات الافتراضية</span>
          </button>

          <div className="flex items-center gap-2.5">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-600 animate-pulse">
                ✓ تم حفظ الإعدادات بنجاح!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2 rounded-xl transition-all shadow-md active:scale-95"
            >
              حفظ وتطبيق على جميع المستندات
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintSettingsModal;
