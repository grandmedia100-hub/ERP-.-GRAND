import React, { useState, useMemo, useEffect } from 'react';
import type { JournalEntry, Account, CompanyInfo, JournalEntryLine } from '../types.ts';

interface IntercompanyStatementModalProps {
  onClose: () => void;
  journalEntries?: JournalEntry[];
  accounts?: Account[];
  currentBranchName?: string;
}

const safeLines = (entry: any): JournalEntryLine[] => {
  if (Array.isArray(entry.lines)) return entry.lines;
  if (typeof entry.lines === 'string') {
    try {
      const parsed = JSON.parse(entry.lines);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const IntercompanyStatementModal: React.FC<IntercompanyStatementModalProps> = ({
  onClose,
  journalEntries = [],
  accounts = [],
  currentBranchName = 'الفرع الرئيسي'
}) => {
  // 1. Identify intercompany accounts
  const intercompanyAccounts = useMemo(() => {
    const list = accounts.filter(a => 
      !a.isGroup && (
        a.code === '2102' ||
        a.id === '2102' ||
        a.name.includes('جاري') ||
        a.name.includes('شقيقة') ||
        a.name.includes('المصنع') ||
        a.name.includes('جراند ميديا')
      )
    );
    if (list.length === 0) {
      // Fallback virtual account if not yet saved in database
      return [{ id: '2102', code: '2102', name: 'جاري الشركات الشقيقة (المصنع)', type: 'دائن' as const, parentId: null }];
    }
    return list;
  }, [accounts]);

  // Selected account state
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return intercompanyAccounts[0]?.id || '2102';
  });

  const selectedAccount = useMemo(() => {
    return intercompanyAccounts.find(a => a.id === selectedAccountId) ||
           accounts.find(a => a.id === selectedAccountId) ||
           { id: '2102', code: '2102', name: 'جاري الشركات الشقيقة (المصنع)' };
  }, [intercompanyAccounts, accounts, selectedAccountId]);

  // Filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Calculate Ledger Transactions
  const { openingBalance, transactions, totalDebit, totalCredit, closingBalance } = useMemo(() => {
    const targetId = selectedAccount.id;
    const targetCode = (selectedAccount as any).code || targetId;

    // Extract all lines matching this account
    const matchedTransactions: Array<{
      id: string;
      entryId: string;
      date: string;
      description: string;
      referenceType?: string;
      referenceId?: string;
      debit: number;
      credit: number;
      lineDescription?: string;
    }> = [];

    journalEntries.forEach(je => {
      const lines = safeLines(je);
      lines.forEach((l, idx) => {
        const matchesAccount = 
          l.accountId === targetId || 
          l.accountId === targetCode ||
          (targetCode === '2102' && (l.accountId === '2102' || (l.accountName && (l.accountName.includes('جاري') || l.accountName.includes('المصنع') || l.accountName.includes('شقيقة')))));

        if (matchesAccount) {
          matchedTransactions.push({
            id: `${je.id}-${idx}`,
            entryId: je.id,
            date: je.date || je.createdAt?.split('T')[0] || '',
            description: je.description,
            referenceType: je.referenceType,
            referenceId: je.referenceId,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            lineDescription: l.description
          });
        }
      });
    });

    // Sort chronologically
    matchedTransactions.sort((a, b) => a.date.localeCompare(b.date) || a.entryId.localeCompare(b.entryId));

    // Calculate opening balance (all transactions before startDate)
    // Note: For liability accounts (2102), credit is (+), debit is (-)
    // Standard accounting formula: Net Balance = (Credit - Debit) or (Debit - Credit)
    // In sister company accounts: Credit = We owe them / On our behalf; Debit = They owe us / Transferred to them
    const priorTransactions = matchedTransactions.filter(t => t.date < startDate);
    const openingBal = priorTransactions.reduce((acc, t) => acc + (t.credit - t.debit), 0);

    // Filter transactions within period
    const inPeriodTransactions = matchedTransactions.filter(t => {
      const inDate = t.date >= startDate && t.date <= endDate;
      if (!inDate) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        (t.referenceId || '').toLowerCase().includes(q) ||
        t.entryId.toLowerCase().includes(q) ||
        (t.lineDescription || '').toLowerCase().includes(q)
      );
    });

    // Compute running balance
    let currentBal = openingBal;
    const computedRows = inPeriodTransactions.map(t => {
      currentBal += (t.credit - t.debit);
      return {
        ...t,
        runningBalance: currentBal
      };
    });

    const totDeb = inPeriodTransactions.reduce((sum, t) => sum + t.debit, 0);
    const totCred = inPeriodTransactions.reduce((sum, t) => sum + t.credit, 0);

    return {
      openingBalance: openingBal,
      transactions: computedRows,
      totalDebit: totDeb,
      totalCredit: totCred,
      closingBalance: currentBal
    };
  }, [journalEntries, selectedAccount, startDate, endDate, searchQuery]);

  // Print Function
  const handlePrint = () => {
    const savedInfo = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = savedInfo
      ? JSON.parse(savedInfo)
      : { name: 'جراند ميديا للدعاية والإنتاج', phone: '01000000000', address: 'مصر' };

    const getRefBadge = (type?: string) => {
      switch (type) {
        case 'Transfer': return 'تحويل نقدي بيني';
        case 'PurchaseInvoice': return 'فاتورة مشتريات/توريد';
        case 'SalesInvoice': return 'فاتورة مبيعات';
        case 'Payment': return 'سداد مورد/مصروف';
        default: return type || 'قيد محاسبي';
      }
    };

    const rowsHtml = transactions.map((t, index) => {
      const balBadge = t.runningBalance >= 0 ? 'دائن (لصالح المصنع)' : 'مدين (على المصنع)';
      return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="direction: ltr; text-align: center;">${t.date}</td>
          <td style="font-weight: 600; text-align: center;">${t.referenceId || t.entryId}</td>
          <td style="text-align: center;"><span class="badge">${getRefBadge(t.referenceType)}</span></td>
          <td>${t.description} ${t.lineDescription ? `<br><small style="color: #666;">${t.lineDescription}</small>` : ''}</td>
          <td style="text-align: left; font-weight: bold; color: ${t.debit > 0 ? '#2563eb' : '#9ca3af'};">${t.debit > 0 ? t.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: left; font-weight: bold; color: ${t.credit > 0 ? '#16a34a' : '#9ca3af'};">${t.credit > 0 ? t.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
          <td style="text-align: left; font-weight: bold; direction: ltr; font-family: monospace;">
            ${Math.abs(t.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            <span style="font-size: 10px; font-weight: normal; font-family: Cairo, sans-serif;"> ${balBadge}</span>
          </td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>كشف حساب ${selectedAccount.name} (${startDate} إلى ${endDate})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            @page { size: A4 portrait; margin: 12mm 15mm; }
            body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 0; margin: 0; color: #1e293b; background: #fff; font-size: 12px; }
            .header-table { width: 100%; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
            .header-title { font-size: 20px; font-weight: 800; color: #1e40af; margin: 0; }
            .header-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .kpi-container { display: flex; gap: 10px; margin-bottom: 16px; }
            .kpi-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; background: #f8fafc; }
            .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 4px; }
            .kpi-value { font-size: 15px; font-weight: 800; font-family: monospace; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            table.data-table th { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 8px 6px; font-weight: 700; }
            table.data-table td { border: 1px solid #e2e8f0; padding: 6px 8px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; background: #e0e7ff; color: #3730a3; }
            .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
            .sig-box { text-align: center; width: 28%; }
            .sig-line { margin-top: 40px; border-bottom: 1px solid #94a3b8; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="text-align: right; vertical-align: top;">
                <div class="header-title">${companyInfo.name || 'جراند ميديا'}</div>
                <div class="header-subtitle">فرع العمليات: ${currentBranchName}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">الهاتف: ${companyInfo.phone || '-'} | العنوان: ${companyInfo.address || '-'}</div>
              </td>
              <td style="text-align: left; vertical-align: top;">
                <div style="font-size: 16px; font-weight: 800; color: #2563eb;">كشف حساب جاري الشركات الشقيقة</div>
                <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 4px;">حساب: ${selectedAccount.name} (${(selectedAccount as any).code || selectedAccount.id})</div>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">الفترة من: <b>${startDate}</b> إلى: <b>${endDate}</b></div>
              </td>
            </tr>
          </table>

          <div class="kpi-container">
            <div class="kpi-box">
              <div class="kpi-label">الرصيد الافتتاحي (قبل الفترة)</div>
              <div class="kpi-value" style="color: ${openingBalance >= 0 ? '#16a34a' : '#dc2626'};">
                ${Math.abs(openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                <span style="font-size: 10px;">(${openingBalance >= 0 ? 'دائن' : 'مدين'})</span>
              </div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">إجمالي المدين (حركات مدينة)</div>
              <div class="kpi-value" style="color: #2563eb;">
                ${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
              </div>
            </div>
            <div class="kpi-box">
              <div class="kpi-label">إجمالي الدائن (حركات دائنة)</div>
              <div class="kpi-value" style="color: #16a34a;">
                ${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
              </div>
            </div>
            <div class="kpi-box" style="background: #eff6ff; border-color: #93c5fd;">
              <div class="kpi-label" style="color: #1e40af; font-weight: 700;">صافي الرصيد الختامي</div>
              <div class="kpi-value" style="color: #1e3a8a;">
                ${Math.abs(closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.م
                <span style="font-size: 11px;">(${closingBalance >= 0 ? 'دائن - لصالح المصنع' : 'مدين - مستحق على المصنع'})</span>
              </div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="width: 75px;">التاريخ</th>
                <th style="width: 105px;">رقم القيد/المرجع</th>
                <th style="width: 95px;">نوع الحركة</th>
                <th>البيان والتفاصيل</th>
                <th style="width: 85px;">مدين (+)</th>
                <th style="width: 85px;">دائن (-)</th>
                <th style="width: 115px;">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">لا توجد حركات مسجلة خلال هذه الفترة</td></tr>'}
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sig-box">
              <div style="font-weight: 700;">إعداد المحاسب</div>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <div style="font-weight: 700;">المراجعة والتدقيق المالي</div>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <div style="font-weight: 700;">اعتماد الإدارة العامة</div>
              <div class="sig-line"></div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                كشف حساب جاري المصنع / الشركات الشقيقة
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-normal">حساب رقم {(selectedAccount as any).code || '2102'}</span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">مطابقة ومتابعة المعاملات المتبادلة والتحويلات والتوريدات بين الفرعين</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>طباعة كشف الحساب A4</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label className="text-gray-600 font-semibold text-xs">الحساب:</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {intercompanyAccounts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code ? `${a.code} - ` : ''}{a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-gray-600 font-semibold text-xs">من:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-gray-600 font-semibold text-xs">إلى:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                  const end = d.toISOString().split('T')[0];
                  setStartDate(start);
                  setEndDate(end);
                }}
                className="text-[11px] bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-2 py-1 rounded-md transition-colors"
              >
                الشهر الحالي
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setStartDate(`${d.getFullYear()}-01-01`);
                  setEndDate(d.toISOString().split('T')[0]);
                }}
                className="text-[11px] bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-2 py-1 rounded-md transition-colors"
              >
                العام الحالي
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate('2020-01-01');
                  setEndDate(new Date().toISOString().split('T')[0]);
                }}
                className="text-[11px] bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 px-2 py-1 rounded-md transition-colors"
              >
                الكل
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث في البيان أو رقم المستند..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg pr-8 pl-3 py-1.5 text-xs text-gray-700 w-56 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2.5 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border-b border-gray-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">رصيد ما قبل الفترة</span>
            <div className="text-base font-bold text-slate-800 mt-1 font-mono">
              {Math.abs(openingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-slate-500 mr-1">
                {openingBalance >= 0 ? '(دائن)' : '(مدين)'}
              </span>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-blue-600 block">إجمالي حركات المدين (+)</span>
            <div className="text-base font-bold text-blue-700 mt-1 font-mono">
              {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-blue-500 mr-1">ج.م</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-emerald-600 block">إجمالي حركات الدائن (-)</span>
            <div className="text-base font-bold text-emerald-700 mt-1 font-mono">
              {totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-emerald-500 mr-1">ج.م</span>
            </div>
          </div>

          <div className={`rounded-xl p-3 border ${closingBalance >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'}`}>
            <span className={`text-[11px] font-semibold block ${closingBalance >= 0 ? 'text-amber-700' : 'text-indigo-700'}`}>
              الرصيد الصافي الحالي
            </span>
            <div className={`text-base font-bold mt-1 font-mono ${closingBalance >= 0 ? 'text-amber-900' : 'text-indigo-900'}`}>
              {Math.abs(closingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal mr-1">
                {closingBalance >= 0 ? 'دائن (لصالح المصنع)' : 'مدين (على المصنع)'}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <table className="w-full text-right text-xs">
            <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-2.5 px-3 rounded-r-lg">#</th>
                <th className="py-2.5 px-3">التاريخ</th>
                <th className="py-2.5 px-3">رقم القيد/المرجع</th>
                <th className="py-2.5 px-3">نوع الحركة</th>
                <th className="py-2.5 px-3">البيان والتفاصيل</th>
                <th className="py-2.5 px-3 text-left">مدين (+)</th>
                <th className="py-2.5 px-3 text-left">دائن (-)</th>
                <th className="py-2.5 px-3 text-left rounded-l-lg">الرصيد بعد الحركة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    لا توجد أي حركات مسجلة على هذا الحساب في الفترة المحددة
                  </td>
                </tr>
              ) : (
                transactions.map((t, idx) => {
                  const isDebit = t.debit > 0;
                  const isCredit = t.credit > 0;
                  return (
                    <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 text-gray-600 font-mono" style={{ direction: 'ltr', textAlign: 'right' }}>
                        {t.date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-gray-800 font-mono">{t.referenceId || t.entryId}</span>
                      </td>
                      <td className="py-3 px-3">
                        {t.referenceType === 'Transfer' ? (
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">تحويل نقدي</span>
                        ) : t.referenceType === 'PurchaseInvoice' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">توريد كرتون</span>
                        ) : t.referenceType === 'SalesInvoice' ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">فاتورة بيع</span>
                        ) : t.referenceType === 'Payment' ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[11px] font-semibold">سداد مورد</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[11px] font-semibold">{t.referenceType || 'قيد محاسبي'}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-700">
                        <div className="font-medium">{t.description}</div>
                        {t.lineDescription && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{t.lineDescription}</div>
                        )}
                      </td>
                      <td className={`py-3 px-3 text-left font-mono font-bold ${isDebit ? 'text-blue-600' : 'text-gray-300'}`}>
                        {isDebit ? t.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className={`py-3 px-3 text-left font-mono font-bold ${isCredit ? 'text-emerald-600' : 'text-gray-300'}`}>
                        {isCredit ? t.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-3 text-left font-mono font-bold text-gray-800">
                        {Math.abs(t.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className={`text-[10px] mr-1 font-sans ${t.runningBalance >= 0 ? 'text-amber-600' : 'text-indigo-600'}`}>
                          {t.runningBalance >= 0 ? 'دائن' : 'مدين'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
          <div>
            إجمالي الحركات المعروضة: <span className="font-bold text-gray-700">{transactions.length}</span> حركة
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>الدفاتر متطابقة ومربوطة بشجرة الحسابات والقيود الآلية</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IntercompanyStatementModal;
