import React, { useState, useMemo } from 'react';
import type { LogEntry } from '../types.ts';

interface AuditLogProps {
    logs: LogEntry[];
}

const AuditLog: React.FC<AuditLogProps> = ({ logs }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLogs = useMemo(() => {
        const reversedLogs = [...logs].reverse(); // Newest first
        return reversedLogs.filter(log =>
            log.action.includes(searchQuery) ||
            log.userName.includes(searchQuery) ||
            log.id.includes(searchQuery)
        );
    }, [logs, searchQuery]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">سجل الحركات (Audit Log)</h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <input
                    type="text"
                    placeholder="بحث بواسطة المستخدم أو نوع الحركة..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                />
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">التوقيت</th>
                            <th className="p-3">المستخدم</th>
                            <th className="p-3">الحركة</th>
                            <th className="p-3">رقم العملية</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="p-3 text-gray-600" dir="ltr">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="p-3 font-semibold">{log.userName}</td>
                                <td className="p-3">{log.action}</td>
                                <td className="p-3 text-xs text-gray-400">{log.id}</td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr><td colSpan={4} className="text-center p-6 text-gray-500">لا توجد سجلات</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AuditLog;
