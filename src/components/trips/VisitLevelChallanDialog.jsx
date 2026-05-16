import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import ImageUploadPanel from "../common/ImageUploadPanel";

export default function VisitLevelChallanDialog({
  open,
  onClose,
  visit,
  challanNumber,
  onChallanNumberChange,
  onSubmit,
  submitting,
}) {
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const cancelledUploadsRef = useRef(new Set());

  useEffect(() => {
    if (!open) {
      uploadPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
      setUploadPreviews([]);
      cancelledUploadsRef.current = new Set();
    }
  }, [open, uploadPreviews]);

  const onUploadImages = async (filesLike) => {
    const files = Array.from(filesLike || []).filter(
      (file) => file && file.type?.startsWith("image/")
    );
    if (!files.length) return;

    const entries = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setUploadPreviews(entries.slice(0, 1));
  };

  const removePreview = (id) => {
    cancelledUploadsRef.current.add(id);
    const found = uploadPreviews.find((preview) => preview.id === id);
    if (found) URL.revokeObjectURL(found.url);
    setUploadPreviews((prev) => prev.filter((preview) => preview.id !== id));
  };

  const clearAllImages = () => {
    uploadPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setUploadPreviews([]);
    cancelledUploadsRef.current = new Set();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Scan Delivery Challan</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          margin="normal"
          label="Delivery Challan Number"
          value={challanNumber}
          onChange={(event) => onChallanNumberChange(event.target.value)}
        />

        <ImageUploadPanel
          images={[]}
          uploadPreviews={uploadPreviews}
          imageLoading={{}}
          onUploadImages={onUploadImages}
          clearAllImages={clearAllImages}
          removePreview={removePreview}
          removeImage={() => {}}
          setImageLoading={() => {}}
          title="Delivery Challan Upload"
          dropzoneMinHeight={220}
          previewWidth={{ xs: 64, md: 72 }}
          previewHeight={{ xs: 64, md: 72 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={submitting || !uploadPreviews.length}
          onClick={() => {
            const selectedFile = uploadPreviews[0]?.file;
            if (selectedFile) {
              onSubmit(selectedFile);
            }
          }}
        >
          {submitting ? "Uploading..." : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
