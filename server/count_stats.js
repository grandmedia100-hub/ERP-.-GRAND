const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mediahive.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the mediahive database.');
});

const tables = ['sales_invoices', 'quotations', 'products', 'customers'];

tables.forEach(table => {
    db.get(`SELECT count(*) as count FROM ${table}`, [], (err, row) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log(`${table}: ${row.count}`);
        }
    });
});
