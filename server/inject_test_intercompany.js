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

console.log('Injecting Full Inter-Company Simulation (Grand Media <-> Factory) into MediaHive ERP...');

db.serialize(() => {
    // 0. Ensure Intercompany Account (2102) and Accounts in both branches
    const accountsToEnsure = [
        // Main Branch (جراند ميديا)
        ['acc_2102_main', '2102', 'جاري الشركات الشقيقة (المصنع)', 'دائن', '21', 'main'],
        ['acc_1101_main', '1101', 'الخزينة الرئيسية (جراند ميديا)', 'مدين', '11', 'main'],
        ['acc_110403_main', '110403', 'مخزون الإنتاج التام والكرتون', 'مدين', '1104', 'main'],
        ['acc_4101_main', '4101', 'إيرادات المبيعات', 'دائن', '41', 'main'],
        ['acc_2101_main', '2101', 'الموردين (الدائنون)', 'دائن', '21', 'main'],

        // Factory Branch (المصنع)
        ['acc_2102_factory', '2102', 'جاري الشركات الشقيقة (جراند ميديا)', 'دائن', '21', 'factory'],
        ['acc_1101_factory', '1101', 'خزينة المصنع الرئيسية', 'مدين', '11', 'factory'],
        ['acc_110403_factory', '110403', 'مخزون الإنتاج التام', 'مدين', '1104', 'factory'],
        ['acc_4101_factory', '4101', 'إيرادات التشغيل والمبيعات البينية', 'دائن', '41', 'factory'],
        ['acc_2101_factory', '2101', 'موردي خامات ومستلزمات المصنع', 'دائن', '21', 'factory']
    ];

    accountsToEnsure.forEach(([id, code, name, type, parentId, branchId]) => {
        db.run(
            `INSERT OR REPLACE INTO accounts (id, code, name, type, parentId, branchId) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, code, name, type, parentId, branchId]
        );
    });
    console.log('✓ Intercompany chart of accounts seeded for both branches');

    // =========================================================================
    // OPERATION 1: Inter-company Treasury Transfer (15,000 EGP from Grand Media to Factory)
    // =========================================================================
    // 1a. Transfer in Grand Media (Main)
    db.run(
        `INSERT OR REPLACE INTO treasury_transfers
         (id, date, fromAccount, toAccount, amount, fee, notes, status, branchId, isIntercompany, fromBranchId, fromBranchName, toBranchId, toBranchName, mirrorTransferId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'TR-IC-GM-001',
            today,
            'الخزينة الرئيسية',
            'خزينة المصنع الرئيسية',
            15000,
            0,
            'تحويل سيولة نقدية من الإدارة لتمويل مصاريف تشغيل عنبر الإنتاج بالمصنع',
            'active',
            'main',
            1,
            'main',
            'جراند ميديا',
            'factory',
            'المصنع',
            'TR-IC-TR-IC-GM-001'
        ]
    );

    // 1b. Mirrored Transfer in Factory
    db.run(
        `INSERT OR REPLACE INTO treasury_transfers
         (id, date, fromAccount, toAccount, amount, fee, notes, status, branchId, isIntercompany, fromBranchId, fromBranchName, toBranchId, toBranchName, mirrorTransferId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'TR-IC-TR-IC-GM-001',
            today,
            'الخزينة الرئيسية',
            'خزينة المصنع الرئيسية',
            15000,
            0,
            'تحويل بيني وارد من جراند ميديا [الخزينة الرئيسية] - تمويل مصاريف التشغيل',
            'active',
            'factory',
            1,
            'main',
            'جراند ميديا',
            'factory',
            'المصنع',
            'TR-IC-GM-001'
        ]
    );

    // 1c. Journal Entry in Grand Media for Transfer
    const jeTrGM = [
        { accountId: '2102', accountName: 'جاري شركة المصنع', debit: 15000, credit: 0 },
        { accountId: '1101', accountName: 'الخزينة الرئيسية (جراند ميديا)', debit: 0, credit: 15000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-TR-IC-GM-001',
            today,
            'تحويل بيني إلى المصنع (خزينة المصنع الرئيسية) - تمويل تشغيل',
            'Manual',
            'TR-IC-GM-001',
            JSON.stringify(jeTrGM),
            now,
            'main'
        ]
    );

    // 1d. Journal Entry in Factory for Received Transfer
    const jeTrFac = [
        { accountId: '1101', accountName: 'خزينة المصنع الرئيسية', debit: 15000, credit: 0 },
        { accountId: '2102', accountName: 'جاري شركة جراند ميديا', debit: 0, credit: 15000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-TR-IC-FAC-001',
            today,
            'تحويل بيني وارد من جراند ميديا (الخزينة الرئيسية) - استلام نقدية بالصندوق',
            'Manual',
            'TR-IC-TR-IC-GM-001',
            JSON.stringify(jeTrFac),
            now,
            'factory'
        ]
    );
    console.log('✓ Operation 1 (Inter-company Treasury Transfer 15,000 EGP) injected in both branches');

    // =========================================================================
    // OPERATION 2: Inter-company Goods Supply (Factory supplies 3,000 boxes @ 8 EGP = 24,000 EGP to Grand Media)
    // =========================================================================
    // 2a. Sales Invoice in Factory (بيع بيني لجراند ميديا)
    const icItems = [
        {
            productId: 'PRD-FIN-001',
            productName: 'علبة كرتون شحن وتغليف 30×20×15 سم (إنتاج تام)',
            quantity: 3000,
            price: 8.00,
            total: 24000,
            unit: 'علبة',
            itemType: 'product'
        }
    ];

    db.run(
        `INSERT OR REPLACE INTO sales_invoices
         (id, customerId, customerName, companyName, date, paymentMethod, total, invoiceType, status, notes, items, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'INV-IC-FAC-001',
            'ic_main',
            'شركة جراند ميديا (الفرع الرئيسي)',
            'شركة جراند ميديا للإعلان والتجارة',
            today,
            'اجل',
            24000,
            'sale',
            'active',
            'توريد بضاعة وإنتاج كرتون شحن بيني لفرع جراند ميديا الرئيسي (3,000 علبة)',
            JSON.stringify(icItems),
            'factory'
        ]
    );

    // 2b. Purchase Invoice in Grand Media (شراء بيني وارد من المصنع)
    db.run(
        `INSERT OR REPLACE INTO purchase_invoices
         (id, supplierId, supplierName, companyName, date, paymentMethod, total, invoiceType, status, notes, items, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'PUR-IC-INV-IC-FAC-001',
            'factory',
            'المصنع (فرع الإنتاج والتشغيل)',
            'مصنع كرتون وتغليف جراند',
            today,
            'اجل',
            24000,
            'purchase',
            'active',
            'حركة بينية واردة آلياً من (المصنع) - استلام 3,000 علبة كرتون شحن جاهزة',
            JSON.stringify(icItems),
            'main'
        ]
    );

    // 2c. Journal Entry in Factory for Intercompany Sale
    const jeSaleFac = [
        { accountId: '2102', accountName: 'جاري شركة جراند ميديا', debit: 24000, credit: 0 },
        { accountId: '4101', accountName: 'إيرادات التشغيل والمبيعات البينية', debit: 0, credit: 24000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-IC-SALE-FAC-001',
            today,
            'فاتورة مبيعات بينية رقم INV-IC-FAC-001 لفرع جراند ميديا - توريد 3,000 علبة',
            'SalesInvoice',
            'INV-IC-FAC-001',
            JSON.stringify(jeSaleFac),
            now,
            'factory'
        ]
    );

    // 2d. Journal Entry in Grand Media for Intercompany Purchase
    const jePurGM = [
        { accountId: '110403', accountName: 'مخزون الإنتاج التام والكرتون', debit: 24000, credit: 0 },
        { accountId: '2102', accountName: 'جاري شركة المصنع', debit: 0, credit: 24000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-IC-PUR-GM-001',
            today,
            'فاتورة مشتريات بينية واردة من المصنع PUR-IC-INV-IC-FAC-001 - استلام 3,000 علبة كرتون',
            'PurchaseInvoice',
            'PUR-IC-INV-IC-FAC-001',
            JSON.stringify(jePurGM),
            now,
            'main'
        ]
    );
    console.log('✓ Operation 2 (Inter-company Goods Invoicing 24,000 EGP) injected in both branches');

    // =========================================================================
    // OPERATION 3: Cross-Branch Supplier Payment (Grand Media pays 5,000 EGP for Factory Supplier)
    // =========================================================================
    // 3a. Supplier Payment in Grand Media
    db.run(
        `INSERT OR REPLACE INTO supplier_payments
         (id, supplierId, supplierName, amount, date, treasuryAccount, notes, status, isExpense, expenseCategory, branchId, fee, isIntercompany, targetBranchId, targetBranchName, sourceBranchId, sourceBranchName, targetSupplierId, targetSupplierName, mirrorPaymentId, paidByOtherBranch)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'SP-IC-GM-001',
            'SUP-FAC-001',
            'مورد مستلزمات أحبار وتكسير المصنع',
            5000,
            today,
            'الخزينة الرئيسية',
            'سداد نقدي من خزينة جراند ميديا لمورد أحبار نيابة عن فرع المصنع',
            'active',
            0,
            '',
            'main',
            0,
            1,
            'factory',
            'المصنع',
            'main',
            'جراند ميديا',
            'SUP-FAC-001',
            'مورد مستلزمات أحبار وتكسير المصنع',
            'SP-IC-SP-IC-GM-001',
            0
        ]
    );

    // 3b. Mirrored Payment in Factory
    db.run(
        `INSERT OR REPLACE INTO supplier_payments
         (id, supplierId, supplierName, amount, date, treasuryAccount, notes, status, isExpense, expenseCategory, branchId, fee, isIntercompany, targetBranchId, targetBranchName, sourceBranchId, sourceBranchName, targetSupplierId, targetSupplierName, mirrorPaymentId, paidByOtherBranch)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'SP-IC-SP-IC-GM-001',
            'SUP-FAC-001',
            'مورد مستلزمات أحبار وتكسير المصنع',
            5000,
            today,
            'الخزينة الرئيسية',
            'سداد بيني وارد تم سداده بواسطة جراند ميديا نيابة عن المصنع',
            'active',
            0,
            '',
            'factory',
            0,
            1,
            'factory',
            'المصنع',
            'main',
            'جراند ميديا',
            'SUP-FAC-001',
            'مورد مستلزمات أحبار وتكسير المصنع',
            'SP-IC-GM-001',
            1
        ]
    );

    // 3c. Journal Entry in Grand Media for Cross-Payment
    const jePayGM = [
        { accountId: '2102', accountName: 'جاري شركة المصنع', debit: 5000, credit: 0 },
        { accountId: '1101', accountName: 'الخزينة الرئيسية (جراند ميديا)', debit: 0, credit: 5000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-SP-IC-GM-001',
            today,
            'سداد بيني لمورد أحبار نيابة عن فرع المصنع (نقدي من الخزينة الرئيسية)',
            'Manual',
            'SP-IC-GM-001',
            JSON.stringify(jePayGM),
            now,
            'main'
        ]
    );

    // 3d. Journal Entry in Factory for Cross-Payment
    const jePayFac = [
        { accountId: '2101', accountName: 'موردي خامات ومستلزمات المصنع', debit: 5000, credit: 0 },
        { accountId: '2102', accountName: 'جاري شركة جراند ميديا', debit: 0, credit: 5000 }
    ];
    db.run(
        `INSERT OR REPLACE INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            'JE-SP-IC-FAC-001',
            today,
            'إثبات سداد مستحقات مورد مسددة طرف جراند ميديا نيابة عن المصنع',
            'Manual',
            'SP-IC-SP-IC-GM-001',
            JSON.stringify(jePayFac),
            now,
            'factory'
        ]
    );
    console.log('✓ Operation 3 (Cross-Branch Supplier Payment 5,000 EGP) injected in both branches');

    // 4. Audit Log
    db.run(
        `INSERT OR REPLACE INTO logs (id, userId, userName, action, timestamp)
         VALUES (?, ?, ?, ?, ?)`,
        [
            'LOG-IC-001',
            'admin',
            'المدير العام',
            'تنفيذ دورة حركات بينية متكاملة بين جراند ميديا والمصنع (تحويل نقدية 15,000 ج.م + توريد بضاعة 24,000 ج.م + سداد مورد 5,000 ج.م) ومطابقة حـ/ 2102',
            now
        ],
        (err) => {
            if (err) console.error('Error logging IC:', err);
            else console.log('✓ Audit log created');
            db.close(() => {
                console.log('✅ Full Inter-Company cycle (Grand Media <-> Factory) successfully completed!');
            });
        }
    );
});
