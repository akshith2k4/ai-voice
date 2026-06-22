import React, { useState, useEffect, useMemo } from "react";
import { 
  Container, 
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  Stack,
  Box,
  Typography,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider
} from "@mui/material";
import { 
  Search as SearchIcon, 
  AssignmentInd as AssignmentIndIcon 
} from '@mui/icons-material';
import FilterPanel from "../common/FilterPanel";
import GreenButton from "../common/GreenButton";
import DataTable from "../common/tables/DataTable";
import CreateRouteDialog from "./CreateRouteDialog";
import AssignPointsDialog from "./AssignCustomersDialog";
import RouteDrawer from "./RouteDrawer";
import { routeService } from "../../services/routeService";

/* ---------- Minimal & functional Assigned Customers cell ---------- */
function AssignedPointsCell({ points = [] }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [q, setQ] = useState('');

  const top = points.slice(0, 2);
  const hidden = Math.max(0, points.length - top.length);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return points;
    return points.filter(p => p.name?.toLowerCase().includes(t));
  }, [points, q]);

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          minHeight: 36,
          maxWidth: 420,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {top.length > 0 ? (
          <Typography
            variant="body2"
            sx={{
              flexShrink: 1,
              color: 'text.primary',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={top.map(p => p.name).join(', ')}
          >
            {top.map(p => p.name).join(', ')}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No points assigned
          </Typography>
        )}

        {hidden > 0 && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setAnchorEl(e.currentTarget);
            }}
            role="button"
            aria-label={`${hidden} more points`}
            sx={(theme) => ({
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: 12,
              border: `1px solid ${theme.palette.divider}`,
              color: theme.palette.text.secondary,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
                color: theme.palette.text.primary,
              },
            })}
          >
            +{hidden} more
          </Box>
        )}
      </Stack>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 340, p: 1.5, borderRadius: 2 } } }}
      >
        <Stack spacing={1.25}>
          <TextField
            size="small"
            placeholder="Search points"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            variant="outlined"
            sx={{ input: { fontSize: 14 } }}
          />
          <Divider />
          <List dense sx={{ maxHeight: 300, overflowY: 'auto', p: 0 }}>
            {filtered.map((p, idx) => (
              <ListItem 
                key={p.partyId || idx} 
                disableGutters
                sx={{
                  px: 1,
                  borderRadius: '6px',
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.035)'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" color="text.primary" fontWeight={500} noWrap>
                      {p.name}
                    </Typography>
                  }
                  secondary={p.partyType === "CUSTOMER" ? "Customer" : "Laundry Vendor"}
                  secondaryTypographyProps={{ fontSize: 11, color: 'text.secondary' }}
                />
              </ListItem>
            ))}
            {filtered.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
                No matches found
              </Typography>
            )}
          </List>
        </Stack>
      </Popover>
    </>
  );
}

function RouteManagementPage() {
  const [routes, setRoutes] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await routeService.getRoutes();
      setRoutes(data);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleRouteUpdate = async () => {
    if (drawerOpen && selectedRoute) {
      try {
        const data = await routeService.getRoutes();
        setRoutes(data);
        const updated = data.find(r => r.id === selectedRoute.id);
        if (updated) {
          setSelectedRoute(updated);
        }
      } catch (error) {
        console.error('Error updating selected route details:', error);
      }
    } else {
      fetchRoutes();
    }
  };

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter((r) => {
      const name = r?.name?.toLowerCase() ?? '';
      const idStr = String(r?.id ?? '').toLowerCase();
      const pointsStr = (r?.points ?? [])
        .map((p) => p?.name?.toLowerCase?.() ?? '')
        .join(' ');
      return (
        name.includes(q) || idStr.includes(q) || pointsStr.includes(q)
      );
    });
  }, [routes, searchQuery]);

  const columns = [
    {
      field: 'id',
      headerName: 'Route ID',
      type: 'number',
      width: 60
    },
    {
      field: 'name',
      headerName: 'Route Name',
      type: 'text',
      width: 260,
      render: (name) => <strong>{name}</strong>
    },
    {
      field: 'points',
      headerName: 'Assigned Points',
      type: 'longText',
      width: 200,
      render: (points) => <AssignedPointsCell points={points || []} />
    },
    {
      field: 'actions',
      headerName: 'Actions',
      align: 'right',
      width: 80,
      render: (_, route) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Assign Points">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedRoute(route);
                setOpenAssignDialog(true);
              }}
            >
              <AssignmentIndIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <FilterPanel
        title="Route Management"
        actions={
          <GreenButton onClick={() => setOpenCreateDialog(true)}>
            Create Route
          </GreenButton>
        }
      >
        <Box sx={{ width: 280, minWidth: 220 }}>
          <TextField
            size="small"
            label="Search Routes"
            placeholder="Route name, ID, or customer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{ "& .MuiInputBase-root": { borderRadius: 1 } }}
          />
        </Box>
      </FilterPanel>

      <DataTable
        columns={columns}
        rows={filteredRoutes}
        rowKey="id"
        onRowClick={(route) => {
          setSelectedRoute(route);
          setDrawerOpen(true);
        }}
      />

      <RouteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        route={selectedRoute}
        onUnassigned={handleRouteUpdate}
        onAssignPoints={() => setOpenAssignDialog(true)}
        onDeactivated={() => {
          setDrawerOpen(false);
          fetchRoutes();
        }}
      />

      <CreateRouteDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onCreated={fetchRoutes}
      />

      <AssignPointsDialog
        open={openAssignDialog}
        onClose={() => setOpenAssignDialog(false)}
        route={selectedRoute}
        onAssigned={fetchRoutes}
      />
    </Container>
  );
}

export default RouteManagementPage;
