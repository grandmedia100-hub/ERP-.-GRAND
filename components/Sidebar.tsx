import React from 'react';
import type { Page, User } from '../types.ts';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, currentUser, onLogout, isOpen = false, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: '🏠', permission: 'access_dashboard' },
    { id: 'sales', label: 'المبيعات', icon: '📈', permission: 'access_sales' },
    { id: 'purchases', label: 'المشتريات', icon: '🛒', permission: 'access_purchases' },
    { id: 'manufacturing', label: 'التصنيع', icon: '🏗️', permission: 'access_manufacturing' },
    { id: 'warehouse', label: 'إدارة المخازن', icon: '🏭', permission: 'access_warehouse' },
    { id: 'inventory', label: 'الأصناف', icon: '📦', permission: 'access_inventory' },
    { id: 'fixedAssets', label: 'الأصول الثابتة', icon: '🏢', permission: 'access_fixed_assets' },
    { id: 'customers', label: 'العملاء', icon: '👥', permission: 'access_customers' },
    { id: 'suppliers', label: 'الموردين', icon: '🚛', permission: 'access_suppliers' },
    { id: 'chartOfAccounts', label: 'شجرة الحسابات', icon: '📂', permission: 'access_chart_of_accounts' },
    { id: 'journalEntries', label: 'القيود المحاسبية', icon: '📒', permission: 'access_journal_entries' },
    { id: 'treasury', label: 'الخزينة والبنوك', icon: '🏦', permission: 'access_treasury' },
    { id: 'reports', label: 'التقارير', icon: '📄', permission: 'access_reports' },
    { id: 'quotations', label: 'عروض الأسعار', icon: '📝', permission: 'access_quotations' },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️', permission: 'access_settings' },
    { id: 'backup', label: 'النسخ الاحتياطي', icon: '💾', permission: 'manage_backup' },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    currentUser?.permissions.includes(item.permission as any) || currentUser?.role === 'admin' || currentUser?.role === 'developer'
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 z-30 h-full w-64 bg-white text-gray-800 shadow-lg flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 text-center border-b relative">
          <h1 className="text-2xl font-bold text-blue-600">ERP System</h1>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1 rounded-full hover:bg-gray-100 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {currentUser && (
            <div className="mt-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-2">
              مرحباً، <span className="font-bold text-gray-800">{currentUser.fullName}</span>
            </div>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredMenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id as Page);
                if (window.innerWidth < 768 && onClose) onClose();
              }}
              className={`w-full flex items-center space-x-3 space-x-reverse p-3 rounded-lg text-right transition-colors ${activePage === item.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-blue-50 text-gray-600 hover:text-blue-700'
                }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 space-x-reverse p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-bold"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
        <div className="p-2 text-center text-[10px] text-gray-400">
          <p>&copy; 2024 ERP System - v9.0.0</p>
        </div>
      </aside>
    </>
  );
}; // End of Sidebar component

export default Sidebar;