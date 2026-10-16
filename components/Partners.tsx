
import React, { useState, useMemo } from 'react';
import type { Partner, PartnerTransaction } from '../types.ts';
import AddPartnerModal from './AddPartnerModal.tsx';
import AddPartnerTransactionModal from './AddPartnerTransactionModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import PartnerStatementModal from './PartnerStatementModal.tsx';

import { JournalEntry } from '../types';

interface PartnersProps {
    partners: Partner[];
    setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
    transactions: PartnerTransaction[];
    setTransactions: React.Dispatch<React.SetStateAction<PartnerTransaction[]>>;
    createJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
    logAction: (action: string) => void;
}

const Partners: React.FC<PartnersProps> = ({ partners, setPartners, transactions, setTransactions, createJournalEntry, logAction }) => {
    const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
    const [transactionModalType, setTransactionModalType] = useState<'إيداع' | 'سحب' | null>(null);

    // Editing State for Partner Data
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

    // Editing State for Transactions
    const [editingTransaction, setEditingTransaction] = useState<PartnerTransaction | null>(null);

    // Voiding/Deleting State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionTarget, setActionTarget] = useState<{ type: 'partner' | 'transaction', id: string, action: 'delete' | 'void' } | null>(null);

    // Statement Modal State
    const [viewingStatementPartnerId, setViewingStatementPartnerId] = useState<string | null>(null);

    const partnerBalances = useMemo(() => {
        const balances = new Map<string, number>();
        partners.forEach(p => {
            const partnerTransactions = transactions.filter(t => t.partnerId === p.id && (t.status || 'active') === 'active');
            const transactionTotal = partnerTransactions.reduce((acc, t) => acc + (t.type === 'إيداع' ? t.amount : -t.amount), 0);
            balances.set(p.id, p.openingBalance + transactionTotal);
        });
        return balances;
    }, [partners, transactions]);

    const totalPartnersBalance = useMemo(() => {
        let total = 0;
        partnerBalances.forEach((value) => {
            total += value;
        });
        return total;
    }, [partnerBalances]);

    // Partner Management Handlers (UNCHANGED logic mostly, but added logAction)
    const handleOpenPartnerModal = (partner: Partner | null = null) => {
        setEditingPartner(partner);
        setIsPartnerModalOpen(true);
    };

    const handleSavePartner = (partnerData: Omit<Partner, 'id'> & { id?: string }) => {
        if (partnerData.id) {
            setPartners(prev => prev.map(p => p.id === partnerData.id ? { ...p, ...partnerData } as Partner : p));
            setTransactions(prev => prev.map(t => t.partnerId === partnerData.id ? { ...t, partnerName: partnerData.name } : t));
            logAction(`تعديل بيانات شريك: ${partnerData.name}`);
        } else {
            const lastIdNumber = partners
                .map(p => parseInt(p.id.replace('P', ''), 10))
                .reduce((max, current) => (current > max ? current : max), 0);
            const newId = `P${(lastIdNumber + 1).toString().padStart(3, '0')}`;
            const newPartner: Partner = { ...partnerData, id: newId } as Partner;
            setPartners(prev => [...prev, newPartner]);
            logAction(`إضافة شريك جديد: ${newPartner.name}`);
        }
        setIsPartnerModalOpen(false);
        setEditingPartner(null);
    };

    // Transaction Management Handlers
    const handleSaveTransaction = (transactionData: Omit<PartnerTransaction, 'id' | 'partnerName'> & { id?: string }) => {
        const partner = partners.find(p => p.id === transactionData.partnerId);
        if (!partner) return;

        if (transactionData.id) {
            // Block editing if used strictly, but for now we update if active
            setTransactions(prev => prev.map(t => t.id === transactionData.id ? { ...t, ...transactionData, partnerName: partner.name } as PartnerTransaction : t));
            logAction(`تعديل حركة شريك: ${transactionData.description}`);
        } else {
            // Add new
            const maxNum = transactions.reduce((max, t) => {
                if (t.id.startsWith('PT')) {
                    const num = parseInt(t.id.substring(2), 10);
                    return isNaN(num) ? max : Math.max(max, num);
                }
                return max;
            }, 0);
            const newId = `PT${(maxNum + 1).toString().padStart(3, '0')}`;
            const newTransaction: PartnerTransaction = {
                ...transactionData,
                id: newId,
                partnerName: partner.name,
                status: 'active'
            } as PartnerTransaction;
            setTransactions(prev => [...prev, newTransaction]);

            // Journal Entry
            const isDeposit = newTransaction.type === 'إيداع';
            createJournalEntry({
                date: newTransaction.date,
                description: `${newTransaction.type} شريك: ${newTransaction.partnerName} - ${newTransaction.description}`,
                referenceType: 'Manual',
                referenceId: newTransaction.id,
                lines: [
                    // Deposit: Debit Treasury, Credit Partner
                    // Withdrawal: Debit Partner, Credit Treasury
                    {
                        accountId: isDeposit ? '1101' : '3102',
                        accountName: isDeposit ? 'الخزينة الرئيسية' : `رأس مال شريك - ${newTransaction.partnerName}`,
                        debit: isDeposit ? newTransaction.amount : 0,
                        credit: isDeposit ? 0 : newTransaction.amount
                    },
                    {
                        accountId: isDeposit ? '3102' : '1101',
                        accountName: isDeposit ? `رأس مال شريك - ${newTransaction.partnerName}` : 'الخزينة الرئيسية',
                        debit: isDeposit ? 0 : newTransaction.amount,
                        credit: isDeposit ? newTransaction.amount : 0
                    }
                ]
            });
            logAction(`حركة شريك جديدة: ${newTransaction.type} (${newTransaction.amount}) - ${newTransaction.partnerName}`);
        }

        setTransactionModalType(null);
        setEditingTransaction(null);
    };

    const handleEditTransaction = (transaction: PartnerTransaction) => {
        if (transaction.status === 'voided') return;
        setEditingTransaction(transaction);
        setTransactionModalType(transaction.type);
    };

    // Delete/Void Handlers
    const handleActionRequest = (id: string, type: 'partner' | 'transaction', action: 'delete' | 'void') => {
        setActionTarget({ type, id, action });
        setIsConfirmModalOpen(true);
    };

    const confirmAction = () => {
        if (actionTarget) {
            if (actionTarget.type === 'transaction') {
                // VOID LOGIC
                const tx = transactions.find(t => t.id === actionTarget.id);
                if (tx) {
                    setTransactions(prev => prev.map(t => t.id === actionTarget.id ? { ...t, status: 'voided' } : t));

                    // Reverse Journal
                    const isDeposit = tx.type === 'إيداع';
                    createJournalEntry({
                        date: new Date().toISOString().split('T')[0],
                        description: `إلغاء حركة شريك رقم ${tx.id}`,
                        referenceType: 'Manual',
                        referenceId: tx.id,
                        lines: [
                            // Reverse of original
                            {
                                accountId: isDeposit ? '3102' : '1101',
                                accountName: isDeposit ? `رأس مال شريك - ${tx.partnerName}` : 'الخزينة الرئيسية',
                                debit: isDeposit ? tx.amount : 0,
                                credit: isDeposit ? 0 : tx.amount
                            },
                            {
                                accountId: isDeposit ? '1101' : '3102',
                                accountName: isDeposit ? 'الخزينة الرئيسية' : `رأس مال شريك - ${tx.partnerName}`,
                                debit: isDeposit ? 0 : tx.amount,
                                credit: isDeposit ? tx.amount : 0
                            }
                        ]
                    });
                    logAction(`إلغاء حركة شريك: ${tx.id}`);
                }
            } else if (actionTarget.type === 'partner') {
                // DELETE PARTNER LOGIC (Only if no transactions)
                const hasTransactions = transactions.some(t => t.partnerId === actionTarget.id && t.status !== 'voided');
                if (hasTransactions) {
                    alert('لا يمكن حذف الشريك لوجود حركات مالية مسجلة باسمه. قم بإلغاء الحركات أولاً.');
                } else {
                    setPartners(prev => prev.filter(p => p.id !== actionTarget.id));
                    logAction(`حذف شريك: ${actionTarget.id}`);
                }
            }
        }
        setIsConfirmModalOpen(false);
        setActionTarget(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">حسابات الشركاء</h1>
                <div className="flex space-x-2 space-x-reverse">
                    <button onClick={() => handleOpenPartnerModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">إضافة شريك</button>
                    <button onClick={() => { setEditingTransaction(null); setTransactionModalType('إيداع'); }} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">إيداع</button>
                    <button onClick={() => { setEditingTransaction(null); setTransactionModalType('سحب'); }} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">سحب</button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="mb-8">
                <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                        <h3 className="text-xl font-bold text-indigo-800">إجمالي أرصدة الشركاء</h3>
                        <p className="text-sm text-indigo-600 mt-1">مجموع رؤوس الأموال والحسابات الجارية لجميع الشركاء</p>
                    </div>
                    <div className="text-3xl font-bold text-indigo-700">
                        {totalPartnersBalance.toLocaleString('en-US')} ج.م
                    </div>
                </div>
            </div>

            <h2 className="text-2xl font-semibold text-gray-700 mb-4">أرصدة الشركاء التفصيلية</h2>
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">كود الشريك</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم الشريك</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الرصيد الافتتاحي</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الرصيد الحالي</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {partners.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm text-gray-700 font-mono">{p.id}</td>
                                <td className="p-3 text-sm text-gray-700 font-bold">{p.name}</td>
                                <td className="p-3 text-sm text-gray-500">{p.openingBalance.toLocaleString('en-US')} ج.م</td>
                                <td className={`p-3 text-sm font-bold ${(partnerBalances.get(p.id) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(partnerBalances.get(p.id) || 0).toLocaleString('en-US')} ج.م
                                </td>
                                <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse">
                                    <button onClick={() => handleOpenPartnerModal(p)} className="text-blue-500 hover:text-blue-700 transition-colors" title="تعديل">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    </button>
                                    <button onClick={() => setViewingStatementPartnerId(p.id)} className="text-purple-500 hover:text-purple-700 transition-colors" title="كشف الحساب">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                    </button>
                                    <button onClick={() => handleActionRequest(p.id, 'partner', 'delete')} className="text-red-500 hover:text-red-700 transition-colors" title="حذف">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                            <td colSpan={3} className="p-3 text-sm font-bold text-gray-800 text-left pl-10">الإجمالي العام:</td>
                            <td className="p-3 text-sm font-bold text-indigo-700">
                                {totalPartnersBalance.toLocaleString('en-US')} ج.م
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <h2 className="text-2xl font-semibold text-gray-700 mb-4">سجل الحركات (إيداع / سحب)</h2>
            <div className="bg-white p-6 rounded-xl shadow-md">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الشريك</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">نوع الحركة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الوصف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map(t => {
                            const isVoided = t.status === 'voided';
                            return (
                                <tr key={t.id} className={`hover:bg-gray-50 ${isVoided ? 'bg-red-50' : ''}`}>
                                    <td className={`p-3 text-sm text-gray-700 ${isVoided ? 'line-through text-gray-400' : ''}`} style={{ direction: 'ltr', textAlign: 'right' }}>{t.date}</td>
                                    <td className="p-3 text-sm text-gray-700">{t.partnerName}</td>
                                    <td className="p-3 text-sm">
                                        <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg bg-opacity-50 ${isVoided ? 'text-gray-500 bg-gray-200' :
                                            t.type === 'إيداع' ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'
                                            }`}>
                                            {t.type} {isVoided && '(ملغي)'}
                                        </span>
                                    </td>
                                    <td className={`p-3 text-sm font-bold ${isVoided ? 'line-through text-red-300' : 'text-gray-700'}`}>{t.amount.toLocaleString('en-US')} ج.م</td>
                                    <td className={`p-3 text-sm text-gray-500 ${isVoided ? 'line-through' : ''}`}>{t.description}</td>
                                    <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse">
                                        {!isVoided ? (
                                            <button onClick={() => handleActionRequest(t.id, 'transaction', 'void')} className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1" title="إلغاء">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                                <span className="text-xs font-bold">إلغاء</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-red-500 font-bold">ملغي</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-gray-500">لا توجد حركات مسجلة حتى الآن</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {isPartnerModalOpen && (
                <AddPartnerModal
                    onClose={() => { setIsPartnerModalOpen(false); setEditingPartner(null); }}
                    onSave={handleSavePartner}
                    existingPartners={partners}
                    partnerToEdit={editingPartner}
                />
            )}
            {transactionModalType && (
                <AddPartnerTransactionModal
                    onClose={() => { setTransactionModalType(null); setEditingTransaction(null); }}
                    onSave={handleSaveTransaction}
                    partners={partners}
                    type={transactionModalType}
                    transactionToEdit={editingTransaction}
                    existingTransactions={transactions}
                />
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmAction}
                title={actionTarget?.action === 'delete' ? "تأكيد الحذف" : "تأكيد الإلغاء"}
                message={actionTarget?.action === 'delete'
                    ? "هل أنت متأكد من رغبتك في حذف هذا الشريك؟"
                    : "هل أنت متأكد من إلغاء هذه الحركة؟ سيتم عمل قيد عكسي."}
            />

            {viewingStatementPartnerId && (
                <PartnerStatementModal
                    onClose={() => setViewingStatementPartnerId(null)}
                    partners={partners.filter(p => p.id === viewingStatementPartnerId)}
                    transactions={transactions}
                />
            )}
        </div>
    );
};

export default Partners;

