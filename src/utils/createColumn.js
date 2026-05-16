export const createColumn = (
    field,
    headerName,
    type = "text",
    options = {}
) => ({
    field,
    headerName,
    type,
    ...options,
});
