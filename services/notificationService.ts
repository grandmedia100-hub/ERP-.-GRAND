// Notification Service for MediaHive ERP
// Provides global event-driven notifications with sound effects and persistent history

import { soundEffects } from '../utils/soundEffects';

export type NotificationType = 'success' | 'cash' | 'warning' | 'error' | 'info';
export type NotificationCategory = 'sales' | 'purchases' | 'treasury' | 'inventory' | 'manufacturing' | 'system';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    category?: NotificationCategory;
    actionUrl?: string;
}

const STORAGE_KEY = 'erp_notifications_history';
const MAX_NOTIFICATIONS = 50;

export function getStoredNotifications(): AppNotification[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function saveStoredNotifications(list: AppNotification[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS)));
    } catch {}
}

export interface ShowNotificationOptions {
    type?: NotificationType;
    title: string;
    message: string;
    sound?: 'success' | 'cash' | 'warning' | 'ding' | 'none';
    category?: NotificationCategory;
    actionUrl?: string;
}

/**
 * Trigger a system notification with sound effect and toast display
 */
export function showNotification(options: ShowNotificationOptions): AppNotification {
    const {
        type = 'info',
        title,
        message,
        sound = type === 'cash' ? 'cash' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'ding',
        category = 'system',
        actionUrl
    } = options;

    // Play appropriate sound effect
    if (sound !== 'none') {
        if (sound === 'cash') {
            soundEffects.playCash();
        } else if (sound === 'success') {
            soundEffects.playSuccess();
        } else if (sound === 'warning') {
            soundEffects.playWarning();
        } else {
            soundEffects.playDing();
        }
    }

    const newNotification: AppNotification = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        category,
        actionUrl
    };

    // Save to history
    const current = getStoredNotifications();
    const updated = [newNotification, ...current].slice(0, MAX_NOTIFICATIONS);
    saveStoredNotifications(updated);

    // Dispatch global event for Toasts and Bell Icon
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-notification', {
            detail: { notification: newNotification, all: updated }
        }));
    }

    return newNotification;
}

export function markAsRead(id: string): AppNotification[] {
    const list = getStoredNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    saveStoredNotifications(list);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-notification-updated', { detail: { all: list } }));
    }
    return list;
}

export function markAllAsRead(): AppNotification[] {
    const list = getStoredNotifications().map(n => ({ ...n, read: true }));
    saveStoredNotifications(list);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-notification-updated', { detail: { all: list } }));
    }
    return list;
}

export function clearAllNotifications(): void {
    saveStoredNotifications([]);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('erp-notification-updated', { detail: { all: [] } }));
    }
}
