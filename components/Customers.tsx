
import React, { useState, useMemo } from 'react';
import AddCustomerModal from './AddCustomerModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';
import ExcelImportModal from './ExcelImportModal.tsx';
import type { Customer, SalesInvoice, CustomerPayment } from '../types.ts';

interface CustomersProps {
  customerList: Customer[];
  setCustomerList: React.Dispatch<React.SetStateAction<Customer[]>>;
  salesInvoices: SalesInvoice[];
  customerPayments: CustomerPayment[];
}

const Customers: React.FC<CustomersProps> = ({
  customerList, setCustomerList,
  salesInvoices, customerPayments
}) => {
  // Modals State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Editing State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Deletion State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Calculate Balances Logic
  const customersWithBalance = useMemo(() => {
    return customerList.map(customer => {
      const totalSales = salesInvoices
        .filter(inv => inv.customerId === customer.id && inv.status !== 'voided')
        .reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = customerPayments
        .filter(pay => pay.customerId === customer.id && pay.status !== 'voided')
        .reduce((sum, pay) => sum + pay.amount, 0);
      const currentBalance = customer.openingBalance + totalSales - totalPaid;
      return { ...customer, currentBalance };
    });
  }, [customerList, salesInvoices, customerPayments]);

  const totalReceivables = customersWithBalance.reduce((sum, c) => sum + c.currentBalance, 0);

  // -- Customer Handlers --
  const handleOpenCustomerModal = (customer?: Customer) => {
    setEditingCustomer(customer || null);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (customerData: Omit<Customer, 'id'> & { id?: string }) => {
    const isEdit = customerList.some(c => c.id === customerData.id);
    if (isEdit) {
      // Edit existing customer
      setCustomerList(prev => prev.map(c => c.id === customerData.id ? { ...c, ...customerData } as Customer : c));
    } else {
      // Add new customer
      const newCustomer: Customer = { ...customerData, id: customerData.id || `C-${Date.now()}` } as Customer;
      setCustomerList(prev => [...prev, newCustomer]);
    }
    // Close modal and reset state
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleImportCustomers = (rows: any[]) => {
    const imported: Customer[] = rows.map(row => ({
      id: `C-IMP-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
      name: row.name || '',
      companyName: row.companyName || '',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      taxNumber: row.taxNumber || '',
      openingBalance: Number(row.openingBalance) || 0,
    }));
    setCustomerList(prev => [...prev, ...imported]);
  };

  // -- Delete Handlers --
  const handleDeleteRequest = (id: string) => {
    setCustomerToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      setCustomerList(prev => prev.filter(c => c.id !== customerToDelete));
    }
    setIsConfirmModalOpen(false);
    setCustomerToDelete(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">إدارة العملاء</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsImportOpen(true)}
            className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 flex items-center gap-2"
          >
            <span>📊</span>
            <span>استيراد Excel</span>
          </button>
          <button
            onClick={() => handleOpenCustomerModal()}
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center space-x-2 space-x-reverse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-blue-800">إجمالي مديونيات العملاء</h3>
            <p className="text-sm text-blue-600">الأموال المستحقة للشركة عند العملاء</p>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {totalReceivables.toLocaleString('en-US')} ج.م
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
              {customersWithBalance.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-700 font-mono">{customer.id}</td>
                  <td className="p-3 text-sm text-gray-700 font-bold">{customer.companyName || '-'}</td>
                  <td className="p-3 text-sm text-gray-700">{customer.name}</td>
                  <td className="p-3 text-sm text-gray-700">{customer.phone}</td>
                  <td className="p-3 text-sm text-gray-700">{customer.address}</td>
                  <td className="p-3 text-sm text-gray-500">
                    {customer.openingBalance.toLocaleString('en-US')} ج.م
                  </td>
                  <td className={`p-3 text-sm font-bold ${customer.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {customer.currentBalance.toLocaleString('en-US')} ج.م
                  </td>
                  <td className="p-3 text-sm text-gray-700 space-x-2 space-x-reverse">
                    <button onClick={() => handleOpenCustomerModal(customer)} className="text-blue-500 hover:text-blue-700 transition-colors" title="تعديل">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <button onClick={() => handleDeleteRequest(customer.id)} className="text-red-500 hover:text-red-700 transition-colors" title="حذف">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCustomerModalOpen && (
        <AddCustomerModal
          onClose={() => { setIsCustomerModalOpen(false); setEditingCustomer(null); }}
          onSave={handleSaveCustomer}
          customerToEdit={editingCustomer}
          existingCustomers={customerList}
        />
      )}
      {isImportOpen && (
        <ExcelImportModal
          importType="customers"
          onClose={() => setIsImportOpen(false)}
          onImport={handleImportCustomers}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف عميل"
        message="هل أنت متأكد من رغبتك في حذف هذا العميل؟ قد يؤثر ذلك على الحسابات والفواتير المرتبطة."
      />
    </div>
  );
};

export default Customers;
