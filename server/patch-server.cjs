const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// 1. Update customers CREATE TABLE
code = code.replace(
    'phone TEXT,\n      address TEXT,\n      openingBalance REAL DEFAULT 0,\n      creditLimit REAL DEFAULT 0',
    'phone TEXT,\n      address TEXT,\n      companyName TEXT,\n      openingBalance REAL DEFAULT 0,\n      creditLimit REAL DEFAULT 0'
);

// 2. Update suppliers CREATE TABLE
code = code.replace(
    'phone TEXT,\n      address TEXT,\n      openingBalance REAL DEFAULT 0\n    );',
    'phone TEXT,\n      address TEXT,\n      companyName TEXT,\n      openingBalance REAL DEFAULT 0\n    );'
);

// 3. Update getPlaceholders
code = code.replace(
    'products: 8, customers: 6, suppliers: 5,',
    'products: 8, customers: 7, suppliers: 6,'
);

// 4. Update getRowValues for customers
code = code.replace(
    "case 'customers': return [row.id, row.name, row.phone, row.address, row.openingBalance, row.creditLimit];",
    "case 'customers': return [row.id, row.name, row.phone, row.address, row.companyName, row.openingBalance, row.creditLimit];"
);

// 5. Update getRowValues for suppliers
code = code.replace(
    "case 'suppliers': return [row.id, row.name, row.phone, row.address, row.openingBalance];",
    "case 'suppliers': return [row.id, row.name, row.phone, row.address, row.companyName, row.openingBalance];"
);

fs.writeFileSync('server.js', code);
console.log('server.js updated successfully');
