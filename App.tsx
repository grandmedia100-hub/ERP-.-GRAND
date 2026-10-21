import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Page, Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, CustomerPayment, SupplierPayment, Account, User, JournalEntry, JournalEntryLine, LogEntry, ThemeSettings, Quotation, TreasuryTransfer, StockTransaction, Warehouse, FixedAsset, DepreciationEntry, BillOfMaterials, ProductionOrder, ProductionPlan, ModulePostingSettings, PurchaseRequest, PurchaseOrder } from './types.ts';

// Component Imports
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import Sales from './components/Sales.tsx';
import Purchases from './components/Purchases.tsx';
import PurchaseRequests from './components/PurchaseRequests.tsx';
import PurchaseOrders from './components/PurchaseOrders.tsx';
import Inventory from './components/Inventory.tsx';
import WarehouseModule from './components/WarehouseModule.tsx';
import JournalEntries from './components/JournalEntries.tsx';
import Customers from './components/Customers.tsx';
import Suppliers from './components/Suppliers.tsx';
import Reports from './components/Reports.tsx';
import Quotations from './components/Quotations.tsx';
import Treasury from './components/Treasury.tsx';
import Settings from './components/Settings.tsx';
import BackupSettings from './components/BackupSettings.tsx';
import ChartOfAccounts from './components/ChartOfAccounts.tsx';
import Login from './components/Login.tsx';
import UsersManagement from './components/UsersManagement.tsx';
import AuditLog from './components/AuditLog.tsx';
import FixedAssets from './components/FixedAssets.tsx';
import Manufacturing from './components/Manufacturing.tsx';
import AccountingSettingsPage from './components/AccountingSettingsPage.tsx';

// Data Imports
import * as initialData from './data.ts';
import apiService from './services/api.ts';

// --- Utility Hooks (Outside Component) ---

function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay);
        return () => clearTimeout(handler);
    }, [...(deps || []), delay]);
}

const useStickyState = <T,>(defaultValue: T, key: string): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [value, setValue] = useState<T>(() => {
        try {
            const stickyValue = window.localStorage.getItem(key);
            return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            const stickyValue = window.localStorage.getItem(key);
            setValue(stickyValue !== null ? JSON.parse(stickyValue) : defaultValue);
        } catch {
            setValue(defaultValue);
        }
    }, [key]);

    useDebouncedEffect(() => {
        window.localStorage.setItem(key, JSON.stringify(value));
    }, [key, value], 500);

    return [value, setValue];
};

// --- Real-time Sync Hook ---
const useServerState = <T extends { id?: string; branchId?: string }>(
    defaultValue: T[],
    key: string,
    tableName: string,
    branchId: string = 'main'
): [T[], React.Dispatch<React.SetStateAction<T[]>>] => {
    const [data, setData] = useState<T[]>(() => {
        try {
            const cached = window.localStorage.getItem(key);
            return cached ? JSON.parse(cached) : defaultValue;
        } catch { return defaultValue; }
    });
    
    const dataRef = useRef(data);
    dataRef.current = data;

    useEffect(() => {
        try {
            const cached = window.localStorage.getItem(key);
            setData(cached ? JSON.parse(cached) : defaultValue);
        } catch {
            setData(defaultValue);
        }
    }, [key]);

    useEffect(() => {
        let isSubscribed = true;
        const fetchServer = () => {
            const branchQuery = branchId ? `?branch=${encodeURIComponent(branchId)}` : '';
            apiService.request('/api/' + tableName + branchQuery).then((serverData) => {
                if (!isSubscribed) return;
                const localStr = JSON.stringify(dataRef.current);
                const serverStr = JSON.stringify(serverData);
                if (localStr !== serverStr) {
                    setData(serverData);
                    window.localStorage.setItem(key, serverStr);
                }
            }).catch(() => {});
        };

        fetchServer();
        const interval = setInterval(fetchServer, 3000);
        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [key, tableName, branchId]);

    const setServerData = useCallback((action: any) => {
        setData(prev => {
            const next = typeof action === 'function' ? action(prev) : action;
            window.localStorage.setItem(key, JSON.stringify(next));

            const prevMap = new Map(prev.filter((i: any) => i && i.id).map((i: any) => [i.id, i]));
            const nextMap = new Map(next.filter((i: any) => i && i.id).map((i: any) => [i.id, i]));
            const branchQuery = branchId ? `?branch=${encodeURIComponent(branchId)}` : '';

            next.forEach((item: any) => {
                if (!item || !item.id) return;
                const oldItem = prevMap.get(item.id);
                const payload = { ...item, branchId: item.branchId || branchId };
                if (!oldItem) {
                    apiService.request('/api/' + tableName + branchQuery, { method: 'POST', body: JSON.stringify(payload) }).catch(console.error);
                } else if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
                    apiService.request('/api/' + tableName + '/' + item.id + branchQuery, { method: 'PUT', body: JSON.stringify(payload) }).catch(console.error);
                }
            });

            prev.forEach((item: any) => {
                if (item && item.id && !nextMap.has(item.id)) {
                    apiService.request('/api/' + tableName + '/' + item.id + branchQuery, { method: 'DELETE' }).catch(console.error);
                }
            });

            return next;
        });
    }, [key, tableName, branchId]);

    return [data, setServerData as React.Dispatch<React.SetStateAction<T[]>>];
};

// --- KV Server State Hook (for complex arrays stored as JSON blobs) ---
const useKVServerState = <T,>(defaultValue: T[], kvKey: string): [T[], React.Dispatch<React.SetStateAction<T[]>>] => {
    const [data, setData] = useState<T[]>(() => {
        try {
            const cached = window.localStorage.getItem('kv_' + kvKey);
            return cached ? JSON.parse(cached) : defaultValue;
        } catch { return defaultValue; }
    });

    const dataRef = useRef(data);
    dataRef.current = data;

    useEffect(() => {
        try {
            const cached = window.localStorage.getItem('kv_' + kvKey);
            setData(cached ? JSON.parse(cached) : defaultValue);
        } catch {
            setData(defaultValue);
        }
    }, [kvKey]);

    useEffect(() => {
        let isSubscribed = true;
        const fetchServer = () => {
            apiService.request('/api/kv/' + kvKey).then((serverData: any) => {
                if (!isSubscribed) return;
                const arr = Array.isArray(serverData) ? serverData : defaultValue;
                const localStr = JSON.stringify(dataRef.current);
                const serverStr = JSON.stringify(arr);
                if (localStr !== serverStr) {
                    setData(arr);
                    window.localStorage.setItem('kv_' + kvKey, serverStr);
                }
            }).catch(() => {});
        };
        fetchServer();
        const interval = setInterval(fetchServer, 3000);
        return () => { isSubscribed = false; clearInterval(interval); };
    }, [kvKey]);

    const setKVData = useCallback((action: any) => {
        setData(prev => {
            const next = typeof action === 'function' ? action(prev) : action;
            window.localStorage.setItem('kv_' + kvKey, JSON.stringify(next));
            apiService.request('/api/kv/' + kvKey, {
                method: 'POST',
                body: JSON.stringify(next)
            }).catch(console.error);
            return next;
        });
    }, [kvKey]);

    return [data, setKVData as React.Dispatch<React.SetStateAction<T[]>>];
};

// --- Helpers ---
function checkAndFixDuplicates(invoices: any[]): any[] {
    if (!Array.isArray(invoices)) return [];
    const groups = new Map<string, any[]>();
    invoices.forEach(inv => {
        if (!inv || !inv.id) return;
        if (!groups.has(inv.id)) groups.set(inv.id, []);
        groups.get(inv.id)!.push(inv);
    });

    let hasDuplicates = false;
    const fixedInvoices: any[] = [];
    groups.forEach((group, id) => {
        if (group.length > 1) {
            hasDuplicates = true;
            const existingIds = new Set(invoices.map(inv => inv.id));
            group.forEach((inv, idx) => {
                if (idx === 0) {
                    fixedInvoices.push(inv);
                } else {
                    let newId = id + '_dup' + idx;
                    while (existingIds.has(newId)) newId += '_';
                    existingIds.add(newId);
                    fixedInvoices.push({ ...inv, id: newId });
                }
            });
        } else {
            fixedInvoices.push(group[0]);
        }
    });

    if (hasDuplicates) {
        console.warn('⚠️ تم اكتشاف وتصحيح فواتير مكررة.');
    }
    return fixedInvoices;
}

const PAGE_TITLES: Record<Page, string> = {
    dashboard: 'لوحة التحكم الرئيسية',
    sales: 'فواتير ومرتجعات المبيعات',
    quotations: 'عروض الأسعار',
    purchaseRequests: 'طلبات الشراء (PR)',
    purchaseOrders: 'أوامر الشراء (PO)',
    purchases: 'فواتير المشتريات والموردين',
    inventory: 'إدارة المخزون والأصناف',
    warehouse: 'إدارة المستودعات والجرد',
    manufacturing: 'أوامر التصنيع والتشغيل',
    customers: 'حسابات العملاء والتحصيلات',
    suppliers: 'حسابات الموردين والمدفوعات',
    treasury: 'الخزينة والمصارف',
    reports: 'التقارير والقوائم المالية',
    journalEntries: 'القيود اليومية',
    chartOfAccounts: 'دليل الحسابات',
    fixedAssets: 'الأصول الثابتة والإهلاك',
    settings: 'الإعدادات العامة والشركة',
    accountingSettings: 'إعدادات التوجيه المحاسبي',
    users: 'المستخدمين والصلاحيات',
    backup: 'النسخ الاحتياطي والأمان',
    auditLog: 'سجل العمليات والرقابة',
};

// --- Main Component ---
const App: React.FC = () => {
    // 1. All State Definitions
    const getInitialPage = (): Page => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = urlParams.get('page') as Page;
            if (pageParam) return pageParam;
            const hash = window.location.hash.replace('#', '') as Page;
            if (hash) return hash;
        } catch (e) {
            // fallback
        }
        return 'dashboard';
    };

    const [activePage, setActivePage] = useState<Page>(getInitialPage);

    useEffect(() => {
        const pageTitle = PAGE_TITLES[activePage] || 'MediaHive ERP';
        document.title = `${pageTitle} | MediaHive ERP`;
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('page', activePage);
            window.history.replaceState({}, '', url.toString());
        } catch (e) {}
    }, [activePage]);

    useEffect(() => {
        const handlePopState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const page = (urlParams.get('page') || 'dashboard') as Page;
            setActivePage(page);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Multi-Branch State (Global)
    const [branches, setBranches] = useStickyState<{id: string, name: string}[]>([
        { id: 'main', name: 'جراند ميديا' },
        { id: 'factory', name: 'المصنع' }
    ], 'branches');
    const [currentBranchId, setCurrentBranchId] = useStickyState<string>('main', 'currentBranchId');

    // Auto-normalize branches (e.g. rename 'الفرع الرئيسي' to 'جراند ميديا', add 'المصنع' if missing)
    useEffect(() => {
        let hasChanges = false;
        let updatedBranches = branches.map(b => {
            if (b.id === 'main' && b.name === 'الفرع الرئيسي') {
                hasChanges = true;
                return { ...b, name: 'جراند ميديا' };
            }
            return b;
        });
        if (!updatedBranches.some(b => b.id === 'factory')) {
            updatedBranches.push({ id: 'factory', name: 'المصنع' });
            hasChanges = true;
        }
        if (hasChanges) {
            setBranches(updatedBranches);
        }
    }, []);

    // Helper for branch-specific keys
    const branchKey = (key: string) => currentBranchId === 'main' ? key : `${currentBranchId}_${key}`;

    // Data States (Branch Specific)
    const [products, setProducts] = useServerState<any>(initialData.products || [], branchKey('products'), 'products', currentBranchId);
    const [customers, setCustomers] = useServerState<any>(initialData.customers || [], branchKey('customers'), 'customers', currentBranchId);
    const [suppliers, setSuppliers] = useServerState<any>(initialData.suppliers || [], branchKey('suppliers'), 'suppliers', currentBranchId);
    const [salesInvoices, setSalesInvoices] = useServerState<any>(initialData.salesInvoices || [], branchKey('salesInvoices'), 'sales_invoices', currentBranchId);
    const [purchaseInvoices, setPurchaseInvoices] = useServerState<any>(initialData.purchaseInvoices || [], branchKey('purchaseInvoices'), 'purchase_invoices', currentBranchId);
    const [customerPayments, setCustomerPayments] = useServerState<any>(initialData.customerPayments || [], branchKey('customerPayments'), 'customer_payments', currentBranchId);
    const [supplierPayments, setSupplierPayments] = useServerState<any>(initialData.supplierPayments || [], branchKey('supplierPayments'), 'supplier_payments', currentBranchId);
    const [accounts, setAccounts] = useServerState<any>(initialData.accounts || [], branchKey('accounts'), 'accounts', currentBranchId);
    const [journalEntries, setJournalEntries] = useServerState<any>(initialData.journalEntries || [], branchKey('journalEntries'), 'journal_entries', currentBranchId);
    const [treasuryTransfers, setTreasuryTransfers] = useServerState<TreasuryTransfer>(initialData.treasuryTransfers || [], branchKey('treasuryTransfers'), 'treasury_transfers', currentBranchId);
    const [quotations, setQuotations] = useServerState<any>(initialData.quotations || [], branchKey('quotations'), 'quotations', currentBranchId);
    const [stockTransactions, setStockTransactions] = useKVServerState<StockTransaction>([], branchKey('stockTransactions'));
    const [warehouses, setWarehouses] = useKVServerState<Warehouse>(initialData.warehouses || [], branchKey('warehouses'));
    const [fixedAssets, setFixedAssets] = useKVServerState<FixedAsset>([], branchKey('fixedAssets'));
    const [depreciationEntries, setDepreciationEntries] = useKVServerState<DepreciationEntry>([], branchKey('depreciationEntries'));
    const [billsOfMaterials, setBillsOfMaterials] = useKVServerState<BillOfMaterials>([], branchKey('billsOfMaterials'));
    const [productionOrders, setProductionOrders] = useKVServerState<ProductionOrder>([], branchKey('productionOrders'));
    const [productionPlans, setProductionPlans] = useKVServerState<ProductionPlan>([], branchKey('productionPlans'));
    const [purchaseRequests, setPurchaseRequests] = useKVServerState<PurchaseRequest>([], branchKey('purchaseRequests'));
    const [purchaseOrders, setPurchaseOrders] = useKVServerState<PurchaseOrder>([], branchKey('purchaseOrders'));
    const [partners, setPartners] = useServerState<any>(initialData.partners || [], branchKey('partners'), 'partners', currentBranchId);
    const [partnerTransactions, setPartnerTransactions] = useServerState<any>(initialData.partnerTransactions || [], branchKey('partnerTransactions'), 'partner_transactions', currentBranchId);
    const [expenses, setExpenses] = useServerState<any>(initialData.expenses || [], branchKey('expenses'), 'expenses', currentBranchId);

    // Auto-seed accounts for new branch if empty
    useEffect(() => {
        if (accounts.length === 0 && initialData.accounts && initialData.accounts.length > 0) {
            setAccounts(initialData.accounts.map(a => ({ ...a, branchId: currentBranchId })));
        }
    }, [currentBranchId, accounts.length]);

    // Global States (Not Branch Specific)
    const [users, setUsers] = useStickyState<User[]>(initialData.users || [], 'users');
    const [logs, setLogs] = useServerState<any>(initialData.logs || [], 'logs', 'logs');
    const [themeSettings, setThemeSettings] = useStickyState<ThemeSettings>({
        uiScale: 75,
        fontFamily: 'Cairo',
        iconSize: 'normal',
        theme: 'default',
        backgroundEnabled: true,
        backgroundOpacity: 90,
        backgroundBlur: 'sm',
        backgroundMode: 'per_page',
        defaultBackgroundUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920',
        pageBackgrounds: {
            dashboard: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920',
            sales: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1920',
            quotations: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=1920',
            purchases: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1920',
            purchaseRequests: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            purchaseOrders: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            manufacturing: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1920',
            inventory: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1920',
            warehouse: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            treasury: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920',
            reports: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1920',
            accountingSettings: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920',
        }
    }, 'themeSettings');

    // Module Accounting Posting Settings
    const [postingSettings, setPostingSettings] = useStickyState<ModulePostingSettings>({}, 'modulePostingSettings');

    const [salesInitialData, setSalesInitialData] = useState<Partial<SalesInvoice> | null>(null);
    const [manufacturingInitialOrder, setManufacturingInitialOrder] = useState<Partial<ProductionOrder> | null>(null);
    const [initialPurchaseOrderData, setInitialPurchaseOrderData] = useState<Partial<PurchaseOrder> | null>(null);
    const [initialPurchaseInvoiceData, setInitialPurchaseInvoiceData] = useState<Partial<PurchaseInvoice> | null>(null);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNewBranchModal, setShowNewBranchModal] = useState(false);
    const [newBranchName, setNewBranchName] = useState('');

    const handleCreateBranch = () => {
        if (!newBranchName.trim()) return;
        const newBranch = { id: `branch_${Date.now()}`, name: newBranchName.trim() };
        setBranches([...branches, newBranch]);
        setCurrentBranchId(newBranch.id);
        setNewBranchName('');
        setShowNewBranchModal(false);
    };

    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const saved = window.localStorage.getItem('currentUser');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });

    // Effects
    useEffect(() => {
        document.documentElement.style.fontSize = `${themeSettings.uiScale}%`;
    }, [themeSettings]);

    useEffect(() => {
        if (currentUser) {
            window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } else {
            window.localStorage.removeItem('currentUser');
        }
    }, [currentUser]);

    // SERVER SYNC LAYER
    useEffect(() => {
        const fixed = checkAndFixDuplicates(salesInvoices);
        const hasChanges = fixed.length !== salesInvoices.length || fixed.some((inv, i) => inv.id !== salesInvoices[i].id);
        if (hasChanges) {
            setSalesInvoices(fixed);
        }
    }, [currentBranchId]);

    // Actions
    const handleClearData = async () => {
        try {
            await apiService.request('/api/clearAll', { method: 'POST' });
        } catch (e) {
            console.error('Server clear error:', e);
        }
        window.localStorage.clear();
        window.location.reload();
    };

    const logAction = useCallback((action: string, details: string) => {
        const newLog: LogEntry = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser?.id || 'system',
            userName: currentUser?.fullName || 'النظام',
            action,
            details,
        };
        setLogs(prev => [newLog, ...prev]);
    }, [currentUser, setLogs]);

    const createJournalEntry = useCallback((arg1: any, arg2?: any, arg3?: any, arg4?: any) => {
        let date = new Date().toISOString().split('T')[0];
        let description = '';
        let lines: JournalEntryLine[] = [];
        let referenceId: string | undefined = undefined;
        let type: any = 'manual';
        let branchId = currentBranchId;

        if (typeof arg1 === 'object' && arg1 !== null && ('lines' in arg1 || 'description' in arg1)) {
            date = arg1.date || date;
            description = arg1.description || '';
            lines = arg1.lines || [];
            referenceId = arg1.referenceId;
            type = arg1.type || arg1.referenceType || 'manual';
            if (arg1.branchId) branchId = arg1.branchId;
        } else {
            description = arg1 || '';
            lines = arg2 || [];
            referenceId = arg3;
            type = arg4 || 'manual';
        }

        const entryId = `JE-${Date.now()}`;
        const newEntry: JournalEntry = {
            id: entryId,
            date,
            description,
            lines,
            referenceId,
            type,
            status: 'posted',
            createdAt: new Date().toISOString(),
            branchId
        };
        setJournalEntries(prev => [...prev, newEntry]);
        return entryId;
    }, [currentBranchId, setJournalEntries]);

    const deleteJournalEntryByReference = useCallback((referenceId: string) => {
        setJournalEntries(prev => prev.filter(e => e.referenceId !== referenceId));
    }, [setJournalEntries]);

    const getBackgroundImage = useCallback((page: Page) => {
        if (themeSettings.backgroundEnabled === false) return '';
        if (themeSettings.backgroundMode === 'unified' && themeSettings.defaultBackgroundUrl) {
            return themeSettings.defaultBackgroundUrl;
        }
        if (themeSettings.pageBackgrounds && themeSettings.pageBackgrounds[page]) {
            return themeSettings.pageBackgrounds[page];
        }
        const defaultMap: Record<string, string> = {
            dashboard: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1920',
            sales: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=1920',
            quotations: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=1920',
            purchases: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=1920',
            purchaseRequests: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            purchaseOrders: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            manufacturing: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1920',
            inventory: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1920',
            warehouse: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920',
            treasury: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920',
            reports: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=1920',
            accountingSettings: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1920',
        };
        return defaultMap[page] || themeSettings.defaultBackgroundUrl || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920';
    }, [themeSettings]);

    const hasPermission = useCallback((permission: string) => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'developer') return true;
        return currentUser.permissions ? currentUser.permissions.includes(permission as any) : false;
    }, [currentUser]);

    const handleConvertQuote = (invoiceData: Partial<SalesInvoice>) => {
        setSalesInitialData(invoiceData);
        setActivePage('sales');
    };

    const handleConvertToWorkOrder = (quote: Quotation) => {
        const initialOrder: Partial<ProductionOrder> = {
            name: `عن عرض سعر #${quote.id}`,
            customerId: quote.customerId,
            customerName: quote.customerName,
            plannedQuantity: 1,
            notes: `مُحول من عرض سعر رقم ${quote.id}`,
        };
        setManufacturingInitialOrder(initialOrder);
        setActivePage('manufacturing');
    };

    const handleConvertPurchaseRequest = (request: PurchaseRequest) => {
        const initialOrder: Partial<PurchaseOrder> = {
            requestId: request.id,
            date: new Date().toISOString().split('T')[0],
            items: request.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                quantity: item.quantity,
                price: item.estimatedUnitPrice || 0,
                total: (item.quantity || 1) * (item.estimatedUnitPrice || 0),
                unit: (item.unit as any) || 'عدد'
            })),
            notes: `مُحول من طلب شراء رقم ${request.id}${request.notes ? ` - ${request.notes}` : ''}`,
        };
        setPurchaseRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'converted' } : r));
        setInitialPurchaseOrderData(initialOrder);
        setActivePage('purchaseOrders');
    };

    const handleConvertPurchaseOrder = (order: PurchaseOrder) => {
        const initialInvoice: Partial<PurchaseInvoice> = {
            supplierId: order.supplierId,
            supplierName: order.supplierName,
            companyName: order.companyName,
            date: new Date().toISOString().split('T')[0],
            items: order.items,
            subTotal: order.subTotal,
            discountValue: order.discountValue,
            discountType: order.discountType,
            total: order.total,
            paymentMethod: 'اجل',
            notes: `عن أمر شراء رقم ${order.id}${order.notes ? ` - ${order.notes}` : ''}`,
            invoiceType: 'purchase',
            status: 'active'
        };
        setPurchaseOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'completed' } : o));
        setInitialPurchaseInvoiceData(initialInvoice);
        setActivePage('purchases');
    };

    // Render Logic
    if (!currentUser) {
        return <Login users={users} onLogin={setCurrentUser} />;
    }

    const renderPageContent = () => {
        if (activePage === 'dashboard' && hasPermission('access_dashboard')) {
            return <Dashboard salesInvoices={salesInvoices} purchaseInvoices={purchaseInvoices} />;
        }
        if (activePage === 'sales' && hasPermission('access_sales')) {
            return <Sales
                invoices={salesInvoices} setInvoices={setSalesInvoices}
                customers={customers} products={products} setProducts={setProducts}
                stockTransactions={stockTransactions} setStockTransactions={setStockTransactions}
                customerPayments={customerPayments}
                createJournalEntry={createJournalEntry} logAction={logAction}
                initialInvoiceData={salesInitialData} onClearInitialData={() => setSalesInitialData(null)}
                currentUser={currentUser}
                deleteJournalEntryByReference={deleteJournalEntryByReference}
                accounts={accounts}
                branches={branches}
                currentBranchId={currentBranchId}
                postingSettings={postingSettings}
            />;
        }
        if (activePage === 'quotations' && hasPermission('access_quotations')) {
            return <Quotations
                quotations={quotations} setQuotations={setQuotations}
                customers={customers} products={products}
                onConvertToInvoice={handleConvertQuote}
                onConvertToWorkOrder={handleConvertToWorkOrder}
            />;
        }
        if (activePage === 'purchaseRequests' && hasPermission('access_purchase_requests')) {
            return <PurchaseRequests
                requests={purchaseRequests}
                setRequests={setPurchaseRequests}
                products={products}
                onConvertToOrder={handleConvertPurchaseRequest}
                onNavigate={(page) => setActivePage(page)}
                logAction={logAction}
            />;
        }
        if (activePage === 'purchaseOrders' && hasPermission('access_purchase_orders')) {
            return <PurchaseOrders
                orders={purchaseOrders}
                setOrders={setPurchaseOrders}
                suppliers={suppliers}
                products={products}
                onConvertToInvoice={handleConvertPurchaseOrder}
                onNavigate={(page) => setActivePage(page)}
                logAction={logAction}
                initialOrderData={initialPurchaseOrderData}
                onClearInitialOrder={() => setInitialPurchaseOrderData(null)}
            />;
        }
        if (activePage === 'purchases' && hasPermission('access_purchases')) {
            return <Purchases
                invoices={purchaseInvoices} setInvoices={setPurchaseInvoices}
                suppliers={suppliers} products={products} setProducts={setProducts}
                stockTransactions={stockTransactions} setStockTransactions={setStockTransactions}
                supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments}
                createJournalEntry={createJournalEntry} logAction={logAction}
                currentUser={currentUser}
                deleteJournalEntryByReference={deleteJournalEntryByReference}
                accounts={accounts} setAccounts={setAccounts}
                currentBranchId={currentBranchId}
                postingSettings={postingSettings}
                initialInvoiceData={initialPurchaseInvoiceData}
                onClearInitialData={() => setInitialPurchaseInvoiceData(null)}
                onNavigate={(page) => setActivePage(page)}
            />;
        }
        if (activePage === 'inventory' && hasPermission('access_inventory')) {
            return <Inventory
                products={products} setProducts={setProducts}
                stockTransactions={stockTransactions} setStockTransactions={setStockTransactions}
                logAction={logAction} currentUser={currentUser}
                warehouses={warehouses} setWarehouses={setWarehouses}
                accounts={accounts}
            />;
        }
        if (activePage === 'warehouse' && hasPermission('access_warehouse')) {
            return <WarehouseModule
                products={products} setProducts={setProducts}
                stockTransactions={stockTransactions} setStockTransactions={setStockTransactions}
                createJournalEntry={createJournalEntry} logAction={logAction}
                warehouses={warehouses} setWarehouses={setWarehouses}
                accounts={accounts}
                postingSettings={postingSettings}
            />;
        }
        if (activePage === 'journalEntries' && hasPermission('access_journal_entries')) {
            return <JournalEntries
                journalEntries={journalEntries} setJournalEntries={setJournalEntries}
                accounts={accounts}
                createJournalEntry={createJournalEntry} logAction={logAction}
            />;
        }
        if (activePage === 'fixedAssets' && hasPermission('access_fixed_assets')) {
            return <FixedAssets
                fixedAssets={fixedAssets} setFixedAssets={setFixedAssets}
                depreciationEntries={depreciationEntries} setDepreciationEntries={setDepreciationEntries}
                createJournalEntry={createJournalEntry} logAction={logAction}
                accounts={accounts}
            />;
        }
        if (activePage === 'manufacturing' && hasPermission('access_manufacturing')) {
            return <Manufacturing
                products={products} setProducts={setProducts}
                warehouses={warehouses}
                billsOfMaterials={billsOfMaterials} setBillsOfMaterials={setBillsOfMaterials}
                productionOrders={productionOrders} setProductionOrders={setProductionOrders}
                productionPlans={productionPlans} setProductionPlans={setProductionPlans}
                stockTransactions={stockTransactions} setStockTransactions={setStockTransactions}
                createJournalEntry={createJournalEntry} logAction={logAction}
                accounts={accounts} customers={customers}
                journalEntries={journalEntries}
                setJournalEntries={setJournalEntries}
                initialOrderData={manufacturingInitialOrder}
                onClearInitialData={() => setManufacturingInitialOrder(null)}
                postingSettings={postingSettings}
            />;
        }
        if (activePage === 'customers' && hasPermission('access_customers')) {
            return <Customers customerList={customers} setCustomerList={setCustomers} salesInvoices={salesInvoices} customerPayments={customerPayments} />;
        }
        if (activePage === 'suppliers' && hasPermission('access_suppliers')) {
            return <Suppliers supplierList={suppliers} setSupplierList={setSuppliers} purchaseInvoices={purchaseInvoices} supplierPayments={supplierPayments} />;
        }
        if (activePage === 'reports' && hasPermission('access_reports')) {
            return <Reports
                currentUser={currentUser}
                salesInvoices={salesInvoices}
                purchaseInvoices={purchaseInvoices}
                customers={customers}
                suppliers={suppliers}
                customerPayments={customerPayments}
                supplierPayments={supplierPayments}
                products={products}
                journalEntries={journalEntries}
                logs={logs}
                accounts={accounts}
                partners={partners}
                partnerTransactions={partnerTransactions}
                expenses={expenses}
            />;
        }
        if (activePage === 'backup' && hasPermission('manage_backup')) {
            return <BackupSettings />;
        }
        if (activePage === 'treasury' && hasPermission('access_treasury')) {
            return <Treasury
                customerPayments={customerPayments} setCustomerPayments={setCustomerPayments}
                supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments}
                customers={customers} suppliers={suppliers}
                createJournalEntry={createJournalEntry as any}
                logAction={logAction}
                currentUser={currentUser}
                deleteJournalEntryByReference={deleteJournalEntryByReference}
                accounts={accounts} setAccounts={setAccounts}
                treasuryTransfers={treasuryTransfers} setTreasuryTransfers={setTreasuryTransfers}
                branches={branches}
                currentBranchId={currentBranchId}
                postingSettings={postingSettings}
            />;
        }
        if (activePage === 'settings' && hasPermission('access_settings')) {
            return <Settings
                onClearData={handleClearData}
                customers={customers} setCustomers={setCustomers}
                suppliers={suppliers} setSuppliers={setSuppliers}
                products={products} setProducts={setProducts}
                partners={partners} setPartners={setPartners}
                customerPayments={customerPayments} setCustomerPayments={setCustomerPayments}
                supplierPayments={supplierPayments} setSupplierPayments={setSupplierPayments}
                onManageUsers={() => setActivePage('users')}
                currentUser={currentUser}
                themeSettings={themeSettings} setThemeSettings={setThemeSettings}
                salesInvoices={salesInvoices} setSalesInvoices={setSalesInvoices}
                purchaseInvoices={purchaseInvoices} setPurchaseInvoices={setPurchaseInvoices}
                journalEntries={journalEntries} setJournalEntries={setJournalEntries}
                accounts={accounts} setAccounts={setAccounts}
                postingSettings={postingSettings} setPostingSettings={setPostingSettings}
            />;
        }
        if (activePage === 'accountingSettings' && (hasPermission('access_settings') || hasPermission('manage_accounting_settings'))) {
            return <AccountingSettingsPage
                accounts={accounts}
                postingSettings={postingSettings}
                setPostingSettings={setPostingSettings}
                onNavigate={(page) => setActivePage(page)}
            />;
        }
        if (activePage === 'chartOfAccounts' && hasPermission('access_chart_of_accounts')) {
            return <ChartOfAccounts
                accounts={accounts}
                setAccounts={setAccounts}
                journalEntries={journalEntries}
                products={products}
                warehouses={warehouses}
            />;
        }
        if (activePage === 'users' && hasPermission('manage_users')) {
            return <UsersManagement users={users} setUsers={setUsers} />;
        }
        if (activePage === 'auditLog' && hasPermission('manage_users')) {
            return <AuditLog logs={logs} />;
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <h2 className="text-xl font-bold">لا تملك صلاحية للوصول إلى هذه الصفحة</h2>
            </div>
        );
    };

    return (
        <div className={`flex h-screen font-sans relative ${themeSettings.fontFamily === 'Tajawal' ? 'font-tajawal' : 'font-cairo'} theme-${themeSettings.theme || 'default'} bg-main text-main transition-colors duration-300`} dir="rtl">
            {themeSettings.backgroundEnabled !== false && getBackgroundImage(activePage) && (
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out pointer-events-none" 
                    style={{ backgroundImage: `url('${getBackgroundImage(activePage)}')` }}
                >
                    <div 
                        className={`absolute inset-0 ${
                            themeSettings.backgroundBlur === 'none' ? '' :
                            themeSettings.backgroundBlur === 'md' ? 'backdrop-blur-md' :
                            themeSettings.backgroundBlur === 'lg' ? 'backdrop-blur-lg' :
                            'backdrop-blur-sm'
                        }`}
                        style={{
                            backgroundColor: 'var(--bg-main)',
                            opacity: (themeSettings.backgroundOpacity !== undefined ? themeSettings.backgroundOpacity : 90) / 100
                        }}
                    ></div>
                </div>
            )}

            <div className="z-10 flex h-full w-full">
                <Sidebar
                    activePage={activePage}
                    setActivePage={setActivePage}
                    currentUser={currentUser}
                    onLogout={() => setCurrentUser(null)}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                />
                <main className="flex-1 p-4 md:p-8 overflow-y-auto relative flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-800">MediaHive ERP</h1>
                            <button
                                onClick={() => window.open(`/?page=${activePage}`, '_blank')}
                                className="bg-white/90 hover:bg-white text-gray-700 hover:text-blue-700 border border-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                                title="فتح هذه الشاشة في نافذة جديدة مستقلة للعمل على أكثر من شاشة في نفس الوقت"
                            >
                                <span className="text-sm">↗️</span>
                                <span className="hidden sm:inline">فتح في نافذة جديدة</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <select 
                                value={currentBranchId}
                                onChange={(e) => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setShowNewBranchModal(true);
                                    } else {
                                        setCurrentBranchId(e.target.value);
                                    }
                                }}
                                className="bg-white border rounded-lg p-2 text-sm shadow-sm"
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                                <option value="ADD_NEW" className="font-bold text-blue-600">+ إضافة فرع جديد</option>
                            </select>
                            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 bg-white rounded-lg shadow text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    </div>
                    {renderPageContent()}
                </main>
            </div>
            
            {showNewBranchModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-gray-800">
                        <h2 className="text-xl font-bold mb-4">إضافة فرع جديد</h2>
                        <input 
                            type="text" 
                            placeholder="اسم الفرع الجديد" 
                            value={newBranchName}
                            onChange={(e) => setNewBranchName(e.target.value)}
                            className="w-full p-2 border rounded-md mb-4 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowNewBranchModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors">إلغاء</button>
                            <button onClick={handleCreateBranch} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-md">حفظ وانتقال</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
