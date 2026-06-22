import { safeNumber } from "./quantityUtils";

// Helper function to clone complete object 
function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

// Transform WR (washRequest.productSoiledItems)
// soiledQuantity -> soiledQuantitySent
function renameFieldsInWashRequest(originalWashRequest) {
  const washRequest = clone(originalWashRequest);

  if (!Array.isArray(washRequest.productSoiledItems)) return washRequest;

  washRequest.productSoiledItems = washRequest.productSoiledItems.map((productItem) => {
    const clonedProductItem = { ...productItem };

    if (Object.prototype.hasOwnProperty.call(clonedProductItem, "soiledQuantity")) {
      clonedProductItem.soiledQuantitySent = clonedProductItem.soiledQuantity;
      delete clonedProductItem.soiledQuantity;
    }

    return clonedProductItem;
  });

  return washRequest;
}

// Transform WF Summary
// soiledQuantity -> soiledQuantityReceived
// damagedQuantity -> damagedQuantityReceived
// washedQuantity -> washQuantityReceived
function renameFieldsInFulfillmentSummary(originalFulfillmentSummary) {
  const fulfillmentSummary = clone(originalFulfillmentSummary);

  if (fulfillmentSummary == null || typeof fulfillmentSummary !== "object") {
    return fulfillmentSummary;
  }

  function renameKeys(targetObj, keyMap) {
    const resultObj = { ...targetObj };
    for (const [oldKey, newKey] of Object.entries(keyMap)) {
      if (Object.prototype.hasOwnProperty.call(resultObj, oldKey)) {
        resultObj[newKey] = resultObj[oldKey];
        delete resultObj[oldKey];
      }
    }
    return resultObj;
  }

  const keyMapForProductItems = {
    soiledQuantity: "soiledQuantityReceived",
    damagedQuantity: "damagedQuantityReceived",
    washedQuantity: "washQuantityReceived",
  };

  const keyMapForTotalProducts = {
    totalWashedQuantity: "totalWashedQuantityReceived",
    soiledQuantity: "soiledQuantityReceived",
    damagedQuantity: "damagedQuantityReceived",
  };

  if (Array.isArray(fulfillmentSummary.totalProducts)) {
    fulfillmentSummary.totalProducts = fulfillmentSummary.totalProducts.map((totalProduct) =>
      renameKeys(totalProduct, keyMapForTotalProducts)
    );
  }

  if (Array.isArray(fulfillmentSummary.fulfillments)) {
    fulfillmentSummary.fulfillments = fulfillmentSummary.fulfillments.map((fulfillment) => {
      const clonedFulfillment = { ...fulfillment };
      if (Array.isArray(clonedFulfillment.mappings)) {
        clonedFulfillment.mappings = clonedFulfillment.mappings.map((mapping) => {
          const clonedMapping = { ...mapping };
          if (Array.isArray(clonedMapping.productItems)) {
            clonedMapping.productItems = clonedMapping.productItems.map((productItem) =>
              renameKeys(productItem, keyMapForProductItems)
            );
          }
          return clonedMapping;
        });
      }
      return clonedFulfillment;
    });
  }
  return fulfillmentSummary;
}

// Append fulfillmentSummary.totalProducts into washRequest.productSoiledItems (by productId or productName)
function mergeFulfillmentTotalsIntoRequest(originalWashRequest, originalFulfillmentSummary) {
  const washRequest = clone(originalWashRequest);
  const fulfillmentSummary = clone(originalFulfillmentSummary);

  if (!Array.isArray(washRequest.productSoiledItems)) return washRequest;
  if (!Array.isArray(fulfillmentSummary.totalProducts)) return washRequest;

  const fulfillmentLookupByProductId = new Map();
  const fulfillmentLookupByProductNameLower = new Map();

  fulfillmentSummary.totalProducts.forEach((totalProduct) => {
    const productIdKey = totalProduct.productId ?? null;
    const productNameLower = (totalProduct.productName || "").toString().trim().toLowerCase();

    const totalWashed =
      totalProduct.totalWashedQuantityReceived ??
      totalProduct.totalWashedQuantity ??
      null;

    const soiledQty =
      totalProduct.soiledQuantityReceived ??
      totalProduct.soiledQuantity ??
      null;

    const damagedQty =
      totalProduct.damagedQuantityReceived ??
      totalProduct.damagedQuantity ??
      null;

    const payload = {
      totalWashedQuantityReceived: totalWashed,
      soiledQuantityReceived: soiledQty,
      damagedQuantityReceived: damagedQty,
    };

    if (productIdKey !== null) {
      fulfillmentLookupByProductId.set(Number(productIdKey), payload);
    }

    if (productNameLower) {
      fulfillmentLookupByProductNameLower.set(productNameLower, payload);
    }
  });

  washRequest.productSoiledItems = washRequest.productSoiledItems.map((requestProductItem) => {
    const clonedRequestProduct = { ...requestProductItem };

    const productId = clonedRequestProduct.productId ?? null;
    const productNameLower = (clonedRequestProduct.productName || "").toString().trim().toLowerCase();

    let matchedPayload = null;
    if (productId !== null && fulfillmentLookupByProductId.has(Number(productId))) {
      matchedPayload = fulfillmentLookupByProductId.get(Number(productId));
    } else if (productNameLower && fulfillmentLookupByProductNameLower.has(productNameLower)) {
      matchedPayload = fulfillmentLookupByProductNameLower.get(productNameLower);
    }

    if (matchedPayload) {
      clonedRequestProduct.totalWashedQuantityReceived = matchedPayload.totalWashedQuantityReceived;
      clonedRequestProduct.soiledQuantityReceived = matchedPayload.soiledQuantityReceived;
      clonedRequestProduct.damagedQuantityReceived = matchedPayload.damagedQuantityReceived;
    } else {
      clonedRequestProduct.totalWashedQuantityReceived = clonedRequestProduct.totalWashedQuantityReceived ?? null;
      clonedRequestProduct.soiledQuantityReceived = clonedRequestProduct.soiledQuantityReceived ?? null;
      clonedRequestProduct.damagedQuantityReceived = clonedRequestProduct.damagedQuantityReceived ?? null;
    }

    return clonedRequestProduct;
  });

  return washRequest;
}

// Calculate totals for productSoiledItems and attach productSoiledItemsTotal
function addProductSoiledItemsTotals(originalWashRequest) {
  const washRequest = clone(originalWashRequest);

  if (!Array.isArray(washRequest.productSoiledItems) || washRequest.productSoiledItems.length === 0) {
    washRequest.productSoiledItemsTotal = {
      soiledQuantitySentTotal: 0,
      totalWashedQuantityReceivedTotal: 0,
      soiledQuantityReceivedTotal: 0,
      damagedQuantityReceivedTotal: 0,
    };
    return washRequest;
  }

  const totalsAccumulator = washRequest.productSoiledItems.reduce(
    (acc, item) => {
      const soiledSent =
        safeNumber(item.soiledQuantitySent ?? item.soiledQuantity ?? 0);

      const totalWashedReceived =
        safeNumber(
          item.totalWashedQuantityReceived ??
            item.totalWashedQuantity ??
            item.washQuantityReceived ??
            item.washedQuantity ??
            0
        );

      const soiledReceived =
        safeNumber(item.soiledQuantityReceived ?? item.soiledQuantity ?? 0);

      const damagedReceived =
        safeNumber(item.damagedQuantityReceived ?? item.damagedQuantity ?? 0);

      acc.soiledQuantitySentTotal += soiledSent;
      acc.totalWashedQuantityReceivedTotal += totalWashedReceived;
      acc.soiledQuantityReceivedTotal += soiledReceived;
      acc.damagedQuantityReceivedTotal += damagedReceived;

      return acc;
    },
    {
      soiledQuantitySentTotal: 0,
      totalWashedQuantityReceivedTotal: 0,
      soiledQuantityReceivedTotal: 0,
      damagedQuantityReceivedTotal: 0,
    }
  );

  washRequest.productSoiledItemsTotal = totalsAccumulator;

  return washRequest;
}

// Calculate washDays from fulfillment summary and attach as washRequest.washDays
function addWashDaysToWashRequest(originalWashRequest, originalFulfillmentSummary) {
  const washRequest = clone(originalWashRequest);
  const fulfillmentSummary = clone(originalFulfillmentSummary);

  if (!Array.isArray(fulfillmentSummary?.fulfillments) || fulfillmentSummary.fulfillments.length === 0) {
    washRequest.washDays = [];
    return washRequest;
  }

  const soiledTotalFromTotalsProp =
    safeNumber(washRequest?.productSoiledItemsTotal?.soiledQuantitySentTotal ?? null);

  let fallbackSoiledTotal = 0;
  if (!soiledTotalFromTotalsProp) {
    if (Array.isArray(washRequest?.productSoiledItems)) {
      fallbackSoiledTotal = washRequest.productSoiledItems.reduce((acc, it) => {
        return acc + safeNumber(it.soiledQuantitySent ?? it.soiledQuantity ?? 0);
      }, 0);
    }
  }

  const effectiveSoiledTotal =
    soiledTotalFromTotalsProp > 0 ? soiledTotalFromTotalsProp : fallbackSoiledTotal;

  const washDays = fulfillmentSummary.fulfillments.map((fulfillment) => {
    const date = fulfillment?.actualFulfillmentTime ?? fulfillment?.plannedFulfillmentTime ?? null;

    let totalWashedReceivedForThisFulfillment = 0;

    if (Array.isArray(fulfillment.mappings)) {
      for (const mapping of fulfillment.mappings) {
        if (!Array.isArray(mapping.productItems)) continue;
        for (const productItem of mapping.productItems) {
          const washed =
            productItem.washQuantityReceived ??
            productItem.washQuantity ??
            productItem.washedQuantity ??
            0;
          totalWashedReceivedForThisFulfillment += safeNumber(washed);
        }
      }
    }

    return {
      date,
      totalSoiledSent: effectiveSoiledTotal,
      totalWashedReceived: totalWashedReceivedForThisFulfillment,
    };
  });

  washRequest.washDays = washDays;
  return washRequest;
}

// Master Function to transform wash request and fulfillment summary
function transformWashRequestAndFulfillment(originalWashRequest, originalFulfillmentSummary) {
  const baseWashRequest = clone(originalWashRequest);
  const baseFulfillmentSummary = clone(originalFulfillmentSummary);

  const washRequestAfterRename = renameFieldsInWashRequest(baseWashRequest);
  const fulfillmentSummaryAfterRename = renameFieldsInFulfillmentSummary(baseFulfillmentSummary);

  const washRequestAfterMerge = mergeFulfillmentTotalsIntoRequest(
    washRequestAfterRename,
    fulfillmentSummaryAfterRename
  );

  const washRequestAfterTotals = addProductSoiledItemsTotals(washRequestAfterMerge);

  const washRequestFinal = addWashDaysToWashRequest(
    washRequestAfterTotals,
    fulfillmentSummaryAfterRename
  );

  return {
    washRequestFinal,
    fulfillmentSummaryRenamed: fulfillmentSummaryAfterRename,
    washRequestTransformed: washRequestFinal,
    fulfillmentSummaryTransformed: fulfillmentSummaryAfterRename,
  };
}

export {
  clone,
  renameFieldsInWashRequest,
  renameFieldsInFulfillmentSummary,
  mergeFulfillmentTotalsIntoRequest,
  addProductSoiledItemsTotals,
  addWashDaysToWashRequest,
  transformWashRequestAndFulfillment,
};
