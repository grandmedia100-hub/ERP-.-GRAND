import React, { useState } from 'react';
import type { Product, Warehouse } from '../types.ts';
import AddProductModal from './AddProductModal.tsx';
import ExcelImportModal from './ExcelImportModal.tsx';

interface InventoryProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  warehouses?: Warehouse[];
  setWarehouses?: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  logAction?: (action: string) => void;
  [key: string]: any;
}

const Inventory: React.FC<InventoryProps> = ({ products, setProducts, warehouses = [], setWarehouses, logAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleSaveProduct = (newProductData: Omit<Product, 'id'>) => {
    const sku = newProductData.sku || '';
    const newProduct: Product = {
      ...newProductData,
      id: sku || `PROD-${Date.now()}` // Simple unique ID
    };
    setProducts(prevProducts => [...prevProducts, newProduct]);
    if (logAction) logAction(`إضافة صنف جديد: ${newProduct.name} - كود: ${sku}`);
    setIsModalOpen(false);
  };

  const handleImportProducts = (rows: any[]) => {
    let currentCode = 1000;
    products.forEach(p => {
      const code = (p.sku || p.id || '').replace(/\D/g, '');
      if (code && code.length >= 4 && code.length <= 5) {
        const num = parseInt(code, 10);
        if (!isNaN(num) && num > currentCode && num < 100000) currentCode = num;
      }
    });

    const imported: Product[] = rows.map(row => {
      let finalSku = (row.sku || '').trim();
      if (!finalSku || finalSku.length > 6) {
        currentCode++;
        finalSku = String(currentCode);
      }
      return {
        id: finalSku || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: row.name || '',
        sku: finalSku,
        unit: row.unit || 'قطعة',
        quantity: Number(row.quantity) || 0,
        costPrice: Number(row.costPrice) || 0,
        salePrice: Number(row.salePrice) || 0,
        lowStockThreshold: Number(row.lowStockThreshold) || 5,
        warehouseId: row.warehouseId || '',
        warehouseName: row.warehouseName || '',
        category: row.category || '',
        barcode: row.barcode || '',
        productType: row.productType || '',
      };
    });
    setProducts(prev => [...prev, ...imported]);
    if (logAction) logAction(`استيراد ${imported.length} صنف من ملف Excel`);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة المخزون ({products.length} صنف)</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-sm"
          >
            <span>📊</span>
            <span>استيراد Excel</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide">كود الصنف</th>
                <th className="p-3 text-sm font-semibold tracking-wide">اسم الصنف</th>
                <th className="p-3 text-sm font-semibold tracking-wide">المخزن</th>
                <th className="p-3 text-sm font-semibold tracking-wide">نوع الصنف</th>
                <th className="p-3 text-sm font-semibold tracking-wide">الكمية الحالية</th>
                <th className="p-3 text-sm font-semibold tracking-wide">سعر التكلفة</th>
                <th className="p-3 text-sm font-semibold tracking-wide">سعر البيع</th>
                <th className="p-3 text-sm font-semibold tracking-wide">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product: Product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-mono text-sm font-bold text-blue-700">{product.sku || product.id}</td>
                  <td className="p-3 text-sm font-semibold text-gray-800">{product.name}</td>
                  <td className="p-3 text-sm">
                    {product.warehouseName ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{product.warehouseName}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-gray-700">{product.productType || '-'}</td>
                  <td className="p-3 text-sm text-gray-700 font-bold">{(Number(product.quantity) || 0).toLocaleString('en-US')}</td>
                  <td className="p-3 text-sm text-gray-700">{(Number(product.costPrice) || 0).toLocaleString('en-US')} ج.م</td>
                  <td className="p-3 text-sm text-gray-700">{(Number(product.salePrice) || 0).toLocaleString('en-US')} ج.م</td>
                  <td className="p-3 text-sm">
                    {(Number(product.quantity) || 0) > (Number(product.lowStockThreshold) || 0) ? (
                      <span className="p-1.5 text-xs font-medium uppercase tracking-wider text-green-800 bg-green-200 rounded-lg bg-opacity-50">متوفر</span>
                    ) : (
                      <span className="p-1.5 text-xs font-medium uppercase tracking-wider text-red-800 bg-red-200 rounded-lg bg-opacity-50">مخزون منخفض</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <AddProductModal 
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          existingProducts={products}
        />
      )}
      {isImportOpen && (
        <ExcelImportModal
          importType="products"
          onClose={() => setIsImportOpen(false)}
          onImport={handleImportProducts}
          warehouses={warehouses}
          existingProducts={products}
        />
      )}
    </div>
  );
};

export default Inventory;