// Improved script to completely clear clean database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'mediahive-clean.db');

// First, close any open connections and delete WAL files
const walPath = dbPath + '-wal';
const shmPath = dbPath + '-shm';

console.log('🗑️  تنظيف قاعدة البيانات النظيفة...\n');

// Delete WAL and SHM files if they exist
try {
    if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        console.log('✅ تم حذف ملف WAL');
    }
    if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        console.log('✅ تم حذف ملف SHM');
    }
} catch (err) {
    console.error('⚠️ خطأ في حذف ملفات WAL/SHM:', err.message);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    } else {
        console.log('✅ تم الاتصال بقاعدة البيانات النظيفة\n');
    }
});

const tables = [
    'products', 'customers', 'suppliers', 'sales_invoices',
    'purchase_invoices', 'customer_payments', 'supplier_payments',
    'expenses', 'journal_entries', 'users', 'logs',
    'quotations', 'partners', 'partner_transactions', 'accounts'
];

console.log('🗑️  بدء تفريغ البيانات...\n');

db.serialize(() => {
    // Disable foreign keys temporarily
    db.run("PRAGMA foreign_keys = OFF;");

    db.run("BEGIN TRANSACTION");

    let completed = 0;
    let errors = [];

    tables.forEach(table => {
        db.run(`DELETE FROM ${table}`, [], function (err) {
            if (err) {
                console.error(`❌ خطأ في حذف بيانات ${table}:`, err.message);
                errors.push(`${table}: ${err.message}`);
            } else {
                console.log(`✅ تم تفريغ جدول ${table} (${this.changes} سجل محذوف)`);
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
                            // Re-enable foreign keys
                            db.run("PRAGMA foreign_keys = ON;");

                            // Vacuum to reclaim space
                            db.run("VACUUM;", (err) => {
                                if (err) {
                                    console.error('⚠️ خطأ في VACUUM:', err.message);
                                } else {
                                    console.log('\n✅ تم ضغط قاعدة البيانات (VACUUM)');
                                }

                                console.log('\n✅ تم تفريغ جميع الجداول بنجاح!');
                                console.log('📊 قاعدة البيانات النظيفة جاهزة للاستخدام');

                                db.close((err) => {
                                    if (err) {
                                        console.error('⚠️ خطأ في إغلاق قاعدة البيانات:', err.message);
                                    }
                                    process.exit(0);
                                });
                            });
                        }
                    });
                }
            }
        });
    });
});
