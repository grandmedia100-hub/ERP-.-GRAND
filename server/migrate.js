const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// قراءة بيانات النسخة الاحتياطية من ملف JSON
const backupFilePath = process.argv[2] || path.join(__dirname, '../backup.json');

if (!fs.existsSync(backupFilePath)) {
    console.error('❌ ملف النسخة الاحتياطية غير موجود. يرجى تحديد المسار الصحيح');
    console.log('الاستخدام: node migrate.js path/to/backup.json');
    process.exit(1);
}

const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
console.log('📥 تم قراءة ملف النسخة الاحتياطية بنجاح');

// الaتصال بقاعدة البيانات
const dbPath = path.join(__dirname, 'mediahive.db');
const db = new sqlite3.Database(dbPath);

// Helper function to safely parse data
function parseData(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('خطأ في تحويل البيانات:', e.message);
            return [];
        }
    }
    return [];
}

// دالة لإدخال البيانات
function insertData(tableName, dataArray, mapFunction) {
    return new Promise((resolve, reject) => {
        if (!dataArray || dataArray.length === 0) {
            console.log(`  لا توجد بيانات لـ ${tableName}`);
            return resolve();
        }

        const mappedData = dataArray.map(mapFunction);
        if (mappedData.length === 0) {
            console.log(`⏭️  لا توجد بيانات لـ ${tableName}`);
            return resolve();
        }

        const columns = Object.keys(mappedData[0]);
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

        const stmt = db.prepare(sql);
        let count = 0;

        mappedData.forEach(item => {
            const values = columns.map(col => item[col]);
            stmt.run(values, (err) => {
                if (err) {
                    console.error(`❌ خطأ في إدخال ${tableName}:`, err.message);
                } else {
                    count++;
                }
            });
        });

        stmt.finalize((err) => {
            if (err) reject(err);
            else {
                console.log(`✅ تم ترحيل ${count} سجل إلى ${tableName}`);
                resolve();
            }
        });
    });
}

// بدء عملية الترحيل
async function migrate() {
    try {
        console.log('🚀 بدء عملية ترحيل البيانات...\n');

        // 1. Products
        await insertData('products', parseData(backupData.products), p => ({
            id: p.id,
            name: p.name,
            category: p.category || '',
            unit: p.unit || '',
            costPrice: p.costPrice || 0,
            salePrice: p.salePrice || 0,
            quantity: p.quantity || 0,
            minQuantity: p.minQuantity || 0
        }));

        // 2. Customers
        await insertData('customers', parseData(backupData.customers), c => ({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            address: c.address || '',
            openingBalance: c.openingBalance || 0,
            creditLimit: c.creditLimit || 0
        }));

        // 3. Suppliers
        await insertData('suppliers', parseData(backupData.suppliers), s => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            address: s.address || '',
            openingBalance: s.openingBalance || 0
        }));

        // 4. Sales Invoices
        await insertData('sales_invoices', parseData(backupData.salesInvoices), inv => ({
            id: inv.id,
            customerId: inv.customerId,
            customerName: inv.customerName,
            companyName: inv.companyName || '',
            date: inv.date,
            paymentMethod: inv.paymentMethod,
            total: inv.total,
            invoiceType: inv.invoiceType || 'sale',
            status: inv.status || 'active',
            notes: inv.notes || '',
            items: JSON.stringify(inv.items)
        }));

        // 5. Purchase Invoices
        await insertData('purchase_invoices', parseData(backupData.purchaseInvoices), inv => ({
            id: inv.id,
            supplierId: inv.supplierId,
            supplierName: inv.supplierName,
            companyName: inv.companyName || '',
            date: inv.date,
            paymentMethod: inv.paymentMethod,
            total: inv.total,
            invoiceType: inv.invoiceType || 'purchase',
            status: inv.status || 'active',
            notes: inv.notes || '',
            items: JSON.stringify(inv.items)
        }));

        // 6. Customer Payments
        await insertData('customer_payments', parseData(backupData.customerPayments), p => ({
            id: p.id,
            customerId: p.customerId,
            customerName: p.customerName,
            amount: p.amount,
            date: p.date,
            treasuryAccount: p.treasuryAccount || 'الخزينة الرئيسية',
            notes: p.notes || '',
            status: p.status || 'active'
        }));

        // 7. Supplier Payments
        await insertData('supplier_payments', parseData(backupData.supplierPayments), p => ({
            id: p.id,
            supplierId: p.supplierId,
            supplierName: p.supplierName,
            amount: p.amount,
            date: p.date,
            treasuryAccount: p.treasuryAccount || 'الخزينة الرئيسية',
            notes: p.notes || '',
            status: p.status || 'active',
            isExpense: p.isExpense ? 1 : 0,
            expenseCategory: p.expenseCategory || ''
        }));

        // 8. Expenses
        await insertData('expenses', parseData(backupData.expenses), e => ({
            id: e.id,
            category: e.category,
            description: e.description || '',
            amount: e.amount,
            date: e.date
        }));

        // 9. Journal Entries
        await insertData('journal_entries', parseData(backupData.journalEntries), j => ({
            id: j.id,
            date: j.date,
            description: j.description,
            referenceType: j.referenceType || '',
            referenceId: j.referenceId || '',
            lines: JSON.stringify(j.lines),
            createdAt: j.createdAt || new Date().toISOString()
        }));

        // 10. Users
        await insertData('users', parseData(backupData.users), u => ({
            id: u.id,
            username: u.username,
            password: u.password || '',
            fullName: u.fullName,
            role: u.role,
            permissions: JSON.stringify(u.permissions || [])
        }));

        // 11. Logs
        await insertData('logs', parseData(backupData.logs), l => ({
            id: l.id,
            userId: l.userId,
            userName: l.userName,
            action: l.action,
            timestamp: l.timestamp
        }));

        // 12. Quotations
        await insertData('quotations', parseData(backupData.quotations), q => ({
            id: q.id,
            customerId: q.customerId,
            customerName: q.customerName,
            date: q.date,
            validUntil: q.validUntil || '',
            total: q.total,
            status: q.status || 'pending',
            notes: q.notes || '',
            items: JSON.stringify(q.items)
        }));

        // 13. Partners
        await insertData('partners', parseData(backupData.partners), p => ({
            id: p.id,
            name: p.name,
            sharePercentage: p.sharePercentage || 0,
            openingBalance: p.openingBalance || 0
        }));

        // 14. Partner Transactions
        await insertData('partner_transactions', parseData(backupData.partnerTransactions), t => ({
            id: t.id,
            partnerId: t.partnerId,
            type: t.type,
            amount: t.amount,
            date: t.date,
            description: t.description || ''
        }));

        // 15. Accounts
        await insertData('accounts', parseData(backupData.accounts), a => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            parentId: a.parentId || ''
        }));

        console.log('\n✅ تمت عملية الترحيل بنجاح! 🎉');
        console.log('يمكنك الآن تشغيل الخادم والبدء في استخدام النظام الجديد.');

    } catch (error) {
        console.error('❌ حدث خطأ أثناء الترحيل:', error);
    } finally {
        db.close();
    }
}

migrate();
