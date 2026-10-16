import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api.ts';

interface BackupSettingsProps {
}

const BackupSettings: React.FC<BackupSettingsProps> = () => {
    // --- State for Google Sheets Backup ---
    const [googleSheetId, setGoogleSheetId] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, []);

    const handleSaveConfig = () => {
        localStorage.setItem('googleSheetId', googleSheetId);
        localStorage.setItem('googleClientId', googleClientId);
        alert('تم حفظ إعدادات الربط بنجاح');
    }

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

                    {/* Google Sheets Backup */}
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
