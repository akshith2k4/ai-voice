export function formatHelperApiError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status && data !== undefined) {
    return `HTTP ${status}: ${JSON.stringify(data, null, 2)}`;
  }

  if (status) {
    return `HTTP ${status}`;
  }

  return error?.message || "Network error";
}
