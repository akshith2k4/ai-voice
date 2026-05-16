import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { format } from 'date-fns';
import issueService from '../../services/issueService.jsx';

const RESOLUTION_TYPES = [
  'DAMAGE_REQUEST_RAISED',
  'REWASHED',
  'WASHED',
];

export default function ResolveIssueDialog({ open, issueId, onClose, onResolved }) {
  const [resType, setResType] = React.useState('');
  const [resNotes, setResNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [resolvedAt, setResolvedAt] = React.useState(null);

  // Normalize possible dayjs or date-like values to Date
  const asDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.$d instanceof Date) return v.$d;
    const parsed = new Date(v);
    return isNaN(parsed?.getTime?.()) ? null : parsed;
  };

  React.useEffect(() => {
    if (open) {
      setResType('');
      setResNotes('');
      setSubmitting(false);
      // Default to current local date-time when dialog opens
      setResolvedAt(new Date());
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!resType || !issueId) return;
    setSubmitting(true);
    try {
      const resp = await issueService.resolve(issueId, {
        resolutionType: resType,
        resolvedById: undefined,
        resolvedAt: (function() { const d = asDate(resolvedAt); return d ? format(d, "yyyy-MM-dd'T'HH:mm:ss") : undefined; })(),
        notes: resNotes || undefined,
      });
      onResolved?.(resp);
      onClose?.();
    } catch (e) {
      // TODO: surface via snackbar
      console.error('Failed to resolve issue', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Resolve Issue</DialogTitle>
      <DialogContent dividers>
        <DateTimePicker
          label="Resolved At"
          value={resolvedAt}
          onChange={(v) => setResolvedAt(v)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />

        <TextField
          select
          label="Resolution Type"
          fullWidth
          size="small"
          sx={{ mt: 2, mb: 2 }}
          value={resType}
          onChange={(e) => setResType(e.target.value)}
        >
          {RESOLUTION_TYPES.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Notes (optional)"
          fullWidth
          size="small"
          value={resNotes}
          onChange={(e) => setResNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="success" sx={{ color: '#fff' }} disabled={!resType || submitting}>
          {submitting ? 'Resolving…' : 'Resolve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
