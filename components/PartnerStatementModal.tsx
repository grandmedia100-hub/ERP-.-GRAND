
import React, { useState, useMemo, useEffect } from 'react';
import type { Partner, PartnerTransaction, CompanyInfo } from '../types.ts';

interface PartnerStatementModalProps {
  onClose: () => void;
  partners: Partner[];
  transactions: PartnerTransaction[];
}

const PartnerStatementModal: React.FC<PartnerStatementModalProps> = ({ onClose, partners, transactions }) => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const statementData = useMemo(() => {
    if (!selectedPartnerId) return null;
    const partner = partners.find(c => c.id === selectedPartnerId);
    if (!partner) return null;

    const partnerTransactions = transactions.filter(inv => inv.partnerId === selectedPartnerId && inv.status !== 'voided');

    // For partners: Deposit is credit (for them), Withdrawal is debit (from them)
    const allTransactions = partnerTransactions.map(t => ({
      date: t.date,
      type: t.type,
      description: t.description,
      debit: t.type === 'سحب' ? t.amount : 0,
      credit: t.type === 'إيداع' ? t.amount : 0
    }));

    const balanceBeforePeriod = allTransactions
      .filter(t => new Date(t.date) < new Date(startDate))
      .reduce((balance, t) => balance - t.debit + t.credit, partner.openingBalance);

    const transactionsInPeriod = allTransactions
      .filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = balanceBeforePeriod;
    const processedTransactions = transactionsInPeriod.map(t => {
      runningBalance = runningBalance - t.debit + t.credit;
      return { ...t, balance: runningBalance };
    });

    return {
      partner,
      transactions: processedTransactions,
      balanceBeforePeriod,
      closingBalance: runningBalance
    };

  }, [selectedPartnerId, partners, transactions, startDate, endDate]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handlePrint = () => {
    if (!statementData) return;

    const companyInfoString = localStorage.getItem('companyInfo');
    const companyInfo: CompanyInfo = companyInfoString
      ? JSON.parse(companyInfoString)
      : { name: 'شركتك', address: 'عنوانك', phone: 'هاتفك', logo: '' };

    const printContent = `
          <html>
            <head>
              <title>كشف حساب شريك - ${statementData.partner.name}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                body { font-family: 'Cairo', sans-serif; direction: rtl; margin: 0; padding: 20px; background-color: #fff; }
                .statement-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .05); font-size: 16px; line-height: 24px; color: #333; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #8B5CF6; }
                .company-details { text-align: right; }
                .company-details h1 { font-size: 1.8em; margin: 0; color: #8B5CF6; }
                .company-logo img { max-width: 120px; max-height: 80px; }
                .statement-info { margin-bottom: 20px; }
                .statement-info div { margin-bottom: 5px; }
                table { width: 100%; line-height: inherit; text-align: right; border-collapse: collapse; }
                table td, table th { padding: 10px; vertical-align: top; }
                table th { background-color: #f2f7ff; font-weight: bold; border-bottom: 2px solid #ddd; }
                table tbody tr { border-bottom: 1px solid #eee; }
                .balance-row { background-color: #f9f9f9; font-weight: bold; }
                .closing-balance-row { background-color: #e9f5ff; font-weight: bold; border-top: 2px solid #8B5CF6; }
              </style>
            </head>
            <body>
              <div class="statement-box">
                <div class="header">
                  <div class="company-logo">
                    ${companyInfo.logo ? `<img src="${companyInfo.logo}" alt="Company Logo">` : ''}
                  </div>
                  <div class="company-details">
                    <h1>${companyInfo.name}</h1>
                    <p>${companyInfo.address}<br>${companyInfo.phone}</p>
                  </div>
                </div>
                <h2>كشف حساب شريك</h2>
                <div class="statement-info">
                    <div><strong>الشريك:</strong> ${statementData.partner.name}</div>
                    <div><strong>الفترة:</strong> من ${startDate} إلى ${endDate}</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>البيان</th>
                      <th>مدين (مسحوبات)</th>
                      <th>دائن (إيداعات)</th>
                      <th>الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="balance-row">
                      <td colspan="4">رصيد الفترة السابقة</td>
                      <td>${statementData.balanceBeforePeriod.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                    ${statementData.transactions.map(t => `
                      <tr>
                        <td>${t.date}</td>
                        <td>${t.description}</td>
                        <td>${t.debit > 0 ? t.debit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : ''}</td>
                        <td>${t.credit > 0 ? t.credit.toLocaleString('en-US', { style: 'currency', currency: 'EGP' }) : ''}</td>
                        <td>${t.balance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                      </tr>
                    `).join('')}
                    <tr class="closing-balance-row">
                      <td colspan="4">الرصيد الختامي</td>
                      <td>${statementData.closingBalance.toLocaleString('en-US', { style: 'currency', currency: 'EGP' })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </body>
          </html>
        `;

    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 p-4"
      aria-modal="true" role="dialog" onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">كشف حساب شريك</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 no-print">
            <div className="md:col-span-1">
              <label htmlFor="partner-select" className="block text-sm font-medium text-gray-700 mb-1">الشريك:</label>
              <select id="partner-select" value={selectedPartnerId} onChange={e => setSelectedPartnerId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm">
                <option value="">-- اختر شريك --</option>
                {partners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">من تاريخ:</label>
              <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ:</label>
              <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
            </div>
          </div>

          {statementData && (
            <div>
              <div className="p-4 bg-gray-50 rounded-lg mb-4 text-center">
                <h3 className="text-lg font-bold">{statementData.partner.name}</h3>
                <p>كشف حساب عن الفترة من {startDate} إلى {endDate}</p>
              </div>
              <table className="w-full text-right">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                    <th className="p-3 text-sm font-semibold tracking-wide">البيان</th>
                    <th className="p-3 text-sm font-semibold tracking-wide">مدين (مسحوبات)</th>
                    <th className="p-3 text-sm font-semibold tracking-wide">دائن (إيداعات)</th>
                    <th className="p-3 text-sm font-semibold tracking-wide">الرصيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td colSpan={4} className="p-3 text-sm text-gray-700 font-semibold">رصيد الفترة السابقة</td>
                    <td className="p-3 text-sm text-gray-700 font-bold">{statementData.balanceBeforePeriod.toLocaleString('en-US')} ج.م</td>
                  </tr>
                  {statementData.transactions.map((t, index) => (
                    <tr key={index}>
                      <td className="p-3 text-sm text-gray-700" style={{ direction: 'ltr', textAlign: 'right' }}>{t.date}</td>
                      <td className="p-3 text-sm text-gray-700">{t.description}</td>
                      <td className="p-3 text-sm text-red-600">{t.debit > 0 ? t.debit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                      <td className="p-3 text-sm text-green-600">{t.credit > 0 ? t.credit.toLocaleString('en-US') + ' ج.م' : ''}</td>
                      <td className="p-3 text-sm text-gray-700 font-bold">{t.balance.toLocaleString('en-US')} ج.م</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold border-t-2">
                    <td colSpan={4} className="p-3 text-sm">الرصيد الختامي</td>
                    <td className="p-3 text-sm">{statementData.closingBalance.toLocaleString('en-US')} ج.م</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-2 space-x-reverse rounded-b-lg no-print">
          <button onClick={onClose} className="bg-white text-gray-700 font-bold py-2 px-4 rounded-lg border hover:bg-gray-100">إغلاق</button>
          {statementData && <button onClick={handlePrint} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">طباعة</button>}
        </div>
      </div>
    </div>
  );
};
export default PartnerStatementModal;