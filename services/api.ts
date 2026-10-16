// API Service Layer for MediaHive ERP
// This module handles all communication with the backend server

const getApiBaseUrl = () => {
    const savedUrl = localStorage.getItem('serverUrl');
    if (savedUrl) return savedUrl;
    
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:4000`;
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
    baseUrl?: string;
    headers?: any;
    requestConfig?: any;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    // Set custom server URL
    setServerUrl(url: string) {
        this.baseUrl = url;
        localStorage.setItem('serverUrl', url);
    }

    // Helper method for fetch requests
    async request(endpoint: string, options: any = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Health check
    async checkHealth() {
        return this.request('/api/health');
    }

    // Fetch all data from server
    async syncGet() {
        return this.request('/api/sync');
    }

    // Save data to server
    async syncPost(data: any) {
        return this.request('/api/sync', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Specialized methods for each data type
    async getProducts() {
        const data = await this.syncGet();
        return data.products || [];
    }

    async getCustomers() {
        const data = await this.syncGet();
        return data.customers || [];
    }

    async getSuppliers() {
        const data = await this.syncGet();
        return data.suppliers || [];
    }

    async getSalesInvoices() {
        const data = await this.syncGet();
        return data.sales_invoices || [];
    }

    async getPurchaseInvoices() {
        const data = await this.syncGet();
        return data.purchase_invoices || [];
    }

    async getCustomerPayments() {
        const data = await this.syncGet();
        return data.customer_payments || [];
    }

    async getSupplierPayments() {
        const data = await this.syncGet();
        return data.supplier_payments || [];
    }

    async getExpenses() {
        const data = await this.syncGet();
        return data.expenses || [];
    }

    async getJournalEntries() {
        const data = await this.syncGet();
        return data.journal_entries || [];
    }

    async getUsers() {
        const data = await this.syncGet();
        return data.users || [];
    }

    async getLogs() {
        const data = await this.syncGet();
        return data.logs || [];
    }

    async getQuotations() {
        const data = await this.syncGet();
        return data.quotations || [];
    }

    async getPartners() {
        const data = await this.syncGet();
        return data.partners || [];
    }

    async getPartnerTransactions() {
        const data = await this.syncGet();
        return data.partner_transactions || [];
    }

    async getAccounts() {
        const data = await this.syncGet();
        return data.accounts || [];
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
