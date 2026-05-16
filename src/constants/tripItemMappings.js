export const DELIVERY_META_BY_BUCKET = {
  OVERALL: { status: "DELIVERED", conditionType: "FRESH" },
  DELIVERED: { status: "DELIVERED", conditionType: "FRESH" },
  RETURNED_FRESH: { status: "RETURNED", conditionType: "FRESH" },
  RETURNED_SOILED: { status: "RETURNED", conditionType: "SOILED" },
  RETURNED_DAMAGED: { status: "RETURNED", conditionType: "DAMAGED" },
};

export const PICKUP_CONDITION_BY_QUANTITY_TYPE = {
  SOILED: "SOILED",
  PICKUP: "SOILED",
  HEAVY_SOILED: "HEAVY_SOILED",
  DAMAGED: "DAMAGED",
  OVERALL: "SOILED",
};
