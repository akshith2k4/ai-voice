const PRODUCT_MAPPINGS = {
  "1B": {
    productId: 100100,
    productName: "SINGLE BED SHEET",
    productCode: "HSN-1",
  },
  "2B": {
    productId: 100105,
    productName: "DOUBLE BED SHEET",
    productCode: "HSN-6",
  },
  "1D": {
    productId: 100106,
    productName: "SINGLE DUVET COVER",
    productCode: "HSN-7",
  },
  "3D": {
    productId: 100107,
    productName: "DOUBLE DUVET COVER",
    productCode: "HSN-8",
  },
  BB: {
    productId: 100102,
    productName: "BATH TOWEL",
    productCode: "HSN-3",
  },
};

// Sorted by length descending so longer prefixes match first
const SORTED_PREFIXES = Object.keys(PRODUCT_MAPPINGS).sort(
  (a, b) => b.length - a.length
);

export function parseTags(input) {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

export function resolvePrefix(tag) {
  for (const prefix of SORTED_PREFIXES) {
    if (tag.startsWith(prefix)) {
      return { prefix, product: PRODUCT_MAPPINGS[prefix] };
    }
  }
  return null;
}

export function validateTag(tag) {
  const resolved = resolvePrefix(tag);
  if (!resolved) {
    return { valid: false, error: `Unknown prefix for tag: ${tag}` };
  }

  const suffix = tag.slice(resolved.prefix.length);
  if (!suffix || !/^\d+$/.test(suffix)) {
    return { valid: false, error: `Invalid inventory item id in tag: ${tag}` };
  }

  return {
    valid: true,
    tag,
    inventoryItemId: Number(suffix),
    ...resolved.product,
  };
}

function randomRssi() {
  return Math.floor(Math.random() * 51) - 80; // -80 to -30
}

function formatTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function buildPayload(validItems) {
  const scannedAt = formatTimestamp();
  return {
    readerId: "RFID-BIN-YPR-01",
    scannedTags: validItems.map((item) => ({
      rfidTag: item.tag,
      inventoryItemId: item.inventoryItemId,
      scannedAt,
      rssi: randomRssi(),
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
    })),
  };
}
