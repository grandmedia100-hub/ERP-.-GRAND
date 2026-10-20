import React, { useState } from 'react';
import IncomeStatementModal from './IncomeStatementModal.tsx';
import CustomerStatementModal from './CustomerStatementModal.tsx';
import SupplierStatementModal from './SupplierStatementModal.tsx';
import TreasuryStatementModal from './TreasuryStatementModal.tsx';
import SalesAnalysisModal from './SalesAnalysisModal.tsx';
import DetailedSalesByItemReport from './DetailedSalesByItemReport.tsx';
import BalanceSheetModal from './BalanceSheetModal.tsx';
import AgingReportModal from './AgingReportModal.tsx';
import TrialBalanceModal from './TrialBalanceModal.tsx'; // Ensure this is imported or handled

import type { SalesInvoice, PurchaseInvoice, Customer, Supplier, CustomerPayment, SupplierPayment, Product, JournalEntry, LogEntry, User } from '../types.ts';

interface ReportCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, onClick }) => (
  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
    <h3 className="text-xl font-bold text-blue-700 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{description}</p>
    <button
      onClick={onClick}
      className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
    >
      عرض التقرير
    </button>
  </div>
);

interface ReportsProps {
  currentUser: User;
  salesInvoices: SalesInvoice[];
  purchaseInvoices: PurchaseInvoice[];
  customers: Customer[];
  suppliers: Supplier[];
  customerPayments: CustomerPayment[];
  supplierPayments: SupplierPayment[];
  products: Product[];
  journalEntries: JournalEntry[];
  logs: LogEntry[];
  accounts?: any[];
  partners?: any[];
  partnerTransactions?: any[];
  expenses?: any[];
}

const Reports: React.FC<ReportsProps> = (props) => {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const handleCloseModal = () => setActiveReport(null);

  const hasPermission = (permission: string) => {
    if (props.currentUser.role === 'admin' || props.currentUser.role === 'developer') return true;
    return props.currentUser.permissions ? props.currentUser.permissions.includes(permission as any) : false;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">التقارير المالية</h1>

      <p className="text-gray-600 mb-8 text-lg">
        استعرض التقارير المالية الهامة لفهم أداء عملك واتخاذ قرارات مستنيرة.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hasPermission('view_reports_customers') && hasPermission('view_reports_suppliers') && (
          <ReportCard
            title="أرصدة العملاء والموردين"
            description="كشف مجمع يوضح المبالغ المستحقة على العملاء والمبالغ المستحقة للموردين."
            onClick={() => setActiveReport('balances')}
          />
        )}
        {hasPermission('view_reports_sales') && (
          <ReportCard
            title="تحليل المبيعات"
            description="إحصائيات المبيعات، متوسط الفاتورة، والمنتجات الأكثر مبيعاً."
            onClick={() => setActiveReport('salesAnalysis')}
          />
        )}
        {hasPermission('view_reports_sales') && (
          <ReportCard
            title="تقرير مبيعات تفصيلي بالأصناف"
            description="عرض تفصيلي لجميع الأصناف المباعة مع معلومات الكمية والسعر والإجمالي."
            onClick={() => setActiveReport('detailedSalesByItem')}
          />
        )}
        {hasPermission('view_reports_profits') && (
          <ReportCard
            title="قائمة الدخل (الأرباح والخسائر)"
            description="ملخص للإيرادات والمصروفات والأرباح خلال فترة محددة."
            onClick={() => setActiveReport('income')}
          />
        )}
        {hasPermission('view_reports_customers') && (
          <ReportCard
            title="أعمار الديون (Aging Report)"
            description="تحليل الديون المستحقة حسب الفترة الزمنية (30، 60، 90 يوم)."
            onClick={() => setActiveReport('aging')}
          />
        )}
        {hasPermission('view_reports_customers') && (
          <ReportCard
            title="كشف حساب عميل"
            description="عرض تفصيلي لجميع المعاملات المالية مع عميل محدد."
            onClick={() => setActiveReport('customer')}
          />
        )}
        {hasPermission('view_reports_suppliers') && (
          <ReportCard
            title="كشف حساب مورد"
            description="عرض تفصيلي لجميع المعاملات المالية مع مورد محدد."
            onClick={() => setActiveReport('supplier')}
          />
        )}

        {hasPermission('view_reports_treasury') && (
          <ReportCard
            title="كشف حساب الخزينة"
            description="عرض تفصيلي لجميع الحركات النقدية الواردة والصادرة من الخزينة."
            onClick={() => setActiveReport('treasury')}
          />
        )}
        {hasPermission('view_reports_profits') && (
          <>
            <ReportCard
              title="الميزانية العمومية"
              description="لقطة سريعة لأصول الشركة وخصومها وحقوق الملكية في وقت معين."
              onClick={() => setActiveReport('balanceSheet')}
            />
            <ReportCard
              title="ميزان المراجعة"
              description="قائمة بجميع الحسابات وأرصدتها للتأكد من توازن الدفاتر."
              onClick={() => setActiveReport('trialBalance')}
            />
          </>
        )}
        {hasPermission('access_settings') && (
          <ReportCard
            title="سجل العمليات (Audit Log)"
            description="تتبع جميع حركات المستخدمين، الإضافات، التعديلات والإلغاء."
            onClick={() => setActiveReport('logs')}
          />
        )}
        {hasPermission('access_chart_of_accounts') && (
          <ReportCard
            title="سجل القيود اليومية"
            description="عرض تفصيلي لجميع القيود المحاسبية الآلية واليدوية."
            onClick={() => setActiveReport('journal')}
          />
        )}
      </div>

      {activeReport === 'aging' && (
        <AgingReportModal
          onClose={handleCloseModal}
          customers={props.customers}
          suppliers={props.suppliers}
          salesInvoices={props.salesInvoices}
          purchaseInvoices={props.purchaseInvoices}
          customerPayments={props.customerPayments}
          supplierPayments={props.supplierPayments}
        />
      )}

      {/* {activeReport === 'balances' && (
        <BalancesReportModal
          onClose={handleCloseModal}
          customers={props.customers}
          suppliers={props.suppliers}
          salesInvoices={props.salesInvoices}
          purchaseInvoices={props.purchaseInvoices}
          customerPayments={props.customerPayments}
          supplierPayments={props.supplierPayments}
        />
      )} */}

      {activeReport === 'salesAnalysis' && (
        <SalesAnalysisModal
          onClose={handleCloseModal}
          salesInvoices={props.salesInvoices}
          products={props.products}
        />
      )}

      {activeReport === 'detailedSalesByItem' && (
        <DetailedSalesByItemReport
          onClose={handleCloseModal}
          salesInvoices={props.salesInvoices}
          products={props.products}
          customers={props.customers}
        />
      )}

      {activeReport === 'income' && (
        <IncomeStatementModal
          onClose={handleCloseModal}
          sales={props.salesInvoices}
          purchases={props.purchaseInvoices}
          journalEntries={props.journalEntries}
        />
      )}

      {activeReport === 'customer' && (
        <CustomerStatementModal
          onClose={handleCloseModal}
          customers={props.customers}
          invoices={props.salesInvoices}
          payments={props.customerPayments}
        />
      )}

      {activeReport === 'supplier' && (
        <SupplierStatementModal
          onClose={handleCloseModal}
          suppliers={props.suppliers}
          invoices={props.purchaseInvoices}
          payments={props.supplierPayments}
        />
      )}


      {activeReport === 'treasury' && (
        <TreasuryStatementModal
          onClose={handleCloseModal}
          salesInvoices={props.salesInvoices}
          purchaseInvoices={props.purchaseInvoices}
          expenses={props.expenses}
          customerPayments={props.customerPayments}
          supplierPayments={props.supplierPayments}
        />
      )}

      {activeReport === 'balanceSheet' && (
        <BalanceSheetModal
          onClose={handleCloseModal}
          products={props.products}
          customers={props.customers}
          suppliers={props.suppliers}
          salesInvoices={props.salesInvoices}
          purchaseInvoices={props.purchaseInvoices}
          customerPayments={props.customerPayments}
          supplierPayments={props.supplierPayments}
          expenses={props.expenses || []}
          partners={props.partners || []}
          partnerTransactions={props.partnerTransactions || []}
        />
      )}

      {activeReport === 'trialBalance' && (
        <TrialBalanceModal
          onClose={handleCloseModal}
          products={props.products}
          customers={props.customers}
          suppliers={props.suppliers}
          salesInvoices={props.salesInvoices}
          purchaseInvoices={props.purchaseInvoices}
          customerPayments={props.customerPayments}
          supplierPayments={props.supplierPayments}
          expenses={props.expenses || []}
          partners={props.partners || []}
          partnerTransactions={props.partnerTransactions || []}
          journalEntries={props.journalEntries || []}
          accounts={props.accounts || []}
        />
      )}

      {activeReport === 'journal' && (
        <div className="bg-white p-6 rounded-xl shadow-md fixed inset-0 z-50 overflow-y-auto m-8 border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">سجل القيود اليومية (الآلية)</h2>
            <button onClick={handleCloseModal} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">إغلاق</button>
          </div>
          <div className="text-sm text-gray-500 mb-4">عدد القيود: {props.journalEntries ? props.journalEntries.length : 0}</div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-purple-50">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">رقم القيد</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">التاريخ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">البيان</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">الحساب المدين</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">مدين</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">الحساب الدائن</th>
                  <th className="p-3 text-sm font-semibold tracking-wide border-b text-purple-800">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {props.journalEntries && props.journalEntries.slice().reverse().map((entry) => {
                  const debitLine = entry.lines.find(l => l.debit > 0);
                  const creditLine = entry.lines.find(l => l.credit > 0);
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-700 font-medium">{entry.id}</td>
                      <td className="p-3 text-sm text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{entry.date}</td>
                      <td className="p-3 text-sm text-gray-700">{entry.description}</td>
                      <td className="p-3 text-sm text-gray-700 text-green-700">{debitLine?.accountName}</td>
                      <td className="p-3 text-sm text-gray-700 font-bold">{debitLine?.debit.toLocaleString()}</td>
                      <td className="p-3 text-sm text-gray-700 text-red-700">{creditLine?.accountName}</td>
                      <td className="p-3 text-sm text-gray-700 font-bold">{creditLine?.credit.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {(!props.journalEntries || props.journalEntries.length === 0) && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">لا توجد قيود مسجلة حتى الآن</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'logs' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">سجل عمليات النظام (Audit Log)</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-semibold tracking-wide border-b">المستخدم</th>
                    <th className="p-3 text-sm font-semibold tracking-wide border-b">الإجراء</th>
                    <th className="p-3 text-sm font-semibold tracking-wide border-b">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {props.logs && props.logs.slice().map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-700 font-medium">{log.userName} <span className="text-gray-400 text-xs">({log.userId})</span></td>
                      <td className="p-3 text-sm text-gray-800">{log.action}</td>
                      <td className="p-3 text-sm text-gray-600" style={{ direction: 'ltr', textAlign: 'right' }}>
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                  {(!props.logs || props.logs.length === 0) && (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-500">لا توجد عمليات مسجلة حتى الآن</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
