import React, { useState, useEffect } from 'react';
import apiService from '../services/api.ts';

interface ConnectionSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({ isOpen, onClose }) => {
    const [serverUrl, setServerUrl] = useState(
        localStorage.getItem('serverUrl') || 'http://localhost:4000'
    );
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Update apiService URL when loaded
        apiService.setServerUrl(serverUrl);
    }, []);

    const handleTest = async () => {
        setIsLoading(true);
        setStatus('');
        try {
            apiService.setServerUrl(serverUrl);
            const result = await apiService.checkHealth();
            setStatus(`✅ ${result.message || 'الخادم يعمل بنجاح'}`);
            localStorage.setItem('serverUrl', serverUrl);
        } catch (error) {
            setStatus('❌ فشل الاتصال بالخادم - تأكد من تشغيل الخادم وعنوان IP صحيح');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        apiService.setServerUrl(serverUrl);
        localStorage.setItem('serverUrl', serverUrl);
        setStatus('✅ تم حفظ الإعدادات بنجاح');
        setTimeout(() => {
            onClose();
        }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">⚙️ إعدادات الاتصال بالخادم</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            عنوان الخادم (Server URL)
                        </label>
                        <input
                            type="text"
                            value={serverUrl}
                            onChange={(e) => setServerUrl(e.target.value)}
                            placeholder="http://192.168.1.10:4000"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            dir="ltr"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            💡 للاتصال المحلي: http://localhost:4000<br />
                            💡 للاتصال من الشبكة: http://[IP]:4000
                        </p>
                    </div>

                    {status && (
                        <div className={`p-3 rounded-lg ${status.startsWith('✅')
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                            {status}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleTest}
                            disabled={isLoading}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? '🔄 جاري الاختبار...' : '🔍 اختبار الاتصال'}
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                            💾 حفظ
                        </button>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-2">📌 ملاحظات:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• تأكد من تشغيل الخادم أولاً</li>
                        <li>• للحصول على IP الخادم: افتح CMD واكتب ipconfig</li>
                        <li>• تأكد من إيقاف الجدار الناري (Firewall) للمنفذ 4000</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ConnectionSettings;
