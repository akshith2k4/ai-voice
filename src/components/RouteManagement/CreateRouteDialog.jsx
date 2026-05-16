import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  InputAdornment,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { Route as RouteIcon } from '@mui/icons-material';
import { routeService } from '../../services/routeService';
import { inventoryService } from '../../services/inventoryService.jsx';
import { useDcid } from '../../context/DcidContext.jsx';

function CreateRouteDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { dcid } = useDcid();

  // Warehouses dropdown state (read-only UI)
  const [warehouses, setWarehouses] = useState([]);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Fetch warehouses when dialog opens
  useEffect(() => {
    let ignore = false;
    async function fetchWh() {
      if (!open) return;
      setWhLoading(true);
      setWhError('');
      try {
        const list = await inventoryService.getWarehouses();
        if (ignore) return;
        setWarehouses(list);
        // Prefer currently selected DC if present; fallback to first
        const dcMatch = list.find((w) => String(w.id) === String(dcid));
        setSelectedWarehouseId(dcMatch?.id ?? list[0]?.id ?? '');
      } catch (e) {
        console.error('Error loading warehouses:', e);
        if (!ignore) setWhError('Failed to load warehouses');
      } finally {
        if (!ignore) setWhLoading(false);
      }
    }
    fetchWh();
    return () => {
      ignore = true;
    };
  }, [open, dcid]);

  const selectedWarehouseName = useMemo(() => {
    const found = warehouses.find((w) => String(w.id) === String(selectedWarehouseId));
    return found?.name ?? '';
  }, [warehouses, selectedWarehouseId]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setError('Please enter at least 3 characters.');
      return;
    }

    setLoading(true);
    try {
      await routeService.createRoute(trimmed);
      setName('');
      setError('');
      onCreated?.();
      onClose?.();
    } catch (e) {
      console.error('Error creating route:', e);
      setError('Failed to create route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    setWarehouses([]);
    setWhError('');
    setWhLoading(false);
    setSelectedWarehouseId('');
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 1 } }}
    >
      <DialogTitle
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RouteIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Create Route
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {/* Give your route a short, clear name. */}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth size="small" disabled>
              <InputLabel id="warehouse-select-label">Warehouse</InputLabel>
              <Select
                labelId="warehouse-select-label"
                label="Warehouse"
                value={selectedWarehouseId}
                onChange={() => {}}
              >
                {whLoading && (
                  <MenuItem value="" disabled>
                    Loading warehouses...
                  </MenuItem>
                )}
                {!whLoading && warehouses.length === 0 && (
                  <MenuItem value="" disabled>
                    No warehouses found
                  </MenuItem>
                )}
                {!whLoading && warehouses.map((w) => (
                  <MenuItem key={w.id ?? w.name} value={w.id}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Route Name"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., North Zone Morning"
              error={Boolean(error)}
              helperText={error || ' '}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <RouteIcon sx={{ color: 'action.active' }} fontSize="small" />
                  </InputAdornment>
                )
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              autoFocus
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          color="success"
          disabled={name.trim().length < 3 || loading}
          sx={{ textTransform: 'none' }}
        >
          {loading ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} color="inherit" thickness={5} />
              Creating...
            </Box>
          ) : (
            'Create'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateRouteDialog;
