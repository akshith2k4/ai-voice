import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';

/**
 * Reusable confirmation dialog with optional warning alert.
 *
 * @param {boolean}  open          - Whether the dialog is visible
 * @param {function} onClose       - Called when dialog is dismissed
 * @param {function} onConfirm     - Called when confirm button is clicked
 * @param {string}   title         - Dialog title
 * @param {string}   message       - Main message body
 * @param {string}   [warning]     - Optional warning alert text shown above the message
 * @param {string}   [confirmText] - Confirm button label (default: "Confirm")
 * @param {string}   [cancelText]  - Cancel button label (default: "Cancel")
 * @param {string}   [confirmColor]- Confirm button color (default: "primary")
 * @param {boolean}  [loading]     - Disables buttons and shows loading text
 * @param {string}   [loadingText] - Text shown on confirm button while loading
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm",
  message = "Are you sure?",
  warning,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "primary",
  loading = false,
  loadingText = "Processing...",
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {warning && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {warning}
          </Alert>
        )}
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? loadingText : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
