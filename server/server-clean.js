require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Database setup - CLEAN VERSION (Empty Database)
const dbPath = path.join(__dirname, 'mediahive-clean.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات النظيفة (Clean Version)');

        // تحسينات أداء SQLite للمستخدمين المتعددين
        db.run('PRAGMA journal_mode = WAL;', (err) => {
            if (err) {
                console.error('⚠️ خطأ في تفعيل WAL mode:', err.message);
            } else {
                console.log('✅ تم تفعيل WAL mode - يدعم القراءة والكتابة المتزامنة');
            }
        });

        db.run('PRAGMA synchronous = NORMAL;', (err) => {
            if (err) {
                console.error('⚠️ خطأ في ضبط synchronous:', err.message);
            } else {
                console.log('✅ تم ضبط synchronous إلى NORMAL - توازن بين الأمان والسرعة');
            }
        });

        db.run('PRAGMA cache_size = 10000;', (err) => {
            if (err) {
                console.error('⚠️ خطأ في ضبط cache_size:', err.message);
            } else {
                console.log('✅ تم ضبط cache_size إلى 10000 - تحسين الذاكرة المؤقتة');
            }
        });

        db.run('PRAGMA temp_store = MEMORY;', (err) => {
            if (err) {
                console.error('⚠️ خطأ في ضبط temp_store:', err.message);
            } else {
                console.log('✅ تم ضبط temp_store إلى MEMORY - تخزين مؤقت في الذاكرة');
            }
        });

        // ضبط timeout لتجنب database locked errors
        db.configure('busyTimeout', 5000);
        console.log('✅ تم ضبط busyTimeout إلى 5 ثواني - تقليل أخطاء القفل');

        initializeDatabase();

        // Add deliveryDuration column if not exists
        db.run("ALTER TABLE quotations ADD COLUMN deliveryDuration TEXT;", (err) => {
            if (!err) {
                console.log('✅ تم إضافة عمود deliveryDuration بنجاح');
            } else if (err.message.includes('duplicate column name')) {
                // Column already exists, ignore
            } else {
                console.error('⚠️ خطأ في إضافة deliveryDuration:', err.message);
            }
        });
    }
});

// Initialize database tables
function initializeDatabase() {
    const tables = `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      costPrice REAL,
      salePrice REAL,
      quantity REAL DEFAULT 0,
      minQuantity REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      openingBalance REAL DEFAULT 0,
      creditLimit REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      openingBalance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      customerName TEXT,
      companyName TEXT,
      date TEXT,
      paymentMethod TEXT,
      total REAL,
      invoiceType TEXT DEFAULT 'sale',
      status TEXT DEFAULT 'active',
      notes TEXT,
      items TEXT,
      FOREIGN KEY (customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_invoices (
      id TEXT PRIMARY KEY,
      supplierId TEXT,
      supplierName TEXT,
      companyName TEXT,
      date TEXT,
      paymentMethod TEXT,
      total REAL,
      invoiceType TEXT DEFAULT 'purchase',
      status TEXT DEFAULT 'active',
      notes TEXT,
      items TEXT,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS customer_payments (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      customerName TEXT,
      amount REAL,
      date TEXT,
      treasuryAccount TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id TEXT PRIMARY KEY,
      supplierId TEXT,
      supplierName TEXT,
      amount REAL,
      date TEXT,
      treasuryAccount TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      isExpense INTEGER DEFAULT 0,
      expenseCategory TEXT,
      FOREIGN KEY (supplierId) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT,
      description TEXT,
      amount REAL,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT,
      description TEXT,
      referenceType TEXT,
      referenceId TEXT,
      lines TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      role TEXT,
      permissions TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      userId TEXT,
      userName TEXT,
      action TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      customerId TEXT,
      customerName TEXT,
      date TEXT,
      validUntil TEXT,
      total REAL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      items TEXT
    );

    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      name TEXT,
      sharePercentage REAL,
      openingBalance REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS partner_transactions (
      id TEXT PRIMARY KEY,
      partnerId TEXT,
      type TEXT,
      amount REAL,
      date TEXT,
      description TEXT,
      FOREIGN KEY (partnerId) REFERENCES partners(id)
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT,
      type TEXT,
      parentId TEXT
    );
  `;

    db.exec(tables, (err) => {
        if (err) {
            console.error('❌ خطأ في إنشاء الجداول:', err.message);
        } else {
            console.log('✅ تم إنشاء جميع الجداول بنجاح');
        }
    });
}

// API Routes

// GET all data (initial load)
app.get('/api/sync', (req, res) => {
    const data = {};
    const tables = [
        'products', 'customers', 'suppliers', 'sales_invoices',
        'purchase_invoices', 'customer_payments', 'supplier_payments',
        'expenses', 'journal_entries', 'users', 'logs',
        'quotations', 'partners', 'partner_transactions', 'accounts'
    ];

    let completed = 0;

    tables.forEach(table => {
        db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
            if (err) {
                console.error(`خطأ في قراءة ${table}:`, err.message);
                data[table] = [];
            } else {
                // Parse JSON fields
                data[table] = rows.map(row => {
                    if (table.includes('invoice') && row.items) {
                        row.items = JSON.parse(row.items);
                    }
                    if (table === 'journal_entries' && row.lines) {
                        row.lines = JSON.parse(row.lines);
                    }
                    if (table === 'users' && row.permissions) {
                        row.permissions = JSON.parse(row.permissions);
                    }
                    if (table === 'quotations' && row.items) {
                        row.items = JSON.parse(row.items);
                    }
                    return row;
                });
            }

            completed++;
            if (completed === tables.length) {
                res.json(data);
            }
        });
    });
});

// POST save/update data
app.post('/api/sync', (req, res) => {
    const updates = req.body;
    console.log('📥 تم استقبال بيانات للحفظ... جاري المعالجة');

    const tables = [
        'products', 'customers', 'suppliers', 'sales_invoices',
        'purchase_invoices', 'customer_payments', 'supplier_payments',
        'expenses', 'journal_entries', 'users', 'logs',
        'quotations', 'partners', 'partner_transactions', 'accounts'
    ];

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let errors = [];

        tables.forEach(table => {
            if (updates[table] && Array.isArray(updates[table])) {
                // Simple strategy: Clear table and re-insert (Full Sync)
                // Ideally we would do upsert, but for migration purposes this is safest to ensure exact match with frontend

                // However, to be safer against partial wipes, we only clear if we have data to insert
                // OR if the array is explicitly empty (implying deletion).
                // For now, let's assume the frontend sends the *complete* state.

                db.run(`DELETE FROM ${table}`, [], (err) => {
                    if (err) errors.push(`Error clearing ${table}: ${err.message}`);
                });

                const stmt = db.prepare(`INSERT INTO ${table} VALUES (${getPlaceholders(table)})`);

                updates[table].forEach(row => {
                    const values = getRowValues(table, row);
                    stmt.run(values, (err) => {
                        if (err) errors.push(`Error inserting into ${table}: ${err.message}`);
                    });
                });

                stmt.finalize();
            }
        });

        db.run("COMMIT", (err) => {
            if (err || errors.length > 0) {
                console.error('❌ أخطاء أثناء الحفظ:', errors);
                db.run("ROLLBACK");
                res.status(500).json({ success: false, message: 'فشل الحفظ', errors });
            } else {
                console.log('✅ تم حفظ جميع البيانات بنجاح في قاعدة البيانات');
                res.json({ success: true, message: 'تم الحفظ بنجاح' });
            }
        });
    });
});

// Helper to formulate placeholders (?, ?, ?)
function getPlaceholders(table) {
    const schemas = {
        products: 8, customers: 6, suppliers: 5,
        sales_invoices: 11, purchase_invoices: 11,
        customer_payments: 8, supplier_payments: 10,
        expenses: 5, journal_entries: 7, users: 6, logs: 5,
        quotations: 10, partners: 4, partner_transactions: 6, accounts: 5
    };
    return Array(schemas[table]).fill('?').join(',');
}

// Helper to extract values in correct order
function getRowValues(table, row) {
    // Mapping matches the CREATE TABLE order in initializeDatabase
    switch (table) {
        case 'products': return [row.id, row.name, row.category, row.unit, row.costPrice, row.salePrice, row.quantity, row.minQuantity];
        case 'customers': return [row.id, row.name, row.phone, row.address, row.openingBalance, row.creditLimit];
        case 'suppliers': return [row.id, row.name, row.phone, row.address, row.openingBalance];
        case 'sales_invoices': return [row.id, row.customerId, row.customerName, row.companyName, row.date, row.paymentMethod, row.total, row.invoiceType, row.status, row.notes, JSON.stringify(row.items)];
        case 'purchase_invoices': return [row.id, row.supplierId, row.supplierName, row.companyName, row.date, row.paymentMethod, row.total, row.invoiceType, row.status, row.notes, JSON.stringify(row.items)];
        case 'customer_payments': return [row.id, row.customerId, row.customerName, row.amount, row.date, row.treasuryAccount, row.notes, row.status];
        case 'supplier_payments': return [row.id, row.supplierId, row.supplierName, row.amount, row.date, row.treasuryAccount, row.notes, row.status, row.isExpense ? 1 : 0, row.expenseCategory];
        case 'expenses': return [row.id, row.category, row.description, row.amount, row.date];
        case 'journal_entries': return [row.id, row.date, row.description, row.referenceType, row.referenceId, JSON.stringify(row.lines), row.createdAt];
        case 'users': return [row.id, row.username, row.password, row.fullName, row.role, JSON.stringify(row.permissions)];
        case 'logs': return [row.id, row.userId, row.userName, row.action, row.timestamp];
        case 'quotations': return [row.id, row.customerId, row.customerName, row.date, row.validUntil, row.total, row.status, row.notes, JSON.stringify(row.items), row.deliveryDuration || ''];
        case 'partners': return [row.id, row.name, row.sharePercentage, row.openingBalance];
        case 'partner_transactions': return [row.id, row.partnerId, row.type, row.amount, row.date, row.description];
        case 'accounts': return [row.id, row.code, row.name, row.type, row.parentId];
        default: return [];
    }
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'الخادم يعمل بنجاح - Clean Version' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 الخادم يعمل على المنفذ ${PORT} - Clean Version`);
    console.log(`🌐 يمكنك الوصول عبر: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('تم إغلاق الاتصال بقاعدة البيانات');
        process.exit(0);
    });
});
