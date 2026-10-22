import React, { useState, useEffect } from 'react';
import { AppNotification } from '../services/notificationService';

interface ToastItem extends AppNotification {
    animatingOut?: boolean;
}

const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const handleNewNotification = (e: any) => {
            const notif: AppNotification = e.detail?.notification;
            if (!notif) return;

            setToasts(prev => {
                // Keep max 4 toasts
                const next = [{ ...notif }, ...prev.slice(0, 3)];
                return next;
            });

            // Auto dismiss after 4.5 seconds
            setTimeout(() => {
                removeToast(notif.id);
            }, 4500);
        };

        window.addEventListener('erp-notification', handleNewNotification);
        return () => {
            window.removeEventListener('erp-notification', handleNewNotification);
        };
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    if (toasts.length === 0) return null;

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'cash':
            case 'success':
                return {
                    bg: 'bg-emerald-900/95 text-white border-emerald-500/50 shadow-emerald-950/30',
                    iconBg: 'bg-emerald-500/20 text-emerald-300',
                    icon: '💵',
                    accent: 'bg-emerald-400'
                };
            case 'warning':
                return {
                    bg: 'bg-amber-900/95 text-white border-amber-500/50 shadow-amber-950/30',
                    iconBg: 'bg-amber-500/20 text-amber-300',
                    icon: '⚠️',
                    accent: 'bg-amber-400'
                };
            case 'error':
                return {
                    bg: 'bg-rose-900/95 text-white border-rose-500/50 shadow-rose-950/30',
                    iconBg: 'bg-rose-500/20 text-rose-300',
                    icon: '🚨',
                    accent: 'bg-rose-400'
                };
            default:
                return {
                    bg: 'bg-slate-900/95 text-white border-blue-500/50 shadow-slate-950/30',
                    iconBg: 'bg-blue-500/20 text-blue-300',
                    icon: 'ℹ️',
                    accent: 'bg-blue-400'
                };
        }
    };

    return (
        <aside
            aria-live="polite"
            aria-label="التنبيهات الفورية"
            className="fixed top-5 left-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
            dir="rtl"
        >
            {toasts.map(toast => {
                const style = getTypeStyles(toast.type);
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto transform transition-all duration-300 ease-out translate-y-0 opacity-100 flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-xl ${style.bg}`}
                    >
                        <div className={`p-2 rounded-lg text-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
                            {toast.type === 'cash' ? '💰' : toast.type === 'success' ? '✅' : style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-sm tracking-tight truncate">{toast.title}</h4>
                                <span className="text-[10px] text-gray-400 font-mono shrink-0">الآن</span>
                            </div>
                            <p className="text-xs text-gray-200 mt-0.5 leading-relaxed break-words">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors shrink-0"
                            title="إغلاق"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </aside>
    );
};

export default ToastContainer;
