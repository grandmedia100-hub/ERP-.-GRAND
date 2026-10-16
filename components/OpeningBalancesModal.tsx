
import React, { useState } from 'react';
import type { Customer, Supplier, Partner, Product, CompanyInfo, TreasuryAccountType } from '../types.ts';

interface OpeningBalancesModalProps {
  onClose: () => void;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  partners: Partner[];
  setPartners: React.Dispatch<React.SetStateAction<Partner[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

const OpeningBalancesModal: React.FC<OpeningBalancesModalProps> = ({
  onClose,
  customers, setCustomers,
  suppliers, setSuppliers,
  partners, setPartners,
  products, setProducts,
  companyInfo, setCompanyInfo
}) => {
  const [activeTab, setActiveTab] = useState<'treasury' | 'customers' | 'suppliers' | 'partners' | 'inventory'>('treasury');

  const handleUpdateCustomer = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, openingBalance: amount } : c));
  };

  const handleUpdateSupplier = (id: string, amount: number) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, openingBalance: amount } : s));
  };

  const handleUpdatePartner = (id: string, amount: number) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, openingBalance: amount } : p));
  };

  const handleUpdateProduct = (id: string, amount: number) => {
    // For products, opening balance usually implies initial quantity
    setProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: amount } : p));
  };

  const handleUpdateTreasury = (account: string, amount: number) => {
    if (account === 'الخزينة الرئيسية') {
         setCompanyInfo(prev => ({ ...prev, treasuryOpeningBalance: amount }));
    } else {
        setCompanyInfo(prev => ({
            ...prev,
            treasuryBreakdown: {
                ...(prev.treasuryBreakdown || {}),
                [account]: amount
            }
        }));
    }
  };

  const getTreasuryBalance = (account: string) => {
      if (account === 'الخزينة الرئيسية') {
          return companyInfo.treasuryOpeningBalance || 0;
      }
      return companyInfo.treasuryBreakdown?.[account] || 0;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'treasury':
        const treasuryAccounts: TreasuryAccountType[] = ['الخزينة الرئيسية', 'انستاباى', 'فودافون كاش', 'بنك فيصل', 'البنك الاهلى'];
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">أرصدة الخزينة والبنوك الافتتاحية</h3>
            {treasuryAccounts.map(account => (
                <div key={account} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                    <span className="font-medium">{account}</span>
                    <input
                        type="number"
                        value={getTreasuryBalance(account)}
                        onChange={(e) => handleUpdateTreasury(account, parseFloat(e.target.value) || 0)}
                        className="border p-2 rounded w-40 text-center font-bold text-blue-600"
                    />
                </div>
            ))}
            <p className="text-sm text-gray-500 mt-2">
              هذه الأرصدة تمثل النقدية الموجودة في كل حساب عند بدء استخدام البرنامج.
            </p>
          </div>
        );
      case 'customers':
        return (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 border-b pb-2">أرصدة العملاء الافتتاحية (مديونيات سابقة)</h3>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {customers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white border-b py-2">
                    <span className="text-sm font-medium w-1/2">{c.name}</span>
                    <input
                    type="number"
                    value={c.openingBalance}
                    onChange={(e) => handleUpdateCustomer(c.id, parseFloat(e.target.value) || 0)}
                    className="border p-1 rounded w-32 text-center text-sm"
                    />
                </div>
                ))}
            </div>
          </div>
        );
      case 'suppliers':
        return (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-700 border-b pb-2">أرصدة الموردين الافتتاحية (مستحقات سابقة)</h3>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {suppliers.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-white border-b py-2">
                    <span className="text-sm font-medium w-1/2">{s.name}</span>
                    <input
                    type="number"
                    value={s.openingBalance}
                    onChange={(e) => handleUpdateSupplier(s.id, parseFloat(e.target.value) || 0)}
                    className="border p-1 rounded w-32 text-center text-sm"
                    />
                </div>
                ))}
            </div>
          </div>
        );
        case 'partners':
            return (
              <div className="space-y-2">
                <h3 className="font-bold text-gray-700 border-b pb-2">رأس مال الشركاء (الرصيد الافتتاحي)</h3>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {partners.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white border-b py-2">
                        <span className="text-sm font-medium w-1/2">{p.name}</span>
                        <input
                        type="number"
                        value={p.openingBalance}
                        onChange={(e) => handleUpdatePartner(p.id, parseFloat(e.target.value) || 0)}
                        className="border p-1 rounded w-32 text-center text-sm"
                        />
                    </div>
                    ))}
                </div>
              </div>
            );
        case 'inventory':
            return (
                <div className="space-y-2">
                <h3 className="font-bold text-gray-700 border-b pb-2">رصيد أول المدة (المخزون)</h3>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {products.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white border-b py-2">
                        <span className="text-sm font-medium w-1/2">{p.name}</span>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-gray-500">الكمية:</span>
                            <input
                            type="number"
                            value={p.quantity}
                            onChange={(e) => handleUpdateProduct(p.id, parseFloat(e.target.value) || 0)}
                            className="border p-1 rounded w-24 text-center text-sm"
                            />
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">إدارة الأرصدة الافتتاحية</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="flex border-b bg-gray-50 overflow-x-auto">
          {['treasury', 'customers', 'suppliers', 'partners', 'inventory'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === tab 
                  ? 'bg-white border-t-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab === 'treasury' && 'الخزينة والبنوك'}
              {tab === 'customers' && 'العملاء'}
              {tab === 'suppliers' && 'الموردين'}
              {tab === 'partners' && 'الشركاء'}
              {tab === 'inventory' && 'المخزون'}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {renderTabContent()}
        </div>

        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button 
            onClick={onClose} 
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpeningBalancesModal;
