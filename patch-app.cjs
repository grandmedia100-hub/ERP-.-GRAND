const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const hookCode = `
// --- Real-time Sync Hook ---
const useServerState = <T extends { id?: string }>(defaultValue: T[], key: string, tableName: string): [T[], React.Dispatch<React.SetStateAction<T[]>>] => {
    // 1. Initial Local State
    const [data, setData] = useState<T[]>(() => {
        try {
            const cached = window.localStorage.getItem(key);
            return cached ? JSON.parse(cached) : defaultValue;
        } catch { return defaultValue; }
    });
    
    // Store latest state in ref to avoid effect dependency issues
    const dataRef = useRef(data);
    dataRef.current = data;

    // 2. Poll Server Data
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
            }).catch(err => console.error('Sync GET error:', err));
        };

        fetchServer();
        const interval = setInterval(fetchServer, 3000);
        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [key, tableName]);

    // 3. Custom Setter (intercepts changes and sends them to server)
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

if (!code.includes('useServerState')) {
    code = code.replace(
        'return [value, setValue];\n};\n',
        'return [value, setValue];\n};\n' + hookCode
    );

    code = code.replace(/const \[products, setProducts\] = useStickyState<Product\[\]>\((.*?), (.*?)\);/, 
        "const [products, setProducts] = useServerState<Product[]>($1, $2, 'products');");
    
    code = code.replace(/const \[customers, setCustomers\] = useStickyState<Customer\[\]>\((.*?), (.*?)\);/, 
        "const [customers, setCustomers] = useServerState<Customer[]>($1, $2, 'customers');");
    
    code = code.replace(/const \[suppliers, setSuppliers\] = useStickyState<Supplier\[\]>\((.*?), (.*?)\);/, 
        "const [suppliers, setSuppliers] = useServerState<Supplier[]>($1, $2, 'suppliers');");
        
    code = code.replace(/const \[salesInvoices, setSalesInvoices\] = useStickyState<SalesInvoice\[\]>\((.*?), (.*?)\);/, 
        "const [salesInvoices, setSalesInvoices] = useServerState<SalesInvoice[]>($1, $2, 'sales_invoices');");
        
    code = code.replace(/const \[purchaseInvoices, setPurchaseInvoices\] = useStickyState<PurchaseInvoice\[\]>\((.*?), (.*?)\);/, 
        "const [purchaseInvoices, setPurchaseInvoices] = useServerState<PurchaseInvoice[]>($1, $2, 'purchase_invoices');");
        
    code = code.replace(/const \[customerPayments, setCustomerPayments\] = useStickyState<CustomerPayment\[\]>\((.*?), (.*?)\);/, 
        "const [customerPayments, setCustomerPayments] = useServerState<CustomerPayment[]>($1, $2, 'customer_payments');");
        
    code = code.replace(/const \[supplierPayments, setSupplierPayments\] = useStickyState<SupplierPayment\[\]>\((.*?), (.*?)\);/, 
        "const [supplierPayments, setSupplierPayments] = useServerState<SupplierPayment[]>($1, $2, 'supplier_payments');");
        
    code = code.replace(/const \[expenses, setExpenses\] = useStickyState<any\[\]>\((.*?), (.*?)\);/, 
        "const [expenses, setExpenses] = useServerState<any[]>($1, $2, 'expenses');");
        
    code = code.replace(/const \[journalEntries, setJournalEntries\] = useStickyState<JournalEntry\[\]>\((.*?), (.*?)\);/, 
        "const [journalEntries, setJournalEntries] = useServerState<JournalEntry[]>($1, $2, 'journal_entries');");
        
    code = code.replace(/const \[logs, setLogs\] = useStickyState<LogEntry\[\]>\((.*?), (.*?)\);/, 
        "const [logs, setLogs] = useServerState<LogEntry[]>($1, $2, 'logs');");
        
    code = code.replace(/const \[quotations, setQuotations\] = useStickyState<Quotation\[\]>\((.*?), (.*?)\);/, 
        "const [quotations, setQuotations] = useServerState<Quotation[]>($1, $2, 'quotations');");
        
    code = code.replace(/const \[partners, setPartners\] = useStickyState<any\[\]>\((.*?), (.*?)\);/, 
        "const [partners, setPartners] = useServerState<any[]>($1, $2, 'partners');");
        
    code = code.replace(/const \[partnerTransactions, setPartnerTransactions\] = useStickyState<any\[\]>\((.*?), (.*?)\);/, 
        "const [partnerTransactions, setPartnerTransactions] = useServerState<any[]>($1, $2, 'partner_transactions');");
        
    code = code.replace(/const \[accounts, setAccounts\] = useStickyState<Account\[\]>\((.*?), (.*?)\);/, 
        "const [accounts, setAccounts] = useServerState<Account[]>($1, $2, 'accounts');");

    fs.writeFileSync('App.tsx', code);
    console.log('App patched successfully!');
}
