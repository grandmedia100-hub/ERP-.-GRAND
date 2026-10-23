import React, { useState, useMemo } from 'react';
import type { User, Permission } from '../types.ts';
import AddUserModal, { PERMISSION_GROUPS } from './AddUserModal.tsx';
import ConfirmationModal from './ConfirmationModal.tsx';

interface UsersManagementProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const UsersManagement: React.FC<UsersManagementProps> = ({ users, setUsers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalPermissionsCount = useMemo(() => {
    return PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0);
  }, []);

  const handleSaveUser = (userData: Omit<User, 'id'> & { id?: string }) => {
    if (userData.id) {
      setUsers(users.map(u => u.id === userData.id ? { ...u, ...userData } as User : u));
    } else {
      const newUser: User = { ...userData, id: `U${Date.now()}` } as User;
      setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteRequest = (id: string) => {
    if (users.length <= 1) {
      alert('لا يمكن حذف المستخدم الوحيد في النظام.');
      return;
    }
    setUserToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete));
    }
    setIsConfirmOpen(false);
    setUserToDelete(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      (u.fullName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans" dir="rtl">
      {/* Top Main Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-indigo-50/70 p-6 md:p-8 rounded-3xl shadow-sm border-2 border-indigo-100">
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center text-3xl shadow-md ring-4 ring-indigo-50">
              👥
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                  إدارة المستخدمين والصلاحيات الشاملة
                </h1>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3 py-1 rounded-full font-black">
                  {totalPermissionsCount} صلاحية مفصلة
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed font-medium">
                التحكم الكامل في حسابات الدخول، تعيين الأدوار الوظيفية، وتقييد الوصول لكل شاشة، وزر، وحركة محاسبية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 px-5 rounded-2xl shadow-md shadow-indigo-600/30 flex items-center gap-2 text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>➕</span>
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-600">إجمالي المستخدمين</span>
            <span className="text-xl">👥</span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{users.length} مستخدمين</div>
          <div className="text-[11px] text-slate-500 mt-1">حسابات نشطة في النظام</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-purple-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-700">مدراء النظام (Admins)</span>
            <span className="text-xl">👑</span>
          </div>
          <div className="text-2xl font-black text-purple-900 mt-2">
            {users.filter(u => u.role === 'admin' || u.role === 'developer' || u.permissions.includes('manage_users')).length}
          </div>
          <div className="text-[11px] text-purple-600 mt-1">كامل الصلاحيات دون قيود</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-700">مستخدمين مقيدي الصلاحيات</span>
            <span className="text-xl">🔒</span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-2">
            {users.filter(u => u.role !== 'admin' && u.role !== 'developer' && !u.permissions.includes('manage_users')).length}
          </div>
          <div className="text-[11px] text-blue-600 mt-1">وفق أدوارهم الوظيفية المحددة</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-700">الموديولات المشمولة بالصلاحيات</span>
            <span className="text-xl">🛡️</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-2">8 موديولات</div>
          <div className="text-[11px] text-emerald-600 mt-1">مبيعات، مشتريات، مخازن، تصنيع...</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border-2 border-slate-200">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 بحث باسم المستخدم، الاسم الكامل، أو الدور..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs p-3 pr-10 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-black bg-white px-1.5 py-0.5 rounded border"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl shadow-xs border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 border-b-2 border-slate-200 text-slate-700">
              <tr>
                <th className="p-4 text-xs font-black">المستخدم</th>
                <th className="p-4 text-xs font-black">اسم الدخول</th>
                <th className="p-4 text-xs font-black">كلمة المرور</th>
                <th className="p-4 text-xs font-black">الدور ونطاق الصلاحيات</th>
                <th className="p-4 text-xs font-black text-center">عدد الصلاحيات</th>
                <th className="p-4 text-xs font-black text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => {
                const isAdmin = user.role === 'admin' || user.role === 'developer' || user.permissions.includes('manage_users');
                const permsCount = user.permissions.length;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                          isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isAdmin ? '👑' : '👤'}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs">{user.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-xs text-slate-800">
                      {user.username}
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {user.password}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isAdmin ? (
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-black flex items-center gap-1">
                            <span>👑</span>
                            <span>مسؤول نظام عام (Admin)</span>
                          </span>
                        ) : (
                          <>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md text-[11px] font-bold">
                              مستخدم مخصص
                            </span>
                            {/* Summary module tags */}
                            {user.permissions.some(p => p.startsWith('access_sales') || p.startsWith('create_sales')) && (
                              <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-200">
                                مبيعات
                              </span>
                            )}
                            {user.permissions.some(p => p.startsWith('access_purchase') || p.startsWith('create_purchase')) && (
                              <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-200">
                                مشتريات
                              </span>
                            )}
                            {user.permissions.some(p => p.startsWith('access_inventory') || p.startsWith('create_product')) && (
                              <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-200">
                                مخازن
                              </span>
                            )}
                            {user.permissions.some(p => p.startsWith('access_manufacturing') || p.startsWith('create_bom')) && (
                              <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-200">
                                تصنيع
                              </span>
                            )}
                            {user.permissions.some(p => p.startsWith('view_reports')) && (
                              <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 rounded text-[10px] font-bold border border-teal-200">
                                تقارير
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        isAdmin
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {isAdmin ? 'الكل (100%)' : `${permsCount} / ${totalPermissionsCount}`}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                        >
                          تعديل الصلاحيات ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteRequest(user.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-black transition-all"
                        >
                          حذف 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddUserModal
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveUser}
          userToEdit={editingUser}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف المستخدم"
        message="هل أنت متأكد من رغبتك في حذف هذا المستخدم من النظام؟ لن يتمكن من تسجيل الدخول بعد الآن."
      />
    </div>
  );
};

export default UsersManagement;
