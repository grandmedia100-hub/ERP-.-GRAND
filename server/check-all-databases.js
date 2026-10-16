// Script to check data in all databases
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const databases = [
    { name: 'Original', file: 'mediahive.db' },
    { name: 'Clean', file: 'mediahive-clean.db' },
    { name: 'Data', file: 'mediahive-data.db' }
];

async function checkDatabase(dbName, dbFile) {
    return new Promise((resolve) => {
        const dbPath = path.join(__dirname, dbFile);
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error(`❌ خطأ في فتح ${dbName}:`, err.message);
                resolve();
                return;
            }

            console.log(`\n📊 فحص قاعدة البيانات: ${dbName} (${dbFile})`);
            console.log('='.repeat(60));

            const tables = ['customers', 'suppliers', 'products', 'sales_invoices', 'quotations'];
            let completed = 0;

            tables.forEach(table => {
                db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
                    if (err) {
                        console.log(`  ${table}: خطأ - ${err.message}`);
                    } else {
                        console.log(`  ${table}: ${row.count} سجل`);
                    }

                    completed++;
                    if (completed === tables.length) {
                        db.close();
                        resolve();
                    }
                });
            });
        });
    });
}

async function main() {
    console.log('🔍 فحص محتوى قواعد البيانات...\n');

    for (const db of databases) {
        await checkDatabase(db.name, db.file);
    }

    console.log('\n✅ انتهى الفحص');
}

main();
