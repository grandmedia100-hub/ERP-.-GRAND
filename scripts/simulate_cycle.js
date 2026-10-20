/**
 * Full End-to-End Accounting & Manufacturing Cycle Simulation
 * Printing & Packaging Press Scenario
 */

const accounts = [
  { id: '1101', code: '1101', name: 'الخزينة الرئيسية', type: 'أصل' },
  { id: '1103', code: '1103', name: 'العملاء (المدينون)', type: 'أصل' },
  { id: '110401', code: '110401', name: 'مخزون الخامات', type: 'أصل' },
  { id: '110402', code: '110402', name: 'حساب التصنيع (WIP)', type: 'أصل' },
  { id: '110403', code: '110403', name: 'مخزون الإنتاج التام', type: 'أصل' },
  { id: '2101', code: '2101', name: 'الموردين (الدائنون)', type: 'خصم' },
  { id: '3101', code: '3101', name: 'رأس المال (الشركاء)', type: 'حقوق ملكية' },
  { id: '4101', code: '4101', name: 'إيرادات المبيعات', type: 'إيراد' },
  { id: '5101', code: '5101', name: 'تكلفة البضاعة المباعة (COGS)', type: 'مصروف' },
  { id: '5201', code: '5201', name: 'المصروفات التشغيلية والعمومية', type: 'مصروف' },
  { id: '5203', code: '5203', name: 'هالك إنتاج', type: 'مصروف' }
];

const journalEntries = [];

function recordEntry(date, description, refType, refId, lines) {
  const sumDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const sumCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  if (Math.abs(sumDebit - sumCredit) > 0.001) {
    throw new Error(`القيد غير متوازن: ${description} (مدين: ${sumDebit}, دائن: ${sumCredit})`);
  }
  journalEntries.push({
    id: `JE-${journalEntries.length + 1}`,
    date,
    description,
    referenceType: refType,
    referenceId: refId,
    lines
  });
}

console.log("================================================================================");
console.log("               محاكاة الدورة المحاسبية والصناعية الكاملة (MediaHive ERP)        ");
console.log("================================================================================\n");

// الخطوة 0: القيد الافتتاحي
recordEntry('2026-10-01', 'إثبات رأس المال النقدي الافتتاحي بالخزينة', 'Manual', 'OP-001', [
  { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 100000, credit: 0 },
  { accountId: '3101', accountName: 'رأس المال (الشركاء)', debit: 0, credit: 100000 }
]);

// الخطوة 1: شراء خامات من مورد
// شراء 2 طن ورق دوبلكس 300 جم بسعر 35,000 ج.م/طن = 70,000 ج.م (آجل)
const purchaseQty = 2; // طن
const purchasePrice = 35000;
const purchaseTotal = purchaseQty * purchasePrice; // 70,000
recordEntry('2026-10-05', 'فاتورة مشتريات خامات رقم PUR-2026-001 - شركة الأهرام للورق', 'PurchaseInvoice', 'PUR-2026-001', [
  { accountId: '110401', accountName: 'مخزون الخامات', debit: purchaseTotal, credit: 0 },
  { accountId: '2101', accountName: 'الموردين - شركة الأهرام للورق', debit: 0, credit: purchaseTotal }
]);

// الخطوة 2: سداد دفعة للمورد من الخزينة
const supplierPaid = 40000;
recordEntry('2026-10-06', 'سند صرف رقم SP001 - سداد لشركة الأهرام للورق', 'Manual', 'SP001', [
  { accountId: '2101', accountName: 'الموردين - شركة الأهرام للورق', debit: supplierPaid, credit: 0 },
  { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: supplierPaid }
]);

// سداد مصروف تشغيل (كهرباء ومواد لاصقة) نقداً من الخزينة
const expenseCost = 1500;
recordEntry('2026-10-08', 'سند صرف مصروفات تشغيلية مباشرة نقداً', 'Manual', 'EXP-001', [
  { accountId: '5201', accountName: 'المصروفات التشغيلية والعمومية', debit: expenseCost, credit: 0 },
  { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: 0, credit: expenseCost }
]);

// الخطوة 3: أمر تصنيع وتشغيل
// إنتاج 10,000 علبة بيتزا
// الخامات المستهلكة: 1 طن ورق = 35,000 ج.م
// مصنعية طباعة وتكسير لدى الغير: 8,500 ج.م
// تحميل المصروف التشغيلي المباشر: 1,500 ج.م
// هالك ورق: 50 كجم = 1,000 ج.م
const rawCost = 35000;
const opsCost = 8500;
const scrapCost = 1000;
const totalMfgCost = rawCost + opsCost + expenseCost; // 45,000
const unitsProduced = 10000;
const unitMfgCost = totalMfgCost / unitsProduced; // 4.50 ج.م/علبة

recordEntry('2026-10-10', 'تنفيذ أمر تصنيع ORD-001 - إنتاج 10,000 علبة بيتزا', 'Manual', 'ORD-001', [
  { accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: totalMfgCost, credit: 0 },
  { accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: rawCost },
  { accountId: '2101', accountName: 'الموردين - مصنعيات الغير (مطبعة النور)', debit: 0, credit: opsCost },
  { accountId: '5201', accountName: 'المصروفات التشغيلية المباشرة (تحميل تكاليف)', debit: 0, credit: expenseCost },
  // تحويل من WIP إلى الإنتاج التام
  { accountId: '110403', accountName: 'مخزون الإنتاج التام', debit: totalMfgCost, credit: 0 },
  { accountId: '110402', accountName: 'حساب التصنيع (WIP)', debit: 0, credit: totalMfgCost },
  // إثبات الهالك وخصمه من مخزن الخامات
  { accountId: '5203', accountName: 'هالك إنتاج', debit: scrapCost, credit: 0 },
  { accountId: '110401', accountName: 'مخزون الخامات', debit: 0, credit: scrapCost }
]);

// الخطوة 4: فاتورة مبيعات لعميل
// بيع 6,000 علبة بسعر 8.00 ج.م/علبة = 48,000 ج.م (آجل)
const soldQty = 6000;
const sellPrice = 8.00;
const salesRevenue = soldQty * sellPrice; // 48,000
const cogs = soldQty * unitMfgCost; // 6,000 * 4.50 = 27,000

recordEntry('2026-10-12', 'فاتورة مبيعات رقم INV-2026-001 - مطاعم الأكيل', 'SalesInvoice', 'INV-2026-001', [
  { accountId: '1103', accountName: 'العملاء - مطاعم الأكيل', debit: salesRevenue, credit: 0 },
  { accountId: '4101', accountName: 'إيرادات المبيعات', debit: 0, credit: salesRevenue },
  { accountId: '5101', accountName: 'تكلفة البضاعة المباعة (COGS)', debit: cogs, credit: 0 },
  { accountId: '110403', accountName: 'مخزون الإنتاج التام', debit: 0, credit: cogs }
]);

// الخطوة 5: تحصيل دفعة من العميل بالخزينة
const customerReceipt = 30000;
recordEntry('2026-10-15', 'سند قبض رقم CP001 - تحصيل من مطاعم الأكيل', 'Manual', 'CP001', [
  { accountId: '1101', accountName: 'الخزينة الرئيسية', debit: customerReceipt, credit: 0 },
  { accountId: '1103', accountName: 'العملاء - مطاعم الأكيل', debit: 0, credit: customerReceipt }
]);

console.log(`✓ تم تسجيل كافة الحركات وإنشاء ${journalEntries.length} قيود يومية متوازنة بنجاح.\n`);

// --------------------------------------------------------------------------------
// حساب ميزان المراجعة بالمجاميع والأرصدة
// --------------------------------------------------------------------------------
const trialBalanceMap = {};
accounts.forEach(a => {
  trialBalanceMap[a.id] = { code: a.code, name: a.name, type: a.type, sumDebit: 0, sumCredit: 0 };
});

journalEntries.forEach(je => {
  je.lines.forEach(line => {
    if (!trialBalanceMap[line.accountId]) {
      trialBalanceMap[line.accountId] = { code: line.accountId, name: line.accountName, sumDebit: 0, sumCredit: 0 };
    }
    trialBalanceMap[line.accountId].sumDebit += line.debit;
    trialBalanceMap[line.accountId].sumCredit += line.credit;
  });
});

const trialBalanceRows = Object.values(trialBalanceMap)
  .filter(row => row.sumDebit > 0 || row.sumCredit > 0)
  .map(row => {
    const net = row.sumDebit - row.sumCredit;
    return {
      code: row.code,
      name: row.name,
      type: row.type,
      sumDebit: row.sumDebit,
      sumCredit: row.sumCredit,
      balDebit: net > 0 ? net : 0,
      balCredit: net < 0 ? Math.abs(net) : 0
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

console.log("================================================================================");
console.log("                  ميزان المراجعة بالمجاميع والأرصدة                             ");
console.log("================================================================================");
console.log("كود       اسم الحساب                      مجاميع مدين   مجاميع دائن    رصيد مدين     رصيد دائن");
console.log("--------------------------------------------------------------------------------");
let totSumDr = 0, totSumCr = 0, totBalDr = 0, totBalCr = 0;
trialBalanceRows.forEach(r => {
  totSumDr += r.sumDebit;
  totSumCr += r.sumCredit;
  totBalDr += r.balDebit;
  totBalCr += r.balCredit;
  const code = r.code.padEnd(8);
  const name = r.name.padEnd(30);
  const sDr = r.sumDebit.toLocaleString('en-US').padStart(12);
  const sCr = r.sumCredit.toLocaleString('en-US').padStart(12);
  const bDr = r.balDebit.toLocaleString('en-US').padStart(12);
  const bCr = r.balCredit.toLocaleString('en-US').padStart(12);
  console.log(`${code}  ${name}  ${sDr} ${sCr}  ${bDr} ${bCr}`);
});
console.log("--------------------------------------------------------------------------------");
console.log(`الإجمالي العام:                          ${totSumDr.toLocaleString('en-US').padStart(12)} ${totSumCr.toLocaleString('en-US').padStart(12)}  ${totBalDr.toLocaleString('en-US').padStart(12)} ${totBalCr.toLocaleString('en-US').padStart(12)}`);
console.log(`حالة توازن المجاميع: ${totSumDr === totSumCr ? "متوازن 100% ✓" : "غير متوازن ✕"}`);
console.log(`حالة توازن الأرصدة:  ${totBalDr === totBalCr ? "متوازن 100% ✓" : "غير متوازن ✕"}`);
console.log("================================================================================\n");

// --------------------------------------------------------------------------------
// قائمة الدخل (الأرباح والخسائر)
// --------------------------------------------------------------------------------
const rev = trialBalanceMap['4101'] ? trialBalanceMap['4101'].sumCredit - trialBalanceMap['4101'].sumDebit : 0;
const costSold = trialBalanceMap['5101'] ? trialBalanceMap['5101'].sumDebit - trialBalanceMap['5101'].sumCredit : 0;
const grossProfit = rev - costSold;
const scrapExp = trialBalanceMap['5203'] ? trialBalanceMap['5203'].sumDebit - trialBalanceMap['5203'].sumCredit : 0;
const totalExpenses = scrapExp;
const netIncome = grossProfit - totalExpenses;

console.log("================================================================================");
console.log("                     قائمة الدخل (الأرباح والخسائر)                            ");
console.log("================================================================================");
console.log(`إيرادات المبيعات (6,000 علبة × 8.00 ج.م):                   ${rev.toLocaleString('en-US')} ج.م`);
console.log(`يُخصم: تكلفة البضاعة المباعة (6,000 علبة × 4.50 ج.م):       (${costSold.toLocaleString('en-US')}) ج.م`);
console.log(`--------------------------------------------------------------------------------`);
console.log(`مجمل الربح (Gross Profit):                                   ${grossProfit.toLocaleString('en-US')} ج.م`);
console.log(`يُخصم: خسائر هالك وتالف الإنتاج:                              (${scrapExp.toLocaleString('en-US')}) ج.م`);
console.log(`--------------------------------------------------------------------------------`);
console.log(`صافي الربح التشغيلي (Net Profit):                            ${netIncome.toLocaleString('en-US')} ج.م`);
console.log("================================================================================\n");

// --------------------------------------------------------------------------------
// الميزانية العمومية (المركز المالي)
// --------------------------------------------------------------------------------
const cash = trialBalanceMap['1101'].sumDebit - trialBalanceMap['1101'].sumCredit;
const ar = trialBalanceMap['1103'].sumDebit - trialBalanceMap['1103'].sumCredit;
const rawStock = trialBalanceMap['110401'].sumDebit - trialBalanceMap['110401'].sumCredit;
const wipStock = trialBalanceMap['110402'].sumDebit - trialBalanceMap['110402'].sumCredit;
const fgStock = trialBalanceMap['110403'].sumDebit - trialBalanceMap['110403'].sumCredit;
const totalAssets = cash + ar + rawStock + wipStock + fgStock;

const ap = trialBalanceMap['2101'].sumCredit - trialBalanceMap['2101'].sumDebit;
const totalLiabilities = ap;

const capital = trialBalanceMap['3101'].sumCredit - trialBalanceMap['3101'].sumDebit;
const retainedEarnings = netIncome;
const totalEquity = capital + retainedEarnings;

console.log("================================================================================");
console.log("                     الميزانية العمومية (قائمة المركز المالي)                   ");
console.log("================================================================================");
console.log("1. الأصول (Assets):");
console.log(`   - النقدية بالخزينة الرئيسية:                              ${cash.toLocaleString('en-US')} ج.م`);
console.log(`   - المدينون (العملاء - مطاعم الأكيل):                      ${ar.toLocaleString('en-US')} ج.م`);
console.log(`   - مخزون الخامات (ورق دوبلكس متبقي 0.95 طن):               ${rawStock.toLocaleString('en-US')} ج.م`);
console.log(`   - مخزون الإنتاج تحت التشغيل (WIP):                        ${wipStock.toLocaleString('en-US')} ج.م`);
console.log(`   - مخزون الإنتاج التام (4,000 علبة × 4.50 ج.م):             ${fgStock.toLocaleString('en-US')} ج.م`);
console.log(`   -----------------------------------------------------------------------------`);
console.log(`   إجمالي الأصول:                                            ${totalAssets.toLocaleString('en-US')} ج.م`);
console.log("");
console.log("2. الخصوم (Liabilities):");
console.log(`   - الدائنون (الموردين: 30,000 أهرام + 8,500 مطبعة النور):    ${ap.toLocaleString('en-US')} ج.م`);
console.log(`   -----------------------------------------------------------------------------`);
console.log(`   إجمالي الخصوم:                                            ${totalLiabilities.toLocaleString('en-US')} ج.م`);
console.log("");
console.log("3. حقوق الملكية (Equity):");
console.log(`   - رأس المال:                                              ${capital.toLocaleString('en-US')} ج.م`);
console.log(`   - صافي أرباح الفترة المرحلة (Retained Earnings):          ${retainedEarnings.toLocaleString('en-US')} ج.م`);
console.log(`   -----------------------------------------------------------------------------`);
console.log(`   إجمالي حقوق الملكية:                                      ${totalEquity.toLocaleString('en-US')} ج.م`);
console.log("");
console.log("--------------------------------------------------------------------------------");
console.log(`إجمالي الخصوم وحقوق الملكية:                                 ${(totalLiabilities + totalEquity).toLocaleString('en-US')} ج.م`);
console.log(`معادلة الميزانية (الأصول = الخصوم + حقوق الملكية):            ${totalAssets === (totalLiabilities + totalEquity) ? "متطابقة تماماً 100% ✓" : "غير متطابقة ✕"}`);
console.log("================================================================================\n");
