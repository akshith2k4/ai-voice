import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useCreatePoolAgent } from '../../useagent/useCreatePoolAgent';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    CircularProgress,
    Autocomplete,
} from '@mui/material';
import { inventoryService } from '../../services/inventoryService';
import productService from '../../services/productService';

export default function CreatePoolDialog({ open, onClose, onSave }) {
    // --------------------------
    // 1. State & Form
    // --------------------------
    const [saving, setSaving] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const { control, handleSubmit, reset, setValue, getValues, watch } = useForm({
        defaultValues: {
            name: '',
            description: '',
            products: [],
        }
    });

    const watchedProducts = watch("products") || [];

    // --------------------------
    // 2. useEffects
    // --------------------------
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const productsData = await productService.getAllProducts();
                setProducts(productsData);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    // --------------------------
    // 3. Handlers & Helpers
    // --------------------------
    const resetForm = () => {
        reset();
        setGeneralError('');
    };

    useCreatePoolAgent({
        open,
        products,
        setValue,
        getValues,
        reset: resetForm,
    });

    const handleClose = () => {
        resetForm();
        onClose?.();
    };

    const onSubmit = async (data) => {
        const nameVal = data.name.trim();
        const productsVal = data.products || [];

        if (!nameVal) {
            setGeneralError('Name is required');
            return;
        }

        if (productsVal.length === 0) {
            setGeneralError('At least one product is required');
            return;
        }

        setSaving(true);
        setGeneralError('');
        try {
            const payload = {
                name: nameVal,
                description: data.description.trim(),
                products: productsVal.map((p) => ({
                    productId: p.id,
                    productName: p.name,
                })),
            };

            await inventoryService.createPool(payload);
            onSave?.();
            handleClose();
        } catch (err) {
            console.error('Failed to create pool', err);
            const backend = err?.response?.data?.message || err?.message || 'Failed to create pool';
            setGeneralError(backend);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!open) {
            resetForm();
        }
    }, [open]);

    // --------------------------
    // 4. Render
    // --------------------------
    return (
        <Dialog open={!!open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Inventory Pool</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minHeight: 200 }}>

                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Pool Name"
                                required
                                fullWidth
                            />
                        )}
                    />

                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description"
                                fullWidth
                                multiline
                                minRows={3}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        maxHeight: 'none',
                                        height: 'auto !important',
                                        overflow: 'visible',
                                    },
                                }}
                            />
                        )}
                    />

                    <Controller
                        name="products"
                        control={control}
                        render={({ field }) => (
                            <Autocomplete
                                multiple
                                loading={loadingProducts}
                                options={products}
                                getOptionLabel={(option) => option.name || ''}
                                value={field.value}
                                onChange={(_, newValue) => field.onChange(newValue)}
                                fullWidth
                                isOptionEqualToValue={(option, value) => option.id === value.id}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Products"
                                        required
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                maxHeight: 'none',
                                                height: 'auto !important',
                                                overflow: 'visible',
                                            },
                                        }}
                                    />
                                )}
                            />
                        )}
                    />

                    {generalError && (
                        <Box sx={{ color: 'error.main', fontSize: '0.9rem' }}>{generalError}</Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit(onSubmit)}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}