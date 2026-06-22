import { DATE_ONLY, formatCustomDate } from "../../utils/dateUtils";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const sumBy = (items, getter) =>
  asArray(items).reduce((total, item) => total + (Number(getter(item)) || 0), 0);

const getUserName = (assignment) =>
  assignment?.assignedTo ||
  assignment?.user?.name ||
  assignment?.user?.userName ||
  assignment?.userName ||
  assignment?.packerName ||
  assignment?.packedByName ||
  assignment?.user?.id ||
  assignment?.userId;

export function extractListResponse(data) {
  return asArray(data?.content || data?.packingJobs || data?.jobs || data);
}

export function normalizePackingJob(raw = {}) {
  const job = raw.packingJob || raw.job || raw;
  const productItems = asArray(
    raw.productItems ||
      raw.packingJobProductItems ||
      job.productItems ||
      job.packingJobProductItems,
  ).map(normalizePackingJobItem);
  const assignments = asArray(raw.assignments || job.assignments);
  const activeAssignments = assignments.filter(
    (assignment) => !assignment?.unassignedAt && assignment?.status !== "UNASSIGNED",
  );
  const assignedTo = activeAssignments.map(getUserName).filter(Boolean).join(", ");
  const itemCount = sumBy(productItems, (item) => item.requiredQuantity);
  const packedCount = sumBy(productItems, (item) => item.packedQuantity);
  const sourceDateRaw = job.jobDate || raw.jobDate;
  const jobDateRaw =
    job.createdAt ||
    raw.createdAt ||
    job.startedAt ||
    job.assignedAt ||
    job.completedAt ||
    sourceDateRaw;

  const sourceMetadata = job.sourceMetadata || raw.sourceMetadata || {};
  const routeId = sourceMetadata.routeId ?? job.routeId ?? raw.routeId ?? null;
  const routeName = sourceMetadata.routeName ?? job.routeName ?? raw.routeName ?? null;
  const sequence = sourceMetadata.sequence ?? job.sequence ?? raw.sequence ?? null;

  return {
    ...raw,
    ...job,
    routeId,
    routeName: routeName || (routeId ? `Route ${routeId}` : "--"),
    sequence,
    id: job.id ?? job.packingJobId ?? raw.id ?? raw.packingJobId,
    jobNumber: job.jobNumber || raw.jobNumber || `Job ${job.id ?? job.packingJobId ?? raw.id ?? raw.packingJobId ?? ""}`,
    sourceId: job.referenceId || raw.referenceId || raw.sourceId || raw.orderId,
    sourceName:
      raw.sourceName ||
      job.sourceName ||
      raw.referenceName ||
      job.referenceName ||
      raw.customerName ||
      job.customerName,
    sourceType: job.referenceType || raw.referenceType || raw.sourceType,
    status: job.status || raw.status,
    itemCount: itemCount || productItems.length || raw.itemCount || raw.itemsCount || 0,
    packedCount: packedCount || raw.packedCount || raw.packedQuantity || 0,
    sourceDate: sourceDateRaw ? formatCustomDate(sourceDateRaw, DATE_ONLY) : "--",
    sourceDateRaw,
    jobDate: jobDateRaw ? formatCustomDate(jobDateRaw, DATE_ONLY) : "--",
    jobDateRaw,
    assignedTo: assignedTo || raw.assignedTo || job.assignedTo,
    productItems,
    items: productItems,
    assignments,
  };
}

export function normalizePackingJobItem(item = {}) {
  const requiredQuantity =
    item.requiredQuantity ??
    item.quantity ??
    item.packingQuantity ??
    item.plannedQuantity ??
    0;
  const packedQuantity =
    item.packedQuantity ??
    item.actualQuantity ??
    0;

  return {
    ...item,
    id: item.id ?? item.packingJobProductItemId ?? item.referenceItemId,
    productName:
      item.productName ||
      item.product?.name ||
      item.notes ||
      "--",
    requiredQuantity,
    packedQuantity,
  };
}

export function buildProductItemsPayload(rows) {
  return {
    productItems: rows.map((row) => ({
      id: row.id || undefined,
      referenceItemType: row.referenceItemType || undefined,
      referenceItemId: row.referenceItemId || undefined,
      productId: Number(row.productId) || undefined,
      packingQuantity: Number(row.packingQuantity) || undefined,
      notes: row.notes || undefined,
    })),
  };
}
