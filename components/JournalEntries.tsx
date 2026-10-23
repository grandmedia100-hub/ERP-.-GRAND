import React, { useState, useMemo } from 'react';
import type { JournalEntry, Account } from '../types.ts';

interface JournalEntriesProps {
    journalEntries: JournalEntry[];
    setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
    accounts: Account[];
    createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string }) => void;
    logAction: (action: string) => void;
}

const JournalEntries: React.FC<JournalEntriesProps> = ({ journalEntries, setJournalEntries, accounts, createJournalEntry, logAction }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);

    // Manual entry state
    const [manualDesc, setManualDesc] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualLines, setManualLines] = useState([
        { accountId: '', accountName: '', debit: 0, credit: 0 },
        { accountId: '', accountName: '', debit: 0, credit: 0 },
    ]);

    const filteredEntries = useMemo(() => {
        if (!Array.isArray(journalEntries)) return [];
        return journalEntries
            .filter(je => {
                if (!je) return false;
                const desc = (je.description || '').toLowerCase();
                const ref = (je.referenceId || '').toLowerCase();
                const q = searchQuery.toLowerCase();
                const descMatch = !searchQuery || desc.includes(q) || ref.includes(q);
                const typeMatch = !filterType || je.referenceType === filterType;
                const startMatch = !dateStart || (je.date && je.date >= dateStart);
                const endMatch = !dateEnd || (je.date && je.date <= dateEnd);
                return descMatch && typeMatch && startMatch && endMatch;
            })
            .sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                if (dateB !== dateA) return dateB.localeCompare(dateA);
                const createdA = a.createdAt || '';
                const createdB = b.createdAt || '';
                if (createdB !== createdA) return createdB.localeCompare(createdA);
                return (b.id || '').localeCompare(a.id || '');
            });
    }, [journalEntries, searchQuery, filterType, dateStart, dateEnd]);

    const totalDebit = useMemo(() => filteredEntries.reduce((s, je) => s + (je.lines || []).reduce((ls, l) => ls + (Number(l.debit) || 0), 0), 0), [filteredEntries]);
    const totalCredit = useMemo(() => filteredEntries.reduce((s, je) => s + (je.lines || []).reduce((ls, l) => ls + (Number(l.credit) || 0), 0), 0), [filteredEntries]);

    const typeLabels: Record<string, { label: string; color: string }> = {
        SalesInvoice: { label: 'مبيعات', color: 'bg-blue-100 text-blue-700' },
        PurchaseInvoice: { label: 'مشتريات', color: 'bg-green-100 text-green-700' },
        Payment: { label: 'سداد', color: 'bg-yellow-100 text-yellow-700' },
        Manual: { label: 'يدوي', color: 'bg-purple-100 text-purple-700' },
    };

    // Manual entry helpers
    const addLine = () => setManualLines(prev => [...prev, { accountId: '', accountName: '', debit: 0, credit: 0 }]);
    const removeLine = (idx: number) => setManualLines(prev => prev.filter((_, i) => i !== idx));
    const updateLine = (idx: number, field: string, value: any) => {
        setManualLines(prev => {
            const updated = [...prev];
            if (field === 'accountId') {
                const acc = accounts.find(a => a.id === value);
                updated[idx] = { ...updated[idx], accountId: value, accountName: acc?.name || '' };
            } else {
                updated[idx] = { ...updated[idx], [field]: Number(value) };
            }
            return updated;
        });
    };

    const manualTotalDebit = manualLines.reduce((s, l) => s + l.debit, 0);
    const manualTotalCredit = manualLines.reduce((s, l) => s + l.credit, 0);
    const isBalanced = Math.abs(manualTotalDebit - manualTotalCredit) < 0.001;

    const handleSaveManual = () => {
        if (!manualDesc.trim()) { alert('يرجى إدخال وصف القيد'); return; }
        if (!isBalanced) { alert('القيد غير متوازن! مجموع المدين يجب أن يساوي مجموع الدائن'); return; }
        if (manualLines.some(l => !l.accountId)) { alert('يرجى اختيار حساب لكل سطر'); return; }
        if (manualTotalDebit === 0) { alert('يرجى إدخال مبالغ في القيد'); return; }

        createJournalEntry({ description: manualDesc, lines: manualLines, referenceType: 'Manual', date: manualDate });
        logAction(`إضافة قيد يدوي: ${manualDesc}`);
        setIsManualModalOpen(false);
        setManualDesc('');
        setManualDate(new Date().toISOString().split('T')[0]);
        setManualLines([
            { accountId: '', accountName: '', debit: 0, credit: 0 },
            { accountId: '', accountName: '', debit: 0, credit: 0 },
        ]);
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا القيد؟ لا يمكن التراجع عن هذا الإجراء.')) {
            setJournalEntries(prev => prev.filter(je => je.id !== id));
            logAction(`حذف قيد محاسبي: ${id}`);
        }
    };

    const handlePrint = () => {
        const printContent = `
        <html><head><title>سجل القيود المحاسبية</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
            h1 { color: #1e40af; } table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th { background: #1e40af; color: white; padding: 8px; }
            td { padding: 6px; border: 1px solid #ddd; }
            .sub-table { width: 100%; margin: 0; border: none; } .sub-table td { border: none; padding: 2px 6px; font-size: 10px; }
        </style></head><body>
        <h1>سجل القيود المحاسبية</h1>
        <p>الفترة: ${dateStart || 'البداية'} - ${dateEnd || 'الآن'} | عدد القيود: ${filteredEntries.length}</p>
        <table><thead><tr><th>رقم القيد</th><th>التاريخ</th><th>الوصف</th><th>المرجع</th><th>مدين</th><th>دائن</th></tr></thead><tbody>
        ${filteredEntries.map(je => {
            const d = (je.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
            const c = (je.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
            return `<tr>
                <td>${je.id || ''}</td><td>${je.date || ''}</td><td>${je.description || ''}</td>
                <td>${je.referenceId || '-'}</td>
                <td style="text-align:center">${d.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="text-align:center">${c.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>`;
        }).join('')}
        <tr style="font-weight:bold;background:#f3f4f6"><td colspan="4">الإجمالي</td><td>${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td><td>${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
        </tbody></table></body></html>`;
        const w = window.open('', '_blank');
        w?.document.write(printContent); w?.document.close(); w?.print();
    };

    const leafAccounts = useMemo(() => accounts.filter(a => !a.isGroup), [accounts]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-800">📒 القيود المحاسبية</h1>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-semibold flex items-center gap-2">
                        🖨️ طباعة
                    </button>
                    <button onClick={() => setIsManualModalOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold flex items-center gap-2">
                        ✏️ قيد يدوي
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border p-4 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">عدد القيود</div>
                    <div className="text-2xl font-bold text-gray-800">{filteredEntries.length}</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">إجمالي المدين</div>
                    <div className="text-lg font-bold text-blue-700">{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">إجمالي الدائن</div>
                    <div className="text-lg font-bold text-green-700">{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م</div>
                </div>
                <div className={`rounded-xl border p-4 text-center shadow-sm ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-xs text-gray-500 mb-1">حالة الميزان</div>
                    <div className={`text-sm font-bold ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-700' : 'text-red-600'}`}>
                        {Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ متوازن' : `❌ فرق: ${(totalDebit - totalCredit).toFixed(2)}`}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">بحث</label>
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="وصف أو رقم مرجعي..." className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">نوع القيد</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                            <option value="">-- الكل --</option>
                            <option value="SalesInvoice">مبيعات</option>
                            <option value="PurchaseInvoice">مشتريات</option>
                            <option value="Payment">سداد</option>
                            <option value="Manual">يدوي</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">من تاريخ</label>
                        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">إلى تاريخ</label>
                        <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    </div>
                </div>
                <div className="mt-3 flex justify-end">
                    <button onClick={() => { setSearchQuery(''); setFilterType(''); setDateStart(''); setDateEnd(''); }} className="text-sm text-gray-500 hover:text-gray-700 underline">إعادة تعيين</button>
                </div>
            </div>

            {/* Entries List */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="p-3 text-xs font-semibold">رقم القيد</th>
                                <th className="p-3 text-xs font-semibold">التاريخ</th>
                                <th className="p-3 text-xs font-semibold">الوصف</th>
                                <th className="p-3 text-xs font-semibold">النوع</th>
                                <th className="p-3 text-xs font-semibold text-center">مدين</th>
                                <th className="p-3 text-xs font-semibold text-center">دائن</th>
                                <th className="p-3 text-xs font-semibold text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map((je, i) => {
                                const jeTotalDebit = (je.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
                                const jeTotalCredit = (je.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
                                const isExpanded = expandedId === je.id;
                                const typeInfo = typeLabels[je.referenceType || 'Manual'] || { label: 'أخرى', color: 'bg-gray-100 text-gray-600' };
                                return (
                                    <React.Fragment key={je.id}>
                                        <tr className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100`} onClick={() => setExpandedId(isExpanded ? null : je.id)}>
                                            <td className="p-3 font-mono text-xs text-gray-500">{je.id}</td>
                                            <td className="p-3 text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{je.date}</td>
                                            <td className="p-3 text-gray-800 font-medium max-w-xs truncate" title={je.description}>{je.description}</td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                            </td>
                                            <td className="p-3 text-center font-semibold text-blue-700">{jeTotalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center font-semibold text-green-700">{jeTotalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setExpandedId(isExpanded ? null : je.id)} className="text-blue-500 hover:text-blue-700 text-xs font-medium ml-2">
                                                    {isExpanded ? '▲ إخفاء' : '▼ تفاصيل'}
                                                </button>
                                                {je.referenceType === 'Manual' && (
                                                    <button onClick={() => handleDeleteEntry(je.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">حذف</button>
                                                )}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-blue-50">
                                                <td colSpan={7} className="p-0">
                                                    <div className="p-4 border-t border-blue-100">
                                                        <table className="w-full text-xs text-right">
                                                            <thead>
                                                                <tr className="bg-blue-100 text-blue-800">
                                                                    <th className="p-2">#</th>
                                                                    <th className="p-2">الحساب</th>
                                                                    <th className="p-2 text-center">مدين</th>
                                                                    <th className="p-2 text-center">دائن</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {je.lines.map((line, li) => (
                                                                    <tr key={li} className={`${li % 2 === 0 ? 'bg-white' : 'bg-blue-50/50'}`}>
                                                                        <td className="p-2 text-gray-500">{li + 1}</td>
                                                                        <td className="p-2 font-medium text-gray-800">{line.accountName} <span className="text-gray-400 font-mono">({line.accountId})</span></td>
                                                                        <td className="p-2 text-center font-bold text-blue-700">{line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                                                                        <td className="p-2 text-center font-bold text-green-700">{line.credit > 0 ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="bg-blue-100 font-bold text-blue-800">
                                                                    <td className="p-2" colSpan={2}>الإجمالي</td>
                                                                    <td className="p-2 text-center">{jeTotalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                                    <td className="p-2 text-center">{jeTotalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                        {je.referenceId && (
                                                            <p className="text-xs text-gray-400 mt-2">
                                                                المرجع: {je.referenceId} {je.createdAt ? `| أُنشئ: ${new Date(je.createdAt).toLocaleString('ar-EG')}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filteredEntries.length === 0 && (
                                <tr><td colSpan={7} className="p-12 text-center text-gray-400">لا توجد قيود محاسبية مطابقة</td></tr>
                            )}
                        </tbody>
                        {filteredEntries.length > 0 && (
                            <tfoot>
                                <tr className="bg-gray-800 text-white font-bold">
                                    <td colSpan={4} className="p-3 text-sm">الإجمالي ({filteredEntries.length} قيد)</td>
                                    <td className="p-3 text-center text-blue-300">{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    <td className="p-3 text-center text-green-300">{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Manual Entry Modal */}
            {isManualModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-5 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">✏️ قيد يدوي جديد</h2>
                            <button onClick={() => setIsManualModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-600 mb-1">وصف القيد *</label>
                                    <input type="text" value={manualDesc} onChange={e => setManualDesc(e.target.value)} className="w-full p-2.5 border rounded-lg" placeholder="مثال: تسوية فروق جرد..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">التاريخ</label>
                                    <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="w-full p-2.5 border rounded-lg" />
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="p-2.5 text-xs">الحساب</th>
                                            <th className="p-2.5 text-xs text-center w-32">مدين</th>
                                            <th className="p-2.5 text-xs text-center w-32">دائن</th>
                                            <th className="p-2.5 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {manualLines.map((line, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="p-2">
                                                    <select value={line.accountId} onChange={e => updateLine(idx, 'accountId', e.target.value)} className="w-full p-1.5 border rounded text-sm">
                                                        <option value="">-- اختر الحساب --</option>
                                                        {leafAccounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" value={line.debit || ''} onChange={e => updateLine(idx, 'debit', e.target.value)} className="w-full p-1.5 border rounded text-center text-sm" placeholder="0" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="0" value={line.credit || ''} onChange={e => updateLine(idx, 'credit', e.target.value)} className="w-full p-1.5 border rounded text-center text-sm" placeholder="0" />
                                                </td>
                                                <td className="p-2 text-center">
                                                    {manualLines.length > 2 && (
                                                        <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className={`border-t font-bold text-sm ${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                                            <td className="p-2.5 text-gray-700">الإجمالي</td>
                                            <td className="p-2.5 text-center text-blue-700">{manualTotalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td className="p-2.5 text-center text-green-700">{manualTotalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={addLine} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1">+ إضافة سطر</button>
                                <span className={`text-sm font-semibold ${isBalanced ? 'text-green-600' : 'text-red-500'}`}>
                                    {isBalanced ? '✅ القيد متوازن' : `⚠️ فرق: ${(manualTotalDebit - manualTotalCredit).toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                        <div className="sticky bottom-0 bg-white p-5 border-t flex justify-end gap-3">
                            <button onClick={() => setIsManualModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">إلغاء</button>
                            <button onClick={handleSaveManual} disabled={!isBalanced} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                                حفظ القيد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntries;
