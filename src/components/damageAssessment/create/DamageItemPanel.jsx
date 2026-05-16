import React from "react";
import {
    Box,
    Typography,
    TextField,
    Autocomplete,
    Stack,
    Button,
    IconButton,
    CircularProgress
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import CloseIcon from "@mui/icons-material/Close";
import { Controller } from "react-hook-form";

/**
 * Panel for Product Details, Quantity, Price, Images
 * Matches layout of ItemAndImagesPanel.jsx from Issue Tracker
 */
function DamageItemPanel({
    control,
    isEdit,
    productOptions,
    sourceId,
    // Image props passed from parent
    uploadPreviews,
    imageLoading,
    onUploadImages,
    clearAllImages,
    removePreview,
    removeImage,
    setImageLoading // used in onLoad/onError
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

            {/* Row 1: Product | Quantity | Price */}
            <Box
                sx={{
                    display: 'grid',
                    // Matches user request: Product, Qty, Price in one row. 
                    // Previous ref used: gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) 110px' } for 2 items.
                    // For 3 items, maybe: 1fr 100px 100px?
                    gridTemplateColumns: { xs: '1fr', md: '1fr 100px 100px' },
                    gap: { xs: 0.75, md: 1 },
                    alignItems: 'start',
                    mb: 1.5,
                }}
            >
                {/* Product */}
                <Controller
                    name="productId"
                    control={control}
                    rules={{ required: !isEdit }}
                    render={({ field }) => (
                        <Autocomplete
                            disabled={isEdit || !sourceId}
                            options={productOptions}
                            getOptionLabel={(product) => product.productName || ""}
                            isOptionEqualToValue={(option, value) => option.productId === value.productId}
                            value={
                                productOptions.find((product) => product.productId === field.value) || null
                            }
                            onChange={(event, value) => field.onChange(value?.productId || "")}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Product"
                                    placeholder={!sourceId ? "Select Source First" : "Search..."}
                                    required={!isEdit}
                                    size="small"
                                />
                            )}
                        />
                    )}
                />

                {/* Quantity */}
                <Controller
                    name="quantity"
                    control={control}
                    rules={{ required: true, min: 1 }}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Quantity"
                            type="number"
                            required
                            size="small"
                        />
                    )}
                />

                {/* Price */}
                <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            label="Price"
                            type="number"
                            size="small"
                        />
                    )}
                />
            </Box>

            {/* Images Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mr: 'auto' }}>
                    Images
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button size="small" component="label" startIcon={<UploadIcon />}>
                        Add more
                        <input hidden type="file" accept="image/*" multiple onChange={(event) => onUploadImages(event.target.files)} />
                    </Button>
                    <Button size="small" color="error" onClick={clearAllImages} >
                        {/* Disabled logic handling in parent or okay to leave enabled */}
                        Clear all
                    </Button>
                </Stack>
            </Box>

            {/* Dropzone Control */}
            <Controller
                name="images"
                control={control}
                render={({ field }) => {
                    const hasImages = (field.value?.length || 0) > 0 || uploadPreviews.length > 0;

                    return (
                        <>
                            {/* Empty State Dropzone */}
                            {!hasImages && (
                                <Box
                                    sx={{
                                        border: '2px dashed',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        p: 2,
                                        textAlign: 'center',
                                        minHeight: 180,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: 'background.default',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => document.getElementById('hidden-file-input')?.click()}
                                >
                                    <Stack spacing={1} alignItems="center">
                                        <Typography variant="body2" color="text.secondary">
                                            Drag & drop images here
                                        </Typography>
                                        <Button component="span" variant="outlined" startIcon={<UploadIcon />}>
                                            Browse files
                                        </Button>
                                        <input
                                            id="hidden-file-input"
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

                            {/* Previews Grid */}
                            {hasImages && (
                                <Box
                                    sx={{
                                        mt: 1,
                                        display: 'grid',
                                        gridTemplateColumns: { xs: 'repeat(auto-fill, 64px)', md: 'repeat(auto-fill, 72px)' },
                                        gap: 1,
                                        justifyContent: 'start',
                                    }}
                                >
                                    {/* Local Previews (Uploading) */}
                                    {uploadPreviews.map((preview) => (
                                        <Box key={preview.id} sx={{ position: 'relative', width: { xs: 64, md: 72 }, height: { xs: 64, md: 72 } }}>
                                            <Box
                                                component="img"
                                                src={preview.url}
                                                alt="uploading"
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                                            />
                                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                                                <CircularProgress size={22} />
                                            </Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => removePreview(preview.id)}
                                                sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1 }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}

                                    {/* Remote Images (Field Value) */}
                                    {(field.value || []).map((url) => (
                                        <Box key={url} sx={{ position: 'relative', width: { xs: 64, md: 72 }, height: { xs: 64, md: 72 } }}>
                                            <Box
                                                component="img"
                                                src={url}
                                                alt="attachment"
                                                onLoad={() => setImageLoading((previous) => { const next = { ...previous }; delete next[url]; return next; })}
                                                onError={() => setImageLoading((previous) => { const next = { ...previous }; delete next[url]; return next; })}
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
                        </>
                    );
                }}
            />
        </Box>
    );
}

export default DamageItemPanel;
