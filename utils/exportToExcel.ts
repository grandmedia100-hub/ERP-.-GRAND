import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
        alert('لا توجد بيانات لتصديرها');
        return;
    }

    // Convert array of objects to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // set column width (optional, basic auto-width)
    const colWidths = Object.keys(data[0]).map(() => ({ wch: 15 }));
    worksheet['!cols'] = colWidths;

    // Create workbook and append worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
