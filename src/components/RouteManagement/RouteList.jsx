import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Popover,
  TextField,
  List,
  ListItem,
  ListItemText,
  Stack,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import VisibilityIcon from '@mui/icons-material/Visibility';

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
            onClick={(e) => setAnchorEl(e.currentTarget)}
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
          <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {filtered.map((p, idx) => (
              <ListItem key={p.partyId || idx} disableGutters>
                <ListItemText
                  primary={p.name}
                  secondary={p.partyType === "CUSTOMER" ? "Customer" : "Laundry Vendor"}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'text.primary',
                    noWrap: true,
                  }}
                  secondaryTypographyProps={{ fontSize: 11 }}
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

/* ---------- Table layout (unchanged except for AssignedCustomersCell) ---------- */
function RouteList({ routes, onAssign, onViewDetails }) {
  return (
    <TableContainer component={Paper} elevation={3}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Route Name</TableCell>
            <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Route ID</TableCell>
            <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Assigned Points</TableCell>
            <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {routes.map((route) => (
            <TableRow
              key={route.id}
              hover
              onClick={() => onViewDetails(route)}
              sx={{
                cursor: 'pointer',
                '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
                '& td': { py: 1 },
              }}
            >
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  <strong>{route.name}</strong>
                </Typography>
              </TableCell>

              <TableCell>{route.id}</TableCell>

              <TableCell>
                <AssignedPointsCell points={route.points || []} />
              </TableCell>

              <TableCell align="right">
                <Tooltip title="View Details">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(route);
                    }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Assign Points">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign(route);
                    }}
                  >
                    <AssignmentIndIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}

          {routes.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                No routes found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default RouteList;
