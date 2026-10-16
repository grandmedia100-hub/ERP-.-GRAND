
import React, { useState, useEffect } from 'react';
import type { Partner } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddPartnerModalProps {
  onClose: () => void;
  onSave: (partner: Omit<Partner, 'id'> & { id?: string }) => void;
  existingPartners: Partner[];
  partnerToEdit?: Partner | null;
}

const AddPartnerModal: React.FC<AddPartnerModalProps> = ({ onClose, onSave, existingPartners, partnerToEdit }) => {
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!partnerToEdit;

  useEffect(() => {
    if (isEditing && partnerToEdit) {
        setName(partnerToEdit.name);
        setOpeningBalance(partnerToEdit.openingBalance);
    }
  }, [isEditing, partnerToEdit]);

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
    if (!name.trim()) {
      showAlert('اسم الشريك مطلوب.');
      return;
    }

    // Uniqueness Check (Ensure name doesn't exist, excluding self)
    const isDuplicate = existingPartners.some(p => 
        p.name.trim().toLowerCase() === name.trim().toLowerCase() && 
        p.id !== partnerToEdit?.id
    );

    if (isDuplicate) {
        showAlert('الاسم المُدخل مسجل بالفعل، يرجى التحقق.');
        return;
    }

    onSave({ 
        id: partnerToEdit?.id,
        name, 
        openingBalance 
    });
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
        aria-modal="true" role="dialog" onClick={onClose}
    >
        <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'تعديل بيانات شريك' : 'إضافة شريك جديد'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="partnerName" className="block text-sm font-medium text-gray-700 mb-1">اسم الشريك <span className="text-red-500">*</span></label>
                    <input type="text" id="partnerName" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="partnerBalance" className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي</label>
                    <input type="number" id="partnerBalance" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">{isEditing ? 'حفظ التعديلات' : 'حفظ الشريك'}</button>
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

export default AddPartnerModal;
