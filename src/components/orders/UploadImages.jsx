import React, { useState } from "react";
import { Box, Button, Paper, CircularProgress } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";

import CustomSnackbar from "../layout/CustomSnackbar";
import { issueService } from "../../services/issueService";

const UploadImages = ({ images, onChange }) => {
  const [uploading, setUploading] = useState(false);

  // Track each image's upload state: pending | success | failed
  const [status, setStatus] = useState([]);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "error",
  });

  const getPreviewSrc = (img) => {
    // Existing image from backend
    if (typeof img === "string") {
      return img;
    }

    // New uploaded file
    return URL.createObjectURL(img);
  };

  const showSnack = (message, severity = "error") =>
    setSnack({ open: true, message, severity });

  const closeSnack = () => setSnack((p) => ({ ...p, open: false }));

  // ⬇️ Upload multiple files
  const uploadFiles = async (files, startIndex, currentImages) => {
    setUploading(true);

    try {
      const results = await Promise.allSettled(
        files.map((file) => issueService.uploadImage(file))
      );

      const newImages = [...currentImages];

      setStatus((prev) => {
        const next = [...prev];

        results.forEach((r, idx) => {
          const index = startIndex + idx;

          if (r.status === "fulfilled") {
            newImages[index] = r.value;
            next[index] = "success";
          } else {
            next[index] = "failed";
          }
        });

        return next;
      });

      onChange(newImages);
      const failed = results.filter((x) => x.status === "rejected").length;

      if (failed > 0) showSnack(`${failed} images failed to upload`, "error");
      else showSnack("Images uploaded successfully", "success");
    } finally {
      setUploading(false);
    }
  };

  // ⬇️ Retry upload
  const retryUpload = async (index, originalFile) => {
    showSnack("Retrying upload...", "info");

    try {
      setStatus((prev) => {
        const updated = [...prev];
        updated[index] = "pending";
        return updated;
      });

      const uploaded = await issueService.uploadImage(originalFile);

      const newImages = [...images];
      newImages[index] = uploaded;
      setStatus((prev) => {
        const next = [...prev];
        next[index] = "success";
        return next;
      });

      onChange(newImages);

      showSnack("Retry successful!", "success");
    } catch {
      showSnack("Retry failed again", "error");
    }
  };

  // Select files
  const onSelectFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;

    selected.forEach((file) => {
      file._original = file;
      file._previewUrl = URL.createObjectURL(file); // 🔥 ADD THIS LINE
    });
    const startIndex = images.length;
    const updatedImages = [...images, ...selected.map((f) => f._previewUrl)];

    onChange(updatedImages);

    setStatus((prev) => {
      const next = [...prev];
      selected.forEach((_, i) => {
        next[startIndex + i] = "pending";
      });
      return next;
    });

    uploadFiles(selected, startIndex, updatedImages);
  };
  // Remove image
  const removeImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedStatus = status.filter((_, i) => i !== index);

    onChange(updatedImages);
    setStatus(updatedStatus);
  };

  return (
    <>
      <Box mt={2}>
        <Button variant="contained" component="label">
          Upload Images
          <input type="file" hidden multiple onChange={onSelectFiles} />
        </Button>

        {uploading && <span style={{ marginLeft: 10 }}>Uploading...</span>}

        <Box mt={2} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <Paper
              key={i}
              elevation={2}
              sx={{
                width: 80,
                height: 80,
                position: "relative",
                borderRadius: 1,
              }}
            >
              {/* SUCCESS IMAGE */}
              {img && status[i] !== "pending" && status[i] !== "failed" && (
                <img
                  src={getPreviewSrc(img)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
              )}

              {/* 🔥 PENDING (LOADING OVERLAY LIKE YOUR UI) */}
              {status[i] === "pending" && (
                <>
                  <img
                    src={getPreviewSrc(img)}
                    alt="loading"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.4,
                      borderRadius: "4px",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(255,255,255,0.5)",
                      borderRadius: 1,
                    }}
                  >
                    <CircularProgress size={22} />
                  </Box>
                </>
              )}

              {/* FAILED IMAGE */}
              {status[i] === "failed" && (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    background: "#f8d7da",
                    color: "#d32f2f",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    textAlign: "center",
                    padding: "4px",
                    borderRadius: 1,
                  }}
                >
                  Failed
                  <Button
                    size="small"
                    onClick={() => retryUpload(i, img?._original)}
                    sx={{ fontSize: "10px", mt: 0.5, padding: 0, minWidth: 20 }}
                    startIcon={<ReplayIcon fontSize="inherit" />}
                  >
                    Retry
                  </Button>
                </Box>
              )}

              {/* REMOVE BUTTON */}
              <Button
                size="small"
                onClick={() => removeImage(i)}
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  minWidth: 20,
                  padding: 0,
                  bgcolor: "white",
                }}
              >
                X
              </Button>
            </Paper>
          ))}
        </Box>
      </Box>

      <CustomSnackbar
        open={snack.open}
        message={snack.message}
        severity={snack.severity}
        onClose={closeSnack}
      />
    </>
  );
};

export default UploadImages;
