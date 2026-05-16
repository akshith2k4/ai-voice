import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { saveAs } from 'file-saver';
import { sortSafe } from './workReport/helpers';
import { populateSheet1 } from './workReport/sheet1';
import { populateSheet2 } from './workReport/sheet2';

export async function downloadWorkReportXLSX(orders, fileName = 'work-report.xlsx') {
  const wb = new ExcelJS.Workbook();
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Sort by orderDate (preferred), then fallback to createdAt, then deliveryDate
  const data = [...safeOrders].sort((a, b) => {
    const ad = sortSafe(a?.orderDate || a?.createdAt || a?.leasingOrderDetails?.deliveryDate);
    const bd = sortSafe(b?.orderDate || b?.createdAt || b?.leasingOrderDetails?.deliveryDate);
    if (ad !== bd) return ad - bd;
    const ah = (a.hotelName || a.customerName || a.customer?.name || '').toUpperCase();
    const bh = (b.hotelName || b.customerName || b.customer?.name || '').toUpperCase();
    return ah.localeCompare(bh);
  });

  const ws1 = wb.addWorksheet('Work Report', {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, printTitlesRow: '1:2' }
  });
  populateSheet1(ws1, data);

  const ws2 = wb.addWorksheet('Delivery Request vs Actual Delivered', {
    properties: { defaultRowHeight: 18 },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, printTitlesRow: '1:2' }
  });
  populateSheet2(ws2, data);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName
  );
}
