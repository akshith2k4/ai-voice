import { useState } from 'react';
import { Fab, Tooltip, Snackbar, ClickAwayListener, Box } from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Close as CloseIcon,
  TableChart as TableChartIcon,
  TagRounded as CommaIcon,
  ViewHeadline as NewlineIcon,
} from '@mui/icons-material';
import { formatInventoryForClipboard } from './inventoryUtils';

const ACTION_SIZE = 40;
const GAP = 12;

const actions = [
  { key: 'table',   icon: <TableChartIcon fontSize="small" />, tip: 'Copy as table' },
  { key: 'comma',   icon: <CommaIcon fontSize="small" />,     tip: 'Copy IDs (comma)' },
  { key: 'newline', icon: <NewlineIcon fontSize="small" />,    tip: 'Copy IDs (newline)' },
];

export default function CopyInventoryButton({ items }) {
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message });
      setOpen(false);
    });
  };

  const handlers = {
    table() {
      copyToClipboard(formatInventoryForClipboard(items), `Copied ${items.length} rows`);
    },
    comma() {
      copyToClipboard(items.map((i) => i.id).filter(Boolean).join(', '), `Copied ${items.length} IDs (comma)`);
    },
    newline() {
      copyToClipboard(items.map((i) => i.id).filter(Boolean).join('\n'), `Copied ${items.length} IDs (newline)`);
    },
  };

  return (
    <>
      <ClickAwayListener onClickAway={() => setOpen(false)}>
        <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1050 }}>
          {/* Action mini-fabs that fan out upward */}
          {actions.map((action, index) => (
            <Tooltip key={action.key} title={action.tip} placement="left" arrow>
              <Box
                onClick={() => handlers[action.key]()}
                sx={{
                  position: 'absolute',
                  bottom: open ? (index + 1) * (ACTION_SIZE + GAP) : 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: ACTION_SIZE,
                  height: ACTION_SIZE,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  boxShadow: 3,
                  cursor: 'pointer',
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? 'auto' : 'none',
                  transition: `all 0.25s cubic-bezier(.4,0,.2,1) ${open ? index * 50 : (actions.length - 1 - index) * 30}ms`,
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                  },
                }}
              >
                {action.icon}
              </Box>
            </Tooltip>
          ))}

          {/* Main FAB */}
          <Fab
            color="primary"
            size="medium"
            onClick={() => setOpen((v) => !v)}
            sx={{
              position: 'relative',
              transition: 'transform 0.25s ease',
              transform: open ? 'rotate(45deg)' : 'none',
            }}
          >
            {open ? <CloseIcon /> : <ContentCopyIcon />}
          </Fab>
        </Box>
      </ClickAwayListener>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
}
