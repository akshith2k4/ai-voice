/**
 * Returns ACTIVE pool items for an inventory row.
 */
export const getActivePoolItems = (row) =>
  (row.linkedPoolItems || []).filter((item) => item.status === 'ACTIVE');

/**
 * Returns the condition string from the single active pool item, or '' if none/multiple.
 */
export const getActiveCondition = (row) => {
  const active = getActivePoolItems(row);
  return active.length === 1 ? active[0].condition || '' : '';
};

/**
 * Parses a comma-separated string of IDs into a clean array of numeric strings.
 * e.g. "113846, 113863, , 113935" → ["113846", "113863", "113935"]
 */
export const parseItemIds = (text) =>
  text.split(',').map((s) => s.trim()).filter(Boolean);

/**
 * Formats inventory rows as tab-separated text (for pasting into Excel).
 * Columns: Item ID, Location, Condition, Status
 */
export const formatInventoryForClipboard = (items) => {
  const header = 'Item ID\tLocation\tCondition\tStatus';
  const rows = items.map((item) => {
    const id = item.id ?? '';
    const location = item.locationReferenceType ?? '';
    const condition = getActiveCondition(item);
    const status = item.status ?? '';
    return `${id}\t${location}\t${condition}\t${status}`;
  });
  return [header, ...rows].join('\n');
};
