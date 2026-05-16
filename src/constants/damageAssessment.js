/**
 * Constants for Damage Assessment module
 */

export const DAMAGE_SOURCE = {
  ORDER: "ORDER",
  WASH_FULFILLMENT: "WASH_FULFILLMENT",
};

export const SOURCE_ENTITY_TYPE = {
  CUSTOMER: "CUSTOMER",
  LAUNDRY: "LAUNDRY",
};

export const DAMAGE_SOURCE_TYPES = [
  { label: "Order", value: DAMAGE_SOURCE.ORDER },
  { label: "Wash Fulfillment", value: DAMAGE_SOURCE.WASH_FULFILLMENT },
];

export const DAMAGE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

export const DAMAGE_STATUSES = [
  DAMAGE_STATUS.PENDING,
  DAMAGE_STATUS.APPROVED,
  DAMAGE_STATUS.REJECTED,
];
