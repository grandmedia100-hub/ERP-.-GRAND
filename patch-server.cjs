const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

const crudCode = `
// --- GENERIC CRUD ENDPOINTS FOR REAL-TIME SYNC ---
const ALLOWED_TABLES = [
    'products', 'customers', 'suppliers', 'sales_invoices',
    'purchase_invoices', 'customer_payments', 'supplier_payments',
    'expenses', 'journal_entries', 'users', 'logs',
    'quotations', 'partners', 'partner_transactions', 'accounts'
];

// 1. GET all records from a table
app.get('/api/:table', (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    
    db.all(\`SELECT * FROM \${table}\`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsed = rows.map(row => {
            if (row.items) row.items = JSON.parse(row.items);
            if (row.lines) row.lines = JSON.parse(row.lines);
            if (row.permissions) row.permissions = JSON.parse(row.permissions);
            return row;
        });
        res.json(parsed);
    });
});

// 2. POST (Create) a record
app.post('/api/:table', (req, res) => {
    const table = req.params.table;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    
    const data = req.body;
    const values = getRowValues(table, data);
    const placeholders = getPlaceholders(table);
    
    const query = \`INSERT INTO \${table} VALUES (\${placeholders})\`;
    db.run(query, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: data.id });
    });
});

// 3. PUT (Update) a record
app.put('/api/:table/:id', (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    
    const data = req.body;
    
    db.serialize(() => {
        db.run(\`DELETE FROM \${table} WHERE id = ?\`, [id], (err) => {
            if (err) console.error('Delete before update failed', err);
        });
        
        const values = getRowValues(table, data);
        const placeholders = getPlaceholders(table);
        const query = \`INSERT INTO \${table} VALUES (\${placeholders})\`;
        
        db.run(query, values, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: data.id });
        });
    });
});

// 4. DELETE a record
app.delete('/api/:table/:id', (req, res) => {
    const table = req.params.table;
    const id = req.params.id;
    if (!ALLOWED_TABLES.includes(table)) return res.status(400).json({ error: 'Invalid table' });
    
    db.run(\`DELETE FROM \${table} WHERE id = ?\`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, deleted: this.changes });
    });
});
// ------------------------------------------------
`;

if (!code.includes('GENERIC CRUD ENDPOINTS')) {
    code = code.replace('// API Routes', '// API Routes\n' + crudCode);
    fs.writeFileSync('server/server.js', code);
    console.log('CRUD endpoints added to server.js');
} else {
    console.log('CRUD endpoints already exist.');
}
