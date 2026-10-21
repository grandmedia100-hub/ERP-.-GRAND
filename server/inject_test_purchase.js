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

console.log('Injecting real simulated purchase cycle test into MediaHive ERP...');

db.serialize(() => {
    // 1. Supplier: شركة الأهرام للورق والكرتون
    db.run(
        `INSERT OR REPLACE INTO suppliers (id, name, phone, address, openingBalance, companyName, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['SUP-001', 'شركة الأهرام للورق والكرتون', '01012345678', 'مدينة العبور - المنطقة الصناعية', 0, 'شركة الأهرام للتجارة والتوريدات', 'main'],
        (err) => { if (err) console.error('Error adding supplier:', err); else console.log('✓ Supplier created: SUP-001'); }
    );

    // 2. Product: خامة ورق كرافت
    db.run(
        `INSERT OR REPLACE INTO products (id, name, category, unit, costPrice, salePrice, quantity, minQuantity, productType, barcode, branchId, sku, warehouseId, warehouseName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'PRD-RAW-001',
            'ورق كرافت 150 جم (رول خامات)',
            'خامات ومستلزمات إنتاج',
            'كجم',
            30,
            38,
            2000,
            500,
            'raw_material',
            '622123456001',
            'main',
            'RAW-KRAFT-150',
            'WH-0003',
            'مخزن المواد الخام'
        ],
        (err) => { if (err) console.error('Error adding product:', err); else console.log('✓ Product created: PRD-RAW-001'); }
    );

    // 3. Purchase Request (PR) in KV store
    const purchaseRequests = [
        {
            id: 'PR-2026-001',
            requestNumber: 'PR-2026-001',
            date: today,
            requiredDate: '2026-10-25',
            department: 'قسم الإنتاج والتصنيع',
            requestedBy: 'مهندس الإنتاج - أحمد محمود',
            priority: 'عاجل',
            status: 'converted',
            notes: 'طلب توريد خامات عاجل لتنفيذ خطة تشغيل علب الكرتون',
            items: [
                {
                    productId: 'PRD-RAW-001',
                    productName: 'ورق كرافت 150 جم (رول خامات)',
                    productCode: 'RAW-KRAFT-150',
                    quantity: 2000,
                    unit: 'كجم',
                    estimatedUnitPrice: 30,
                    estimatedTotal: 60000,
                    notes: 'رولات نقية 150 جم'
                }
            ],
            totalEstimatedCost: 60000,
            createdAt: now
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('purchaseRequests', ?)`,
        [JSON.stringify(purchaseRequests)],
        (err) => { if (err) console.error('Error adding PR:', err); else console.log('✓ Purchase Request saved (PR-2026-001)'); }
    );

    // 4. Purchase Order (PO) in KV store
    const purchaseOrders = [
        {
            id: 'PO-2026-001',
            orderNumber: 'PO-2026-001',
            requestId: 'PR-2026-001',
            date: today,
            expectedDeliveryDate: '2026-10-23',
            supplierId: 'SUP-001',
            supplierName: 'شركة الأهرام للورق والكرتون',
            companyName: 'شركة الأهرام للتجارة والتوريدات',
            deliveryLocation: 'مخزن المواد الخام (WH-0003)',
            paymentTerms: 'آجل 30 يوم من تاريخ الفاتورة',
            status: 'completed',
            notes: 'مُحول من طلب شراء رقم PR-2026-001 - أمر توريد وتشغيل خامات',
            items: [
                {
                    productId: 'PRD-RAW-001',
                    productName: 'ورق كرافت 150 جم (رول خامات)',
                    productCode: 'RAW-KRAFT-150',
                    quantity: 2000,
                    unit: 'كجم',
                    price: 30,
                    total: 60000
                }
            ],
            subTotal: 60000,
            discountValue: 0,
            discountType: 'amount',
            total: 60000,
            createdAt: now
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('purchaseOrders', ?)`,
        [JSON.stringify(purchaseOrders)],
        (err) => { if (err) console.error('Error adding PO:', err); else console.log('✓ Purchase Order saved (PO-2026-001)'); }
    );

    // 5. Purchase Invoice (INV-PUR-001) in purchase_invoices table
    const invoiceItems = [
        {
            productId: 'PRD-RAW-001',
            productName: 'ورق كرافت 150 جم (رول خامات)',
            quantity: 2000,
            price: 30,
            total: 60000,
            unit: 'كجم',
            itemType: 'product'
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO purchase_invoices (id, supplierId, supplierName, companyName, date, paymentMethod, total, invoiceType, status, notes, items, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'INV-PUR-001',
            'SUP-001',
            'شركة الأهرام للورق والكرتون',
            'شركة الأهرام للتجارة والتوريدات',
            today,
            'اجل',
            60000,
            'purchase',
            'active',
            'عن أمر شراء رقم PO-2026-001 - استلام رولات كرافت 150 جم بمخزن المواد الخام',
            JSON.stringify(invoiceItems),
            'main'
        ],
        (err) => { if (err) console.error('Error adding invoice:', err); else console.log('✓ Purchase Invoice saved (INV-PUR-001)'); }
    );

    // 6. Journal Entry in journal_entries table
    const journalLines = [
        {
            accountId: '110401',
            accountName: 'مخزون الخامات',
            debit: 60000,
            credit: 0
        },
        {
            accountId: '2101',
            accountName: 'الموردين (الدائنون)',
            debit: 0,
            credit: 60000
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-PUR-001',
            today,
            'فاتورة مشتريات رقم INV-PUR-001 - شركة الأهرام للورق والكرتون (اجل)',
            'PurchaseInvoice',
            'INV-PUR-001',
            JSON.stringify(journalLines),
            now,
            'main'
        ],
        (err) => { if (err) console.error('Error adding journal entry:', err); else console.log('✓ Journal Entry saved (JE-PUR-001)'); }
    );

    // 7. Stock Transaction in kv_store
    const stockTransactions = [
        {
            id: 'ST-PUR-001',
            date: today,
            productId: 'PRD-RAW-001',
            productName: 'ورق كرافت 150 جم (رول خامات)',
            type: 'purchase',
            quantityIn: 2000,
            quantityOut: 0,
            unitCost: 30,
            totalCost: 60000,
            balanceAfter: 2000,
            referenceId: 'INV-PUR-001',
            referenceType: 'PurchaseInvoice',
            notes: 'فاتورة مشتريات توريد رولات خامات من شركة الأهرام للورق والكرتون',
            createdAt: now
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('stockTransactions', ?)`,
        [JSON.stringify(stockTransactions)],
        (err) => { if (err) console.error('Error adding stock transaction:', err); else console.log('✓ Stock Transaction saved (ST-PUR-001)'); }
    );

    // 8. Warehouses in kv_store
    const warehouses = [
        { id: 'WH-0001', code: 'GEN', name: 'المخزن الرئيسي', location: 'المقر الرئيسي', isActive: true },
        { id: 'WH-0002', code: 'FIN', name: 'مخزن المنتجات النهائية', location: 'المصنع', isActive: true },
        { id: 'WH-0003', code: 'RAW', name: 'مخزن المواد الخام', location: 'عنبر الخامات', isActive: true }
    ];

    db.run(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('warehouses', ?)`,
        [JSON.stringify(warehouses)],
        (err) => { if (err) console.error('Error setting warehouses:', err); else console.log('✓ Warehouses registered'); }
    );

    // 9. Audit Log
    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-PUR-001',
            'admin',
            'المدير العام',
            'إضافة فاتورة مشتريات رقم INV-PUR-001 من المورد شركة الأهرام للورق والكرتون بمبلغ 60,000 ج.م محولة من أمر الشراء PO-2026-001',
            now
        ],
        (err) => { if (err) console.error('Error logging:', err); else console.log('✓ Audit log created'); }
    );

    db.close(() => {
        console.log('✅ Real simulation test injected successfully into database.');
    });
});
