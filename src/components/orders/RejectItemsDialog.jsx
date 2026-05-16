import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Typography,
} from "@mui/material";

import { orderService } from "../../services/orderService";
import UploadImages from "../orders/UploadImages";
import QuantityScanInput from "../Scanner/QuantityScanInput";
import ScannerHeader from "../Scanner/ScannerHeader";

const REJECTION_ISSUE_TYPES = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "STAINED", label: "Stained" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
];

function RejectItemsDialog({
  isRejectDialogOpen,
  onRejectDialogClose,
  deliveryItems,
  rejectionRequests,
  customerId,
  orderId,
  onRejectRequestCreated,
}) {
  // form state for rejection request
  const [rejectionFormData, setRejectionFormData] = useState({
    productId: "",
    quantity: "",
    date: "",
    issueType: "",
    remarks: "",
    images: [],
  });

  // loading state while submit API
  const [isCallingApi, setIsCallingApi] = useState(false);
  //scan stated
  const [scannerStatus, setScannerStatus] = useState("IDLE");
  const [scanPreview, setScanPreview] = useState([]);

  // reset form every time dialog opens
  useEffect(() => {
    if (!isRejectDialogOpen) return;

    const todayDate = new Date().toISOString().split("T")[0];

    setRejectionFormData({
      productId: "",
      quantity: 0,
      date: todayDate,
      issueType: "",
      remarks: "",
      images: [],
    });
    setScannerStatus("IDLE");
    setScanPreview([]);
  }, [isRejectDialogOpen]);

  // update form fields
  const updateFormField = (field, value) =>
    setRejectionFormData((prev) => ({ ...prev, [field]: value }));

  // validation for required fields and qty rule
  const validateRejectForm = () => {
    const { productId, quantity, date, issueType } = rejectionFormData;

    // required field check
    if (
      !productId ||
      quantity === "" ||
      Number(quantity) <= 0 ||
      !date ||
      !issueType
    ) {
      alert("Please fill all required fields");
      return false;
    }

    return true;
  };

  // submit rejection request API
  const handleRejectRequestSubmit = async () => {
    if (!validateRejectForm()) return; // validate first

    try {
      setIsCallingApi(true);

      // prepare payload
      const payload = {
        ...rejectionFormData,
        productId: Number(rejectionFormData.productId),
        quantity: Number(rejectionFormData.quantity),
        requestedDate: `${rejectionFormData.date}T00:00:00`,
        requestedBy: customerId,
      };

      // call API
      const saved = await orderService.createRejectionRequest(orderId, payload);

      // callback to parent
      if (onRejectRequestCreated) {
        onRejectRequestCreated(saved);
      }

      // close dialog
      onRejectDialogClose();
    } catch (err) {
      // backend error alert
      alert(err?.response?.data?.message || err.message);
    } finally {
      setIsCallingApi(false); // end loading
    }
  };

  if (!isRejectDialogOpen) return null;

  return (
    <>
      <Dialog
        open={isRejectDialogOpen}
        onClose={onRejectDialogClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Rejection Request</DialogTitle>

        <DialogContent>
          <ScannerHeader
            status={scannerStatus}
            scannedCount={Number(rejectionFormData.quantity) || 0}
            scanPreview={scanPreview}
            onCancel={() => {
              setScannerStatus("IDLE");
              setScanPreview([]);
              updateFormField("quantity", 0);
            }}
          />
          <Box display="flex" gap={2} mt={1}>
            <TextField
              select
              fullWidth
              label="Item"
              value={rejectionFormData.productId}
              onChange={(e) => updateFormField("productId", e.target.value)}
            >
              {deliveryItems.map((it) => (
                <MenuItem key={it.productId} value={it.productId}>
                  {it.productName}
                </MenuItem>
              ))}
            </TextField>

            <QuantityScanInput
              label="Qty"
              value={rejectionFormData.quantity || 0}
              onChange={(val) => updateFormField("quantity", val)}
              quantityType="OVERALL"
              referenceId={orderId}
              productId={rejectionFormData.productId}
              disabled={!rejectionFormData.productId}
              showScan={true}
              fieldWidth={210}
              onScanStart={() => setScannerStatus("ACTIVE")}
              onScanStop={() => setScannerStatus("IDLE")}
            />
          </Box>

          <TextField
            sx={{ mt: 2 }}
            fullWidth
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={rejectionFormData.date}
            onChange={(e) => updateFormField("date", e.target.value)}
          />

          <Box mt={3}>
            <Typography>Issue Type</Typography>
            <RadioGroup
              value={rejectionFormData.issueType}
              onChange={(e) => updateFormField("issueType", e.target.value)}
            >
              {REJECTION_ISSUE_TYPES.map((issue) => (
                <FormControlLabel
                  key={issue.value}
                  value={issue.value}
                  label={issue.label}
                  control={<Radio />}
                />
              ))}
            </RadioGroup>
          </Box>

          <UploadImages
            images={rejectionFormData.images}
            onChange={(imgs) => updateFormField("images", imgs)}
          />

          <TextField
            multiline
            sx={{ mt: 2 }}
            fullWidth
            label="Remarks"
            value={rejectionFormData.remarks}
            onChange={(e) => updateFormField("remarks", e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button disabled={isCallingApi} onClick={onRejectDialogClose}>
            Cancel
          </Button>

          <Button
            disabled={isCallingApi}
            variant="contained"
            color="error"
            onClick={handleRejectRequestSubmit}
          >
            {isCallingApi ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default RejectItemsDialog;
