import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { error } from 'console';

export interface ExportColumn<T = any> {
  header: string;
  key: string;
  formatter?: (value: any, row: T) => string;
}

export interface ExportOptions<T = any> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T>(options: ExportOptions<T>): void {
  const { data, columns, filename, title } = options;

  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key as keyof T];
      const formattedValue = col.formatter ? col.formatter(value, row) : String(value ?? '');
      return `"${formattedValue}"`;
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  toast.success('CSV exported successfully');
}

/**
 * Export data to Excel format
 */
export function exportToExcel<T>(options: ExportOptions<T>): void {
  const { data, columns, filename, title } = options;

  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key as keyof T];
      return col.formatter ? col.formatter(value, row) : String(value ?? '');
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, title || 'Report');
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
  
  toast.success('Excel exported successfully');
}

/**
 * Export data to PDF format (opens print dialog)
 */
export function exportToPDF<T>(options: ExportOptions<T>): void {
  const { data, columns, filename, title } = options;

  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key as keyof T];
      const formattedValue = col.formatter ? col.formatter(value, row) : String(value ?? '');
      return formattedValue;
    })
  );

  const content = `
    <html>
    <head>
      <title>${title || 'Report'}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <h1>${title || 'Report'}</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map(cell => `<td>${cell}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
    toast.success('PDF generated successfully');
  } else {
    toast.error('Failed to open print window');
  }
}

/**
 * Generic export handler that routes to the appropriate format
 */
export function exportData<T>(format: 'CSV' | 'Excel' | 'PDF', options: ExportOptions<T>): void {
  switch (format) {
    case 'CSV':
      exportToCSV(options);
      break;
    case 'Excel':
      exportToExcel(options);
      break;
    case 'PDF':
      exportToPDF(options);
      break;
    default:
      toast.error('Unsupported export format');
  }
}

// Import data from Excel file

export async function importFromExcel<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {type: 'binary'});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  })
}