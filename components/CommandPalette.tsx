import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Customer, Supplier, Product, SalesInvoice, PurchaseInvoice, User } from '../types.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  customers?: Customer[];
  suppliers?: Supplier[];
  products?: Product[];
  salesInvoices?: SalesInvoice[];
  purchaseInvoices?: PurchaseInvoice[];
  currentUser?: User;
  onOpenPrintSettings?: () => void;
  onOpenAccountingAudit?: () => void;
  onOpenCashFlowForecast?: () => void;
  onOpenVATDeclaration?: () => void;
}

interface PaletteItem {
  id: string;
  category: 'صفحات النظام' | 'إجراءات سريعة' | 'العملاء' | 'الموردين' | 'المنتجات والمخزون' | 'الفواتير والمستندات';
  title: string;
  subtitle?: string;
  icon: string;
  action: () => void;
  badge?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  customers = [],
  suppliers = [],
  products = [],
  salesInvoices = [],
  purchaseInvoices = [],
  onOpenPrintSettings,
  onOpenAccountingAudit,
  onOpenCashFlowForecast,
  onOpenVATDeclaration
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build searchable items
  const allItems: PaletteItem[] = useMemo(() => {
    const items: PaletteItem[] = [];

    // 1. Pages Navigation
    const pages = [
      { id: 'dashboard', title: 'لوحة التحكم والمؤشرات الرئيسية', icon: '📊', subtitle: 'نظرة عامة على الإيرادات والأرباح' },
      { id: 'sales', title: 'فواتير المبيعات والعملاء', icon: '💰', subtitle: 'إصدار ومتابعة فواتير البيع' },
      { id: 'quotations', title: 'عروض الأسعار ومقايسات الطباعة', icon: '📋', subtitle: 'حساب التكاليف وعروض العملاء' },
      { id: 'purchases', title: 'فواتير المشتريات والموردين', icon: '🛒', subtitle: 'فواتير التوريد ومستحقات الموردين' },
      { id: 'purchaseRequests', title: 'طلبات الشراء (PR)', icon: '📝', subtitle: 'إدارة وتعميد طلبات الاحتياج' },
      { id: 'purchaseOrders', title: 'أوامر الشراء (PO)', icon: '📑', subtitle: 'أوامر التوريد الصادرة للموردين' },
      { id: 'manufacturing', title: 'التصنيع وأوامر الشغل وبطاقات الإنتاج', icon: '⚙️', subtitle: 'متابعة خطوط الإنتاج والـ BOM' },
      { id: 'inventory', title: 'المخزون والأصناف والخامات', icon: '📦', subtitle: 'أرصدة الورق والدوبلكس والأحبار' },
      { id: 'warehouse', title: 'المستودعات والمخازن', icon: '🏬', subtitle: 'أذون الصرف والإضافة المخزنية' },
      { id: 'treasury', title: 'الخزينة والمصارف والبنوك والمحافظ', icon: '🏦', subtitle: 'سندات القبض والصرف والتحويلات' },
      { id: 'reports', title: 'التقارير المالية والحسابات الختامية', icon: '📈', subtitle: 'ميزان المراجعة، الأرباح، جاري المصنع' },
      { id: 'chartOfAccounts', title: 'دليل وشجرة الحسابات', icon: '🌳', subtitle: 'هيكل الحسابات والأستاذ العام' },
      { id: 'journalEntries', title: 'سجل القيود اليومية', icon: '📓', subtitle: 'القيود المحاسبية الآلية واليدوية' },
      { id: 'fixedAssets', title: 'الأصول الثابتة والإهلاك', icon: '🏢', subtitle: 'إدارة أصول وماكينات المصنع' },
      { id: 'accountingSettings', title: 'إعدادات التوجيه المحاسبي', icon: '⚖️', subtitle: 'ربط الحسابات التلقائي' },
      { id: 'settings', title: 'الإعدادات العامة والنسخ الاحتياطي', icon: '⚙️', subtitle: 'إعدادات المنشأة والخلفيات' },
    ];

    pages.forEach(p => {
      items.push({
        id: `page-${p.id}`,
        category: 'صفحات النظام',
        title: p.title,
        subtitle: p.subtitle,
        icon: p.icon,
        action: () => {
          onNavigate(p.id);
          onClose();
        }
      });
    });

    // 2. Quick Actions
    items.push(
      {
        id: 'action-new-sale',
        category: 'إجراءات سريعة',
        title: '+ إنشاء فاتورة مبيعات جديدة',
        subtitle: 'إصدار فاتورة بيع جديدة لعميل',
        icon: '⚡',
        action: () => {
          onNavigate('sales');
          onClose();
        }
      },
      {
        id: 'action-new-receipt',
        category: 'إجراءات سريعة',
        title: '+ إضافة سند قبض خزينة / بنك',
        subtitle: 'تسجيل دفعة أو تحصيل نقدي أو إلكتروني',
        icon: '💵',
        action: () => {
          onNavigate('treasury');
          onClose();
        }
      },
      {
        id: 'action-new-po',
        category: 'إجراءات سريعة',
        title: '+ إنشاء أمر شراء جديد (PO)',
        subtitle: 'طلب توريد خامات من مورد',
        icon: '📑',
        action: () => {
          onNavigate('purchaseOrders');
          onClose();
        }
      },
      {
        id: 'action-new-mfg',
        category: 'إجراءات سريعة',
        title: '+ إصدار أمر تشغيل وإنتاج جديد',
        subtitle: 'بدء أمر إنتاج كرتون أو عبوات',
        icon: '🏭',
        action: () => {
          onNavigate('manufacturing');
          onClose();
        }
      },
      {
        id: 'action-print-settings',
        category: 'إجراءات سريعة',
        title: '🖨️ تخصيص وتنسيق نماذج وقوالب الطباعة',
        subtitle: 'تعديل مقاسات الورق (A4 / A5 / حراري) والألوان والخطوط',
        icon: '🎨',
        action: () => {
          if (onOpenPrintSettings) onOpenPrintSettings();
          else onNavigate('settings');
          onClose();
        }
      },
      {
        id: 'action-audit',
        category: 'إجراءات سريعة',
        title: '⚖️ فاحص وتدقيق التوازن والنزاهة المحاسبية الآلي',
        subtitle: 'فحص ميزان المراجعة، مطابقة العملاء والموردين والمخزون',
        icon: '🛡️',
        action: () => {
          if (onOpenAccountingAudit) onOpenAccountingAudit();
          onClose();
        }
      },
      {
        id: 'action-cashflow',
        category: 'إجراءات سريعة',
        title: '📈 مؤشر التدفقات النقدية والسيولة المتوقعة',
        subtitle: 'توقع السيولة للأيام القادمة ومقارنة التحصيلات والالتزامات',
        icon: '💵',
        action: () => {
          if (onOpenCashFlowForecast) onOpenCashFlowForecast();
          onClose();
        }
      },
      {
        id: 'action-vat',
        category: 'إجراءات سريعة',
        title: '🏛️ إقرار ضريبة القيمة المضافة ومساعد الفاتورة الضريبية',
        subtitle: 'حساب ضريبة المخرجات والمدخلات وصافي المستحق للسداد (14%)',
        icon: '📊',
        action: () => {
          if (onOpenVATDeclaration) onOpenVATDeclaration();
          onClose();
        }
      }
    );

    // 3. Customers
    customers.slice(0, 30).forEach(c => {
      items.push({
        id: `cust-${c.id}`,
        category: 'العملاء',
        title: c.name,
        subtitle: `${c.phone ? `هاتف: ${c.phone}` : ''} ${c.companyName ? `| شركة: ${c.companyName}` : ''}`,
        icon: '👤',
        badge: (c as any).balance !== undefined ? `${(c as any).balance.toLocaleString()} ج.م` : undefined,
        action: () => {
          onNavigate('sales');
          onClose();
        }
      });
    });

    // 4. Suppliers
    suppliers.slice(0, 20).forEach(s => {
      items.push({
        id: `supp-${s.id}`,
        category: 'الموردين',
        title: s.name,
        subtitle: s.phone ? `هاتف: ${s.phone}` : 'مورد خامات ومستلزمات',
        icon: '🚚',
        action: () => {
          onNavigate('purchases');
          onClose();
        }
      });
    });

    // 5. Products & Raw Materials
    products.slice(0, 40).forEach(p => {
      items.push({
        id: `prod-${p.id}`,
        category: 'المنتجات والمخزون',
        title: p.name,
        subtitle: `كود: ${p.sku || p.id} | الوحدة: ${p.unit || 'قطعة'} | سعر: ${p.price || 0} ج.م`,
        icon: '📦',
        badge: `رصيد: ${p.stock ?? 0}`,
        action: () => {
          onNavigate('inventory');
          onClose();
        }
      });
    });

    // 6. Recent Sales Invoices
    salesInvoices.slice(0, 15).forEach(inv => {
      items.push({
        id: `inv-${inv.id}`,
        category: 'الفواتير والمستندات',
        title: `فاتورة مبيعات #${inv.id}`,
        subtitle: `العميل: ${inv.customerName} | التاريخ: ${inv.date}`,
        icon: '🧾',
        badge: `${inv.total?.toLocaleString()} ج.م`,
        action: () => {
          onNavigate('sales');
          onClose();
        }
      });
    });

    return items;
  }, [customers, suppliers, products, salesInvoices, onNavigate, onClose, onOpenPrintSettings]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Default recommended items
      return allItems.filter(i => i.category === 'إجراءات سريعة' || i.category === 'صفحات النظام').slice(0, 14);
    }
    const q = query.toLowerCase().trim();
    return allItems.filter(item => {
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    }).slice(0, 25);
  }, [allItems, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="relative border-b border-gray-200 p-4 flex items-center gap-3 bg-gray-50/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ابحث عن صفحة، عميل، صنف، فاتورة، أو اكتب إجراء سريع..."
            className="w-full bg-transparent text-sm font-semibold text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-gray-400 hover:text-gray-600 p-1"
            >
              مسح
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-gray-400 bg-gray-200/60 px-2 py-0.5 rounded font-mono">
              <span>ESC</span>
              <span>للإغلاق</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-gray-50">
          {filteredItems.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-xs">
              <span className="text-3xl block mb-2">🔍</span>
              لم يتم العثور على أي نتائج مطابقة لـ &ldquo;<span className="font-bold text-gray-700">{query}</span>&rdquo;
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center text-lg flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-normal">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {item.badge && (
                    <span className="text-[11px] font-mono font-bold bg-white border border-gray-200 text-gray-700 px-2.5 py-1 rounded-lg flex-shrink-0 shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar Hints */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] shadow-2xs font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] shadow-2xs font-mono">↓</kbd>
              <span>للتنقل</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] shadow-2xs font-mono">Enter ↵</kbd>
              <span>للاختيار والفتح</span>
            </span>
          </div>
          <div>
            <span>MediaHive Fast Command Bar</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommandPalette;
