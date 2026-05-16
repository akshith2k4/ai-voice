import React from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const iconMap = {
  success: <CheckCircleIcon fontSize="inherit" />,
  error: <ErrorIcon fontSize="inherit" />,
  warning: <WarningIcon fontSize="inherit" />,
  info: <InfoIcon fontSize="inherit" />,
};

const severityColors = {
  success: '#2e7d32',
  error: '#c62828',
  warning: '#ed6c02',
  info: '#0277bd',
};

function CustomSnackbar({
  open,
  message,
  title,
  onClose,
  severity = 'info',
  autoHideDuration = 5000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'center' },
  actionLabel = null,
  onActionClick = null,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const action = (
    <>
      {actionLabel && onActionClick && (
        <IconButton
          size="small"
          aria-label={actionLabel}
          onClick={onActionClick}
          sx={{ color: 'inherit' }}
        >
          <UndoIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton
        size="small"
        aria-label="close"
        onClick={onClose}
        sx={{ color: 'inherit' }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </>
  );

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      TransitionComponent={isMobile ? Fade : SlideTransition}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        icon={iconMap[severity]}
        action={action}
        sx={{
          width: '100%',
          maxWidth: 400,
          mx: 'auto',
          boxShadow: 4,
          borderRadius: 2,
          bgcolor: severityColors[severity],
          color: '#fff',
          fontSize: '0.95rem',
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 600 }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Snackbar>
  );
}

export default CustomSnackbar;
