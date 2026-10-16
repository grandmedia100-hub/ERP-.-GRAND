import React, { useState, useMemo } from 'react';
import type { FixedAsset, DepreciationEntry, JournalEntry, DepreciationMethod, Account } from '../types.ts';

interface FixedAssetsProps {
  fixedAssets: FixedAsset[];
  setFixedAssets: React.Dispatch<React.SetStateAction<FixedAsset[]>>;
  depreciationEntries: DepreciationEntry[];
  setDepreciationEntries: React.Dispatch<React.SetStateAction<DepreciationEntry[]>>;
  createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string }) => void;
  logAction: (action: string) => void;
  accounts: Account[];
}

const FixedAssets: React.FC<FixedAssetsProps> = ({
  fixedAssets, setFixedAssets, depreciationEntries, setDepreciationEntries, createJournalEntry, logAction, accounts
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'depreciation'>('register');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Asset State
  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    name: '', category: 'آلات ومعدات', purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0, usefulLifeYears: 5, salvageValue: 0, depreciationMethod: 'straight_line',
    notes: '',
    depreciationExpenseAccount: '', accumulatedDepreciationAccount: '', cashAccount: '',
    tax1Name: '', tax1Amount: 0, tax2Name: '', tax2Amount: 0
  });

  const categories = ['آلات ومعدات', 'سيارات ونقل', 'أثاث ومفروشات', 'أجهزة كمبيوتر', 'مباني وإنشاءات'];

  const stats = useMemo(() => {
    let totalCost = 0;
    let totalDep = 0;
    fixedAssets.forEach(a => {
      if (a.status !== 'disposed') {
        totalCost += a.purchaseCost;
        totalDep += a.accumulatedDepreciation;
      }
    });
    return { totalCost, totalDep, netValue: totalCost - totalDep };
  }, [fixedAssets]);

  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.purchaseCost) return alert('الرجاء إدخال اسم الأصل وقيمته');

    const asset: FixedAsset = {
      id: `FA-${Date.now()}`,
      name: newAsset.name,
      category: newAsset.category || 'آلات ومعدات',
      purchaseDate: newAsset.purchaseDate || new Date().toISOString().split('T')[0],
      purchaseCost: Number(newAsset.purchaseCost),
      usefulLifeYears: Number(newAsset.usefulLifeYears),
      salvageValue: Number(newAsset.salvageValue),
      depreciationMethod: newAsset.depreciationMethod as DepreciationMethod || 'straight_line',
      accumulatedDepreciation: 0,
      status: 'active',
      notes: newAsset.notes,
      depreciationExpenseAccount: newAsset.depreciationExpenseAccount,
      accumulatedDepreciationAccount: newAsset.accumulatedDepreciationAccount,
      cashAccount: newAsset.cashAccount,
      tax1Name: newAsset.tax1Name,
      tax1Amount: Number(newAsset.tax1Amount || 0),
      tax2Name: newAsset.tax2Name,
      tax2Amount: Number(newAsset.tax2Amount || 0),
      createdAt: new Date().toISOString()
    };

    setFixedAssets(prev => [...prev, asset]);
    logAction(`تم إضافة أصل ثابت جديد: ${asset.name}`);
    setIsAddModalOpen(false);
    
    // Reset form
    setNewAsset({
      name: '', category: 'آلات ومعدات', purchaseDate: new Date().toISOString().split('T')[0],
      purchaseCost: 0, usefulLifeYears: 5, salvageValue: 0, depreciationMethod: 'straight_line', notes: '',
      depreciationExpenseAccount: '', accumulatedDepreciationAccount: '', cashAccount: '',
      tax1Name: '', tax1Amount: 0, tax2Name: '', tax2Amount: 0
    });
  };

  const handleCalculateMonthlyDepreciation = () => {
    if (!window.confirm('هل أنت متأكد من حساب الإهلاك الشهري للأصول النشطة؟ سيتم توليد قيود محاسبية تلقائياً.')) return;
    
    const today = new Date().toISOString().split('T')[0];
    let totalMonthlyDep = 0;
    const newEntries: DepreciationEntry[] = [];
    const updatedAssets = [...fixedAssets];

    updatedAssets.forEach((asset, index) => {
      if (asset.status === 'active') {
        let monthlyAmount = 0;
        const nbv = asset.purchaseCost - asset.accumulatedDepreciation;

        if (asset.depreciationMethod === 'straight_line') {
          monthlyAmount = (asset.purchaseCost - asset.salvageValue) / (asset.usefulLifeYears * 12);
        } else {
           // declining balance 
           monthlyAmount = (nbv * 2) / (asset.usefulLifeYears * 12);
        }

        // Check if fully depreciated
        if (nbv - monthlyAmount < asset.salvageValue) {
          monthlyAmount = nbv - asset.salvageValue;
          updatedAssets[index].status = 'fully_depreciated';
        }

        if (monthlyAmount > 0) {
          updatedAssets[index].accumulatedDepreciation += monthlyAmount;
          totalMonthlyDep += monthlyAmount;

          const entry: DepreciationEntry = {
            id: `DEP-${Date.now()}-${index}`,
            assetId: asset.id,
            date: today,
            amount: monthlyAmount
          };
          newEntries.push(entry);
        }
      }
    });

    if (totalMonthlyDep > 0) {
      setFixedAssets(updatedAssets);
      setDepreciationEntries(prev => [...prev, ...newEntries]);
      
      // Journal Entry
      createJournalEntry({
        description: `إهلاك الأصول الثابتة لشهر ${today.slice(0, 7)}`,
        date: today,
        referenceType: 'Manual',
        referenceId: `DEP-BATCH-${Date.now()}`,
        lines: [
          { accountId: '5301', accountName: 'مصروف الإهلاك', debit: totalMonthlyDep, credit: 0 },
          { accountId: '1206', accountName: 'مجمع إهلاك الأصول الثابتة', debit: 0, credit: totalMonthlyDep }
        ]
      });
      logAction(`تم حساب إهلاك الأصول الثابتة بقيمة ${totalMonthlyDep.toFixed(2)}`);
      alert('تم حساب الإهلاك بنجاح!');
    } else {
      alert('لا يوجد أصول تتطلب الإهلاك (أو تم إهلاكها بالكامل).');
    }
  };

  const handleDispose = (assetId: string) => {
    const asset = fixedAssets.find(a => a.id === assetId);
    if (!asset) return;
    
    const price = window.prompt(`أدخل قيمة بيع أو استبعاد الأصل (${asset.name}):\n(أدخل 0 إذا كان تالف/خردة)`, "0");
    if (price === null) return;
    const salePrice = Number(price);

    const nbv = asset.purchaseCost - asset.accumulatedDepreciation;
    const gainOrLoss = salePrice - nbv;

    // Journal Entry lines
    const lines = [];
    if (salePrice > 0) {
      lines.push({ accountId: '1101', accountName: 'الخزينة الرئيسية', debit: salePrice, credit: 0 }); // Cash
    }
    
    lines.push({ accountId: '1206', accountName: 'مجمع إهلاك الأصول الثابتة', debit: asset.accumulatedDepreciation, credit: 0 });
    lines.push({ accountId: '1205', accountName: 'الأصول الثابتة (التكلفة)', debit: 0, credit: asset.purchaseCost });

    if (gainOrLoss < 0) {
      lines.push({ accountId: '5302', accountName: 'خسائر استبعاد أصول', debit: Math.abs(gainOrLoss), credit: 0 });
    } else if (gainOrLoss > 0) {
      lines.push({ accountId: '4202', accountName: 'أرباح بيع أصول', debit: 0, credit: gainOrLoss });
    }

    createJournalEntry({
      description: `استبعاد أصل ثابت: ${asset.name}`,
      date: new Date().toISOString().split('T')[0],
      referenceType: 'Manual',
      referenceId: asset.id,
      lines: lines
    });

    setFixedAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: 'disposed' } : a));
    logAction(`تم استبعاد أصل: ${asset.name}`);
    alert('تم الاستبعاد وإنشاء قيد التخلص من الأصل.');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">الأصول الثابتة والإهلاكات</h1>
        <button onClick={() => setIsAddModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors">
          + إضافة أصل جديد
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <p className="text-blue-100 text-sm">إجمالي تكلفة الأصول</p>
          <p className="text-2xl font-bold mt-1">{stats.totalCost.toLocaleString('en-US')} ج.م</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg">
          <p className="text-red-100 text-sm">مجمع الإهلاك الكلي</p>
          <p className="text-2xl font-bold mt-1">{stats.totalDep.toLocaleString('en-US', {maximumFractionDigits:2})} ج.م</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <p className="text-green-100 text-sm">صافي القيمة الدفترية</p>
          <p className="text-2xl font-bold mt-1">{stats.netValue.toLocaleString('en-US', {maximumFractionDigits:2})} ج.م</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-4 mb-4">
        <button
          className={`pb-2 px-4 font-semibold text-lg ${activeTab === 'register' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('register')}
        >
          سجل الأصول
        </button>
        <button
          className={`pb-2 px-4 font-semibold text-lg ${activeTab === 'depreciation' ? 'border-b-2 border-purple-600 text-purple-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('depreciation')}
        >
          حساب الإهلاكات
        </button>
      </div>

      {activeTab === 'register' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-sm font-semibold text-gray-600">اسم الأصل</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">التصنيف</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">تاريخ الشراء</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">التكلفة</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">مجمع الإهلاك</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">القيمة الدفترية</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">الحالة</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fixedAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{asset.name}</td>
                    <td className="p-4 text-gray-600">{asset.category}</td>
                    <td className="p-4 text-gray-600">{asset.purchaseDate}</td>
                    <td className="p-4 text-gray-600 font-semibold">{asset.purchaseCost.toLocaleString('en-US')}</td>
                    <td className="p-4 text-red-600 font-semibold">{asset.accumulatedDepreciation.toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                    <td className="p-4 text-green-600 font-bold">{(asset.purchaseCost - asset.accumulatedDepreciation).toLocaleString('en-US', {maximumFractionDigits:2})}</td>
                    <td className="p-4">
                      {asset.status === 'active' ? <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">نشط</span> : 
                       asset.status === 'fully_depreciated' ? <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">مهلك بالكامل</span> :
                       <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">مستبعد</span>}
                    </td>
                    <td className="p-4">
                      {asset.status === 'active' && (
                         <button onClick={() => handleDispose(asset.id)} className="text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-2 py-1 rounded">
                           استبعاد / بيع
                         </button>
                      )}
                    </td>
                  </tr>
                ))}
                {fixedAssets.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">لا توجد أصول ثابتة مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'depreciation' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl shadow-md border-r-4 border-purple-500 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">تشغيل الإهلاك الشهري التلقائي</h2>
              <p className="text-gray-600 text-sm mt-1">اضغط هنا نهاية كل شهر ليقوم النظام بحساب الإهلاك للأصول النشطة وتوليد قيد يومية للإهلاك ومجمع الإهلاك.</p>
            </div>
            <button onClick={handleCalculateMonthlyDepreciation} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors">
              حساب إهلاك الشهر الحالي
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden mt-6">
            <h3 className="p-4 bg-gray-50 border-b font-bold text-gray-800 text-lg">سجل الإهلاكات السابقة</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-semibold text-gray-600">التاريخ</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">اسم الأصل</th>
                    <th className="p-3 text-sm font-semibold text-gray-600">قيمة الإهلاك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {depreciationEntries.map(entry => {
                    const asset = fixedAssets.find(a => a.id === entry.assetId);
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-700" dir="ltr" style={{textAlign:'right'}}>{entry.date}</td>
                        <td className="p-3 font-semibold text-gray-800">{asset?.name || 'غير معروف'}</td>
                        <td className="p-3 text-red-600 font-bold">{entry.amount.toLocaleString('en-US', {maximumFractionDigits:2})} ج.م</td>
                      </tr>
                    );
                  })}
                  {depreciationEntries.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-gray-500">لا يوجد حركات إهلاك مسجلة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">إضافة أصل ثابت جديد</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الأصل</label>
                <input type="text" className="w-full p-2 border rounded-lg" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الشراء</label>
                <input type="date" className="w-full p-2 border rounded-lg" value={newAsset.purchaseDate} onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الشراء (التكلفة)</label>
                <input type="number" min="0" className="w-full p-2 border rounded-lg" value={newAsset.purchaseCost} onChange={e => setNewAsset({...newAsset, purchaseCost: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمر الافتراضي (بالسنوات)</label>
                <input type="number" min="1" className="w-full p-2 border rounded-lg" value={newAsset.usefulLifeYears} onChange={e => setNewAsset({...newAsset, usefulLifeYears: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القيمة التخريدية (الخردة)</label>
                <input type="number" min="0" className="w-full p-2 border rounded-lg" value={newAsset.salvageValue} onChange={e => setNewAsset({...newAsset, salvageValue: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الإهلاك</label>
                <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.depreciationMethod} onChange={e => setNewAsset({...newAsset, depreciationMethod: e.target.value as DepreciationMethod})}>
                  <option value="straight_line">القسط الثابت (معظم الأصول)</option>
                  <option value="declining_balance">القسط المتناقص (أجهزة وسيارات)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4 pb-2 border-b">تفاصيل الشراء</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">حساب النقدية <span className="text-red-500">*</span></label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.cashAccount} onChange={e => setNewAsset({...newAsset, cashAccount: e.target.value})}>
                      <option value="">يرجى اختيار الحساب</option>
                      {accounts.filter(a => a.type === 'مدين' && a.isGroup === false).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">الضريبة 1</label>
                      <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.tax1Name} onChange={e => setNewAsset({...newAsset, tax1Name: e.target.value})}>
                        <option value="">من فضلك اختر</option>
                        <option value="ضريبة قيمة مضافة">ضريبة قيمة مضافة</option>
                        <option value="خصم منبع">خصم منبع</option>
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">القيمة</label>
                      <input type="number" min="0" className="w-full p-2 border rounded-lg" value={newAsset.tax1Amount || ''} onChange={e => setNewAsset({...newAsset, tax1Amount: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">الضريبة 2</label>
                      <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.tax2Name} onChange={e => setNewAsset({...newAsset, tax2Name: e.target.value})}>
                        <option value="">من فضلك اختر</option>
                        <option value="ضريبة قيمة مضافة">ضريبة قيمة مضافة</option>
                        <option value="خصم منبع">خصم منبع</option>
                      </select>
                    </div>
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">القيمة</label>
                      <input type="number" min="0" className="w-full p-2 border rounded-lg" value={newAsset.tax2Amount || ''} onChange={e => setNewAsset({...newAsset, tax2Amount: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-6 pb-2 border-b">إهلاك الأصل</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">حساب مجمع الإهلاك</label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.accumulatedDepreciationAccount} onChange={e => setNewAsset({...newAsset, accumulatedDepreciationAccount: e.target.value})}>
                      <option value="">يرجى اختيار الحساب</option>
                      {accounts.filter(a => a.type === 'دائن' && a.isGroup === false).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">حساب مصروف الإهلاك (قائمة الدخل)</label>
                    <select className="w-full p-2 border rounded-lg bg-gray-50" value={newAsset.depreciationExpenseAccount} onChange={e => setNewAsset({...newAsset, depreciationExpenseAccount: e.target.value})}>
                      <option value="">يرجى اختيار الحساب</option>
                      {accounts.filter(a => a.type === 'مدين' && a.isGroup === false && a.code.startsWith('5')).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea className="w-full p-2 border rounded-lg" rows={2} value={newAsset.notes} onChange={e => setNewAsset({...newAsset, notes: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">إلغاء</button>
              <button onClick={handleAddAsset} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md">حفظ الأصل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedAssets;
