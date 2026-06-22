import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Divider,
  IconButton,
  CircularProgress,
  Stack,
  Button,
  Avatar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import CustomDrawer from '../common/CustomDrawer';
import GreenButton from '../common/GreenButton';
import CustomSnackbar from '../layout/CustomSnackbar';
import { routeService } from '../../services/routeService';

function RouteDrawer({ open, onClose, route, onUnassigned, onAssignPoints, onDeactivated }) {
  const [unassigningPartyId, setUnassigningPartyId] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [localPoints, setLocalPoints] = useState([]);
  const [savingSequence, setSavingSequence] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (route?.points) {
      const sorted = [...route.points].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      setLocalPoints(sorted);
    } else {
      setLocalPoints([]);
    }
  }, [route]);

  const handleDeactivate = async () => {
    const isConfirmed = window.confirm(`Are you sure you want to deactivate the route "${route.name}"?\n\nThis will soft-delete the route, and it will no longer be available for trip scheduling or point assignment.`);
    if (!isConfirmed) return;

    setDeactivating(true);
    try {
      await routeService.deleteRoute(route.id);
      if (onDeactivated) {
        onDeactivated();
      }
    } catch (error) {
      console.error("Failed to deactivate route:", error);
    } finally {
      setDeactivating(false);
    }
  };

  const handleUnassign = useCallback(async (point) => {
    setUnassigningPartyId(point.partyId);
    try {
      await routeService.removePoints(route.id, [{ partyId: point.partyId, partyType: point.partyType }]);
      if (onUnassigned) {
        await onUnassigned();
      }
    } catch (error) {
      console.error("Failed to unassign point:", error);
    } finally {
      setUnassigningPartyId(null);
    }
  }, [route?.id, onUnassigned]);

  // Drag & drop handlers
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("text/plain", String(index));
    // Defer setting state to allow browser default screenshot drag behavior
    setTimeout(() => {
      setDraggedIndex(index);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (fromIndex !== index) {
      setLocalPoints((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(index, 0, moved);
        return next;
      });
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const hasChanges = useMemo(() => {
    if (!route?.points || route.points.length !== localPoints.length) return false;
    for (let i = 0; i < localPoints.length; i++) {
      const orig = route.points[i];
      const curr = localPoints[i];
      if (orig.partyId !== curr.partyId || orig.partyType !== curr.partyType) {
        return true;
      }
    }
    return false;
  }, [route?.points, localPoints]);

  const handleSaveSequence = async () => {
    setSavingSequence(true);
    try {
      const payload = localPoints.map((p, idx) => ({
        partyId: p.partyId,
        partyType: p.partyType,
        sequence: idx + 1
      }));

      await routeService.updatePointsSequence(route.id, payload);
      setSnackbar({
        open: true,
        message: 'Route sequence updated successfully!',
        severity: 'success'
      });
      if (onUnassigned) {
        await onUnassigned();
      }
    } catch (error) {
      console.error('Failed to update route sequence:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update sequence. Please try again.',
        severity: 'error'
      });
    } finally {
      setSavingSequence(false);
    }
  };

  if (!route) return null;

  return (
    <CustomDrawer open={open} onClose={onClose} width={650}>
      <Box 
        sx={{ 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          backgroundColor: 'background.paper', 
          overflowY: 'auto' 
        }}
      >
        {/* Header */}
        <Box
          sx={{
            pb: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2.5
          }}
        >
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Route Details
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content Stack */}
        <Stack spacing={3}>
          <DetailSection title="Route Information">
            <DetailRow label="Name" value={route.name} />
            <DetailRow label="ID" value={route.id} />
            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                disabled={deactivating}
                onClick={handleDeactivate}
                sx={{
                  textTransform: 'none',
                  borderRadius: 1.5,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                {deactivating ? 'Deactivating...' : 'Deactivate Route'}
              </Button>
            </Box>
          </DetailSection>

          <Divider />

          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 1.5,
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{ color: "success.dark", fontWeight: 500 }}
              >
                Assigned Points ({route.points?.length || 0})
              </Typography>

              <Stack direction="row" spacing={1}>
                {hasChanges && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={savingSequence}
                    onClick={handleSaveSequence}
                    sx={{
                      height: 32,
                      fontSize: '0.8rem',
                      px: 2,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      fontWeight: 600,
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 'none' }
                    }}
                    startIcon={savingSequence ? <CircularProgress size={14} color="inherit" /> : null}
                  >
                    {savingSequence ? 'Saving...' : 'Save Sequence'}
                  </Button>
                )}
                <GreenButton
                  size="small"
                  onClick={onAssignPoints}
                  sx={{ height: 32, fontSize: '0.8rem', px: 2 }}
                >
                  Assign Points
                </GreenButton>
              </Stack>
            </Box>
            
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {localPoints.map((p, idx) => {
                const isCustomer = p.partyType === 'CUSTOMER';
                const isDragOver = dragOverIndex === idx;
                const isDragging = draggedIndex === idx;

                return (
                  <Box
                    key={`${p.partyType}-${p.partyId}`}
                    draggable={!savingSequence}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragLeave={() => setDragOverIndex(null)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1.5,
                      border: '1px solid',
                      borderColor: isDragOver ? 'success.main' : 'divider',
                      borderRadius: '8px',
                      bgcolor: isDragOver ? alpha('#4caf50', 0.04) : 'background.paper',
                      outline: isDragOver ? '1.5px solid #4caf50' : 'none',
                      outlineOffset: '-1.5px',
                      boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: savingSequence ? 'default' : 'grab',
                      transition: 'all 0.15s ease',
                      '&:active': { cursor: savingSequence ? 'default' : 'grabbing' },
                      '&:hover': {
                        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : '0 4px 12px rgba(0,0,0,0.06)',
                        borderColor: isDragOver ? 'success.main' : 'rgba(0, 0, 0, 0.15)',
                      }
                    }}
                  >
                    {/* Drag Handle Icon */}
                    <Box 
                      sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        color: 'text.secondary', 
                        mr: 1.5, 
                        opacity: savingSequence ? 0.2 : 0.6 
                      }}
                    >
                      <DragIndicatorIcon sx={{ fontSize: 20 }} />
                    </Box>

                    {/* Sequence Badge */}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 700, 
                        minWidth: 24, 
                        color: 'text.secondary', 
                        mr: 1 
                      }}
                    >
                      {idx + 1}.
                    </Typography>

                    {/* Avatar */}
                    <Avatar 
                      sx={{ 
                        bgcolor: 'rgba(0, 0, 0, 0.03)',
                        color: 'text.secondary',
                        width: 30, 
                        height: 30,
                        mr: 2
                      }}
                    >
                      {isCustomer ? <PersonIcon fontSize="small" sx={{ fontSize: 16 }} /> : <BusinessIcon fontSize="small" sx={{ fontSize: 16 }} />}
                    </Avatar>

                    {/* Stop Details */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, noWrap: true }}>
                        {p.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isCustomer ? 'Customer' : 'Laundry Vendor'}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <IconButton
                      size="small"
                      color="error"
                      disabled={unassigningPartyId === p.partyId || savingSequence}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnassign(p);
                      }}
                    >
                      {unassigningPartyId === p.partyId ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Box>
                );
              })}
              {localPoints.length === 0 && (
                <Box py={5} textAlign="center" sx={{ border: '1.5px dashed', borderColor: 'divider', borderRadius: '8px' }}>
                  <Typography variant="body2" color="text.secondary">
                    No points assigned to this route.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>

      <CustomSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />
    </CustomDrawer>
  );
}

function DetailSection({ title, children }) {
  return (
    <Box sx={{ p: 0 }}>
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

export default RouteDrawer;
