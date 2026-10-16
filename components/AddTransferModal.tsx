
import React, { useState } from 'react';
import type { TreasuryAccountType, TreasuryTransfer } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddTransferModalProps {
    onClose: () => void;
    onSave: (transfer: Omit<TreasuryTransfer, 'id'>) => void;
    branches?: { id: string; name: string }[];
    currentBranchId?: string;
}

const AddTransferModal: React.FC<AddTransferModalProps> = ({
    onClose,
    onSave,
    branches = [
        { id: 'main', name: 'جراند ميديا' },
        { id: 'branch_1792042133332', name: 'برو باك' }
    ],
    currentBranchId = 'main'
}) => {
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isIntercompany, setIsIntercompany] = useState(false);

    // Branches state
    const [fromBranchId, setFromBranchId] = useState<string>(currentBranchId);
    const otherBranch = branches.find(b => b.id !== currentBranchId) || branches[0];
    const [toBranchId, setToBranchId] = useState<string>(otherBranch?.id || 'main');

    const [fromAccount, setFromAccount] = useState<TreasuryAccountType>('فودافون كاش');
    const [toAccount, setToAccount] = useState<TreasuryAccountType>('الخزينة الرئيسية');
    const [amount, setAmount] = useState(0);
    const [fee, setFee] = useState(0);
    const [notes, setNotes] = useState('');

    // Alert State
    const [alertMessage, setAlertMessage] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const showAlert = (msg: string) => {
        setAlertMessage(msg);
        setIsAlertOpen(true);
    };

    const fromBranchName = branches.find(b => b.id === fromBranchId)?.name || (fromBranchId === 'main' ? 'جراند ميديا' : 'برو باك');
    const toBranchName = branches.find(b => b.id === toBranchId)?.name || (toBranchId === 'main' ? 'جراند ميديا' : 'برو باك');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            showAlert('الرجاء إدخال مبلغ صحيح أكبر من صفر.');
            return;
        }

        if (isIntercompany) {
            if (fromBranchId === toBranchId) {
                showAlert('في التحويل بين الكيانات، يجب اختيار فرعين مختلفين.');
                return;
            }
        } else {
            if (fromAccount === toAccount) {
                showAlert('لا يمكن التحويل لنفس الحساب.');
                return;
            }
        }

        onSave({
            date,
            fromAccount,
            toAccount,
            amount,
            fee,
            notes: notes.trim(),
            status: 'active',
            isIntercompany,
            fromBranchId: isIntercompany ? fromBranchId : currentBranchId,
            fromBranchName: isIntercompany ? fromBranchName : undefined,
            toBranchId: isIntercompany ? toBranchId : currentBranchId,
            toBranchName: isIntercompany ? toBranchName : undefined
        });
        onClose();
    };

    const accountOptions: TreasuryAccountType[] = ['الخزينة الرئيسية', 'انستاباى', 'فودافون كاش', 'بنك فيصل', 'البنك الاهلى'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>💸 تحويل مالي بين الحسابات</span>
                        </h2>
                        <p className="text-xs text-blue-100 mt-0.5">
                            {isIntercompany ? 'تحويل بيني بين الشركات والكيانات الشقيقة' : 'تحويل داخلي بين خزن وبنوك نفس المنشأة'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white hover:text-red-200 text-3xl font-light leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Transfer Mode Selector Tabs */}
                    <div className="flex rounded-lg bg-gray-100 p-1 border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setIsIntercompany(false)}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                !isIntercompany ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            🔄 تحويل محلي (نفس الكيان)
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsIntercompany(true)}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                                isIntercompany ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <span>🏢 تحويل بين الكيانات الشقيقة</span>
                            <span className="bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">جديد</span>
                        </button>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">تاريخ التحويل</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    {/* Intercompany Branch Selection (If active) */}
                    {isIntercompany && (
                        <div className="grid grid-cols-2 gap-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <div>
                                <label className="block text-xs font-bold text-amber-900 mb-1">الكيان المحول منه (المصدر)</label>
                                <select
                                    value={fromBranchId}
                                    onChange={e => setFromBranchId(e.target.value)}
                                    className="w-full p-2 text-sm border border-amber-300 bg-white rounded-md font-semibold text-gray-800"
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-amber-900 mb-1">الكيان المحول إليه (الوجهة)</label>
                                <select
                                    value={toBranchId}
                                    onChange={e => setToBranchId(e.target.value)}
                                    className="w-full p-2 text-sm border border-amber-300 bg-white rounded-md font-semibold text-gray-800"
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Accounts Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isIntercompany ? `من حساب (${fromBranchName})` : 'من حساب / خزينة'}
                            </label>
                            <select
                                value={fromAccount}
                                onChange={e => setFromAccount(e.target.value as TreasuryAccountType)}
                                className="w-full p-2.5 border border-blue-200 bg-blue-50 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-blue-500"
                            >
                                {accountOptions.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isIntercompany ? `إلى حساب (${toBranchName})` : 'إلى حساب / خزينة'}
                            </label>
                            <select
                                value={toAccount}
                                onChange={e => setToAccount(e.target.value as TreasuryAccountType)}
                                className="w-full p-2.5 border border-green-200 bg-green-50 rounded-lg font-medium text-gray-800 focus:ring-2 focus:ring-green-500"
                            >
                                {accountOptions.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Amount & Fee */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">المبلغ المحول (ج.م) *</label>
                            <input
                                type="number"
                                value={amount === 0 ? '' : amount}
                                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-bold text-gray-900"
                                placeholder="0.00"
                                min="0"
                                step="any"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-orange-700 mb-1">عمولة السحب / التحويل</label>
                            <input
                                type="number"
                                value={fee === 0 ? '' : fee}
                                onChange={e => setFee(parseFloat(e.target.value) || 0)}
                                className="w-full p-2.5 border border-orange-300 bg-orange-50 rounded-lg text-orange-900 font-semibold"
                                placeholder="0.00"
                                min="0"
                                step="any"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البيان / ملاحظات</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder={isIntercompany ? `مثال: تحويل سيولة من محفظة ${fromBranchName} لسداد التزامات ${toBranchName}` : 'مثال: سحب رصيد فودافون كاش للخزينة'}
                        ></textarea>
                    </div>

                    {/* Accounting Preview Card (For Intercompany) */}
                    {isIntercompany && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="text-blue-600 font-black">⚖️</span>
                                <span>الأثر المحاسبي التلقائي للتحويل:</span>
                            </div>
                            <div className="text-slate-600 leading-relaxed pr-2">
                                🔹 <strong>{fromBranchName}:</strong> خصم من <strong>{fromAccount}</strong> ⬅️ مدين حساب <strong>جاري شركة {toBranchName}</strong>.
                            </div>
                            <div className="text-slate-600 leading-relaxed pr-2">
                                🔹 <strong>{toBranchName}:</strong> إضافة إلى <strong>{toAccount}</strong> ⬅️ دائن حساب <strong>جاري شركة {fromBranchName}</strong>.
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-5 rounded-lg transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-7 rounded-lg shadow-md transition-colors"
                        >
                            تأكيد التحويل
                        </button>
                    </div>
                </form>
            </div>

            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={alertMessage}
            />
        </div>
    );
};

export default AddTransferModal;
