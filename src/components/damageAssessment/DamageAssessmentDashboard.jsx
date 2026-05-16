import React, { useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, subDays } from "date-fns";

import {
  useDamageRequests,
  useDeleteDamageRequest,
  useDamageRequest,
} from "../../hooks/useDamageAssessment";
import { formatDateForApi } from "../../utils/dateUtils";
import { DAMAGE_STATUSES } from "../../constants/damageAssessment";

import ItemDamageRequestDialog from "./ItemDamageRequestDialog";
import DamageAssessmentSidebar from "./DamageAssessmentSidebar";
import DataTable from "../common/tables/DataTable";
import LoaderScreen from "../dashboard/LoaderScreen";
import StatusChip from "../common/StatusChip";
import GreenButton from "../common/GreenButton";

const DEFAULT_DATE_OFFSET_DAYS = 3;

function DamageAssessmentDashboard() {
  const [startDate, setStartDate] = useState(
    subDays(new Date(), DEFAULT_DATE_OFFSET_DAYS)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: formatDateForApi(subDays(new Date(), DEFAULT_DATE_OFFSET_DAYS)),
    endDate: formatDateForApi(new Date()),
    status: null,
  });

  // Queries
  const { data: damageRequests, isLoading } = useDamageRequests(appliedFilters);

  const [selectedDamageId, setSelectedDamageId] = useState(null);
  const { data: sidebarData, isLoading: sidebarLoading } =
    useDamageRequest(selectedDamageId);

  // Actions
  const deleteAction = useDeleteDamageRequest();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenCreate = () => {
    setEditItem(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item, e) => {
    e.stopPropagation();
    setEditItem(item);
    setDialogOpen(true);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Cancel this request?")) {
      deleteAction.mutate(id, {
        onError: (error) => {
          const errorMsg = error?.response?.data?.message || error?.message || "Failed to delete request";
          setErrorMessage(errorMsg);
          alert(errorMsg);
        },
      });
    }
  };

  const handleRowClick = (row) => {
    setSelectedDamageId(row.id);
  };

  const handleApplyFilters = () => {
    setAppliedFilters({
      startDate: formatDateForApi(startDate),
      endDate: formatDateForApi(endDate),
      status: statusFilter || null,
    });
  };

  const columns = [
    // { field: "id", headerName: "ID", type: "id" },
    { field: "sourceName", headerName: "Source Name", type: "text", width: 150 },
    { field: "sourceType", headerName: "Source Type", type: "text", width: 130 },
    { field: "productName", headerName: "Product", type: "text", width: 150 },
    { field: "quantity", headerName: "Quantity", type: "smallNumber", width: 90 },
    {
      field: "requestDate",
      headerName: "Request Date",
      type: "text",
      width: 130,
      render: (val) => val ? format(new Date(val), "dd MMM yyyy") : "—",
    },
    {
      field: "status",
      headerName: "Status",
      type: "shortText",
      width: 110,
      render: (val) => <StatusChip status={val} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      type: "smallText",
      width: 90,
      align: "center",
      render: (_, row) => (
        <Box>
          <IconButton
            color="primary"
            size="small"
            onClick={(e) => handleOpenEdit(row, e)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            color="error"
            size="small"
            onClick={(e) => handleDelete(row.id, e)}
            disabled={deleteAction.isPending}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (isLoading) return <LoaderScreen />;

  return (
    <Box sx={{ display: "flex", height: "100%" }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Damage Assessment
          </Typography>

          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={(value) => {
                setStartDate(value);
              }}
              slotProps={{ textField: { size: "small" } }}
            />

            <DatePicker
              label="End Date"
              value={endDate}
              onChange={(value) => {
                setEndDate(value);
              }}
              slotProps={{ textField: { size: "small" } }}
            />

            <TextField
              select
              label="Status"
              value={statusFilter}
              size="small"
              sx={{ minWidth: 150 }}
              onChange={(event) => {
                setStatusFilter(event.target.value);
              }}
            >
              <MenuItem value="">All</MenuItem>
              {DAMAGE_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>

            <GreenButton onClick={handleApplyFilters} />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: "auto" }}
              onClick={handleOpenCreate}
            >
              Create Damage Request
            </Button>
          </Box>
        </Paper>

        <DataTable
          columns={columns}
          rows={damageRequests || []}
          onRowClick={handleRowClick}
          selectedId={selectedDamageId}
        />

        <ItemDamageRequestDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialData={editItem}
        />
      </Container>

      <DamageAssessmentSidebar
        open={!!selectedDamageId}
        damage={sidebarData}
        loading={sidebarLoading}
        onClose={() => setSelectedDamageId(null)}
      />
    </Box>
  );
}

export default DamageAssessmentDashboard;
