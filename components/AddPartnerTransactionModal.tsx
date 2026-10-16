
import React, { useState, useEffect } from 'react';
import type { Partner, PartnerTransaction } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddPartnerTransactionModalProps {
  onClose: () => void;
  onSave: (transaction: Omit<PartnerTransaction, 'id' | 'partnerName'> & { id?: string }) => void;
  partners: Partner[];
  type: 'إيداع' | 'سحب';
  transactionToEdit?: PartnerTransaction | null;
  existingTransactions: PartnerTransaction[];
}

const AddPartnerTransactionModal: React.FC<AddPartnerTransactionModalProps> = ({ onClose, onSave, partners, type, transactionToEdit, existingTransactions }) => {
  const [partnerId, setPartnerId] = useState<string>(partners[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!transactionToEdit;

  useEffect(() => {
    if (isEditing && transactionToEdit) {
        setPartnerId(transactionToEdit.partnerId);
        setDate(transactionToEdit.date);
        setAmount(transactionToEdit.amount);
        setDescription(transactionToEdit.description);
    }
  }, [isEditing, transactionToEdit]);

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

  const handleSubmit = () => {
    if (!partnerId) {
        showAlert('الرجاء اختيار شريك.');
        return;
    }
    if (amount <= 0) {
      showAlert('الرجاء إدخال مبلغ صحيح.');
      return;
    }
    if (!description.trim()) {
        showAlert('الرجاء إدخال وصف للحركة.');
        return;
    }

    // Duplicate Check
    const isDuplicate = existingTransactions.some(t => 
        t.id !== transactionToEdit?.id &&
        t.partnerId === partnerId &&
        t.date === date &&
        Math.abs(t.amount - amount) < 0.01 &&
        t.type === type
    );

    if (isDuplicate) {
        showAlert('تنبيه: توجد حركة مسجلة مسبقاً بنفس البيانات. يرجى التحقق.');
        return;
    }

    onSave({ 
        id: transactionToEdit?.id,
        partnerId, 
        date, 
        amount, 
        description, 
        type 
    });
  };
  
  const isDeposit = type === 'إيداع';

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
        aria-modal="true" role="dialog" onClick={onClose}
    >
        <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
        >
            <div className={`flex justify-between items-center p-4 border-b ${isDeposit ? 'bg-green-50' : 'bg-red-50'}`}>
                <h2 className="text-xl font-bold text-gray-800">
                    {isEditing ? 'تعديل حركة' : `حركة ${type} جديدة`}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="partner" className="block text-sm font-medium text-gray-700 mb-1">الشريك <span className="text-red-500">*</span></label>
                    <select id="partner" value={partnerId} onChange={e => setPartnerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">التاريخ <span className="text-red-500">*</span></label>
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ <span className="text-red-500">*</span></label>
                    <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} min="0" className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">الوصف <span className="text-red-500">*</span></label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className={`${isDeposit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-bold py-2 px-4 rounded-lg`}>
                    {isEditing ? 'حفظ التعديلات' : 'حفظ الحركة'}
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

export default AddPartnerTransactionModal;
