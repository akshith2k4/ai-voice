import React from 'react';
import { Box, Button, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import CloseIcon from '@mui/icons-material/Close';
import Autocomplete from '@mui/material/Autocomplete';

export default function ItemAndImagesPanel({
  item,
  setItemField,
  productOptions,
  productsLoading,
  setProductQuery,
  form,
  uploadPreviews,
  imageLoading,
  onUploadImages,
  clearAllImages,
  removePreview,
  removeImage,
  setImageLoading,
}) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length) onUploadImages(files);
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mr: 'auto' }}>
          Item & Images
        </Typography>
      </Box>

      {/* Single item row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) 110px' },
          gap: { xs: 0.75, md: 1 },
          alignItems: 'start',
          mb: 1.5,
        }}
      >
        <Autocomplete
          fullWidth
          size="small"
          options={productOptions}
          loading={productsLoading}
          value={item?.product || null}
          getOptionLabel={(opt) => (opt?.name || opt?.productName || opt?.title || opt?.label || '')}
          isOptionEqualToValue={(a, b) => (a?.id ?? a?.productId) === (b?.id ?? b?.productId)}
          onChange={(_, val) => setItemField('product', val)}
          onInputChange={(_, val) => setProductQuery(val)}
          renderInput={(params) => (
            <TextField {...params} label="Product" placeholder="Search products" />
          )}
        />

        <TextField
          fullWidth
          size="small"
          label="Quantity"
          type="number"
          value={item?.quantity ?? ''}
          onChange={(e) => setItemField('quantity', e.target.value)}
          sx={{ justifySelf: { md: 'end' } }}
        />
      </Box>

      {/* Images controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: 'auto' }}>
          Images
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" component="label" startIcon={<UploadIcon />}>
            Add more
            <input hidden type="file" accept="image/*" multiple onChange={(e) => onUploadImages(e.target.files)} />
          </Button>
          <Button size="small" color="error" onClick={clearAllImages} disabled={!form.images?.length && !uploadPreviews.length}>
            Clear all
          </Button>
        </Stack>
      </Box>

      {/* Dropzone when empty */}
      {(!form.images?.length && !uploadPreviews.length) && (
        <Box
          sx={{
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            minHeight: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Drag & drop images here
            </Typography>
            <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
              Browse files
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onUploadImages(e.target.files)}
              />
            </Button>
          </Stack>
        </Box>
      )}

      {/* Previews grid */}
      {(uploadPreviews.length > 0 || (form.images?.length || 0) > 0) && (
        <Box
          sx={{
            mt: 1,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(auto-fill, 64px)', md: 'repeat(auto-fill, 72px)' },
            gap: 1,
            justifyContent: 'start',
          }}
        >
          {uploadPreviews.map((p) => (
            <Box key={p.id} sx={{ position: 'relative', width: { xs: 64, md: 72 }, height: { xs: 64, md: 72 } }}>
              <Box
                component="img"
                src={p.url}
                alt="uploading"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                <CircularProgress size={22} />
              </Box>
              <IconButton
                size="small"
                onClick={() => removePreview(p.id)}
                sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          {(form.images || []).map((url) => (
            <Box key={url} sx={{ position: 'relative', width: { xs: 64, md: 72 }, height: { xs: 64, md: 72 } }}>
              <Box
                component="img"
                src={url}
                alt="attachment"
                onLoad={() => setImageLoading((prev) => { const next = { ...prev }; delete next[url]; return next; })}
                onError={() => setImageLoading((prev) => { const next = { ...prev }; delete next[url]; return next; })}
                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
              />
              {imageLoading[url] && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.4)', borderRadius: 1 }}>
                  <CircularProgress size={22} />
                </Box>
              )}
              <IconButton
                size="small"
                onClick={() => removeImage(url)}
                sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1 }}
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
