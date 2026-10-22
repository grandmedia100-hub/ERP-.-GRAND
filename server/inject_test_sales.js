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

console.log('Injecting Sales Cycle (Quotation -> Sales Invoice -> Stock Deduction -> Revenue & COGS -> Customer Collection) into MediaHive ERP...');

db.serialize(() => {
    // 1. Create Customer: CUS-001
    db.run(
        `INSERT OR REPLACE INTO customers (id, name, phone, address, openingBalance, creditLimit, companyName, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'CUS-001',
            'شركة النيل للصناعات الغذائية والتصدير',
            '01234567890',
            'مدينة السادس من أكتوبر - المنطقة الصناعية الثالثة',
            0,
            100000,
            'شركة النيل للصناعات الغذائية والتصدير',
            'main'
        ],
        (err) => { if (err) console.error('Error adding customer:', err); else console.log('✓ Customer created (CUS-001)'); }
    );

    // 2. Quotation (QT-2026-001) in quotations table
    const quotationItems = [
        {
            productId: 'PRD-FIN-001',
            productName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            quantity: 6000,
            unit: 'علبة',
            unitPrice: 10.00,
            price: 10.00,
            total: 60000,
            notes: 'كرتون مضلع ثلاثي الطبقات عالي التحمل'
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO quotations (id, customerId, customerName, date, validUntil, total, status, notes, items, deliveryDuration, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'QT-2026-001',
            'CUS-001',
            'شركة النيل للصناعات الغذائية والتصدير',
            today,
            '2026-11-05',
            60000,
            'accepted',
            'عرض أسعار توريد كراتين شحن وتغليف جاهزة بالمستودع - تم القبول والاعتماد',
            JSON.stringify(quotationItems),
            'توريد فوري من المخزن',
            'main'
        ],
        (err) => { if (err) console.error('Error adding quotation:', err); else console.log('✓ Quotation created (QT-2026-001)'); }
    );

    // 3. Sales Invoice (INV-SALE-001) in sales_invoices table
    const salesInvoiceItems = [
        {
            productId: 'PRD-FIN-001',
            productName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            quantity: 6000,
            price: 10.00,
            total: 60000,
            unit: 'علبة',
            itemType: 'product'
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO sales_invoices (id, customerId, customerName, companyName, date, paymentMethod, total, invoiceType, status, notes, items, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'INV-SALE-001',
            'CUS-001',
            'شركة النيل للصناعات الغذائية والتصدير',
            'شركة النيل للصناعات الغذائية والتصدير',
            today,
            'اجل',
            60000,
            'sale',
            'active',
            'عن عرض أسعار رقم QT-2026-001 - بيع 6,000 علبة كرتون شحن وتغليف بسعر 10.00 ج.م للعلبة (آجل 15 يوم)',
            JSON.stringify(salesInvoiceItems),
            'main'
        ],
        (err) => { if (err) console.error('Error adding sales invoice:', err); else console.log('✓ Sales Invoice created (INV-SALE-001)'); }
    );

    // 4. Update Finished Good Stock: 10,000 produced - 6,000 sold = 4,000 remaining
    db.run(
        `UPDATE products SET quantity = 4000 WHERE id = 'PRD-FIN-001'`,
        (err) => { if (err) console.error('Error updating product stock:', err); else console.log('✓ Finished product stock deducted to 4,000 units'); }
    );

    // 5. Append Stock Transaction to kv_store
    db.get(`SELECT value FROM kv_store WHERE key = 'stockTransactions'`, (err, row) => {
        let currentTxs = [];
        if (row && row.value) {
            try { currentTxs = JSON.parse(row.value); } catch(e) {}
        }

        const newSaleTx = {
            id: 'ST-SALE-001',
            date: today,
            productId: 'PRD-FIN-001',
            productName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            type: 'sale',
            quantityIn: 0,
            quantityOut: 6000,
            unitCost: 6.50,
            totalCost: 39000,
            balanceAfter: 4000,
            referenceId: 'INV-SALE-001',
            referenceType: 'SalesInvoice',
            notes: 'صرف بضاعة مباعة للعميل شركة النيل للصناعات الغذائية - فاتورة INV-SALE-001',
            createdAt: now
        };

        const updatedTxs = [newSaleTx, ...currentTxs];
        db.run(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('stockTransactions', ?)`,
            [JSON.stringify(updatedTxs)],
            (err) => {
                if (err) console.error('Error updating stock transactions:', err);
                else console.log('✓ Stock movement recorded (Sale: 6,000 units out)');
                db.close(() => {
                    console.log('✅ Sales and Customer Collection stages successfully injected and linked!');
                });
            }
        );
    });

    // 6. Journal Entry for Sales & COGS (JE-SALE-001)
    // Revenue: 60,000 (Dr Customer 1103, Cr Sales 4101)
    // COGS: 39,000 (Dr COGS 5101, Cr Finished Goods 110403)
    const salesJournalLines = [
        {
            accountId: '1103',
            accountName: 'العملاء (المدينون)',
            debit: 60000,
            credit: 0
        },
        {
            accountId: '4101',
            accountName: 'إيرادات المبيعات',
            debit: 0,
            credit: 60000
        },
        {
            accountId: '5101',
            accountName: 'تكلفة البضاعة المباعة (COGS)',
            debit: 39000,
            credit: 0
        },
        {
            accountId: '110403',
            accountName: 'مخزون الإنتاج التام',
            debit: 0,
            credit: 39000
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-SALE-001',
            today,
            'فاتورة مبيعات رقم INV-SALE-001 - شركة النيل للصناعات الغذائية (اجل) مع تكلفة المبيعات',
            'SalesInvoice',
            'INV-SALE-001',
            JSON.stringify(salesJournalLines),
            now,
            'main'
        ],
        (err) => { if (err) console.error('Error adding sales journal entry:', err); else console.log('✓ Sales & COGS Journal Entry saved (JE-SALE-001)'); }
    );

    // 7. Customer Payment: سند قبض وتحصيل 30,000 ج.م من العميل بالخزينة
    db.run(
        `INSERT OR REPLACE INTO customer_payments (id, customerId, customerName, amount, date, treasuryAccount, notes, status, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'REC-CUS-001',
            'CUS-001',
            'شركة النيل للصناعات الغذائية والتصدير',
            30000,
            today,
            'الخزينة الرئيسية',
            'تحصيل دفعة نقدية بالصندوق تحت حساب فاتورة المبيعات رقم INV-SALE-001',
            'active',
            'main'
        ],
        (err) => { if (err) console.error('Error adding customer payment:', err); else console.log('✓ Customer receipt created: REC-CUS-001 (30,000 EGP)'); }
    );

    // 8. Journal Entry for Customer Collection (JE-REC-001)
    const collectionJournalLines = [
        {
            accountId: '1101',
            accountName: 'الخزينة الرئيسية (النقدية)',
            debit: 30000,
            credit: 0
        },
        {
            accountId: '1103',
            accountName: 'العملاء (المدينون)',
            debit: 0,
            credit: 30000
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-REC-001',
            today,
            'سند قبض وتحصيل نقدي من العميل شركة النيل للصناعات الغذائية - دفعة من الفاتورة INV-SALE-001',
            'Payment',
            'REC-CUS-001',
            JSON.stringify(collectionJournalLines),
            now,
            'main'
        ],
        (err) => { if (err) console.error('Error adding collection journal entry:', err); else console.log('✓ Customer receipt journal entry saved (JE-REC-001)'); }
    );

    // 9. Audit Logs
    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-SALE-001',
            'admin',
            'المدير العام',
            'إصدار فاتورة مبيعات رقم INV-SALE-001 للعميل شركة النيل للصناعات الغذائية بمبلغ 60,000 ج.م وصرف 6,000 علبة كرتون من المخزن',
            now
        ],
        (err) => { if (err) console.error('Error logging sale:', err); else console.log('✓ Audit log for sale created'); }
    );

    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-REC-001',
            'admin',
            'المدير العام',
            'تحصيل سند قبض رقم REC-CUS-001 بمبلغ 30,000 ج.م نقداً بالخزينة الرئيسية من العميل شركة النيل',
            now
        ],
        (err) => { if (err) console.error('Error logging collection:', err); else console.log('✓ Audit log for collection created'); }
    );
});
