import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import issueService from '../../services/issueService.jsx';
import productService from '../../services/productService.jsx';
import { customerService } from '../../services/customerService.jsx';
import { laundryVendorService } from '../../services/laundryVendorService.jsx';
import IssueDetailsPanel from './createIssue/IssueDetailsPanel.jsx';
import ItemAndImagesPanel from './createIssue/ItemAndImagesPanel.jsx';
import { useCreateIssueAgent } from '../../useagent/useCreateIssueAgent';

export default function CreateIssueDialog({ open, onClose, onSubmit }) {
  const newItem = () => ({
    uid: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    product: null,
    quantity: '',
  });

  const [creating, setCreating] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState({});
  const [uploadPreviews, setUploadPreviews] = useState([]);
  const cancelledUploadsRef = useRef(new Set());
  const [sourceOptions, setSourceOptions] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [entityOptions, setEntityOptions] = useState([]);
  const [entityLoading, setEntityLoading] = useState(false);

  const { control, handleSubmit, reset, setValue, getValues, watch } = useForm({
    defaultValues: {
      sourceType: '',
      sourceId: undefined,
      sourceName: '',
      triggerEntityType: '',
      triggerEntityId: undefined,
      issueType: '',
      status: 'OPEN',
      description: '',
      images: [],
      item: newItem(),
      recordedDateTime: new Date(),
      startDate: null,
      endDate: null,
    }
  });

  const watchedForm = watch();

  const resetState = () => {
    reset({
      sourceType: '',
      sourceId: undefined,
      sourceName: '',
      triggerEntityType: '',
      triggerEntityId: undefined,
      issueType: '',
      status: 'OPEN',
      description: '',
      images: [],
      item: newItem(),
      recordedDateTime: new Date(),
      startDate: null,
      endDate: null,
    });
    setProductOptions([]);
    setProductQuery('');
    setProductsLoading(false);
    cancelledUploadsRef.current = new Set();
    try {
      uploadPreviews.forEach((p) => p?.url && URL.revokeObjectURL(p.url));
    } catch {
      // Ignore errors revoking object URLs
    }
    setUploadPreviews([]);
    setImageLoading({});
    setSourceOptions([]);
    setSourceLoading(false);
    setEntityOptions([]);
    setEntityLoading(false);
    setCreating(false);
  };

  const canSubmit = useMemo(() => {
    return (
      watchedForm.sourceType &&
      watchedForm.issueType &&
      watchedForm.status &&
      watchedForm.description?.trim().length > 0
    );
  }, [watchedForm]);

  // Normalize possible dayjs or date-like values to Date
  const asDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.$d instanceof Date) return v.$d;
    const parsed = new Date(v);
    return isNaN(parsed?.getTime?.()) ? null : parsed;
  };

  const setFormField = (field, value) => setValue(field, value);
  const setSingleItemField = (field, value) => {
    const currentItem = getValues("item") || {};
    setValue("item", { ...currentItem, [field]: value });
  };

  const onUploadImages = async (filesLike) => {
    const files = Array.from(filesLike || []).filter((f) => f && f.type?.startsWith?.('image/'));
    if (!files.length) return;

    const entries = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setUploadPreviews((prev) => [...prev, ...entries]);

    entries.forEach(async ({ id, url: localUrl, file }) => {
      try {
        const remoteUrl = await issueService.uploadImage(file);
        if (cancelledUploadsRef.current.has(id)) {
          URL.revokeObjectURL(localUrl);
          return;
        }
        const currentImages = getValues("images") || [];
        setValue("images", [...currentImages, remoteUrl]);
        setImageLoading((prev) => ({ ...prev, [remoteUrl]: true }));
      } catch (e) {
        console.error('Image upload failed', e);
      } finally {
        setUploadPreviews((prev) => prev.filter((p) => p.id !== id));
        URL.revokeObjectURL(localUrl);
      }
    });
  };

  const removeImage = (url) => {
    const currentImages = getValues("images") || [];
    setValue("images", currentImages.filter((u) => u !== url));
    setImageLoading((prev) => {
      const next = { ...prev };
      delete next[url];
      return next;
    });
  };

  const removePreview = (id) => {
    cancelledUploadsRef.current.add(id);
    setUploadPreviews((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAllImages = () => {
    uploadPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setUploadPreviews([]);
    cancelledUploadsRef.current = new Set();
    setValue("images", []);
    setImageLoading({});
  };

  const handleSave = async (data) => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload = {
        sourceType: data.sourceType || undefined,
        sourceId: data.sourceId || undefined,
        sourceName: data.sourceName || undefined,
        triggerEntityType: data.triggerEntityType || undefined,
        triggerEntityId: data.triggerEntityId || undefined,
        issueType: data.issueType || undefined,
        status: data.status || undefined,
        description: data.description,
        recordedDateTime: (function() { const d = asDate(data.recordedDateTime); return d ? format(d, "yyyy-MM-dd'T'00:00:00") : undefined; })(),
        ...(function buildItem() {
          const it = data.item || {};
          const productId = it.product?.id ?? it.product?.productId ?? it.product?.productID;
          const productName = it.product?.name ?? it.product?.productName ?? it.product?.title;
          const quantity = it.quantity ? Number(it.quantity) : undefined;
          const images = data.images || [];
          const has = (productId || productName || quantity || images.length);
          if (!has) return {};
          return {
            item: {
              productId: productId !== undefined ? Number(productId) : undefined,
              productName: productName || undefined,
              quantity,
              images,
            },
          };
        })(),
      };
      await onSubmit(payload);
    } finally {
      setCreating(false);
    }
  };

  const clearAndClose = () => {
    resetState();
    onClose?.();
  };

  useEffect(() => {
    let active = true;
    const q = productQuery?.trim();
    if (!q || q.length < 2) {
      setProductOptions([]);
      setProductsLoading(false);
      return undefined;
    }
    setProductsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const results = await productService.searchProducts(q);
        if (!active) return;
        setProductOptions(Array.isArray(results) ? results : []);
      } catch (e) {
        if (!active) return;
        console.error('Failed to search products', e);
        setProductOptions([]);
      } finally {
        if (active) setProductsLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [productQuery]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      if (!watchedForm.sourceType) {
        setSourceOptions([]);
        return;
      }
      setSourceLoading(true);
      try {
        if (watchedForm.sourceType === 'CUSTOMER') {
          const data = await customerService.getAllCustomers();
          const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
          if (!cancelled) setSourceOptions(list);
        } else if (watchedForm.sourceType === 'LAUNDRY') {
          const data = await laundryVendorService.getAllVendors();
          const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
          if (!cancelled) setSourceOptions(list);
        } else {
          if (!cancelled) setSourceOptions([]);
        }
      } catch (e) {
        console.error('Failed to fetch source options', e);
        if (!cancelled) setSourceOptions([]);
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    }
    loadSources();
    return () => { cancelled = true; };
  }, [watchedForm.sourceType]);

  const handleSourceTypeChange = (value) => {
    setValue("sourceType", value);
    setValue("sourceId", undefined);
    setValue("sourceName", "");
    setValue("triggerEntityType", "");
    setValue("triggerEntityId", undefined);
  };

  const handleSourceSelect = (id) => {
    const found = sourceOptions.find((o) => (o?.id ?? o?.customerId ?? o?.vendorId) === id);
    const name = found?.name || found?.customerName || found?.laundryName || found?.companyName || '';
    setValue("sourceId", id);
    setValue("sourceName", name);
    setValue("triggerEntityId", undefined);
  };

  useCreateIssueAgent({
    open,
    setValue,
    getValues,
    reset: resetState,
    sourceOptions,
    entityOptions,
    productOptions,
    setProductQuery,
  });

  return (
    <Dialog open={open} onClose={clearAndClose} maxWidth="lg" fullWidth>
      <DialogTitle>New Issue</DialogTitle>
      <DialogContent
        dividers
        sx={{
          pt: 2,
          pb: 2,
          overflowX: 'hidden',
          overflowY: 'auto',
          maxHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 140px)' },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '380px 1fr' },
            gap: { xs: 1.5, md: 2 },
            alignItems: 'stretch',
          }}
        >
          <IssueDetailsPanel
            form={watchedForm}
            setFormField={setFormField}
            sourceOptions={sourceOptions}
            sourceLoading={sourceLoading}
            onChangeSourceType={handleSourceTypeChange}
            onSelectSourceId={handleSourceSelect}
            entityOptions={entityOptions}
            setEntityOptions={setEntityOptions}
            entityLoading={entityLoading}
            setEntityLoading={setEntityLoading}
          />
          <ItemAndImagesPanel
            item={watchedForm.item}
            setItemField={setSingleItemField}
            productOptions={productOptions}
            productsLoading={productsLoading}
            setProductQuery={setProductQuery}
            form={watchedForm}
            uploadPreviews={uploadPreviews}
            imageLoading={imageLoading}
            onUploadImages={onUploadImages}
            clearAllImages={clearAllImages}
            removePreview={removePreview}
            removeImage={removeImage}
            setImageLoading={setImageLoading}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={clearAndClose} disabled={creating}>Cancel</Button>
        <Button onClick={handleSubmit(handleSave)} variant="contained" disabled={!canSubmit || creating}>
          {creating ? 'Creating…' : 'Create Issue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
