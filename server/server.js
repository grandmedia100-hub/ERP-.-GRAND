require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

const dbPath = path.join(__dirname, "mediahive-clean.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("خطأ في الاتصال بقاعدة البيانات:", err.message);
    } else {
        console.log("تم الاتصال بقاعدة البيانات");
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA synchronous = NORMAL;");
        db.run("PRAGMA cache_size = 10000;");
        db.run("PRAGMA temp_store = MEMORY;");
        db.configure("busyTimeout", 5000);
        initializeDatabase();
        
        // Dynamic column migrations
        db.run("ALTER TABLE quotations ADD COLUMN deliveryDuration TEXT;", (e) => {});
        db.run("ALTER TABLE customers ADD COLUMN companyName TEXT;", (e) => {});
        db.run("ALTER TABLE suppliers ADD COLUMN companyName TEXT;", (e) => {});
        db.run("ALTER TABLE products ADD COLUMN productType TEXT;", (e) => {});
        db.run("ALTER TABLE products ADD COLUMN barcode TEXT;", (e) => {});
        db.run("ALTER TABLE products ADD COLUMN sku TEXT;", (e) => {});
        db.run("ALTER TABLE products ADD COLUMN warehouseId TEXT;", (e) => {});
        db.run("ALTER TABLE products ADD COLUMN warehouseName TEXT;", (e) => {});

        // BranchId migrations
        const branchTables = [
            "products", "customers", "suppliers", "sales_invoices", "purchase_invoices",
            "customer_payments", "supplier_payments", "expenses", "journal_entries",
            "quotations", "partners", "partner_transactions", "accounts", "treasury_transfers"
        ];
        branchTables.forEach(t => {
            db.run(`ALTER TABLE ${t} ADD COLUMN branchId TEXT DEFAULT 'main';`, (e) => {});
        });

        // Inter-company Treasury Migrations
        db.run("ALTER TABLE treasury_transfers ADD COLUMN fee REAL DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN isIntercompany INTEGER DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN fromBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN fromBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN toBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN toBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE treasury_transfers ADD COLUMN mirrorTransferId TEXT;", (e) => {});

        db.run("ALTER TABLE supplier_payments ADD COLUMN fee REAL DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN isIntercompany INTEGER DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN targetBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN targetBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN sourceBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN sourceBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN targetSupplierId TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN targetSupplierName TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN mirrorPaymentId TEXT;", (e) => {});
        db.run("ALTER TABLE supplier_payments ADD COLUMN paidByOtherBranch INTEGER DEFAULT 0;", (e) => {});

        db.run("ALTER TABLE customer_payments ADD COLUMN fee REAL DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN isIntercompany INTEGER DEFAULT 0;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN targetBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN targetBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN sourceBranchId TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN sourceBranchName TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN targetCustomerId TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN targetCustomerName TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN mirrorPaymentId TEXT;", (e) => {});
        db.run("ALTER TABLE customer_payments ADD COLUMN receivedByOtherBranch INTEGER DEFAULT 0;", (e) => {});

        // Auto-seed account 2102 (Inter-company current account) for main and branches
        const branchesToSeed = ['main', 'branch_1792042133332', 'factory'];
        branchesToSeed.forEach(bId => {
            db.run("INSERT OR IGNORE INTO accounts (id, code, name, type, parentId, branchId) VALUES (?, '2102', 'جاري الشركات الشقيقة (الأطراف ذات العلاقة)', 'دائن', '21', ?)",
                ['acc_2102_' + bId, bId], (e) => {});
        });
    }
});

const BRANCH_TABLES = [
    "products", "customers", "suppliers", "sales_invoices", "purchase_invoices",
    "customer_payments", "supplier_payments", "expenses", "journal_entries",
    "quotations", "partners", "partner_transactions", "accounts", "treasury_transfers"
];

const ALLOWED_TABLES = [
    ...BRANCH_TABLES,
    "users", "logs", "expenses"
];

function initializeDatabase() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, unit TEXT, costPrice REAL, salePrice REAL, quantity REAL DEFAULT 0, minQuantity REAL DEFAULT 0, productType TEXT, barcode TEXT, branchId TEXT DEFAULT 'main', sku TEXT, warehouseId TEXT, warehouseName TEXT);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, openingBalance REAL DEFAULT 0, creditLimit REAL DEFAULT 0, companyName TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, openingBalance REAL DEFAULT 0, companyName TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS sales_invoices (id TEXT PRIMARY KEY, customerId TEXT, customerName TEXT, companyName TEXT, date TEXT, paymentMethod TEXT, total REAL, invoiceType TEXT DEFAULT "sale", status TEXT DEFAULT "active", notes TEXT, items TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS purchase_invoices (id TEXT PRIMARY KEY, supplierId TEXT, supplierName TEXT, companyName TEXT, date TEXT, paymentMethod TEXT, total REAL, invoiceType TEXT DEFAULT "purchase", status TEXT DEFAULT "active", notes TEXT, items TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS customer_payments (id TEXT PRIMARY KEY, customerId TEXT, customerName TEXT, amount REAL, date TEXT, treasuryAccount TEXT, notes TEXT, status TEXT DEFAULT "active", branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS supplier_payments (id TEXT PRIMARY KEY, supplierId TEXT, supplierName TEXT, amount REAL, date TEXT, treasuryAccount TEXT, notes TEXT, status TEXT DEFAULT "active", isExpense INTEGER DEFAULT 0, expenseCategory TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS treasury_transfers (id TEXT PRIMARY KEY, date TEXT, fromAccount TEXT, toAccount TEXT, amount REAL, fee REAL DEFAULT 0, notes TEXT, status TEXT DEFAULT "active", branchId TEXT DEFAULT 'main', isIntercompany INTEGER DEFAULT 0, fromBranchId TEXT, fromBranchName TEXT, toBranchId TEXT, toBranchName TEXT, mirrorTransferId TEXT);
    CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, category TEXT, description TEXT, amount REAL, date TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, date TEXT, description TEXT, referenceType TEXT, referenceId TEXT, lines TEXT, createdAt TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, fullName TEXT, role TEXT, permissions TEXT);
    CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, userId TEXT, userName TEXT, action TEXT, timestamp TEXT);
    CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, customerId TEXT, customerName TEXT, date TEXT, validUntil TEXT, total REAL, status TEXT DEFAULT "pending", notes TEXT, items TEXT, deliveryDuration TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS partners (id TEXT PRIMARY KEY, name TEXT, sharePercentage REAL, openingBalance REAL DEFAULT 0, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS partner_transactions (id TEXT PRIMARY KEY, partnerId TEXT, type TEXT, amount REAL, date TEXT, description TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, code TEXT, name TEXT, type TEXT, parentId TEXT, branchId TEXT DEFAULT 'main');
    CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);
    `, (err) => {
        if (err) console.error("خطأ في انشاء الجداول:", err.message);
        else console.log("تم انشاء جميع الجداول بنجاح");
    });
}

// Health Check
app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// KV store routes for complex data (warehouses, stockTransactions, treasuryTransfers, etc.)
app.get("/api/kv/:key", (req, res) => {
    db.get("SELECT value FROM kv_store WHERE key = ?", [req.params.key], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json([]);
        try { res.json(JSON.parse(row.value)); } catch(e) { res.json([]); }
    });
});

app.post("/api/kv/:key", (req, res) => {
    const value = JSON.stringify(req.body);
    db.run(
        "INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [req.params.key, value],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// Centralized Inter-Company Mirroring Function
function mirrorSalesToPurchase(salesInvoice, sourceBranchId) {
    if (!salesInvoice || !salesInvoice.id) return;
    
    // Resolve target branch:
    let targetBranchId = salesInvoice.targetBranchId;
    if (!targetBranchId && salesInvoice.customerId && salesInvoice.customerId.startsWith('ic_')) {
        targetBranchId = salesInvoice.customerId.replace('ic_', '');
    }
    
    const custText = ((salesInvoice.customerName || '') + ' ' + (salesInvoice.companyName || '')).toLowerCase();
    
    // Auto-detect target branch by name if not specified:
    if (!targetBranchId) {
        if (custText.includes('المصنع') || custText.includes('مصنع')) {
            targetBranchId = 'factory';
        } else if (custText.includes('برو') || custText.includes('بروباك')) {
            targetBranchId = 'branch_1792042133332'; // Pro Pack
        } else if (custText.includes('جراند') || custText.includes('ميديا')) {
            targetBranchId = 'main'; // Grand Media
        }
    }
    
    // If targetBranchId is still not found or matches sourceBranch, do nothing
    if (!targetBranchId || targetBranchId === sourceBranchId) {
        return;
    }
    
    const sourceBranchName = getBranchName(sourceBranchId);
    const purchaseInvoiceId = 'PUR-IC-' + salesInvoice.id;
    
    const purchaseInvoice = {
        id: purchaseInvoiceId,
        supplierId: sourceBranchId,
        supplierName: sourceBranchName,
        companyName: sourceBranchName,
        date: salesInvoice.date || new Date().toISOString().split('T')[0],
        paymentMethod: salesInvoice.paymentMethod || 'اجل',
        total: Number(salesInvoice.total) || 0,
        invoiceType: salesInvoice.invoiceType === 'return' ? 'return' : 'purchase',
        status: salesInvoice.status || 'active',
        notes: `حركة بينية واردة آلياً من (${sourceBranchName}) - فاتورة مبيعات #${salesInvoice.id}`,
        items: salesInvoice.items || [],
        branchId: targetBranchId
    };
    
    const cols = getTableColumns("purchase_invoices");
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO purchase_invoices (${cols.join(",")}) VALUES (${placeholders})`;
    
    db.run(sql, getRowValues("purchase_invoices", purchaseInvoice), function(err) {
        if (err) {
            console.error("خطأ في المزامنة الآلية لفاتورة الشراء المقابلة:", err);
        } else {
            console.log(`تم مزامنة فاتورة الشراء المقابلة ${purchaseInvoiceId} تلقائياً في فرع ${targetBranchId} (الحالة: ${purchaseInvoice.status})`);
        }
    });
}

function getAccountId(name) {
    switch (name) {
        case 'الخزينة الرئيسية': return '1101';
        case 'البنك الاهلى': return '1102';
        case 'بنك فيصل': return '1102';
        case 'فودافون كاش': return '1102';
        case 'انستاباى': return '1102';
        default: return '1101';
    }
}

function getBranchName(branchId) {
    if (branchId === 'main') return 'جراند ميديا';
    if (branchId === 'factory') return 'المصنع';
    if (branchId === 'branch_1792042133332') return 'برو باك';
    return branchId || 'الفرع';
}

function mirrorTreasuryTransfer(transfer, sourceBranchId) {
    if (!transfer || !transfer.id || transfer.id.startsWith('TR-IC-')) return;
    if (!transfer.isIntercompany) return;

    let targetBranchId = transfer.toBranchId;
    if (!targetBranchId || targetBranchId === sourceBranchId) return;

    const sourceBranchName = transfer.fromBranchName || getBranchName(sourceBranchId);
    const targetBranchName = transfer.toBranchName || getBranchName(targetBranchId);
    const mirrorTransferId = 'TR-IC-' + transfer.id;

    const mirrorTransfer = {
        id: mirrorTransferId,
        date: transfer.date || new Date().toISOString().split('T')[0],
        fromAccount: transfer.fromAccount,
        toAccount: transfer.toAccount,
        amount: Number(transfer.amount) || 0,
        fee: 0,
        notes: `تحويل بيني وارد من ${sourceBranchName} [${transfer.fromAccount}] - ${transfer.notes || ''}`,
        status: transfer.status || 'active',
        branchId: targetBranchId,
        isIntercompany: 1,
        fromBranchId: sourceBranchId,
        fromBranchName: sourceBranchName,
        toBranchId: targetBranchId,
        toBranchName: targetBranchName,
        mirrorTransferId: transfer.id
    };

    const cols = getTableColumns("treasury_transfers");
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO treasury_transfers (${cols.join(",")}) VALUES (${placeholders})`;

    db.run(sql, getRowValues("treasury_transfers", mirrorTransfer), function(err) {
        if (err) console.error("خطأ في مزامنة التحويل البيني المقابل:", err);
        else console.log(`تمت مزامنة التحويل البيني ${mirrorTransferId} في فرع ${targetBranchId}`);
    });

    // Mirror Journal Entries
    const jeCols = getTableColumns("journal_entries");
    const jePlaceholders = jeCols.map(() => "?").join(",");
    const jeSql = `INSERT OR REPLACE INTO journal_entries (${jeCols.join(",")}) VALUES (${jePlaceholders})`;

    // Source JE: Debit Intercompany (2102), Debit Fee (5201), Credit Source Treasury (fromAccount)
    const sourceJE = {
        id: 'JE-TR-' + transfer.id,
        date: transfer.date || new Date().toISOString().split('T')[0],
        description: `تحويل بيني إلى ${targetBranchName} (${transfer.toAccount})`,
        referenceType: 'Manual',
        referenceId: transfer.id,
        lines: [
            { accountId: '2102', accountName: `جاري شركة ${targetBranchName}`, debit: Number(transfer.amount) || 0, credit: 0 },
            ...(Number(transfer.fee) > 0 ? [{ accountId: '5201', accountName: 'مصاريف وعمولات بنكية', debit: Number(transfer.fee), credit: 0 }] : []),
            { accountId: getAccountId(transfer.fromAccount), accountName: transfer.fromAccount, debit: 0, credit: (Number(transfer.amount) || 0) + (Number(transfer.fee) || 0) }
        ],
        createdAt: new Date().toISOString(),
        branchId: sourceBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", sourceJE));

    // Target JE: Debit Dest Treasury (toAccount), Credit Intercompany (2102)
    const targetJE = {
        id: 'JE-TR-IC-' + transfer.id,
        date: transfer.date || new Date().toISOString().split('T')[0],
        description: `تحويل بيني وارد من ${sourceBranchName} (${transfer.fromAccount})`,
        referenceType: 'Manual',
        referenceId: mirrorTransferId,
        lines: [
            { accountId: getAccountId(transfer.toAccount), accountName: transfer.toAccount, debit: Number(transfer.amount) || 0, credit: 0 },
            { accountId: '2102', accountName: `جاري شركة ${sourceBranchName}`, debit: 0, credit: Number(transfer.amount) || 0 }
        ],
        createdAt: new Date().toISOString(),
        branchId: targetBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", targetJE));
}

function mirrorSupplierPayment(payment, sourceBranchId) {
    if (!payment || !payment.id || payment.id.startsWith('SP-IC-')) return;
    if (!payment.isIntercompany) return;

    let targetBranchId = payment.targetBranchId;
    if (!targetBranchId || targetBranchId === sourceBranchId) return;

    const sourceBranchName = payment.sourceBranchName || getBranchName(sourceBranchId);
    const targetBranchName = payment.targetBranchName || getBranchName(targetBranchId);
    const mirrorPaymentId = 'SP-IC-' + payment.id;
    const targetSupplierName = payment.targetSupplierName || payment.supplierName;
    const targetSupplierId = payment.targetSupplierId || payment.supplierId;

    const mirrorPayment = {
        id: mirrorPaymentId,
        supplierId: targetSupplierId,
        supplierName: targetSupplierName,
        amount: Number(payment.amount) || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        treasuryAccount: `محفظة/خزينة ${sourceBranchName} (${payment.treasuryAccount})`,
        notes: `سداد بيني من ${sourceBranchName} (${payment.treasuryAccount}) - ${payment.notes || ''}`,
        status: payment.status || 'active',
        isExpense: 0,
        expenseCategory: '',
        branchId: targetBranchId,
        fee: 0,
        isIntercompany: 1,
        targetBranchId: targetBranchId,
        targetBranchName: targetBranchName,
        sourceBranchId: sourceBranchId,
        sourceBranchName: sourceBranchName,
        targetSupplierId: targetSupplierId,
        targetSupplierName: targetSupplierName,
        mirrorPaymentId: payment.id,
        paidByOtherBranch: 1
    };

    const cols = getTableColumns("supplier_payments");
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO supplier_payments (${cols.join(",")}) VALUES (${placeholders})`;

    db.run(sql, getRowValues("supplier_payments", mirrorPayment), function(err) {
        if (err) console.error("خطأ في مزامنة سند الصرف المقابل:", err);
        else console.log(`تمت مزامنة سند الصرف البيني ${mirrorPaymentId} في فرع ${targetBranchId}`);
    });

    // Journal entries
    const jeCols = getTableColumns("journal_entries");
    const jePlaceholders = jeCols.map(() => "?").join(",");
    const jeSql = `INSERT OR REPLACE INTO journal_entries (${jeCols.join(",")}) VALUES (${jePlaceholders})`;

    // Source JE: Debit 2102 (جاري شركة target), Credit fromAccount
    const sourceJE = {
        id: 'JE-SP-' + payment.id,
        date: payment.date || new Date().toISOString().split('T')[0],
        description: `سداد بيني لمورد (${targetSupplierName}) نيابة عن ${targetBranchName}`,
        referenceType: 'Manual',
        referenceId: payment.id,
        lines: [
            { accountId: '2102', accountName: `جاري شركة ${targetBranchName}`, debit: Number(payment.amount) || 0, credit: 0 },
            ...(Number(payment.fee) > 0 ? [{ accountId: '5201', accountName: 'مصاريف وعمولات بنكية', debit: Number(payment.fee), credit: 0 }] : []),
            { accountId: getAccountId(payment.treasuryAccount), accountName: payment.treasuryAccount, debit: 0, credit: (Number(payment.amount) || 0) + (Number(payment.fee) || 0) }
        ],
        createdAt: new Date().toISOString(),
        branchId: sourceBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", sourceJE));

    // Target JE: Debit 2101 (مورد - target), Credit 2102 (جاري شركة source)
    const targetJE = {
        id: 'JE-SP-IC-' + payment.id,
        date: payment.date || new Date().toISOString().split('T')[0],
        description: `سداد مسجل للمورد (${targetSupplierName}) من خلال ${sourceBranchName} (${payment.treasuryAccount})`,
        referenceType: 'Manual',
        referenceId: mirrorPaymentId,
        lines: [
            { accountId: '2101', accountName: `مورد - ${targetSupplierName}`, debit: Number(payment.amount) || 0, credit: 0 },
            { accountId: '2102', accountName: `جاري شركة ${sourceBranchName}`, debit: 0, credit: Number(payment.amount) || 0 }
        ],
        createdAt: new Date().toISOString(),
        branchId: targetBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", targetJE));
}

function mirrorCustomerPayment(payment, sourceBranchId) {
    if (!payment || !payment.id || payment.id.startsWith('CP-IC-')) return;
    if (!payment.isIntercompany) return;

    let targetBranchId = payment.targetBranchId;
    if (!targetBranchId || targetBranchId === sourceBranchId) return;

    const sourceBranchName = payment.sourceBranchName || getBranchName(sourceBranchId);
    const targetBranchName = payment.targetBranchName || getBranchName(targetBranchId);
    const mirrorPaymentId = 'CP-IC-' + payment.id;
    const targetCustomerName = payment.targetCustomerName || payment.customerName;
    const targetCustomerId = payment.targetCustomerId || payment.customerId;

    const mirrorPayment = {
        id: mirrorPaymentId,
        customerId: targetCustomerId,
        customerName: targetCustomerName,
        amount: Number(payment.amount) || 0,
        date: payment.date || new Date().toISOString().split('T')[0],
        treasuryAccount: `محفظة/خزينة ${sourceBranchName} (${payment.treasuryAccount})`,
        notes: `تحصيل بيني عبر ${sourceBranchName} (${payment.treasuryAccount}) - ${payment.notes || ''}`,
        status: payment.status || 'active',
        branchId: targetBranchId,
        fee: 0,
        isIntercompany: 1,
        targetBranchId: targetBranchId,
        targetBranchName: targetBranchName,
        sourceBranchId: sourceBranchId,
        sourceBranchName: sourceBranchName,
        targetCustomerId: targetCustomerId,
        targetCustomerName: targetCustomerName,
        mirrorPaymentId: payment.id,
        receivedByOtherBranch: 1
    };

    const cols = getTableColumns("customer_payments");
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO customer_payments (${cols.join(",")}) VALUES (${placeholders})`;

    db.run(sql, getRowValues("customer_payments", mirrorPayment), function(err) {
        if (err) console.error("خطأ في مزامنة سند القبض المقابل:", err);
        else console.log(`تمت مزامنة سند القبض البيني ${mirrorPaymentId} في فرع ${targetBranchId}`);
    });

    // Journal entries
    const jeCols = getTableColumns("journal_entries");
    const jePlaceholders = jeCols.map(() => "?").join(",");
    const jeSql = `INSERT OR REPLACE INTO journal_entries (${jeCols.join(",")}) VALUES (${jePlaceholders})`;

    // Source JE: Debit fromAccount, Credit 2102 (جاري شركة target)
    const sourceJE = {
        id: 'JE-CP-' + payment.id,
        date: payment.date || new Date().toISOString().split('T')[0],
        description: `تحصيل بيني من عميل (${targetCustomerName}) لصالح ${targetBranchName}`,
        referenceType: 'Manual',
        referenceId: payment.id,
        lines: [
            { accountId: getAccountId(payment.treasuryAccount), accountName: payment.treasuryAccount, debit: Number(payment.amount) || 0, credit: 0 },
            { accountId: '2102', accountName: `جاري شركة ${targetBranchName}`, debit: 0, credit: Number(payment.amount) || 0 }
        ],
        createdAt: new Date().toISOString(),
        branchId: sourceBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", sourceJE));

    // Target JE: Debit 2102 (جاري شركة source), Credit 1103 (عميل - target)
    const targetJE = {
        id: 'JE-CP-IC-' + payment.id,
        date: payment.date || new Date().toISOString().split('T')[0],
        description: `تحصيل مسجل للعميل (${targetCustomerName}) عبر ${sourceBranchName} (${payment.treasuryAccount})`,
        referenceType: 'Manual',
        referenceId: mirrorPaymentId,
        lines: [
            { accountId: '2102', accountName: `جاري شركة ${sourceBranchName}`, debit: Number(payment.amount) || 0, credit: 0 },
            { accountId: '1103', accountName: `عميل - ${targetCustomerName}`, debit: 0, credit: Number(payment.amount) || 0 }
        ],
        createdAt: new Date().toISOString(),
        branchId: targetBranchId
    };
    db.run(jeSql, getRowValues("journal_entries", targetJE));
}

// Inter-Company Mirroring API Endpoint (Manual/Direct trigger)
app.post("/api/intercompany/mirror-invoice", (req, res) => {
    const { salesInvoice, sourceBranchId, targetBranchId } = req.body;
    if (!salesInvoice) {
        return res.status(400).json({ error: "Missing salesInvoice" });
    }
    mirrorSalesToPurchase(salesInvoice, sourceBranchId || salesInvoice.branchId || 'main');
    res.json({ success: true, mirroredPurchaseInvoiceId: 'PUR-IC-' + salesInvoice.id });
});

// Sync routes
app.get("/api/sync", (req, res) => {
    const data = {};
    const tables = ALLOWED_TABLES;
    const branch = req.query.branch;
    let completed = 0;
    tables.forEach(table => {
        let sql = "SELECT * FROM " + table;
        let params = [];
        if (branch && branch !== 'all' && BRANCH_TABLES.includes(table)) {
            sql += " WHERE (branchId = ? OR (branchId IS NULL AND ? = 'main'))";
            params.push(branch, branch);
        }
        db.all(sql, params, (err, rows) => {
            if (err) { data[table] = []; }
            else {
                data[table] = rows.map(row => {
                    if (row.items) { try { row.items = JSON.parse(row.items); } catch(e) { row.items = []; } }
                    if (row.lines) { try { row.lines = JSON.parse(row.lines); } catch(e) { row.lines = []; } }
                    if (row.permissions) { try { row.permissions = JSON.parse(row.permissions); } catch(e) { row.permissions = []; } }
                    return row;
                });
            }
            completed++;
            if (completed === tables.length) res.json(data);
        });
    });
});

app.post("/api/clearAll", (req, res) => {
    const tables = [...ALLOWED_TABLES, "kv_store"];
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        tables.forEach(table => db.run("DELETE FROM " + table));
        db.run("COMMIT", (err) => {
            if (err) { db.run("ROLLBACK"); return res.status(500).json({ success: false, error: err.message }); }
            console.log("تم تفريغ جميع البيانات");
            res.json({ success: true });
        });
    });
});

// --- Database Backup & Restore Points API ---
app.get("/api/backup/download-db", (req, res) => {
    const fs = require("fs");
    if (!fs.existsSync(dbPath)) {
        return res.status(404).json({ error: "Database file not found" });
    }
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    res.download(dbPath, `mediahive-backup-${dateStr}.db`);
});

app.post("/api/backup/create-snapshot", (req, res) => {
    const fs = require("fs");
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const targetFile = path.join(backupsDir, `snapshot_${dateStr}.db`);
    
    db.run("PRAGMA wal_checkpoint(TRUNCATE);", () => {
        try {
            fs.copyFileSync(dbPath, targetFile);
            const stats = fs.statSync(targetFile);
            res.json({
                success: true,
                filename: path.basename(targetFile),
                snapshot: path.basename(targetFile),
                sizeBytes: stats.size,
                sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
                createdAt: new Date().toISOString()
            });
        } catch (copyErr) {
            res.status(500).json({ error: copyErr.message });
        }
    });
});

app.get("/api/backup/list-snapshots", (req, res) => {
    const fs = require("fs");
    const backupsDir = path.join(__dirname, "backups");
    if (!fs.existsSync(backupsDir)) {
        return res.json({ snapshots: [] });
    }
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith(".db"));
    const snapshots = files.map(filename => {
        const fullPath = path.join(backupsDir, filename);
        const stats = fs.statSync(fullPath);
        return {
            filename,
            name: filename,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            size: stats.size,
            createdAt: stats.mtime,
            mtime: stats.mtime
        };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ snapshots });
});

app.post("/api/backup/restore-snapshot", (req, res) => {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ error: "Filename required" });
    const fs = require("fs");
    const snapshotPath = path.join(__dirname, "backups", filename);
    if (!fs.existsSync(snapshotPath)) {
        return res.status(404).json({ error: "Snapshot file not found" });
    }
    const rollbackPath = path.join(__dirname, "backups", `pre_restore_${Date.now()}.db`);
    try {
        fs.copyFileSync(dbPath, rollbackPath);
        fs.copyFileSync(snapshotPath, dbPath);
        res.json({ success: true, message: "تمت استعادة نقطة الاستعادة بنجاح" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic Table CRUD with Branch Support & Automated Mirroring
app.get("/api/:table", (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
    
    const branch = req.query.branch;
    let sql = "SELECT * FROM " + table;
    let params = [];

    if (branch && branch !== 'all' && BRANCH_TABLES.includes(table)) {
        sql += " WHERE (branchId = ? OR (branchId IS NULL AND ? = 'main'))";
        params.push(branch, branch);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(row => {
            if (row.items) { try { row.items = JSON.parse(row.items); } catch(e) {} }
            if (row.lines) { try { row.lines = JSON.parse(row.lines); } catch(e) {} }
            if (row.permissions) { try { row.permissions = JSON.parse(row.permissions); } catch(e) {} }
            return row;
        }));
    });
});

app.post("/api/:table", (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
    const data = req.body;
    if (req.query.branch && !data.branchId) {
        data.branchId = req.query.branch;
    }

    // 1. Sanitize Primary Key ID to prevent destructive collisions on '0', 'PINV-0', or empty
    const rawIdStr = String(data.id || '').trim();
    if (!rawIdStr || rawIdStr === '0' || rawIdStr === 'PINV-0' || rawIdStr === 'null' || rawIdStr === 'undefined') {
        const prefix = table.split('_').map(w => w[0].toUpperCase()).join('');
        data.id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // 2. Strict Journal Entry Validation: Debits MUST equal Credits
    if (table === "journal_entries") {
        let lines = [];
        try { lines = typeof data.lines === 'string' ? JSON.parse(data.lines) : (data.lines || []); } catch(e) {}
        const sumDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const sumCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
        if (lines.length > 0 && Math.abs(sumDebit - sumCredit) > 0.05) {
            console.error(`⛔ خطأ محاسبي حرج: محاولة ترحيل قيد غير متوازن! مدين: ${sumDebit} / دائن: ${sumCredit}`);
            return res.status(400).json({ 
                error: `قيد اليومية غير متوازن! إجمالي المدين (${sumDebit.toFixed(2)}) لا يتساوى مع إجمالي الدائن (${sumCredit.toFixed(2)})` 
            });
        }
    }

    const cols = getTableColumns(table);
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`;

    // 3. Collision Protection: Check if this ID already belongs to a DIFFERENT entity
    const partnerCol = (table.includes('purchase') || table.includes('supplier')) ? 'supplierId' : 'customerId';
    const isPartnerTable = ['purchase_invoices', 'sales_invoices', 'customer_payments', 'supplier_payments'].includes(table);

    const executeInsert = () => {
        db.run(sql, getRowValues(table, data), function(err) {
            if (err) {
                console.error(`Error inserting into ${table}:`, err);
                return res.status(500).json({ error: err.message });
            }
            // Auto-mirror entities
            if (table === "sales_invoices") {
                mirrorSalesToPurchase(data, data.branchId || req.query.branch || 'main');
            } else if (table === "treasury_transfers") {
                mirrorTreasuryTransfer(data, data.branchId || req.query.branch || 'main');
            } else if (table === "supplier_payments") {
                mirrorSupplierPayment(data, data.branchId || req.query.branch || 'main');
            } else if (table === "customer_payments") {
                mirrorCustomerPayment(data, data.branchId || req.query.branch || 'main');
            }
            res.json({ success: true, id: data.id });
        });
    };

    if (isPartnerTable && data[partnerCol]) {
        db.get(`SELECT id, ${partnerCol} FROM ${table} WHERE id = ?`, [data.id], (err, existing) => {
            if (existing && existing[partnerCol] && existing[partnerCol] !== data[partnerCol]) {
                // ID collision with a DIFFERENT partner! Give it a safe unique suffix to avoid overwriting!
                console.warn(`⚠️ منع تضارب معرّف: المعرّف ${data.id} كان سيستبدل سجل شريك آخر! تم توليد معرّف فريد.`);
                data.id = `${data.id}-${Date.now().toString().slice(-4)}`;
            }
            executeInsert();
        });
    } else {
        executeInsert();
    }
});

app.put("/api/:table/:id", (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
    const data = req.body;
    if (req.query.branch && !data.branchId) {
        data.branchId = req.query.branch;
    }
    const cols = getTableColumns(table);
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`;

    db.serialize(() => {
        db.run("DELETE FROM " + table + " WHERE id = ?", [id]);
        db.run(sql, getRowValues(table, data), function(err) {
            if (err) {
                console.error(`Error updating in ${table}:`, err);
                return res.status(500).json({ error: err.message });
            }
            // Auto-mirror on update/void
            if (table === "sales_invoices") {
                mirrorSalesToPurchase(data, data.branchId || req.query.branch || 'main');
            } else if (table === "treasury_transfers") {
                mirrorTreasuryTransfer(data, data.branchId || req.query.branch || 'main');
            } else if (table === "supplier_payments") {
                mirrorSupplierPayment(data, data.branchId || req.query.branch || 'main');
            } else if (table === "customer_payments") {
                mirrorCustomerPayment(data, data.branchId || req.query.branch || 'main');
            }
            res.json({ success: true, id: data.id });
        });
    });
});

app.delete("/api/:table/:id", (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
    db.run("DELETE FROM " + table + " WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // If a sales invoice is deleted, automatically delete any mirrored purchase invoice!
        if (table === "sales_invoices") {
            db.run("DELETE FROM purchase_invoices WHERE id = ? OR id = ? OR notes LIKE ?", [
                "PUR-IC-" + id,
                id,
                "%فاتورة مبيعات #" + id + "%"
            ], (delErr) => {
                if (!delErr) console.log(`تم حذف فواتير المشتريات المقابلة المرتبطة بفاتورة المبيعات ${id}`);
            });
        }

        // If a mirrored purchase invoice is deleted, also delete the corresponding sales invoice
        if (table === "purchase_invoices" && id.startsWith("PUR-IC-")) {
            const salesId = id.replace("PUR-IC-", "");
            db.run("DELETE FROM sales_invoices WHERE id = ?", [salesId], (delErr) => {
                if (!delErr) console.log(`تم حذف فاتورة المبيعات الأصلية المقابلة ${salesId}`);
            });
        }

        // Cascading delete for transfers
        if (table === "treasury_transfers") {
            const mirrorId = id.startsWith("TR-IC-") ? id.replace("TR-IC-", "") : "TR-IC-" + id;
            db.run("DELETE FROM treasury_transfers WHERE id = ?", [mirrorId]);
            db.run("DELETE FROM journal_entries WHERE referenceId = ? OR referenceId = ? OR id = ? OR id = ?", [
                id, mirrorId, 'JE-TR-' + id, 'JE-TR-IC-' + id
            ]);
        }

        // Cascading delete for supplier payments
        if (table === "supplier_payments") {
            const mirrorId = id.startsWith("SP-IC-") ? id.replace("SP-IC-", "") : "SP-IC-" + id;
            db.run("DELETE FROM supplier_payments WHERE id = ?", [mirrorId]);
            db.run("DELETE FROM journal_entries WHERE referenceId = ? OR referenceId = ? OR id = ? OR id = ?", [
                id, mirrorId, 'JE-SP-' + id, 'JE-SP-IC-' + id
            ]);
        }

        // Cascading delete for customer payments
        if (table === "customer_payments") {
            const mirrorId = id.startsWith("CP-IC-") ? id.replace("CP-IC-", "") : "CP-IC-" + id;
            db.run("DELETE FROM customer_payments WHERE id = ?", [mirrorId]);
            db.run("DELETE FROM journal_entries WHERE referenceId = ? OR referenceId = ? OR id = ? OR id = ?", [
                id, mirrorId, 'JE-CP-' + id, 'JE-CP-IC-' + id
            ]);
        }

        res.json({ success: true, deleted: this.changes });
    });
});

function getTableColumns(table) {
    switch (table) {
        case "products": return ["id", "name", "category", "unit", "costPrice", "salePrice", "quantity", "minQuantity", "productType", "barcode", "branchId", "sku", "warehouseId", "warehouseName"];
        case "customers": return ["id", "name", "phone", "address", "openingBalance", "creditLimit", "companyName", "branchId"];
        case "suppliers": return ["id", "name", "phone", "address", "openingBalance", "companyName", "branchId"];
        case "sales_invoices": return ["id", "customerId", "customerName", "companyName", "date", "paymentMethod", "total", "invoiceType", "status", "notes", "items", "branchId"];
        case "purchase_invoices": return ["id", "supplierId", "supplierName", "companyName", "date", "paymentMethod", "total", "invoiceType", "status", "notes", "items", "branchId"];
        case "customer_payments": return ["id", "customerId", "customerName", "amount", "date", "treasuryAccount", "notes", "status", "branchId", "fee", "isIntercompany", "targetBranchId", "targetBranchName", "sourceBranchId", "sourceBranchName", "targetCustomerId", "targetCustomerName", "mirrorPaymentId", "receivedByOtherBranch"];
        case "supplier_payments": return ["id", "supplierId", "supplierName", "amount", "date", "treasuryAccount", "notes", "status", "isExpense", "expenseCategory", "branchId", "fee", "isIntercompany", "targetBranchId", "targetBranchName", "sourceBranchId", "sourceBranchName", "targetSupplierId", "targetSupplierName", "mirrorPaymentId", "paidByOtherBranch"];
        case "treasury_transfers": return ["id", "date", "fromAccount", "toAccount", "amount", "fee", "notes", "status", "branchId", "isIntercompany", "fromBranchId", "fromBranchName", "toBranchId", "toBranchName", "mirrorTransferId"];
        case "expenses": return ["id", "category", "description", "amount", "date", "branchId"];
        case "journal_entries": return ["id", "date", "description", "referenceType", "referenceId", "lines", "createdAt", "branchId"];
        case "users": return ["id", "username", "password", "fullName", "role", "permissions"];
        case "logs": return ["id", "userId", "userName", "action", "timestamp"];
        case "quotations": return ["id", "customerId", "customerName", "date", "validUntil", "total", "status", "notes", "items", "deliveryDuration", "branchId"];
        case "partners": return ["id", "name", "sharePercentage", "openingBalance", "branchId"];
        case "partner_transactions": return ["id", "partnerId", "type", "amount", "date", "description", "branchId"];
        case "accounts": return ["id", "code", "name", "type", "parentId", "branchId"];
        default: return [];
    }
}

function getRowValues(table, row) {
    const branch = row.branchId || "main";
    switch (table) {
        case "products": return [row.id, row.name, row.category, row.unit, row.costPrice, row.salePrice, row.quantity, row.minQuantity, row.productType, row.barcode, branch, row.sku || "", row.warehouseId || "", row.warehouseName || ""];
        case "customers": return [row.id, row.name, row.phone, row.address, row.openingBalance, row.creditLimit, row.companyName, branch];
        case "suppliers": return [row.id, row.name, row.phone, row.address, row.openingBalance, row.companyName, branch];
        case "sales_invoices": return [row.id, row.customerId, row.customerName, row.companyName, row.date, row.paymentMethod, row.total, row.invoiceType, row.status, row.notes, JSON.stringify(row.items || []), branch];
        case "purchase_invoices": return [row.id, row.supplierId, row.supplierName, row.companyName, row.date, row.paymentMethod, row.total, row.invoiceType, row.status, row.notes, JSON.stringify(row.items || []), branch];
        case "customer_payments": return [
            row.id, row.customerId, row.customerName, Number(row.amount) || 0, row.date, row.treasuryAccount, row.notes || "", row.status || "active", branch,
            Number(row.fee) || 0, row.isIntercompany ? 1 : 0, row.targetBranchId || "", row.targetBranchName || "", row.sourceBranchId || "", row.sourceBranchName || "",
            row.targetCustomerId || "", row.targetCustomerName || "", row.mirrorPaymentId || "", row.receivedByOtherBranch ? 1 : 0
        ];
        case "supplier_payments": return [
            row.id, row.supplierId, row.supplierName, Number(row.amount) || 0, row.date, row.treasuryAccount, row.notes || "", row.status || "active",
            row.isExpense ? 1 : 0, row.expenseCategory || "", branch, Number(row.fee) || 0, row.isIntercompany ? 1 : 0, row.targetBranchId || "", row.targetBranchName || "",
            row.sourceBranchId || "", row.sourceBranchName || "", row.targetSupplierId || "", row.targetSupplierName || "", row.mirrorPaymentId || "", row.paidByOtherBranch ? 1 : 0
        ];
        case "treasury_transfers": return [
            row.id, row.date, row.fromAccount, row.toAccount, Number(row.amount) || 0, Number(row.fee) || 0, row.notes || "", row.status || "active", branch,
            row.isIntercompany ? 1 : 0, row.fromBranchId || "", row.fromBranchName || "", row.toBranchId || "", row.toBranchName || "", row.mirrorTransferId || ""
        ];
        case "expenses": return [row.id, row.category, row.description, row.amount, row.date, branch];
        case "journal_entries": return [row.id, row.date, row.description, row.referenceType || row.type || "Manual", row.referenceId, JSON.stringify(row.lines || []), row.createdAt, branch];
        case "users": return [row.id, row.username, row.password, row.fullName, row.role, JSON.stringify(row.permissions || [])];
        case "logs": return [row.id, row.userId, row.userName, row.action, row.timestamp];
        case "quotations": return [row.id, row.customerId, row.customerName, row.date, row.validUntil, row.total, row.status, row.notes, JSON.stringify(row.items || []), row.deliveryDuration || "", branch];
        case "partners": return [row.id, row.name, row.sharePercentage, row.openingBalance, branch];
        case "partner_transactions": return [row.id, row.partnerId, row.type, row.amount, row.date, row.description, branch];
        case "accounts": return [row.id, row.code, row.name, row.type, row.parentId, branch];
        default: return [];
    }
}

app.listen(PORT, () => {
    console.log("الخادم يعمل على المنفذ " + PORT);
});

process.on("SIGINT", () => {
    db.close(() => { process.exit(0); });
});
