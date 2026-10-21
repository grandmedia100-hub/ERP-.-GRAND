const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'mediahive-clean.db');
const db = new sqlite3.Database(dbPath);

console.log("================================================================================");
console.log("       تنفيذ المحاكاة الحية الفعلية على قاعدة بيانات MediaHive ERP              ");
console.log("================================================================================\n");

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getRows(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function simulate() {
  try {
    const today = '2026-10-20';
    const now = new Date().toISOString();

    // 0. تعديل قيدي فواتير الشراء السابقة لتوجه المخزون لحساب الخامات 110401 بدلاً من الحساب التجميعي 1104
    const pur1Lines = [
      { accountId: '110401', accountName: 'مخزون الخامات', debit: 29625, credit: 0 },
      { accountId: '2101', accountName: 'الموردين - على الحلبي', debit: 0, credit: 29625 },
      { accountId: '2101', accountName: 'الموردين - على الحلبي', debit: 29625, credit: 0 },
      { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: 29625 }
    ];
    await runQuery("UPDATE journal_entries SET lines = ? WHERE referenceId = 'PUR-2026-001'", [JSON.stringify(pur1Lines)]);

    const pur2Lines = [
      { accountId: '110401', accountName: 'مخزون الخامات', debit: 175000, credit: 0 },
      { accountId: '2101', accountName: 'الموردين - شركة طيبة (هبه)', debit: 0, credit: 175000 }
    ];
    await runQuery("UPDATE journal_entries SET lines = ? WHERE referenceId = 'PUR-2026-002'", [JSON.stringify(pur2Lines)]);

    // قيد الافتتاح
    const existingOp = await getRows("SELECT * FROM journal_entries WHERE referenceId = 'OP-001'");
    if (existingOp.length === 0) {
      const opLines = [
        { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 150000, credit: 0 },
        { accountId: '3101', accountName: 'رأس المال (الشركاء)', debit: 0, credit: 150000 }
      ];
      await runQuery(
        "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ['JE-OP-001', '2026-10-01', 'قيد إثبات رصيد الخزينة الافتتاحي ورأس المال', 'Manual', 'OP-001', JSON.stringify(opLines), now, 'main']
      );
    }

    // 1. سداد دفعة للمورد "هبه (شركة طيبة)"
    const paymentId = 'SP001';
    await runQuery("DELETE FROM supplier_payments WHERE id = ?", [paymentId]);
    await runQuery("DELETE FROM journal_entries WHERE referenceId = ?", [paymentId]);

    const paymentAmount = 75000;
    await runQuery(
      `INSERT INTO supplier_payments 
       (id, supplierId, supplierName, amount, date, treasuryAccount, notes, status, isExpense, expenseCategory, branchId, fee) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, 'S-0001', 'هبه', paymentAmount, today, 'الخزينة الرئيسية', 'سداد دفعة نقدية من حساب فاتورة PUR-2026-002', 'active', 0, '', 'main', 0]
    );

    const paymentLines = [
      { accountId: '2101', accountName: 'الموردين - شركة طيبة (هبه)', debit: paymentAmount, credit: 0 },
      { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: paymentAmount }
    ];
    await runQuery(
      "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`JE-${paymentId}`, today, 'سند صرف رقم SP001 لمورد - هبه (شركة طيبة)', 'Manual', paymentId, JSON.stringify(paymentLines), now, 'main']
    );

    // سداد مصروف تشغيل (كهرباء ومواد لاصقة) نقداً
    const expPaymentId = 'EXP-2026-001';
    await runQuery("DELETE FROM journal_entries WHERE referenceId = ?", [expPaymentId]);
    const expLines = [
      { accountId: '5201', accountName: 'المصروفات التشغيلية والعمومية', debit: 5000, credit: 0 },
      { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: 5000 }
    ];
    await runQuery(
      "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`JE-${expPaymentId}`, today, 'سند صرف مصروفات تشغيلية مباشرة نقداً', 'Manual', expPaymentId, JSON.stringify(expLines), now, 'main']
    );

    // 2. أمر التصنيع والتشغيل
    const rawProd = (await getRows("SELECT * FROM products WHERE sku = '1002'"))[0];
    const fgProd = (await getRows("SELECT * FROM products WHERE sku = '1015'"))[0];

    const rawUsedQty = 2000; // 2000 كجم
    const rawCost = rawUsedQty * 35; // 70,000 ج.م
    const opsCost = 15000; // مصنعية طباعة وتكسير لدى الغير
    const expenseCost = 5000; // مصاريف تشغيل
    const scrapQty = 50; // 50 كجم هالك
    const scrapCost = scrapQty * 35; // 1,750 ج.م
    const totalMfgCost = rawCost + opsCost + expenseCost; // 90,000 ج.م
    const fgUnits = 10000; // إنتاج 10,000 علبة
    const fgUnitCost = totalMfgCost / fgUnits; // 9.00 ج.م/علبة

    // تحديث أرصدة المنتجات
    const newRawQty = 5000 - rawUsedQty - scrapQty; // 2950
    await runQuery("UPDATE products SET quantity = ? WHERE id = ?", [newRawQty, rawProd.id]);

    // مخزن التام
    const soldQty = 7000;
    const finalFgQty = fgUnits - soldQty; // 3,000 علبة متبقية
    await runQuery("UPDATE products SET quantity = ?, costPrice = ?, salePrice = ? WHERE id = ?", [finalFgQty, fgUnitCost, 14.00, fgProd.id]);

    // أمر التصنيع في kv_store
    const kvOrdersRow = await getRows("SELECT value FROM kv_store WHERE key = 'productionOrders'");
    let ordersList = kvOrdersRow.length > 0 && kvOrdersRow[0].value ? JSON.parse(kvOrdersRow[0].value) : [];
    ordersList = ordersList.filter(o => o.id !== 'ORD-2026-001');

    ordersList.unshift({
      id: 'ORD-2026-001',
      code: 'ORD-2026-001',
      date: today,
      bomId: 'BOM-001',
      bomName: 'قائمة تشغيل علبة بيتزا',
      outputProductId: fgProd.id,
      outputProductName: fgProd.name,
      plannedQuantity: fgUnits,
      producedQuantity: fgUnits,
      unit: 'علبة',
      status: 'completed',
      rawMaterialCost: rawCost,
      operationsTotalCost: opsCost,
      expensesTotalCost: expenseCost,
      scrapTotalCost: scrapCost,
      totalCost: totalMfgCost,
      unitCost: fgUnitCost,
      notes: 'تم التنفيذ الفعلي واحتساب تكلفة الوحدة 9.00 ج.م'
    });
    await runQuery("INSERT OR REPLACE INTO kv_store (key, value) VALUES ('productionOrders', ?)", [JSON.stringify(ordersList)]);

    // قيد اليومية للتصنيع
    await runQuery("DELETE FROM journal_entries WHERE referenceId = 'ORD-2026-001'");
    const mfgJournalLines = [
      { accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: totalMfgCost, credit: 0 },
      { accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: rawCost },
      { accountId: '2101', accountName: 'الموردين - مصنعيات الغير (مطبعة النور)', debit: 0, credit: opsCost },
      { accountId: '5201', accountName: 'المصروفات التشغيلية والعمومية (تحميل تكاليف)', debit: 0, credit: expenseCost },
      { accountId: '110403', accountName: 'مخزون الإنتاج التام', debit: totalMfgCost, credit: 0 },
      { accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: 0, credit: totalMfgCost },
      { accountId: '5203', accountName: 'هالك إنتاج', debit: scrapCost, credit: 0 },
      { accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: scrapCost }
    ];
    await runQuery(
      "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ['JE-ORD-2026-001', today, 'تنفيذ أمر تصنيع علبة بيتزا ORD-2026-001 (10,000 وحدة)', 'Manual', 'ORD-2026-001', JSON.stringify(mfgJournalLines), now, 'main']
    );

    // 3. فاتورة المبيعات
    const customer = (await getRows("SELECT * FROM customers WHERE name LIKE '%احمد النوبي%'"))[0];
    const invoiceId = 'INV-2026-001';
    await runQuery("DELETE FROM sales_invoices WHERE id = ?", [invoiceId]);
    await runQuery("DELETE FROM journal_entries WHERE referenceId = ?", [invoiceId]);

    const salePrice = 14.00;
    const salesTotal = soldQty * salePrice; // 98,000 ج.م
    const cogsTotal = soldQty * fgUnitCost; // 63,000 ج.م

    const invoiceItems = [
      {
        productId: fgProd.id,
        productName: fgProd.name,
        productCode: fgProd.sku,
        quantity: soldQty,
        price: salePrice,
        unit: 'علبة',
        cost: fgUnitCost,
        itemType: 'product',
        total: salesTotal
      }
    ];

    await runQuery(
      `INSERT INTO sales_invoices (id, customerId, customerName, companyName, date, paymentMethod, total, invoiceType, status, notes, items, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [invoiceId, customer.id, customer.name, customer.companyName, today, 'اجل', salesTotal, 'sale', 'active', 'فاتورة بيع علب بيتزا مطبوعة', JSON.stringify(invoiceItems), 'main']
    );

    const salesJournalLines = [
      { accountId: '1103', accountName: `العملاء - ${customer.name}`, debit: salesTotal, credit: 0 },
      { accountId: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: salesTotal },
      { accountId: '5101', accountName: 'تكلفة البضاعة المباعة (COGS)', debit: cogsTotal, credit: 0 },
      { accountId: '110403', accountName: 'مخزون الإنتاج التام', debit: 0, credit: cogsTotal }
    ];
    await runQuery(
      "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`JE-${invoiceId}`, today, `فاتورة مبيعات رقم ${invoiceId} - ${customer.name}`, 'SalesInvoice', invoiceId, JSON.stringify(salesJournalLines), now, 'main']
    );

    // 4. تحصيل دفعة من العميل
    const receiptId = 'CP001';
    await runQuery("DELETE FROM customer_payments WHERE id = ?", [receiptId]);
    await runQuery("DELETE FROM journal_entries WHERE referenceId = ?", [receiptId]);

    const receiptAmount = 60000;
    await runQuery(
      `INSERT INTO customer_payments (id, customerId, customerName, amount, date, treasuryAccount, notes, status, branchId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [receiptId, customer.id, customer.name, receiptAmount, today, 'الخزينة الرئيسية', `دفعة من فاتورة رقم ${invoiceId}`, 'active', 'main']
    );

    const receiptJournalLines = [
      { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: receiptAmount, credit: 0 },
      { accountId: '1103', accountName: `العملاء - ${customer.name}`, debit: 0, credit: receiptAmount }
    ];
    await runQuery(
      "INSERT INTO journal_entries (id, date, description, referenceType, referenceId, lines, createdAt, branchId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`JE-${receiptId}`, today, `سند قبض رقم ${receiptId} من العميل ${customer.name}`, 'Manual', receiptId, JSON.stringify(receiptJournalLines), now, 'main']
    );

    // 5. استخراج التقارير الفعلية
    const allJournalRows = await getRows("SELECT * FROM journal_entries");
    const accountSummary = {};

    allJournalRows.forEach(je => {
      const lines = JSON.parse(je.lines || '[]');
      lines.forEach(l => {
        const id = l.accountId;
        if (!accountSummary[id]) {
          accountSummary[id] = { id, name: l.accountName, debit: 0, credit: 0 };
        }
        accountSummary[id].debit += (Number(l.debit) || 0);
        accountSummary[id].credit += (Number(l.credit) || 0);
      });
    });

    console.log("================================================================================");
    console.log("            ميزان المراجعة بالمجاميع والأرصدة الفعلي من قاعدة البيانات          ");
    console.log("================================================================================");
    console.log("كود الحساب  اسم الحساب                          مجاميع مدين   مجاميع دائن    رصيد مدين     رصيد دائن");
    console.log("--------------------------------------------------------------------------------");

    let totSumDr = 0, totSumCr = 0, totBalDr = 0, totBalCr = 0;
    const sortedAccounts = Object.values(accountSummary).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    sortedAccounts.forEach(acc => {
      const net = acc.debit - acc.credit;
      const bDr = net > 0 ? net : 0;
      const bCr = net < 0 ? Math.abs(net) : 0;

      totSumDr += acc.debit;
      totSumCr += acc.credit;
      totBalDr += bDr;
      totBalCr += bCr;

      const code = acc.id.padEnd(10);
      const name = acc.name.padEnd(32);
      const sDr = acc.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12);
      const sCr = acc.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12);
      const strBDr = bDr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12);
      const strBCr = bCr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12);
      console.log(`${code}  ${name}  ${sDr} ${sCr}  ${strBDr} ${strBCr}`);
    });

    console.log("--------------------------------------------------------------------------------");
    console.log(`الإجمالي العام:                          ${totSumDr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)} ${totSumCr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)}  ${totBalDr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)} ${totBalCr.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)}`);
    console.log(`توازن المجاميع: ${totSumDr.toFixed(2) === totSumCr.toFixed(2) ? '✓ متوازن تماماً 100%' : '✕ غير متوازن'}`);
    console.log(`توازن الأرصدة:  ${totBalDr.toFixed(2) === totBalCr.toFixed(2) ? '✓ متوازن تماماً 100%' : '✕ غير متوازن'}`);
    console.log("================================================================================\n");

    // قائمة الدخل
    const rev = accountSummary['4101'] ? accountSummary['4101'].credit - accountSummary['4101'].debit : 0;
    const cogs = accountSummary['5101'] ? accountSummary['5101'].debit - accountSummary['5101'].credit : 0;
    const grossProfit = rev - cogs;
    const scrap = accountSummary['5203'] ? accountSummary['5203'].debit - accountSummary['5203'].credit : 0;
    const netProfit = grossProfit - scrap;

    console.log("================================================================================");
    console.log("                     قائمة الدخل (الأرباح والخسائر)                            ");
    console.log("================================================================================");
    console.log(`إيرادات المبيعات (7,000 علبة × 14.00 ج.م):                 ${rev.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`يُخصم: تكلفة البضاعة المباعة (7,000 علبة × 9.00 ج.م):     (${cogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}) ج.م`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`مجمل الربح (Gross Profit):                                 ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`يُخصم: خسائر هالك وتالف الإنتاج:                            (${scrap.toLocaleString('en-US', { minimumFractionDigits: 2 })}) ج.م`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`صافي الربح المحقق للفترة (Net Profit):                      ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("================================================================================\n");

    // الميزانية العمومية
    const cash = accountSummary['1101'].debit - accountSummary['1101'].credit;
    const ar = accountSummary['1103'].debit - accountSummary['1103'].credit;
    const rawStock = accountSummary['110401'].debit - accountSummary['110401'].credit;
    const wipStock = accountSummary['110402'].debit - accountSummary['110402'].credit;
    const fgStock = accountSummary['110403'].debit - accountSummary['110403'].credit;
    const totalAssets = cash + ar + rawStock + wipStock + fgStock;

    const ap = accountSummary['2101'].credit - accountSummary['2101'].debit;
    const totalLiabilities = ap;

    const capital = accountSummary['3101'].credit - accountSummary['3101'].debit;
    const totalEquity = capital + netProfit;

    console.log("================================================================================");
    console.log("                     الميزانية العمومية (قائمة المركز المالي)                   ");
    console.log("================================================================================");
    console.log("1. الأصول (Assets):");
    console.log(`   - النقدية بالخزينة الرئيسية:                            ${cash.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`   - المدينون (العملاء - احمد النوبي):                    ${ar.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`   - مخزون الخامات (ورق دوبلكس متبقي 2,950 كجم + 750 كجم):   ${rawStock.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`   - مخزون الإنتاج تحت التشغيل (WIP):                      ${wipStock.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`   - مخزون الإنتاج التام (3,000 علبة بيتزا × 9.00 ج.م):     ${fgStock.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("   -----------------------------------------------------------------------------");
    console.log(`   إجمالي الأصول:                                          ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("");
    console.log("2. الخصوم (Liabilities):");
    console.log(`   - الدائنون (الموردين: 100,000 طيبة + 15,000 مطبعة النور):  ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("   -----------------------------------------------------------------------------");
    console.log(`   إجمالي الخصوم:                                          ${totalLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("");
    console.log("3. حقوق الملكية (Equity):");
    console.log(`   - رأس المال:                                            ${capital.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`   - صافي أرباح الفترة المرحلة (Retained Earnings):        ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("   -----------------------------------------------------------------------------");
    console.log(`   إجمالي حقوق الملكية:                                    ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log("");
    console.log("--------------------------------------------------------------------------------");
    console.log(`إجمالي الخصوم وحقوق الملكية:                               ${(totalLiabilities + totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م`);
    console.log(`معادلة الميزانية (الأصول = الخصوم + حقوق الملكية):          ${totalAssets.toFixed(2) === (totalLiabilities + totalEquity).toFixed(2) ? '✓ متطابقة تماماً 100%' : '✕ غير متطابقة'}`);
    console.log("================================================================================\n");

  } catch (err) {
    console.error("Error executing simulation:", err);
  } finally {
    db.close();
  }
}

simulate();
