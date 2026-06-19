import { useEffect, useState } from 'react';
import { useAgentForm } from '../../agent/useAgentForm';
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
    // 1. State
    // --------------------------
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // --------------------------
    // 2. useEffects (ALL TOGETHER)
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
    const reset = () => {
        setName('');
        setDescription('');
        setSelectedProducts([]);
        setError('');
    };

    useAgentForm("createInventoryPool", {
        fields: [
            {
                key: "name",
                type: "text",
                set: (v) => setName(v),
            },
            {
                key: "description",
                type: "text",
                set: (v) => setDescription(v),
            },
            {
                key: "products",
                type: "autocomplete",
                set: (prod) => {
                    if (!prod) return;
                    setSelectedProducts((prev) => {
                        const list = Array.isArray(prod) ? prod : [prod];
                        const merged = [...prev];
                        list.forEach(p => {
                            if (!merged.some(m => m.id === p.id)) {
                                merged.push(p);
                            }
                        });
                        return merged;
                    });
                },
                getOptions: () => products,
                getElement: () => {
                    const autocompletes = Array.from(document.querySelectorAll('.MuiAutocomplete-root'));
                    return autocompletes.find(a => a.querySelector('label')?.textContent?.includes('Products')) || null;
                }
            }
        ],
        clearAll: reset,
    }, open);

    const handleClose = () => {
        reset();
        onClose?.();
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Name is required');
            return;
        }

        if (selectedProducts.length === 0) {
            setError('At least one product is required');
            return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                name: name.trim(),
                description: description.trim(),
                products: selectedProducts.map((p) => ({
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
            setError(backend);
        } finally {
            setSaving(false);
        }
    };

    // --------------------------
    // 4. Render
    // --------------------------
    return (
        <Dialog open={!!open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Create Inventory Pool</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minHeight: 200 }}>

                    <TextField
                        name="name"
                        label="Pool Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        fullWidth
                    />

                    <TextField
                        name="description"
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
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

                    <Autocomplete
                        multiple
                        loading={loadingProducts}
                        options={products}
                        getOptionLabel={(option) => option.name || ''}
                        value={selectedProducts}
                        onChange={(_, newValue) => setSelectedProducts(newValue)}
                        fullWidth
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

                    {error && (
                        <Box sx={{ color: 'error.main', fontSize: '0.9rem' }}>{error}</Box>
                    )}
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}