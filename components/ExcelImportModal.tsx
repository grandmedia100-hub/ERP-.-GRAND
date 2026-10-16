import React, { useState, useRef } from 'react';

export type ImportType = 'products' | 'customers' | 'suppliers';

interface ExcelImportModalProps {
  importType: ImportType;
  onClose: () => void;
  onImport: (rows: any[]) => void;
}

// =========== Column Definitions ===========
const COLUMNS: Record<ImportType, { key: string; label: string; required?: boolean }[]> = {
  products: [
    { key: 'name', label: 'اسم الصنف', required: true },
    { key: 'unit', label: 'الوحدة', required: true },
    { key: 'productType', label: 'نوع الصنف' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'costPrice', label: 'سعر التكلفة' },
    { key: 'salePrice', label: 'سعر البيع' },
    { key: 'lowStockThreshold', label: 'حد التنبيه' },
    { key: 'category', label: 'التصنيف' },
    { key: 'barcode', label: 'الباركود' },
  ],
  customers: [
    { key: 'name', label: 'اسم المسؤول', required: true },
    { key: 'companyName', label: 'اسم الشركة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'address', label: 'العنوان' },
    { key: 'taxNumber', label: 'الرقم الضريبي' },
    { key: 'openingBalance', label: 'الرصيد الافتتاحي' },
  ],
  suppliers: [
    { key: 'name', label: 'اسم المسؤول', required: true },
    { key: 'companyName', label: 'اسم الشركة' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'address', label: 'العنوان' },
    { key: 'taxNumber', label: 'الرقم الضريبي' },
    { key: 'openingBalance', label: 'الرصيد الافتتاحي' },
  ],
};

const TITLE: Record<ImportType, string> = {
  products: 'استيراد الأصناف من Excel',
  customers: 'استيراد العملاء من Excel',
  suppliers: 'استيراد الموردين من Excel',
};

// =========== CSV Parser (handles commas inside quotes) ===========
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  // Remove BOM if present
  const cleanText = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const lines = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length === 0) return [];
  
  // Auto-detect delimiter from the first line
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === delimiter && !inQuote) {
        cells.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

// =========== Download Template ===========
function downloadTemplate(type: ImportType) {
  const cols = COLUMNS[type];
  const header = cols.map(c => c.label).join(',');
  const example: Record<string, string> = {
    'اسم الصنف': 'ورق A4', 'الوحدة': 'رزمة', 'نوع الصنف': 'خامة', 'الكمية': '100',
    'سعر التكلفة': '50', 'سعر البيع': '70', 'حد التنبيه': '10',
    'التصنيف': 'مستلزمات مكتبية', 'الباركود': '',
    'اسم المسؤول': 'أحمد محمد', 'اسم الشركة': 'شركة النور',
    'الهاتف': '01012345678', 'البريد الإلكتروني': 'info@company.com',
    'العنوان': 'القاهرة', 'الرقم الضريبي': '123456789',
    'الرصيد الافتتاحي': '0',
  };
  const exampleRow = cols.map(c => example[c.label] || '').join(',');
  const csv = `\uFEFF${header}\n${exampleRow}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `template_${type}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// =========== Main Modal ===========
const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ importType, onClose, onImport }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cols = COLUMNS[importType];

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) { setErrors(['الملف فارغ أو لا يحتوي على بيانات']); return; }

      const header = rows[0];
      // Map header labels to keys
      const colMap: Record<number, string> = {};
      cols.forEach(col => {
        const idx = header.findIndex(h => h.trim() === col.label);
        if (idx !== -1) colMap[idx] = col.key;
      });

      const errs: string[] = [];
      const parsed: any[] = [];

      rows.slice(1).forEach((row, rowIdx) => {
        if (row.every(c => !c)) return; // skip empty rows
        const obj: any = { id: `${importType.charAt(0).toUpperCase()}-IMP-${Date.now()}-${rowIdx}` };
        Object.entries(colMap).forEach(([idxStr, key]) => {
          const val = row[parseInt(idxStr)] || '';
          // Numeric fields
          if (['quantity', 'costPrice', 'salePrice', 'lowStockThreshold', 'openingBalance'].includes(key)) {
            obj[key] = parseFloat(val) || 0;
          } else {
            obj[key] = val;
          }
        });
        // Validate required
        const missing = cols.filter(c => c.required && !obj[c.key]);
        if (missing.length) {
          errs.push(`الصف ${rowIdx + 2}: الحقل "${missing.map(m => m.label).join('، ')}" مطلوب`);
        } else {
          parsed.push(obj);
        }
      });

      setErrors(errs);
      setParsedRows(parsed);
      if (parsed.length > 0) setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = () => {
    onImport(parsedRows);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <h2 className="text-xl font-bold text-white">{TITLE[importType]}</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-emerald-200 text-2xl font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2">
                <p className="font-bold text-base">📋 تعليمات الاستيراد:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>قم بتحميل الملف النموذجي (Template) أولاً</li>
                  <li>قم بملء البيانات في الملف مع الاحتفاظ بترتيب الأعمدة</li>
                  <li>احفظ الملف بصيغة CSV واسحبه إلى المنطقة أدناه</li>
                  <li>سيتم استعراض البيانات قبل الحفظ النهائي</li>
                </ol>
              </div>

              {/* Columns */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-bold text-gray-700 mb-3">الأعمدة المتاحة:</p>
                <div className="flex flex-wrap gap-2">
                  {cols.map(col => (
                    <span key={col.key} className={`px-3 py-1 rounded-full text-xs font-semibold ${col.required ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'}`}>
                      {col.label}{col.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-red-500 mt-2">* الحقول المطلوبة</p>
              </div>

              {/* Download template */}
              <button
                onClick={() => downloadTemplate(importType)}
                className="w-full flex items-center justify-center gap-3 p-3 border-2 border-dashed border-emerald-400 rounded-xl text-emerald-700 font-bold hover:bg-emerald-50 transition-colors"
              >
                <span className="text-2xl">⬇️</span>
                تحميل الملف النموذجي (Template CSV)
              </button>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all"
              >
                <div className="text-5xl mb-3">📁</div>
                <p className="text-gray-700 font-bold text-lg">اسحب ملف CSV هنا أو انقر للاختيار</p>
                <p className="text-gray-400 text-sm mt-1">يدعم ملفات CSV و TXT</p>
                {fileName && <p className="mt-3 text-emerald-700 font-semibold">✅ {fileName}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  <p className="font-bold text-red-700 mb-2">⚠️ أخطاء في الملف:</p>
                  {errors.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-lg">معاينة البيانات</p>
                  <p className="text-sm text-gray-500">تم تحليل <span className="font-bold text-emerald-700">{parsedRows.length}</span> سجل بنجاح{errors.length > 0 ? ` (${errors.length} صفوف بها أخطاء تم تجاهلها)` : ''}</p>
                </div>
                <button onClick={() => setStep('upload')} className="text-sm text-blue-600 hover:underline">← تغيير الملف</button>
              </div>

              {errors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
                  ⚠️ {errors.length} صفوف تم تجاهلها بسبب بيانات ناقصة
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-100 max-h-80">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-gray-600">#</th>
                      {cols.map(col => <th key={col.key} className="p-3 text-gray-600 whitespace-nowrap">{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-400">{idx + 1}</td>
                        {cols.map(col => (
                          <td key={col.key} className="p-3 text-gray-700 whitespace-nowrap">
                            {row[col.key] !== undefined && row[col.key] !== '' ? String(row[col.key]) : <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 50 && (
                  <p className="p-3 text-center text-gray-400 text-sm">يظهر أول 50 سجل. سيتم استيراد {parsedRows.length} سجل.</p>
                )}
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-10">
              <div className="text-7xl mb-4">✅</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">تم الاستيراد بنجاح!</h3>
              <p className="text-gray-500 text-lg">تم إضافة <span className="font-bold text-emerald-700">{parsedRows.length}</span> سجل إلى النظام</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-2xl">
          {step === 'upload' && (
            <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold">إغلاق</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold">رجوع</button>
              <button onClick={handleConfirm} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm flex items-center gap-2">
                <span>📥</span> تأكيد الاستيراد ({parsedRows.length} سجل)
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-sm">إغلاق</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
