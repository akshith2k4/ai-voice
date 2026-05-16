import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Stack,
  Divider,
  Typography,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

// ⬇️ Extracted row component – keeps main file tidy
const VisitItemRow = ({ item, index, orders, handleChange, handleRemove }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2,
      bgcolor: index % 2 ? "action.hover" : "background.paper",
    }}
  >
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} sm={4}>
        <FormControl fullWidth size="small">
          <InputLabel>Order</InputLabel>
          <Select
            value={item.orderId}
            label="Order"
            onChange={(e) => handleChange(index, "orderId", e.target.value)}
          >
            {orders.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.referenceNumber}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Delivery Type</InputLabel>
          <Select
            value={item.deliveryType}
            label="Delivery Type"
            onChange={(e) =>
              handleChange(index, "deliveryType", e.target.value)
            }
          >
            <MenuItem value="DELIVERY">Delivery</MenuItem>
            <MenuItem value="PICKUP">Pickup</MenuItem>
            <MenuItem value="BOTH">Both</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          label="Remarks"
          size="small"
          fullWidth
          value={item.remarks}
          onChange={(e) => handleChange(index, "remarks", e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={1} sx={{ textAlign: { sm: "center" } }}>
        <IconButton
          aria-label="remove item"
          onClick={() => handleRemove(index)}
        >
          <DeleteIcon color="error" />
        </IconButton>
      </Grid>
    </Grid>
  </Paper>
);

const AddVisitDialog = ({
  open,
  onClose,
  /* …all your props (customers, visitItems, handlers) … */
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    scroll="paper"
  >
    <DialogTitle>Add Visit</DialogTitle>

    <DialogContent dividers>
      {/* 1️⃣ Customer Select */}
      <Stack spacing={2}>
        <Autocomplete
          options={customers}
          getOptionLabel={(o) => o.name}
          onInputChange={handleCustomerInputChange}
          onChange={(e, v) => {
            setSelectedCustomer(v);
            if (v) fetchIncompleteOrders(v.id);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Select Customer"
              helperText="Start typing to search customers"
            />
          )}
        />

        <Divider textAlign="left">
          <Typography variant="subtitle2" fontWeight={600}>
            Visit Items
          </Typography>
        </Divider>

        {/* 2️⃣ Visit Items */}
        <Stack spacing={2}>
          {visitItems.map((item, idx) => (
            <VisitItemRow
              key={idx}
              index={idx}
              item={item}
              orders={orders}
              handleChange={handleChange}
              handleRemove={handleRemoveItem}
            />
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            sx={{ alignSelf: "flex-start" }}
          >
            Add Item
          </Button>
        </Stack>

        <Divider sx={{ mt: 3 }} />

        {/* 3️⃣ Meta Info */}
        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          margin="normal"
        />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Planned Time"
              type="datetime-local"
              value={plannedTime}
              onChange={(e) => setPlannedTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="visit-flow-type-label">
                Visit Flow Type
              </InputLabel>
              <Select
                labelId="visit-flow-type-label"
                value={visitFlowType}
                label="Visit Flow Type"
                onChange={(e) => setVisitFlowType(e.target.value)}
              >
                {["TAGGED", "UNTAGGED"].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <TextField
          label="Sequence Number"
          value={sequenceNumber}
          onChange={(e) => setSequenceNumber(e.target.value)}
          fullWidth
          margin="normal"
          size="small"
        />
      </Stack>
    </DialogContent>

    <DialogActions>
      <Button onClick={onClose} color="secondary">
        Cancel
      </Button>
      <Button onClick={handleAddVisit} variant="contained">
        Save
      </Button>
    </DialogActions>
  </Dialog>
);

export default AddVisitDialog;
