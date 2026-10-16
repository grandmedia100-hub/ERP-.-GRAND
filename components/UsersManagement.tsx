import React, { useState } from 'react';
import type { User } from '../types.ts';
import AddUserModal from './AddUserModal.tsx';
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
      // Prevent deleting the last admin or the default admin if needed, 
      // but for simplicity just prevent deleting the only user.
      if (users.length <= 1) {
          alert("لا يمكن حذف المستخدم الوحيد في النظام.");
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

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">إدارة المستخدمين وصلاحيات الدخول</h1>
            <button 
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                إضافة مستخدم
            </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">الاسم الكامل</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المستخدم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">كلمة المرور</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الصلاحيات</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="p-3 text-sm font-bold text-gray-800">{user.fullName}</td>
                                <td className="p-3 text-sm text-gray-600">{user.username}</td>
                                <td className="p-3 text-sm font-mono text-gray-500">{user.password}</td>
                                <td className="p-3 text-sm">
                                    <div className="flex flex-wrap gap-1">
                                        {user.permissions.includes('manage_users') ? (
                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">مسؤول نظام (Admin)</span>
                                        ) : (
                                            <>
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{user.permissions.length} صلاحيات</span>
                                            </>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 text-sm space-x-2 space-x-reverse">
                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:underline">تعديل</button>
                                    <button onClick={() => handleDeleteRequest(user.id)} className="text-red-600 hover:underline">حذف</button>
                                </td>
                            </tr>
                        ))}
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
            title="حذف مستخدم"
            message="هل أنت متأكد من رغبتك في حذف هذا المستخدم؟"
        />
    </div>
  );
};

export default UsersManagement;