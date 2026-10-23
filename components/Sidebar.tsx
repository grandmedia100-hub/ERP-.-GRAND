import React, { useState } from 'react';
import type { Page, User } from '../types.ts';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpenAccountingSettings?: (module: 'sales' | 'purchases' | 'manufacturing' | 'treasury' | 'warehouse') => void;
}

interface NavSubItem {
  id: Page | string;
  label: string;
  icon: string;
  permission?: string;
  onClick?: () => void;
}

interface NavModule {
  id: string;
  label: string;
  icon: string;
  permission: string;
  targetPage: Page;
  subItems: NavSubItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  currentUser,
  onLogout,
  isOpen = false,
  onClose,
}) => {
  // Keep track of which module dropdowns are expanded
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    sales: true,
    purchases: true,
    manufacturing: true,
    warehouse: false,
    treasury: false,
    finance: false,
    settings: false,
  });

  const toggleModule = (modId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const navModules: NavModule[] = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: '🏠',
      permission: 'access_dashboard',
      targetPage: 'dashboard',
      subItems: []
    },
    {
      id: 'sales',
      label: 'المبيعات',
      icon: '📈',
      permission: 'access_sales',
      targetPage: 'sales',
      subItems: [
        { id: 'sales', label: 'فواتير ومرتجعات المبيعات', icon: '📄' },
        { id: 'quotations', label: 'عروض الأسعار', icon: '📝', permission: 'access_quotations' },
        { id: 'customers', label: 'العملاء وحساباتهم', icon: '👥', permission: 'access_customers' },
      ]
    },
    {
      id: 'purchases',
      label: 'المشتريات',
      icon: '🛒',
      permission: 'access_purchases',
      targetPage: 'purchases',
      subItems: [
        { id: 'purchaseRequests', label: 'طلبات الشراء (PR)', icon: '📝', permission: 'access_purchase_requests' },
        { id: 'purchaseOrders', label: 'أوامر الشراء (PO)', icon: '📑', permission: 'access_purchase_orders' },
        { id: 'purchases', label: 'فواتير ومرتجعات المشتريات', icon: '🧾', permission: 'access_purchases' },
        { id: 'suppliers', label: 'الموردين وحساباتهم', icon: '🚛', permission: 'access_suppliers' },
      ]
    },
    {
      id: 'manufacturing',
      label: 'التصنيع والتشغيل',
      icon: '🏗️',
      permission: 'access_manufacturing',
      targetPage: 'manufacturing',
      subItems: [
        { id: 'manufacturing', label: 'أوامر التصنيع والتشغيل', icon: '📋' },
        { id: 'inventory', label: 'خامات ومستلزمات الإنتاج', icon: '📦', permission: 'access_inventory' },
      ]
    },
    {
      id: 'warehouse',
      label: 'المخازن والأصناف',
      icon: '🏭',
      permission: 'access_warehouse',
      targetPage: 'warehouse',
      subItems: [
        { id: 'warehouse', label: 'إدارة المستودعات والجرد', icon: '🏢' },
        { id: 'inventory', label: 'بطاقات الأصناف والأسعار', icon: '🏷️', permission: 'access_inventory' },
        { id: 'fixedAssets', label: 'الأصول والآلات الثابتة', icon: '⚙️', permission: 'access_fixed_assets' },
      ]
    },
    {
      id: 'treasury',
      label: 'الخزينة والبنوك',
      icon: '🏦',
      permission: 'access_treasury',
      targetPage: 'treasury',
      subItems: [
        { id: 'treasury', label: 'سندات القبض والصرف', icon: '💵' },
      ]
    },
    {
      id: 'finance',
      label: 'الحسابات العامة',
      icon: '📂',
      permission: 'access_chart_of_accounts',
      targetPage: 'chartOfAccounts',
      subItems: [
        { id: 'chartOfAccounts', label: 'دليل شجرة الحسابات', icon: '🌳' },
        { id: 'journalEntries', label: 'دفتر القيود اليومية', icon: '📒', permission: 'access_journal_entries' },
        { id: 'reports', label: 'التقارير والقوائم المالية', icon: '📊', permission: 'access_reports' },
      ]
    },
    {
      id: 'settings',
      label: 'النظام والإعدادات',
      icon: '⚙️',
      permission: 'access_settings',
      targetPage: 'settings',
      subItems: [
        { id: 'settings', label: 'الإعدادات العامة والشركة', icon: '🛠️' },
        { id: 'accountingSettings', label: 'إعدادات التوجيه المحاسبي', icon: '⚖️' },
        { id: 'users', label: 'المستخدمين والصلاحيات', icon: '👤', permission: 'manage_users' },
        { id: 'backup', label: 'النسخ الاحتياطي والأمان', icon: '💾', permission: 'manage_backup' },
        { id: 'auditLog', label: 'سجل العمليات والرقابة', icon: '🔍', permission: 'manage_users' },
      ]
    }
  ];

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (currentUser?.role === 'admin' || currentUser?.role === 'developer') return true;
    return currentUser?.permissions?.includes(permission as any) || false;
  };

  const filteredModules = navModules.filter(m => hasPermission(m.permission));

  const handleSelectPage = (page: Page) => {
    setActivePage(page);
    if (window.innerWidth < 768 && onClose) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 right-0 z-30 h-full w-72 bg-white text-gray-800 shadow-xl flex flex-col transition-transform duration-300 ease-in-out border-l border-gray-100 flex-shrink-0 select-none
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-5 text-center border-b border-gray-100 bg-gradient-to-b from-blue-50/50 to-white relative">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-2xl font-black text-blue-700 tracking-tight">ERP System</h1>
          </div>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">MediaHive Advanced Edition</p>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full hover:bg-gray-100 md:hidden text-gray-400"
          >
            ✕
          </button>

          {currentUser && (
            <div className="mt-3 text-xs text-gray-600 bg-white border border-gray-100 shadow-sm rounded-xl p-2.5 flex items-center justify-between">
              <div className="text-right">
                <div className="font-bold text-gray-800 truncate max-w-[140px]">{currentUser.fullName}</div>
                <div className="text-[10px] text-blue-600 font-semibold">{currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'developer' ? 'مطور النظام' : 'مستخدم'}</div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
            </div>
          )}
        </div>

        {/* Navigation Modules with Dropdowns */}
        <nav className="flex-1 min-h-0 p-3 space-y-1.5 overflow-y-auto custom-scrollbar" style={{ overscrollBehavior: 'contain' }}>
          {filteredModules.map(mod => {
            const hasSub = mod.subItems.length > 0;
            const isExpanded = !!expandedModules[mod.id];
            const isModuleActive = activePage === mod.targetPage || mod.subItems.some(s => s.id === activePage);

            return (
              <div key={mod.id} className="rounded-xl overflow-hidden transition-all">
                {/* Module Main Button */}
                <div
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isModuleActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-slate-50 text-gray-700 hover:text-blue-700'
                  }`}
                  onClick={() => {
                    if (hasSub) {
                      setExpandedModules(prev => ({ ...prev, [mod.id]: !prev[mod.id] }));
                    }
                    handleSelectPage(mod.targetPage);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center">{mod.icon}</span>
                    <span className="font-bold text-sm">{mod.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      title="فتح هذه الصفحة في نافذة مستقلة جديدة"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/?page=${mod.targetPage}`, '_blank');
                      }}
                      className={`p-1 rounded-lg transition-colors text-xs opacity-0 group-hover:opacity-100 ${
                        isModuleActive ? 'hover:bg-blue-700 text-blue-100' : 'hover:bg-gray-200 text-gray-400 hover:text-blue-600'
                      }`}
                    >
                      ↗
                    </button>

                    {/* Arrow for Dropdown */}
                    {hasSub && (
                      <button
                        onClick={(e) => toggleModule(mod.id, e)}
                        className={`p-1 rounded-md text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        ▼
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-items Collapsible List */}
                {hasSub && isExpanded && (
                  <div className="pr-6 pl-2 py-1.5 space-y-1 border-r-2 border-blue-200 mr-4 mt-1 bg-slate-50/50 rounded-lg">
                    {mod.subItems.filter(s => hasPermission(s.permission)).map(sub => {
                      const isSubActive = activePage === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center group justify-between gap-1"
                        >
                          <button
                            onClick={() => handleSelectPage(sub.id as Page)}
                            className={`flex-1 flex items-center gap-2.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-right transition-all ${isSubActive
                              ? 'bg-blue-100 text-blue-800 font-bold'
                              : 'text-gray-600 hover:bg-white hover:text-blue-600'
                            }`}
                          >
                            <span className="text-xs">{sub.icon}</span>
                            <span>{sub.label}</span>
                          </button>
                          <button
                            title="فتح في نافذة مستقلة"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/?page=${sub.id}`, '_blank');
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white rounded transition-all text-xs"
                          >
                            ↗
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-bold text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>

        <div className="p-2 text-center text-[10px] text-gray-400 bg-gray-50/80 border-t border-gray-100">
          <p>&copy; 2026 ERP System - v9.1.0</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
