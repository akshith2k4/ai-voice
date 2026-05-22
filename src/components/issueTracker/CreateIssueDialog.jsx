import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import issueService from '../../services/issueService.jsx';
import productService from '../../services/productService.jsx';
import { customerService } from '../../services/customerService.jsx';
import { laundryVendorService } from '../../services/laundryVendorService.jsx';
import IssueDetailsPanel from './createIssue/IssueDetailsPanel.jsx';
import ItemAndImagesPanel from './createIssue/ItemAndImagesPanel.jsx';
import { useAgentForm } from '../../agent/useAgentForm';

export default function CreateIssueDialog({ open, onClose, onSubmit }) {
  const newItem = () => ({
    uid: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    product: null,
    quantity: '',
  });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    sourceType: '',
    sourceId: undefined,
    sourceName: '',
    triggerEntityType: '',
    issueType: '',
    status: 'OPEN',
    description: '',
    images: [],
    // Single item per API contract
    item: newItem(),
    recordedDateTime: new Date(),
  });

  // product search state
  const [productOptions, setProductOptions] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState({}); // { [url]: true }
  const [uploadPreviews, setUploadPreviews] = useState([]); // [{ id, url, file }]
  const cancelledUploadsRef = useRef(new Set());
  const [sourceOptions, setSourceOptions] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [entityOptions, setEntityOptions] = useState([]);
  const [entityLoading, setEntityLoading] = useState(false);
  
  const initialForm = () => ({
    sourceType: '',
    sourceId: undefined,
    sourceName: '',
    triggerEntityType: '',
    issueType: '',
    status: 'OPEN',
    description: '',
    images: [],
    item: newItem(),
    recordedDateTime: new Date(),
  });

  const resetState = () => {
    // reset form
    setForm(initialForm());
    // reset product search state
    setProductOptions([]);
    setProductQuery('');
    setProductsLoading(false);
    // cancel and clear previews
    cancelledUploadsRef.current = new Set();
    try {
      uploadPreviews.forEach((p) => p?.url && URL.revokeObjectURL(p.url));
    } catch {
      // Ignore errors revoking object URLs during cleanup
    }
    setUploadPreviews([]);
    // clear remote images loading map
    setImageLoading({});
    // reset source dropdown options
    setSourceOptions([]);
    setSourceLoading(false);
    // reset entity options
    setEntityOptions([]);
    setEntityLoading(false);
    // reset creating flag
    setCreating(false);
  };

  const canSubmit = useMemo(() => {
    return (
      form.sourceType &&
      form.issueType &&
      form.status &&
      form.description?.trim().length > 0
    );
  }, [form]);

  // Normalize possible dayjs or date-like values to Date
  const asDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.$d instanceof Date) return v.$d;
    const parsed = new Date(v);
    return isNaN(parsed?.getTime?.()) ? null : parsed;
  };

  const setFormField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setSingleItemField = (field, value) =>
    setForm((prev) => ({ ...prev, item: { ...prev.item, [field]: value } }));

  const onUploadImages = async (filesLike) => {
    const files = Array.from(filesLike || []).filter((f) => f && f.type?.startsWith?.('image/'));
    if (!files.length) return;

    // Create local previews immediately
    const entries = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setUploadPreviews((prev) => [...prev, ...entries]);

    // Start uploads in background
    entries.forEach(async ({ id, url: localUrl, file }) => {
      try {
        const remoteUrl = await issueService.uploadImage(file);
        if (cancelledUploadsRef.current.has(id)) {
          URL.revokeObjectURL(localUrl);
          return;
        }
        // Add to images and show as loading until <img> loads
        setForm((prev) => ({ ...prev, images: [...(prev.images || []), remoteUrl] }));
        setImageLoading((prev) => ({ ...prev, [remoteUrl]: true }));
      } catch (e) {
        console.error('Image upload failed', e);
      } finally {
        // Remove preview and revoke URL
        setUploadPreviews((prev) => prev.filter((p) => p.id !== id));
        URL.revokeObjectURL(localUrl);
      }
    });
  };

  const removeImage = (url) => {
    setForm((prev) => ({ ...prev, images: (prev.images || []).filter((u) => u !== url) }));
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
    // cancel and clear previews
    uploadPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    setUploadPreviews([]);
    cancelledUploadsRef.current = new Set();
    // clear remote
    setForm((prev) => ({ ...prev, images: [] }));
    setImageLoading({});
  };

  const submit = async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload = {
        sourceType: form.sourceType || undefined,
        sourceId: form.sourceId || undefined,
        sourceName: form.sourceName || undefined,
        triggerEntityType: form.triggerEntityType || undefined,
        triggerEntityId: form.triggerEntityId || undefined,
        issueType: form.issueType || undefined,
        status: form.status || undefined,
        description: form.description,
        recordedDateTime: (function() { const d = asDate(form.recordedDateTime); return d ? format(d, "yyyy-MM-dd'T'00:00:00") : undefined; })(),
        // Single item only per API contract
        ...(function buildItem() {
          const it = form.item || {};
          const productId = it.product?.id ?? it.product?.productId ?? it.product?.productID;
          const productName = it.product?.name ?? it.product?.productName ?? it.product?.title;
          const quantity = it.quantity ? Number(it.quantity) : undefined;
          const images = form.images || [];
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

  // Fetch products when query changes (simple debounce)
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

  // When dialog closes (open -> false), reset internal state so next open is clean
  useEffect(() => {
    if (!open) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load Source Name options when Source Type changes
  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      if (!form.sourceType) {
        setSourceOptions([]);
        return;
      }
      setSourceLoading(true);
      try {
        if (form.sourceType === 'CUSTOMER') {
          const data = await customerService.getAllCustomers();
          const list = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
          if (!cancelled) setSourceOptions(list);
        } else if (form.sourceType === 'LAUNDRY') {
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
  }, [form.sourceType]);

  const handleSourceTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      sourceType: value,
      sourceId: undefined,
      sourceName: '',
      triggerEntityType: '',
      triggerEntityId: undefined,
    }));
  };

  const handleSourceSelect = (id) => {
    const found = sourceOptions.find((o) => (o?.id ?? o?.customerId ?? o?.vendorId) === id);
    const name = found?.name || found?.customerName || found?.laundryName || found?.companyName || '';
    setForm((prev) => ({ ...prev, sourceId: id, sourceName: name, triggerEntityId: undefined }));
  };

  useAgentForm("createIssue", {
    fields: [
      {
        key: "issueDate",
        type: "date",
        set: (v) => setFormField("recordedDateTime", v ? new Date(v) : new Date()),
      },
      {
        key: "sourceType",
        type: "select",
        set: (v) => handleSourceTypeChange(v),
      },
      {
        key: "sourceName",
        type: "autocomplete",
        set: (source) => {
          if (source) {
            const id = source.id ?? source.customerId ?? source.vendorId;
            handleSourceSelect(id);
          } else {
            setFormField("sourceId", undefined);
            setFormField("sourceName", "");
          }
        },
        getOptions: () => sourceOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Source Name')) || null;
        }
      },
      {
        key: "triggerEntity",
        type: "select",
        set: (v) => setFormField("triggerEntityType", v),
      },
      {
        key: "orderDate",
        type: "date",
        set: (v) => {
          if (v) {
            const d = new Date(v);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,0);
            setForm((prev) => ({ ...prev, startDate: start, endDate: end }));
          }
        }
      },
      {
        key: "orders",
        type: "select",
        set: (v) => {
          setForm((prev) => ({
            ...prev,
            triggerEntityId: v,
            triggerEntityType: prev.sourceType === 'CUSTOMER' ? 'ORDER' : 'WASH_FULFILLMENT'
          }));
        },
        getOptions: () => entityOptions,
      },
      {
        key: "washDate",
        type: "date",
        set: (v) => {
          if (v) {
            const d = new Date(v);
            const start = new Date(d); start.setHours(0,0,0,0);
            const end = new Date(d); end.setHours(23,59,59,0);
            setForm((prev) => ({ ...prev, startDate: start, endDate: end }));
          }
        }
      },
      {
        key: "issueType",
        type: "select",
        set: (v) => setFormField("issueType", v),
      },
      {
        key: "status",
        type: "select",
        set: (v) => setFormField("status", v),
      },
      {
        key: "description",
        type: "text",
        set: (v) => setFormField("description", v),
      },
      {
        key: "product",
        type: "autocomplete",
        set: (product) => setSingleItemField("product", product),
        search: (q) => setProductQuery(q),
        getOptions: () => productOptions,
        getElement: () => {
          const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
          return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Product')) || null;
        }
      },
      {
        key: "quantity",
        type: "number",
        set: (v) => setSingleItemField("quantity", v),
      }
    ],
    clearAll: resetState,
  }, open);

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
        {/* 2-column layout: left details, right item + images */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '380px 1fr' },
            gap: { xs: 1.5, md: 2 },
            alignItems: 'stretch',
          }}
        >
          <IssueDetailsPanel
            form={form}
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
            item={form.item}
            setItemField={setSingleItemField}
            productOptions={productOptions}
            productsLoading={productsLoading}
            setProductQuery={setProductQuery}
            form={form}
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
        <Button onClick={submit} variant="contained" disabled={!canSubmit || creating}>
          {creating ? 'Creating…' : 'Create Issue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
