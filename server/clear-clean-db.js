// Script to clear all data from mediahive-clean.db while keeping table structure
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mediahive-clean.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات النظيفة');
    }
});

const tables = [
    'products', 'customers', 'suppliers', 'sales_invoices',
    'purchase_invoices', 'customer_payments', 'supplier_payments',
    'expenses', 'journal_entries', 'users', 'logs',
    'quotations', 'partners', 'partner_transactions', 'accounts'
];

console.log('🗑️  بدء تفريغ البيانات من قاعدة البيانات النظيفة...\n');

db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    let completed = 0;
    let errors = [];

    tables.forEach(table => {
        db.run(`DELETE FROM ${table}`, [], (err) => {
            if (err) {
                console.error(`❌ خطأ في حذف بيانات ${table}:`, err.message);
                errors.push(`${table}: ${err.message}`);
            } else {
                console.log(`✅ تم تفريغ جدول ${table}`);
            }

            completed++;
            if (completed === tables.length) {
                if (errors.length > 0) {
                    console.error('\n❌ حدثت أخطاء أثناء التفريغ:');
                    errors.forEach(err => console.error('  -', err));
                    db.run("ROLLBACK");
                    db.close();
                    process.exit(1);
                } else {
                    db.run("COMMIT", (err) => {
                        if (err) {
                            console.error('❌ خطأ في حفظ التغييرات:', err.message);
                            db.close();
                            process.exit(1);
                        } else {
                            console.log('\n✅ تم تفريغ جميع الجداول بنجاح!');
                            console.log('📊 قاعدة البيانات النظيفة جاهزة للاستخدام');
                            db.close();
                            process.exit(0);
                        }
                    });
                }
            }
        });
    });
});
