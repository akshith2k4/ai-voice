import { formatDateForTimestamp } from "../utils/dateUtils";

export class ItemDamageRequest {
  constructor(data) {
    this.id = data.id;
    this.status = data.status;
    this.requestDate = data.requestDate;

    // Normalize API fields for UI
    this.customerId = data.reportedBy ?? data.customerId;
    this.customerName =
      data.createdByName ?? data.customerName ?? "Unknown";

    this.productId = data.productId;
    this.productName = data.productName;
    this.quantity = data.quantity;
    this.price = data.price;

    this.sourceType = data.sourceType;
    this.sourceId = data.sourceId;
    this.sourceName = data.sourceName;
    this.sourceTriggerEntityId = data.sourceTriggerEntityId;
    this.sourceTriggerEntityType = data.sourceTriggerEntityType;

    this.images = data.images ?? [];
    this.notes = data.notes;
  }

  static toCreatePayload(formData) {
    return {
      reportedBy: Number(
        formData.reportedBy ?? formData.customerId
      ),
      productId: Number(formData.productId),
      quantity: Number(formData.quantity),
      sourceId: Number(formData.sourceId),
      sourceType: formData.sourceType,
      sourceName: formData.sourceName ?? "",
      sourceTriggerEntityId: formData.sourceTriggerEntityId
        ? Number(formData.sourceTriggerEntityId)
        : null,
      sourceTriggerEntityType:
        formData.sourceTriggerEntityType ?? null,
      requestDate:
        formatDateForTimestamp(formData.requestDate) ??
        new Date().toISOString(),
      price: formData.price
        ? Number(formData.price)
        : null,
      images: formData.images ?? [],
      notes: formData.notes ?? "",
      dcId: formData.dcId,
    };
  }

  static toUpdatePayload(formData) {
    return {
      quantity: Number(formData.quantity),
      price: formData.price
        ? Number(formData.price)
        : null,
      requestDate: formatDateForTimestamp(
        formData.requestDate
      ),
      images: formData.images ?? [],
      notes: formData.notes ?? "",
    };
  }

  static fromResponse(apiData) {
    return new ItemDamageRequest(apiData);
  }
}
