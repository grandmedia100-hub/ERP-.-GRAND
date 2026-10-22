const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'mediahive-clean.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
});

const now = new Date().toISOString();
const today = now.split('T')[0];

console.log('Injecting Manufacturing (Production Order) and Supplier Payment stage into MediaHive ERP...');

db.serialize(() => {
    // 1. Create Finished Good Product: PRD-FIN-001
    db.run(
        `INSERT OR REPLACE INTO products (id, name, category, unit, costPrice, salePrice, quantity, minQuantity, productType, barcode, branchId, sku, warehouseId, warehouseName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'PRD-FIN-001',
            'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            'منتجات كرتون وتغليف تامة الصنع',
            'علبة',
            6.50,
            10.00,
            10000,
            1000,
            'finished_good',
            '622123456002',
            'main',
            'BOX-KRAFT-3020',
            'WH-0002',
            'مخزن المنتجات النهائية'
        ],
        (err) => { if (err) console.error('Error adding finished product:', err); else console.log('✓ Finished product created (PRD-FIN-001)'); }
    );

    // 2. Update Raw Material: consumed all 2,000 kg
    db.run(
        `UPDATE products SET quantity = 0 WHERE id = 'PRD-RAW-001'`,
        (err) => { if (err) console.error('Error updating raw material quantity:', err); else console.log('✓ Raw material stock deducted to 0 kg'); }
    );

    // 3. Bill of Materials (BOM) in kv_store
    const boms = [
        {
            id: 'BOM-2026-001',
            code: 'BOM-2026-001',
            name: 'قائمة مواد علبة كرتون شحن 30×20×15 سم',
            outputProductId: 'PRD-FIN-001',
            outputProductName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            outputQuantity: 1000,
            outputUnit: 'علبة',
            items: [
                {
                    productId: 'PRD-RAW-001',
                    productName: 'ورق كرافت 150 جم (رول خامات)',
                    quantity: 200,
                    unit: 'كجم',
                    unitCost: 30,
                    totalCost: 6000
                }
            ],
            totalCost: 6000,
            isDefault: true,
            status: 'active',
            notes: 'معدل استهلاك الخامة: 200 جرام ورق كرافت للعلبة الواحدة شامل نسبة الهالك',
            createdAt: now
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('billsOfMaterials', ?)`,
        [JSON.stringify(boms)],
        (err) => { if (err) console.error('Error saving BOM:', err); else console.log('✓ Bill of Materials saved (BOM-2026-001)'); }
    );

    // 4. Production Order in kv_store
    const productionOrders = [
        {
            id: 'MFG-2026-001',
            code: 'MFG-2026-001',
            name: 'تشغيل دفعة 10,000 علبة كرتون شحن وتغليف',
            bomId: 'BOM-2026-001',
            bomName: 'قائمة مواد علبة كرتون شحن 30×20×15 سم',
            date: today,
            fromDate: today,
            toDate: today,
            plannedQuantity: 10000,
            producedQuantity: 10000,
            wasteQuantity: 0,
            status: 'completed',
            bomItems: [
                {
                    productId: 'PRD-RAW-001',
                    productName: 'ورق كرافت 150 جم (رول خامات)',
                    quantity: 2000,
                    unit: 'كجم',
                    unitCost: 30,
                    totalCost: 60000
                }
            ],
            rawMaterialCost: 60000,
            expenses: [
                {
                    id: 'EXP-MFG-01',
                    description: 'استهلاك كهرباء وطاقة عنبر الإنتاج',
                    accountId: '5201',
                    accountName: 'مصروفات التشغيل',
                    amount: 3000
                }
            ],
            expensesTotalCost: 3000,
            operations: [
                {
                    id: 'OP-MFG-01',
                    name: 'عمليات تكسير ولصق وتشغيل نصف آلي',
                    durationMinutes: 480,
                    costPerHour: 250,
                    totalCost: 2000
                }
            ],
            operationsTotalCost: 2000,
            scraps: [],
            scrapTotalCost: 0,
            unitCost: 6.50,
            totalCost: 65000,
            outputProductId: 'PRD-FIN-001',
            outputProductName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            outputWarehouseId: 'WH-0002',
            journalEntryId: 'JE-MFG-001',
            notes: 'تم استهلاك الـ 2 طن ورق كرافت المشتراة بالكامل وإنتاج 10,000 علبة تامة وتوريدها لمخزن المنتجات النهائية',
            createdAt: now
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('productionOrders', ?)`,
        [JSON.stringify(productionOrders)],
        (err) => { if (err) console.error('Error saving Production Order:', err); else console.log('✓ Production Order saved (MFG-2026-001)'); }
    );

    // 5. Update Stock Transactions in kv_store (keep previous purchase, append production out & production in)
    db.get(`SELECT value FROM kv_store WHERE key = 'stockTransactions'`, (err, row) => {
        let currentTxs = [];
        if (row && row.value) {
            try { currentTxs = JSON.parse(row.value); } catch(e) {}
        }

        const newTxs = [
            // Outflow: Raw material consumed
            {
                id: 'ST-MFG-OUT-001',
                date: today,
                productId: 'PRD-RAW-001',
                productName: 'ورق كرافت 150 جم (رول خامات)',
                type: 'production_out',
                quantityIn: 0,
                quantityOut: 2000,
                unitCost: 30,
                totalCost: 60000,
                balanceAfter: 0,
                referenceId: 'MFG-2026-001',
                referenceType: 'ProductionOrder',
                notes: 'صرف خامات لأمر تصنيع MFG-2026-001 (تشغيل 10,000 علبة)',
                createdAt: now
            },
            // Inflow: Finished goods produced
            {
                id: 'ST-MFG-IN-001',
                date: today,
                productId: 'PRD-FIN-001',
                productName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
                type: 'production_in',
                quantityIn: 10000,
                quantityOut: 0,
                unitCost: 6.50,
                totalCost: 65000,
                balanceAfter: 10000,
                referenceId: 'MFG-2026-001',
                referenceType: 'ProductionOrder',
                notes: 'توريد إنتاج تام - أمر تصنيع MFG-2026-001 بمخزن المنتجات النهائية',
                createdAt: now
            }
        ];

        const updatedTxs = [...newTxs, ...currentTxs];
        db.run(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('stockTransactions', ?)`,
            [JSON.stringify(updatedTxs)],
            (err) => {
                if (err) console.error('Error updating stock transactions:', err);
                else console.log('✓ Stock movements recorded (raw out, finished in)');
                db.close(() => {
                    console.log('✅ Manufacturing & Supplier Payment stages successfully injected and linked!');
                });
            }
        );
    });

    // 6. Journal Entry for Manufacturing (JE-MFG-001)
    const mfgJournalLines = [
        {
            accountId: '110403',
            accountName: 'مخزون الإنتاج التام',
            debit: 65000,
            credit: 0
        },
        {
            accountId: '110401',
            accountName: 'مخزون الخامات',
            debit: 0,
            credit: 60000
        },
        {
            accountId: '5201',
            accountName: 'مصروفات التشغيل',
            debit: 0,
            credit: 3000
        },
        {
            accountId: '5102',
            accountName: 'تكلفة التصنيع والمصنعيات',
            debit: 0,
            credit: 2000
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-MFG-001',
            today,
            'تنفيذ وترحيل أمر تصنيع MFG-2026-001 - علبة كرتون شحن وتغليف (10,000 علبة)',
            'Manual',
            'MFG-2026-001',
            JSON.stringify(mfgJournalLines),
            now,
            'main'
        ],
        (err) => { if (err) console.error('Error adding MFG journal entry:', err); else console.log('✓ Manufacturing Journal Entry saved (JE-MFG-001)'); }
    );

    // 7. Supplier Payment: سند صرف 20,000 ج.م للمورد شركة الأهرام
    db.run(
        `INSERT OR REPLACE INTO supplier_payments (id, supplierId, supplierName, amount, date, treasuryAccount, notes, status, isExpense, expenseCategory, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'PAY-SUP-001',
            'SUP-001',
            'شركة الأهرام للورق والكرتون',
            20000,
            today,
            'الخزينة الرئيسية',
            'سداد دفعة نقدية تحت حساب فاتورة الشراء رقم INV-PUR-001',
            'active',
            0,
            '',
            'main'
        ],
        (err) => { if (err) console.error('Error adding supplier payment:', err); else console.log('✓ Supplier payment created: PAY-SUP-001 (20,000 EGP)'); }
    );

    // 8. Journal Entry for Supplier Payment (JE-PAY-001)
    const paymentJournalLines = [
        {
            accountId: '2101',
            accountName: 'الموردين (الدائنون)',
            debit: 20000,
            credit: 0
        },
        {
            accountId: '1101',
            accountName: 'الخزينة الرئيسية (النقدية)',
            debit: 0,
            credit: 20000
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-PAY-001',
            today,
            'سند صرف للمورد شركة الأهرام للورق والكرتون (نقدي) - دفعة من الفاتورة INV-PUR-001',
            'Payment',
            'PAY-SUP-001',
            JSON.stringify(paymentJournalLines),
            now,
            'main'
        ],
        (err) => { if (err) console.error('Error adding payment journal entry:', err); else console.log('✓ Supplier payment journal entry saved (JE-PAY-001)'); }
    );

    // 9. Audit Logs
    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-MFG-001',
            'admin',
            'المدير العام',
            'تنفيذ أمر التصنيع MFG-2026-001 وإنتاج 10,000 علبة كرتون شحن وتغليف بتكلفة إجمالية 65,000 ج.م وصرف خامات ورق كرافت',
            now
        ],
        (err) => { if (err) console.error('Error logging MFG:', err); else console.log('✓ Audit log for manufacturing created'); }
    );

    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-PAY-001',
            'admin',
            'المدير العام',
            'تسجيل سند صرف رقم PAY-SUP-001 لسداد دفعة بقيمة 20,000 ج.م للمورد شركة الأهرام من الخزينة الرئيسية',
            now
        ],
        (err) => { if (err) console.error('Error logging payment:', err); else console.log('✓ Audit log for payment created'); }
    );
});
