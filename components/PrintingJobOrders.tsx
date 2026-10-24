import React, { useState, useMemo } from 'react';
import type {
  PrintingJobOrder, JobOperationItem, PrintingOperationId, PrintingOperationDefinition,
  ConsolidatedVendorInvoice, ConsolidatedVendorInvoiceLine, Customer, Supplier, Account,
  JournalEntry, ModulePostingSettings, Permission, SalesInvoice, PurchaseInvoice,
  BoxStructureType, CartonBoxSpecs
} from '../types.ts';
import { showNotification } from '../services/notificationService.ts';

// ==================== 20 Standard Printing & Carton Operations Catalog ====================
export const STANDARD_PRINTING_OPERATIONS: PrintingOperationDefinition[] = [
  { id: 'paper_cutting', name: 'قص ورق', category: 'prepress', icon: '✂️', defaultUnit: 'رزمة / فرخ' },
  { id: 'ctp_plates', name: 'ذنكات (CTP)', category: 'prepress', icon: '💿', defaultUnit: 'عدد زنكات' },
  { id: 'laser_die', name: 'فورمة تكسير', category: 'prepress', icon: '📐', defaultUnit: 'فورمة' },
  { id: 'printing', name: 'طباعة (سحب)', category: 'press', icon: '🖨️', defaultUnit: 'سحبة / ضربة' },
  { id: 'lamination', name: 'سلوفان (مط/لامع)', category: 'coating', icon: '✨', defaultUnit: 'فرخ / متر' },
  { id: 'spot_uv', name: 'سبوت UV', category: 'coating', icon: '💧', defaultUnit: 'فرخ' },
  { id: 'flood_uv', name: 'UV كامل (ورنيش)', category: 'coating', icon: '☀️', defaultUnit: 'فرخ' },
  { id: 'pvc_window', name: 'شباك PVC شفاف', category: 'converting', icon: '🪟', defaultUnit: 'علبة' },
  { id: 'gold_metalized', name: 'متلايز ذهبي', category: 'press', icon: '🌟', defaultUnit: 'فرخ' },
  { id: 'silver_metalized', name: 'متلايز فضي', category: 'press', icon: '🪙', defaultUnit: 'فرخ' },
  { id: 'hot_foil', name: 'بصمة (Hot Foil)', category: 'coating', icon: '🏷️', defaultUnit: 'ضربة' },
  { id: 'embossing', name: 'كوفراج (بارز/غائر)', category: 'coating', icon: '🖼️', defaultUnit: 'ضربة' },
  { id: 'corrugated_flute', name: 'شيتات كرتون مضلع سينجل فيس', category: 'converting', icon: '📦', defaultUnit: 'لوح / شيت' },
  { id: 'flute_lamination', name: 'كستوة / لصف / تبطين (Lamination)', category: 'converting', icon: '🥞', defaultUnit: 'فرخ' },
  { id: 'die_cutting', name: 'تكسير وريجة', category: 'converting', icon: '⚙️', defaultUnit: 'فرخ' },
  { id: 'gluing', name: 'لزق وتجميع', category: 'converting', icon: '🧴', defaultUnit: 'علبة' },
  { id: 'staple_binding', name: 'دبوس (تجليد)', category: 'binding', icon: '📎', defaultUnit: 'نسخة' },
  { id: 'spiral_binding', name: 'سلك لولبي', category: 'binding', icon: '🌀', defaultUnit: 'نسخة' },
  { id: 'packaging', name: 'تغليف وشرنكة', category: 'logistics', icon: '📦', defaultUnit: 'طرد' },
  { id: 'shipping', name: 'شحن ونقل', category: 'logistics', icon: '🚚', defaultUnit: 'نقلة' },
];

export interface BoxStructureOption {
  type: BoxStructureType;
  name: string;
  fefcoCode: string;
  icon: string;
  description: string;
  example: string;
}

export const BOX_STRUCTURE_OPTIONS: BoxStructureOption[] = [
  {
    type: 'auto_lock',
    name: 'علبة قفل أوتوماتيك سفلي (3 نقاط)',
    fefcoCode: 'FEFCO 0711',
    icon: '📦',
    description: 'تُفرد وتُقفل من الأسفل تلقائياً، لسان علوي ولزق جانبي 3 نقاط. الأكثر استخداماً للعلب الفاخرة والأجهزة.',
    example: 'علب أدوات كهربائية، عطور، قطع غيار، أواني'
  },
  {
    type: 'mailer_pizza',
    name: 'علبة أذن / بريد / بيتزا ذاتية القفل',
    fefcoCode: 'FEFCO 0427',
    icon: '🍕',
    description: 'تفتح للأعلى بدون أي لزق إطلاقاً، جوانب مزدوجة القوة وآذان تثبيت أمامية وجانبية متداخلة.',
    example: 'علب بيتزا، شحن إلكتروني، أحذية، ملابس'
  },
  {
    type: 'rsc',
    name: 'كرتونة عادية ألسنة متطابقة بسلوتيب',
    fefcoCode: 'FEFCO 0201',
    icon: '📫',
    description: 'الكرتونة المضلعة القياسية، 4 ألسنة علوية و4 سفلية تقفل بسلوتيب أو دبابيس، لسان لزق جانبي.',
    example: 'كراتين شحن وتوزيع، كراتين بسكويت ومواد غذائية'
  },
  {
    type: 'reverse_tuck',
    name: 'علبة لسان عادي عكسي فوق وتحت',
    fefcoCode: 'Reverse Tuck',
    icon: '💊',
    description: 'لسان الغطاء العلوي يقفل للأمام، ولسان القاعدة يقفل للخلف، تقفيل خفيف وسريع بلزق طولي نقطة واحدة.',
    example: 'علب لمبات، مستحضرات تجميل، أدوية خفيفة'
  },
  {
    type: 'two_piece',
    name: 'علبة غطاء وقاعدة منفصلين',
    fefcoCode: 'FEFCO 0301',
    icon: '👟',
    description: 'قاعدة سفلية مستقلة مع غطاء كرتون مستقل يركب فوقها. مسطحين منفصلين (قاعدة + غطاء).',
    example: 'علب أحذية، أطقم هدايا، كراتين تليفزيونات وشاشات'
  },
  {
    type: 'drawer_sleeve',
    name: 'علبة درج وكفر متداخل',
    fefcoCode: 'Sleeve & Drawer',
    icon: '🗄️',
    description: 'كفر خارجي مفرغ ودرج داخلي يسحب للخارج كالمكتب. تقفيل أنيق جداً.',
    example: 'علب تمور، حلويات، فحم سريع الاشتعال'
  },
  {
    type: 'custom_diecut',
    name: 'نمط مخصص / فورمة خاصة (مسطح مباشر)',
    fefcoCode: 'Custom Blank',
    icon: '📐',
    description: 'لأي تصميم هندسي خاص أو شباك PVC أو فورمة تكسير جاهزة لدى العميل. إدخال مقاس المسطح مباشرة.',
    example: 'صواني عرض، علب هاندل بمقبض، أشكال إبداعية'
  }
];

export function calculateBoxBlank(
  structure: BoxStructureType,
  L: number,
  W: number,
  H: number,
  customL: number,
  customW: number
): { blankLength: number; blankWidth: number; description: string } {
  if (structure === 'custom_diecut') {
    return {
      blankLength: Number(customL) || 0,
      blankWidth: Number(customW) || 0,
      description: 'مسطح فورمة مخصصة محدد يدوياً'
    };
  }

  const l = Number(L) || 0;
  const w = Number(W) || 0;
  const h = Number(H) || 0;

  switch (structure) {
    case 'auto_lock': {
      // علبة قفل أوتوماتيك سفلي 3 نقاط (FEFCO 0711)
      const blankW = parseFloat((2 * l + 2 * w + 2.5).toFixed(1));
      const blankL = parseFloat((h + 1.35 * w + 2.5).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'علبة قفل أوتوماتيك 3 نقاط (FEFCO 0711) - لسان لزق 2.5 سم وقفل سفلي متداخل'
      };
    }
    case 'mailer_pizza': {
      // علبة أذن / بيتزا / بريد ذاتية القفل (FEFCO 0427)
      const blankL = parseFloat((l + 4 * h + 2).toFixed(1));
      const blankW = parseFloat((2 * w + 4 * h + 3).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'علبة بريد/بيتزا ذاتية القفل بأذن (FEFCO 0427) - بدون لزق'
      };
    }
    case 'rsc': {
      // كرتونة عادية ألسنة متطابقة بسلوتيب (FEFCO 0201)
      const blankW = parseFloat((2 * l + 2 * w + 3.5).toFixed(1));
      const blankL = parseFloat((h + w + 1).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'كرتونة عادية ألسنة متطابقة (FEFCO 0201) - لسان 3.5 سم وألسنة تقفيل وسلوتيب'
      };
    }
    case 'reverse_tuck': {
      // علبة لسان عادي عكسي فوق وتحت
      const blankW = parseFloat((2 * l + 2 * w + 2).toFixed(1));
      const blankL = parseFloat((h + 1.5 * w + 3).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'علبة لسان عادي عكسي فوق وتحت (Reverse Tuck)'
      };
    }
    case 'two_piece': {
      // علبة غطاء وقاعدة منفصلين (Two Piece)
      const blankL = parseFloat((l + 2 * h + 2).toFixed(1));
      const blankW = parseFloat((w + 2 * h + 2).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'علبة غطاء وقاعدة منفصلين (FEFCO 0301) - مسطح القاعدة أو الغطاء'
      };
    }
    case 'drawer_sleeve': {
      // علبة درج وكفر
      const blankW = parseFloat((2 * l + 2 * h + 2).toFixed(1));
      const blankL = parseFloat((w + 1).toFixed(1));
      return {
        blankLength: blankL,
        blankWidth: blankW,
        description: 'علبة درج وكفر (Sleeve & Drawer) - مسطح الكفر الخارجي'
      };
    }
    default:
      return {
        blankLength: Number(customL) || 0,
        blankWidth: Number(customW) || 0,
        description: 'مسطح مخصص'
      };
  }
}

export function calculateImposition(
  sheetL: number,
  sheetW: number,
  blankL: number,
  blankW: number,
  orderQty: number,
  spoilagePct: number
): {
  upsPerSheet: number;
  cols: number;
  rows: number;
  orientation: 'normal' | 'rotated';
  sheetUsagePercent: number;
  totalSheetsRequired: number;
  sheetsWithoutSpoilage: number;
  spoilageSheets: number;
} {
  if (sheetL <= 0 || sheetW <= 0 || blankL <= 0 || blankW <= 0) {
    return {
      upsPerSheet: 1,
      cols: 1,
      rows: 1,
      orientation: 'normal',
      sheetUsagePercent: 0,
      totalSheetsRequired: orderQty,
      sheetsWithoutSpoilage: orderQty,
      spoilageSheets: 0
    };
  }

  // Normal: sheetL / blankL, sheetW / blankW
  const cols1 = Math.floor(sheetL / blankL);
  const rows1 = Math.floor(sheetW / blankW);
  const count1 = Math.max(cols1 * rows1, 0);

  // Rotated: sheetL / blankW, sheetW / blankL
  const cols2 = Math.floor(sheetL / blankW);
  const rows2 = Math.floor(sheetW / blankL);
  const count2 = Math.max(cols2 * rows2, 0);

  let ups = 1;
  let cols = 1;
  let rows = 1;
  let orientation: 'normal' | 'rotated' = 'normal';

  if (count2 > count1) {
    ups = count2;
    cols = cols2;
    rows = rows2;
    orientation = 'rotated';
  } else {
    ups = Math.max(count1, 1);
    cols = Math.max(cols1, 1);
    rows = Math.max(rows1, 1);
    orientation = 'normal';
  }

  const sheetArea = sheetL * sheetW;
  const blanksArea = ups * (blankL * blankW);
  const sheetUsagePercent = sheetArea > 0 ? Math.min((blanksArea / sheetArea) * 100, 100) : 0;

  const sheetsWithoutSpoilage = Math.ceil((orderQty || 1) / ups);
  const spoilageSheets = Math.ceil(sheetsWithoutSpoilage * ((spoilagePct || 0) / 100));
  const totalSheetsRequired = sheetsWithoutSpoilage + spoilageSheets;

  return {
    upsPerSheet: ups,
    cols,
    rows,
    orientation,
    sheetUsagePercent: parseFloat(sheetUsagePercent.toFixed(1)),
    totalSheetsRequired,
    sheetsWithoutSpoilage,
    spoilageSheets
  };
}

export const PRINTING_TEMPLATES: { name: string; icon: string; desc: string; operations: PrintingOperationId[] }[] = [
  {
    name: 'علب كرتون مضلع مبطن أوفست (Litho-Laminated)',
    icon: '📦',
    desc: 'ورق طباعة أوفست + زنكات + طباعة + سلوفان + شيتات سينجل فيس + كستوة/تبطين + فورمة + تكسير + لزق وتقفيل + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping']
  },
  {
    name: 'علب كرتون وتغليف فاخر (دوبلكس مصمت)',
    icon: '🎁',
    desc: 'ورق + زنكات + فورمة + طباعة + متلايز + سلوفان + سبوت UV + بصمة + كوفراج + تكسير + شباك + لزق + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'laser_die', 'printing', 'gold_metalized', 'lamination', 'spot_uv', 'hot_foil', 'embossing', 'die_cutting', 'pvc_window', 'gluing', 'packaging', 'shipping']
  },
  {
    name: 'بروشور وفلاير تجاري',
    icon: '📄',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + تكسير وريجة + تغليف + شحن',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging', 'shipping']
  },
  {
    name: 'كتالوج / مجلة / مفكرة',
    icon: '📖',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + دبوس أو سلك لولبي + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'staple_binding', 'spiral_binding', 'packaging', 'shipping']
  },
  {
    name: 'استيكر وملصقات مخصصة',
    icon: '🏷️',
    desc: 'قص ورق + زنكات + طباعة + سلوفان + تكسير + تغليف',
    operations: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging']
  }
];

interface PrintingJobOrdersProps {
  jobOrders: PrintingJobOrder[];
  setJobOrders: React.Dispatch<React.SetStateAction<PrintingJobOrder[]>>;
  consolidatedInvoices: ConsolidatedVendorInvoice[];
  setConsolidatedInvoices: React.Dispatch<React.SetStateAction<ConsolidatedVendorInvoice[]>>;
  salesInvoices?: SalesInvoice[];
  setSalesInvoices?: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
  purchaseInvoices?: PurchaseInvoice[];
  setPurchaseInvoices?: React.Dispatch<React.SetStateAction<PurchaseInvoice[]>>;
  deleteJournalEntryByReference?: (refId: string) => void;
  journalEntries?: JournalEntry[];
  setJournalEntries?: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  customers: Customer[];
  suppliers: Supplier[];
  accounts: Account[];
  currentUser?: any;
  createJournalEntry: (params: { description: string; lines: any[]; referenceType?: any; referenceId?: string; date?: string; branchId?: string }) => string;
  logAction: (action: string) => void;
  postingSettings?: ModulePostingSettings;
  currentBranchId?: string;
  onNavigate?: (page: string) => void;
}

const PrintingJobOrders: React.FC<PrintingJobOrdersProps> = ({
  jobOrders = [],
  setJobOrders,
  consolidatedInvoices = [],
  setConsolidatedInvoices,
  salesInvoices = [],
  setSalesInvoices,
  purchaseInvoices = [],
  setPurchaseInvoices,
  deleteJournalEntryByReference,
  journalEntries = [],
  setJournalEntries,
  customers = [],
  suppliers = [],
  accounts = [],
  currentUser,
  createJournalEntry,
  logAction,
  postingSettings,
  currentBranchId = 'main',
  onNavigate
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'orders' | 'consolidated' | 'profitability' | 'kiosk'>('orders');

  // Shop Floor Kiosk State (صالة الإنتاج والماكينات)
  const [kioskStation, setKioskStation] = useState<PrintingOperationId>('paper_cutting');
  const [kioskConfirmModal, setKioskConfirmModal] = useState<{
    orderId: string;
    opIndex: number;
    orderCode: string;
    opName: string;
    targetQty: number;
    goodQty: number;
    scrapQty: number;
    notes: string;
  } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<PrintingJobOrder | null>(null);
  const [viewingJob, setViewingJob] = useState<PrintingJobOrder | null>(null);
  const [isConsolidatedModalOpen, setIsConsolidatedModalOpen] = useState(false);

  // Profitability Report Filter
  const [reportCustomerId, setReportCustomerId] = useState<string>('all');
  const [reportDateStart, setReportDateStart] = useState<string>('');
  const [reportDateEnd, setReportDateEnd] = useState<string>('');

  // Permission helper
  const hasPerm = (perm: Permission) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' || currentUser.role === 'developer') return true;
    return currentUser.permissions ? currentUser.permissions.includes(perm) : false;
  };

  // Helper: Get Accounts
  const wipAccountId = postingSettings?.mfgWipAccountId || '110402'; // WIP
  const wipAccountName = accounts.find(a => a.id === wipAccountId)?.name || 'إنتاج تحت التشغيل (مطبوعات WIP)';
  const payablesAccountId = postingSettings?.purchasePayablesAccountId || '2101'; // Suppliers
  const cogsAccountId = postingSettings?.salesCogsAccountId || '5101'; // COGS
  const cogsAccountName = accounts.find(a => a.id === cogsAccountId)?.name || 'تكلفة بضاعة مباعة (مطبوعات)';
  const revenueAccountId = postingSettings?.salesRevenueAccountId || '4101'; // Sales Revenue
  const revenueAccountName = accounts.find(a => a.id === revenueAccountId)?.name || 'إيرادات مبيعات المطبوعات';
  const receivablesAccountId = postingSettings?.salesReceivablesAccountId || '1103'; // Customers

  // ==================== KPI Calculations ====================
  const kpis = useMemo(() => {
    const totalOrders = jobOrders.length;
    const inProgress = jobOrders.filter(o => o.status === 'in_progress').length;
    const delivered = jobOrders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const totalRevenue = jobOrders.reduce((sum, o) => sum + (Number(o.clientSalePrice) || 0), 0);
    const totalCost = jobOrders.reduce((sum, o) => sum + (Number(o.totalActualCost) || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return { totalOrders, inProgress, delivered, totalRevenue, totalCost, totalProfit, marginPercent };
  }, [jobOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return jobOrders.filter(order => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !q ||
        order.code.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.productTitle.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchCustomer = customerFilter === 'all' || order.customerId === customerFilter;
      return matchQuery && matchStatus && matchCustomer;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [jobOrders, searchQuery, statusFilter, customerFilter]);

  // ==================== Order Creation & Duplicate (Feature 4) ====================
  const [formData, setFormData] = useState<{
    customerId: string;
    productTitle: string;
    productCategory: string;
    quantity: number;
    unit: string;
    clientSalePrice: number;
    deliveryDate: string;
    notes: string;
    selectedOps: PrintingOperationId[];
    jobType: 'commercial_printing' | 'offset_carton';
    
    // Smart Carton Calculator fields
    boxStructure: BoxStructureType;
    boxLength: number;
    boxWidth: number;
    boxHeight: number;
    customBlankLength: number;
    customBlankWidth: number;
    sheetPreset: string;
    sheetLength: number;
    sheetWidth: number;
    fluteType: 'E-Flute' | 'B-Flute' | 'C-Flute' | 'BC-Flute' | 'F-Flute' | 'بدون (دوبلكس مصمت)';
    topPaperType: string;
    spoilagePercent: number;
  }>({
    customerId: '',
    productTitle: '',
    productCategory: 'كرتون مضلع وعلب مبطنة أوفست',
    quantity: 5000,
    unit: 'علبة',
    clientSalePrice: 0,
    deliveryDate: '',
    notes: '',
    selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping'],
    jobType: 'offset_carton',
    
    boxStructure: 'auto_lock',
    boxLength: 15,
    boxWidth: 10,
    boxHeight: 20,
    customBlankLength: 35,
    customBlankWidth: 50,
    sheetPreset: '70x100',
    sheetLength: 100,
    sheetWidth: 70,
    fluteType: 'E-Flute',
    topPaperType: 'دوبلكس 250 جم',
    spoilagePercent: 5
  });

  // Live Carton Box Calculation in Modal
  const modalBlankCalc = useMemo(() => {
    return calculateBoxBlank(
      formData.boxStructure,
      formData.boxLength,
      formData.boxWidth,
      formData.boxHeight,
      formData.customBlankLength,
      formData.customBlankWidth
    );
  }, [formData.boxStructure, formData.boxLength, formData.boxWidth, formData.boxHeight, formData.customBlankLength, formData.customBlankWidth]);

  const modalImpCalc = useMemo(() => {
    return calculateImposition(
      formData.sheetLength,
      formData.sheetWidth,
      modalBlankCalc.blankLength,
      modalBlankCalc.blankWidth,
      formData.quantity,
      formData.spoilagePercent
    );
  }, [formData.sheetLength, formData.sheetWidth, modalBlankCalc, formData.quantity, formData.spoilagePercent]);

  const handleOpenCreateModal = (orderToEdit?: PrintingJobOrder) => {
    if (orderToEdit) {
      setEditingJob(orderToEdit);
      const specs = orderToEdit.cartonSpecs;
      setFormData({
        customerId: orderToEdit.customerId,
        productTitle: orderToEdit.productTitle,
        productCategory: orderToEdit.productCategory || 'كرتون مضلع وعلب مبطنة أوفست',
        quantity: orderToEdit.quantity,
        unit: orderToEdit.unit,
        clientSalePrice: orderToEdit.clientSalePrice,
        deliveryDate: orderToEdit.deliveryDate || '',
        notes: orderToEdit.notes || '',
        selectedOps: orderToEdit.operations.map(o => o.operationId),
        jobType: orderToEdit.jobType || (specs ? 'offset_carton' : 'commercial_printing'),
        
        boxStructure: specs?.structureType || 'auto_lock',
        boxLength: specs?.length || 15,
        boxWidth: specs?.width || 10,
        boxHeight: specs?.height || 20,
        customBlankLength: specs?.blankLength || 35,
        customBlankWidth: specs?.blankWidth || 50,
        sheetPreset: 'custom',
        sheetLength: specs?.sheetLength || 100,
        sheetWidth: specs?.sheetWidth || 70,
        fluteType: specs?.fluteType || 'E-Flute',
        topPaperType: specs?.topPaperType || 'دوبلكس 250 جم',
        spoilagePercent: specs?.spoilagePercent ?? 5
      });
    } else {
      setEditingJob(null);
      setFormData({
        customerId: customers[0]?.id || '',
        productTitle: '',
        productCategory: 'كرتون مضلع وعلب مبطنة أوفست',
        quantity: 5000,
        unit: 'علبة',
        clientSalePrice: 0,
        deliveryDate: '',
        notes: '',
        selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping'],
        jobType: 'offset_carton',
        
        boxStructure: 'auto_lock',
        boxLength: 15,
        boxWidth: 10,
        boxHeight: 20,
        customBlankLength: 35,
        customBlankWidth: 50,
        sheetPreset: '70x100',
        sheetLength: 100,
        sheetWidth: 70,
        fluteType: 'E-Flute',
        topPaperType: 'دوبلكس 250 جم',
        spoilagePercent: 5
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleApplyTemplate = (opIds: PrintingOperationId[]) => {
    setFormData(prev => ({ ...prev, selectedOps: opIds }));
  };

  const toggleOperation = (opId: PrintingOperationId) => {
    setFormData(prev => {
      const exists = prev.selectedOps.includes(opId);
      if (exists) {
        return { ...prev, selectedOps: prev.selectedOps.filter(id => id !== opId) };
      } else {
        return { ...prev, selectedOps: [...prev.selectedOps, opId] };
      }
    });
  };

  const handleSaveJobOrder = () => {
    if (!formData.customerId) {
      showNotification('يرجى اختيار العميل أولاً', 'error');
      return;
    }
    if (!formData.productTitle) {
      showNotification('يرجى كتابة اسم أو وصف المطبوع', 'error');
      return;
    }
    if (formData.selectedOps.length === 0) {
      showNotification('يرجى تحديد عملية واحدة على الأقل لأمر الشغل', 'error');
      return;
    }

    const customer = customers.find(c => c.id === formData.customerId);

    // Compute smart carton box specifications if applicable
    let cartonSpecs: CartonBoxSpecs | undefined = undefined;
    if (formData.jobType === 'offset_carton') {
      const blankCalc = calculateBoxBlank(
        formData.boxStructure,
        formData.boxLength,
        formData.boxWidth,
        formData.boxHeight,
        formData.customBlankLength,
        formData.customBlankWidth
      );
      const impCalc = calculateImposition(
        formData.sheetLength,
        formData.sheetWidth,
        blankCalc.blankLength,
        blankCalc.blankWidth,
        formData.quantity,
        formData.spoilagePercent
      );
      const opt = BOX_STRUCTURE_OPTIONS.find(b => b.type === formData.boxStructure);

      cartonSpecs = {
        structureType: formData.boxStructure,
        structureName: opt?.name || formData.boxStructure,
        length: formData.boxLength,
        width: formData.boxWidth,
        height: formData.boxHeight,
        blankLength: blankCalc.blankLength,
        blankWidth: blankCalc.blankWidth,
        sheetLength: formData.sheetLength,
        sheetWidth: formData.sheetWidth,
        upsPerSheet: impCalc.upsPerSheet,
        fluteType: formData.fluteType,
        topPaperType: formData.topPaperType,
        spoilagePercent: formData.spoilagePercent,
        totalSheetsRequired: impCalc.totalSheetsRequired
      };
    }

    if (editingJob) {
      // Update existing
      const updatedOrders = jobOrders.map(ord => {
        if (ord.id !== editingJob.id) return ord;

        // Keep existing operation progress if already present
        const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
          const existingOp = ord.operations.find(o => o.operationId === opId);
          if (existingOp) return existingOp;
          const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
          return {
            id: `OP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            operationId: opId,
            name: def?.name || opId,
            executionType: 'external',
            status: 'pending',
            cost: 0,
            unit: def?.defaultUnit || 'عدد'
          };
        });

        const totalCost = ops.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
        const grossProfit = Number(formData.clientSalePrice) - totalCost;
        const margin = formData.clientSalePrice > 0 ? (grossProfit / formData.clientSalePrice) * 100 : 0;

        return {
          ...ord,
          customerId: formData.customerId,
          customerName: customer?.name || ord.customerName,
          companyName: customer?.companyName || ord.companyName,
          productTitle: formData.productTitle,
          productCategory: formData.productCategory,
          quantity: Number(formData.quantity) || 1,
          unit: formData.unit,
          clientSalePrice: Number(formData.clientSalePrice) || 0,
          deliveryDate: formData.deliveryDate,
          notes: formData.notes,
          operations: ops,
          totalActualCost: totalCost,
          grossProfit,
          profitMarginPercent: margin,
          jobType: formData.jobType,
          cartonSpecs: cartonSpecs || ord.cartonSpecs
        };
      });

      setJobOrders(updatedOrders);
      logAction(`تحديث أمر تشغيل: ${editingJob.code} للعميل ${customer?.name}`);
      showNotification('تم تحديث أمر الشغل بنجاح', 'success');
    } else {
      // Create new
      const nextNum = jobOrders.length + 1;
      const orderCode = `JOB-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      const newId = `JOB_${Date.now()}`;

      const ops: JobOperationItem[] = formData.selectedOps.map(opId => {
        const def = STANDARD_PRINTING_OPERATIONS.find(d => d.id === opId);
        return {
          id: `OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          operationId: opId,
          name: def?.name || opId,
          executionType: 'external',
          status: 'pending',
          cost: 0,
          unit: def?.defaultUnit || 'عدد'
        };
      });

      const newOrder: PrintingJobOrder = {
        id: newId,
        code: orderCode,
        date: new Date().toISOString().split('T')[0],
        deliveryDate: formData.deliveryDate,
        customerId: formData.customerId,
        customerName: customer?.name || 'عميل نقدي',
        companyName: customer?.companyName,
        productTitle: formData.productTitle,
        productCategory: formData.productCategory,
        quantity: Number(formData.quantity) || 1,
        unit: formData.unit,
        clientSalePrice: Number(formData.clientSalePrice) || 0,
        operations: ops,
        currentStageIndex: 0,
        status: 'in_progress',
        totalActualCost: 0,
        grossProfit: Number(formData.clientSalePrice) || 0,
        profitMarginPercent: 100,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        branchId: currentBranchId,
        jobType: formData.jobType,
        cartonSpecs
      };

      setJobOrders(prev => [newOrder, ...prev]);
      logAction(`إنشاء أمر تشغيل مطبوعات جديد: ${orderCode} للعميل ${customer?.name}`);
      showNotification(`تم إنشاء أمر الشغل ${orderCode} بنجاح`, 'success');
    }

    setIsCreateModalOpen(false);
  };

  // Feature 4: Duplicate Job Order
  const handleDuplicateJob = (order: PrintingJobOrder) => {
    const nextNum = jobOrders.length + 1;
    const newCode = `JOB-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
    const newId = `JOB_${Date.now()}`;

    // Reset status and cost journal IDs, keeping vendors and operational setup
    const duplicatedOps: JobOperationItem[] = order.operations.map(op => ({
      ...op,
      id: `OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'pending',
      journalEntryId: undefined,
      completedAt: undefined
    }));

    const totalCost = duplicatedOps.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
    const grossProfit = order.clientSalePrice - totalCost;
    const margin = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    const duplicatedOrder: PrintingJobOrder = {
      ...order,
      id: newId,
      code: newCode,
      date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      currentStageIndex: 0,
      operations: duplicatedOps,
      totalActualCost: totalCost,
      grossProfit,
      profitMarginPercent: margin,
      salesInvoiceId: undefined,
      cogsJournalEntryId: undefined,
      createdAt: new Date().toISOString()
    };

    setJobOrders(prev => [duplicatedOrder, ...prev]);
    logAction(`تكرار أمر تشغيل مطبوعات: تم نسخ ${order.code} إلى ${newCode}`);
    showNotification(`تم تكرار الطلبية بنجاح برقم جديد: ${newCode}`, 'success');
  };

  // ==================== Shop Floor Kiosk Handlers (صالة الإنتاج والماكينات) ====================
  const handleStartKioskStage = (orderId: string, opIndex: number) => {
    setJobOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const newOps = [...order.operations];
      newOps[opIndex] = {
        ...newOps[opIndex],
        status: 'in_progress',
        startedAt: new Date().toISOString()
      };
      return { ...order, operations: newOps, status: 'in_progress' };
    }));
    showNotification('تم بدء تشغيل المرحلة على الماكينة بنجاح ▶️', 'info');
  };

  const handleOpenKioskComplete = (order: PrintingJobOrder, opIndex: number) => {
    const op = order.operations[opIndex];
    setKioskConfirmModal({
      orderId: order.id,
      opIndex,
      orderCode: order.code,
      opName: op.name,
      targetQty: order.quantity,
      goodQty: order.quantity,
      scrapQty: 0,
      notes: ''
    });
  };

  const handleSubmitKioskComplete = () => {
    if (!kioskConfirmModal) return;
    const { orderId, opIndex, goodQty, scrapQty, notes } = kioskConfirmModal;

    setJobOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const newOps = [...order.operations];
      newOps[opIndex] = {
        ...newOps[opIndex],
        status: 'completed',
        completedAt: new Date().toISOString(),
        goodQuantity: Number(goodQty) || 0,
        scrapQuantity: Number(scrapQty) || 0,
        operatorNotes: notes
      };
      const nextIdx = Math.min(opIndex + 1, newOps.length - 1);
      const allDone = newOps.every(o => o.status === 'completed');
      return {
        ...order,
        operations: newOps,
        currentStageIndex: nextIdx,
        status: allDone ? 'completed' : 'in_progress'
      };
    }));

    logAction(`صالة الإنتاج: إتمام مرحلة (${kioskConfirmModal.opName}) بأمر شغل ${kioskConfirmModal.orderCode} (سليم: ${goodQty}، هالك: ${scrapQty})`);
    showNotification(`تم إتمام وتسليم مرحلة (${kioskConfirmModal.opName}) ونقلها للمرحلة التالية بنجاح ✅`, 'success');
    setKioskConfirmModal(null);
  };

  // Filter jobs for Kiosk view (only active jobs matching the selected kiosk station)
  const kioskJobs = useMemo(() => {
    return jobOrders.filter(order => {
      if (order.status === 'delivered' || order.status === 'cancelled') return false;
      const op = order.operations.find(o => o.operationId === kioskStation);
      return Boolean(op);
    }).map(order => {
      const opIndex = order.operations.findIndex(o => o.operationId === kioskStation);
      const op = order.operations[opIndex];
      return { order, op, opIndex };
    });
  }, [jobOrders, kioskStation]);

  // ==================== Stage Execution & Accounting ====================
  const handleExecuteStage = (orderId: string, opIndex: number, updatedFields: Partial<JobOperationItem>) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;

    const op = order.operations[opIndex];
    if (!op) return;

    const isExternal = (updatedFields.executionType || op.executionType) === 'external';
    const cost = Number(updatedFields.cost ?? op.cost) || 0;
    const supplierId = updatedFields.supplierId || op.supplierId;
    const supplier = suppliers.find(s => s.id === supplierId);

    if (isExternal && !supplierId) {
      showNotification('يرجى اختيار المورد المسؤول عن هذه المرحلة أولاً', 'error');
      return;
    }

    let jeId: string | undefined = op.journalEntryId;
    let pInvId: string | undefined = op.purchaseInvoiceId;

    // 1. Generate real Purchase Invoice for supplier if external and not yet created
    if (isExternal && cost > 0 && !pInvId) {
      const pinvCount = (purchaseInvoices?.length || 0) + 1;
      const todayStr = new Date().toISOString().split('T')[0];
      const yearStr = todayStr.split('-')[0];
      pInvId = `PINV-${yearStr}-${String(pinvCount).padStart(4, '0')}`;
      const supplierName = supplier?.name || supplier?.companyName || 'مورد تشغيل لدى الغير';

      const newPurchaseInvoice: PurchaseInvoice = {
        id: pInvId,
        supplierId: supplierId!,
        supplierName,
        companyName: supplier?.companyName,
        date: todayStr,
        items: [
          {
            productId: `SRV-${op.operationId}`,
            productName: `${op.name} (أمر شغل ${order.code} - ${order.customerName})`,
            quantity: 1,
            price: cost,
            total: cost,
            unit: (op.unit as any) || 'عدد',
            itemType: 'expense',
            cost: cost
          }
        ],
        subTotal: cost,
        total: cost,
        paymentMethod: op.paymentMethod || 'اجل',
        invoiceType: 'purchase',
        notes: `مصنعية/توريد ${op.name} عن أمر شغل ${order.code} للعميل ${order.customerName}${op.notes ? ` - ${op.notes}` : ''}`,
        status: 'active',
        branchId: currentBranchId
      };

      if (setPurchaseInvoices) {
        setPurchaseInvoices(prev => [newPurchaseInvoice, ...prev]);
      }
    }

    // 2. Generate Journal Entry if external and not already posted
    if (isExternal && cost > 0 && !jeId) {
      const supplierName = supplier?.name || supplier?.companyName || 'مورد تشغيل لدى الغير';
      const entryDesc = `فاتورة مشتريات ${pInvId || ''} - تكلفة تشغيل لدى الغير (${op.name}) - أمر شغل ${order.code} - مورد: ${supplierName}`;

      jeId = createJournalEntry({
        description: entryDesc,
        date: new Date().toISOString().split('T')[0],
        referenceType: 'PurchaseInvoice',
        referenceId: pInvId || order.code,
        branchId: currentBranchId,
        lines: [
          {
            accountId: wipAccountId,
            accountName: `${wipAccountName} (${order.code})`,
            debit: cost,
            credit: 0
          },
          {
            accountId: payablesAccountId,
            accountName: `الموردين - ${supplierName}`,
            debit: 0,
            credit: cost
          }
        ]
      });

      logAction(`ترحيل قيد مرحلة (${op.name}) وفاتورة مشتريات ${pInvId} بأمر شغل ${order.code} لحساب المورد ${supplierName} بقيمة ${cost} ج.م`);
    }

    // Update operation item
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      ...updatedFields,
      supplierName: supplier?.name || supplier?.companyName || op.supplierName,
      status: 'completed',
      journalEntryId: jeId,
      purchaseInvoiceId: pInvId,
      completedAt: new Date().toISOString()
    };

    // Recalculate totals
    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    // Advance stage index if all prior are completed
    let nextStageIndex = order.currentStageIndex;
    if (opIndex === order.currentStageIndex) {
      nextStageIndex = Math.min(order.operations.length - 1, opIndex + 1);
    }

    const updatedOrder: PrintingJobOrder = {
      ...order,
      operations: newOps,
      currentStageIndex: nextStageIndex,
      totalActualCost,
      grossProfit,
      profitMarginPercent
    };

    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    showNotification(`تم اعتماد مرحلة (${op.name}) وتسجيل فاتورة المورد في المشتريات والحسابات بنجاح ✅`, 'success');
  };

  // Undo / Reset an approved stage (تراجع عن اعتماد مرحلة لتعديل التكلفة أو المورد)
  const handleUndoStage = (orderId: string, opIndex: number) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;
    const op = order.operations[opIndex];
    if (!op || op.status !== 'completed') return;

    if (!window.confirm(`هل أنت متأكد من إلغاء اعتماد مرحلة (${op.name})؟ سيتم حذف فاتورة المورد وقيدها المحاسبي لإتاحة تعديلها من جديد.`)) {
      return;
    }

    // 1. Remove linked purchase invoice from state
    if (op.purchaseInvoiceId && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => p.id !== op.purchaseInvoiceId));
    }

    // 2. Delete journal entry by reference and ID
    if (deleteJournalEntryByReference) {
      if (op.purchaseInvoiceId) deleteJournalEntryByReference(op.purchaseInvoiceId);
      if (op.journalEntryId) deleteJournalEntryByReference(op.journalEntryId);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        e.id !== op.journalEntryId && 
        e.referenceId !== op.purchaseInvoiceId && 
        e.referenceId !== op.journalEntryId
      ));
    }

    // 3. Reset operation state to pending
    const newOps = [...order.operations];
    newOps[opIndex] = {
      ...op,
      status: 'pending',
      journalEntryId: undefined,
      purchaseInvoiceId: undefined,
      completedAt: undefined
    };

    const totalActualCost = newOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
    const grossProfit = order.clientSalePrice - totalActualCost;
    const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

    const updatedOrder: PrintingJobOrder = {
      ...order,
      operations: newOps,
      totalActualCost,
      grossProfit,
      profitMarginPercent
    };

    setJobOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
    if (viewingJob?.id === orderId) setViewingJob(updatedOrder);

    logAction(`إلغاء اعتماد مرحلة (${op.name}) بأمر شغل ${order.code} وحذف فاتورة المورد وقيدها`);
    showNotification(`تم إلغاء اعتماد المرحلة وإلغاء استحقاق المورد، يمكنك الآن تعديلها وإعادة الاعتماد ✅`, 'success');
  };

  // Delete Job Order completely (حذف أمر الشغل بالكامل وتنظيف القيود والفواتير المرتبطة)
  const handleDeleteJobOrder = (orderId: string) => {
    const order = jobOrders.find(o => o.id === orderId);
    if (!order) return;

    if (!window.confirm(`هل أنت متأكد تماماً من حذف أمر الشغل رقم (${order.code})؟ سيتم إلغاء فواتير الموردين وفاتورة البيع والقيود المرتبطة به نهائياً.`)) {
      return;
    }

    // 1. Remove all linked purchase invoices
    const pInvIds = order.operations.map(o => o.purchaseInvoiceId).filter(Boolean) as string[];
    if (pInvIds.length > 0 && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => !pInvIds.includes(p.id)));
    }

    // 2. Remove linked sales invoice if any
    if (order.salesInvoiceId && setSalesInvoices) {
      setSalesInvoices(prev => prev.filter(inv => inv.id !== order.salesInvoiceId));
    }

    // 3. Delete journal entries by reference & ID
    const jeIds = order.operations.map(o => o.journalEntryId).filter(Boolean) as string[];
    if (order.cogsJournalEntryId) jeIds.push(order.cogsJournalEntryId);

    if (deleteJournalEntryByReference) {
      deleteJournalEntryByReference(order.code);
      pInvIds.forEach(id => deleteJournalEntryByReference(id));
      if (order.salesInvoiceId) deleteJournalEntryByReference(order.salesInvoiceId);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        !jeIds.includes(e.id) &&
        e.referenceId !== order.code &&
        !pInvIds.includes(e.referenceId || '') &&
        e.referenceId !== order.salesInvoiceId
      ));
    }

    // 4. Remove from state
    setJobOrders(prev => prev.filter(o => o.id !== orderId));
    if (viewingJob?.id === orderId) setViewingJob(null);

    logAction(`حذف أمر تشغيل المطبوعات بالكامل: ${order.code}`);
    showNotification(`تم حذف أمر الشغل (${order.code}) وتنظيف كافة الحركات المرتبطة به بنجاح 🗑️`, 'success');
  };

  // Final Delivery & Revenue Recognition (Creates real Sales Invoice in Sales Module)
  const handleDeliverJobOrder = (order: PrintingJobOrder) => {
    if (order.status === 'delivered') return;

    const customer = customers.find(c => c.id === order.customerId);
    const customerName = customer?.name || order.customerName;
    const todayStr = new Date().toISOString().split('T')[0];
    const yearStr = todayStr.split('-')[0];

    // Generate Sales Invoice ID
    const invCount = (salesInvoices?.length || 0) + 1;
    const invId = `INV-${yearStr}-${String(invCount).padStart(4, '0')}`;

    // 1. Calculate Unit Price
    const unitPrice = order.quantity > 0 ? (order.clientSalePrice / order.quantity) : order.clientSalePrice;

    // 2. Create the real Sales Invoice object
    const newInvoice: SalesInvoice = {
      id: invId,
      customerId: order.customerId,
      customerName: customerName,
      companyName: customer?.companyName || order.companyName,
      date: todayStr,
      items: [
        {
          productId: `PRNT-${order.code}`,
          productName: order.productTitle,
          quantity: order.quantity,
          price: unitPrice,
          total: order.clientSalePrice,
          unit: (order.unit as any) || 'عدد',
          itemType: 'expense', // Marked as custom service/expense item so it does not fail physical raw stock lookup
          cost: order.totalActualCost
        }
      ],
      subTotal: order.clientSalePrice,
      total: order.clientSalePrice,
      paymentMethod: 'اجل',
      invoiceType: 'sale',
      notes: `فاتورة مبيعات مسندة عن أمر تشغيل مطبوعات رقم ${order.code}${order.notes ? ` - ${order.notes}` : ''}`,
      status: 'active',
      branchId: currentBranchId
    };

    if (setSalesInvoices) {
      setSalesInvoices(prev => [newInvoice, ...prev]);
    }

    // 3. Revenue Entry: Debit Customer, Credit Printing Revenue
    const revenueEntryId = createJournalEntry({
      description: `فاتورة مبيعات ${invId} - تسليم أمر شغل مطبوعات ${order.code} - العميل: ${customerName}`,
      date: todayStr,
      referenceType: 'SalesInvoice',
      referenceId: invId,
      branchId: currentBranchId,
      lines: [
        {
          accountId: receivablesAccountId,
          accountName: `العملاء - ${customerName}`,
          debit: order.clientSalePrice,
          credit: 0
        },
        {
          accountId: revenueAccountId,
          accountName: revenueAccountName,
          debit: 0,
          credit: order.clientSalePrice
        }
      ]
    });

    // 4. COGS Entry: Debit COGS (Printing), Credit WIP (Printing Job)
    let cogsEntryId: string | undefined = undefined;
    if (order.totalActualCost > 0) {
      cogsEntryId = createJournalEntry({
        description: `إقفال تكلفة أوامر تشغيل مطبوعات (COGS) - أمر شغل ${order.code} - فاتورة ${invId}`,
        date: todayStr,
        referenceType: 'SalesInvoice',
        referenceId: invId,
        branchId: currentBranchId,
        lines: [
          {
            accountId: cogsAccountId,
            accountName: cogsAccountName,
            debit: order.totalActualCost,
            credit: 0
          },
          {
            accountId: wipAccountId,
            accountName: wipAccountName,
            debit: 0,
            credit: order.totalActualCost
          }
        ]
      });
    }

    const updatedOrder: PrintingJobOrder = {
      ...order,
      status: 'delivered',
      salesInvoiceId: invId,
      cogsJournalEntryId: cogsEntryId
    };

    setJobOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
    if (viewingJob?.id === order.id) setViewingJob(updatedOrder);

    logAction(`تسليم أمر شغل المطبوعات ${order.code} وإصدار فاتورة بيع ${invId} للعميل ${customerName}`);
    showNotification(`تم إنشاء فاتورة المبيعات (${invId}) في قسم المبيعات وتسليم الطلبية بنجاح 📦`, 'success');
  };

  // ==================== Feature 5: Consolidated Vendor Invoices ====================
  const [consForm, setConsForm] = useState<{
    supplierId: string;
    invoiceNumber: string;
    date: string;
    paymentMethod: 'نقدي' | 'اجل';
    notes: string;
    lines: {
      jobOrderId: string;
      operationId: PrintingOperationId;
      amount: number;
      notes: string;
    }[];
  }>({
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'اجل',
    notes: '',
    lines: [{ jobOrderId: '', operationId: 'printing', amount: 0, notes: '' }]
  });

  const handleAddConsolidatedLine = () => {
    setConsForm(prev => ({
      ...prev,
      lines: [...prev.lines, { jobOrderId: '', operationId: 'printing', amount: 0, notes: '' }]
    }));
  };

  const handleRemoveConsolidatedLine = (idx: number) => {
    setConsForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveConsolidatedInvoice = () => {
    if (!consForm.supplierId) {
      showNotification('يرجى اختيار المورد أولاً', 'error');
      return;
    }
    if (consForm.lines.some(l => !l.jobOrderId || l.amount <= 0)) {
      showNotification('يرجى تحديد أمر الشغل والمبلغ لجميع بنود الفاتورة', 'error');
      return;
    }

    const supplier = suppliers.find(s => s.id === consForm.supplierId);
    const supplierName = supplier?.name || supplier?.companyName || 'مورد مجمع';
    const totalAmount = consForm.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    const formattedLines: ConsolidatedVendorInvoiceLine[] = consForm.lines.map(line => {
      const order = jobOrders.find(o => o.id === line.jobOrderId);
      const opDef = STANDARD_PRINTING_OPERATIONS.find(d => d.id === line.operationId);
      return {
        id: `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        jobOrderId: line.jobOrderId,
        jobOrderCode: order?.code || 'طلب غير معروف',
        customerName: order?.customerName || '',
        operationId: line.operationId,
        operationName: opDef?.name || line.operationId,
        amount: Number(line.amount) || 0,
        notes: line.notes
      };
    });

    // Generate real Purchase Invoice for supplier
    const pinvCount = (purchaseInvoices?.length || 0) + 1;
    const yearStr = consForm.date.split('-')[0] || new Date().getFullYear().toString();
    const pInvId = consForm.invoiceNumber ? `PINV-${consForm.invoiceNumber}` : `PINV-${yearStr}-${String(pinvCount).padStart(4, '0')}`;

    const newPurchaseInvoice: PurchaseInvoice = {
      id: pInvId,
      supplierId: consForm.supplierId,
      supplierName,
      companyName: supplier?.companyName,
      date: consForm.date,
      items: formattedLines.map(line => ({
        productId: `SRV-${line.operationId}`,
        productName: `${line.operationName} (أمر شغل ${line.jobOrderCode} - ${line.customerName})`,
        quantity: 1,
        price: line.amount,
        total: line.amount,
        unit: 'عدد',
        itemType: 'expense',
        cost: line.amount
      })),
      subTotal: totalAmount,
      total: totalAmount,
      paymentMethod: consForm.paymentMethod,
      invoiceType: 'purchase',
      notes: `فاتورة مورد مجمعة رقم ${consForm.invoiceNumber || ''} موزعة على ${formattedLines.length} طلبيات${consForm.notes ? ` - ${consForm.notes}` : ''}`,
      status: 'active',
      branchId: currentBranchId
    };

    if (setPurchaseInvoices) {
      setPurchaseInvoices(prev => [newPurchaseInvoice, ...prev]);
    }

    // Create single Journal Entry: Credit Supplier, Debit WIP split per job
    const jeLines = [
      {
        accountId: payablesAccountId,
        accountName: `الموردين - ${supplierName}`,
        debit: 0,
        credit: totalAmount
      },
      ...formattedLines.map(line => ({
        accountId: wipAccountId,
        accountName: `${wipAccountName} (${line.jobOrderCode} - ${line.operationName})`,
        debit: line.amount,
        credit: 0
      }))
    ];

    const jeId = createJournalEntry({
      description: `فاتورة مشتريات ${pInvId} - فاتورة مجمعة لمورد (${supplierName}) رقم ${consForm.invoiceNumber || 'بدون'} عن ${formattedLines.length} طلبيات`,
      date: consForm.date,
      referenceType: 'PurchaseInvoice',
      referenceId: pInvId,
      branchId: currentBranchId,
      lines: jeLines
    });

    // Update costs on the respective Job Orders
    setJobOrders(prevOrders => {
      return prevOrders.map(order => {
        const matchingLines = formattedLines.filter(l => l.jobOrderId === order.id);
        if (matchingLines.length === 0) return order;

        const updatedOps = [...order.operations];
        matchingLines.forEach(line => {
          const opIndex = updatedOps.findIndex(o => o.operationId === line.operationId);
          if (opIndex >= 0) {
            updatedOps[opIndex] = {
              ...updatedOps[opIndex],
              supplierId: consForm.supplierId,
              supplierName,
              cost: Number(updatedOps[opIndex].cost || 0) + line.amount,
              status: 'completed',
              journalEntryId: jeId,
              purchaseInvoiceId: pInvId,
              completedAt: new Date().toISOString()
            };
          }
        });

        const totalCost = updatedOps.reduce((sum, o) => sum + (o.status === 'completed' ? (Number(o.cost) || 0) : 0), 0);
        const grossProfit = order.clientSalePrice - totalCost;
        const profitMarginPercent = order.clientSalePrice > 0 ? (grossProfit / order.clientSalePrice) * 100 : 0;

        return {
          ...order,
          operations: updatedOps,
          totalActualCost: totalCost,
          grossProfit,
          profitMarginPercent
        };
      });
    });

    const newConsInvoice: ConsolidatedVendorInvoice = {
      id: `CONS_${Date.now()}`,
      invoiceNumber: consForm.invoiceNumber || `INV-${Date.now()}`,
      date: consForm.date,
      supplierId: consForm.supplierId,
      supplierName,
      totalAmount,
      paymentMethod: consForm.paymentMethod,
      lines: formattedLines,
      journalEntryId: jeId,
      purchaseInvoiceId: pInvId,
      createdAt: new Date().toISOString(),
      notes: consForm.notes
    };

    setConsolidatedInvoices(prev => [newConsInvoice, ...prev]);
    logAction(`تسجيل فاتورة مجمعة للمورد ${supplierName} بقيمة ${totalAmount} ج.م لـ ${formattedLines.length} طلبيات`);
    showNotification('تم تسجيل الفاتورة المجمعة وترحيل القيود وتحديث الطلبيات بنجاح ✅', 'success');
    setIsConsolidatedModalOpen(false);
  };

  const handleDeleteConsolidatedInvoice = (consId: string) => {
    const cons = consolidatedInvoices.find(c => c.id === consId);
    if (!cons) return;
    if (!window.confirm(`هل أنت متأكد من حذف الفاتورة المجمعة للمورد (${cons.supplierName})؟ سيتم إلغاء فاتورة المشتريات والقيود المرتبطة بها.`)) return;

    if (cons.purchaseInvoiceId && setPurchaseInvoices) {
      setPurchaseInvoices(prev => prev.filter(p => p.id !== cons.purchaseInvoiceId));
    }
    if (deleteJournalEntryByReference) {
      if (cons.purchaseInvoiceId) deleteJournalEntryByReference(cons.purchaseInvoiceId);
      if (cons.journalEntryId) deleteJournalEntryByReference(cons.journalEntryId);
      if (cons.invoiceNumber) deleteJournalEntryByReference(cons.invoiceNumber);
    }
    if (setJournalEntries) {
      setJournalEntries(prev => prev.filter(e => 
        e.id !== cons.journalEntryId && 
        e.referenceId !== cons.purchaseInvoiceId && 
        e.referenceId !== cons.invoiceNumber
      ));
    }
    setConsolidatedInvoices(prev => prev.filter(c => c.id !== consId));
    logAction(`حذف فاتورة مورد مجمعة: ${cons.supplierName} بقيمة ${cons.totalAmount}`);
    showNotification(`تم حذف الفاتورة المجمعة وإلغاء الاستحقاق بنجاح ✅`, 'success');
  };

  // ==================== Feature 6: Customer Profitability Analysis ====================
  const customerProfitabilityData = useMemo(() => {
    const list = reportCustomerId === 'all'
      ? customers
      : customers.filter(c => c.id === reportCustomerId);

    return list.map(customer => {
      const orders = jobOrders.filter(o => {
        const matchCust = o.customerId === customer.id;
        const matchStart = !reportDateStart || o.date >= reportDateStart;
        const matchEnd = !reportDateEnd || o.date <= reportDateEnd;
        return matchCust && matchStart && matchEnd;
      });

      const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.clientSalePrice) || 0), 0);
      const totalCost = orders.reduce((sum, o) => sum + (Number(o.totalActualCost) || 0), 0);
      const netProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return {
        customer,
        orderCount: orders.length,
        totalRevenue,
        totalCost,
        netProfit,
        margin,
        orders
      };
    }).filter(d => d.orderCount > 0 || reportCustomerId !== 'all')
      .sort((a, b) => b.netProfit - a.netProfit);
  }, [customers, jobOrders, reportCustomerId, reportDateStart, reportDateEnd]);

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      {/* ==================== Top Header & Action Bar ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">🖨️</span>
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">أوامر تشغيل المطبوعات والتوريدات</h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                إدارة ملفات تشغيل المطبوعات الورقية بالـ 18 مرحلة (تصنيع لدى الغير / داخلي) والربحية الحية
              </p>
            </div>
          </div>
        </div>

        {/* Top Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasPerm('create_printing_job') && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm text-sm transition-all"
            >
              <span>➕</span>
              <span>أمر شغل مطبوعات جديد</span>
            </button>
          )}

          <button
            onClick={() => setIsConsolidatedModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center gap-2 shadow-sm text-sm transition-all"
            title="تسجيل فاتورة مورد مجمعة تضم أكثر من أمر شغل (الميزة 5)"
          >
            <span>🧾</span>
            <span>فاتورة مورد مجمعة</span>
          </button>
        </div>
      </div>

      {/* ==================== Navigation Tabs ==================== */}
      <div className="flex border-b border-gray-200 gap-4 bg-white px-4 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📋</span>
          <span>أوامر الشغل ({jobOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('consolidated')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'consolidated'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🧾</span>
          <span>فواتير الموردين المجمعة ({consolidatedInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profitability')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'profitability'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>📊</span>
          <span>تقرير أرباح العميل الحقيقية</span>
        </button>

        <button
          onClick={() => setActiveTab('kiosk')}
          className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'kiosk'
              ? 'border-emerald-600 text-emerald-800 bg-emerald-50/60'
              : 'border-transparent text-gray-500 hover:text-emerald-700'
          }`}
        >
          <span>🖥️</span>
          <span>شاشات صالة الإنتاج (Kiosk)</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            شاشات الماكينات
          </span>
        </button>
      </div>

      {/* ==================== TAB 1: JOB ORDERS ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-indigo-700">إجمالي الأوامر</span>
              <div className="text-2xl font-black text-indigo-900 mt-1">{kpis.totalOrders} أمر</div>
              <span className="text-xs text-indigo-600 font-medium">({kpis.inProgress} قيد التنفيذ)</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-emerald-700">إجمالي مبيعات المطبوعات</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {kpis.totalRevenue.toLocaleString('en-US')} ج.م
              </div>
              <span className="text-xs text-emerald-600 font-medium">قيمة الفواتير المسندة</span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-amber-700">إجمالي تكاليف التشغيل (الورش والمطابع)</span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {kpis.totalCost.toLocaleString('en-US')} ج.م
              </div>
              <span className="text-xs text-amber-600 font-medium">تكاليف منفذة لدى الغير/داخلي</span>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 p-4 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-purple-700">صافي أرباح المطبوعات</span>
              <div className="text-2xl font-black text-purple-900 mt-1">
                {kpis.totalProfit.toLocaleString('en-US')} ج.م
              </div>
              <span className={`text-xs font-bold ${kpis.marginPercent >= 25 ? 'text-green-600' : 'text-orange-600'}`}>
                هامش الربح: {kpis.marginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ابحث برقم الأمر، اسم العميل، أو اسم المطبوع..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كل الحالات</option>
                <option value="in_progress">قيد التشغيل ⏳</option>
                <option value="completed">مكتمل التشغيل ✅</option>
                <option value="delivered">تم التسليم للعميل 📦</option>
                <option value="draft">مسودة</option>
              </select>

              <select
                value={customerFilter}
                onChange={e => setCustomerFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
              >
                <option value="all">كل العملاء</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-3.5 text-xs font-bold text-gray-600">كود الأمر</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">العميل</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">المطبوع والكمية</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">سعر البيع</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">التكلفة الفعلية</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">صافي الربح (%)</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">مراحل التشغيل</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600">الحالة</th>
                    <th className="p-3.5 text-xs font-bold text-gray-600 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOrders.map(order => {
                    const completedOps = order.operations.filter(o => o.status === 'completed').length;
                    const totalOps = order.operations.length;
                    const progressPercent = totalOps > 0 ? (completedOps / totalOps) * 100 : 0;

                    return (
                      <tr key={order.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-700">
                          {order.code}
                          <div className="text-[10px] text-gray-400 font-sans">{order.date}</div>
                        </td>

                        <td className="p-3.5 font-bold text-gray-800">
                          {order.customerName}
                          {order.companyName && (
                            <div className="text-xs text-gray-500 font-normal">{order.companyName}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-semibold text-gray-800">{order.productTitle}</span>
                          <div className="text-xs text-gray-500">
                            {order.quantity.toLocaleString('en-US')} {order.unit}
                          </div>
                        </td>

                        <td className="p-3.5 font-bold text-gray-800">
                          {order.clientSalePrice.toLocaleString('en-US')} ج.م
                        </td>

                        <td className="p-3.5 font-semibold text-amber-700">
                          {order.totalActualCost.toLocaleString('en-US')} ج.م
                        </td>

                        <td className="p-3.5">
                          <div className={`font-bold ${order.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {order.grossProfit.toLocaleString('en-US')} ج.م
                          </div>
                          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                            order.profitMarginPercent >= 25 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.profitMarginPercent.toFixed(1)}%
                          </span>
                        </td>

                        {/* Progress Stepper Bar */}
                        <td className="p-3.5 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
                            <span>{completedOps} من {totalOps} مراحل</span>
                            <span>{progressPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </td>

                        {/* Status Badge & Invoice Link */}
                        <td className="p-3.5">
                          {order.status === 'delivered' ? (
                            <div className="flex flex-col gap-1">
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                                <span>📦</span> تم التسليم
                              </span>
                              {order.salesInvoiceId && (
                                <button
                                  onClick={() => onNavigate && onNavigate('sales')}
                                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                                  title="فتح شاشة فواتير المبيعات"
                                >
                                  <span>🧾</span> {order.salesInvoiceId}
                                </button>
                              )}
                            </div>
                          ) : order.status === 'completed' ? (
                            <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                              <span>✅</span> مكتمل
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
                              <span>⏳</span> قيد التشغيل
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center space-x-1.5 space-x-reverse">
                          <button
                            onClick={() => setViewingJob(order)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                            title="فتح ملف أمر الشغل والتشغيل"
                          >
                            👁️ ملف الشغل
                          </button>

                          {hasPerm('duplicate_printing_job') && (
                            <button
                              onClick={() => handleDuplicateJob(order)}
                              className="bg-teal-50 hover:bg-teal-100 text-teal-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                              title="تكرار الطلبية بضغطة زر (الميزة 4)"
                            >
                              🔄 تكرار
                            </button>
                          )}

                          {order.status !== 'delivered' && (
                            <button
                              onClick={() => handleOpenCreateModal(order)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                              title="تعديل أمر الشغل والكمية والأسعار"
                            >
                              ✏️ تعديل
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteJobOrder(order.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
                            title="حذف أمر الشغل بالكامل وتنظيف القيود والفواتير المرتبطة"
                          >
                            🗑️ حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500 font-medium">
                        لا توجد أوامر تشغيل مطبوعات تطابق البحث. يمكنك إنشاء أمر شغل جديد الآن!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: CONSOLIDATED INVOICES (FEATURE 5) ==================== */}
      {activeTab === 'consolidated' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-emerald-900 text-sm">💡 الفواتير المجمعة للموردين (Feature 5)</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                تتيح لك إثبات فاتورة واحدة من المطبعة أو تاجر الورق تضم مصنعيات عدة طلبيات لعملاء مختلفين وتوزيع التكلفة تلقائياً على كل أمر شغل.
              </p>
            </div>
            <button
              onClick={() => setIsConsolidatedModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>➕</span>
              <span>تسجيل فاتورة مجمعة جديدة</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3.5 text-xs font-bold text-gray-600">رقم الفاتورة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">التاريخ</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">المورد</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">عدد الطلبيات المغطاة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">إجمالي الفاتورة</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">طريقة السداد</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600">تفاصيل البنود</th>
                  <th className="p-3.5 text-xs font-bold text-gray-600 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consolidatedInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="p-3.5 font-mono font-bold text-gray-800">{inv.invoiceNumber}</td>
                    <td className="p-3.5 text-gray-600">{inv.date}</td>
                    <td className="p-3.5 font-bold text-emerald-800">{inv.supplierName}</td>
                    <td className="p-3.5 font-semibold text-gray-700">{inv.lines.length} طلبية</td>
                    <td className="p-3.5 font-black text-emerald-700">
                      {inv.totalAmount.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="p-3.5">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {inv.lines.map((l, idx) => (
                          <span key={idx} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-xs">
                            {l.jobOrderCode} ({l.operationName}): {l.amount.toLocaleString('en-US')} ج.م
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteConsolidatedInvoice(inv.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        title="حذف الفاتورة المجمعة وإلغاء الاستحقاق"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}

                {consolidatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500 font-medium">
                      لا توجد فواتير موردين مجمعة مسجلة حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: CUSTOMER NET PROFITABILITY (FEATURE 6) ==================== */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اختر العميل</label>
              <select
                value={reportCustomerId}
                onChange={e => setReportCustomerId(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm min-w-[200px]"
              >
                <option value="all">كافة العملاء</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">من تاريخ</label>
              <input
                type="date"
                value={reportDateStart}
                onChange={e => setReportDateStart(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={reportDateEnd}
                onChange={e => setReportDateEnd(e.target.value)}
                className="p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <button
              onClick={() => {
                setReportCustomerId('all');
                setReportDateStart('');
                setReportDateEnd('');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm"
            >
              إعادة تعيين
            </button>
          </div>

          {/* Profitability Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-sm">
              <thead className="bg-indigo-50/60 border-b border-indigo-100">
                <tr>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">العميل</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">عدد الطلبيات</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">إجمالي المبيعات</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">تكلفة الورش والمطابع</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">صافي ربح الشركة</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">نسبة الربحية</th>
                  <th className="p-3.5 text-xs font-bold text-indigo-900">تفاصيل الطلبيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerProfitabilityData.map(({ customer, orderCount, totalRevenue, totalCost, netProfit, margin, orders }) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="p-3.5 font-bold text-gray-900">
                      {customer.name}
                      {customer.companyName && (
                        <div className="text-xs text-gray-500 font-normal">{customer.companyName}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-semibold text-gray-700">{orderCount} طلبية</td>
                    <td className="p-3.5 font-bold text-gray-900">{totalRevenue.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3.5 font-semibold text-amber-700">{totalCost.toLocaleString('en-US')} ج.م</td>
                    <td className="p-3.5 font-black text-green-700 text-base">
                      {netProfit.toLocaleString('en-US')} ج.م
                    </td>
                    <td className="p-3.5">
                      <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                        margin >= 30 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="text-xs text-gray-600 space-y-1">
                        {orders.slice(0, 3).map(o => (
                          <div key={o.id} className="truncate max-w-[240px]">
                            • <span className="font-bold">{o.code}</span> ({o.productTitle}): ربح {o.grossProfit.toLocaleString('en-US')} ج.م
                          </div>
                        ))}
                        {orders.length > 3 && (
                          <div className="text-[11px] text-indigo-600 font-bold">
                            + {orders.length - 3} طلبيات أخرى
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {customerProfitabilityData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">
                      لا توجد بيانات لربحية العملاء في الفترة المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SHOP FLOOR / KIOSK VIEW (شاشات الماكينات) ==================== */}
      {activeTab === 'kiosk' && (
        <div className="space-y-6">
          {/* Kiosk Station Selector Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl shadow-lg border border-slate-800 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h2 className="text-lg font-black tracking-tight">شاشات صالة الإنتاج والماكينات (Kiosk Floor Mode)</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  واجهة لمس مخصصة لعمال الماكينات لمتابعة وبدء وتسليم مراحل التشغيل بدون أي بيانات مالية سرية
                </p>
              </div>

              <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-amber-400">
                🔒 وضع أمان صالة الإنتاج: حجب الأسعار والأرباح وحسابات العملاء تلقائياً
              </div>
            </div>

            {/* Station Quick Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { id: 'paper_cutting', name: 'قص الورق', icon: '✂️' },
                { id: 'ctp_plates', name: 'الزنكات CTP', icon: '💿' },
                { id: 'printing', name: 'طباعة أوفست', icon: '🖨️' },
                { id: 'lamination', name: 'سلوفان وورنيش', icon: '✨' },
                { id: 'corrugated_flute', name: 'شيتات سينجل فيس', icon: '📦' },
                { id: 'flute_lamination', name: 'كستوة وتبطين', icon: '🥞' },
                { id: 'laser_die', name: 'فورمة التكسير', icon: '📐' },
                { id: 'die_cutting', name: 'ماكينة التكسير', icon: '⚙️' },
                { id: 'gluing', name: 'لزق وتقفيل', icon: '🧴' },
                { id: 'packaging', name: 'تحزيم وتغليف', icon: '📦' },
                { id: 'shipping', name: 'شحن وتسليم', icon: '🚚' },
              ].map(st => {
                const count = jobOrders.filter(o => 
                  o.status !== 'delivered' && 
                  o.status !== 'cancelled' && 
                  o.operations.some(op => op.operationId === st.id && op.status !== 'completed')
                ).length;
                const isSelected = kioskStation === st.id;

                return (
                  <button
                    key={st.id}
                    onClick={() => setKioskStation(st.id as PrintingOperationId)}
                    className={`px-4 py-3 rounded-xl font-bold text-xs whitespace-nowrap flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-2 ring-indigo-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{st.icon}</span>
                    <span>{st.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Station Active Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kioskJobs.map(({ order, op, opIndex }) => {
              const isPending = op.status === 'pending';
              const isInProgress = op.status === 'in_progress';
              const isDone = op.status === 'completed';
              const specs = order.cartonSpecs;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border-2 transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                    isInProgress
                      ? 'border-indigo-600 ring-2 ring-indigo-200'
                      : isDone
                      ? 'border-emerald-300 bg-emerald-50/20'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black font-mono text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                            {order.code}
                          </span>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isInProgress
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isInProgress ? '⚡ جاري العمل على الماكينة' : isDone ? '✅ مكتملة ومسلّمة' : '⏳ في انتظار التشغيل'}
                          </span>
                        </div>
                        <h3 className="font-black text-gray-900 text-base mt-1.5">{order.productTitle}</h3>
                        <p className="text-xs text-gray-500 font-medium">العميل: {order.customerName}</p>
                      </div>

                      <div className="text-left bg-gray-50 p-2.5 rounded-xl border border-gray-200 min-w-[100px]">
                        <span className="text-[10px] font-bold text-gray-500 block">الكمية المطلوبة</span>
                        <span className="text-lg font-black text-gray-900 font-mono">
                          {order.quantity.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 block">{order.unit}</span>
                      </div>
                    </div>

                    {/* Technical Specs & Carton Layout Box */}
                    {specs ? (
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span>📦</span>
                            <span>{specs.structureName}</span>
                          </span>
                          {specs.fluteType && (
                            <span className="bg-indigo-100 text-indigo-800 font-black px-2 py-0.5 rounded text-[11px]">
                              {specs.fluteType} {specs.topPaperType ? `+ ${specs.topPaperType}` : ''}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                          {specs.length && specs.width && specs.height ? (
                            <div>• الأبعاد: <strong className="font-mono text-slate-900">{specs.length} × {specs.width} × {specs.height}</strong> سم</div>
                          ) : null}
                          <div>• مسطح التكسير: <strong className="font-mono text-indigo-700">{specs.blankLength} × {specs.blankWidth}</strong> سم</div>
                          <div>• مقاس الفرخ: <strong className="font-mono text-slate-900">{specs.sheetLength} × {specs.sheetWidth}</strong> سم</div>
                          <div>• عدد العلب بالفرخ: <strong className="font-mono text-emerald-700">{specs.upsPerSheet} علبة</strong></div>
                          <div className="col-span-2 text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200 font-bold">
                            ⚠️ إجمالي الأفرخ المطلوب سحبها لهذه الماكينة: <span className="font-mono text-sm">{specs.totalSheetsRequired.toLocaleString('en-US')}</span> فرخ
                          </div>
                        </div>

                        {/* Mini Imposition Grid */}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">
                            مخطط رص وتقسيم العلب بالفرخ ({specs.upsPerSheet} علبة):
                          </span>
                          <div className="w-full bg-slate-200 p-2 rounded-lg border border-slate-300 flex items-center justify-center">
                            <div className="grid gap-1 bg-white p-1 rounded border border-slate-300 w-full max-w-[200px]" style={{
                              gridTemplateColumns: `repeat(${Math.min(specs.upsPerSheet > 4 ? 4 : specs.upsPerSheet, 4)}, minmax(0, 1fr))`
                            }}>
                              {Array.from({ length: Math.min(specs.upsPerSheet, 12) }).map((_, i) => (
                                <div key={i} className="h-6 bg-indigo-100 border border-indigo-300 rounded text-[9px] font-bold text-indigo-700 flex items-center justify-center">
                                  علبة {i + 1}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-700">
                        <span className="font-bold text-gray-800">مواصفات المطبوع التجاري:</span>
                        <div className="mt-1 font-medium">{order.productTitle} - كمية: {order.quantity.toLocaleString('en-US')} {order.unit}</div>
                      </div>
                    )}

                    {order.notes && (
                      <div className="text-xs bg-yellow-50/80 border border-yellow-200 p-2.5 rounded-lg text-yellow-900">
                        <span className="font-bold">ملاحظات فنية:</span> {order.notes}
                      </div>
                    )}

                    {isDone && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs flex justify-between items-center text-emerald-900 font-bold">
                        <span>✓ تم إنجاز المرحلة</span>
                        <span>سليم: {(op.goodQuantity ?? order.quantity).toLocaleString('en-US')} | هالك: {op.scrapQuantity ?? 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Kiosk Action Buttons */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    {isPending ? (
                      <button
                        onClick={() => handleStartKioskStage(order.id, opIndex)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                      >
                        <span className="text-lg">▶️</span>
                        <span>بدء التشغيل على الماكينة</span>
                      </button>
                    ) : isInProgress ? (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          onClick={() => {
                            const reason = window.prompt('سبب التوقف أو العطل المؤقت:');
                            if (reason) logAction(`توقف مرحلة (${op.name}) بأمر شغل ${order.code}: ${reason}`);
                          }}
                          className="px-3 py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl text-xs"
                          title="تسجيل عطل أو توقف مؤقت"
                        >
                          ⏸️ عطل / توقف
                        </button>

                        <button
                          onClick={() => handleOpenKioskComplete(order, opIndex)}
                          className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all active:scale-[0.98]"
                        >
                          <span className="text-lg">✅</span>
                          <span>إنهاء وتسليم للمرحلة التالية</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full text-center py-2 text-xs font-bold text-emerald-700">
                        تم تسليم هذه المرحلة للمحطة اللاحقة ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {kioskJobs.length === 0 && (
              <div className="col-span-1 md:col-span-2 p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
                <span className="text-5xl block">🎉</span>
                <h3 className="text-lg font-black text-gray-800">لا توجد طلبيات قيد الانتظار في هذه المحطة حالياً</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  جميع أوامر الشغل الخاصة بمحطة ({STANDARD_PRINTING_OPERATIONS.find(o => o.id === kioskStation)?.name}) إما تم إنجازها أو لم تصل بعد من المراحل السابقة.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL: KIOSK STAGE COMPLETION ==================== */}
      {kioskConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">تسجيل إنهاء المرحلة وتسليمها</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  أمر شغل: {kioskConfirmModal.orderCode} | المرحلة: {kioskConfirmModal.opName}
                </p>
              </div>
              <button
                onClick={() => setKioskConfirmModal(null)}
                className="text-white hover:text-emerald-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Good Units Count */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  العدد السليم المنجز *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: Math.max(0, prev.goodQty - 50) }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    -50
                  </button>
                  <input
                    type="number"
                    value={kioskConfirmModal.goodQty}
                    onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: Number(e.target.value) || 0 }) : null)}
                    className="w-full p-3 border-2 border-emerald-400 rounded-xl text-center text-xl font-black text-emerald-800"
                  />
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, goodQty: prev.goodQty + 50 }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Scrap / Waste Units Count */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عدد الوحدات التالفة / الهالك (أفرخ ضبط أو تلف)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: Math.max(0, prev.scrapQty - 5) }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    value={kioskConfirmModal.scrapQty}
                    onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: Number(e.target.value) || 0 }) : null)}
                    className="w-full p-2.5 border-2 border-rose-300 rounded-xl text-center text-lg font-black text-rose-700"
                  />
                  <button
                    type="button"
                    onClick={() => setKioskConfirmModal(prev => prev ? ({ ...prev, scrapQty: prev.scrapQty + 5 }) : null)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات المشغل / الوردية (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظة بخصوص جودة السحب أو سبب الهالك..."
                  value={kioskConfirmModal.notes}
                  onChange={e => setKioskConfirmModal(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setKioskConfirmModal(null)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSubmitKioskComplete}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.98]"
              >
                تأكيد وتسليم للمرحلة التالية ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD / EDIT JOB ORDER ==================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 my-8">
            <div className="bg-gradient-to-r from-indigo-700 to-blue-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">
                  {editingJob ? `تعديل أمر شغل: ${editingJob.code}` : 'إنشاء أمر شغل مطبوعات ورقية جديد'}
                </h2>
                <p className="text-xs text-indigo-100 mt-0.5">تحديد مواصفات الطلبية والعمليات الفنية المطلوبة</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white hover:text-indigo-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Job Type Selector Tabs */}
              <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      jobType: 'offset_carton',
                      productCategory: 'علب وتغليف كرتون فاخر',
                      selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'corrugated_flute', 'flute_lamination', 'laser_die', 'die_cutting', 'gluing', 'packaging', 'shipping']
                    }));
                  }}
                  className={`flex-1 py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    formData.jobType === 'offset_carton'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-base">📦</span>
                  <span>تصنيع كرتون مضلع وعلب مبطنة أوفست (مع حاسبة التقفيل والمسطح)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      jobType: 'commercial_printing',
                      productCategory: 'مطبوعات تجارية',
                      selectedOps: ['paper_cutting', 'ctp_plates', 'printing', 'lamination', 'die_cutting', 'packaging']
                    }));
                  }}
                  className={`flex-1 py-3 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                    formData.jobType === 'commercial_printing'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-base">📄</span>
                  <span>مطبوعات ورقية تجارية مخصصة (بروشور / كتالوج / ملصقات)</span>
                </button>
              </div>

              {/* If offset_carton is selected, show Smart Box Specs & Imposition Calculator */}
              {formData.jobType === 'offset_carton' && (
                <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-purple-50/60 p-5 rounded-2xl border-2 border-indigo-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📐</span>
                      <div>
                        <h3 className="text-sm font-black text-indigo-950">حاسبة مسطحات وتقفيل الكرتون الأوفست الذكية</h3>
                        <p className="text-[11px] text-indigo-700">تطبيق معادلات التفريد (Blank Size) وتخطيط الفرخ (Imposition) حسب طراز التقفيل</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const opt = BOX_STRUCTURE_OPTIONS.find(b => b.type === formData.boxStructure);
                        const title = formData.boxStructure === 'custom_diecut'
                          ? `علبة كرتون مبطنة (فورمة خاصة ${modalBlankCalc.blankLength}×${modalBlankCalc.blankWidth} سم) - ${formData.fluteType} ${formData.topPaperType}`
                          : `علبة كرتون مبطنة (${opt?.fefcoCode || ''}) مقاس ${formData.boxLength}×${formData.boxWidth}×${formData.boxHeight} سم - مسطح ${modalBlankCalc.blankLength}×${modalBlankCalc.blankWidth} سم - ${formData.fluteType}`;
                        setFormData(prev => ({
                          ...prev,
                          productTitle: title,
                          notes: `مواصفات الكرتون: ${opt?.name} | مسطح التكسير: ${modalBlankCalc.blankLength}×${modalBlankCalc.blankWidth} سم | الفرخ: ${formData.sheetLength}×${formData.sheetWidth} سم (${modalImpCalc.upsPerSheet} علب بالفرخ) | ${formData.fluteType} + ${formData.topPaperType}`
                        }));
                        showNotification('تم ملء بيانات الوصف والملاحظات من الحاسبة بنجاح ⚡', 'success');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                      title="ملء اسم المطبوع والملاحظات الفنية تلقائياً من مواصفات الحاسبة"
                    >
                      <span>⚡</span>
                      <span>ملء الوصف تلقائياً</span>
                    </button>
                  </div>

                  {/* 1. Box Structure Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      1. اختر شكل / طراز تقفيل العلبة:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {BOX_STRUCTURE_OPTIONS.map(bs => {
                        const isSelected = formData.boxStructure === bs.type;
                        return (
                          <div
                            key={bs.type}
                            onClick={() => setFormData(prev => ({ ...prev, boxStructure: bs.type }))}
                            className={`p-2.5 rounded-xl border-2 cursor-pointer transition-all text-right ${
                              isSelected
                                ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-300'
                                : 'bg-white/80 border-gray-200 hover:border-indigo-300 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{bs.icon}</span>
                              <span className="font-black text-xs text-gray-900 truncate">{bs.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-700 block mt-0.5">
                              {bs.fefcoCode}
                            </span>
                            <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {bs.example}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Dimensions or Direct Blank */}
                  {formData.boxStructure !== 'custom_diecut' ? (
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-3">
                      <span className="text-xs font-bold text-gray-800 block">
                        2. أبعاد العلبة الداخلية (سم):
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">الطول (L) سم</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.boxLength}
                            onChange={e => setFormData(prev => ({ ...prev, boxLength: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">العرض (W) سم</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.boxWidth}
                            onChange={e => setFormData(prev => ({ ...prev, boxWidth: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">الارتفاع (H) سم</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.boxHeight}
                            onChange={e => setFormData(prev => ({ ...prev, boxHeight: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-center"
                          />
                        </div>
                      </div>

                      {/* Calculated Blank Banner */}
                      <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-900">📐 مسطح التكسير المفروش المحسوب:</span>
                          <span className="font-mono font-black text-indigo-700 text-sm bg-white px-2 py-0.5 rounded border border-indigo-200">
                            {modalBlankCalc.blankLength} سم (طول) × {modalBlankCalc.blankWidth} سم (عرض)
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium">
                          {modalBlankCalc.description}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-3">
                      <span className="text-xs font-bold text-gray-800 block">
                        2. إدخال مقاس مسطح الفورمة الخاصة مباشرة (سم):
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">طول مسطح التكسير (سم)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.customBlankLength}
                            onChange={e => setFormData(prev => ({ ...prev, customBlankLength: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">عرض مسطح التكسير (سم)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={formData.customBlankWidth}
                            onChange={e => setFormData(prev => ({ ...prev, customBlankWidth: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Paper, Flute & Sheet Setup */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 space-y-3">
                    <span className="text-xs font-bold text-gray-800 block">
                      3. مواصفات الخامات وفرخ الطباعة الأوفست:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">نوع تمويج السينجل فيس</label>
                        <select
                          value={formData.fluteType}
                          onChange={e => setFormData(prev => ({ ...prev, fluteType: e.target.value as any }))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                        >
                          <option value="E-Flute">E-Flute (ميكروفلوت ناعم 1.5 مم)</option>
                          <option value="B-Flute">B-Flute (فلوت متوسط 3 مم)</option>
                          <option value="C-Flute">C-Flute (فلوت كبير 4 مم)</option>
                          <option value="BC-Flute">BC-Flute (دبل وول 5 راء 7 مم)</option>
                          <option value="F-Flute">F-Flute (ألترا ناعم 0.8 مم)</option>
                          <option value="بدون (دوبلكس مصمت)">بدون (دوبلكس / بريستول مصمت)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">ورق الطباعة العلوي</label>
                        <input
                          type="text"
                          value={formData.topPaperType}
                          onChange={e => setFormData(prev => ({ ...prev, topPaperType: e.target.value }))}
                          placeholder="مثال: دوبلكس 250 جم"
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">مقاس فرخ الطباعة الأوفست</label>
                        <select
                          value={formData.sheetPreset}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '70x100') setFormData(prev => ({ ...prev, sheetPreset: val, sheetLength: 100, sheetWidth: 70 }));
                            else if (val === '66x88') setFormData(prev => ({ ...prev, sheetPreset: val, sheetLength: 88, sheetWidth: 66 }));
                            else if (val === '60x90') setFormData(prev => ({ ...prev, sheetPreset: val, sheetLength: 90, sheetWidth: 60 }));
                            else if (val === '50x70') setFormData(prev => ({ ...prev, sheetPreset: val, sheetLength: 70, sheetWidth: 50 }));
                            else setFormData(prev => ({ ...prev, sheetPreset: 'custom' }));
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold"
                        >
                          <option value="70x100">70 × 100 سم (فرخ كامل)</option>
                          <option value="66x88">66 × 88 سم</option>
                          <option value="60x90">60 × 90 سم</option>
                          <option value="50x70">50 × 70 سم (نصف فرخ)</option>
                          <option value="custom">مقاس تفصيل مخصص...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">نسبة هالك الضبط (%)</label>
                        <input
                          type="number"
                          value={formData.spoilagePercent}
                          onChange={e => setFormData(prev => ({ ...prev, spoilagePercent: Number(e.target.value) || 0 }))}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold text-center"
                        />
                      </div>
                    </div>

                    {formData.sheetPreset === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">طول الفرخ (سم)</label>
                          <input
                            type="number"
                            value={formData.sheetLength}
                            onChange={e => setFormData(prev => ({ ...prev, sheetLength: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs text-center"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">عرض الفرخ (سم)</label>
                          <input
                            type="number"
                            value={formData.sheetWidth}
                            onChange={e => setFormData(prev => ({ ...prev, sheetWidth: parseFloat(e.target.value) || 0 }))}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Imposition Live KPI Banner */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-[10px] font-bold text-gray-500 block">عدد العلب بالفرخ (Ups)</span>
                      <span className="text-xl font-black text-indigo-700 font-mono">
                        {modalImpCalc.upsPerSheet} علبة
                      </span>
                      <span className="text-[10px] text-indigo-600 block">({modalImpCalc.cols} × {modalImpCalc.rows})</span>
                    </div>

                    <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] font-bold text-gray-500 block">استغلال مساحة الفرخ</span>
                      <span className="text-xl font-black text-emerald-700 font-mono">
                        {modalImpCalc.sheetUsagePercent}%
                      </span>
                      <span className="text-[10px] text-emerald-600 block">
                        {modalImpCalc.sheetUsagePercent >= 75 ? 'ممتاز واقتصادي' : 'يوجد هالك جانبي'}
                      </span>
                    </div>

                    <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] font-bold text-gray-500 block">الأفرخ الصافية</span>
                      <span className="text-xl font-black text-amber-700 font-mono">
                        {modalImpCalc.sheetsWithoutSpoilage.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-amber-600 block">بدون هالك ضبط</span>
                    </div>

                    <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-100">
                      <span className="text-[10px] font-bold text-gray-500 block">إجمالي الأفرخ المطلوب سحبها</span>
                      <span className="text-xl font-black text-blue-800 font-mono">
                        {modalImpCalc.totalSheetsRequired.toLocaleString('en-US')}
                      </span>
                      <span className="text-[10px] text-blue-600 block">شاملاً {modalImpCalc.spoilageSheets} فرخ هالك</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Row 1: Customer & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">العميل *</label>
                  <select
                    value={formData.customerId}
                    onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- اختر العميل --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">تصنيف المطبوع</label>
                  <select
                    value={formData.productCategory}
                    onChange={e => setFormData(prev => ({ ...prev, productCategory: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="علب وتغليف كرتون">علب وتغليف كرتون فاخر</option>
                    <option value="مطبوعات تجارية">بروشور / فلاير / مطبوعات تجارية</option>
                    <option value="كتالوج ومجلات">كتالوج / مجلة / مفكرة</option>
                    <option value="استيكر وملصقات">استيكر وملصقات</option>
                    <option value="كروت شخصية">كروت ودعوات فاخرة</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Title, Quantity, Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">اسم / وصف المطبوع *</label>
                  <input
                    type="text"
                    placeholder="مثال: علبة عطر 50 مل كوشيه 350 جم سلوفان مط وبصمة ذهبي"
                    value={formData.productTitle}
                    onChange={e => setFormData(prev => ({ ...prev, productTitle: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الكمية المطلوبة *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-sm font-bold"
                    />
                    <select
                      value={formData.unit}
                      onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="p-2.5 border border-gray-300 rounded-xl text-sm"
                    >
                      <option value="عدد">عدد</option>
                      <option value="علبة">علبة</option>
                      <option value="ألف">ألف</option>
                      <option value="كرتونة">كرتونة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Sale Price & Delivery Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">سعر البيع المتفق عليه للعميل (ج.م) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.clientSalePrice}
                    onChange={e => setFormData(prev => ({ ...prev, clientSalePrice: Number(e.target.value) || 0 }))}
                    className="w-full p-2.5 border border-indigo-300 bg-indigo-50/40 rounded-xl text-sm font-black text-indigo-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">موعد التسليم المتوقع</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={e => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Quick Template Presets */}
              <div className="border-t border-gray-100 pt-4">
                <span className="text-xs font-bold text-gray-700 block mb-2">⚡ قوالب جاهزة سريعة لملء العمليات:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRINTING_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.operations)}
                      className="p-2.5 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-xl text-right text-xs transition-all"
                    >
                      <div className="font-bold text-gray-800">{tmpl.icon} {tmpl.name}</div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">{tmpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operations Checklist (18 Operations) */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700">
                    حدد العمليات المطلوبة لهذه الطلبية ({formData.selectedOps.length} محددة):
                  </span>
                  <div className="text-[11px] text-indigo-600 font-bold">
                    اضغط لتفعيل أو إلغاء أي مرحلة
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STANDARD_PRINTING_OPERATIONS.map(op => {
                    const isSelected = formData.selectedOps.includes(op.id);
                    return (
                      <div
                        key={op.id}
                        onClick={() => toggleOperation(op.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer select-none flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{op.icon}</span>
                          <span>{op.name}</span>
                        </span>
                        <span>{isSelected ? '✓' : '+'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات فنية إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي تفاصيل تخص الألوان، الجراماج، أو متطلبات العميل الخاصة..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-300 transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveJobOrder}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 shadow-sm transition-all"
              >
                {editingJob ? 'حفظ التعديلات' : 'إنشاء أمر الشغل والبدء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL / DRAWER: INTERACTIVE JOB DOSSIER ==================== */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 my-6 flex flex-col max-h-[90vh]">
            {/* Dossier Header */}
            <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-950 p-5 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-black text-amber-400">{viewingJob.code}</span>
                  <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {viewingJob.status === 'delivered' ? 'تم التسليم والفوترة' : 'قيد التشغيل'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-200 mt-1">
                  العميل: {viewingJob.customerName} {viewingJob.companyName ? `(${viewingJob.companyName})` : ''} | المطبوع: {viewingJob.productTitle} ({viewingJob.quantity.toLocaleString('en-US')} {viewingJob.unit})
                </div>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="text-gray-300 hover:text-white text-3xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            {/* Live Profitability Banner (المعادلة الفورية للربحية) */}
            <div className="bg-gray-100 p-4 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">سعر بيع العميل</span>
                <div className="text-lg font-black text-indigo-700">
                  {viewingJob.clientSalePrice.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">التكلفة الفعلية المعتمدة</span>
                <div className="text-lg font-black text-amber-700">
                  {viewingJob.totalActualCost.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">صافي الربح الفوري</span>
                <div className={`text-lg font-black ${viewingJob.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {viewingJob.grossProfit.toLocaleString('en-US')} ج.م
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
                <span className="text-[11px] font-bold text-gray-500">هامش الربح</span>
                <div className={`text-lg font-black ${viewingJob.profitMarginPercent >= 25 ? 'text-green-700' : 'text-orange-600'}`}>
                  {viewingJob.profitMarginPercent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* If Carton Specs exist, show the smart carton summary banner */}
            {viewingJob.cartonSpecs && (
              <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📦</span>
                    <span className="font-black text-sm text-amber-400">
                      مواصفات وتفريد الكرتون: {viewingJob.cartonSpecs.structureName}
                    </span>
                  </div>
                  {viewingJob.cartonSpecs.fluteType && (
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      {viewingJob.cartonSpecs.fluteType} {viewingJob.cartonSpecs.topPaperType ? `+ ${viewingJob.cartonSpecs.topPaperType}` : ''}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {viewingJob.cartonSpecs.length && viewingJob.cartonSpecs.width && viewingJob.cartonSpecs.height ? (
                    <div className="bg-slate-800/80 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">أبعاد العلبة (طول×عرض×ارتفاع)</span>
                      <span className="font-bold text-white font-mono">
                        {viewingJob.cartonSpecs.length} × {viewingJob.cartonSpecs.width} × {viewingJob.cartonSpecs.height} سم
                      </span>
                    </div>
                  ) : null}

                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">مسطح التكسير المفروش</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {viewingJob.cartonSpecs.blankLength} × {viewingJob.cartonSpecs.blankWidth} سم
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">فرخ الطباعة وتجميع العلب</span>
                    <span className="font-bold text-amber-300 font-mono">
                      {viewingJob.cartonSpecs.sheetLength}×{viewingJob.cartonSpecs.sheetWidth} سم ({viewingJob.cartonSpecs.upsPerSheet} علب/فرخ)
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">إجمالي أفرخ الورق المطلوب سحبها</span>
                    <span className="font-bold text-blue-300 font-mono">
                      {viewingJob.cartonSpecs.totalSheetsRequired.toLocaleString('en-US')} فرخ
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Stages / Operations List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-black text-gray-800">
                  مراحل وخط سير التشغيل ({viewingJob.operations.length} مرحلة):
                </h3>
                <span className="text-xs text-gray-500">
                  اضغط "اعتماد وترحيل القيد" لتسجيل استحقاق كل مورد فور إتمام مرحلته
                </span>
              </div>

              {viewingJob.operations.map((op, idx) => {
                const isCompleted = op.status === 'completed';

                return (
                  <div
                    key={op.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-white border-gray-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Operation Name & Mode */}
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">{op.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              op.executionType === 'internal'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {op.executionType === 'internal' ? '🏢 تصنيع داخلي' : '🚚 لدى الغير'}
                            </span>
                          </div>

                          <span className="text-xs text-gray-500 block">
                            {isCompleted
                              ? `مكتملة ومرحّلة بنجاح ${op.completedAt ? `(${new Date(op.completedAt).toLocaleDateString('ar-EG')})` : ''}`
                              : 'في انتظار الاعتماد'}
                            {op.goodQuantity !== undefined && (
                              <span className="text-emerald-700 font-bold mr-2 text-[11px]">
                                (إنتاج سليم: {op.goodQuantity.toLocaleString('en-US')} {op.scrapQuantity ? ` | هالك: ${op.scrapQuantity}` : ''})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Right: Supplier, Cost & Action */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Toggle Internal / External if not completed */}
                        {!isCompleted && (
                          <select
                            value={op.executionType}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].executionType = e.target.value as any;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs"
                          >
                            <option value="external">🚚 لدى الغير</option>
                            <option value="internal">🏢 داخلي</option>
                          </select>
                        )}

                        {/* Supplier Selector if External */}
                        {op.executionType === 'external' && (
                          <select
                            disabled={isCompleted}
                            value={op.supplierId || ''}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].supplierId = e.target.value;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="p-1.5 border border-gray-200 rounded-lg text-xs max-w-[160px] disabled:bg-gray-100"
                          >
                            <option value="">-- اختر المورد --</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.name})</option>
                            ))}
                          </select>
                        )}

                        {/* Cost Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            disabled={isCompleted}
                            placeholder="التكلفة ج.م"
                            value={op.cost || ''}
                            onChange={e => {
                              const newOps = [...viewingJob.operations];
                              newOps[idx].cost = Number(e.target.value) || 0;
                              setViewingJob({ ...viewingJob, operations: newOps });
                            }}
                            className="w-24 p-1.5 border border-gray-200 rounded-lg text-xs font-bold disabled:bg-gray-100"
                          />
                          <span className="text-xs text-gray-500">ج.م</span>
                        </div>

                        {/* Complete & Post Button */}
                        {!isCompleted ? (
                          <button
                            onClick={() => handleExecuteStage(viewingJob.id, idx, {
                              cost: op.cost,
                              supplierId: op.supplierId,
                              executionType: op.executionType
                            })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all"
                          >
                            <span>اعتماد وترحيل القيد ✅</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                              <span>✓</span>
                              <span>مرحّل بالحسابات</span>
                              {op.cost > 0 && <span className="font-mono">({op.cost.toLocaleString('en-US')} ج.م)</span>}
                            </span>

                            {viewingJob.status !== 'delivered' && (
                              <button
                                onClick={() => handleUndoStage(viewingJob.id, idx)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                title="إلغاء اعتماد المرحلة لتصحيح التكلفة أو تغيير المورد وإعادة ترحيلها"
                              >
                                <span>↩️</span>
                                <span>تراجع / إلغاء الاعتماد</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dossier Footer / Final Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {hasPerm('duplicate_printing_job') && (
                  <button
                    onClick={() => {
                      handleDuplicateJob(viewingJob);
                      setViewingJob(null);
                    }}
                    className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>🔄</span>
                    <span>تكرار هذا الشغل</span>
                  </button>
                )}

                {viewingJob.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      const job = viewingJob;
                      setViewingJob(null);
                      handleOpenCreateModal(job);
                    }}
                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    title="تعديل مواصفات أو كميات أو سعر أمر الشغل"
                  >
                    <span>✏️</span>
                    <span>تعديل بيانات الطلبية</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteJobOrder(viewingJob.id)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                  title="حذف أمر الشغل نهائياً مع فواتير الموردين والقيود المرتبطة"
                >
                  <span>🗑️</span>
                  <span>حذف أمر الشغل</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingJob(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300 transition-all"
                >
                  إغلاق
                </button>

                {viewingJob.status === 'delivered' ? (
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('sales');
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>🧾</span>
                    <span>عرض فاتورة البيع في المبيعات ({viewingJob.salesInvoiceId || 'فاتورة المبيعات'})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeliverJobOrder(viewingJob)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span>📦</span>
                    <span>تسليم الطلبية للعميل وإصدار الفاتورة الرسمية</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONSOLIDATED VENDOR INVOICE (FEATURE 5) ==================== */}
      {isConsolidatedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 my-8">
            <div className="bg-emerald-700 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black">تسجيل فاتورة مورد مجمعة (أكثر من طلبية)</h2>
                <p className="text-xs text-emerald-100 mt-0.5">
                  إثبات فاتورة واحدة للمطبعة أو تاجر الورق وتوزيع بنودها على طلبيات العملاء المختلفة
                </p>
              </div>
              <button
                onClick={() => setIsConsolidatedModalOpen(false)}
                className="text-white hover:text-emerald-200 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Supplier & Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">المورد *</label>
                  <select
                    value={consForm.supplierId}
                    onChange={e => setConsForm(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.companyName || s.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">رقم فاتورة المورد</label>
                  <input
                    type="text"
                    placeholder="مثال: INV-9842"
                    value={consForm.invoiceNumber}
                    onChange={e => setConsForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={consForm.date}
                    onChange={e => setConsForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-800">بنود الفاتورة وتوزيعها على الطلبيات:</span>
                  <button
                    type="button"
                    onClick={handleAddConsolidatedLine}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span>➕</span>
                    <span>إضافة سطر طلبية</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {consForm.lines.map((line, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap gap-2 items-center">
                      {/* Job Order Selector */}
                      <select
                        value={line.jobOrderId}
                        onChange={e => {
                          const newLines = [...consForm.lines];
                          newLines[idx].jobOrderId = e.target.value;
                          setConsForm(prev => ({ ...prev, lines: newLines }));
                        }}
                        className="p-1.5 border border-gray-300 rounded-lg text-xs flex-1 min-w-[180px]"
                      >
                        <option value="">-- اختر أمر الشغل --</option>
                        {jobOrders.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.code} - {o.customerName} ({o.productTitle})
                          </option>
                        ))}
                      </select>

                      {/* Operation Selector */}
                      <select
                        value={line.operationId}
                        onChange={e => {
                          const newLines = [...consForm.lines];
                          newLines[idx].operationId = e.target.value as any;
                          setConsForm(prev => ({ ...prev, lines: newLines }));
                        }}
                        className="p-1.5 border border-gray-300 rounded-lg text-xs min-w-[120px]"
                      >
                        {STANDARD_PRINTING_OPERATIONS.map(op => (
                          <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                      </select>

                      {/* Amount */}
                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          placeholder="المبلغ"
                          value={line.amount || ''}
                          onChange={e => {
                            const newLines = [...consForm.lines];
                            newLines[idx].amount = Number(e.target.value) || 0;
                            setConsForm(prev => ({ ...prev, lines: newLines }));
                          }}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs font-bold text-emerald-800"
                        />
                        <span className="text-[10px] text-gray-500">ج.م</span>
                      </div>

                      {/* Remove Line */}
                      {consForm.lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveConsolidatedLine(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl flex justify-between items-center text-sm font-bold text-emerald-900">
                  <span>إجمالي الفاتورة المجمعة:</span>
                  <span className="text-base font-black">
                    {consForm.lines.reduce((sum, l) => sum + Number(l.amount || 0), 0).toLocaleString('en-US')} ج.م
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConsolidatedModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveConsolidatedInvoice}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm"
              >
                حفظ وترحيل الفاتورة وتوزيع التكاليف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingJobOrders;
