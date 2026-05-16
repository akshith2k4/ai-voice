import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  ContentPasteGo as PasteIcon,
  ClearAll as ClearIcon,
} from '@mui/icons-material';
import { parseItemIds } from '../../utils/inventoryUtils';

export default function BulkSearchDialog({ open, onClose, onSearch, initialValue = '' }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText(initialValue);
  }, [open, initialValue]);

  const parsedIds = useMemo(
    () => parseItemIds(text),
    [text],
  );

  const uniqueIds = useMemo(() => [...new Set(parsedIds)], [parsedIds]);
  const dupeCount = parsedIds.length - uniqueIds.length;

  const handleSubmit = () => {
    if (uniqueIds.length === 0) return;
    onSearch(uniqueIds.join(', '));
    onClose();
  };

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      const cleaned = clip.replace(/[^\d,\s]/g, '');
      setText((prev) => (prev ? prev + ', ' + cleaned : cleaned));
    } catch { /* clipboard permission denied */ }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'hidden' },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Bulk Item ID Search
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Paste inventory item IDs separated by commas
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: 2 }}>
        <textarea
          autoFocus
          placeholder="113846, 113863, 113935, 113953, 113968..."
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d,\s]/g, ''))}
          rows={6}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#4caf50'; }}
          onBlur={(e) => { e.target.style.borderColor = '#ccc'; }}
        />

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            {parsedIds.length > 0 && (
              <Chip
                label={`${uniqueIds.length} unique IDs`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
            {dupeCount > 0 && (
              <Chip
                label={`${dupeCount} duplicate${dupeCount > 1 ? 's' : ''} removed`}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PasteIcon />}
              onClick={handlePaste}
            >
              Paste
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<ClearIcon />}
              onClick={() => setText('')}
              disabled={!text}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={handleSubmit}
          disabled={uniqueIds.length === 0}
          sx={{
            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            px: 3,
            '&:hover': { background: 'linear-gradient(135deg, #43a047 0%, #1b5e20 100%)' },
          }}
        >
          Search {uniqueIds.length > 0 ? `(${uniqueIds.length} IDs)` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
