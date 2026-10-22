import React, { useState, useEffect, useRef } from 'react';
import {
    AppNotification,
    getStoredNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications
} from '../services/notificationService';
import { soundEffects } from '../utils/soundEffects';

interface NotificationCenterProps {
    onNavigatePage?: (page: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigatePage }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [filter, setFilter] = useState<'all' | 'sales_treasury' | 'inventory' | 'system'>('all');
    const [soundEnabled, setSoundEnabled] = useState(soundEffects.isEnabled());
    const panelRef = useRef<HTMLDivElement>(null);

    // Load initial
    useEffect(() => {
        setNotifications(getStoredNotifications());

        const handleUpdate = () => {
            setNotifications(getStoredNotifications());
        };

        window.addEventListener('erp-notification', handleUpdate);
        window.addEventListener('erp-notification-updated', handleUpdate);

        return () => {
            window.removeEventListener('erp-notification', handleUpdate);
            window.removeEventListener('erp-notification-updated', handleUpdate);
        };
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleToggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        soundEffects.setEnabled(next);
        if (next) {
            soundEffects.playSuccess();
        }
    };

    const handleTestSound = () => {
        soundEffects.playCash();
    };

    const handleMarkAllRead = () => {
        const updated = markAllAsRead();
        setNotifications(updated);
    };

    const handleClearAll = () => {
        if (window.confirm('هل تريد مسح سجل التنبيهات بالكامل؟')) {
            clearAllNotifications();
            setNotifications([]);
        }
    };

    const handleItemClick = (notif: AppNotification) => {
        if (!notif.read) {
            const updated = markAsRead(notif.id);
            setNotifications(updated);
        }
        if (notif.category === 'sales' && onNavigatePage) {
            onNavigatePage('sales');
            setIsOpen(false);
        } else if (notif.category === 'treasury' && onNavigatePage) {
            onNavigatePage('treasury');
            setIsOpen(false);
        } else if (notif.category === 'inventory' && onNavigatePage) {
            onNavigatePage('inventory');
            setIsOpen(false);
        } else if (notif.category === 'purchases' && onNavigatePage) {
            onNavigatePage('purchases');
            setIsOpen(false);
        } else if (notif.category === 'manufacturing' && onNavigatePage) {
            onNavigatePage('manufacturing');
            setIsOpen(false);
        }
    };

    const filteredList = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'sales_treasury') return n.category === 'sales' || n.category === 'treasury';
        if (filter === 'inventory') return n.category === 'inventory';
        if (filter === 'system') return n.category === 'system' || n.category === 'purchases' || n.category === 'manufacturing';
        return true;
    });

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} د`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `منذ ${hours} س`;
        return new Date(ts).toLocaleDateString('ar-EG');
    };

    return (
        <div className="relative" ref={panelRef} dir="rtl">
            {/* Header Action Buttons */}
            <div className="flex items-center gap-1.5">
                {/* Quick Sound Toggle Button */}
                <button
                    onClick={handleToggleSound}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center ${
                        soundEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                    }`}
                    title={soundEnabled ? 'الأصوات التفاعلية مفعلة (انقر للكتم)' : 'الأصوات مكتومة (انقر للتفعيل)'}
                >
                    {soundEnabled ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    )}
                </button>

                {/* Bell Icon Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 bg-white hover:bg-slate-50 text-gray-700 border border-gray-200 rounded-xl shadow-xs transition-all flex items-center justify-center"
                    title="مركز التنبيهات والإشعارات الحية"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>

                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                            {unreadCount > 9 ? '+9' : unreadCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Notification Drawer / Dropdown */}
            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fadeIn">
                    {/* Header */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔔</span>
                            <div>
                                <h3 className="font-bold text-sm">مركز التنبيهات</h3>
                                <p className="text-[11px] text-slate-400">
                                    {unreadCount > 0 ? `${unreadCount} إشعار جديد غير مقروء` : 'جميع الإشعارات مقروءة'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handleTestSound}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                                title="تجربة الصوت التفاعلي"
                            >
                                <span>تجربة</span>
                                <span>🔊</span>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-gray-100 bg-gray-50/80 px-2 pt-2 gap-1 text-xs font-semibold overflow-x-auto">
                        <button
                            onClick={() => setFilter('all')}
                            className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${
                                filter === 'all'
                                    ? 'border-blue-600 text-blue-700 font-bold'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            الكل ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('sales_treasury')}
                            className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${
                                filter === 'sales_treasury'
                                    ? 'border-blue-600 text-blue-700 font-bold'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            مبيعات وخزينة
                        </button>
                        <button
                            onClick={() => setFilter('inventory')}
                            className={`pb-2 px-3 border-b-2 transition-all whitespace-nowrap ${
                                filter === 'inventory'
                                    ? 'border-blue-600 text-blue-700 font-bold'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            المخزون
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                        {filteredList.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <span className="text-3xl block mb-2">📭</span>
                                <p className="text-xs font-bold text-gray-500">لا توجد تنبيهات حالياً</p>
                                <p className="text-[11px] text-gray-400 mt-1">ستظهر هنا إشعارات الفواتير والتحصيلات وتنبيهات المخزون فور حدوثها</p>
                            </div>
                        ) : (
                            filteredList.map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleItemClick(notif)}
                                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                                        !notif.read ? 'bg-blue-50/40' : ''
                                    }`}
                                >
                                    <div className={`p-2 rounded-xl text-base shrink-0 ${
                                        notif.type === 'cash' || notif.type === 'success'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : notif.type === 'warning'
                                            ? 'bg-amber-100 text-amber-700'
                                            : notif.type === 'error'
                                            ? 'bg-rose-100 text-rose-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {notif.type === 'cash' ? '💵' : notif.type === 'success' ? '✅' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <h4 className={`text-xs truncate ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {notif.title}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                                {formatTime(notif.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed break-words">
                                            {notif.message}
                                        </p>
                                    </div>
                                    {!notif.read && (
                                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                        <button
                            onClick={handleMarkAllRead}
                            disabled={unreadCount === 0}
                            className="text-blue-600 hover:text-blue-800 font-bold disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            تحديد الكل كمقروء
                        </button>
                        <button
                            onClick={handleClearAll}
                            disabled={notifications.length === 0}
                            className="text-gray-500 hover:text-rose-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                            مسح السجل
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
