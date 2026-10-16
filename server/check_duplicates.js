const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mediahive.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error(err.message);
});

db.all(`SELECT id, customerName, date, total FROM sales_invoices ORDER BY id`, [], (err, rows) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('--- Sales Invoices ---');
    rows.forEach(row => {
        console.log(`[${row.id}] ${row.customerName} - ${row.total} (${row.date})`);
    });
});
