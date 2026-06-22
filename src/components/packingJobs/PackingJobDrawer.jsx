import { useMemo } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  SvgIcon,
} from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import AssignmentReturnedIcon from "@mui/icons-material/AssignmentReturned";
import CloseIcon from "@mui/icons-material/Close";
import SensorsIcon from "@mui/icons-material/Sensors";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { faRectangleXmark } from "@fortawesome/free-solid-svg-icons";
import CustomDrawer from "../common/CustomDrawer";
import DataTable from "../common/tables/DataTable";
import LoaderScreen from "../dashboard/LoaderScreen";
import StatusChip from "../common/StatusChip";
import ScannedIdsIndicator from "../Scanner/ScannedIdsIndicator";
import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";

const itemColumns = [
  { field: "productName", headerName: "Product", type: "longText", width: 180 },
  { field: "requiredQuantity", headerName: "Req Qty", type: "smallNumber", width: 90 },
  { field: "packedQuantity", headerName: "Packed Qty", type: "smallNumber", width: 90 },
  { field: "unpackedQuantity", headerName: "Unpacked Qty", type: "smallNumber", align: "center", width: 120 },
  { field: "reason", headerName: "Reason", type: "shortText", width: 90 },
];

const isActiveAssignment = (assignment) =>
  assignment?.status === "ASSIGNED" || assignment?.status === "IN_PROGRESS";

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

export default function PackingJobDrawer({
  job,
  loading,
  open,
  onClose,
  onAssign,
  onUnassign,
  onClearSessions,
}) {
  const allAssignments = useMemo(
    () => asArray(job?.assignments),
    [job?.assignments],
  );

  const sessions = useMemo(() => {
    const sessionsList = asArray(job?.sessions);
    return sessionsList.map((session) => {
      const items = asArray(session.packingSessionItems).map((sessionItem, index) => {
        const productName = job?.items?.find(
          (p) => p.productId === sessionItem.productId || p.id === sessionItem.productId,
        )?.productName || sessionItem.productName || `Product #${sessionItem.productId}`;
        return {
          id: `${session.id}-${sessionItem.productId}-${index}`, // Unique row ID
          productId: sessionItem.productId,
          productName,
          packedQuantity: sessionItem.packedQuantity,
          inventoryItemIds: sessionItem.inventoryItemIds || [],
          notes: sessionItem.notes || "",
        };
      });

      return {
        id: session.id,
        packedAt: session.packedAt,
        packerName: session.packerName || "--",
        notes: session.notes || "",
        status: session.status || "",
        totalQuantity: session.totalQuantity || items.reduce((sum, item) => sum + (item.packedQuantity || 0), 0),
        items,
      };
    });
  }, [job?.sessions, job?.items]);

  const transformedItems = useMemo(() => {
    const itemsList = job?.items || [];
    return itemsList.map((item) => {
      let unpackedQty = 0;
      const reasons = [];

      allAssignments.forEach((assignment) => {
        const uItems = assignment.unavailableItems || [];
        uItems.forEach((uItem) => {
          if (uItem.productId === item.productId || uItem.productId === item.id) {
            unpackedQty += uItem.quantity || 0;
            if (uItem.reason) {
              reasons.push(uItem.reason.replace('_', ' '));
            }
          }
        });
      });

      return {
        ...item,
        unpackedQuantity: unpackedQty || "--",
        reason: reasons.length > 0 ? Array.from(new Set(reasons)).join(", ") : "--",
      };
    });
  }, [job?.items, allAssignments]);

  const assignmentColumns = useMemo(
    () => [
      {
        field: "assignedTo",
        headerName: "Packer",
        type: "shortText",
        render: (value) => value || "--",
      },
      {
        field: "status",
        headerName: "Status",
        type: "shortText",
        render: (value) => <StatusChip status={value} />,
      },
      {
        field: "assignedAt",
        headerName: "Assigned At",
        type: "text",
        render: (value) => (value ? formatCustomDate(value, DATE_TIME) : "--"),
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "smallText",
        align: "right",
        stopPropagation: true,
        width: 120,
        render: (_, row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={isActiveAssignment(row) ? "Unassign" : "Inactive"}>
              <span>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnassign?.(row);
                  }}
                  disabled={!isActiveAssignment(row)}
                >
                  <AssignmentReturnedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={row.status !== "UNASSIGNED" && row.status !== "CANCELLED" ? "Clear Sessions" : "Inactive"}>
              <span>
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation();
                    onClearSessions?.(row);
                  }}
                  disabled={row.status === "UNASSIGNED" || row.status === "CANCELLED"}
                  color="warning"
                >
                  <SvgIcon
                    viewBox={`0 0 ${faRectangleXmark.icon[0]} ${faRectangleXmark.icon[1]}`}
                    fontSize="small"
                  >
                    {Array.isArray(faRectangleXmark.icon[4]) ? (
                      faRectangleXmark.icon[4].map((d, i) => <path key={i} d={d} />)
                    ) : (
                      <path d={faRectangleXmark.icon[4]} />
                    )}
                  </SvgIcon>
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [onUnassign, onClearSessions],
  );

  const sessionItemColumns = useMemo(
    () => [
      { field: "productName", headerName: "Product", type: "longText" },
      {
        field: "packedQuantity",
        headerName: "Packed Qty",
        width: 110,
        type: "smallNumber",
        align: "center",
        render: (value, row) => {
          const ids = row.inventoryItemIds || [];
          return (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
              {ids.length > 0 && (
                <ScannedIdsIndicator ids={ids}>
                  <Tooltip title={`View ${ids.length} RFID tag${ids.length !== 1 ? "s" : ""}`} arrow>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5,
                        px: 0.6,
                        height: 20,
                        minWidth: 30,
                        borderRadius: "999px",
                        backgroundColor: "#fff3ee",
                        border: "1px solid #f4511e",
                        cursor: "pointer",
                      }}
                    >
                      <SensorsIcon sx={{ fontSize: 14, color: "#f4511e" }} />
                      <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: "#f4511e" }}>
                        {ids.length}
                      </Typography>
                    </Box>
                  </Tooltip>
                </ScannedIdsIndicator>
              )}
            </Box>
          );
        },
      },
      { field: "notes", headerName: "Notes", type: "longText", render: (value) => value || "--" },
    ],
    [],
  );

  return (
    <CustomDrawer open={open} onClose={onClose} width={860}>
      <Box sx={{ px: 3, py: 2, overflowY: "auto" }}>
        <Box
          sx={{
            pb: 1,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Packing Job Details
          </Typography>

          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: "auto", py: 1 }}>
          {loading ? (
            <LoaderScreen />
          ) : (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                  alignItems: "start",
                }}
              >
                <DetailSection title="Source Information">
                  <DetailRow label="Source ID" value={job?.sourceId} />
                  <DetailRow label="Source Name" value={job?.sourceName} />
                  <DetailRow label="Source Date" value={job?.sourceDate} />
                  <DetailRow label="Source Type" value={job?.sourceType} />
                </DetailSection>

              <DetailSection title="Job Information">
                <DetailRow label="Job ID" value={job?.packingJobId} />
                <DetailRow label="Job Number" value={job?.jobNumber} />
                <DetailRow label="Job Date" value={job?.jobDate} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" color="text.primary">
                    <strong>Status:</strong>
                    </Typography>
                    <StatusChip status={job?.status} />
                </Box>
                <DetailRow label="Items" value={job?.itemCount} />
                <DetailRow label="Packed" value={job?.packedCount} />
                <DetailRow label="Assigned To" value={job?.assignedTo} />
              </DetailSection>
              </Box>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "success.dark", fontWeight: 500 }}
                  >
                    Assignments
                  </Typography>

                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AssignmentIndIcon />}
                    onClick={() => onAssign?.(job)}
                    disabled={!job?.id}
                  >
                    Assign Packer
                  </Button>
                </Box>
                <DataTable
                  columns={assignmentColumns}
                  rows={allAssignments}
                  rowKey="id"
                  containerSx={{ my: 0, boxShadow: "none" }}
                />
              </Box>

              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
                >
                  Items
                </Typography>

                <DataTable
                  columns={itemColumns}
                  rows={transformedItems}
                  rowKey="productName"
                  containerSx={{ my: 0, boxShadow: "none" }}
                />
              </Box>

              {/* Packing Sessions Section */}
              {sessions.length > 0 && (
                <Box>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "success.dark", fontWeight: 500, mb: 1.5 }}
                  >
                    Packing Sessions
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {sessions.map((session) => (
                      <Accordion
                        key={session.id}
                        variant="outlined"
                        sx={{
                          borderRadius: "4px !important",
                          borderColor: "divider",
                          overflow: "hidden",
                          mb: 1,
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            backgroundColor: "action.hover",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&.Mui-expanded": {
                              minHeight: 48,
                            },
                          }}
                        >
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={{ xs: 1, sm: 4 }}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            sx={{ width: "100%", pr: 2 }}
                          >
                            <Typography sx={{ fontWeight: 600, minWidth: 100 }}>
                              Session #{session.id}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {session.packerName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {session.packedAt ? formatCustomDate(session.packedAt, DATE_TIME) : "--"}
                            </Typography>
                            <Box sx={{ ml: { sm: "auto !important" } }}>
                              <StatusChip status={session.status} />
                            </Box>
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 2 }}>
                          {session.notes && (
                            <Box
                              sx={{
                                mb: 2,
                                p: 1.5,
                                bgcolor: "action.hover",
                                borderRadius: 1,
                                borderLeft: "4px solid",
                                borderColor: "info.main",
                              }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                <strong>Bag Numbers:</strong> {session.notes}
                              </Typography>
                            </Box>
                          )}
                          <DataTable
                            columns={sessionItemColumns}
                            rows={session.items}
                            rowKey="id"
                            containerSx={{ my: 0, boxShadow: "none" }}
                          />
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Box>
    </CustomDrawer>
  );
}

function DetailSection({ title, children }) {
  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ color: "success.dark", fontWeight: 500, mb: 1 }}
      >
        {title}
      </Typography>
      <Stack component="div" spacing={1} sx={{ mt: 1 }}>
        {children}
      </Stack>
    </Box>
  );
}

function DetailRow({ label, value }) {
  return (
    <Typography variant="body2" color="text.primary">
      <strong>{label}:</strong> {value ?? "--"}
    </Typography>
  );
}
