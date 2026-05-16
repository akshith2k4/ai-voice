import {
	DELIVERY_META_BY_BUCKET,
	PICKUP_CONDITION_BY_QUANTITY_TYPE,
} from "../constants/tripItemMappings";

const toInventoryRef = (item) =>
	item?.inventoryItemId ?? item?.referenceId ?? item?.id ?? null;

export const figureOutDDeliveryItemStatus = (items = [], quantityType = "") => {
	if (!Array.isArray(items)) return [];
	const deliveryMeta =
		DELIVERY_META_BY_BUCKET[quantityType] || DELIVERY_META_BY_BUCKET.OVERALL;

	return items
		.map((item) => {
			const referenceId = toInventoryRef(item);
			if (!referenceId) return null;

			return {
				...item,
				id: referenceId,
				inventoryItemId: referenceId,
				referenceId,
				referenceType: "INVENTORY_ITEM",
				status: deliveryMeta.status,
				conditionType: deliveryMeta.conditionType,
			};
		})
		.filter(Boolean);
};

export const figureOutPickupItemStatus = (items = [], quantityType = "") => {
	if (!Array.isArray(items)) return [];
	const conditionType =
		PICKUP_CONDITION_BY_QUANTITY_TYPE[quantityType] || "SOILED";

	return items
		.map((item) => {
			const referenceId = toInventoryRef(item);
			if (!referenceId) return null;

			return {
				...item,
				id: referenceId,
				inventoryItemId: referenceId,
				referenceId,
				referenceType: "INVENTORY_ITEM",
				status: "PICKED_UP",
				conditionType,
			};
		})
		.filter(Boolean);
};

