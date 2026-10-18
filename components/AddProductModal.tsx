
import React, { useState, useEffect } from 'react';
import type { Product } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddProductModalProps {
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  existingProducts: Product[];
}

const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSave, existingProducts }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [unit, setUnit] = useState('قطعة');
  const [productType, setProductType] = useState('منتج تام');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  useEffect(() => {
    let maxNum = 1000;
    existingProducts.forEach(prod => {
      const code = (prod.sku || prod.id || '').replace(/\D/g, '');
      if (code && code.length >= 4 && code.length <= 5) {
        const num = parseInt(code, 10);
        if (!isNaN(num) && num > maxNum && num < 100000) {
          maxNum = num;
        }
      }
    });
    setSku(String(maxNum + 1));
  }, [existingProducts]);

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
      showAlert('اسم الصنف مطلوب.');
      return;
    }
    onSave({ name, sku: sku.trim(), quantity, costPrice, salePrice, lowStockThreshold, unit, productType, category, barcode });
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
                <h2 className="text-xl font-bold text-gray-800">إضافة صنف جديد</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف <span className="text-red-500">*</span></label>
                         <input type="text" id="productName" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                     </div>
                     <div>
                         <label htmlFor="productType" className="block text-sm font-medium text-gray-700 mb-1">نوع الصنف</label>
                         <select id="productType" value={productType} onChange={e => setProductType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                             <option value="خامة">خامة (Raw Material)</option>
                             <option value="منتج تام">منتج تام (Finished Good)</option>
                             <option value="نصف مصنع">نصف مصنع (Work in Progress)</option>
                             <option value="بضاعة">بضاعة للبيع (Merchandise)</option>
                         </select>
                     </div>
                     <div>
                         <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                         <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                     </div>
                     <div>
                         <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                         <input type="text" id="unit" value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                     </div>
                     <div>
                         <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">الباركود</label>
                         <input type="text" id="barcode" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                     </div>
                     <div>
                         <label htmlFor="productSku" className="block text-sm font-medium text-gray-700 mb-1">كود الصنف (تلقائي)</label>
                         <input type="text" id="productSku" value={sku} onChange={e => setSku(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 focus:bg-white font-mono" />
                     </div>
                     <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">الكمية الافتتاحية</label>
                        <input type="number" id="quantity" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                 <div>
                    <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة</label>
                    <input type="number" id="costPrice" value={costPrice} onChange={e => setCostPrice(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
                    <input type="number" id="salePrice" value={salePrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-gray-700 mb-1">حد المخزون المنخفض</label>
                    <input type="number" id="lowStockThreshold" value={lowStockThreshold} onChange={e => setLowStockThreshold(parseInt(e.target.value, 10) || 0)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                </div>
            </div>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
                <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
                <button onClick={handleSubmit} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">حفظ الصنف</button>
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

export default AddProductModal;
