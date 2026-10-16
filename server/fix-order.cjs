const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
    "case 'customers': return [row.id, row.name, row.phone, row.address, row.companyName, row.openingBalance, row.creditLimit];",
    "case 'customers': return [row.id, row.name, row.phone, row.address, row.openingBalance, row.creditLimit, row.companyName];"
);

code = code.replace(
    "case 'suppliers': return [row.id, row.name, row.phone, row.address, row.companyName, row.openingBalance];",
    "case 'suppliers': return [row.id, row.name, row.phone, row.address, row.openingBalance, row.companyName];"
);

// We should also fix the CREATE TABLE strings in server.js so if it creates from scratch, the order matches getRowValues!
// Wait! If it creates from scratch, the order of columns in CREATE TABLE dictates the order for INSERT INTO VALUES.
// My previous patch modified CREATE TABLE to put companyName in the middle!
// I must revert the CREATE TABLE modifications to put companyName at the END!

code = code.replace(
    'phone TEXT,\n      address TEXT,\n      companyName TEXT,\n      openingBalance REAL DEFAULT 0,\n      creditLimit REAL DEFAULT 0',
    'phone TEXT,\n      address TEXT,\n      openingBalance REAL DEFAULT 0,\n      creditLimit REAL DEFAULT 0,\n      companyName TEXT'
);

code = code.replace(
    'phone TEXT,\n      address TEXT,\n      companyName TEXT,\n      openingBalance REAL DEFAULT 0\n    );',
    'phone TEXT,\n      address TEXT,\n      openingBalance REAL DEFAULT 0,\n      companyName TEXT\n    );'
);

fs.writeFileSync('server.js', code);
console.log('server.js fixed');
