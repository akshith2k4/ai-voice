import { subDays } from "date-fns";
import { normalizeDate } from "./dateGrouping";
import { filterProductItems } from "./productUtils";
import { safeNumber } from "./quantityUtils";
import { equalsNormalizedString, normalizeString, normalizeUppercaseString } from "./stringUtils";

export const CLEAN_RECEIVED_SOURCE_OPTIONS = {
  REQUEST: "REQUEST",
  FULFILLMENT: "FULFILLMENT",
};

const QUANTITY_FIELDS = {
  sent: ["soiledQuantity"],
  heavy: ["heavySoiledQuantity"],
  cleanFulfillment: ["washedQuantity", "freshReceived", "washQuantityReceived"],
  soiledFulfillment: ["soiledQuantity", "soiledReceived"],
  damagedFulfillment: ["damagedQuantity", "damagedReceived"],
  cleanRequest: ["totalWashedQuantityReceived", "washedQuantity", "washQuantityReceived"],
  soiledRequest: ["soiledQuantityReceived", "soiledReceived"],
  damagedRequest: ["damagedQuantityReceived", "damagedReceived"],
};

export const getFulfillmentAnalysisDate = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return subDays(date, 1);
};

export const calculateWashEfficiency = ({ sent = 0, clean = 0, soiled = 0, damaged = 0 }) => {
  const normalizedSent = safeNumber(sent);
  const normalizedClean = safeNumber(clean);
  const normalizedSoiled = safeNumber(soiled);
  const normalizedDamaged = safeNumber(damaged);

  if (normalizedSent <= 0) return 0;

  const effectiveClean = normalizedClean - normalizedSoiled - normalizedDamaged;

  return Math.floor(Math.max(0, Math.min(100, (effectiveClean / normalizedSent) * 100)));
};

const sumProductItems = (items, fieldNames) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => {
    const value = fieldNames.reduce((matched, fieldName) => {
      if (matched !== null) return matched;
      if (item?.[fieldName] == null) return null;
      return safeNumber(item[fieldName]);
    }, null);
    return sum + (value ?? 0);
  }, 0);

const calculateProductTotals = (items, fieldMap) => ({
  clean: sumProductItems(items, fieldMap.clean),
  soiled: sumProductItems(items, fieldMap.soiled),
  damaged: sumProductItems(items, fieldMap.damaged),
});

const getRequestReceivedQuantity = ({ selectedProduct, summaryValue, itemValue }) => {
  if (selectedProduct && summaryValue != null) return itemValue;
  if (summaryValue != null) return safeNumber(summaryValue);
  return itemValue;
};

const getRequestCleanReceived = ({ selectedProduct, requestSummary, itemLevelTotals }) =>
  getRequestReceivedQuantity({
    selectedProduct,
    summaryValue: requestSummary?.totalWashedQuantityReceivedTotal,
    itemValue: itemLevelTotals.clean,
  });

const getRequestSoiledReceived = ({ selectedProduct, requestSummary, itemLevelTotals }) =>
  getRequestReceivedQuantity({
    selectedProduct,
    summaryValue: requestSummary?.soiledQuantityReceivedTotal,
    itemValue: itemLevelTotals.soiled,
  });

const getRequestDamagedReceived = ({ selectedProduct, requestSummary, itemLevelTotals }) =>
  getRequestReceivedQuantity({
    selectedProduct,
    summaryValue: requestSummary?.damagedQuantityReceivedTotal,
    itemValue: itemLevelTotals.damaged,
  });

export const isRewashType = (value) => normalizeUppercaseString(value) === "RE_WASH";

export const matchesVendor = (item, selectedVendor) => {
  if (!selectedVendor) return true;
  return String(item?.laundryVendorId ?? item?.vendorId ?? item?.laundryVendorId) === String(selectedVendor);
};

export const matchesFulfillmentVendor = (item, selectedVendor) => {
  if (!selectedVendor) return true;
  return String(item?.vendorId ?? item?.laundryVendorId) === String(selectedVendor);
};

export const requestPoolName = (item) => item?.referenceName?.trim() || "";

export const isGuestPool = (poolName) => normalizeString(poolName) === "guest pool";

export const fulfillmentPoolNames = (item) =>
  Array.from(
    new Set(
      (Array.isArray(item?.mappings) ? item.mappings : [])
        .map((mapping) => mapping?.inventoryPoolName?.trim())
        .filter((poolName) => Boolean(poolName) && !isGuestPool(poolName))
    )
  );

export const matchesPool = (item, selectedPool) => {
  if (isGuestPool(requestPoolName(item))) return false;
  if (!selectedPool) return true;
  return equalsNormalizedString(requestPoolName(item), selectedPool);
};

export const matchesFulfillmentPool = (item, selectedPool) => {
  const poolNames = fulfillmentPoolNames(item);
  if (poolNames.length === 0) return false;
  if (!selectedPool) return true;
  return poolNames.some((pool) => equalsNormalizedString(pool, selectedPool));
};

export const washRequestTotals = (request, selectedProduct) => {
  const productItems = filterProductItems(request?.productSoiledItems, selectedProduct);
  const requestSummary = request?.productSoiledItemsTotal ?? request?.productSoiledTotals ?? {};
  const sent = sumProductItems(productItems, QUANTITY_FIELDS.sent);
  const heavy = sumProductItems(productItems, QUANTITY_FIELDS.heavy);
  const itemLevelTotals = calculateProductTotals(productItems, {
    clean: QUANTITY_FIELDS.cleanRequest,
    soiled: QUANTITY_FIELDS.soiledRequest,
    damaged: QUANTITY_FIELDS.damagedRequest,
  });
  const clean = getRequestCleanReceived({ selectedProduct, requestSummary, itemLevelTotals });
  const soiled = getRequestSoiledReceived({ selectedProduct, requestSummary, itemLevelTotals });
  const damaged = getRequestDamagedReceived({ selectedProduct, requestSummary, itemLevelTotals });

  return {
    sent,
    heavy,
    clean,
    soiled,
    damaged,
  };
};

export const fulfillmentBreakdown = (fulfillment, selectedProduct, requestTypeById) => {
  const mappings = Array.isArray(fulfillment?.mappings) ? fulfillment.mappings : [];

  return mappings.reduce(
    (acc, mapping) => {
      const productItems = filterProductItems(mapping?.productItems, selectedProduct);
      const totals = calculateProductTotals(productItems, {
        clean: QUANTITY_FIELDS.cleanFulfillment,
        soiled: QUANTITY_FIELDS.soiledFulfillment,
        damaged: QUANTITY_FIELDS.damagedFulfillment,
      });
      const linkedRequestType = requestTypeById.get(String(mapping?.washRequestId ?? ""));
      const target = isRewashType(linkedRequestType || fulfillment?.washType || fulfillment?.washRequestType)
        ? acc.rewash
        : acc.wash;

      target.clean += totals.clean;
      target.soiled += totals.soiled;
      target.damaged += totals.damaged;
      return acc;
    },
    {
      wash: { clean: 0, soiled: 0, damaged: 0 },
      rewash: { clean: 0, soiled: 0, damaged: 0 },
    }
  );
};
