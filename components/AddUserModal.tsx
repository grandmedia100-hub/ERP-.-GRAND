import React, { useState, useEffect, useMemo } from 'react';
import type { User, Permission } from '../types.ts';
import AlertModal from './AlertModal.tsx';

interface AddUserModalProps {
  onClose: () => void;
  onSave: (user: Omit<User, 'id'> & { id?: string }) => void;
  userToEdit: User | null;
}

interface PermissionItem {
  key: Permission;
  label: string;
  desc: string;
  type?: 'view' | 'create' | 'edit' | 'danger';
}

interface PermissionGroup {
  id: string;
  title: string;
  icon: string;
  color: string;
  badgeBg: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'sales',
    title: 'المبيعات وعروض الأسعار والعملاء',
    icon: '📈',
    color: 'emerald',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    items: [
      { key: 'access_sales', label: 'عرض صفحة فواتير المبيعات', desc: 'تصفح قائمة فواتير المبيعات وتفاصيلها', type: 'view' },
      { key: 'create_sales_invoice', label: 'إنشاء فواتير بيع جديدة', desc: 'إصدار فواتير بيع وحفظها في النظام', type: 'create' },
      { key: 'void_sales_invoice', label: 'إلغاء وعكس فواتير البيع', desc: 'إلغاء الفواتير وعكس قيودها اليومية تلقائياً', type: 'danger' },
      { key: 'print_sales_invoice', label: 'طباعة فواتير البيع', desc: 'تصدير وطباعة الفواتير ورقياً أو PDF', type: 'view' },
      { key: 'export_sales', label: 'تصدير المبيعات لإكسيل', desc: 'تحميل ملفات Excel لقوائم المبيعات', type: 'view' },
      { key: 'access_sales_returns', label: 'عرض مرتجعات المبيعات', desc: 'استعراض شاشة وقائمة مرتجعات البيع', type: 'view' },
      { key: 'create_sales_return', label: 'إصدار مرتجع بيع (Credit Note)', desc: 'تسجيل مرتجع مبيعات وإرجاع البضاعة للمخزن', type: 'create' },
      { key: 'access_quotations', label: 'عرض عروض الأسعار', desc: 'تصفح عروض الأسعار المسجلة', type: 'view' },
      { key: 'create_quotation', label: 'إنشاء عرض سعر جديد', desc: 'إصدار عروض أسعار للعملاء', type: 'create' },
      { key: 'edit_quotation', label: 'تعديل وحذف عروض الأسعار', desc: 'تغيير الأسعار والكميات في عروض الأسعار', type: 'edit' },
      { key: 'convert_quotation', label: 'تحويل عرض السعر لفاتورة بيع', desc: 'تحويل العرض مباشرة إلى فاتورة بيع فعالة', type: 'create' },
      { key: 'access_customers', label: 'عرض دليل العملاء', desc: 'تصفح سجل العملاء وأرقام هواتفهم', type: 'view' },
      { key: 'create_customer', label: 'إضافة عميل جديد', desc: 'تسجيل بطاقة عميل جديد في الدليل', type: 'create' },
      { key: 'edit_customer', label: 'تعديل بيانات العملاء', desc: 'تغيير بيانات الاتصال والأسعار للعميل', type: 'edit' },
      { key: 'delete_customer', label: 'حذف عميل', desc: 'حذف العميل نهائياً من قاعدة البيانات', type: 'danger' },
      { key: 'collect_customer_payment', label: 'تسجيل سندات قبض من العملاء', desc: 'تحصيل نقدية أو شيكات وتخفيض مديونية العميل', type: 'create' },
      { key: 'view_customer_statement', label: 'طباعة كشف حساب عميل', desc: 'استخراج كشف الحساب التفصيلي والأرصدة', type: 'view' },
      { key: 'manage_customer_credit_limit', label: 'إدارة وتجاوز حدود الائتمان', desc: 'تعديل السقف الائتماني وتجاوز التجميد الآلي', type: 'danger' },
    ]
  },
  {
    id: 'purchases',
    title: 'المشتريات والدورة المستندية والموردين',
    icon: '🛒',
    color: 'amber',
    badgeBg: 'bg-amber-100 text-amber-800',
    items: [
      { key: 'access_purchase_requests', label: 'عرض طلبات الشراء (PR)', desc: 'تصفح طلبات الاحتياج من الأقسام', type: 'view' },
      { key: 'create_purchase_request', label: 'إنشاء طلب شراء جديد', desc: 'تقديم طلب شراء خامات أو مستلزمات', type: 'create' },
      { key: 'approve_purchase_request', label: 'اعتماد طلب الشراء وتحويله لأمر PO', desc: 'موافقة الإدارة والتحويل لأمر شراء', type: 'edit' },
      { key: 'access_purchase_orders', label: 'عرض أوامر الشراء (PO)', desc: 'تصفح أوامر التوريد الصادرة للموردين', type: 'view' },
      { key: 'create_purchase_order', label: 'إنشاء أمر شراء PO جديد', desc: 'إصدار أمر توريد معتمد للمورد', type: 'create' },
      { key: 'approve_purchase_order', label: 'اعتماد أمر الشراء والتحويل لفاتورة', desc: 'استلام البضاعة وتحويل أمر الشراء لفاتورة', type: 'edit' },
      { key: 'access_purchases', label: 'عرض فواتير المشتريات', desc: 'تصفح فواتير المشتريات الموردة', type: 'view' },
      { key: 'create_purchase_invoice', label: 'تسجيل فاتورة شراء جديدة', desc: 'إثبات فاتورة مورد وزيادة المخزن والمديونية', type: 'create' },
      { key: 'void_purchase_invoice', label: 'إلغاء فاتورة شراء وعكس القيد', desc: 'إلغاء الفاتورة وتخفيض المخزن والمديونية', type: 'danger' },
      { key: 'print_purchase_invoice', label: 'طباعة فواتير المشتريات', desc: 'طباعة وتصدير فواتير الشراء', type: 'view' },
      { key: 'export_purchases', label: 'تصدير المشتريات لإكسيل', desc: 'تنزيل كشوفات المشتريات بتنسيق Excel', type: 'view' },
      { key: 'access_purchase_returns', label: 'عرض مرتجعات المشتريات (Debit Notes)', desc: 'تصفح شاشة إشعارات الخصم والمرتجعات', type: 'view' },
      { key: 'create_purchase_return', label: 'إنشاء مرتجع مشتريات للمورد', desc: 'رد البضاعة واسترداد النقدية أو خصم الحساب', type: 'create' },
      { key: 'access_suppliers', label: 'عرض دليل الموردين', desc: 'تصفح قائمة الموردين وأرقامهم وشركاتهم', type: 'view' },
      { key: 'create_supplier', label: 'إضافة مورد جديد', desc: 'تسجيل مورد جديد في النظام', type: 'create' },
      { key: 'edit_supplier', label: 'تعديل بيانات مورد', desc: 'تحديث بيانات وسجلات الموردين', type: 'edit' },
      { key: 'delete_supplier', label: 'حذف مورد', desc: 'حذف مورد من الدليل', type: 'danger' },
      { key: 'pay_supplier_payment', label: 'تسجيل سندات صرف وسداد للموردين', desc: 'صرف نقدية أو شيكات وتخفيض مستحقات المورد', type: 'create' },
      { key: 'view_supplier_statement', label: 'طباعة كشف حساب مورد', desc: 'استخراج وطباعة كشف الحساب التفصيلي للمورد', type: 'view' },
    ]
  },
  {
    id: 'inventory',
    title: 'المخزون والأصناف والمستودعات والتسعير',
    icon: '📦',
    color: 'blue',
    badgeBg: 'bg-blue-100 text-blue-800',
    items: [
      { key: 'access_inventory', label: 'عرض دليل الأصناف والمخزون', desc: 'تصفح كروت الأصناف والأرصدة الحالية', type: 'view' },
      { key: 'create_product', label: 'إضافة صنف أو خامة جديدة', desc: 'تسجيل صنف جديد بكافة مواصفاته', type: 'create' },
      { key: 'edit_product', label: 'تعديل الصنف وأسعاره', desc: 'تعديل أسعار البيع والوحدات وحد الطلب', type: 'edit' },
      { key: 'delete_product', label: 'حذف صنف من المخزون', desc: 'حذف بطاقة الصنف نهائياً', type: 'danger' },
      { key: 'view_cost_price', label: 'رؤية أسعار التكلفة وهوامش الربح', desc: 'الاطلاع على سعر الشراء/التكلفة الحقيقية', type: 'danger' },
      { key: 'export_inventory', label: 'تصدير جرد المخزون لإكسيل', desc: 'تصدير كميات وأرصدة المستودعات لـ Excel', type: 'view' },
      { key: 'access_warehouse', label: 'عرض موديول المستودعات والجرد', desc: 'الدخول لشاشة إدارة المستودعات المتعددة', type: 'view' },
      { key: 'manage_warehouses', label: 'إضافة وتعديل المستودعات', desc: 'إنشاء مستودعات جديدة وتعيين أمناء المخازن', type: 'edit' },
      { key: 'inventory_transfer', label: 'التحويل بين المستودعات', desc: 'نقل بضائع وخامات من مستودع لآخر', type: 'create' },
      { key: 'inventory_count_adjustment', label: 'تسجيل الجرد الفعلي وتسوية العجز والفائض', desc: 'إثبات فروق الجرد وترحيل قيود التسوية', type: 'danger' },
    ]
  },
  {
    id: 'manufacturing',
    title: 'التصنيع والتشغيل وأوامر الإنتاج',
    icon: '🏗️',
    color: 'purple',
    badgeBg: 'bg-purple-100 text-purple-800',
    items: [
      { key: 'access_manufacturing', label: 'عرض موديول التصنيع والتشغيل', desc: 'الدخول لأوامر وخطط الإنتاج', type: 'view' },
      { key: 'create_bom', label: 'إنشاء وتعديل قوائم المواد (BOM)', desc: 'تحديد نسب الخامات وتكاليف التشغيل القياسية', type: 'create' },
      { key: 'create_production_order', label: 'إنشاء أمر تشغيل / إنتاج جديد', desc: 'فتح أمر تشغيل بناءً على طلب عميل أو تخزين', type: 'create' },
      { key: 'execute_production', label: 'صرف خامات وتشغيل أمر الإنتاج', desc: 'خصم الخامات آلياً من المخزن وتحميل WIP', type: 'create' },
      { key: 'complete_production', label: 'إنهاء أمر الإنتاج وتوريد التام للمخزن', desc: 'إثبات المنتج النهائي في مخزن التام', type: 'create' },
      { key: 'cancel_production', label: 'إلغاء أمر الإنتاج', desc: 'إلغاء أو تعليق أمر التشغيل', type: 'danger' },
      { key: 'view_manufacturing_costs', label: 'رؤية تكاليف التصنيع والمصنعيات', desc: 'الاطلاع على تكلفة العمالة وخسائر الهالك', type: 'danger' },
    ]
  },
  {
    id: 'treasury',
    title: 'الخزينة والبنوك والمصروفات والشركاء',
    icon: '🏦',
    color: 'cyan',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    items: [
      { key: 'access_treasury', label: 'عرض شاشة الخزينة والمصارف', desc: 'الاطلاع على أرصدة الصناديق والبنوك', type: 'view' },
      { key: 'create_receipt_voucher', label: 'إصدار سند قبض نقدية / بنكي', desc: 'إيداع أموال في الخزينة أو البنك أو إنستاباي', type: 'create' },
      { key: 'create_payment_voucher', label: 'إصدار سند صرف نقدية / بنكي', desc: 'صرف نقدية من الخزائن أو الحسابات المصرفية', type: 'danger' },
      { key: 'treasury_transfer', label: 'التحويل بين الخزائن والمصارف', desc: 'نقل السيولة بين الخزائن والبنوك وفودافون كاش', type: 'create' },
      { key: 'access_expenses', label: 'عرض شاشة المصروفات العامة', desc: 'استعراض بنود المصروفات وسجل النفقات', type: 'view' },
      { key: 'create_expense', label: 'تسجيل مصروف إداري / تشغيلي', desc: 'تسجيل نفقة جديدة وخصمها من الخزينة', type: 'create' },
      { key: 'access_partners', label: 'عرض حسابات ومعاملات الشركاء', desc: 'الاطلاع على جاري الشركاء وتوزيعات الأرباح', type: 'danger' },
      { key: 'create_partner_transaction', label: 'تسجيل مسحوبات وإيداعات الشركاء', desc: 'إثبات حركات تمويلية أو سحوبات شخصية', type: 'danger' },
    ]
  },
  {
    id: 'accounts',
    title: 'الحسابات العامة ودفتر اليومية والأصول',
    icon: '⚖️',
    color: 'indigo',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    items: [
      { key: 'access_chart_of_accounts', label: 'عرض دليل شجرة الحسابات', desc: 'تصفح الحسابات الرئيسية والفرعية والأرصدة', type: 'view' },
      { key: 'create_account', label: 'إضافة وتعديل حسابات في الدليل', desc: 'توسيع شجرة الحسابات وإضافة بنود جديدة', type: 'create' },
      { key: 'access_journal_entries', label: 'عرض دفتر القيود اليومية', desc: 'استعراض قيود اليومية العامة الناتجة عن الحركات', type: 'view' },
      { key: 'create_manual_journal', label: 'إنشاء قيد محاسبي يدوي', desc: 'تسجيل قيود تسوية وقيود افتتاحية يدوية', type: 'create' },
      { key: 'delete_journal_entry', label: 'حذف أو إلغاء قيد محاسبي', desc: 'حذف قيود اليومية من السجل', type: 'danger' },
      { key: 'access_fixed_assets', label: 'عرض سجل الأصول الثابتة', desc: 'تصفح الآلات والمعدات والمباني وتكلفة شرائها', type: 'view' },
      { key: 'create_fixed_asset', label: 'تسجيل أصل ثابت جديد', desc: 'إضافة أصل مع نسبة إهلاكه وقيمته التخريدية', type: 'create' },
      { key: 'calculate_depreciation', label: 'احتساب وترحيل إهلاك الأصول', desc: 'توليد قيود الإهلاك السنوية أو الشهرية آلياً', type: 'create' },
    ]
  },
  {
    id: 'reports',
    title: 'التقارير المالية والتحليلات والقوائم',
    icon: '📊',
    color: 'teal',
    badgeBg: 'bg-teal-100 text-teal-800',
    items: [
      { key: 'access_reports', label: 'عرض مركز التقارير الرئيسي', desc: 'الدخول لصفحة التقارير العامة', type: 'view' },
      { key: 'view_reports_sales', label: 'تقارير المبيعات وحركة الأصناف', desc: 'تقارير كميات وقيم المبيعات بالعميل والصنف', type: 'view' },
      { key: 'view_reports_purchases', label: 'تقارير المشتريات وحركة الموردين', desc: 'تقارير الشراء ومعدلات الأسعار والتوريد', type: 'view' },
      { key: 'view_reports_customers', label: 'تقارير أرصدة وأعمار ديون العملاء', desc: 'كشوفات الذمم المدينة والديون المتأخرة', type: 'view' },
      { key: 'view_reports_suppliers', label: 'تقارير مستحقات وأرصدة الموردين', desc: 'كشوفات الذمم الدائنة وجداول السداد', type: 'view' },
      { key: 'view_reports_treasury', label: 'تقارير السيولة وحركة الخزائن', desc: 'كشوف حركة المقبوضات والمدفوعات النقدية', type: 'view' },
      { key: 'view_reports_profits', label: 'قائمة الدخل والأرباح والخسائر (P&L)', desc: 'الاطلاع على صافي أرباح المنشأة والإيرادات', type: 'danger' },
      { key: 'view_balance_sheet', label: 'الميزانية العمومية والمركز المالي', desc: 'قائمة الأصول والخصوم وحقوق الملكية', type: 'danger' },
      { key: 'view_trial_balance', label: 'ميزان المراجعة بالمجاميع والأرصدة', desc: 'التحقق من توازن الأرصدة المحاسبية', type: 'view' },
      { key: 'view_vat_declaration', label: 'إقرار ضريبة القيمة المضافة (VAT)', desc: 'احتساب ضريبة المخرجات والمدخلات والمستحق', type: 'view' },
      { key: 'view_cash_flow_forecast', label: 'مؤشر التدفقات النقدية والسيولة المتوقعة', desc: 'توقعات السيولة للأسابيع والأشهر القادمة', type: 'view' },
    ]
  },
  {
    id: 'system',
    title: 'إدارة النظام والأمان والرقابة',
    icon: '⚙️',
    color: 'rose',
    badgeBg: 'bg-rose-100 text-rose-800',
    items: [
      { key: 'access_settings', label: 'الإعدادات العامة وبيانات الشركة', desc: 'اسم الشركة، اللوجو، الرقم الضريبي، الخطوط', type: 'edit' },
      { key: 'manage_accounting_settings', label: 'إعدادات التوجيه والترحيل المحاسبي', desc: 'تحديد الحسابات الافتراضية للقيود الآلية', type: 'danger' },
      { key: 'access_accounting_audit', label: 'فاحص وتدقيق التوازن والنزاهة المحاسبية', desc: 'التدقيق الآلي على سلامة الحسابات ومطابقتها', type: 'danger' },
      { key: 'manage_users', label: 'إدارة المستخدمين والصلاحيات والأدوار', desc: 'إضافة موظفين وتعيين صلاحياتهم وكلمات المرور', type: 'danger' },
      { key: 'manage_backup', label: 'النسخ الاحتياطي واستعادة البيانات', desc: 'تحميل واستعادة قواعد البيانات ونقاط الاسترجاع', type: 'danger' },
      { key: 'access_audit_log', label: 'سجل العمليات والرقابة (Audit Log)', desc: 'تتبع من أضاف أو عدل أو حذف أي حركة بالوقت', type: 'view' },
      { key: 'financial_year_lock', label: 'إغلاق السنة / الفترة المالية', desc: 'تجميد الحركات قبل تاريخ معين لمنع التعديل', type: 'danger' },
    ]
  }
];

// Presets mapping
const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

const ROLE_PRESETS: { name: string; icon: string; desc: string; perms: Permission[] }[] = [
  {
    name: 'مدير نظام عام (Full Admin)',
    icon: '👑',
    desc: 'كامل الصلاحيات دون أي قيود',
    perms: ALL_PERMISSIONS
  },
  {
    name: 'محاسب مالي رئيسي',
    icon: '💼',
    desc: 'مبيعات، مشتريات، خزينة، قيود، شجرة الحسابات، تقارير مالية',
    perms: [
      'access_dashboard', 'access_sales', 'create_sales_invoice', 'print_sales_invoice', 'export_sales',
      'access_sales_returns', 'create_sales_return', 'access_customers', 'collect_customer_payment', 'view_customer_statement',
      'access_purchases', 'create_purchase_invoice', 'print_purchase_invoice', 'export_purchases', 'access_purchase_returns',
      'create_purchase_return', 'access_suppliers', 'pay_supplier_payment', 'view_supplier_statement',
      'access_inventory', 'view_cost_price', 'export_inventory',
      'access_treasury', 'create_receipt_voucher', 'create_payment_voucher', 'treasury_transfer',
      'access_expenses', 'create_expense',
      'access_chart_of_accounts', 'create_account', 'access_journal_entries', 'create_manual_journal',
      'access_fixed_assets', 'create_fixed_asset', 'calculate_depreciation',
      'access_reports', 'view_reports_sales', 'view_reports_purchases', 'view_reports_customers', 'view_reports_suppliers',
      'view_reports_treasury', 'view_reports_profits', 'view_balance_sheet', 'view_trial_balance', 'view_vat_declaration', 'view_cash_flow_forecast',
      'manage_accounting_settings', 'access_accounting_audit'
    ]
  },
  {
    name: 'مسؤول مبيعات وكاشير',
    icon: '📈',
    desc: 'عروض أسعار، فواتير بيع، مرتجعات، كشف حساب وسندات قبض',
    perms: [
      'access_dashboard', 'access_sales', 'create_sales_invoice', 'print_sales_invoice', 'export_sales',
      'access_sales_returns', 'create_sales_return',
      'access_quotations', 'create_quotation', 'edit_quotation', 'convert_quotation',
      'access_customers', 'create_customer', 'edit_customer', 'collect_customer_payment', 'view_customer_statement',
      'access_inventory',
      'view_reports_sales', 'view_reports_customers'
    ]
  },
  {
    name: 'مسؤول مشتريات وموردين',
    icon: '🛒',
    desc: 'طلبات وأوامر الشراء، فواتير المشتريات، المرتجعات وسداد الموردين',
    perms: [
      'access_dashboard',
      'access_purchase_requests', 'create_purchase_request', 'approve_purchase_request',
      'access_purchase_orders', 'create_purchase_order', 'approve_purchase_order',
      'access_purchases', 'create_purchase_invoice', 'print_purchase_invoice', 'export_purchases',
      'access_purchase_returns', 'create_purchase_return',
      'access_suppliers', 'create_supplier', 'edit_supplier', 'pay_supplier_payment', 'view_supplier_statement',
      'access_inventory',
      'view_reports_purchases', 'view_reports_suppliers'
    ]
  },
  {
    name: 'أمين مخزن ومستودعات',
    icon: '📦',
    desc: 'إدارة الأصناف، الجرد والتسويات، والتحويل بين المستودعات',
    perms: [
      'access_dashboard',
      'access_inventory', 'create_product', 'edit_product', 'export_inventory',
      'access_warehouse', 'manage_warehouses', 'inventory_transfer', 'inventory_count_adjustment',
      'access_purchase_requests', 'create_purchase_request'
    ]
  },
  {
    name: 'مدير إنتاج وتصنيع',
    icon: '🏗️',
    desc: 'أوامر التصنيع، نسب BOM، استهلاك الخامات، وتوريد التام',
    perms: [
      'access_dashboard',
      'access_manufacturing', 'create_bom', 'create_production_order', 'execute_production', 'complete_production', 'cancel_production',
      'access_inventory', 'inventory_transfer'
    ]
  },
  {
    name: 'مستعرض تقارير فقط (Viewer)',
    icon: '👁️',
    desc: 'عرض وقراءة كافة التقارير والحسابات دون أي صلاحية تعديل أو حذف',
    perms: [
      'access_dashboard', 'access_sales', 'access_purchases', 'access_inventory', 'access_customers', 'access_suppliers',
      'access_treasury', 'access_chart_of_accounts', 'access_journal_entries',
      'access_reports', 'view_reports_sales', 'view_reports_purchases', 'view_reports_customers', 'view_reports_suppliers',
      'view_reports_treasury', 'view_reports_profits', 'view_balance_sheet', 'view_trial_balance', 'view_vat_declaration', 'view_cash_flow_forecast',
      'access_audit_log'
    ]
  }
];

const AddUserModal: React.FC<AddUserModalProps> = ({ onClose, onSave, userToEdit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | 'developer'>('user');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Alert State
  const [alertMessage, setAlertMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const isEditing = !!userToEdit;

  useEffect(() => {
    if (isEditing && userToEdit) {
      setUsername(userToEdit.username);
      setPassword(userToEdit.password);
      setFullName(userToEdit.fullName);
      setRole(userToEdit.role || 'user');
      setPermissions(userToEdit.permissions || []);
    } else {
      // Default: Sales & Dashboard
      setPermissions(['access_dashboard', 'access_sales', 'create_sales_invoice', 'print_sales_invoice', 'access_customers']);
    }
  }, [userToEdit, isEditing]);

  const togglePermission = (perm: Permission) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const handleApplyPreset = (presetPerms: Permission[]) => {
    setPermissions(presetPerms);
  };

  const handleToggleGroup = (group: PermissionGroup) => {
    const groupKeys = group.items.map(i => i.key);
    const hasAll = groupKeys.every(k => permissions.includes(k));
    if (hasAll) {
      setPermissions(permissions.filter(k => !groupKeys.includes(k)));
    } else {
      setPermissions(Array.from(new Set([...permissions, ...groupKeys])));
    }
  };

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setIsAlertOpen(true);
  };

  const handleSubmit = () => {
    if (!username.trim() || !password.trim() || !fullName.trim()) {
      showAlert('جميع حقول البيانات الأساسية مطلوبة (الاسم الكامل، اسم المستخدم، كلمة المرور)');
      return;
    }

    onSave({
      id: userToEdit?.id,
      username: username.trim(),
      password: password.trim(),
      fullName: fullName.trim(),
      role: permissions.includes('manage_users') ? 'admin' : role,
      permissions
    });
  };

  // Filtered permission groups based on search
  const filteredGroups = useMemo(() => {
    if (!searchFilter.trim()) return PERMISSION_GROUPS;
    const q = searchFilter.toLowerCase();
    return PERMISSION_GROUPS.map(g => {
      const matchedItems = g.items.filter(i =>
        i.label.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        i.key.toLowerCase().includes(q)
      );
      return { ...g, items: matchedItems };
    }).filter(g => g.items.length > 0);
  }, [searchFilter]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-center items-center p-3 md:p-6 overflow-y-auto"
      aria-modal="true" role="dialog" onClick={onClose} dir="rtl"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col border-2 border-slate-200 overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 md:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-2xl shadow-inner">
              👤
            </span>
            <div>
              <h2 className="text-xl font-black">
                {isEditing ? `تعديل صلاحيات المستخدم: ${userToEdit?.fullName}` : 'إضافة مستخدم جديد وضبط الصلاحيات الشاملة'}
              </h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                تحديد دقيق ومفصل لكل شاشة وزر وإجراء داخل المنظومة من أصغر عملية لأعلى مستوى
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl w-9 h-9 flex items-center justify-center text-xl transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* User Basic Info Section */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b pb-2">
              <span>📋</span>
              <span>البيانات الأساسية للمستخدم</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد (محاسب المبيعات)"
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">اسم المستخدم (للدخول) *</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="مثال: ahmed_sales"
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">كلمة المرور *</label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Role Presets Section */}
          <div className="bg-white p-5 rounded-2xl border-2 border-indigo-100 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                <span>⚡</span>
                <span>قوالب وأدوار جاهزة بنقرة واحدة (Quick Role Presets)</span>
              </h3>
              <button
                type="button"
                onClick={() => setPermissions([])}
                className="text-xs text-red-600 hover:text-red-800 font-bold underline"
              >
                تفريغ كافة الصلاحيات
              </button>
            </div>

            <p className="text-xs text-slate-500">
              اختر دوراً وظيفياً لتفعيل الصلاحيات المناسبة فوراً، ويمكنك بعد ذلك تعديل أي صلاحية فرعية بدقة:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {ROLE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset.perms)}
                  className="p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 text-right transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center gap-1.5 font-black text-xs text-slate-800 group-hover:text-indigo-900">
                    <span className="text-base">{preset.icon}</span>
                    <span className="truncate">{preset.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </div>
                  <div className="mt-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded self-start border border-indigo-200">
                    تطبيق الدور
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Permissions Counter Bar */}
          <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="🔍 بحث سريع في الصلاحيات (اكتب: حذف، فاتورة، سداد، جرد، مخزون...)"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full text-xs p-2.5 pr-9 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold outline-none focus:border-indigo-500"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 text-xs font-black bg-white px-1.5 py-0.5 rounded border"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs font-black">
              <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-xl">
                الصلاحيات المحددة: <strong className="text-indigo-900 text-sm">{permissions.length}</strong> من {ALL_PERMISSIONS.length}
              </span>
              <button
                type="button"
                onClick={() => setPermissions(ALL_PERMISSIONS)}
                className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-xl hover:bg-emerald-100"
              >
                تحديد الكل
              </button>
            </div>
          </div>

          {/* Granular Permissions Accordions / Modules */}
          <div className="space-y-4">
            {filteredGroups.map(group => {
              const groupKeys = group.items.map(i => i.key);
              const selectedCount = groupKeys.filter(k => permissions.includes(k)).length;
              const hasAll = selectedCount === groupKeys.length && groupKeys.length > 0;

              return (
                <div key={group.id} className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
                  {/* Group Header */}
                  <div className="p-3.5 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <h4 className="text-xs md:text-sm font-black text-slate-900">
                        {group.title}
                      </h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white border border-slate-300 text-slate-700">
                        {selectedCount} / {group.items.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleGroup(group)}
                      className={`text-xs font-black px-3 py-1 rounded-lg border transition-all ${
                        hasAll
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      {hasAll ? 'إلغاء تحديد الموديول' : 'تحديد موديول كامل'}
                    </button>
                  </div>

                  {/* Group Items Grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.items.map(item => {
                      const isChecked = permissions.includes(item.key);

                      return (
                        <label
                          key={item.key}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isChecked
                              ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(item.key)}
                            className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-xs font-black text-slate-900 truncate">
                                {item.label}
                              </span>
                              {item.type === 'danger' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-200 flex-shrink-0">
                                  ⚠️ حساس
                                </span>
                              ) : item.type === 'create' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                                  ➕ إنشاء
                                </span>
                              ) : item.type === 'edit' ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 flex-shrink-0">
                                  ✏️ تعديل
                                </span>
                              ) : (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 flex-shrink-0">
                                  👁️ عرض
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                              {item.desc}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-5 bg-white border-t-2 border-slate-200 flex justify-between items-center flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 font-black text-xs transition-all"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>💾</span>
            <span>{isEditing ? 'حفظ الصلاحيات المعدلة' : 'حفظ وإنشاء المستخدم'}</span>
          </button>
        </div>
      </div>

      <AlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        message={alertMessage}
      />
    </div>
  );
};

export default AddUserModal;
