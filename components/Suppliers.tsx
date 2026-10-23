
import React, { useState, useMemo } from 'react';
import AddSupplierModal from './AddSupplierModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import type { Supplier, PurchaseInvoice, SupplierPayment } from '../types.ts';
import ExcelImportModal from './ExcelImportModal.tsx';
import SupplierStatementModal from './SupplierStatementModal.tsx'; // Import Modal

interface SuppliersProps {
    supplierList: Supplier[];
    setSupplierList: React.Dispatch<React.SetStateAction<Supplier[]>>;
    purchaseInvoices: PurchaseInvoice[];
    supplierPayments: SupplierPayment[];
}

const Suppliers: React.FC<SuppliersProps> = ({
    supplierList, setSupplierList,
    purchaseInvoices, supplierPayments
}) => {
    // Modals State
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false); // New State
    const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<string | undefined>(undefined); // New State

    // Editing State
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Deletion State
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

    // Calculate Balances Logic
    const suppliersWithBalance = useMemo(() => {
        return supplierList.map(supplier => {
            const totalPurchases = purchaseInvoices
                .filter(inv => inv.supplierId === supplier.id && inv.status !== 'voided')
                .reduce((sum, inv) => sum + inv.total, 0);
            const totalPaid = supplierPayments
                .filter(pay => pay.supplierId === supplier.id && pay.status !== 'voided')
                .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
            const opening = Number(supplier.openingBalance) || 0;
            const currentBalance = opening + totalPurchases - totalPaid;
            return { ...supplier, currentBalance };
        });
    }, [supplierList, purchaseInvoices, supplierPayments]);

    const totalPayables = suppliersWithBalance.reduce((sum, s) => sum + (Number(s.currentBalance) || 0), 0);

    // -- Supplier Handlers --
    const handleOpenSupplierModal = (supplier?: Supplier) => {
        setEditingSupplier(supplier || null);
        setIsSupplierModalOpen(true);
    };

    const handleOpenStatement = (supplierId: string) => {
        setSelectedSupplierForStatement(supplierId);
        setIsStatementModalOpen(true);
    };

    const handleSaveSupplier = (supplierData: Omit<Supplier, 'id'> & { id?: string }) => {
        const isEdit = supplierList.some(s => s.id === supplierData.id);
        if (isEdit) {
            // Edit existing supplier
            setSupplierList(prev => prev.map(s => s.id === supplierData.id ? { ...s, ...supplierData } as Supplier : s));
        } else {
            // Add new supplier
            const newSupplier: Supplier = { ...supplierData, id: supplierData.id || `S-${Date.now()}` } as Supplier;
            setSupplierList(prev => [...prev, newSupplier]);
        }
        // Close modal and reset state
        setIsSupplierModalOpen(false);
        setEditingSupplier(null);
    };

    const handleImportSuppliers = (rows: any[]) => {
        const imported: Supplier[] = rows.map(row => ({
            id: `S-IMP-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
            name: row.name || '',
            companyName: row.companyName || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            taxNumber: row.taxNumber || '',
            openingBalance: Number(row.openingBalance) || 0,
        }));
        setSupplierList(prev => [...prev, ...imported]);
    };

    // -- Delete Handlers --
    const handleDeleteRequest = (id: string) => {
        setSupplierToDelete(id);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = () => {
        if (supplierToDelete) {
            setSupplierList(prev => prev.filter(s => s.id !== supplierToDelete));
        }
        setIsConfirmModalOpen(false);
        setSupplierToDelete(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">إدارة الموردين</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportOpen(true)}
                        className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                    >
                        <span>📊</span>
                        <span>استيراد Excel</span>
                    </button>
                    <button
                        onClick={() => handleOpenSupplierModal()}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        <span>إضافة مورد جديد</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="mb-6">
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                        <h3 className="text-lg font-semibold text-green-800">إجمالي مستحقات الموردين</h3>
                        <p className="text-sm text-green-600">الأموال المستحقة للموردين على الشركة</p>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                        {(Number(totalPayables) || 0).toLocaleString('en-US')} ج.م
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide">الكود</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">اسم الشركة</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">اسم المسؤول</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">الهاتف</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">العنوان</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">الرصيد الافتتاحي</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">الرصيد الحالي</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {suppliersWithBalance.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-sm text-gray-700 font-mono">{supplier.id}</td>
                                    <td className="p-3 text-sm text-gray-700 font-bold">{supplier.companyName || '-'}</td>
                                    <td className="p-3 text-sm text-gray-700">{supplier.name}</td>
                                    <td className="p-3 text-sm text-gray-700">{supplier.phone}</td>
                                    <td className="p-3 text-sm text-gray-700">{supplier.address}</td>
                                    <td className={`p-3 text-sm text-gray-500`}>
                                        {(Number(supplier.openingBalance) || 0).toLocaleString('en-US')} ج.م
                                    </td>
                                    <td className={`p-3 text-sm font-bold ${supplier.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {(Number(supplier.currentBalance) || 0).toLocaleString('en-US')} ج.م
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse flex">
                                        <button onClick={() => handleOpenStatement(supplier.id)} className="text-gray-600 hover:text-gray-800 transition-colors" title="كشف حساب">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        </button>
                                        <button onClick={() => handleOpenSupplierModal(supplier)} className="text-blue-500 hover:text-blue-700 transition-colors" title="تعديل">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </button>
                                        <button onClick={() => handleDeleteRequest(supplier.id)} className="text-red-500 hover:text-red-700 transition-colors" title="حذف">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isSupplierModalOpen && (
                <AddSupplierModal
                    onClose={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }}
                    onSave={handleSaveSupplier}
                    supplierToEdit={editingSupplier}
                    existingSuppliers={supplierList}
                />
            )}

            {isImportOpen && (
                <ExcelImportModal
                    importType="suppliers"
                    onClose={() => setIsImportOpen(false)}
                    onImport={handleImportSuppliers}
                />
            )}

            {isStatementModalOpen && (
                <SupplierStatementModal
                    onClose={() => setIsStatementModalOpen(false)}
                    suppliers={supplierList}
                    invoices={purchaseInvoices}
                    payments={supplierPayments}
                    initialSupplierId={selectedSupplierForStatement}
                />
            )}

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="تأكيد حذف مورد"
                message="هل أنت متأكد من رغبتك في حذف هذا المورد؟ قد يؤثر ذلك على الحسابات والفواتير المرتبطة."
            />
        </div>
    );
};

export default Suppliers;
