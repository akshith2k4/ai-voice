// src/components/trips/VisitImagesDialog.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import { PermMedia } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.75;

const normalizeImages = (images = []) =>
  images
    .map((image) => {
      if (typeof image === 'string') {
        return { src: image, title: '', subtitle: '' };
      }

      if (!image?.src) {
        return null;
      }

      return {
        src: image.src,
        title: image.title || image.label || '',
        subtitle: image.subtitle || image.caption || '',
      };
    })
    .filter(Boolean);

const initialViewerState = {
  mode: null,
  index: 0,
};

const clampZoom = (value) =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));

export default function VisitImagesDialog({ imageUrls = [], title = 'Visit Images' }) {
  const [viewerState, setViewerState] = useState(initialViewerState);
  const [zoomByIndex, setZoomByIndex] = useState({});
  const [rotationByIndex, setRotationByIndex] = useState({});
  const [offsetByIndex, setOffsetByIndex] = useState({});
  const [dragState, setDragState] = useState(null);
  const dragMovedRef = useRef(false);

  const normalizedImages = useMemo(() => normalizeImages(imageUrls), [imageUrls]);
  const slides = useMemo(
    () =>
      normalizedImages.map((image) => ({
        src: image.src,
        title: image.title,
        subtitle: image.subtitle,
      })),
    [normalizedImages],
  );

  const isGalleryOpen = viewerState.mode === 'gallery';
  const isPreviewOpen = viewerState.mode === 'preview' && slides.length > 0;
  const currentIndex = Math.min(viewerState.index, Math.max(slides.length - 1, 0));
  const currentSlide = slides[currentIndex];
  const currentZoom = zoomByIndex[currentIndex] || 1;
  const currentRotation = rotationByIndex[currentIndex] || 0;
  const currentOffset = offsetByIndex[currentIndex] || { x: 0, y: 0 };
  const canZoomIn = currentZoom < MAX_ZOOM;
  const canZoomOut = currentZoom > MIN_ZOOM;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < slides.length - 1;
  const isQuarterTurn = currentRotation % 180 !== 0;

  useEffect(() => {
    if (slides.length === 0) {
      setViewerState(initialViewerState);
      setZoomByIndex({});
      setRotationByIndex({});
      setOffsetByIndex({});
      setDragState(null);
      return;
    }

    setViewerState((prev) => {
      if (prev.mode === null || prev.index < slides.length) {
        return prev;
      }

      return {
        ...prev,
        index: slides.length - 1,
      };
    });
  }, [slides.length]);

  useEffect(() => {
    if (!dragState) return undefined;

    const handlePointerMove = (event) => {
      dragMovedRef.current = true;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      setOffsetByIndex((prev) => ({
        ...prev,
        [dragState.index]: {
          x: dragState.startOffsetX + deltaX,
          y: dragState.startOffsetY + deltaY,
        },
      }));
    };

    const handlePointerEnd = () => {
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [dragState]);

  useEffect(() => {
    if (!isPreviewOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setViewerState(initialViewerState);
        return;
      }

      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        setViewerState((prev) => ({
          ...prev,
          index: prev.index - 1,
        }));
        return;
      }

      if (event.key === 'ArrowRight' && currentIndex < slides.length - 1) {
        setViewerState((prev) => ({
          ...prev,
          index: prev.index + 1,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isPreviewOpen, slides.length]);

  const openGalleryDialog = (event) => {
    event.currentTarget?.blur?.();
    setViewerState((prev) => ({
      mode: 'gallery',
      index: prev.index,
    }));
  };

  const closeGalleryDialog = () => {
    setViewerState((prev) => (prev.mode === 'gallery' ? initialViewerState : prev));
  };

  const openPreview = (index) => {
    setViewerState({
      mode: 'preview',
      index,
    });
  };

  const closePreview = () => {
    setDragState(null);
    setViewerState(initialViewerState);
  };

  const updateZoomForIndex = (index, nextZoom) => {
    const clampedZoom = clampZoom(nextZoom);

    setZoomByIndex((prev) => ({
      ...prev,
      [index]: clampedZoom,
    }));

    if (clampedZoom === MIN_ZOOM) {
      setOffsetByIndex((prev) => ({
        ...prev,
        [index]: { x: 0, y: 0 },
      }));
    }
  };

  const handleZoomIn = () => {
    updateZoomForIndex(currentIndex, currentZoom + ZOOM_STEP);
  };

  const handleZoomOut = () => {
    updateZoomForIndex(currentIndex, currentZoom - ZOOM_STEP);
  };

  const handleImageDoubleClick = () => {
    updateZoomForIndex(
      currentIndex,
      currentZoom >= MAX_ZOOM ? MIN_ZOOM : Math.min(MAX_ZOOM, currentZoom * 2),
    );
  };

  const handleWheelZoom = (event) => {
    event.preventDefault();
    const step = event.deltaY < 0 ? ZOOM_STEP / 2 : -ZOOM_STEP / 2;
    updateZoomForIndex(currentIndex, currentZoom + step);
  };

  const rotateImage = (step) => {
    setRotationByIndex((prev) => ({
      ...prev,
      [currentIndex]: (((prev[currentIndex] || 0) + step) % 360 + 360) % 360,
    }));
  };

  const handlePointerDown = (event) => {
    if (currentZoom <= MIN_ZOOM) return;

    event.preventDefault();
    event.stopPropagation();
    dragMovedRef.current = false;

    setDragState({
      index: currentIndex,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: currentOffset.x,
      startOffsetY: currentOffset.y,
    });
  };

  const goToPrev = () => {
    if (!canGoPrev) return;
    setViewerState((prev) => ({
      ...prev,
      index: prev.index - 1,
    }));
  };

  const goToNext = () => {
    if (!canGoNext) return;
    setViewerState((prev) => ({
      ...prev,
      index: prev.index + 1,
    }));
  };

  return (
    <>
      <Button
        onClick={openGalleryDialog}
        variant="outlined"
        sx={{
          borderColor: '#d7e7fb',
          color: '#125ea9',
          background:
            'linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(238,246,255,0.98) 100%)',
          borderRadius: '14px',
          px: 1.75,
          py: 1,
          minWidth: 'auto',
          fontSize: '0.78rem',
          textTransform: 'none',
          fontWeight: 600,
          borderWidth: '1px',
          boxShadow: '0 6px 18px rgba(18, 94, 169, 0.08)',
          transition: 'all 0.2s ease',
          '&:hover': {
            background:
              'linear-gradient(180deg, rgba(239,247,255,1) 0%, rgba(226,240,255,1) 100%)',
            borderColor: '#8ab8ef',
            transform: 'translateY(-1px)',
            boxShadow: '0 10px 22px rgba(18, 94, 169, 0.14)',
          },
        }}
        startIcon={<PermMedia sx={{ fontSize: 18, color: '#1976d2' }} />}
      >
        {normalizedImages.length} {normalizedImages.length === 1 ? 'Image' : 'Images'}
      </Button>

      <Dialog
        open={isGalleryOpen}
        onClose={closeGalleryDialog}
        fullWidth
        maxWidth="lg"
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            overflow: 'hidden',
            borderRadius: '24px',
            background:
              'linear-gradient(180deg, rgba(252,253,255,1) 0%, rgba(245,248,252,1) 100%)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.18)',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#132238',
                  lineHeight: 1.15,
                }}
              >
                {title}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  color: 'rgba(19, 34, 56, 0.68)',
                }}
              >
                Select an image to open the full preview
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={`${normalizedImages.length} ${normalizedImages.length === 1 ? 'item' : 'items'}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: '#e9f3ff',
                  color: '#155fa0',
                }}
              />
              <IconButton
                onClick={closeGalleryDialog}
                sx={{
                  color: '#526277',
                  bgcolor: 'rgba(226, 232, 240, 0.55)',
                  '&:hover': {
                    bgcolor: 'rgba(203, 213, 225, 0.8)',
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {normalizedImages.length > 0 ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, minmax(0, 1fr))',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {normalizedImages.map((image, imageIndex) => (
                <Box
                  key={`${image.src}-${imageIndex}`}
                  component="button"
                  type="button"
                  onClick={() => openPreview(imageIndex)}
                  sx={{
                    position: 'relative',
                    p: 0,
                    m: 0,
                    width: '100%',
                    height: { xs: 172, sm: 184, md: 196 },
                    border: '1px solid rgba(148, 163, 184, 0.18)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: '#dfe8f3',
                    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.09)',
                    transition:
                      'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 18px 36px rgba(15, 23, 42, 0.14)',
                      borderColor: 'rgba(25, 118, 210, 0.34)',
                    },
                    '&:focus-visible': {
                      outline: '2px solid #1976d2',
                      outlineOffset: '3px',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={image.src}
                    alt={image.title || `Visit image ${imageIndex + 1}`}
                    loading="lazy"
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(9, 18, 31, 0.02) 0%, rgba(9, 18, 31, 0.14) 48%, rgba(9, 18, 31, 0.82) 100%)',
                    }}
                  />

                  <Chip
                    label={`#${imageIndex + 1}`}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      fontWeight: 700,
                      color: '#fff',
                      bgcolor: 'rgba(15, 23, 42, 0.55)',
                      backdropFilter: 'blur(6px)',
                    }}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      bottom: 16,
                      textAlign: 'left',
                      color: '#fff',
                    }}
                  >
                    {image.title ? (
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.25,
                        }}
                      >
                        {image.title}
                      </Typography>
                    ) : null}
                    <Typography
                      variant="body2"
                      sx={{
                        mt: image.title ? 0.5 : 0,
                        opacity: 0.9,
                        lineHeight: 1.35,
                      }}
                    >
                      {image.subtitle || 'Open full preview'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                py: 8,
                px: 3,
                textAlign: 'center',
                borderRadius: '20px',
                border: '1px dashed rgba(148, 163, 184, 0.4)',
                background:
                  'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.9) 100%)',
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#334155' }}>
                No images uploaded
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: '#64748b' }}>
                Images will appear here once they are available.
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPreviewOpen}
        onClose={closePreview}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.34)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'transparent',
          }}
        >
          <Box
            onClick={closePreview}
            sx={{
              position: 'absolute',
              inset: 0,
            }}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 18,
              right: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              background: 'rgba(0,0,0,0.48)',
              px: 1.25,
              py: 1,
              borderRadius: '18px',
              zIndex: 20,
              backdropFilter: 'blur(6px)',
            }}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              style={{
                color: '#fff',
                fontSize: '22px',
                lineHeight: 1,
                padding: '6px 10px',
                opacity: canZoomOut ? 1 : 0.45,
                cursor: canZoomOut ? 'pointer' : 'not-allowed',
                background: 'transparent',
                border: 'none',
              }}
              aria-label="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              style={{
                color: '#fff',
                fontSize: '22px',
                lineHeight: 1,
                padding: '6px 10px',
                opacity: canZoomIn ? 1 : 0.45,
                cursor: canZoomIn ? 'pointer' : 'not-allowed',
                background: 'transparent',
                border: 'none',
              }}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={closePreview}
              style={{
                color: '#fff',
                fontSize: '14px',
                lineHeight: 1,
                padding: '8px 10px',
                fontWeight: 600,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              Close
            </button>
          </Box>

          {slides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goToPrev}
                disabled={!canGoPrev}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '18px',
                  transform: 'translateY(-50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'rgba(0,0,0,0.42)',
                  color: '#fff',
                  fontSize: '26px',
                  cursor: canGoPrev ? 'pointer' : 'not-allowed',
                  opacity: canGoPrev ? 1 : 0.38,
                  zIndex: 15,
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNext}
                disabled={!canGoNext}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '18px',
                  transform: 'translateY(-50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'rgba(0,0,0,0.42)',
                  color: '#fff',
                  fontSize: '26px',
                  cursor: canGoNext ? 'pointer' : 'not-allowed',
                  opacity: canGoNext ? 1 : 0.38,
                  zIndex: 15,
                }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          ) : null}

          <Box
            onClick={() => {
              if (!dragMovedRef.current) {
                closePreview();
              }
              dragMovedRef.current = false;
            }}
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 2, md: 4 },
              py: { xs: 10, md: 12 },
              overflow: 'hidden',
              zIndex: 5,
            }}
          >
            {currentSlide ? (
              <Box
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={handleImageDoubleClick}
                onWheel={handleWheelZoom}
                onPointerDown={handlePointerDown}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor:
                    currentZoom > MIN_ZOOM
                      ? dragState?.index === currentIndex
                        ? 'grabbing'
                        : 'grab'
                      : 'default',
                  touchAction: currentZoom > MIN_ZOOM ? 'none' : 'manipulation',
                }}
              >
                <Box
                  component="img"
                  src={currentSlide.src}
                  alt={currentSlide.title || `Preview image ${currentIndex + 1}`}
                  sx={{
                    width: 'auto',
                    height: 'auto',
                    maxWidth: isQuarterTurn ? '82vh' : 'calc(100vw - 64px)',
                    maxHeight: isQuarterTurn ? 'calc(100vw - 64px)' : 'calc(100vh - 112px)',
                    display: 'block',
                    transform: `translate3d(${currentOffset.x}px, ${currentOffset.y}px, 0) scale(${currentZoom}) rotate(${currentRotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </Box>
            ) : null}
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              background: 'rgba(0,0,0,0.4)',
              px: 1.75,
              py: 1,
              borderRadius: '20px',
              zIndex: 20,
              backdropFilter: 'blur(6px)',
            }}
          >
            <Box
              component="span"
              sx={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                minWidth: '72px',
                textAlign: 'center',
              }}
            >
              {title ? `${title} ` : ''}
              {currentIndex + 1}/{slides.length}
            </Box>
            <button
              type="button"
              onClick={() => rotateImage(-90)}
              style={{
                color: '#fff',
                fontSize: '24px',
                lineHeight: 1,
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Rotate left"
            >
              ⟲
            </button>
            <button
              type="button"
              onClick={() => rotateImage(90)}
              style={{
                color: '#fff',
                fontSize: '24px',
                lineHeight: 1,
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Rotate right"
            >
              ⟳
            </button>
          </Box>

          {currentSlide?.title || currentSlide?.subtitle ? (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                px: 3,
                py: 2,
                color: '#fff',
                zIndex: 10,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 100%)',
              }}
            >
              {currentSlide.title ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {currentSlide.title}
                </Typography>
              ) : null}
              {currentSlide.subtitle ? (
                <Typography variant="body2" sx={{ opacity: 0.92 }}>
                  {currentSlide.subtitle}
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
