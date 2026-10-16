
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">صلاحيات الوصول</label>

            <div className="space-y-4 max-h-60 overflow-y-auto p-2 border rounded-lg bg-gray-50">

              {/* Main Sections */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">الأقسام الرئيسية</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_dashboard')} onChange={() => togglePermission('access_dashboard')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">لوحة التحكم</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_sales')} onChange={() => togglePermission('access_sales')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">المبيعات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_purchases')} onChange={() => togglePermission('access_purchases')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">المشتريات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_inventory')} onChange={() => togglePermission('access_inventory')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">المخزون</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_expenses')} onChange={() => togglePermission('access_expenses')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">المصروفات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_customers')} onChange={() => togglePermission('access_customers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">العملاء</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_suppliers')} onChange={() => togglePermission('access_suppliers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">الموردين</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_treasury')} onChange={() => togglePermission('access_treasury')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">الخزينة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_partners')} onChange={() => togglePermission('access_partners')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">الشركاء</span>
                  </label>
                </div>
              </div>

              {/* Reports & Charts */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">التقارير والمحاسبة</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_reports')} onChange={() => togglePermission('access_reports')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">التقارير العامة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_chart_of_accounts')} onChange={() => togglePermission('access_chart_of_accounts')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">دليل الحسابات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_sales')} onChange={() => togglePermission('view_reports_sales')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير المبيعات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_purchases')} onChange={() => togglePermission('view_reports_purchases')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير المشتريات</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_customers')} onChange={() => togglePermission('view_reports_customers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير العملاء</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_suppliers')} onChange={() => togglePermission('view_reports_suppliers')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير الموردين</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_treasury')} onChange={() => togglePermission('view_reports_treasury')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير الخزينة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('view_reports_profits')} onChange={() => togglePermission('view_reports_profits')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">تقارير الأرباح</span>
                  </label>
                </div>
              </div>

              {/* Management & Admin */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">الإدارة والإعدادات</h4>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('access_settings')} onChange={() => togglePermission('access_settings')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">الإعدادات العامة</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_backup')} onChange={() => togglePermission('manage_backup')} className="form-checkbox h-4 w-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">النسخ الاحتياطي</span>
                  </label>
                  <label className="flex items-center space-x-2 space-x-reverse cursor-pointer">
                    <input type="checkbox" checked={permissions.includes('manage_users')} onChange={() => togglePermission('manage_users')} className="form-checkbox h-4 w-4 text-purple-600 rounded" />
                    <span className="text-sm font-bold text-purple-700">إدارة المستخدمين</span>
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
