import { formatDateDMY, pickCounts, pickPickupCounts } from './helpers';

export function populateSheet2(ws, data) {
    const COLS = [
        { header: 'SNo.', key: '_sno', width: 6 },
        { header: 'Ordered Date', key: '_orderedDate', width: 14 },
        { header: 'Delivered Date', key: '_deliveredDate', width: 14 },
        { header: 'Hotel', key: 'hotel', width: 32 },
        // Delivery Request Quantities
        { header: '', key: 'req_SBS', width: 6 },
        { header: '', key: 'req_DBS', width: 6 },
        { header: '', key: 'req_SDC', width: 6 },
        { header: '', key: 'req_QDC', width: 6 },
        { header: '', key: 'req_DDC', width: 6 },
        { header: '', key: 'req_PC', width: 6 },
        { header: '', key: 'req_BT', width: 6 },
        { header: '', key: 'req_HT', width: 6 },
        { header: '', key: 'req_BM', width: 6 },
        { header: '', key: 'req_BR', width: 6 },
        // Spacer
        { header: '', key: 'spacer', width: 2 },
        // Actual Delivered Quantities
        { header: '', key: 'act_SBS', width: 6 },
        { header: '', key: 'act_DBS', width: 6 },
        { header: '', key: 'act_SDC', width: 6 },
        { header: '', key: 'act_QDC', width: 6 },
        { header: '', key: 'act_DDC', width: 6 },
        { header: '', key: 'act_PC', width: 6 },
        { header: '', key: 'act_BT', width: 6 },
        { header: '', key: 'act_HT', width: 6 },
        { header: '', key: 'act_BM', width: 6 },
        { header: '', key: 'act_BR', width: 6 },
        //spacer
        { header: '', key: 'spacer', width: 2 },
        // Pickup Quantities
        
        { header: '', key: 'pick_SBS', width: 6 },
        { header: '', key: 'pick_DBS', width: 6 },
        { header: '', key: 'pick_SDC', width: 6 },
        { header: '', key: 'pick_QDC', width: 6 },
        { header: '', key: 'pick_DDC', width: 6 },
        { header: '', key: 'pick_PC', width: 6 },
        { header: '', key: 'pick_BT', width: 6 },
        { header: '', key: 'pick_HT', width: 6 },
        { header: '', key: 'pick_BM', width: 6 },
        { header: '', key: 'pick_BR', width: 6 },
    ];
    ws.columns = COLS;

    // ---------------- Header layout & styling ----------------
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    const headerFont = { bold: true };
    const borderThin = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    const headerRow1 = ws.getRow(1);
    const headerRow2 = ws.getRow(2);
    headerRow1.height = 24;
    headerRow2.height = 20;

    // Clear pre-filled
    for (let c = 1; c <= 36; c++) {
        ws.getCell(1, c).value = null;
        ws.getCell(2, c).value = null;
    }

    // 1. SNo, Date, Hotel (Vertically merge rows 1..2)
        const mainHeaders = ['SNo.', 'Ordered Date', 'Delivered Date', 'Hotel'];
        for (let c = 1; c <= 4; c++) {
        const cell = ws.getCell(1, c);
        cell.value = mainHeaders[c - 1];
        cell.alignment = { vertical: 'middle', horizontal: c === 4 ? 'left' : 'center' };
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.border = borderThin;
        ws.mergeCells(1, c, 2, c);
    }

    // 2. Spacer Column (Vertically merge row 1..2 at col 15)
    ws.mergeCells(1, 15, 2, 15);
    ws.mergeCells(1, 26, 2, 26);

    // 3. Delivery Request Header Group (Cols 5..14)
    ws.getCell(1, 5).value = 'DELIVERY REQUEST';
    ws.mergeCells(1, 5, 1, 14);
    const reqTitle = ws.getCell(1, 5);
    reqTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    reqTitle.font = headerFont;
    reqTitle.fill = headerFill;
    reqTitle.border = borderThin;

    // 4. Actual Delivered Header Group (Cols 16..25)
    ws.getCell(1, 16).value = 'ACTUAL DELIVERED';
    ws.mergeCells(1, 16, 1, 25);
    const actTitle = ws.getCell(1, 16);
    actTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    actTitle.font = headerFont;
    actTitle.fill = headerFill;
    actTitle.border = borderThin;
    
    //Pickup 
    // 5. Pickup Header Group (Cols 27..36)
    ws.getCell(1, 27).value = 'PICKUP';
    ws.mergeCells(1, 27, 1, 36);
    const pickTitle = ws.getCell(1, 27);
    pickTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    pickTitle.font = headerFont;
    pickTitle.fill = headerFill;
    pickTitle.border = borderThin;

    // 5. Product Sub-Headers Row 2 (Cols 4..13 and Cols 15..24)
    const productHeaders = ['SBS', 'DBS', 'SDC', 'QDC', 'DDC', 'PC', 'BT', 'HT', 'BM', 'BR'];
    for (let i = 0; i < productHeaders.length; i++) {
        // Request group
        const reqCell = ws.getCell(2, 5 + i);
        reqCell.value = productHeaders[i];
        reqCell.alignment = { vertical: 'middle', horizontal: 'center' };
        reqCell.font = headerFont;
        reqCell.fill = headerFill;
        reqCell.border = borderThin;

        // Actual group
        const actCell = ws.getCell(2, 16 + i);
        actCell.value = productHeaders[i];
        actCell.alignment = { vertical: 'middle', horizontal: 'center' };
        actCell.font = headerFont;
        actCell.fill = headerFill;
        actCell.border = borderThin;

        const pickCell = ws.getCell(2, 27 + i);
        pickCell.value = productHeaders[i];
        pickCell.alignment = { vertical: 'middle', horizontal: 'center' };
        pickCell.font = headerFont;
        pickCell.fill = headerFill;
        pickCell.border = borderThin;
    }

    let idx = 0;
    const zebraFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F8F8' } };
    for (const o of data) {
        idx += 1;

        // Show Order Date on the report to align with the search filter date
       const orderedDate = formatDateDMY(o?.orderDate);
const deliveredDate = formatDateDMY(
    o?.leasingOrderDetails?.deliveryDate
);

        const hotel = o.hotelName || o.customerName || o.customer?.name || o.clientName || o.accountName || '—';

        // Pick request quantities and actual quantities separately
        const reqCounts = pickCounts(o, 'quantity');
        const actCounts = pickCounts(o, 'actualQuantity');
        const pickupCounts = pickPickupCounts(o, 'actualQuantity');

        const row = ws.addRow([
           idx, orderedDate, deliveredDate, hotel,
            reqCounts.SBS, reqCounts.DBS, reqCounts.SDC, reqCounts.QDC, reqCounts.DDC, reqCounts.PC, reqCounts.BT, reqCounts.HT, reqCounts.BM, reqCounts.BR,
            '', // spacer column 15
            actCounts.SBS, actCounts.DBS, actCounts.SDC, actCounts.QDC, actCounts.DDC, actCounts.PC, actCounts.BT, actCounts.HT, actCounts.BM, actCounts.BR,
             '', // spacer 26
            pickupCounts.SBS, pickupCounts.DBS, pickupCounts.SDC, pickupCounts.QDC, pickupCounts.DDC, pickupCounts.PC, pickupCounts.BT, pickupCounts.HT, pickupCounts.BM, pickupCounts.BR
        ]);

        // Apply styles to newly added row cells
        row.eachCell((cell, col) => {
            if (col === 15 || col==26) {
                // Leave spacer empty without border
            } else {
                const isNumberCol =(col >= 5 && col <= 14) ||(col >= 16 && col <= 25) ||(col >= 27 && col <= 36);
                cell.alignment = { vertical: 'middle', horizontal: isNumberCol ? 'center' : (col === 4 ? 'left' : 'center') };
                cell.border = borderThin;
            }
        });

        row.height = 18;
        // Zebra striping
        if (idx % 2 === 0) {
            row.eachCell((cell, col) => {
                if (col !== 15 && col !== 26) {
                    cell.fill = zebraFill;
                }
            });
        }
    }

    // Freeze header (2 rows) and add AutoFilter on header row 2 (spans everything, skip filtering heavily on spacer if possible)
    ws.views = [{ state: 'frozen', ySplit: 2 }];
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 36 } };

    // Totals row (sum numeric product columns)
    const firstDataRow = 3;
    const lastDataRow = ws.lastRow?.number || 2;
    if (lastDataRow >= firstDataRow) {
        const totalRow = ws.addRow(new Array(36).fill(''));
        const totalRowNumber = totalRow.number;

        // Label
        ws.getCell(totalRowNumber, 3).value = 'TOTAL';
        ws.getCell(totalRowNumber, 3).font = { bold: true };

        // Sums for 4..13 and 15..24
        for (let c = 5; c <= 36; c++) {
            if (c === 15 || c==26) continue; // skip spacer!

            const colLetter = ws.getColumn(c).letter;
            ws.getCell(totalRowNumber, c).value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
            ws.getCell(totalRowNumber, c).font = { bold: true };
            ws.getCell(totalRowNumber, c).alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Style total row borders and fill
        const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        const tr = ws.getRow(totalRowNumber);
        tr.eachCell((cell, col) => {
            if (col !== 15 && col!==26) {
                cell.fill = totalFill;
                cell.border = borderThin;
            }
        });
    }
}
