// src/components/trips/VisitImagesDialog.jsx
import React, { useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  ImageList,
  ImageListItem,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { PermMedia } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

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

export default function VisitImagesDialog({ imageUrls = [], title = 'Visit Images' }) {
  const [openGallery, setOpenGallery] = useState(false);
  const [index, setIndex] = useState(-1);

  const normalizedImages = useMemo(() => normalizeImages(imageUrls), [imageUrls]);
  const slides = normalizedImages.map((image) => ({
    src: image.src,
    title: image.title,
    subtitle: image.subtitle,
  }));

  const openGalleryDialog = (event) => {
    event.currentTarget?.blur?.();
    setOpenGallery(true);
  };

  const closeGalleryDialog = () => {
    setOpenGallery(false);
  };

  const openLightbox = (imageIndex, event) => {
    event.currentTarget?.blur?.();
    setOpenGallery(false);
    setIndex(imageIndex);
  };

  return (
    <>
      <Button
        onClick={openGalleryDialog}
        variant="outlined"
        sx={{
          borderColor: '#e3f2fd',
          color: '#1976d2',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          padding: '8px 16px',
          minWidth: 'auto',
          fontSize: '0.75rem',
          textTransform: 'none',
          fontWeight: 500,
          border: '2px dashed #e3f2fd',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#e3f2fd',
            borderColor: '#1976d2',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(25, 118, 210, 0.15)',
          },
          '&:active': {
            transform: 'translateY(0px)',
          },
        }}
        startIcon={<PermMedia sx={{ fontSize: 18, color: '#1976d2' }} />}
      >
        {normalizedImages.length} {normalizedImages.length === 1 ? 'Image' : 'Images'}
      </Button>

      <Dialog
        open={openGallery}
        onClose={closeGalleryDialog}
        fullWidth
        maxWidth="md"
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      >
        <DialogTitle>
          {title}
          <IconButton
            onClick={closeGalleryDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {normalizedImages.length > 0 ? (
            <ImageList cols={3} gap={12}>
              {normalizedImages.map((image, i) => (
                <ImageListItem key={i}>
                  <img
                    src={image.src}
                    alt={`img-${i}`}
                    loading="lazy"
                    style={{
                      cursor: 'pointer',
                      borderRadius: 8,
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                    }}
                    onClick={(event) => openLightbox(i, event)}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No images uploaded
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {index >= 0 ? (
        <Lightbox
          open
          close={() => setIndex(-1)}
          slides={slides}
          index={index}
          onIndexChange={setIndex}
          carousel={{ finite: true }}
          plugins={[Zoom]}
          animation={{ zoom: 300 }}
          render={{
            controls: () => (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 999,
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(4px)',
                  zIndex: 2,
                }}
              >
                {index + 1}/{slides.length}
              </Box>
            ),
            slideFooter: ({ slide }) =>
              slide.title || slide.subtitle ? (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    px: 3,
                    py: 2,
                    color: '#fff',
                    background:
                      'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 100%)',
                  }}
                >
                  {slide.title ? (
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {slide.title}
                    </Typography>
                  ) : null}
                  {slide.subtitle ? (
                    <Typography variant="body2" sx={{ opacity: 0.92 }}>
                      {slide.subtitle}
                    </Typography>
                  ) : null}
                </Box>
              ) : null,
          }}
        />
      ) : null}
    </>
  );
}
