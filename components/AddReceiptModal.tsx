
import React, { useState, useEffect } from 'react';
import type { Customer, CustomerPayment, TreasuryAccountType, Expense } from '../types.ts';
import AlertModal from './AlertModal.tsx';
import apiService from '../services/api.ts';

interface AddReceiptModalProps {
    onClose: () => void;
    onSave: (receipt: Omit<CustomerPayment, 'id'> & { id?: string }) => void;
    customers: Customer[];
    receiptToEdit?: CustomerPayment | null;
    existingReceipts: CustomerPayment[];
    onAddExpense?: (expense: Expense) => void;
    branches?: { id: string; name: string }[];
    currentBranchId?: string;
    accountOptions?: TreasuryAccountType[];
}

const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
    onClose,
    onSave,
    customers,
    receiptToEdit,
    existingReceipts,
    onAddExpense,
    branches = [
        { id: 'main', name: 'جراند ميديا' },
        { id: 'branch_1792042133332', name: 'برو باك' }
    ],
    currentBranchId = 'main',
    accountOptions: propAccountOptions
}) => {
    const isEditing = !!receiptToEdit;

    // Inter-company state
    const [isIntercompany, setIsIntercompany] = useState(receiptToEdit?.isIntercompany || false);
    const otherBranch = branches.find(b => b.id !== currentBranchId) || branches[0];
    const [targetBranchId, setTargetBranchId] = useState<string>(receiptToEdit?.targetBranchId || otherBranch?.id || 'main');
    const [remoteCustomers, setRemoteCustomers] = useState<Customer[]>([]);
    const [isLoadingRemoteCustomers, setIsLoadingRemoteCustomers] = useState(false);

    const activeCustomers = (isIntercompany && targetBranchId !== currentBranchId)
        ? remoteCustomers
        : customers;

    const [customerId, setCustomerId] = useState<string>(receiptToEdit?.customerId || customers[0]?.id || '');
    const [date, setDate] = useState<string>(receiptToEdit?.date || new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number>(receiptToEdit?.amount || 0);
    const [transactionFee, setTransactionFee] = useState<number>(receiptToEdit?.fee || 0);
    const [notes, setNotes] = useState<string>(receiptToEdit?.notes || '');
    const [treasuryAccount, setTreasuryAccount] = useState<TreasuryAccountType>(receiptToEdit?.treasuryAccount || 'الخزينة الرئيسية');

    // Auto Expense State
    const [isExpense, setIsExpense] = useState(receiptToEdit?.isExpense || false);
    const [expenseCategory, setExpenseCategory] = useState(receiptToEdit?.expenseCategory || 'مصروف شحن');

    // Alert State
    const [alertMessage, setAlertMessage] = useState('');
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const currentBranchName = branches.find(b => b.id === currentBranchId)?.name || (currentBranchId === 'main' ? 'جراند ميديا' : 'برو باك');
    const targetBranchName = branches.find(b => b.id === targetBranchId)?.name || (targetBranchId === 'main' ? 'جراند ميديا' : 'برو باك');

    // Fetch remote customers when targetBranchId changes
    useEffect(() => {
        if (isIntercompany && targetBranchId !== currentBranchId) {
            setIsLoadingRemoteCustomers(true);
            apiService.request(`/api/customers?branch=${encodeURIComponent(targetBranchId)}`)
                .then((data: any) => {
                    if (Array.isArray(data)) {
                        setRemoteCustomers(data);
                        if (data.length > 0 && !data.some(c => c.id === customerId)) {
                            setCustomerId(data[0].id);
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to load remote customers:', err);
                })
                .finally(() => setIsLoadingRemoteCustomers(false));
        } else if (!isIntercompany) {
            if (customers.length > 0 && !customers.some(c => c.id === customerId)) {
                setCustomerId(customers[0].id);
            }
        }
    }, [isIntercompany, targetBranchId, currentBranchId, customers]);

    useEffect(() => {
        if (isEditing && receiptToEdit) {
            setCustomerId(receiptToEdit.customerId);
            setDate(receiptToEdit.date);
            setAmount(receiptToEdit.amount);
            setTransactionFee(receiptToEdit.fee || 0);
            setNotes(receiptToEdit.notes || '');
            setTreasuryAccount(receiptToEdit.treasuryAccount || 'الخزينة الرئيسية');
            setIsExpense(receiptToEdit.isExpense || false);
            setExpenseCategory(receiptToEdit.expenseCategory || 'مصروف شحن');
            setIsIntercompany(receiptToEdit.isIntercompany || false);
            if (receiptToEdit.targetBranchId) setTargetBranchId(receiptToEdit.targetBranchId);
        }
    }, [isEditing, receiptToEdit]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isAlertOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isAlertOpen]);

    const showAlert = (msg: string) => {
        setAlertMessage(msg);
        setIsAlertOpen(true);
    };

    const handleAutoExpense = (paymentId: string) => {
        if (isExpense && onAddExpense && !isEditing) {
            const expense: Expense = {
                id: `EXP-AUTO-${Date.now()}`,
                voucherNumber: paymentId,
                date: date,
                category: expenseCategory,
                description: `قيد آلي من سند قبض رقم ${paymentId} - ${notes}`,
                amount: amount,
            };
            onAddExpense(expense);
        }
    };

    const handleSubmit = () => {
        const customer = activeCustomers.find(c => c.id === customerId);
        if (!customer) {
            showAlert('الرجاء اختيار عميل.');
            return;
        }
        if (amount <= 0) {
            showAlert('الرجاء إدخال مبلغ صحيح أكبر من صفر.');
            return;
        }

        // Duplicate Check (only local)
        if (!isIntercompany) {
            const isDuplicate = existingReceipts.some(receipt =>
                receipt.id !== receiptToEdit?.id &&
                receipt.customerId === customerId &&
                receipt.date === date &&
                Math.abs(receipt.amount - amount) < 0.01 &&
                receipt.treasuryAccount === treasuryAccount
            );

            if (isDuplicate) {
                showAlert('تنبيه: يوجد سند قبض مسجل بنفس البيانات (العميل، التاريخ، المبلغ). يرجى التحقق.');
                return;
            }
        }

        const newId = receiptToEdit?.id;
        const maxNum = existingReceipts.reduce((max, rec) => {
            if (rec.id.startsWith('CP') && !rec.id.startsWith('CP-IC-')) {
                const num = parseInt(rec.id.substring(2), 10);
                return isNaN(num) ? max : Math.max(max, num);
            }
            return max;
        }, 0);
        const paymentId = newId || `CP${(maxNum + 1).toString().padStart(3, '0')}`;

        onSave({
            id: newId,
            customerId,
            customerName: customer.name,
            date,
            amount,
            fee: transactionFee,
            notes: notes.trim(),
            treasuryAccount,
            isExpense,
            expenseCategory,
            isIntercompany,
            targetBranchId: isIntercompany ? targetBranchId : undefined,
            targetBranchName: isIntercompany ? targetBranchName : undefined,
            sourceBranchId: currentBranchId,
            sourceBranchName: currentBranchName,
            targetCustomerId: isIntercompany ? customer.id : undefined,
            targetCustomerName: isIntercompany ? customer.name : undefined
        });

        handleAutoExpense(paymentId);
    };

    const accountOptions: TreasuryAccountType[] = (propAccountOptions && propAccountOptions.length > 0)
        ? propAccountOptions
        : ['الخزينة الرئيسية', 'انستاباى', 'فودافون كاش', 'بنك فيصل', 'البنك الاهلى'];

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
            aria-modal="true" role="dialog" onClick={() => onClose()}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span>{isEditing ? 'تعديل سند قبض' : 'سند قبض جديد'}</span>
                        </h2>
                        <p className="text-xs text-green-100 mt-0.5">
                            الجهة المستلمة: <strong>{currentBranchName}</strong>
                        </p>
                    </div>
                    <button onClick={() => onClose()} className="text-white hover:text-green-200 text-3xl font-light leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    {/* Intercompany Toggle */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isIntercompany}
                                onChange={e => setIsIntercompany(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-amber-600 rounded"
                            />
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-amber-900">🏢 تحصيل لصالح كيان/فرع شقيق (Inter-company)</span>
                                <span className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold">بيني</span>
                            </div>
                        </label>

                        {isIntercompany && (
                            <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                                <label className="block text-xs font-bold text-amber-900">اختر الكيان التابع له العميل:</label>
                                <select
                                    value={targetBranchId}
                                    onChange={e => setTargetBranchId(e.target.value)}
                                    className="w-full p-2 border border-amber-300 rounded-md bg-white text-sm font-semibold text-gray-800"
                                >
                                    {branches.filter(b => b.id !== currentBranchId).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-amber-700">
                                    * سيتم استلام النقدية في خزينة <strong>({currentBranchName})</strong> وتخفيض مديونية العميل في دفاتر <strong>({targetBranchName})</strong> تلقائياً.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Customer Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="customer" className="block text-sm font-semibold text-gray-700">
                                العميل <span className="text-red-500">*</span>
                                {isIntercompany && <span className="text-xs text-amber-700 font-normal mr-1">(عملاء {targetBranchName})</span>}
                            </label>
                            {isLoadingRemoteCustomers && <span className="text-xs text-blue-600">جارِ تحميل العملاء...</span>}
                        </div>
                        <select
                            id="customer"
                            value={customerId}
                            onChange={e => setCustomerId(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 font-medium"
                            disabled={isLoadingRemoteCustomers}
                        >
                            {activeCustomers.length === 0 ? (
                                <option value="">لا يوجد عملاء مسجلين لهذا الكيان</option>
                            ) : (
                                activeCustomers.map(c => <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>)
                            )}
                        </select>
                    </div>

                    {/* Treasury Account */}
                    <div>
                        <label htmlFor="account" className="block text-sm font-semibold text-gray-700 mb-1">
                            الحساب / الخزنة المستلم فيها ({currentBranchName}) <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="account"
                            value={treasuryAccount}
                            onChange={e => setTreasuryAccount(e.target.value as TreasuryAccountType)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 font-medium bg-green-50/40"
                        >
                            {accountOptions.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-1">التاريخ <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            id="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    {/* Amount & Fee */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-1">المبلغ المحصل (ج.م) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                id="amount"
                                value={amount === 0 ? '' : amount}
                                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 text-lg font-bold"
                            />
                        </div>
                        <div>
                            <label htmlFor="transactionFee" className="block text-sm font-medium text-orange-700 mb-1">عمولة المعاملة (إن وجدت)</label>
                            <input
                                type="number"
                                id="transactionFee"
                                value={transactionFee === 0 ? '' : transactionFee}
                                onChange={e => setTransactionFee(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="any"
                                placeholder="0.00"
                                className="w-full p-2.5 border border-orange-300 bg-orange-50 rounded-lg shadow-sm font-semibold"
                            />
                        </div>
                    </div>

                    {/* Auto Expense Section */}
                    {!isIntercompany && (
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                            <label className="flex items-center space-x-2 space-x-reverse cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={isExpense}
                                    onChange={e => setIsExpense(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-orange-600 rounded"
                                />
                                <span className="font-bold text-sm text-gray-800">هل هذا البند مصروف؟</span>
                            </label>

                            {isExpense && (
                                <div className="mt-2 animate-fadeIn">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">نوع المصروف</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={e => setExpenseCategory(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="مصاريف شحن">مصاريف شحن</option>
                                        <option value="مصاريف نقل">مصاريف نقل</option>
                                        <option value="مصاريف إدارية">مصاريف إدارية</option>
                                        <option value="مصاريف أخرى">مصاريف أخرى</option>
                                    </select>
                                    <p className="text-xs text-orange-600 mt-1">* سيتم إنشاء قيد مصروف تلقائي لهذا المبلغ.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">ملاحظات / البيان</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            placeholder={isIntercompany ? `تحصيل في ${treasuryAccount} لصالح ${targetBranchName}` : 'اكتب أي تفاصيل إضافية هنا...'}
                            className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 text-sm"
                        />
                    </div>

                    {/* Accounting Preview Card */}
                    {isIntercompany && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="text-green-600 font-black">⚖️</span>
                                <span>الأثر المحاسبي التلقائي في الدفاتر:</span>
                            </div>
                            <div className="text-slate-600 leading-relaxed pr-2">
                                🔹 <strong>{currentBranchName}:</strong> إيداع في <strong>{treasuryAccount}</strong> ⬅️ دائن حساب <strong>جاري شركة {targetBranchName}</strong>.
                            </div>
                            <div className="text-slate-600 leading-relaxed pr-2">
                                🔹 <strong>{targetBranchName}:</strong> تخفيض مديونية العميل <strong>({activeCustomers.find(c => c.id === customerId)?.name || 'العميل'})</strong> ⬅️ مدين حساب <strong>جاري شركة {currentBranchName}</strong>.
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-xl">
                    <button
                        onClick={() => onClose()}
                        className="bg-white text-gray-700 font-bold py-2.5 px-5 rounded-lg border hover:bg-gray-100 transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-colors"
                    >
                        {isEditing ? 'حفظ التعديلات' : (isIntercompany ? 'تأكيد التحصيل البيني' : 'حفظ السند')}
                    </button>
                </div>
            </div>
            <AlertModal
                isOpen={isAlertOpen}
                onClose={() => setIsAlertOpen(false)}
                message={alertMessage}
            />
        </div>
    );
};

export default AddReceiptModal;
