import type { CompanyInfo, PrintSettings } from '../types.ts';

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  margins: 'normal',
  primaryColor: '#1e40af', // Blue 700
  fontFamily: 'Cairo',
  fontSize: 'base',
  showLogo: true,
  logoSize: 'md',
  showCompanyDetails: true,
  headerLayout: 'standard',
  taxNumber: '',
  commercialRegister: '',
  showTerms: true,
  footerNotes: 'البضاعة المباعة لا ترد ولا تستبدل إلا بموجب أصل الفاتورة ووفق الشروط المتفق عليها.',
  showGreeting: true,
  footerGreeting: 'شكراً لتعاملكم مع جراند ميديا ونسعد دائماً بخدمتكم.',
  showSignatures: true,
  showSignature1: true,
  signature1: 'إعداد / المحاسب',
  showSignature2: true,
  signature2: 'المستلم / العميل',
  showSignature3: true,
  signature3: 'اعتماد الإدارة',
  showQrCode: true,
};

export const COLOR_PALETTES = [
  { id: 'royal_blue', name: 'أزرق ملكي (كلاسيكي)', primary: '#1e40af', light: '#eff6ff' },
  { id: 'navy_dark', name: 'كحلي داكن فاخر', primary: '#0f172a', light: '#f8fafc' },
  { id: 'emerald_green', name: 'أخضر زمردي', primary: '#16a34a', light: '#f0fdf4' },
  { id: 'slate_gray', name: 'رمادي عصري هادئ', primary: '#334155', light: '#f1f5f9' },
  { id: 'indigo_violet', name: 'بنفسجي وإنديجو', primary: '#6366f1', light: '#eef2ff' },
  { id: 'crimson_ruby', name: 'قرمزي وأحمر دافئ', primary: '#be123c', light: '#fff1f2' },
  { id: 'amber_bronze', name: 'برونزي وترابي', primary: '#b45309', light: '#fffbeb' },
];

/**
 * Retrieve active print settings from storage with fallback to defaults
 */
export const getPrintSettings = (): PrintSettings => {
  try {
    const raw = localStorage.getItem('printSettings');
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PRINT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS };
  }
};

/**
 * Save print settings to storage
 */
export const savePrintSettings = (settings: PrintSettings): void => {
  try {
    localStorage.setItem('printSettings', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('printSettingsUpdated', { detail: settings }));
  } catch (err) {
    console.error('Failed to save print settings:', err);
  }
};

/**
 * Generate full CSS stylesheets for printing based on custom user settings
 */
export const getPrintStyles = (settings: PrintSettings = getPrintSettings()): string => {
  const marginsMap = {
    minimal: '4mm 6mm',
    compact: '8mm 10mm',
    normal: '14mm 16mm',
  };

  const fontSizesMap = {
    sm: { base: '11px', title: '18px', th: '11px', td: '11px' },
    base: { base: '12px', title: '20px', th: '12px', td: '12px' },
    lg: { base: '13.5px', title: '22px', th: '13px', td: '13px' },
  };

  const size = fontSizesMap[settings.fontSize] || fontSizesMap.base;
  const margin = marginsMap[settings.margins] || marginsMap.normal;
  const isThermal = settings.paperSize === 'thermal80';

  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700;800&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&display=swap');

    @page {
      size: ${isThermal ? '80mm auto' : `${settings.paperSize} ${settings.orientation}`};
      margin: ${isThermal ? '2mm 3mm' : margin};
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: '${settings.fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: ${isThermal ? '4px' : '0'};
      font-size: ${size.base};
      line-height: 1.5;
    }

    /* Print Header */
    .print-header {
      width: 100%;
      border-bottom: 2px solid ${settings.primaryColor};
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .print-header.centered {
      text-align: center;
    }

    .print-header.modern {
      background: linear-gradient(to left, #f8fafc, #ffffff);
      border-right: 4px solid ${settings.primaryColor};
      padding-right: 12px;
    }

    .company-title {
      font-size: ${size.title};
      font-weight: 800;
      color: ${settings.primaryColor};
      margin: 0;
      line-height: 1.2;
    }

    .company-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
    }

    .doc-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background: ${settings.primaryColor};
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }

    /* Tables */
    table.print-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: ${size.td};
    }

    table.print-table th {
      background-color: ${settings.primaryColor};
      color: #ffffff !important;
      padding: 7px 8px;
      font-weight: 700;
      text-align: right;
      border: 1px solid ${settings.primaryColor};
      font-size: ${size.th};
    }

    table.print-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    table.print-table tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Summary & Totals Box */
    .totals-box {
      width: ${isThermal ? '100%' : '320px'};
      margin-right: auto;
      margin-top: 10px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      border-bottom: 1px solid #f1f5f9;
    }

    .totals-row.final {
      background-color: #f8fafc;
      font-weight: 800;
      font-size: 14px;
      border-top: 2px solid ${settings.primaryColor};
      color: ${settings.primaryColor};
    }

    /* Footer & Terms */
    .print-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .footer-greeting {
      text-align: center;
      font-weight: 700;
      color: ${settings.primaryColor};
      font-size: 12px;
      margin-bottom: 8px;
    }

    .footer-notes {
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.6;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px dashed #cbd5e1;
    }

    /* Signatures */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
      padding-top: 15px;
      page-break-inside: avoid;
    }

    .sig-block {
      width: 28%;
      text-align: center;
      font-size: 11px;
    }

    .sig-title {
      font-weight: 700;
      color: #334155;
      margin-bottom: 35px;
    }

    .sig-line {
      border-bottom: 1px dashed #94a3b8;
      width: 85%;
      margin: 0 auto;
    }

    @media print {
      body { background: transparent !important; }
      .no-print { display: none !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
    }
  `;
};

/**
 * Generate standard HTML header for printable documents
 */
export const generatePrintHeader = (
  companyInfo: CompanyInfo,
  settings: PrintSettings,
  doc: {
    title: string;
    docNumber?: string;
    date?: string;
    badgeText?: string;
    secondPartyName?: string;
    secondPartyLabel?: string;
    extraHtml?: string;
  }
): string => {
  const logoHtml = settings.showLogo && companyInfo.logo ? `
    <img src="${companyInfo.logo}" alt="Logo" style="
      max-height: ${settings.logoSize === 'sm' ? '50px' : settings.logoSize === 'lg' ? '90px' : '70px'};
      max-width: 160px;
      object-fit: contain;
    " />
  ` : '';

  const detailsHtml = settings.showCompanyDetails ? `
    <div class="company-meta">
      ${companyInfo.address ? `<span>📍 ${companyInfo.address}</span>` : ''}
      ${companyInfo.phone ? `<span style="margin-right: 8px;">📞 ${companyInfo.phone}</span>` : ''}
      ${settings.commercialRegister || companyInfo.commercialRegister ? `<span style="margin-right: 8px;">س.ت: ${settings.commercialRegister || companyInfo.commercialRegister}</span>` : ''}
      ${settings.taxNumber || companyInfo.taxNumber ? `<span style="margin-right: 8px;">ر.ض: ${settings.taxNumber || companyInfo.taxNumber}</span>` : ''}
    </div>
  ` : '';

  if (settings.headerLayout === 'centered') {
    return `
      <div class="print-header centered">
        ${logoHtml ? `<div style="margin-bottom: 8px;">${logoHtml}</div>` : ''}
        <h1 class="company-title">${companyInfo.name || 'جراند ميديا'}</h1>
        ${detailsHtml}
        <div style="margin-top: 10px;">
          <span class="doc-badge">${doc.title}</span>
          ${doc.docNumber ? `<span style="font-weight: 700; margin-right: 8px; font-family: monospace;">#${doc.docNumber}</span>` : ''}
          ${doc.date ? `<span style="font-size: 11px; color: #64748b; margin-right: 10px;">التاريخ: ${doc.date}</span>` : ''}
        </div>
        ${doc.secondPartyName ? `<div style="font-size: 12px; margin-top: 6px; font-weight: 700;">${doc.secondPartyLabel || 'العميل'}: ${doc.secondPartyName}</div>` : ''}
        ${doc.extraHtml || ''}
      </div>
    `;
  }

  // Standard Two-column layout
  return `
    <div class="print-header ${settings.headerLayout === 'modern' ? 'modern' : ''}">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: top; width: 55%; text-align: right;">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${logoHtml}
              <div>
                <h1 class="company-title">${companyInfo.name || 'جراند ميديا'}</h1>
                ${detailsHtml}
              </div>
            </div>
          </td>
          <td style="vertical-align: top; width: 45%; text-align: left;">
            <div>
              <span class="doc-badge">${doc.title}</span>
            </div>
            <div style="margin-top: 6px; font-size: 12px; font-weight: bold; color: #1e293b;">
              ${doc.docNumber ? `رقم المستند: <span style="font-family: monospace;">${doc.docNumber}</span>` : ''}
            </div>
            ${doc.date ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">التاريخ: ${doc.date}</div>` : ''}
            ${doc.secondPartyName ? `
              <div style="font-size: 12px; margin-top: 4px; font-weight: 700; color: #0f172a;">
                ${doc.secondPartyLabel || 'الطرف الآخر'}: ${doc.secondPartyName}
              </div>
            ` : ''}
            ${doc.extraHtml || ''}
          </td>
        </tr>
      </table>
    </div>
  `;
};

/**
 * Generate standard HTML footer with terms and signatures
 */
export const generatePrintFooter = (
  settings: PrintSettings,
  companyInfo: CompanyInfo
): string => {
  const greetingHtml = (settings.showGreeting !== false && settings.footerGreeting) ? `
    <div class="footer-greeting">${settings.footerGreeting}</div>
  ` : '';

  const notesHtml = (settings.showTerms !== false && settings.footerNotes) ? `
    <div class="footer-notes">
      <b>ملاحظات وشروط:</b> ${settings.footerNotes}
    </div>
  ` : '';

  const showSig1 = settings.showSignature1 !== false;
  const showSig2 = settings.showSignature2 !== false;
  const showSig3 = settings.showSignature3 !== false;

  const sigHtml = settings.showSignatures && (showSig1 || showSig2 || showSig3) && settings.paperSize !== 'thermal80' ? `
    <div class="signatures-row">
      ${showSig1 ? `
        <div class="sig-block">
          <div class="sig-title">${settings.signature1 || 'إعداد / المحاسب'}</div>
          <div class="sig-line"></div>
        </div>
      ` : ''}
      ${showSig2 ? `
        <div class="sig-block">
          <div class="sig-title">${settings.signature2 || 'المستلم / الطرف الآخر'}</div>
          <div class="sig-line"></div>
        </div>
      ` : ''}
      ${showSig3 ? `
        <div class="sig-block">
          <div class="sig-title">${settings.signature3 || 'اعتماد الإدارة'}</div>
          <div class="sig-line"></div>
        </div>
      ` : ''}
    </div>
  ` : '';

  return `
    <div class="print-footer">
      ${greetingHtml}
      ${notesHtml}
      ${sigHtml}
    </div>
  `;
};

/**
 * Execute printing safely in a dedicated window or printable iframe
 */
export const executePrint = (fullHtml: string, title: string = 'طباعة مستند'): void => {
  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  } else {
    // Fallback: Invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
  }
};
