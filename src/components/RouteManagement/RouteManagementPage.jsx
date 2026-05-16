import React, { useState, useEffect, useMemo } from "react";
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Grid,
  TextField,
  InputAdornment,
  CircularProgress
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import CreateRouteDialog from "./CreateRouteDialog";
import AssignPointsDialog from "./AssignCustomersDialog";
import RouteList from "./RouteList";
import RouteDrawer from "./RouteDrawer";
import CustomSnackbar from '../layout/CustomSnackbar';
import { routeService } from "../../services/routeService";

function RouteManagementPage() {
  const [routes, setRoutes] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, _setSnackbarMessage] = useState('');
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

  // Filter routes by name, id, or assigned customer names (case-insensitive)
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

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Route Management
        </Typography>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Route name, ID, or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1, maxWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: '40px'},
                // sx: { height: '40px', width: '360px'},
              }}
            />
          </Grid>
          <Grid>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
                textTransform: 'none',
              }}
            >
              Create Route
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <RouteList
        routes={filteredRoutes}
        onAssign={(route) => {
          setSelectedRoute(route);
          setOpenAssignDialog(true);
        }}
        onViewDetails={(route) => {
          setSelectedRoute(route);
          setDrawerOpen(true);
        }}
      />

      <RouteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        route={selectedRoute}
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

      <CustomSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
}

export default RouteManagementPage;
