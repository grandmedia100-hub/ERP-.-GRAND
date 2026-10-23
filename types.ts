
export type Page = 'dashboard' | 'sales' | 'purchases' | 'purchaseReturns' | 'purchaseRequests' | 'purchaseOrders' | 'inventory' | 'warehouse' | 'customers' | 'suppliers' | 'reports' | 'treasury' | 'settings' | 'accountingSettings' | 'chartOfAccounts' | 'users' | 'backup' | 'quotations' | 'auditLog' | 'journalEntries' | 'fixedAssets' | 'manufacturing' | 'printingJobs';

export type TreasuryAccountType = 'الخزينة الرئيسية' | 'انستاباى' | 'فودافون كاش' | 'بنك فيصل' | 'البنك الاهلى' | (string & {});

export type Permission =
  // 1. Dashboard & General
  | 'access_dashboard'

  // 2. Sales & Quotations & Customers
  | 'access_sales'
  | 'create_sales_invoice'
  | 'void_sales_invoice'
  | 'print_sales_invoice'
  | 'export_sales'
  | 'access_sales_returns'
  | 'create_sales_return'
  | 'access_quotations'
  | 'create_quotation'
  | 'edit_quotation'
  | 'convert_quotation'
  | 'access_customers'
  | 'create_customer'
  | 'edit_customer'
  | 'delete_customer'
  | 'collect_customer_payment'
  | 'view_customer_statement'
  | 'manage_customer_credit_limit'

  // 3. Purchases & Suppliers & Cycle
  | 'access_purchase_requests'
  | 'create_purchase_request'
  | 'approve_purchase_request'
  | 'access_purchase_orders'
  | 'create_purchase_order'
  | 'approve_purchase_order'
  | 'access_purchases'
  | 'create_purchase_invoice'
  | 'void_purchase_invoice'
  | 'print_purchase_invoice'
  | 'export_purchases'
  | 'access_purchase_returns'
  | 'create_purchase_return'
  | 'access_suppliers'
  | 'create_supplier'
  | 'edit_supplier'
  | 'delete_supplier'
  | 'pay_supplier_payment'
  | 'view_supplier_statement'

  // 4. Inventory, Items & Warehouses
  | 'access_inventory'
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'view_cost_price'
  | 'export_inventory'
  | 'access_warehouse'
  | 'manage_warehouses'
  | 'inventory_transfer'
  | 'inventory_count_adjustment'

  // 5. Manufacturing & Production
  | 'access_manufacturing'
  | 'create_bom'
  | 'create_production_order'
  | 'execute_production'
  | 'complete_production'
  | 'cancel_production'
  | 'view_manufacturing_costs'

  // 5b. Printing Job Orders & Subcontracting
  | 'access_printing_jobs'
  | 'create_printing_job'
  | 'edit_printing_job'
  | 'execute_printing_job_stage'
  | 'duplicate_printing_job'
  | 'view_customer_profitability_report'

  // 6. Treasury, Banks, Expenses & Partners
  | 'access_treasury'
  | 'create_receipt_voucher'
  | 'create_payment_voucher'
  | 'treasury_transfer'
  | 'access_expenses'
  | 'create_expense'
  | 'access_partners'
  | 'create_partner_transaction'

  // 7. General Ledger, Accounts & Fixed Assets
  | 'access_chart_of_accounts'
  | 'create_account'
  | 'access_journal_entries'
  | 'create_manual_journal'
  | 'delete_journal_entry'
  | 'access_fixed_assets'
  | 'create_fixed_asset'
  | 'calculate_depreciation'

  // 8. Reports & Financial Statements
  | 'access_reports'
  | 'view_reports_sales'
  | 'view_reports_purchases'
  | 'view_reports_customers'
  | 'view_reports_suppliers'
  | 'view_reports_treasury'
  | 'view_reports_profits'
  | 'view_balance_sheet'
  | 'view_trial_balance'
  | 'view_vat_declaration'
  | 'view_cash_flow_forecast'

  // 9. System Administration, Audit & Security
  | 'access_settings'
  | 'manage_accounting_settings'
  | 'access_accounting_audit'
  | 'manage_users'
  | 'manage_backup'
  | 'access_audit_log'
  | 'financial_year_lock';

export interface User {
  id: string;
  username: string;
  password: string; // Stored as plain text for this client-side demo (In real app, hash it)
  fullName: string;
  role: 'admin' | 'user' | 'developer';
  permissions: Permission[];
}

export interface ThemeSettings {
  uiScale: number; // Percentage (e.g., 75, 85, 100)
  fontFamily: string; // 'Cairo', 'Tajawal', etc.
  iconSize: 'small' | 'normal' | 'large';
  theme: 'default' | 'dark' | 'corporate' | 'emerald'; // Added theme choice
  backgroundEnabled?: boolean;
  backgroundOpacity?: number; // 50 to 98, default 90
  backgroundBlur?: 'none' | 'sm' | 'md' | 'lg'; // default 'sm'
  backgroundMode?: 'unified' | 'per_page'; // default 'per_page'
  defaultBackgroundUrl?: string;
  pageBackgrounds?: Record<string, string>;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  logo: string; // base64 string
  treasuryOpeningBalance: number; // Keep for backward compatibility (Main Treasury)
  treasuryBreakdown?: Record<string, number>; // New field for specific account opening balances
  financialYearLockDate?: string; // New: Lock date for financial period (YYYY-MM-DD)
  taxNumber?: string; // الرقم الضريبي
  commercialRegister?: string; // السجل التجاري
}

export interface PrintSettings {
  paperSize: 'A4' | 'A5' | 'thermal80';
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'compact' | 'minimal';
  primaryColor: string;
  fontFamily: 'Cairo' | 'Tajawal' | 'Almarai' | 'Amiri';
  fontSize: 'sm' | 'base' | 'lg';
  showLogo: boolean;
  logoSize: 'sm' | 'md' | 'lg';
  showCompanyDetails: boolean;
  headerLayout: 'standard' | 'centered' | 'modern';
  taxNumber?: string;
  commercialRegister?: string;
  showTerms?: boolean;
  footerNotes?: string;
  showGreeting?: boolean;
  footerGreeting?: string;
  showSignatures: boolean;
  showSignature1?: boolean;
  signature1?: string;
  showSignature2?: boolean;
  signature2?: string;
  showSignature3?: boolean;
  signature3?: string;
  showQrCode?: boolean;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: 'مدين' | 'دائن';
  statementType?: 'balance_sheet' | 'income_statement';
  isGroup?: boolean;
  parentId: string | null;
  isSystem?: boolean;          // Cannot be deleted if true
  linkedWarehouseId?: string;  // Links account balance to a specific warehouse (calculated from products)
}

export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  code: string;     // Short prefix code e.g. 'CAI', 'ALX'
  name: string;     // Full name e.g. 'مخزن القاهرة'
  location?: string; // Optional address/location
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  lowStockThreshold: number;
  unit?: string;        // وحدة القياس
  sku?: string;         // كود الصنف (مرتبط بالمخزن)
  warehouseId?: string; // المخزن المرتبط بالصنف
  warehouseName?: string; // اسم المخزن (cached)
  category?: string;    // التصنيف
  barcode?: string;     // الباركود
  productType?: string; // نوع الصنف (خام، منتج تام، إلخ)
}

// حركات المخزون - نظام الجرد المستمر
export type StockTransactionType =
  | 'opening_balance'    // رصيد افتتاحي
  | 'purchase'           // شراء (من فاتورة مشتريات)
  | 'purchase_return'    // مرتجع مشتريات
  | 'sale'               // بيع (من فاتورة مبيعات)
  | 'sale_return'        // مرتجع مبيعات
  | 'adjustment_in'      // إذن إضافة (تسوية يدوية)
  | 'adjustment_out'     // إذن صرف (تسوية يدوية / هالك)
  | 'production_in'      // وارد إنتاج (منتج تام من أمر تصنيع)
  | 'production_out'     // صادر خامات لإنتاج (صرف خامات لأمر تصنيع)
  | 'count_adjustment';  // تسوية جردية

export interface StockTransaction {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: StockTransactionType;
  quantityIn: number;   // الكمية الواردة
  quantityOut: number;  // الكمية الصادرة
  unitCost: number;     // سعر التكلفة للوحدة
  totalCost: number;    // إجمالي قيمة الحركة
  balanceAfter: number; // الرصيد بعد الحركة
  referenceId?: string; // رقم الفاتورة أو المرجع
  referenceType?: 'SalesInvoice' | 'PurchaseInvoice' | 'Adjustment' | 'Opening';
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  productCode?: string; // كود الصنف أو الباركود
  sku?: string;
  barcode?: string;
  description?: string;
  quantity: number;
  price: number;
  total: number;
  unit?: 'عدد' | 'كيلو';
  priceType?: 'سعر الوحدة' | 'سعر الطن';
  itemType?: 'product' | 'expense'; // 'product' = inventory item, 'expense' = service/expense
  size?: string; // New: Size of the item
  variantName?: string; // New: Distinct name for variation/material
  pricingTiers?: { quantity: number; price: number }[]; // New: Multi-quantity options
  cost?: number; // New: Direct cost for Job Costing
}

export interface PaymentInstallment {
  id: string;
  date: string; // Due date
  amount: number;
  isPaid: boolean;
  notes?: string;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  companyName?: string; // Added field
  date: string;
  items: InvoiceItem[];
  subTotal?: number; // Added for discount support
  discountValue?: number; // Added for discount support
  discountType?: 'amount' | 'percentage'; // Added for discount support
  taxRate?: number; // نسبة الضريبة المضافة (مثل 14%)
  taxAmount?: number; // قيمة الضريبة المضافة
  total: number;
  paymentMethod: 'نقدي' | 'اجل' | 'شيك';
  treasuryAccount?: string; // Target treasury account when paymentMethod is cash
  invoiceType?: 'purchase' | 'return'; // New field for returns
  notes?: string;
  status: 'active' | 'voided'; // New field for immutable invoices
  branchId?: string;
  isIntercompany?: boolean;
  sourceBranchId?: string;
}

export interface SalesInvoice {
  id: string;
  customerId: string;
  customerName: string;
  companyName?: string; // Added field
  date: string;
  items: InvoiceItem[];
  subTotal?: number; // Added for discount support
  discountValue?: number; // Added for discount support
  discountType?: 'amount' | 'percentage'; // Added for discount support
  taxRate?: number; // نسبة الضريبة المضافة (مثل 14%)
  taxAmount?: number; // قيمة الضريبة المضافة
  total: number;
  paymentMethod: 'نقدي' | 'اجل' | 'شيك';
  invoiceType?: 'sale' | 'return'; // New field for returns
  notes?: string;
  paymentSchedule?: PaymentInstallment[]; // Payment Plan
  status: 'active' | 'voided'; // New field for immutable invoices
  branchId?: string;
  isIntercompany?: boolean;
  targetBranchId?: string;
}

export interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string; // Added field
  phone: string;
  address: string;
  openingBalance: number;
  creditLimit?: number; // سقف الائتمان بالجنيه
  creditPeriodDays?: number; // فترة السماح بالأيام للبيع الآجل
  isCreditLocked?: boolean; // تجميد البيع الآجل للعميل
  taxNumber?: string; // الرقم الضريبي
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string; // Added field
  phone: string;
  address: string;
  openingBalance: number;
  taxNumber?: string; // الرقم الضريبي للمورد
}

export interface Expense {
  id: string;
  voucherNumber: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status?: 'active' | 'voided'; // Added status
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  notes?: string;
  treasuryAccount?: TreasuryAccountType;
  isExpense?: boolean;
  expenseCategory?: string;
  fee?: number; // New field for transaction fees
  status?: 'active' | 'voided'; // Added status
  branchId?: string;
  isIntercompany?: boolean;
  targetBranchId?: string;
  targetBranchName?: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
  targetCustomerId?: string;
  targetCustomerName?: string;
  mirrorPaymentId?: string;
  receivedByOtherBranch?: boolean;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  notes?: string;
  treasuryAccount?: TreasuryAccountType;
  paymentMethod?: string;      // Added: payment method (e.g. 'نقدي', 'تحويل')
  referenceId?: string;        // Added: links to source invoice (for auto-payments from purchase invoices)
  isExpense?: boolean;
  expenseCategory?: string;
  fee?: number; // New field for transaction fees
  status?: 'active' | 'voided'; // Added status
  branchId?: string;
  isIntercompany?: boolean;
  targetBranchId?: string;
  targetBranchName?: string;
  sourceBranchId?: string;
  sourceBranchName?: string;
  targetSupplierId?: string;
  targetSupplierName?: string;
  mirrorPaymentId?: string;
  paidByOtherBranch?: boolean;
}

export interface Partner {
  id: string;
  name: string;
  openingBalance: number;
}

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  type: 'إيداع' | 'سحب';
  description: string;
  amount: number;
  status?: 'active' | 'voided'; // Added status
}

export interface TreasuryTransfer {
  id: string;
  date: string;
  fromAccount: TreasuryAccountType;
  toAccount: TreasuryAccountType;
  amount: number;
  fee: number;
  notes?: string;
  status?: 'active' | 'voided';
  branchId?: string;
  isIntercompany?: boolean;
  fromBranchId?: string;
  fromBranchName?: string;
  toBranchId?: string;
  toBranchName?: string;
  sourceBranchName?: string;
  mirrorTransferId?: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  referenceType?: 'SalesInvoice' | 'PurchaseInvoice' | 'Payment' | 'Manual';
  referenceId?: string;
  lines: JournalEntryLine[];
  createdAt: string;
  type?: 'manual' | 'auto' | string;
  branchId?: string;
  status?: 'posted' | 'draft' | string;
}

export interface Quotation {
  id: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  date: string;
  expirationDate?: string;
  items: InvoiceItem[];
  total: number;
  notes?: string;
  delegateName?: string; // Added delegate name
  status: 'pending' | 'accepted' | 'rejected';
  deliveryDuration?: string; // New: Delivery duration
  createdAt?: string; // New: Creation timestamp
  showTotalInPrint?: boolean; // New: Toggle total visibility in PDF
}

// ===== Fixed Assets & Depreciation =====
export type DepreciationMethod = 'straight_line' | 'declining_balance';

export interface FixedAsset {
  id: string;
  name: string;
  category: string; // آلات، معدات، سيارات، أثاث، إلخ
  purchaseDate: string;
  purchaseCost: number;
  usefulLifeYears: number;
  salvageValue: number; // القيمة التخريدية
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  status: 'active' | 'disposed' | 'fully_depreciated';
  notes?: string;
  createdAt: string;
  depreciationExpenseAccount?: string;
  accumulatedDepreciationAccount?: string;
  cashAccount?: string;
  tax1Name?: string;
  tax1Amount?: number;
  tax2Name?: string;
  tax2Amount?: number;
}

export interface DepreciationEntry {
  id: string;
  assetId: string;
  date: string;
  amount: number;
  journalEntryId?: string;
}

// ===== Manufacturing (Corrugated Cardboard) =====
export type ProductionPlanStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

// BOM (Bill of Materials)
export interface BOMItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
  warehouseId?: string;
}

export interface BillOfMaterials {
  id: string;
  code: string;
  name: string;
  outputProductId: string;
  outputProductName: string;
  outputQuantity: number;
  outputUnit: string;
  items: BOMItem[];
  totalCost?: number;
  isDefault?: boolean;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

// Production Plan
export interface ProductionPlanItem {
  productId: string;
  productName: string;
  bomId: string;
  bomName: string;
  quantity: number;
}

export interface ProductionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  date: string;
  fromDate: string;
  toDate: string;
  customerId?: string;
  customerName?: string;
  employeeIds?: string[];
  sourceType?: string;
  sourceRef?: string;
  warehouseId: string;
  costAccountId: string;
  items: ProductionPlanItem[];
  status: ProductionPlanStatus;
  createdAt: string;
}

// Production Order Expenses
export interface ProductionExpense {
  id: string;
  description: string;
  accountId: string;
  accountName: string;
  amount: number;
}

// Production Operations (Manufacturing processes)
export interface ProductionOperation {
  id: string;
  name: string;
  workCenterId?: string;
  workCenterName?: string;
  durationMinutes?: number;
  costPerHour?: number;
  totalCost: number;
}

// Scrap / Waste
export interface ProductionScrap {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  accountId?: string;
  accountName?: string;
  unitCost?: number;
  totalCost?: number;
}

export type ProductionOrderStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  code: string;
  name: string;
  bomId: string;
  bomName: string;
  date: string;
  fromDate: string;
  toDate: string;
  customerId?: string;
  customerName?: string;
  employeeIds?: string[];
  accountId?: string;
  accountName?: string;
  planId?: string;
  plannedQuantity: number;
  producedQuantity: number;
  wasteQuantity: number;
  status: ProductionOrderStatus;
  // Raw materials (from BOM)
  bomItems: BOMItem[];
  rawMaterialCost: number;
  // Expenses section
  expenses: ProductionExpense[];
  expensesTotalCost: number;
  // Operations section
  operations: ProductionOperation[];
  operationsTotalCost: number;
  // Scrap section
  scraps: ProductionScrap[];
  scrapTotalCost: number;
  // Totals
  unitCost: number;
  totalCost: number;
  outputProductId: string;
  outputProductName: string;
  outputWarehouseId: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
}

// ==================== Procurement Documentary Cycle ====================
export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected' | 'converted';

export interface PurchaseRequestItem {
  productId: string;
  productName: string;
  productCode?: string;
  quantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  notes?: string;
}

export interface PurchaseRequest {
  id: string;
  date: string;
  department?: string; // القسم الطالب (الإنتاج، الصيانة، المخزن، إلخ)
  requesterName?: string; // اسم الموظف/المسؤول مقدم الطلب
  priority: 'normal' | 'urgent' | 'critical'; // الأولوية: عادي، عاجل، طارئ
  items: PurchaseRequestItem[];
  totalEstimatedAmount: number;
  notes?: string;
  status: PurchaseRequestStatus;
  approvedBy?: string;
  branchId?: string;
  createdAt?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partially_received' | 'completed' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  date: string;
  expectedDeliveryDate?: string;
  supplierId: string;
  supplierName: string;
  companyName?: string;
  requestId?: string; // مرجع طلب الشراء إن وجد
  items: InvoiceItem[];
  subTotal?: number;
  discountValue?: number;
  discountType?: 'amount' | 'percentage';
  taxRate?: number;
  taxAmount?: number;
  total: number;
  paymentTerms?: string; // شروط السداد (نقدي / آجل 30 يوم / إلخ)
  deliveryLocation?: string; // موقع/مخزن الاستلام
  notes?: string;
  status: PurchaseOrderStatus;
  branchId?: string;
  createdAt?: string;
}

// ==================== Module Accounting Settings ====================
export interface ModulePostingSettings {
  // Sales Module
  salesReceivablesAccountId?: string;      // الافتراضي 1103 (العملاء)
  salesRevenueAccountId?: string;          // الافتراضي 4101 (إيرادات المبيعات)
  salesReturnsAccountId?: string;          // الافتراضي 4102 (مرتجعات ومسموحات المبيعات)
  salesVatAccountId?: string;              // الافتراضي 2105 (ضريبة القيمة المضافة المحصلة)
  salesDiscountAccountId?: string;         // الافتراضي 5301 (خصم مسموح به)
  salesCogsAccountId?: string;             // الافتراضي 5101 (تكلفة البضاعة المباعة)
  salesDefaultInventoryAccountId?: string; // الافتراضي 1104 (المخزون)

  // Purchases Module
  purchasePayablesAccountId?: string;          // الافتراضي 2101 (الموردين)
  purchaseDefaultInventoryAccountId?: string; // الافتراضي 110401 (مخزون الخامات والمشتريات)
  purchaseVatAccountId?: string;              // الافتراضي 1106 (ضريبة القيمة المضافة مدخلات)
  purchaseDiscountAccountId?: string;         // الافتراضي 4202 (خصم مكتسب)
  purchaseExpensesAccountId?: string;         // الافتراضي 5201 (مصروفات مشتريات/تشغيل)
  purchaseGoodsInTransitAccountId?: string;   // الافتراضي 110404 (بضاعة بالطريق / اعتمادات مستندية)

  // Manufacturing Module
  mfgWipAccountId?: string;                // الافتراضي 110402 (التشغيل تحت التشغيل WIP)
  mfgRawMaterialAccountId?: string;        // الافتراضي 110401 (مخزون الخامات)
  mfgFinishedGoodsAccountId?: string;      // الافتراضي 110403 (مخزون الإنتاج التام)
  mfgSubcontractorAccountId?: string;      // الافتراضي 2101 (الموردين - مصنعيات الغير)
  mfgScrapLossAccountId?: string;          // الافتراضي 5203 (خسائر هالك إنتاج)
  mfgDirectLaborAccountId?: string;        // الافتراضي 5102 (أجور ومصروفات تشغيل مباشرة)
  mfgDefaultExpenseAccountId?: string;     // الافتراضي 5201 (مصروفات تشغيلية)

  // Treasury Module
  treasuryMainCashAccountId?: string;      // الافتراضي 1101 (الخزينة الرئيسية)
  treasuryBankAccountId?: string;          // الافتراضي 1102 (البنك الأهلي)
  treasuryVodafoneCashAccountId?: string;  // الافتراضي 1106 (فودافون كاش)
  treasuryInstapayAccountId?: string;      // الافتراضي 1107 (إنستاباي)
  treasuryBankFeesAccountId?: string;      // الافتراضي 5201 / 5202 (عمولات ومصاريف بنكية)
  treasuryPartnerCurrentAccountId?: string;// الافتراضي 3102 (جاري الشركاء)

  // Warehouse & Fixed Assets Module
  inventoryAdjustmentLossAccountId?: string; // الافتراضي 5203 / 5201 (تسويات جردية عجز)
  inventoryAdjustmentGainAccountId?: string; // الافتراضي 4101 (تسويات جردية فائض)
  fixedAssetsAccumDepreciationAccountId?: string; // الافتراضي 1202 (مجمع الإهلاك)
  fixedAssetsDepreciationExpenseAccountId?: string; // الافتراضي 5204 (مصروف إهلاك الأصول)

  // Printing Job Orders Module
  printingWipAccountId?: string;            // الافتراضي 110403 (تكاليف أوامر تشغيل مطبوعات WIP)
  printingRevenueAccountId?: string;        // الافتراضي 4101 (إيرادات المطبوعات)
  printingCogsAccountId?: string;           // الافتراضي 5101 (تكلفة بضاعة مباعة - مطبوعات)
}

// ==================== Printing Job Orders Types ====================
export type PrintingOperationId =
  | 'paper_cutting'      // 1. قص ورق
  | 'ctp_plates'         // 2. ذنكات
  | 'laser_die'          // 3. فورمة
  | 'printing'           // 4. طباعة
  | 'lamination'         // 5. سلوفان
  | 'spot_uv'            // 6. سبوت uv
  | 'flood_uv'           // 7. uv كامل
  | 'pvc_window'         // 8. شباك pvc
  | 'gold_metalized'     // 9. متلايز ذهبي
  | 'silver_metalized'   // 10. متلايز فضي
  | 'hot_foil'           // 11. بصمة
  | 'embossing'          // 12. كوفراج
  | 'die_cutting'        // 13. تكسير
  | 'gluing'             // 14. لزق
  | 'staple_binding'     // 15. دبوس
  | 'spiral_binding'     // 16. سلك لولبي
  | 'packaging'          // 17. تغليف
  | 'shipping';          // 18. شحن

export interface PrintingOperationDefinition {
  id: PrintingOperationId;
  name: string;
  category: 'prepress' | 'press' | 'coating' | 'converting' | 'binding' | 'logistics';
  icon: string;
  defaultUnit: string;
}

export interface JobOperationItem {
  id: string; // unique for this order stage
  operationId: PrintingOperationId;
  name: string;
  executionType: 'external' | 'internal'; // لدى الغير / تصنيع داخلي
  status: 'pending' | 'in_progress' | 'completed';
  
  // External (Subcontracting)
  supplierId?: string;
  supplierName?: string;
  invoiceNumber?: string;
  cost: number;
  paymentMethod?: 'نقدي' | 'اجل';
  journalEntryId?: string;
  purchaseInvoiceId?: string;
  
  // Internal (In-House)
  machineName?: string;
  operatorName?: string;
  internalCostEstimate?: number;

  // Technical details
  quantity?: number;
  unit?: string;
  specifications?: string;
  notes?: string;
  completedAt?: string;
}

export interface PrintingJobOrder {
  id: string; // e.g. JOB-2026-0001
  code: string;
  date: string;
  deliveryDate?: string;
  customerId: string;
  customerName: string;
  companyName?: string;
  productTitle: string; // اسم المطبوع (مثال: علبة عطر 50 مل فاخرة)
  productCategory?: string; // علب كرتون / بروشور / كتالوج / كروت / أكياس
  quantity: number; // الكمية المطلوبة
  unit: string; // عدد / علبة / ألف / كرتونة
  
  // Financials
  clientSalePrice: number; // سعر البيع المتفق عليه للعميل
  taxRate?: number;
  taxAmount?: number;
  totalWithTax?: number;
  
  // Operations & Workflow
  operations: JobOperationItem[];
  currentStageIndex: number;
  status: 'draft' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';

  // Cost & Profit Summary
  totalActualCost: number; // مجموع تكاليف العمليات المكتملة
  grossProfit: number; // clientSalePrice - totalActualCost
  profitMarginPercent: number; // (grossProfit / clientSalePrice) * 100

  // Billing & Closing
  salesInvoiceId?: string;
  cogsJournalEntryId?: string;
  notes?: string;
  createdAt: string;
  branchId?: string;
}

// Consolidated Vendor Invoice (Feature 5)
export interface ConsolidatedVendorInvoiceLine {
  id: string;
  jobOrderId: string;
  jobOrderCode: string;
  customerName: string;
  operationId: PrintingOperationId;
  operationName: string;
  amount: number;
  notes?: string;
}

export interface ConsolidatedVendorInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  paymentMethod: 'نقدي' | 'اجل';
  lines: ConsolidatedVendorInvoiceLine[];
  journalEntryId?: string;
  purchaseInvoiceId?: string;
  createdAt: string;
  notes?: string;
}

