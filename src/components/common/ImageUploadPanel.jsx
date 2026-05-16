import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";

export default function ImageUploadPanel({
  images = [],
  uploadPreviews = [],
  imageLoading = {},
  onUploadImages,
  clearAllImages,
  removePreview,
  removeImage,
  setImageLoading,
  title = "Images",
  dropzoneMinHeight = 180,
  previewWidth = { xs: 64, md: 72 },
  previewHeight = { xs: 64, md: 72 },
}) {
  const hasImages = (images?.length || 0) > 0 || uploadPreviews.length > 0;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 2,
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const files = Array.from(event.dataTransfer.files || []).filter((file) =>
          file.type.startsWith("image/")
        );
        if (files.length) onUploadImages(files);
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: "auto" }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" component="label" startIcon={<UploadIcon />}>
            Add more
            <input
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => onUploadImages(event.target.files)}
            />
          </Button>
          <Button
            size="small"
            color="error"
            onClick={clearAllImages}
            disabled={!images?.length && !uploadPreviews.length}
          >
            Clear all
          </Button>
        </Stack>
      </Box>

      {!hasImages && (
        <Box
          sx={{
            border: "2px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            minHeight: dropzoneMinHeight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("shared-hidden-file-input")?.click()}
        >
          <Stack spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Drag & drop images here
            </Typography>
            <Button component="span" variant="outlined" startIcon={<UploadIcon />}>
              Browse files
            </Button>
            <input
              id="shared-hidden-file-input"
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => onUploadImages(event.target.files)}
              onClick={(event) => event.stopPropagation()}
            />
          </Stack>
        </Box>
      )}

      {hasImages && (
        <Box
          sx={{
            mt: 1,
            display: "grid",
            gridTemplateColumns: { xs: "repeat(auto-fill, 64px)", md: "repeat(auto-fill, 72px)" },
            gap: 1,
            justifyContent: "start",
          }}
        >
          {uploadPreviews.map((preview) => (
            <Box
              key={preview.id}
              sx={{ position: "relative", width: previewWidth, height: previewHeight }}
            >
              <Box
                component="img"
                src={preview.url}
                alt="uploading"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
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
              <IconButton
                size="small"
                onClick={() => removePreview(preview.id)}
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          {(images || []).map((url) => (
            <Box
              key={url}
              sx={{ position: "relative", width: previewWidth, height: previewHeight }}
            >
              <Box
                component="img"
                src={url}
                alt="attachment"
                onLoad={() =>
                  setImageLoading((prev) => {
                    const next = { ...prev };
                    delete next[url];
                    return next;
                  })
                }
                onError={() =>
                  setImageLoading((prev) => {
                    const next = { ...prev };
                    delete next[url];
                    return next;
                  })
                }
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
              {imageLoading[url] && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(255,255,255,0.4)",
                    borderRadius: 1,
                  }}
                >
                  <CircularProgress size={22} />
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => removeImage(url)}
                sx={{
                  position: "absolute",
                  top: -10,
                  right: -10,
                  bgcolor: "background.paper",
                  boxShadow: 1,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
