
import React, { useState, useEffect } from 'react';
import type { Supplier } from '../types.ts';
import AlertModal from './AlertModal.tsx';
import { generateNextSequence } from '../utils/sequenceManager.ts';

interface AddSupplierModalProps {
  onClose: () => void;
  onSave: (supplier: Omit<Supplier, 'id'> & { id?: string }) => void;
  supplierToEdit?: Supplier | null;
  existingSuppliers: Supplier[];
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ onClose, onSave, supplierToEdit, existingSuppliers }) => {
  const [supplierCode, setSupplierCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState(''); 
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!supplierToEdit;

  useEffect(() => {
    if (isEditing && supplierToEdit) {
        setSupplierCode(supplierToEdit.id);
        setName(supplierToEdit.name);
        setCompanyName(supplierToEdit.companyName || '');
        setPhone(supplierToEdit.phone);
        setAddress(supplierToEdit.address);
        setOpeningBalance(supplierToEdit.openingBalance);
    } else {
        const nextId = generateNextSequence('suppliers', existingSuppliers);
        setSupplierCode(nextId);
        setName('');
        setCompanyName('');
        setPhone('');
        setAddress('');
        setOpeningBalance(0);
    }
  }, [isEditing, supplierToEdit, existingSuppliers]);

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
      showAlert('اسم المسؤول مطلوب.');
      return;
    }

    // Uniqueness Check
    const isDuplicate = existingSuppliers.some(s => 
        s.name.trim().toLowerCase() === name.trim().toLowerCase() && 
        s.id !== supplierToEdit?.id
    );

    if (isDuplicate) {
        showAlert('اسم المسؤول المُدخل مسجل بالفعل، يرجى التحقق.');
        return;
    }

    onSave({ 
        id: supplierCode,
        name: name.trim(), 
        companyName: companyName.trim(),
        phone: phone.trim(), 
        address: address.trim(), 
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
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'تعديل بيانات مورد' : 'إضافة مورد جديد'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                 <div>
                     <label htmlFor="supplierCode" className="block text-sm font-medium text-gray-700 mb-1">كود المورد (تلقائي)</label>
                     <input type="text" id="supplierCode" value={supplierCode} readOnly className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 font-mono" />
                 </div>
               <div>
    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
        اسم الشركة <span className="text-red-500">*</span>
    </label>
    <input
        type="text"
        id="companyName"
        value={companyName}
        onChange={e => setCompanyName(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
    />
</div>
<div>
    <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 mb-1">
        اسم المسؤول (اختياري)
    </label>
    <input
        type="text"
        id="supplierName"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
    />
</div>

                 <div>
                    <label htmlFor="supplierPhone" className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input type="tel" id="supplierPhone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="supplierAddress" className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                    <input type="text" id="supplierAddress" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="supplierBalance" className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي</label>
                    <input type="number" id="supplierBalance" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700">{isEditing ? 'حفظ التعديلات' : 'حفظ المورد'}</button>
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

export default AddSupplierModal;
