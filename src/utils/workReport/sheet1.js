import { formatDateDMY, pickCounts } from './helpers';

export function populateSheet1(ws, data) {
    const COLS = [
        { header: 'SNo.', key: '_sno', width: 6 },
        { header: 'Date', key: '_date', width: 12 },
        { header: 'Hotel', key: 'hotel', width: 32 },
        { header: 'SBS', key: 'SBS', width: 6 },
        { header: 'DBS', key: 'DBS', width: 6 },
        { header: 'SDC', key: 'SDC', width: 6 },
        { header: 'QDC', key: 'QDC', width: 6 },
        { header: 'DDC', key: 'DDC', width: 6 },
        { header: 'PC', key: 'PC', width: 6 },
        { header: 'BT', key: 'BT', width: 6 },
        { header: 'HT', key: 'HT', width: 6 },
        { header: 'BM', key: 'BM', width: 6 },
        { header: 'BR', key: 'BR', width: 6 },
        { header: 'REMARKS', key: 'remarks', width: 22 },
        // 10 BAGS columns (sub-headers will be set on row 2)
        { header: '', key: 'bag1', width: 6 },
        { header: '', key: 'bag2', width: 6 },
        { header: '', key: 'bag3', width: 6 },
        { header: '', key: 'bag4', width: 6 },
        { header: '', key: 'bag5', width: 6 },
        { header: '', key: 'bag6', width: 6 },
        { header: '', key: 'bag7', width: 6 },
        { header: '', key: 'bag8', width: 6 },
        { header: '', key: 'bag9', width: 6 },
        { header: '', key: 'bag10', width: 6 },
    ];
    ws.columns = COLS;

    // ---------------- Header layout & styling ----------------
    // Styles
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    const headerFont = { bold: true };
    const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Header row 1 (already created by ws.columns) and header row 2
    const headerRow1 = ws.getRow(1);
    const headerRow2 = ws.getRow(2);
    headerRow1.height = 24;
    headerRow2.height = 20;

    // Clear any pre-filled header values in O1..X1 (cols 16..24) before merging for BAGS group
    for (let c = 16; c <= 24; c++) {
        ws.getCell(1, c).value = null;
    }

    // Vertically merge simple headers (A..N and O for REMARKS is column 14)
    for (let c = 1; c <= 14; c++) {
        // Ensure header styles on row 1
        const cell1 = ws.getCell(1, c);
        cell1.alignment = { vertical: 'middle', horizontal: c === 3 ? 'left' : 'center' };
        cell1.font = headerFont;
        cell1.fill = headerFill;
        cell1.border = borderThin;
        // Merge row 1..2 for this column
        ws.mergeCells(1, c, 2, c);
    }

    // BAGS group (cols 15..24). Set group title on row 1 and subheaders 1..10 on row 2
    ws.getCell(1, 15).value = 'BAGS';
    ws.mergeCells(1, 15, 1, 24);
    const bagsTitle = ws.getCell(1, 15);
    bagsTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    bagsTitle.font = headerFont;
    bagsTitle.fill = headerFill;
    bagsTitle.border = borderThin;

    for (let c = 15; c <= 24; c++) {
        const subIdx = c - 14; // 1..10
        const cell = ws.getCell(2, c);
        cell.value = String(subIdx);
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderThin;
    }

    let idx = 0;
    const zebraFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
    for (const o of data) {
        idx += 1;

        // Show Order Date on the report to align with the search filter date
        const rawOrder = o?.orderDate || '';
        const rawDelivery = o?.leasingOrderDetails?.deliveryDate || '';
        const chosen = rawOrder || o.createdAt || rawDelivery || '';
        const dateStr = formatDateDMY(chosen) || '';

        const hotel = o.hotelName || o.customerName || o.customer?.name || o.clientName || o.accountName || '—';
        const c = pickCounts(o);

        const row = ws.addRow([
            idx, dateStr, hotel,
            c.SBS, c.DBS, c.SDC, c.QDC, c.DDC, c.PC, c.BT, c.HT, c.BM, c.BR,
            o.remarks || o.notes || '',
            '', '', '', '', '', '', '', '', '', '' // 10 bag cells
        ]);

        row.eachCell((cell, col) => {
            const isNumberCol = col >= 4 && col <= 13;
            cell.alignment = { vertical: 'middle', horizontal: isNumberCol ? 'center' : (col === 3 ? 'left' : 'center') };
            cell.border = borderThin;
        });
        row.height = 18;
        // Zebra striping
        if (idx % 2 === 0) {
            row.eachCell((cell) => { cell.fill = zebraFill; });
        }
    }

    // Freeze header (2 rows) and add AutoFilter on header row 2
    ws.views = [{ state: 'frozen', ySplit: 2 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 24 } };

    // Totals row (sum numeric product columns only: 4..13)
    const firstDataRow = 3;
    const lastDataRow = ws.lastRow?.number || 2;
    if (lastDataRow >= firstDataRow) {
        const totalRow = ws.addRow(new Array(24).fill(''));
        const totalRowNumber = totalRow.number;
        // Label
        ws.getCell(totalRowNumber, 3).value = 'TOTAL';
        ws.getCell(totalRowNumber, 3).font = { bold: true };
        // Sums for 4..13
        for (let c = 4; c <= 13; c++) {
            const colLetter = ws.getColumn(c).letter;
            ws.getCell(totalRowNumber, c).value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
            ws.getCell(totalRowNumber, c).font = { bold: true };
            ws.getCell(totalRowNumber, c).alignment = { vertical: 'middle', horizontal: 'center' };
        }
        // Style total row borders and fill
        const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        const tr = ws.getRow(totalRowNumber);
        tr.eachCell((cell) => {
            cell.fill = totalFill;
            cell.border = borderThin;
        });
    }
}
