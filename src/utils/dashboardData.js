import { startOfDay, endOfDay } from "date-fns";
import { orderService } from "../services/orderService.jsx";
import tripService from "../services/tripService.jsx";
import { washFulfillmentService } from "../services/washFulfillmentService.jsx";
import { washRequestService } from "../services/washRequestService.jsx";

/**
 * If your backend expects local IST instead of UTC, switch to new Date()
 * without toISOString() and/or send timezone explicitly.
 */
function getTodayRangeISO() {
  const now = new Date();
  return {
    start: startOfDay(now).toISOString(),
    end: endOfDay(now).toISOString(),
  };
}

/** Helper: safe array */
const A = (x) => (Array.isArray(x) ? x : []);

/**
 * Product category codes to show on charts (in desired order):
 * SBS (Single Bed Sheet), DBS (Double Bed Sheet), SDC (Single Duvet Cover),
 * DDC (Double Duvet Cover), PC (Pillow Cover), BT (Bath Towel),
 * HT (Hand Towel), BM (Bath Mat), BR (Bath Robe)
 */
const CATEGORY_CODES = [
  "SBS",
  "DBS",
  "SDC",
  "QDC",
  "DDC",
  "PC",
  "BT",
  "HT",
  "BM",
  "BR",
  "PHT",
  "PBT",
  "BBT",
  "BHT",
  "BPC",
];

/**
 * Extract our dashboard category code from product name/code.
 * Returns one of CATEGORY_CODES or null to ignore unknowns.
 */
function getCategoryCodeFromItem(item) {
  const name =
    item?.productName ||
    item?.product?.name ||
    item?.name ||
    "";
  const code = (item?.product?.code || item?.code || "").toUpperCase();

  const n = String(name).trim().toUpperCase();

  // Name-based mapping
  if (/(^|\s)SINGLE\s+BED\s+SHEET/.test(n)) return "SBS";
  if (/(^|\s)DOUBLE\s+BED\s+SHEET/.test(n)) return "DBS";
  if (/(^|\s)SINGLE\s+DUVET\s+COVER/.test(n)) return "SDC";
  if (/(^|\s)QUEEN\s+DUVET\s+COVER/.test(n)) return "QDC";
  if (/(^|\s)DOUBLE\s+DUVET\s+COVER/.test(n)) return "DDC";
  if (/(^|\s)PILLOW\s+COVER/.test(n)) return "PC";
  if (/(^|\s)BATH\s+TOWEL/.test(n)) return "BT";
  if (/(^|\s)HAND\s+TOWEL/.test(n)) return "HT";
  if (/(^|\s)BATH\s+MAT/.test(n)) return "BM";
  if (/(^|\s)BATH\s+ROBE/.test(n)) return "BR";
  if (/(^|\s)POOL\s+HAND\s+TOWEL/.test(n)) return "PHT";
  if (/(^|\s)POOL\s+BATH\s+TOWEL/.test(n)) return "PBT";
  if (/(^|\s)BLUE\s+BATH\s+TOWEL/.test(n)) return "BBT";
  if (/(^|\s)BLUE\s+HAND\s+TOWEL/.test(n)) return "BHT";
  if (/(^|\s)BIG\s+PILLOW\s+COVER/.test(n)) return "BPC";
  
  // Optional code-based hints (if you ever encode it there)
  if (code === "SBS") return "SBS";
  if (code === "DBS") return "DBS";
  if (code === "SDC") return "SDC";
  if (code === "QDC") return "QDC";
  if (code === "DDC") return "DDC";
  if (code === "PC") return "PC";
  if (code === "BT") return "BT";
  if (code === "HT") return "HT";
  if (code === "BM") return "BM";
  if (code === "BR") return "BR";
  if (code === "PHT") return "PHT";
  if (code === "PBT") return "PBT";
  if (code === "BBT") return "BBT";
  if (code === "BHT") return "BHT";
  if (code === "BPC") return "BPC";

  return null; // Ignore items we don't chart (e.g., QDC)
}

/**
 * API adapters
 * Adjust endpoint paths if your existing services already provide methods.
 */
async function fetchOrdersToday({ start, end }) {
  // Use existing service which adds dcId automatically
  const filter = { startDate: start, endDate: end };
  const data = await orderService.searchOrders(filter);
  return A(data?.content || data);
}

async function fetchTripsToday({ start, end }) {
  // Align with existing tripService which expects Date objects and includes dcId
  const s = new Date(start);
  const e = new Date(end);
  const data = await tripService.searchTrips(s, e);
  return A(data?.content || data);
}

/** Fallback: get per-trip details if search doesn’t include nested info */
async function fetchTripDetails(tripId) {
  return tripService.getTripDetails(tripId);
}

async function fetchWashFulfillmentsToday({ start, end }) {
  // Use existing service which adds required headers and dcId
  // The WF API expects ISO timestamps (see example payload provided)
  const data = await washFulfillmentService.search(start, end);
  return A(data?.content || data);
}

// Wash Requests: used for "Items sent to laundries"
function toDateOnlyLocal(dateLike) {
  const d = new Date(dateLike);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

async function fetchWashRequestsToday({ start, end }) {
  // The WR API expects date-only strings and a filterType
  const payload = {
    startTime: toDateOnlyLocal(start),
    endTime: toDateOnlyLocal(end),
    filterType: "CREATED_TIME",
  };
  const data = await washRequestService.search(payload);
  return A(data?.content || data);
}

// (No products-by-ids endpoint needed for dashboard currently)

/**
 * Aggregate pickups (items picked) and deliveries (items delivered) from trips.
 * We sum the *actual* quantities when available; fall back to expected.
 */
function summarizeTrips(trips) {
  let itemsDelivered = 0;
  let itemsPicked = 0;

  /** For charts grouped by category codes */
  const deliverBuckets = new Map();
  const pickBuckets = new Map();

  const bump = (bucket, key, qty) =>
    bucket.set(key, (bucket.get(key) || 0) + (Number(qty) || 0));

  for (const t of A(trips)) {
    const visits = A(t?.visits || []);
    for (const v of visits) {
      // Deliveries: productItems[] with deliveredQuantity
      for (const dr of A(v?.deliveryRequests)) {
        const items = A(dr?.productItems);
        for (const it of items) {
          const qty = it?.deliveredQuantity || 0;
          const n = Number(qty) || 0;
          itemsDelivered += n;
          const code = getCategoryCodeFromItem(it);
          if (code) bump(deliverBuckets, code, n);
        }
      }

      // Pickups: expectedItems[] with actualQuantity
      for (const pr of A(v?.pickupRequests)) {
        const items = A(pr?.expectedItems);
        for (const it of items) {
          const qty = it?.actualQuantity || 0;
          const n = Number(qty) || 0;
          itemsPicked += n;
          const code = getCategoryCodeFromItem(it?.product || it);
          if (code) bump(pickBuckets, code, n);
        }
      }
    }
  }

  return {
    itemsDelivered,
    itemsPicked,
    deliverByCategory: Object.fromEntries(deliverBuckets),
    pickByCategory: Object.fromEntries(pickBuckets),
  };
}

/**
 * Aggregate laundry stats from wash fulfillments.
 * itemsSentToLaundry: sum of planned/sent quantities created today.
 * itemsReceivedFromLaundry: sum where status is COMPLETED/RECEIVED today.
 * laundries: distinct vendor/laundry IDs present today.
 */
function summarizeFulfillments(list) {
  let itemsReceivedFromLaundry = 0;
  const laundryIds = new Set();
  const receivedBuckets = new Map();

  for (const wf of A(list)) {
    // Distinct laundries: support both vendorId and laundryVendorId
    if (wf?.vendorId != null) laundryIds.add(wf.vendorId);
    if (wf?.laundryVendorId != null) laundryIds.add(wf.laundryVendorId);

    const status = String(wf?.status || "").toUpperCase();

    const itemsArray = A(wf?.items);
    const mappingsArray = A(wf?.mappings);

    if (itemsArray.length > 0) {
      // Older/alternative shape with quantities per item
      for (const it of itemsArray) {
        const received = Number(
          it?.receivedQuantity ?? it?.completedQuantity ?? 0
        );
        if (["COMPLETED", "RECEIVED", "DELIVERED_TO_DC"].includes(status)) {
          itemsReceivedFromLaundry += received;
          const code = getCategoryCodeFromItem(it?.product || it);
          if (code) receivedBuckets.set(code, (receivedBuckets.get(code) || 0) + received);
        }
      }
    } else if (mappingsArray.length > 0) {
      // Current v3 search response shape: mappings[].productItems[].washedQuantity
      let washedTotal = 0;
      for (const m of mappingsArray) {
        for (const it of A(m?.productItems)) {
          washedTotal += Number(it?.washedQuantity || 0);
          const code = getCategoryCodeFromItem(it);
          if (code) receivedBuckets.set(code, (receivedBuckets.get(code) || 0) + (Number(it?.washedQuantity || 0)));
        }
      }
      if (["COMPLETED", "RECEIVED", "DELIVERED_TO_DC"].includes(status)) {
        itemsReceivedFromLaundry += washedTotal;
      }
    }
  }

  return {
    laundries: laundryIds.size,
    itemsReceivedFromLaundry,
    receivedByCategory: Object.fromEntries(receivedBuckets),
  };
}

// Sum items sent from Wash Requests: total soiledQuantity today
function summarizeWashRequests(list) {
  let itemsSentToLaundry = 0;
  const laundryIds = new Set();
  const sentBuckets = new Map();
  for (const wr of A(list)) {
    if (wr?.laundryVendorId != null) laundryIds.add(wr.laundryVendorId);
    for (const it of A(wr?.productSoiledItems)) {
      const qty = Number(it?.soiledQuantity || 0);
      itemsSentToLaundry += qty;
      const code = getCategoryCodeFromItem(it);
      if (code) sentBuckets.set(code, (sentBuckets.get(code) || 0) + qty);
    }
  }
  return { laundries: laundryIds.size, itemsSentToLaundry, sentByCategory: Object.fromEntries(sentBuckets) };
}

/**
 * Public API
 * Returns a single object the dashboard can consume.
 */
export async function fetchDashboardData({ start, end } = {}) {
  const range =
    start && end
      ? { start: new Date(start).toISOString(), end: new Date(end).toISOString() }
      : getTodayRangeISO();

  // 1) Base fetches in parallel
  const [orders, tripsRaw, washRequests, fulfillments] = await Promise.all([
    fetchOrdersToday(range),
    fetchTripsToday(range),
    fetchWashRequestsToday(range),
    fetchWashFulfillmentsToday(range),
  ]);

  // 2) If trips search didn’t include nested requests, expand details
  const trips =
    tripsRaw?.length &&
    !tripsRaw?.[0]?.visits &&
    tripsRaw?.[0]?.id
      ? await Promise.all(tripsRaw.map((t) => fetchTripDetails(t.id)))
      : tripsRaw;

  // 3) Aggregations
  const totalOrders = orders.length;
  const distinctHotels = new Set(
    orders
      .map((o) => o?.customerId || o?.hotelId)
      .filter((x) => x !== null && x !== undefined)
  ).size;

  const {
    itemsDelivered,
    itemsPicked,
    deliverByCategory,
    pickByCategory,
  } = summarizeTrips(trips);

  const {
    itemsSentToLaundry: itemsSentFromWR,
    sentByCategory,
  } = summarizeWashRequests(washRequests);

  const { itemsReceivedFromLaundry, receivedByCategory } = summarizeFulfillments(fulfillments);

  // Distinct laundries across both WR and WF for the day
  const wrVendors = new Set(washRequests.map((r) => r?.laundryVendorId).filter((x) => x != null));
  const wfVendors = new Set(
    fulfillments
      .map((f) => (f?.vendorId != null ? f.vendorId : f?.laundryVendorId))
      .filter((x) => x != null)
  );
  const laundries = new Set([...wrVendors, ...wfVendors]).size;

  // 4) Normalize chart series to the desired category order
  const barsDelivered = CATEGORY_CODES.map((code) => Number(deliverByCategory[code] || 0));
  const barsPicked = CATEGORY_CODES.map((code) => Number(pickByCategory[code] || 0));
  const washBarsSent = CATEGORY_CODES.map((code) => Number(sentByCategory?.[code] || 0));
  const washBarsDelivered = CATEGORY_CODES.map((code) => Number(receivedByCategory?.[code] || 0));

  return {
    meta: { start: range.start, end: range.end },
    cards: {
      hotels: distinctHotels,
      orders: totalOrders,
      itemsPicked,
      itemsDelivered,
    },
    washCards: {
      laundries,
      itemsSentToLaundry: itemsSentFromWR,
      itemsReceivedFromLaundry,
    },
    charts: {
      xCategories: CATEGORY_CODES, // ["sBS","QDC","PC"]
      deliveredSeries: barsDelivered,
      pickedSeries: barsPicked,
      washSentSeries: washBarsSent,
      washDeliveredSeries: washBarsDelivered,
    },
  };
}
