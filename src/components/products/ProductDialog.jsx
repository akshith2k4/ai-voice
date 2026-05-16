import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { LocalLaundryService as ProductIcon } from '@mui/icons-material';
import { productService } from '../../services/productService';

function ProductDialog({ open, onClose, onSave, product }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (product) {
      console.log(product);
      setName(product.name || '');
      setDescription(product.description || '');
      setHsnCode(product.hsnCode || '');
      setCategory(product.category || '');
    }
  }, [product]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await productService.getProductCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSave = () => {
    onSave({ name, description, hsnCode, category });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 1,
        }
      }}
    >
      <DialogTitle sx={{ 
        px: 3,
        py: 2,
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ProductIcon sx={{ mr: 1, color: '#2e7d32' }} />
          <Typography variant="h6">
            {product ? 'Edit Product' : 'Add New Product'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        p: 3,
        mt: 1
      }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Product Name"
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              size="small"
              multiline
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="HSN Code"
              size="small"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" sx={{ mt: 0 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{ height: '40px' }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          sx={{ 
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          {product ? 'Save Changes' : 'Add Product'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProductDialog; 