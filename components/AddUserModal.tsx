
import React, { useState, useEffect } from 'react';
import type { User, Permission } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddUserModalProps {
  onClose: () => void;
  onSave: (user: Omit<User, 'id'> & { id?: string }) => void;
  userToEdit: User | null;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSave, userToEdit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!userToEdit;

  useEffect(() => {
    if (isEditing && userToEdit) {
      setUsername(userToEdit.username);
      setPassword(userToEdit.password);
      setFullName(userToEdit.fullName);
      setPermissions(userToEdit.permissions);
    } else {
      // Default permissions for new user
      setPermissions(['access_dashboard', 'access_sales']);
    }
  }, [userToEdit, isEditing]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isAlertOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isAlertOpen]);

  const availablePermissions: { key: Permission; label: string }[] = [
    { key: 'access_dashboard', label: 'الرئيسية' },
    { key: 'access_sales', label: 'المبيعات' },
    { key: 'access_purchases', label: 'المشتريات' },
    { key: 'access_inventory', label: 'المخزون' },
    { key: 'access_expenses', label: 'المصروفات' },
    { key: 'access_customers', label: 'العملاء والموردين' },
    { key: 'access_treasury', label: 'الخزينة والبنوك' },
    { key: 'access_partners', label: 'الشركاء' },
    { key: 'access_reports', label: 'التقارير' },
    { key: 'access_chart_of_accounts', label: 'شجرة الحسابات' },
    { key: 'access_settings', label: 'الإعدادات العامة' },
    { key: 'manage_users', label: 'إدارة المستخدمين' },
  ];

  const togglePermission = (perm: Permission) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const handleSelectAll = () => {
    // This function might need to be updated to select all permissions across categories
    // For now, it's not directly used in the new UI, but kept for potential future use or if categories are removed.
    setPermissions(availablePermissions.map(p => p.key));
  };

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setIsAlertOpen(true);
  };

  const handleSubmit = () => {
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      showAlert('جميع الحقول مطلوبة');
      return;
    }

    onSave({
      id: userToEdit?.id,
      username,
      password,
      fullName,
      role: permissions.includes('manage_users') ? 'admin' : 'user',
      permissions
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{isEditing ? 'تعديل بيانات مستخدم' : 'إضافة مستخدم جديد'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم بالكامل</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم (للدخول)</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
              <input type="text" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          {/* Permissions Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-gray-700">صلاحيات الوصول حسب الموديول</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allPerms: Permission[] = [
                      'access_dashboard', 'access_sales', 'access_quotations', 'access_customers',
                      'access_purchases', 'access_purchase_requests', 'access_purchase_orders', 'access_suppliers',
                      'access_manufacturing', 'access_inventory',
                      'access_warehouse', 'access_fixed_assets',
                      'access_treasury', 'access_chart_of_accounts', 'access_journal_entries', 'access_expenses', 'access_partners',
                      'view_reports_sales', 'view_reports_purchases', 'view_reports_customers', 'view_reports_suppliers', 'view_reports_treasury', 'view_reports_profits', 'access_reports',
                      'manage_accounting_settings', 'access_settings', 'manage_backup', 'manage_users'
                    ];
                    setPermissions(allPerms);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  تحديد الكل
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setPermissions(['access_dashboard'])}
                  className="text-xs text-red-500 hover:text-red-700 font-bold"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-72 overflow-y-auto p-3 border rounded-xl bg-gray-50/70">
              {/* Purchases Module */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🛒</span>
                    <span>موديول المشتريات والدورة المستندية</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_purchases', 'access_purchase_requests', 'access_purchase_orders', 'access_suppliers'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_purchase_requests')} onChange={() => togglePermission('access_purchase_requests')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">طلبات الشراء (PR)</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_purchase_orders')} onChange={() => togglePermission('access_purchase_orders')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">أوامر الشراء (PO)</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_purchases')} onChange={() => togglePermission('access_purchases')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">فواتير ومرتجعات المشتريات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_suppliers')} onChange={() => togglePermission('access_suppliers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">دليل وحسابات الموردين</span>
                  </label>
                </div>
              </div>

              {/* Sales Module */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>📈</span>
                    <span>موديول المبيعات</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_sales', 'access_quotations', 'access_customers'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_sales')} onChange={() => togglePermission('access_sales')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">فواتير ومرتجعات المبيعات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_quotations')} onChange={() => togglePermission('access_quotations')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">عروض الأسعار</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_customers')} onChange={() => togglePermission('access_customers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">دليل وحسابات العملاء</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_dashboard')} onChange={() => togglePermission('access_dashboard')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">لوحة التحكم الرئيسية</span>
                  </label>
                </div>
              </div>

              {/* Manufacturing Module */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🏗️</span>
                    <span>التصنيع والتشغيل</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_manufacturing', 'access_inventory'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_manufacturing')} onChange={() => togglePermission('access_manufacturing')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">أوامر وخطط وقوائم التصنيع</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_inventory')} onChange={() => togglePermission('access_inventory')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">خامات ومستلزمات الإنتاج</span>
                  </label>
                </div>
              </div>

              {/* Warehouse & Assets */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🏭</span>
                    <span>المخازن والأصول الثابتة</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_warehouse', 'access_fixed_assets'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_warehouse')} onChange={() => togglePermission('access_warehouse')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">إدارة المخازن والجرد والأصناف</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_fixed_assets')} onChange={() => togglePermission('access_fixed_assets')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">الأصول الثابتة والإهلاك</span>
                  </label>
                </div>
              </div>

              {/* Treasury & Finance */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>🏦</span>
                    <span>الخزينة والمالية والحسابات</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_treasury', 'access_chart_of_accounts', 'access_journal_entries', 'access_expenses', 'access_partners'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_treasury')} onChange={() => togglePermission('access_treasury')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">الخزينة وحركات النقدية والبنوك</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_chart_of_accounts')} onChange={() => togglePermission('access_chart_of_accounts')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">شجرة الحسابات العامة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_journal_entries')} onChange={() => togglePermission('access_journal_entries')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">قيود اليومية المحاسبية</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_expenses')} onChange={() => togglePermission('access_expenses')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">المصروفات العامة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_partners')} onChange={() => togglePermission('access_partners')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">حسابات الشركاء</span>
                  </label>
                </div>
              </div>

              {/* Reports */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <span>📊</span>
                    <span>التقارير المالية والتحليلية</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const p: Permission[] = ['access_reports', 'view_reports_sales', 'view_reports_purchases', 'view_reports_customers', 'view_reports_suppliers', 'view_reports_treasury', 'view_reports_profits'];
                      const hasAll = p.every(k => permissions.includes(k));
                      setPermissions(hasAll ? permissions.filter(x => !p.includes(x)) : Array.from(new Set([...permissions, ...p])));
                    }}
                    className="text-[11px] text-blue-600 font-semibold"
                  >
                    تبديل الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_reports')} onChange={() => togglePermission('access_reports')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">مركز التقارير العامة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_sales')} onChange={() => togglePermission('view_reports_sales')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">تقارير المبيعات والأرباح</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_purchases')} onChange={() => togglePermission('view_reports_purchases')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">تقارير المشتريات والموردين</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_treasury')} onChange={() => togglePermission('view_reports_treasury')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">تقارير الخزينة والتدفقات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_profits')} onChange={() => togglePermission('view_reports_profits')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">قوائم الدخل والميزانية</span>
                  </label>
                </div>
              </div>

              {/* Administration & Posting Settings */}
              <div className="bg-white p-3 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center mb-2 border-b pb-1.5">
                  <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <span>⚙️</span>
                    <span>الإدارة وتوجيه الترحيلات المحاسبية</span>
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_accounting_settings')} onChange={() => togglePermission('manage_accounting_settings')} className="form-checkbox h-4 w-4 text-purple-600 rounded" />
                    <span className="text-xs font-bold text-purple-700">التحكم في إعدادات التوجيه المحاسبي</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_settings')} onChange={() => togglePermission('access_settings')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">إعدادات النظام والشركة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_backup')} onChange={() => togglePermission('manage_backup')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-xs text-gray-700 font-medium">إدارة النسخ الاحتياطي</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_users')} onChange={() => togglePermission('manage_users')} className="form-checkbox h-4 w-4 text-purple-600 rounded" />
                    <span className="text-xs font-bold text-purple-700">إدارة المستخدمين والصلاحيات</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إلغاء</button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">حفظ المستخدم</button>
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

export default AddUserModal;
