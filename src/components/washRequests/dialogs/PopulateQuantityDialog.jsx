// src/components/washRequests/dialogs/PopulateQuantityDialog.jsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';

function PopulateQuantityDialog({ open, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState("");

  const handleSubmit = () => {
    const parsedQty = parseInt(quantity, 10);

    if (!parsedQty || parsedQty <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    onSubmit(parsedQty);
    setQuantity(""); // Reset after submission
  };

  return (
    <Dialog open={open} onClose={() => {
      setQuantity(""); // Clear on cancel
      onClose();
    }}>
      <DialogTitle>Enter quantity you want to populate</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Quantity"
          type="number"
          fullWidth
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputProps={{ min: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          setQuantity(""); // Clear on cancel
          onClose();
        }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Populate</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PopulateQuantityDialog;
