// --- Quantity extraction helpers (delivery items only)
export const toUpper = (s) => (s || '').toString().trim().toUpperCase();

export const inferCodeFromItem = (it) => {
    // Prefer explicit codes if present
    const explicit =
        toUpper(it.productCode || it.code || it.shortCode || it.product?.code);
    const VALID = new Set(['SBS', 'DBS', 'SDC', 'QDC', 'DDC', 'PC', 'BT', 'HT', 'BM', 'BR']);
    if (VALID.has(explicit)) return explicit;

    // Fallback: infer from product name
    const name = toUpper(it.productName || it.product?.name);
    const has = (txt) => name.includes(txt);

    if (has('SBS') || has('SINGLE BED SHEET')) return 'SBS';
    if (has('DBS') || has('DOUBLE BED SHEET')) return 'DBS';
    if (has('SDC') || has('SINGLE DUVET COVER')) return 'SDC';
    if (has('QDC') || has('QUEEN DUVET COVER')) return 'QDC';
    if (has('DDC') || has('DOUBLE DUVET COVER')) return 'DDC';
    if (has('PC') || has('PILLOW COVER')) return 'PC';
    if (has('BT') || has('BATH TOWEL')) return 'BT';
    if (has('HT') || has('HAND TOWEL')) return 'HT';
    if (has('BM') || has('BATH MAT')) return 'BM';
    if (has('BR') || has('BATH ROBE')) return 'BR';
    return ''; // unknown = ignore
};

export const extractQty = (it, field = 'quantity') =>
    Number(it[field] || 0);

export const pickCounts = (order, field = 'quantity') => {
    const acc = { SBS: 0, DBS: 0, SDC: 0, QDC: 0, DDC: 0, PC: 0, BT: 0, HT: 0, BM: 0, BR: 0 };

    // 1) Delivery items from leasingOrderDetails (primary source)
    const deliveryItems = order?.leasingOrderDetails?.deliveryItems;
    if (Array.isArray(deliveryItems)) {
        deliveryItems.forEach((it) => {
            const code = inferCodeFromItem(it);
            // it[field] ?? 0 perfectly parses actualQuantity: 0 or quantity: 0
            if (code && Object.prototype.hasOwnProperty.call(acc, code)) acc[code] += Number(it[field] ?? 0);
        });
    }

    // 2) Fallbacks: sometimes items live in a generic array
    if (Array.isArray(order?.items)) {
        order.items.forEach((it) => {
            const code = inferCodeFromItem(it);
            if (code && Object.prototype.hasOwnProperty.call(acc, code)) acc[code] += Number(it[field] ?? 0);
        });
    }

    // 3) If a quantities object already uses codes (e.g., {SBS: 2, PC: 4}), add it
    // Only fallback for quantity (since actual quantities likely won't be represented here)
    if (order?.quantities && typeof order.quantities === 'object') {
        Object.entries(order.quantities).forEach(([k, v]) => {
            const kk = toUpper(k);
            if (field === 'quantity' && Object.prototype.hasOwnProperty.call(acc, kk)) acc[kk] += Number(v ?? 0);
        });
    }

    // 4) Edge: direct fields on order (SBS, DBS, ...)
    Object.keys(order || {}).forEach((k) => {
        const kk = toUpper(k);
        if (field === 'quantity' && Object.prototype.hasOwnProperty.call(acc, kk)) acc[kk] += Number(order[k] ?? 0);
    });

    return acc;
};
// --- Quantity extraction helpers 
export const pickPickupCounts = (order, field = 'actualQuantity') => {
    const acc = { SBS: 0, DBS: 0, SDC: 0, QDC: 0, DDC: 0, PC: 0, BT: 0, HT: 0, BM: 0, BR: 0 };

    const pickupItems = order?.leasingOrderDetails?.pickupItems;
    if (Array.isArray(pickupItems)) {
        pickupItems.forEach((it) => {
            const code = inferCodeFromItem(it);
            if (code && Object.prototype.hasOwnProperty.call(acc, code)) {
                acc[code] += Number(it[field] ?? 0);
            }
        });
    }

    return acc;
};
// Sort by date (deliveryDate preferred), then hotel
// Helpers to parse dates without timezone shifts and format as dd-mm-yyyy
export const extractYMD = (input) => {
    if (!input) return {};
    // If we have a string like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss[.sss][Z]
    if (typeof input === 'string') {
        const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const d = Number(m[3]);
            return { y, m: mo, d };
        }
        const dt = new Date(input);
        if (!Number.isNaN(dt)) {
            return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
        }
        return {};
    }
    // Date or timestamp
    const dt = new Date(input);
    if (!Number.isNaN(dt)) {
        return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    }
    return {};
};

export const formatDateDMY = (input) => {
    const { y, m, d } = extractYMD(input);
    if (!y) return '';
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${dd}-${mm}-${y}`;
};

export const utcTimeKey = (input) => {
    const { y, m, d } = extractYMD(input);
    if (!y) return 0;
    return Date.UTC(y, (m || 1) - 1, d || 1);
};

export const sortSafe = (d) => utcTimeKey(d);
