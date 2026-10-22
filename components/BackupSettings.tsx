import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api.ts';
import { showNotification } from '../services/notificationService.ts';

interface BackupSettingsProps {
}

const BackupSettings: React.FC<BackupSettingsProps> = () => {
    // --- State for Google Sheets Backup ---
    const [googleSheetId, setGoogleSheetId] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- State for SQLite Database Snapshots ---
    const [snapshots, setSnapshots] = useState<{ name: string; size: number; mtime: string }[]>([]);
    const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    const [snapshotMsg, setSnapshotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // --- Load Initial Data ---
    useEffect(() => {
        const savedSheetId = localStorage.getItem('googleSheetId');
        const savedClientId = localStorage.getItem('googleClientId');
        if (savedSheetId) setGoogleSheetId(savedSheetId);
        if (savedClientId) setGoogleClientId(savedClientId);

        // Load Google Identity Services Script dynamically
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed, though usually fine to keep script
            // document.body.removeChild(script);
        }
        fetchSnapshots();
    }, []);

    const handleSaveConfig = () => {
        localStorage.setItem('googleSheetId', googleSheetId);
        localStorage.setItem('googleClientId', googleClientId);
        alert('تم حفظ إعدادات الربط بنجاح');
    };

    // --- SQLite Database Snapshot Handlers ---
    const fetchSnapshots = async () => {
        setIsLoadingSnapshots(true);
        try {
            const res = await apiService.request('/api/backup/list-snapshots');
            if (res && res.snapshots) {
                setSnapshots(res.snapshots);
            }
        } catch (err: any) {
            console.error('Error fetching snapshots:', err);
        } finally {
            setIsLoadingSnapshots(false);
        }
    };

    const handleCreateSnapshot = async () => {
        setIsCreatingSnapshot(true);
        setSnapshotMsg(null);
        try {
            const res = await apiService.request('/api/backup/create-snapshot', { method: 'POST' });
            if (res && res.success) {
                const snapName = res.filename || res.snapshot;
                setSnapshotMsg({ type: 'success', text: `تم إنشاء نقطة استعادة جديدة بنجاح: ${snapName}` });
                showNotification({
                    type: 'success',
                    title: 'تم إنشاء نقطة استعادة لقاعدة البيانات',
                    message: `تم حفظ النسخة بنجاح: ${snapName}`,
                    sound: 'success',
                    category: 'system'
                });
                fetchSnapshots();
            } else {
                setSnapshotMsg({ type: 'error', text: res?.error || 'فشل إنشاء نقطة الاستعادة' });
            }
        } catch (err: any) {
            setSnapshotMsg({ type: 'error', text: err.message || 'حدث خطأ في الاتصال بالسيرفر' });
        } finally {
            setIsCreatingSnapshot(false);
        }
    };

    const handleDownloadDb = () => {
        const baseUrl = apiService.baseUrl || `http://${window.location.hostname || 'localhost'}:4000`;
        window.open(`${baseUrl}/api/backup/download-db`, '_blank');
    };

    const handleRestoreSnapshot = async (filename: string) => {
        const confirmed = window.confirm(
            `⚠️ تحذير مهم:\nهل أنت متأكد من استعادة نقطة البيانات:\n(${filename})؟\n\nسيتم استبدال قاعدة البيانات الحالية بهذه النسخة وسيتم حفظ نسخة تراجع تلقائية قبل الاستعادة.`
        );
        if (!confirmed) return;

        try {
            const res = await apiService.request('/api/backup/restore-snapshot', {
                method: 'POST',
                body: JSON.stringify({ filename })
            });
            if (res && res.success) {
                alert('✅ تم استعادة قاعدة البيانات بنجاح! سيتم إعادة تحميل الصفحة الآن لتطبيق البيانات.');
                window.location.reload();
            } else {
                alert(`❌ فشل في الاستعادة: ${res?.error || 'حدث خطأ'}`);
            }
        } catch (err: any) {
            alert(`❌ خطأ أثناء الاستعادة: ${err.message}`);
        }
    };

    // --- Method 1: Local Backup (JSON) ---
    const handleLocalBackup = () => {
        const dataToBackup: Record<string, any> = {};
        const keys = [
            'companyInfo', 'products', 'customers', 'suppliers',
            'salesInvoices', 'purchaseInvoices', 'expenses',
            'customerPayments', 'supplierPayments', 'partners',
            'partnerTransactions', 'accounts', 'users',
            'journalEntries', 'logs', 'themeSettings', 'quotations'
        ];

        keys.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                try {
                    dataToBackup[key] = JSON.parse(item);
                } catch (e) {
                    dataToBackup[key] = item;
                }
            }
        });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToBackup));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        const date = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `ERP_Backup_Local_${date}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // --- Method 2: Google Sheets Backup (OAuth Flow) ---

    // Helper: Convert array of objects to array of arrays (Rows)
    const transformToRows = (data: any[], headers: string[]) => {
        const rows = data.map(item => {
            return headers.map(header => {
                const val = item[header];
                if (typeof val === 'object' && val !== null) return JSON.stringify(val);
                return val !== undefined && val !== null ? String(val) : '';
            });
        });
        return [headers, ...rows]; // Prepend headers
    };

    const sendToSheet = async (accessToken: string, sheetTitle: string, data: any[], headers: string[]) => {
        if (!googleSheetId) throw new Error("معرف المستند (Sheet ID) غير موجود");

        const values = transformToRows(data, headers);

        // We append to the sheet. 
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/${sheetTitle}!A1:append?valueInputOption=USER_ENTERED`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ values })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'فشل في رفع البيانات');
        }
    };

    const executeBackupLogic = async (accessToken: string) => {
        setIsBackupLoading(true);
        setBackupStatus('جاري رفع النسخة الاحتياطية إلى Google Sheets...');
        try {
            // Define mapping of local storage keys to Sheet titles and headers
            const backupPlan = [
                { key: 'products', title: 'المنتجات', headers: ['id', 'name', 'code', 'category', 'price', 'costPrice', 'quantity', 'reorderPoint', 'unit'] },
                { key: 'customers', title: 'العملاء', headers: ['id', 'name', 'phone', 'address', 'openingBalance'] },
                { key: 'salesInvoices', title: 'فواتير المبيعات', headers: ['id', 'customerId', 'customerName', 'date', 'total', 'status'] },
            ];

            for (const plan of backupPlan) {
                const dataStr = localStorage.getItem(plan.key);
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    if (data && data.length > 0) {
                        await sendToSheet(accessToken, plan.title, data, plan.headers);
                    }
                }
            }
            setBackupStatus('✅ تمت عملية النسخ الاحتياطي بنجاح');
        } catch (error: any) {
            console.error(error);
            setBackupStatus(`❌ خطأ: ${error.message}`);
        } finally {
            setIsBackupLoading(false);
        }
    };

    const handleGoogleBackup = () => {
        if (!googleSheetId || !googleClientId) {
            setBackupStatus('يرجى حفظ إعدادات الربط أولاً.');
            return;
        }

        // Check if google global object is available
        // @ts-ignore
        if (typeof google === 'undefined' || !google.accounts) {
            setBackupStatus('خطأ: مكتبة Google لم يتم تحميلها بعد. تأكد من الاتصال بالإنترنت.');
            return;
        }

        // @ts-ignore
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    // Token received, proceed with backup
                    executeBackupLogic(tokenResponse.access_token);
                } else {
                    setBackupStatus('تم إلغاء العملية أو حدث خطأ في المصادقة.');
                }
            },
        });

        // Request token (triggers popup)
        tokenClient.requestAccessToken();
    };

    // --- Restore Logic ---
    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const jsonData = JSON.parse(event.target?.result as string);
                if (typeof jsonData !== 'object') throw new Error('Invalid backup file format');

                const tablesMapping: Record<string, string> = {
                    'products': 'products',
                    'customers': 'customers',
                    'suppliers': 'suppliers',
                    'salesInvoices': 'sales_invoices',
                    'purchaseInvoices': 'purchase_invoices',
                    'customerPayments': 'customer_payments',
                    'supplierPayments': 'supplier_payments',
                    'expenses': 'expenses',
                    'journalEntries': 'journal_entries',
                    'logs': 'logs',
                    'quotations': 'quotations',
                    'partners': 'partners',
                    'partnerTransactions': 'partner_transactions',
                    'accounts': 'accounts'
                };

                const syncPayload: Record<string, any[]> = {};

                Object.keys(jsonData).forEach(key => {
                    const value = jsonData[key];
                    const storedValue = (typeof value === 'object' && value !== null)
                        ? JSON.stringify(value)
                        : String(value);

                    localStorage.setItem(key, storedValue);

                    // Add to sync payload if it's a mapped table array
                    if (tablesMapping[key] && Array.isArray(value)) {
                        syncPayload[tablesMapping[key]] = value;
                    }
                });

                // Push all data to server via full sync POST /api/sync
                if (Object.keys(syncPayload).length > 0) {
                    await apiService.request('/api/sync', {
                        method: 'POST',
                        body: JSON.stringify(syncPayload)
                    });
                }

                // CRITICAL: Reload immediately without alert to avoid Race Condition
                window.location.reload();
            } catch (error) {
                console.error('Error restoring data:', error);
                alert('حدث خطأ أثناء استعادة البيانات. تأكد من أن الملف سليم وأن السيرفر يعمل.');
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">النسخ الاحتياطي والاستعادة</h1>

            {/* Backup & Restore Section */}
            <div className="bg-white p-8 rounded-xl shadow-md max-w-3xl mx-auto mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-6 pb-2 border-b flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    خيارات النسخ الاحتياطي
                </h2>

                <div className="grid grid-cols-1 gap-8">
                    {/* Local Backup */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 text-gray-700">1. النسخ الاحتياطي المحلي (ملف)</h3>
                        <p className="text-sm text-gray-500 mb-4">حفظ كافة بيانات النظام على جهازك كملف JSON آمن.</p>

                        <div className="space-y-3">
                            <button
                                onClick={handleLocalBackup}
                                className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                تنزيل نسخة احتياطية
                            </button>

                            <div className="relative">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                                <button
                                    onClick={handleRestoreClick}
                                    className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    استعادة من ملف
                                </button>
                            </div>
                        </div>
                    </div>


                    {/* SQLite Database Snapshots & Live Restore Points */}
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-300">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-emerald-900 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                                3. قاعدة البيانات المركزية ونقاط الاستعادة الفورية (SQLite Snapshots)
                            </h3>
                            <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded-full">
                                ميزة احترافية فائقة السرعة
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                            تتيح لك هذه الميزة تحميل ملف قاعدة بيانات النظام الفعلي (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900">.db</code>) مباشرة، أو إنشاء نقاط استعادة محفوظة على السيرفر والرجوع لأي منها بضغطة زر عند الحاجة.
                        </p>

                        <div className="flex flex-wrap gap-3 mb-6">
                            <button
                                onClick={handleDownloadDb}
                                className="flex-1 min-w-[200px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                تنزيل ملف قاعدة البيانات (.db)
                            </button>

                            <button
                                onClick={handleCreateSnapshot}
                                disabled={isCreatingSnapshot}
                                className={`flex-1 min-w-[200px] text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all ${
                                    isCreatingSnapshot ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {isCreatingSnapshot ? 'جاري إنشاء النقطة...' : 'إنشاء نقطة استعادة جديدة الآن'}
                            </button>

                            <button
                                onClick={fetchSnapshots}
                                disabled={isLoadingSnapshots}
                                title="تحديث قائمة نقاط الاستعادة"
                                className="bg-white hover:bg-gray-100 text-gray-700 font-bold p-2.5 rounded-lg border border-gray-300 shadow-sm flex items-center justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-600 ${isLoadingSnapshots ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>

                        {snapshotMsg && (
                            <div className={`mb-4 p-3 rounded-lg text-sm font-bold ${
                                snapshotMsg.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                            }`}>
                                {snapshotMsg.text}
                            </div>
                        )}

                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-bold text-sm text-gray-700 flex justify-between items-center">
                                <span>نقاط الاستعادة المحفوظة على السيرفر ({snapshots.length})</span>
                                {isLoadingSnapshots && <span className="text-xs text-gray-500 font-normal">جاري التحميل...</span>}
                            </div>

                            {snapshots.length === 0 ? (
                                <div className="p-6 text-center text-sm text-gray-500">
                                    لا توجد نقاط استعادة حتى الآن. اضغط على زر "إنشاء نقطة استعادة جديدة الآن" لإنشاء نقطة أولى.
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                            <tr>
                                                <th className="p-2.5">اسم النقطة</th>
                                                <th className="p-2.5">التاريخ والوقت</th>
                                                <th className="p-2.5">الحجم</th>
                                                <th className="p-2.5 text-center">الإجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {snapshots.map((snap) => (
                                                <tr key={snap.name} className="hover:bg-amber-50/50 transition-colors">
                                                    <td className="p-2.5 font-mono text-gray-800 font-medium" dir="ltr">
                                                        {snap.name}
                                                    </td>
                                                    <td className="p-2.5 text-gray-600">
                                                        {new Date(snap.mtime).toLocaleString('ar-EG')}
                                                    </td>
                                                    <td className="p-2.5 text-gray-600 font-mono" dir="ltr">
                                                        {(snap.size / 1024).toFixed(1)} KB
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        <button
                                                            onClick={() => handleRestoreSnapshot(snap.name)}
                                                            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1 mx-auto"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                            استعادة هذه النسخة
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <h3 className="font-bold text-lg mb-4 text-blue-800 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            2. النسخ السحابي (Google Sheets)
                        </h3>
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">معرف المستند (Sheet ID)</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded text-xs text-left ltr"
                                    placeholder="e.g. 1BxiMVs0XRA5nFMd..."
                                    value={googleSheetId}
                                    onChange={(e) => setGoogleSheetId(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">معرف العميل (Client ID)</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded text-xs text-left ltr"
                                    placeholder="e.g. 123456789-abc...apps.googleusercontent.com"
                                    value={googleClientId}
                                    onChange={(e) => setGoogleClientId(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    يجب إدخال Client ID الخاص بمشروعك في Google Cloud للسماح بالوصول.
                                </p>
                            </div>
                            <button onClick={handleSaveConfig} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 w-fit">
                                حفظ الإعدادات
                            </button>
                        </div>

                        <button
                            onClick={handleGoogleBackup}
                            disabled={isBackupLoading}
                            className={`w-full text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all ${isBackupLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {isBackupLoading ? (
                                <span>جاري المصادقة والنسخ...</span>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                                        <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                                    </svg>
                                    بدء النسخ الاحتياطي (مصادقة + نسخ)
                                </>
                            )}
                        </button>
                        {backupStatus && (
                            <div className={`mt-3 text-xs font-bold text-center p-2 rounded ${backupStatus.includes('خطأ') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {backupStatus}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupSettings;
