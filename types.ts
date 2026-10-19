
export type Page = 'dashboard' | 'sales' | 'purchases' | 'inventory' | 'warehouse' | 'customers' | 'suppliers' | 'reports' | 'treasury' | 'settings' | 'chartOfAccounts' | 'users' | 'backup' | 'quotations' | 'auditLog' | 'journalEntries' | 'fixedAssets' | 'manufacturing';

export type TreasuryAccountType = 'الخزينة الرئيسية' | 'انستاباى' | 'فودافون كاش' | 'بنك فيصل' | 'البنك الاهلى' | (string & {});

export type Permission =
  | 'access_dashboard'
  | 'access_sales'
  | 'access_purchases'
  | 'access_inventory'
  | 'access_customers'
  | 'access_suppliers'
  | 'access_treasury'
  | 'access_reports'
  | 'access_settings'
  | 'manage_users'
  | 'access_chart_of_accounts'
  | 'manage_backup'
  | 'view_reports_sales'
  | 'view_reports_purchases'
  | 'view_reports_customers'
  | 'view_reports_suppliers'
  | 'view_reports_treasury'
  | 'view_reports_profits'
  | 'access_quotations'
  | 'access_warehouse'
  | 'access_journal_entries'
  | 'access_fixed_assets'
  | 'access_manufacturing'
  | 'access_expenses'
  | 'access_partners';

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
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  logo: string; // base64 string
  treasuryOpeningBalance: number; // Keep for backward compatibility (Main Treasury)
  treasuryBreakdown?: Record<string, number>; // New field for specific account opening balances
  financialYearLockDate?: string; // New: Lock date for financial period (YYYY-MM-DD)
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
}

export interface Supplier {
  id: string;
  name: string;
  companyName?: string; // Added field
  phone: string;
  address: string;
  openingBalance: number;
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

