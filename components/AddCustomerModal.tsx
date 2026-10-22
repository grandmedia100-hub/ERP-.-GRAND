
import React, { useState, useEffect } from 'react';
import type { Customer } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddCustomerModalProps {
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'> & { id?: string }) => void;
  customerToEdit?: Customer | null;
  existingCustomers: Customer[];
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ onClose, onSave, customerToEdit, existingCustomers }) => {
  const [customerCode, setCustomerCode] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState(''); 
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [creditPeriodDays, setCreditPeriodDays] = useState<number>(30);
  const [isCreditLocked, setIsCreditLocked] = useState<boolean>(false);
  const [taxNumber, setTaxNumber] = useState<string>('');

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!customerToEdit;

  useEffect(() => {
      if (isEditing && customerToEdit) {
          setCustomerCode(customerToEdit.id);
          setName(customerToEdit.name);
          setCompanyName(customerToEdit.companyName || '');
          setPhone(customerToEdit.phone);
          setAddress(customerToEdit.address);
          setOpeningBalance(customerToEdit.openingBalance);
          setCreditLimit(customerToEdit.creditLimit || 0);
          setCreditPeriodDays(customerToEdit.creditPeriodDays || 30);
          setIsCreditLocked(!!customerToEdit.isCreditLocked);
          setTaxNumber(customerToEdit.taxNumber || '');
      } else {
          const prefix = 'C-';
          const maxNum = existingCustomers.reduce((max, c) => {
              if (c.id.startsWith(prefix)) {
                  const num = parseInt(c.id.substring(prefix.length), 10);
                  return isNaN(num) ? max : Math.max(max, num);
              }
              const num = parseInt(c.id.replace('C', ''), 10);
              return isNaN(num) ? max : Math.max(max, num);
          }, 0);
          const nextId = `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
          setCustomerCode(nextId);
          setName('');
          setCompanyName('');
          setPhone('');
          setAddress('');
          setOpeningBalance(0);
          setCreditLimit(0);
          setCreditPeriodDays(30);
          setIsCreditLocked(false);
          setTaxNumber('');
      }
  }, [isEditing, customerToEdit, existingCustomers]);

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
    // Check if any OTHER customer has the same name (case-insensitive)
    const isDuplicate = existingCustomers.some(c => 
        c.name.trim().toLowerCase() === name.trim().toLowerCase() && 
        c.id !== customerToEdit?.id
    );

    if (isDuplicate) {
        showAlert('اسم المسؤول المُدخل مسجل بالفعل، يرجى التحقق.');
        return;
    }

    const customerData = { 
        id: customerCode,
        name: name.trim(), 
        companyName: companyName.trim(),
        phone: phone.trim(), 
        address: address.trim(), 
        openingBalance,
        creditLimit: creditLimit > 0 ? creditLimit : undefined,
        creditPeriodDays: creditPeriodDays > 0 ? creditPeriodDays : 30,
        isCreditLocked,
        taxNumber: taxNumber.trim() || undefined
    };

    onSave(customerData);
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
                <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'تعديل بيانات عميل' : 'إضافة عميل جديد'}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                 <div>
                     <label htmlFor="customerCode" className="block text-sm font-medium text-gray-700 mb-1">كود العميل (تلقائي)</label>
                     <input type="text" id="customerCode" value={customerCode} readOnly className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 font-mono" />
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
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">اسم المسؤول (اختياري) <span className="text-red-500">*</span></label>
                    <input type="text" id="customerName" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input type="tel" id="customerPhone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                    <input type="text" id="customerAddress" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="customerBalance" className="block text-sm font-medium text-gray-700 mb-1">الرصيد الافتتاحي</label>
                    <input type="number" id="customerBalance" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>

                {/* Credit Limit & Tax Info */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                    <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <span>🛡️</span> ضوابط الائتمان والبيانات الضريبية
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">الحد الائتماني (ج.م)</label>
                            <input
                                type="number"
                                placeholder="0 = غير محدد"
                                value={creditLimit || ''}
                                onChange={e => setCreditLimit(parseFloat(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded-md text-xs font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">فترة السماح (أيام)</label>
                            <input
                                type="number"
                                placeholder="30"
                                value={creditPeriodDays || ''}
                                onChange={e => setCreditPeriodDays(parseInt(e.target.value) || 0)}
                                className="w-full p-2 border border-gray-300 rounded-md text-xs font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">الرقم الضريبي للعميل</label>
                        <input
                            type="text"
                            placeholder="e.g. 123-456-789"
                            value={taxNumber}
                            onChange={e => setTaxNumber(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md text-xs font-mono"
                        />
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-blue-100/60">
                        <input
                            type="checkbox"
                            id="isCreditLocked"
                            checked={isCreditLocked}
                            onChange={e => setIsCreditLocked(e.target.checked)}
                            className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="isCreditLocked" className="text-xs font-bold text-rose-700 cursor-pointer select-none">
                            🚫 تجميد البيع الآجل (منع إصدار فواتير آجلة لهذا العميل)
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">{isEditing ? 'حفظ التعديلات' : 'حفظ العميل'}</button>
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

export default AddCustomerModal;
