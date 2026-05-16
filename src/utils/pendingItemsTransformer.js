// utils/pendingItemsTransformer.js

// Generate last N days (default 7)
function getLastNDays(n = 7) {
  const days = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function buildPendingItemsIndex(washRequests, days = 7) {
  const dateRange = getLastNDays(days);
  const byVendorPool = {};

  washRequests.forEach((wr) => {
    const vendorId = wr.laundryVendorId;
    const poolId = wr.referenceId;
    const date = wr.washRequestRecordedDate;

    if (!dateRange.includes(date)) return;

    byVendorPool[vendorId] ??= {
      vendor: {
        id: vendorId,
        name: wr.laundryVendorName,
      },
      pools: {},
    };

    byVendorPool[vendorId].pools[poolId] ??= {
      pool: {
        id: poolId,
        name: wr.referenceName,
      },
      productsMap: new Map(),
      poolTotalPending: 0,
    };

    const poolNode = byVendorPool[vendorId].pools[poolId];

    wr.productSoiledItems.forEach((item) => {
      const pending =
        Number(item.soiledQuantity ?? 0) -
        Number(item.washedQuantity ?? 0);

      if (pending <= 0) return;

      if (!poolNode.productsMap.has(item.productId)) {
        poolNode.productsMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          pendingByDate: Object.fromEntries(
            dateRange.map((d) => [d, 0])
          ),
          totalPending: 0,
        });
      }

      const product = poolNode.productsMap.get(item.productId);
      product.pendingByDate[date] += pending;
      product.totalPending += pending;
      poolNode.poolTotalPending += pending;
    });
  });

  // Finalize maps → arrays
  Object.values(byVendorPool).forEach((vendor) => {
    Object.values(vendor.pools).forEach((pool) => {
      pool.products = Array.from(pool.productsMap.values());
      delete pool.productsMap;
    });
  });

  return { dateRange, byVendorPool };
}
