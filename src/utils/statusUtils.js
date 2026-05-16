// Returns standardized MUI Chip color for a status value
export function getStatusChipColor(status) {
  if (!status) return "default";
  const s = String(status).toUpperCase();

  // Success (Green)
  if (
    s === "COMPLETED" ||
    s === "FULFILLED" ||
    s === "DONE" ||
    s === "SUCCESS" ||
    s === "RESOLVED" ||
    s === "CLOSED" ||
    s === "READY" ||
    s === "CONFIRMED" ||
    s === "OUT_FOR_DELIVERY" ||
    s === "APPROVED" ||
    s === "ACTIVE" ||
    s === "INVOICED" ||
    s === "PAID"
  ) {
    return "success";
  }

  // Error (Red)
  if (s === "INACTIVE") {
    return "error";
  }

  // Warning (Orange)
  if (
    s === "PENDING" ||
    s === "PROCESSING" ||
    s === "LOCKED" ||
    s === "PARTIALLY_PAID" ||
    s === "PARTIALLY_INVOICED"
  ) {
    return "warning";
  }

  // Info (Blue)
  if (
    s === "IN_PROGRESS" ||
    s === "OPEN" ||
    s === "NEW" ||
    s === "CREATED" ||
    s === "SENT"
  ) {
    return "info";
  }

  // Error (Red)
  if (
    s === "FAILED" ||
    s === "ERROR" ||
    s === "CANCELLED" ||
    s === "REJECTED" ||
    s === "DAMAGE" ||
    s === "MISSING" ||
    s === "OVERDUE" ||
    s === "NOT_INVOICED"
  ) {
    return "error";
  }

  // Default (Grey)
  if (s === "EMPTY" || s === "NONE") {
    return "default";
  }

  return "default";
}

// Maps an array of statuses to chip color objects for bulk usage
export function mapStatusesToChipColors(statuses) {
  return (Array.isArray(statuses) ? statuses : []).map(st => ({ status: st, color: getStatusChipColor(st) }));
}
