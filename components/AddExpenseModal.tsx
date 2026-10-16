
import React, { useState, useEffect, useMemo } from 'react';
import type { Expense } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddExpenseModalProps {
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'voucherNumber'> & { id?: string }) => void;
  expenseToEdit: Expense | null;
  existingExpenses: Expense[];
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ onClose, onSave, expenseToEdit, existingExpenses }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!expenseToEdit;

  useEffect(() => {
    if (isEditing) {
      setDate(expenseToEdit.date);
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount);
    }
  }, [expenseToEdit, isEditing]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
       if (event.key === 'Escape' && !isAlertOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isAlertOpen]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(existingExpenses.map(e => e.category));
    return Array.from(categories).sort();
  }, [existingExpenses]);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setIsAlertOpen(true);
  };

  const handleSubmit = () => {
    if (!category.trim() || !description.trim() || amount <= 0) {
      showAlert('الرجاء تعبئة جميع الحقول المطلوبة بمبالغ صحيحة.');
      return;
    }
    onSave({
      id: expenseToEdit?.id,
      date,
      category,
      description,
      amount,
    });
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
        aria-modal="true" role="dialog" onClick={onClose}
    >
        <datalist id="categories-datalist">
            {uniqueCategories.map(c => <option key={c} value={c} />)}
        </datalist>

        <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'تعديل مصروف' : 'تسجيل مصروف جديد'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">التاريخ <span className="text-red-500">*</span></label>
                    <input type="date" id="expenseDate" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="expenseCategory" className="block text-sm font-medium text-gray-700 mb-1">الفئة <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        id="expenseCategory" 
                        list="categories-datalist"
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        placeholder="مثال: إيجار, كهرباء, تسويق" 
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm" 
                    />
                </div>
                <div>
                    <label htmlFor="expenseDescription" className="block text-sm font-medium text-gray-700 mb-1">الوصف <span className="text-red-500">*</span></label>
                    <textarea id="expenseDescription" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="expenseAmount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ <span className="text-red-500">*</span></label>
                    <input type="number" id="expenseAmount" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} min="0" className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600">
                    {isEditing ? 'حفظ التعديلات' : 'حفظ المصروف'}
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

export default AddExpenseModal;
