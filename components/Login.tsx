import React, { useState, useEffect } from 'react';
import type { User } from '../types.ts';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [username, setUsername] = useState(users[0]?.username || 'admin');
  const [password, setPassword] = useState(users.find(u => u.username === username)?.password || '123');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log("Login component rendered with users:", users);
    // Update password when username changes if it matches one of our users
    const user = users.find(u => u.username === username);
    if (user) setPassword(user.password);
  }, [username, users]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('خطأ في اسم المستخدم أو كلمة المرور');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 font-['Cairo']">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 w-full max-w-md transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="bg-blue-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/50 rotate-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MediaHive ERP</h1>
          <p className="text-blue-200/70 text-sm">نظام إدارة الموارد المتكامل</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-blue-100 block mr-1">اختر المستخدم</label>
            <div className="relative group">
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all cursor-pointer"
                value={username}
                onChange={e => setUsername(e.target.value)}
              >
                {users.map(u => (
                  <option key={u.id} value={u.username} className="bg-slate-800 text-white">
                    {u.fullName} ({u.role})
                  </option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-blue-100 block mr-1">كلمة المرور</label>
            <input
              type="password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm px-4 py-2 rounded-lg text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 active:scale-[0.98] mt-4"
          >
            تسجيل الدخول
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} MediaHive - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
