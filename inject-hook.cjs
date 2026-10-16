const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const hookCode = `
// --- Real-time Sync Hook ---
const useServerState = <T extends { id?: string }>(defaultValue: T[], key: string, tableName: string): [T[], React.Dispatch<React.SetStateAction<T[]>>] => {
    const [data, setData] = useState<T[]>(() => {
        try {
            const cached = window.localStorage.getItem(key);
            return cached ? JSON.parse(cached) : defaultValue;
        } catch { return defaultValue; }
    });
    
    const dataRef = useRef(data);
    dataRef.current = data;

    useEffect(() => {
        let isSubscribed = true;
        const fetchServer = () => {
            apiService.request('/api/' + tableName).then((serverData) => {
                if (!isSubscribed) return;
                const localStr = JSON.stringify(dataRef.current);
                const serverStr = JSON.stringify(serverData);
                if (localStr !== serverStr) {
                    setData(serverData);
                    window.localStorage.setItem(key, serverStr);
                }
            }).catch(err => {});
        };

        fetchServer();
        const interval = setInterval(fetchServer, 3000);
        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [key, tableName]);

    const setServerData = useCallback((action) => {
        setData(prev => {
            const next = typeof action === 'function' ? action(prev) : action;
            window.localStorage.setItem(key, JSON.stringify(next));

            const prevMap = new Map(prev.filter(i => i.id).map(i => [i.id, i]));
            const nextMap = new Map(next.filter(i => i.id).map(i => [i.id, i]));

            next.forEach(item => {
                if (!item.id) return;
                const oldItem = prevMap.get(item.id);
                if (!oldItem) {
                    apiService.request('/api/' + tableName, { method: 'POST', body: JSON.stringify(item) }).catch(console.error);
                } else if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
                    apiService.request('/api/' + tableName + '/' + item.id, { method: 'PUT', body: JSON.stringify(item) }).catch(console.error);
                }
            });

            prev.forEach(item => {
                if (item.id && !nextMap.has(item.id)) {
                    apiService.request('/api/' + tableName + '/' + item.id, { method: 'DELETE' }).catch(console.error);
                }
            });

            return next;
        });
    }, [key, tableName]);

    return [data, setServerData];
};
`;

if (!code.includes('const useServerState =')) {
    // Inject before checkAndFixDuplicates
    code = code.replace(/(\/\/ Helper to fix duplicates)/, hookCode + '\n$1');
    fs.writeFileSync('App.tsx', code);
    console.log('useServerState definition added.');
} else {
    console.log('useServerState definition already exists.');
}
