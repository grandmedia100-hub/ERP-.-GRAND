import React, { useState, useMemo } from 'react';
import type { Quotation, Customer, Product, SalesInvoice, CompanyInfo } from '../types.ts';
import AddQuotationModal from './AddQuotationModal.tsx';
import AddSalesInvoiceModal from './AddSalesInvoiceModal.tsx';
import QuoteCalculatorModal from './QuoteCalculatorModal.tsx';

interface QuotationsProps {
    quotations: Quotation[];
    setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
    customers: Customer[];
    products: Product[];
    onConvert: (quote: Quotation) => void; // Parent handler? No, easier to handle locally if we can open AddSalesInvoiceModal.
    // Actually, we need to pass props to open AddSalesInvoiceModal.
    // To avoid prop drilling hell, let's just expose a way to trigger invoice creation.
    // OR, better: The 'onConvert' prop will function as "Open AddSalesInvoiceModal with this data".
}

// Extended Props to include Invoice Creation capabilities in-place? 
// Or just let App.tsx handle the conversion?
// Let's keep it simple: Pass `handleOpenSalesModal` as a prop from App.tsx/wrapper.
// But wait, the Sidebar routing structure makes passing props complex if not careful.
// Let's assume we receive necessary props.

interface ExtendedQuotationsProps {
    quotations: Quotation[];
    setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
    customers: Customer[];
    products: Product[];
    salesInvoices: SalesInvoice[]; // For reference or validation?
    setSalesInvoices: React.Dispatch<React.SetStateAction<SalesInvoice[]>>;
    logAction: (action: string) => void;
    // We need these to open the sales modal if we do it here
    salesModalProps: {
        open: (invoiceData: Partial<SalesInvoice>) => void;
    };
    onConvertToWorkOrder?: (quote: Quotation) => void; // New Prop for Work Order
}

const Quotations: React.FC<ExtendedQuotationsProps> = ({
    quotations, setQuotations, customers, products, logAction, salesModalProps, onConvertToWorkOrder
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Calculator State
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [calculatorQuote, setCalculatorQuote] = useState<Quotation | null>(null);

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q =>
            q.customerName.includes(searchQuery) || q.id.includes(searchQuery)
        ).reverse();
    }, [quotations, searchQuery]);

    const handleSaveQuotation = (quoteData: Omit<Quotation, 'id'> & { id?: string }) => {
        if (quoteData.id) {
            setQuotations(prev => prev.map(q => q.id === quoteData.id ? { ...q, ...quoteData } as Quotation : q));
            logAction(`تعديل عرض سعر: ${quoteData.id}`);
        } else {
            const currentYear = new Date().getFullYear();
            const prefix = `Q-${currentYear}-`;
            const maxNum = quotations.reduce((max, q) => {
                if (q.id.startsWith(prefix)) {
                    const num = parseInt(q.id.substring(prefix.length), 10);
                    return isNaN(num) ? max : Math.max(max, num);
                }
                return max;
            }, 0);
            const newId = `${prefix}${(maxNum + 1).toString().padStart(3, '0')}`;
            const newQuote: Quotation = {
                ...quoteData,
                id: newId,
                createdAt: new Date().toISOString()
            } as Quotation;
            setQuotations(prev => [...prev, newQuote]);
            logAction(`إنشاء عرض سعر جديد: ${newId}`);
        }
        setIsModalOpen(false);
        setEditingQuote(null);
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف عرض السعر هذا؟')) {
            setQuotations(prev => prev.filter(q => q.id !== id));
            logAction(`حذف عرض سعر: ${id}`);
        }
    };

    const handleConvert = (quote: Quotation) => {
        if (confirm('تحويل عرض السعر إلى فاتورة بيع؟')) {
            // Prepare invoice data
            const invoiceData: Partial<SalesInvoice> = {
                customerId: quote.customerId,
                customerName: quote.customerName,
                companyName: quote.companyName,
                items: quote.items,
                total: quote.total,
                notes: `تحويل من عرض سعر رقم ${quote.id}. \n ${quote.notes || ''}`
            };

            // Open Sales Modal (We assume this function is passed down or we find a way to navigate)
            salesModalProps.open(invoiceData);

            // Update Quote Status
            setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'accepted' } : q));
        }
    };

    const handleOpenCalculator = (quote: Quotation) => {
        setCalculatorQuote(quote);
        setIsCalculatorOpen(true);
    };

    const handleCreateFinalFromCalculator = (finalData: Partial<Quotation>) => {
        // Prepare data for new quote (remove ID to treat as new)
        const newQuoteData = { ...finalData, id: undefined } as unknown as Quotation;
        setEditingQuote(newQuoteData);
        setIsModalOpen(true);
    };

    const handlePrint = (quote: Quotation) => {
        const companyInfoString = localStorage.getItem('companyInfo');
        const companyInfo: CompanyInfo = companyInfoString ? JSON.parse(companyInfoString) : { name: 'Company', logo: '', address: '', phone: '' };

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
          <head>
            <title>عرض سعر #${quote.id}</title>
            <meta charset="UTF-8">
            <style>
               @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
               
               :root {
                   --primary-color: #1e40af;
                   --secondary-color: #f3f4f6;
                   --border-color: #e5e7eb;
               }

               * {
                   box-sizing: border-box;
                   margin: 0;
                   padding: 0;
               }

               body {
                   font-family: 'Cairo', sans-serif;
                   margin: 0;
                   padding: 0;
                   background-color: #525659;
                   font-size: 10px;
                   line-height: 1.3;
               }

               @page {
                   size: A4;
                   margin: 0;
               }

               .page {
                   width: 210mm;
                   min-height: 296mm;
                   padding: 8mm 12mm;
                   margin: 0 auto;
                   background: white;
                   position: relative;
                   display: flex;
                   flex-direction: column;
                   box-sizing: border-box; 
               }

               @media print {
                   body {
                       background: none;
                       margin: 0;
                   }
                   .page {
                       margin: 0;
                       border: initial;
                       border-radius: initial;
                       width: 100%;
                       min-height: initial;
                       box-shadow: initial;
                       background: initial;
                       page-break-after: always;
                       padding: 8mm 12mm !important;
                   }
                   
                   .logo {
                       display: block !important;
                       visibility: visible !important;
                       opacity: 1 !important;
                       max-width: 100px !important; 
                       max-height: 60px !important;
                   }
                   
                   tfoot {
                       display: none !important;
                   }
                   
                   .print-total-section {
                       display: block !important;
                   }
                   
                   table {
                       page-break-inside: auto;
                   }
                   
                   thead {
                       display: table-header-group;
                   }
                   
                   tr {
                       page-break-inside: avoid;
                       page-break-after: auto;
                   }
               }

               .content-wrapper {
                   flex: 1;
               }

               .header {
                   display: flex;
                   justify-content: space-between;
                   align-items: center;
                   padding-bottom: 6px;
                   border-bottom: 2px solid var(--primary-color);
                   margin-bottom: 8px;
               }
                
               @media print {
                   .header-right {
                       display: block !important;
                       visibility: visible !important;
                   }
               }

               .logo {
                   max-height: 60px;
                   object-fit: contain;
               }

               .company-name {
                   font-size: 18px;
                   font-weight: bold;
                   color: var(--primary-color);
                   margin: 0;
               }

               .doc-title {
                   text-align: center;
                   font-size: 20px;
                   font-weight: 700;
                   color: #333;
                   margin: 6px 0;
                   letter-spacing: 0.5px;
               }

               .info-bar {
                   display: flex;
                   justify-content: space-between;
                   align-items: flex-start;
                   margin-bottom: 6px;
                   padding: 5px 8px;
                   background-color: #f8fafc;
                   border-radius: 4px;
                   border: 1px solid #e2e8f0;
               }

               .info-group {
                   display: flex;
                   flex-direction: column;
                   gap: 3px;
               }

               .detail-row {
                   display: flex;
                   align-items: center;
                   font-size: 11px;
               }

               .detail-label {
                   font-weight: bold;
                   color: #64748b;
                   width: 100px; 
               }

               .detail-value {
                   color: #0f172a;
                   font-weight: 600;
               }

               .invoice-badge {
                   background-color: #dbeafe;
                   color: #1e40af;
                   padding: 1px 6px;
                   border-radius: 3px;
                   display: inline-block;
               }

               .customer-section {
                   background-color: var(--secondary-color);
                   padding: 6px 8px;
                   border-radius: 4px;
                   margin-bottom: 8px;
                   position: relative;
               }

               .customer-label {
                   font-size: 10px;
                   color: #64748b;
                   margin-bottom: 2px;
                   font-weight: bold;
               }

               .customer-info h2 {
                   margin: 0;
                   font-size: 15px;
                   color: #333;
               }

               .customer-info p {
                   margin: 2px 0 0;
                   font-size: 12px;
                   color: #666;
               }

               .status-badge {
                   position: absolute;
                   left: 15px;
                   top: 15px;
                   padding: 3px 10px;
                   border-radius: 15px;
                   font-size: 10px;
                   font-weight: bold;
                   background-color: white;
                   border: 1px solid var(--border-color);
               }

               table {
                   width: 100%;
                   border-collapse: collapse;
                   margin-bottom: 8px;
                   border: 1px solid #000;
               }

               th {
                   background-color: #1e293b;
                   color: white;
                   padding: 3px 4px;
                   font-size: 10px;
                   text-align: center;
                   border: 1px solid #000 !important;
               }

               td {
                   padding: 3px 4px;
                   border: 1px solid #000 !important;
                   font-size: 10px;
                   color: #333;
               }

               tr:nth-child(even) { background-color: #f8fafc; }

               .footer-section {
                   display: flex;
                   justify-content: space-between;
                   gap: 12px;
               }

               .notes {
                   flex: 1;
                   font-size: 9px;
                   color: #1f2937; 
                   line-height: 1.3;
                   border: 1px solid #fcd34d;
                   padding: 6px;
                   border-radius: 4px;
                   background-color: #fffbeb; 
                   white-space: pre-line;
                   max-width: 60%;
               }

               .notes strong {
                   color: #92400e; 
                   font-size: 10px;
                   display: block;
                   margin-bottom: 3px;
                   font-weight: 800;
               }

               .totals { width: 200px; }

               .total-row {
                   display: flex;
                   justify-content: space-between;
                   padding: 6px 0;
                   border-bottom: 1px solid var(--border-color);
                   font-size: 11px;
               }

               .total-row.final {
                   border-bottom: none;
                   border-top: 2px solid var(--primary-color);
                   margin-top: 6px;
                   padding-top: 8px;
                   font-weight: bold;
                   font-size: 14px;
                   color: var(--primary-color);
               }
               
               .print-total-section {
                   display: block; 
                   margin-top: 0;
                   padding: 6px;
                   background-color: #f9fafb;
                   border: 1px solid #e5e7eb;
                   border-radius: 4px;
                   page-break-inside: avoid; 
                   width: 35%;
                   margin-right: auto; 
               }
               
               .print-total-section .total-row {
                   display: flex;
                   justify-content: space-between;
                   margin-bottom: 4px;
                   font-size: 11px;
               }

               .print-total-section .total-row.final {
                   border-top: 1px solid #000;
                   margin-top: 4px;
                   padding-top: 4px;
                   font-weight: bold;
                   font-size: 13px;
                   color: #000;
               }

               .doc-footer {
                   margin-top: auto;
                   padding-top: 10px;
                   border-top: 1px solid #eee;
                   text-align: center;
               }

               .company-contacts {
                   font-weight: bold;
                   color: #374151;
                   font-size: 10px;
                   margin-bottom: 3px;
                   direction: ltr;
               }

               .company-contacts span {
                   margin: 0 8px;
               }

               .sys-gen {
                   font-size: 8px;
                   color: #9ca3af;
               }
            </style>
          </head>
          <body>
             <div class="page">
                 <div class="content-wrapper">
                     <!-- Header (Logo Right, Company Left) -->
                     <div class="header">
                         <div class="header-right">
                             ${companyInfo.logo ? `<img src="${companyInfo.logo}" class="logo" alt="Logo" onload="window.logoLoaded = true;" />` : ''}
                         </div>
                         <div class="header-left">
                             <h1 class="company-name">${companyInfo.name}</h1>
                         </div>
                     </div>

                     <!-- Centered Title -->
                     <div class="doc-title">عرض سعر</div>

                     <!-- Info Bar (Split Details) -->
                     <div class="info-bar">
                         <!-- Right Group -->
                         <div class="info-group">
                             <div class="detail-row">
                                 <span class="detail-label">رقم العرض:</span>
                                 <span class="detail-value invoice-badge">#${quote.id}</span>
                             </div>
                             <div class="detail-row">
                                 <span class="detail-label">تاريخ الإصدار:</span>
                                 <span class="detail-value">${quote.date}</span>
                             </div>
                         </div>

                         <!-- Left Group -->
                         <div class="info-group">
                             ${quote.delegateName ? `
                             <div class="detail-row">
                                 <span class="detail-label">مسؤول المبيعات:</span>
                                 <span class="detail-value">${quote.delegateName}</span>
                             </div>` : ''}
                             ${quote.deliveryDuration ? `
                             <div class="detail-row">
                                 <span class="detail-label">مدة الاستلام:</span>
                                 <span class="detail-value">${quote.deliveryDuration}</span>
                             </div>` : ''}
                             ${quote.expirationDate ? `
                             <div class="detail-row">
                                 <span class="detail-label">صالح حتى:</span>
                                 <span class="detail-value" style="color: #dc2626;">${quote.expirationDate}</span>
                             </div>` : ''}
                         </div>
                     </div>

                     <!-- Customer -->
                     <!-- Customer Compact -->
                     <div class="customer-section" style="padding: 10px; margin-bottom: 15px;">
                         <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span class="customer-label">العميل: </span>
                                <span style="font-weight: bold; font-size: 16px; color: #333;">${quote.customerName}</span>
                                ${quote.companyName ? `<span style="margin-right: 10px; font-size: 14px; color: #666;">(${quote.companyName})</span>` : ''}
                            </div>
                            <div class="status-badge" style="position: static; padding: 2px 8px; font-size: 11px; color: ${quote.status === 'accepted' ? '#16a34a' : 'gray'}; border: 1px solid ${quote.status === 'accepted' ? '#16a34a' : '#e5e7eb'};">
                                 ${quote.status === 'accepted' ? 'مقبول' : quote.status === 'rejected' ? 'مرفوض' : 'ساري'}
                             </div>
                          </div>
                     </div>

                      <!-- Table -->
                      ${(() => {
                // Check if ALL items have only ONE tier (or no tiers)
                const allSingleTier = quote.items.every(item => {
                    if (!item.pricingTiers || item.pricingTiers.length === 0) return true;
                    return item.pricingTiers.length === 1;
                });

                // Check if all quantities are 1 (hide qty column and totals)
                const allQtyOne = quote.items.every(item => {
                    if (!item.pricingTiers || item.pricingTiers.length === 0)
                        return item.quantity === 1;
                    return item.pricingTiers[0].quantity === 1;
                });

                if (allSingleTier) {
                    if (allQtyOne) {
                        // Quantity = 1 for all → hide qty column, hide totals
                        return `
                                  <table style="table-layout: fixed; width: 100%;">
                                      <thead>
                                          <tr>
                                              <th style="width: 5%; text-align: center;">#</th>
                                              <th style="width: 75%; text-align: right;">البيان / الصنف</th>
                                              <th style="width: 20%; text-align: center;">السعر</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${quote.items.map((item, i) => {
                            const price = (item.pricingTiers && item.pricingTiers.length > 0)
                                ? item.pricingTiers[0].price
                                : item.price;
                            return `
                                                  <tr>
                                                      <td style="text-align: center;">${i + 1}</td>
                                                      <td style="text-align: right;">
                                                          <div style="font-weight: bold; font-size: 14px;">${item.productName}</div>
                                                          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                                                             ${item.size ? `<span style="font-size: 11px; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">مقاس: ${item.size}</span>` : ''}
                                                             ${item.variantName ? `<span style="font-size: 12px; color: #b91c1c; font-weight: bold;">${item.variantName}</span>` : ''}
                                                          </div>
                                                          ${item.description ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${item.description}</div>` : ''}
                                                      </td>
                                                      <td style="text-align: center; font-weight: bold;">${Number(price).toFixed(2)}</td>
                                                  </tr>
                                              `;
                        }).join('')}
                                      </tbody>
                                   </table>
                              `;
                    } else {
                        // Multiple quantities → show qty + price + total columns
                        const showTotal = quote.showTotalInPrint !== false;
                        return `
                                  <table style="table-layout: fixed; width: 100%;">
                                      <thead>
                                          <tr>
                                              <th style="width: 5%; text-align: center;">#</th>
                                              <th style="width: ${showTotal ? '45%' : '55%'}; text-align: right;">البيان / الصنف</th>
                                              <th style="width: 15%; text-align: center;">الكمية</th>
                                              <th style="width: 15%; text-align: center;">السعر</th>
                                              ${showTotal ? '<th style="width: 20%; text-align: center;">الإجمالي</th>' : ''}
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${quote.items.map((item, i) => {
                            const qty = (item.pricingTiers && item.pricingTiers.length > 0)
                                ? item.pricingTiers[0].quantity
                                : item.quantity;
                            const price = (item.pricingTiers && item.pricingTiers.length > 0)
                                ? item.pricingTiers[0].price
                                : item.price;
                            const total = qty * price;
                            return `
                                                  <tr>
                                                      <td style="text-align: center;">${i + 1}</td>
                                                      <td style="text-align: right;">
                                                          <div style="font-weight: bold; font-size: 14px;">${item.productName}</div>
                                                          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                                                             ${item.size ? `<span style="font-size: 11px; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; border: 1px solid #e5e7eb;">مقاس: ${item.size}</span>` : ''}
                                                             ${item.variantName ? `<span style="font-size: 12px; color: #b91c1c; font-weight: bold;">${item.variantName}</span>` : ''}
                                                          </div>
                                                          ${item.description ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${item.description}</div>` : ''}
                                                      </td>
                                                      <td style="text-align: center; font-weight: bold; color: #16a34a;">${qty}</td>
                                                      <td style="text-align: center; font-weight: bold;">${Number(price).toFixed(2)}</td>
                                                      ${showTotal ? `<td style="text-align: center; font-weight: bold; color: #1d4ed8;">${Number(total).toFixed(2)}</td>` : ''}
                                                  </tr>
                                              `;
                        }).join('')}
                                      </tbody>
                                   </table>
                              `;
                    }
                } else {

                    // Multi-Tier Table (Existing)
                    return `
                                  <table style="table-layout: fixed; width: 100%;">
                                      <thead>
                                          <tr>
                                              <th style="width: 5%">#</th>
                                              <th style="width: 35%">البيان / الصنف</th>
                                              
                                              <!-- Tier 1 -->
                                              <th style="width: 10%; text-align: center; background-color: #f1f5f9; color: #334155; border-right: 2px solid white;">الكمية</th>
                                              <th style="width: 10%; text-align: center; background-color: #cbd5e1; color: #334155;">السعر</th>
                                              
                                              <!-- Tier 2 -->
                                              <th style="width: 10%; text-align: center; background-color: #f1f5f9; color: #334155; border-right: 2px solid white;">الكمية</th>
                                              <th style="width: 10%; text-align: center; background-color: #cbd5e1; color: #334155;">السعر</th>

                                              <!-- Tier 3 -->
                                              <th style="width: 10%; text-align: center; background-color: #f1f5f9; color: #334155; border-right: 2px solid white;">الكمية</th>
                                              <th style="width: 10%; text-align: center; background-color: #cbd5e1; color: #334155;">السعر</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          ${quote.items.map((item, i) => {
                        const tiers = (item.pricingTiers && item.pricingTiers.length > 0)
                            ? item.pricingTiers
                            : [{ quantity: item.quantity, price: item.price }];

                        const paddedTiers = [...tiers, ...Array(3 - tiers.length).fill(null)];

                        return `
                                                  <tr>
                                                      <td>${i + 1}</td>
                                                      <td>
                                                          <div style="font-weight: bold; font-size: 14px;">${item.productName}</div>
                                                          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                                             ${item.size ? `<span style="font-size: 11px; background: #f3f4f6; padding: 1px 6px; rounded: 4px; border: 1px solid #e5e7eb;">مقاس: ${item.size}</span>` : ''}
                                                             ${item.variantName ? `<span style="font-size: 12px; color: #b91c1c; font-weight: bold;">${item.variantName}</span>` : ''}
                                                          </div>
                                                          ${item.description ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">${item.description}</div>` : ''}
                                                      </td>
                                                      
                                                      <!-- Tier 1 -->
                                                      <td style="text-align: center; font-weight: bold; color: #16a34a;">${paddedTiers[0] ? paddedTiers[0].quantity : ''}</td>
                                                      <td style="text-align: center; font-weight: bold;">${paddedTiers[0] ? Number(paddedTiers[0].price).toFixed(2) : ''}</td>

                                                      <!-- Tier 2 -->
                                                      <td style="text-align: center; font-weight: bold; color: #16a34a;">${paddedTiers[1] ? paddedTiers[1].quantity : ''}</td>
                                                      <td style="text-align: center; font-weight: bold;">${paddedTiers[1] ? Number(paddedTiers[1].price).toFixed(2) : ''}</td>

                                                      <!-- Tier 3 -->
                                                      <td style="text-align: center; font-weight: bold; color: #16a34a;">${paddedTiers[2] ? paddedTiers[2].quantity : ''}</td>
                                                      <td style="text-align: center; font-weight: bold;">${paddedTiers[2] ? Number(paddedTiers[2].price).toFixed(2) : ''}</td>
                                                  </tr>
                                              `;
                    }).join('')}
                                       </tbody>
                                   </table>
                                   
                               `;
                }
            })()}

                     <!-- Footer Section (Totals after table) -->
                     <div class="footer-section">
                         <div class="notes">
                             <strong>الملاحظات والشروط:</strong><br>
                             ${quote.notes || 'لا يوجد ملاحظات إضافية.'}
                         </div>
                          ${(() => {
                              const allQtyOneForFooter = quote.items.every(item => {
                                  if (!item.pricingTiers || item.pricingTiers.length === 0)
                                      return item.quantity === 1;
                                  return item.pricingTiers[0].quantity === 1;
                              });
                              // Hide total section when all qty=1 OR showTotalInPrint is false
                              if (allQtyOneForFooter || quote.showTotalInPrint === false) return '';
                              return `
                          <div class="print-total-section">
                              <div class="total-row final">
                                  <span>الإجمالي النهائي:</span>
                                  <span>${quote.total.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</span>
                              </div>
                          </div>`;
                          })()}
                     </div>
                 </div>

                 <!-- Document Footer (Company Info) -->
                 <div class="doc-footer">
                     <div class="company-contacts">
                         <span>${companyInfo.address}</span>
                         ${companyInfo.phone ? ` | <span>${companyInfo.phone}</span>` : ''}
                     </div>
                     <div class="sys-gen">
                         تم إصدار هذا المستند آلياً بواسطة نظام ${companyInfo.name}.
                     </div>
                  </div>
              </div>
              <script>
                  window.onload = function() {
                      setTimeout(function() {
                          window.focus();
                          window.print();
                      }, 500);
                  };
              </script>
          </body>
        </html>
      `);
        printWindow.document.close();
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">عروض الأسعار</h1>
                <button
                    onClick={() => { setEditingQuote(null); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <span>+ إنشاء عرض سعر</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <input
                    type="text"
                    placeholder="بحث برقم العرض أو اسم العميل..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                />
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3">رقم العرض</th>
                            <th className="p-3">العميل</th>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">وقت الإنشاء</th>
                            <th className="p-3">القيمة</th>
                            <th className="p-3">الحالة</th>
                            <th className="p-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredQuotations.map(q => (
                            <tr key={q.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold">{q.id}</td>
                                <td className="p-3">{q.customerName}</td>
                                <td className="p-3">{q.date}</td>
                                <td className="p-3 text-sm text-gray-600">
                                    {q.createdAt ? (() => {
                                        const date = new Date(q.createdAt);
                                        const day = date.getDate().toString().padStart(2, '0');
                                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                        const year = date.getFullYear();
                                        const hours = date.getHours().toString().padStart(2, '0');
                                        const minutes = date.getMinutes().toString().padStart(2, '0');
                                        return `${day}/${month}/${year} - ${hours}:${minutes}`;
                                    })() : '-'}
                                </td>
                                <td className="p-3 font-bold text-blue-600">{q.total.toLocaleString()} ج.م</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${q.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                        q.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {q.status === 'accepted' ? 'مقبول (تم البيع)' : q.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                                    </span>
                                </td>
                                <td className="p-3 flex items-center gap-2">
                                    <button onClick={() => { setEditingQuote(q); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-700">تعديل</button>
                                    <button onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-700">حذف</button>
                                    <button onClick={() => handlePrint(q)} className="text-gray-500 hover:text-gray-700">طباعة</button>
                                    {q.status !== 'accepted' && (
                                        <>
                                            <button onClick={() => handleConvert(q)} className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700">تحويل لفاتورة</button>
                                            <button onClick={() => onConvertToWorkOrder && onConvertToWorkOrder(q)} className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700">أمر تشغيل</button>
                                            <button onClick={() => handleOpenCalculator(q)} className="bg-amber-500 text-white px-2 py-1 rounded text-xs hover:bg-amber-600 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                                حساب / اختيار
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredQuotations.length === 0 && (
                            <tr><td colSpan={6} className="text-center p-6 text-gray-500">لا توجد عروض أسعار</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <AddQuotationModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveQuotation}
                    customers={customers}
                    products={products}
                    quotationToEdit={editingQuote}
                />
            )}

            <QuoteCalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
                quotation={calculatorQuote}
                onCreateFinal={handleCreateFinalFromCalculator}
            />
        </div>
    );
};

export default Quotations;
