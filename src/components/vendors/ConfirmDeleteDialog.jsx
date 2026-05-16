import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

function ConfirmDeleteDialog({ open, onClose, onConfirm, vendorName }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the vendor <strong>{vendorName}</strong>?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={onConfirm} color="secondary">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmDeleteDialog; 