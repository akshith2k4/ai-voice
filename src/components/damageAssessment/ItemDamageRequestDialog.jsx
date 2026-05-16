import React, { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    CircularProgress,
} from "@mui/material";
import { useForm } from "react-hook-form";

import { getDayRange } from "../../utils/dateUtils";
import {
    useCreateDamageRequest,
    useUpdateDamageRequest,
    useSearchOrders,
    useSearchWashFulfillments,
} from "../../hooks/useDamageAssessment";
import { useDcid } from "../../context/DcidContext";
import { DAMAGE_SOURCE, SOURCE_ENTITY_TYPE } from "../../constants/damageAssessment";

import DamageSourcePanel from "./create/DamageSourcePanel";
import DamageItemPanel from "./create/DamageItemPanel";

function ItemDamageRequestDialog({ open, onClose, initialData }) {
    const isEdit = !!initialData;
    const { dcid } = useDcid();

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { isValid },
    } = useForm({
        defaultValues: {
            reportedBy: "",
            sourceType: DAMAGE_SOURCE.ORDER,
            sourceId: "",
            productId: "",
            quantity: "",
            price: "",
            notes: "",
            images: [],
            requestDate: new Date(),
        },
        mode: "onChange",
    });

    // Actions
    const createAction = useCreateDamageRequest();
    const updateAction = useUpdateDamageRequest();
    const isSubmitting = createAction.isPending || updateAction.isPending;

    // Local state
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [searchDate, setSearchDate] = useState(new Date());

    // Watch fields
    const reportedBy = watch("reportedBy");
    const sourceType = watch("sourceType");
    const sourceId = watch("sourceId");

    // --- QUERY HOOKS ---

    // Date Range for Source Search
    const { startDate, endDate } = getDayRange(searchDate);

    // Source Search (Orders or Wash Fulfillments)
    const { data: orderResults, isLoading: ordersLoading } = useSearchOrders(
        { customerId: reportedBy, startDate, endDate },
        !isEdit && sourceType === DAMAGE_SOURCE.ORDER && !!reportedBy
    );

    const { data: fulfillmentResults, isLoading: fulfillmentsLoading } = useSearchWashFulfillments(
        { startDate, endDate },
        !isEdit && sourceType === DAMAGE_SOURCE.WASH_FULFILLMENT
    );

    const sourceLoading = ordersLoading || fulfillmentsLoading;

    // Unified Source Options
    const sourceOptions = useMemo(() => {
        if (isEdit) return [];

        if (sourceType === DAMAGE_SOURCE.ORDER) {
            return orderResults?.content || orderResults || [];
        }

        if (sourceType === DAMAGE_SOURCE.WASH_FULFILLMENT) {
            let list = fulfillmentResults || [];
            // Filter by vendor (reportedBy) if selected
            if (reportedBy) {
                list = list.filter(fulfillment => fulfillment.vendorId === reportedBy);
            }
            return list;
        }

        return [];
    }, [sourceType, orderResults, fulfillmentResults, isEdit, reportedBy]);

    // Auto-select if only 1 option
    useEffect(() => {
        if (!isEdit && sourceOptions.length === 1 && !sourceId) {
            setValue("sourceId", sourceOptions[0].id);
        }
    }, [sourceOptions, isEdit, sourceId, setValue]);

    // Product Options
    const productOptions = useMemo(() => {
        if (!sourceId || !sourceOptions.length) return [];

        const selectedSource = sourceOptions.find((o) => o.id === sourceId);
        if (!selectedSource) return [];

        let items = [];
        if (sourceType === DAMAGE_SOURCE.ORDER) {
            items = [
                ...(selectedSource?.rentalOrderDetails?.items || []),
                ...(selectedSource?.leasingOrderDetails?.pickupItems || []),
                ...(selectedSource?.leasingOrderDetails?.deliveryItems || []),
                ...(selectedSource?.washingOrderDetails?.items || []),
            ];
        } else if (sourceType === DAMAGE_SOURCE.WASH_FULFILLMENT) {
            // Extract items from mappings -> productItems using flatMap
            const mappings = Array.isArray(selectedSource?.mappings) ? selectedSource.mappings : [];
            items = mappings.flatMap(mapping => Array.isArray(mapping.productItems) ? mapping.productItems : []);
        }

        // Filter and map to product objects, keeping only unique products
        const uniqueProducts = [];
        const addedProductIds = new Set();

        items
            .filter(item => item.productId)
            .forEach(item => {
                if (!addedProductIds.has(item.productId)) {
                    addedProductIds.add(item.productId);
                    uniqueProducts.push({
                        productId: item.productId,
                        productName: item.productName || `Product ${item.productId}`,
                    });
                }
            });

        return uniqueProducts;
    }, [sourceId, sourceOptions, sourceType]);


    // --- EVENT HANDLERS ---

    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    reportedBy: initialData.reportedBy || initialData.customerId,
                        sourceType: initialData.sourceType || DAMAGE_SOURCE.ORDER,
                    sourceId: initialData.sourceId,
                    productId: initialData.productId,
                    quantity: initialData.quantity,
                    price: initialData.price,
                    notes: initialData.notes,
                    images: initialData.images || [],
                    requestDate: initialData.requestDate ? new Date(initialData.requestDate) : new Date(),
                });
            } else {
                reset({
                    reportedBy: "",
                    sourceType: DAMAGE_SOURCE.ORDER,
                    sourceId: "", // reset
                    productId: "",
                    quantity: "",
                    price: "",
                    notes: "",
                    images: [],
                    requestDate: new Date(),
                });
                setCustomerSearchQuery("");
                setSearchDate(new Date());
            }
        }
    }, [open, initialData, reset]);


    // Image Upload State
    const [uploadPreviews, setUploadPreviews] = useState([]);
    const [imageLoading, setImageLoading] = useState({});
    const cancelledUploadsRef = React.useRef(new Set());

    // Image Handlers
    const onUploadImages = async (filesLike) => {
        const files = Array.from(filesLike || []).filter((f) => f && f.type?.startsWith('image/'));
        if (!files.length) return;

        // Create local previews
        const entries = files.map((file) => ({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            url: URL.createObjectURL(file),
            file,
        }));
        setUploadPreviews((prev) => [...prev, ...entries]);

        // Upload
        const { issueService } = await import("../../services/issueService");
        entries.forEach(async ({ id, url: localUrl, file }) => {
            try {
                const remoteUrl = await issueService.uploadImage(file);
                if (cancelledUploadsRef.current.has(id)) {
                    URL.revokeObjectURL(localUrl);
                    return;
                }
                const currentImages = watch("images") || [];
                setValue("images", [...currentImages, remoteUrl]);
                setImageLoading((prev) => ({ ...prev, [remoteUrl]: true }));
            } catch (error) {
                console.error('Image upload failed', error);
            } finally {
                setUploadPreviews((prev) => prev.filter((p) => p.id !== id));
                URL.revokeObjectURL(localUrl);
            }
        });
    };

    const removeImage = (url) => {
        const currentImages = watch("images") || [];
        setValue("images", currentImages.filter((imageUrl) => imageUrl !== url));
        setImageLoading((prev) => {
            const next = { ...prev };
            delete next[url];
            return next;
        });
    };

    const removePreview = (id) => {
        cancelledUploadsRef.current.add(id);
        const found = uploadPreviews.find((preview) => preview.id === id);
        if (found) URL.revokeObjectURL(found.url);
        setUploadPreviews((previous) => previous.filter((preview) => preview.id !== id));
    };

    const clearAllImages = () => {
        uploadPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
        setUploadPreviews([]);
        cancelledUploadsRef.current = new Set();
        setValue("images", []);
        setImageLoading({});
    };

    const onSubmit = async (data) => {
        try {
            if (isEdit) {
                await updateAction.mutateAsync({
                    id: initialData.id,
                    quantity: Number(data.quantity),
                    price: data.price ? Number(data.price) : null,
                    notes: data.notes || null,
                    images: data.images,
                });
            } else {
                // Populate Source Details & Remap Fields
                const selectedSource = sourceOptions.find(option => option.id === Number(data.sourceId));

                let apiSourceType = "";
                let apiSourceId = null;
                let apiSourceName = "";
                let apiTriggerType = null;
                let apiTriggerId = null;

                if (data.sourceType === DAMAGE_SOURCE.ORDER) {
                    // UI: Order -> API: Customer, Trigger: Order
                    apiSourceType = SOURCE_ENTITY_TYPE.CUSTOMER;
                    apiSourceId = Number(data.reportedBy); // Customer ID
                    apiSourceName = selectedSource?.customerName || selectedSource?.customer?.name || "";

                    apiTriggerType = DAMAGE_SOURCE.ORDER;
                    apiTriggerId = Number(data.sourceId); // Order ID

                } else if (data.sourceType === DAMAGE_SOURCE.WASH_FULFILLMENT) {
                    // UI: Wash -> API: Laundry, Trigger: Wash
                    apiSourceType = SOURCE_ENTITY_TYPE.LAUNDRY;
                    // Extract Vendor ID from the wash fulfillment object
                    apiSourceId = selectedSource?.vendorId ? Number(selectedSource.vendorId) : null;
                    apiSourceName = selectedSource?.laundryName || selectedSource?.vendorName || selectedSource?.name || "";

                    apiTriggerType = DAMAGE_SOURCE.WASH_FULFILLMENT;
                    apiTriggerId = Number(data.sourceId); // Wash ID
                }

                await createAction.mutateAsync({
                    reportedBy: Number(data.reportedBy),
                    productId: Number(data.productId),
                    quantity: Number(data.quantity),
                    price: data.price ? Number(data.price) : null,

                    sourceType: apiSourceType,
                    sourceId: apiSourceId,
                    sourceName: apiSourceName,

                    sourceTriggerEntityType: apiTriggerType,
                    sourceTriggerEntityId: apiTriggerId,

                    notes: data.notes || null,
                    images: data.images,
                    requestDate: data.requestDate, // Now strictly passed
                    dcId: dcid ? Number(dcid) : null,
                });
            }
            onClose();
        } catch (error) {
            console.error("Submit failed", error);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                {isEdit ? "Edit Damage Request" : "Create Damage Request"}
            </DialogTitle>

            <DialogContent dividers>
                <Box
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
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "380px 1fr" },
                            gap: { xs: 1.5, md: 2 },
                            alignItems: "stretch",
                        }}
                    >
                        {/* LEFT: Source Details */}
                        <DamageSourcePanel
                            control={control}
                            isEdit={isEdit}
                            sourceType={sourceType}
                            reportedBy={reportedBy}
                            sourceId={sourceId}
                            onCustomerSearchChange={setCustomerSearchQuery}
                            customerSearchQuery={customerSearchQuery}
                            searchDate={searchDate}
                            setSearchDate={setSearchDate}
                            sourceOptions={sourceOptions}
                            sourceLoading={sourceLoading}
                            setValue={setValue}
                        />

                        {/* RIGHT: Item Details */}
                        <DamageItemPanel
                            control={control}
                            isEdit={isEdit}
                            productOptions={productOptions}
                            sourceId={sourceId}
                            uploadPreviews={uploadPreviews}
                            imageLoading={imageLoading}
                            onUploadImages={onUploadImages}
                            clearAllImages={clearAllImages}
                            removePreview={removePreview}
                            removeImage={removeImage}
                            setImageLoading={setImageLoading}
                        />
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={!isValid || isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
                >
                    {isEdit ? "Update" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ItemDamageRequestDialog;
