const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('mediahive-clean.db');

db.serialize(() => {
    // Fix Customers
    db.all(`SELECT id, openingBalance, creditLimit, companyName FROM customers`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        
        let fixed = 0;
        rows.forEach(row => {
            // Check if openingBalance is NaN or a string (like 'شركة التمساح')
            if (isNaN(parseFloat(row.openingBalance)) || typeof row.openingBalance === 'string' && row.openingBalance.trim() !== '' && isNaN(Number(row.openingBalance))) {
                
                const realCompanyName = row.openingBalance;
                const realOpeningBalance = row.creditLimit;
                const realCreditLimit = row.companyName;

                db.run(
                    `UPDATE customers SET companyName = ?, openingBalance = ?, creditLimit = ? WHERE id = ?`,
                    [realCompanyName, parseFloat(realOpeningBalance) || 0, parseFloat(realCreditLimit) || 0, row.id],
                    (err) => {
                        if (err) console.error('Error fixing customer', row.id, err);
                        else console.log(`Fixed customer ${row.id}`);
                    }
                );
                fixed++;
            }
        });
        console.log(`Finished checking customers. Fixed ${fixed} rows.`);
    });

    // Fix Suppliers
    // Previous order: row.id, row.name, row.phone, row.address, row.companyName, row.openingBalance
    // Table order: id, name, phone, address, openingBalance, companyName
    // Table openingBalance got row.companyName
    // Table companyName got row.openingBalance
    db.all(`SELECT id, openingBalance, companyName FROM suppliers`, [], (err, rows) => {
        if (err) return;
        
        let fixed = 0;
        rows.forEach(row => {
            if (isNaN(parseFloat(row.openingBalance)) || typeof row.openingBalance === 'string' && row.openingBalance.trim() !== '' && isNaN(Number(row.openingBalance))) {
                
                const realCompanyName = row.openingBalance;
                const realOpeningBalance = row.companyName;

                db.run(
                    `UPDATE suppliers SET companyName = ?, openingBalance = ? WHERE id = ?`,
                    [realCompanyName, parseFloat(realOpeningBalance) || 0, row.id],
                    (err) => {
                        if (err) console.error('Error fixing supplier', row.id, err);
                        else console.log(`Fixed supplier ${row.id}`);
                    }
                );
                fixed++;
            }
        });
        console.log(`Finished checking suppliers. Fixed ${fixed} rows.`);
    });
});
