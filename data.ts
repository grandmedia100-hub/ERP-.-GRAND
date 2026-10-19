import type { Product, Customer, Supplier, SalesInvoice, PurchaseInvoice, Expense, CustomerPayment, SupplierPayment, Partner, PartnerTransaction, Account, User, JournalEntry, LogEntry, Quotation, TreasuryTransfer, Warehouse } from './types.ts';

export const products: Product[] = [];

export const warehouses: Warehouse[] = [
  { id: 'WH-0001', code: 'GEN', name: 'المخزن الرئيسي', location: 'المقر الرئيسي', isActive: true },
  { id: 'WH-0002', code: 'FIN', name: 'مخزن المنتجات النهائية', location: '', isActive: true },
  { id: 'WH-0003', code: 'RAW', name: 'مخزن المواد الخام', location: '', isActive: true },
];

export const customers: Customer[] = [];

export const suppliers: Supplier[] = [];

export const salesInvoices: SalesInvoice[] = [];

export const quotations: Quotation[] = [];

export const purchaseInvoices: PurchaseInvoice[] = [];

export const expenses: Expense[] = [];

export const customerPayments: CustomerPayment[] = [];

export const supplierPayments: SupplierPayment[] = [];

export const partners: Partner[] = [];

export const partnerTransactions: PartnerTransaction[] = [];

export const treasuryTransfers: TreasuryTransfer[] = [];

export const logs: LogEntry[] = [];

export const journalEntries: JournalEntry[] = [];

export const accounts: Account[] = [
  // 1. Assets (الأصول) - Balance Sheet
  { id: '1', code: '1', name: 'الأصول', type: 'مدين', statementType: 'balance_sheet', isGroup: true, parentId: null, isSystem: true },
  
  { id: '11', code: '11', name: 'الأصول المتداولة', type: 'مدين', statementType: 'balance_sheet', isGroup: true, parentId: '1', isSystem: true },
  { id: '1101', code: '1101', name: 'الخزينة الرئيسية (النقدية)', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },
  { id: '1102', code: '1102', name: 'البنك الأهلي', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },
  { id: '1103', code: '1103', name: 'العملاء (المدينون)', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },
  { id: '1104', code: '1104', name: 'المخزون', type: 'مدين', statementType: 'balance_sheet', isGroup: true, parentId: '11', isSystem: true },
  { id: '110401', code: '110401', name: 'مخزون الخامات', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '1104', isSystem: false, linkedWarehouseId: 'WH-0003' },
  { id: '110402', code: '110402', name: 'حساب التصنيع (WIP)', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '1104', isSystem: false },
  { id: '110403', code: '110403', name: 'مخزون الإنتاج التام', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '1104', isSystem: false, linkedWarehouseId: 'WH-0002' },
  { id: '110404', code: '110404', name: 'المخزون الرئيسي', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '1104', isSystem: false, linkedWarehouseId: 'WH-0001' },
  { id: '1105', code: '1105', name: 'بنك فيصل', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },
  { id: '1106', code: '1106', name: 'فودافون كاش', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },
  { id: '1107', code: '1107', name: 'انستاباى', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '11', isSystem: true },

  { id: '12', code: '12', name: 'الأصول الثابتة', type: 'مدين', statementType: 'balance_sheet', isGroup: true, parentId: '1', isSystem: true },
  { id: '1201', code: '1201', name: 'حساب الأصول الثابتة', type: 'مدين', statementType: 'balance_sheet', isGroup: false, parentId: '12', isSystem: true },

  // 2. Liabilities (الخصوم) - Balance Sheet
  { id: '2', code: '2', name: 'الخصوم', type: 'دائن', statementType: 'balance_sheet', isGroup: true, parentId: null, isSystem: true },
  
  { id: '21', code: '21', name: 'الخصوم المتداولة', type: 'دائن', statementType: 'balance_sheet', isGroup: true, parentId: '2', isSystem: true },
  { id: '2101', code: '2101', name: 'الموردين (الدائنون)', type: 'دائن', statementType: 'balance_sheet', isGroup: false, parentId: '21', isSystem: true },
  { id: '2102', code: '2102', name: 'جاري الشركات الشقيقة (الأطراف ذات العلاقة)', type: 'دائن', statementType: 'balance_sheet', isGroup: false, parentId: '21', isSystem: true },

  // 3. Equity (حقوق الملكية) - Balance Sheet
  { id: '3', code: '3', name: 'حقوق الملكية', type: 'دائن', statementType: 'balance_sheet', isGroup: true, parentId: null, isSystem: true },
  
  { id: '31', code: '31', name: 'رأس المال', type: 'دائن', statementType: 'balance_sheet', isGroup: true, parentId: '3', isSystem: true },
  { id: '3101', code: '3101', name: 'حساب رأس المال', type: 'دائن', statementType: 'balance_sheet', isGroup: false, parentId: '31', isSystem: true },
  { id: '3102', code: '3102', name: 'جاري الشركاء', type: 'دائن', statementType: 'balance_sheet', isGroup: false, parentId: '31', isSystem: true },

  // 4. Income (الإيرادات) - Income Statement
  { id: '4', code: '4', name: 'الإيرادات', type: 'دائن', statementType: 'income_statement', isGroup: true, parentId: null, isSystem: true },
  
  { id: '41', code: '41', name: 'إيرادات المبيعات', type: 'دائن', statementType: 'income_statement', isGroup: true, parentId: '4', isSystem: true },
  { id: '4101', code: '4101', name: 'حساب إيرادات المبيعات', type: 'دائن', statementType: 'income_statement', isGroup: false, parentId: '41', isSystem: true },
  { id: '4102', code: '4102', name: 'مرتجعات ومخصومات المبيعات', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '41', isSystem: true },

  // 5. Expenses (المصروفات) - Income Statement
  { id: '5', code: '5', name: 'المصروفات', type: 'مدين', statementType: 'income_statement', isGroup: true, parentId: null, isSystem: true },
  
  { id: '51', code: '51', name: 'تكلفة المبيعات', type: 'مدين', statementType: 'income_statement', isGroup: true, parentId: '5', isSystem: true },
  { id: '5101', code: '5101', name: 'تكلفة البضاعة المباعة (COGS)', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '51', isSystem: true },
  { id: '5102', code: '5102', name: 'تكلفة التصنيع والمصنعيات', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '51', isSystem: true },
  
  { id: '52', code: '52', name: 'مصروفات التشغيل', type: 'مدين', statementType: 'income_statement', isGroup: true, parentId: '5', isSystem: true },
  { id: '5201', code: '5201', name: 'مصروفات عامة وإدارية', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '52', isSystem: true },
  { id: '5202', code: '5202', name: 'مصاريف وعمولات بنكية', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '52', isSystem: true },
  { id: '5203', code: '5203', name: 'خسائر هالك الإنتاج', type: 'مدين', statementType: 'income_statement', isGroup: false, parentId: '52', isSystem: true },
];

export const users: User[] = [
  {
    id: 'u1',
    username: 'admin',
    password: '123',
    fullName: 'المدير العام',
    role: 'admin',
    permissions: ['access_dashboard', 'access_sales', 'access_purchases', 'access_inventory', 'access_expenses', 'access_customers', 'access_treasury', 'access_partners', 'access_reports', 'access_settings', 'manage_users', 'access_chart_of_accounts']
  },
  {
    id: 'dev1',
    username: 'dev',
    password: '123',
    fullName: 'مطور النظام',
    role: 'developer',
    permissions: ['access_dashboard', 'access_sales', 'access_purchases', 'access_inventory', 'access_expenses', 'access_customers', 'access_treasury', 'access_partners', 'access_reports', 'access_settings', 'manage_users', 'access_chart_of_accounts']
  }
];