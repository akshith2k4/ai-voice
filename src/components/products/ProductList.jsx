import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  AppBar,
  Toolbar,
  Avatar,
  InputAdornment,
  Chip,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  LocalLaundryService as LocalLaundryServiceIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ProductDialog from './ProductDialog';
import { productService } from '../../services/productService';
import CustomSnackbar from '../layout/CustomSnackbar';

function ProductList() {
  const theme = useTheme();
  const emptyProduct = {
    id: null,
    name: '',
    description: '',
    imageUrl: '',
    category: '',
    hsnCode: ''
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(emptyProduct);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const handleSave = async (productData) => {
    try {
      const branchId = localStorage.getItem('branchId');
      if (editingProduct) {
        await productService.updateProduct(editingProduct, { ...productData, branchId, code: productData.hsnCode });
      } else {
        const backendProduct = {
          name: productData.name,
          description: productData.description,
          code: productData.hsnCode,
          category: productData.category,
          branchId,
          status: 'ACTIVE'
        };
        await productService.createProduct(backendProduct);
      }
      loadProducts();
      setOpenDialog(false);
      setCurrentProduct(emptyProduct);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
      const backendMessage = error.response?.data?.message || 'Something went wrong while saving the product.';
      setSnackbarMessage(backendMessage);
      setSnackbarOpen(true);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
         await productService.deleteProduct(id);
         loadProducts();
        
      } catch (error) {
        console.error('Error deleting product:', error);
        const backendMessage = error.response?.data?.message || 'Something went wrong while deleting the product.';
        setSnackbarMessage(backendMessage);
        setSnackbarOpen(true);
      }
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts();
      const transformedProducts = data.map(transformProduct);
      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const transformProduct = (backendProduct) => ({
    id: backendProduct.id,
    name: backendProduct.name,
    description: backendProduct.description,
    category: backendProduct.category,
    hsnCode: backendProduct.code,
    status: backendProduct.status
  });

  const handleEdit = (product) => {
    console.log('Editing product:', product); // Debugging line
    setEditingProduct(product.id);
    setCurrentProduct(product);
    setOpenDialog(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setCurrentProduct(emptyProduct);
    setOpenDialog(true);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Container maxWidth="lg" sx={{ mb: 2 }}>
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          Product Management
        </Typography>
        
        <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Box>
            <TextField
              fullWidth
              size="small"
              placeholder="Search products..."
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ backgroundColor: 'background.paper', borderRadius: 1, maxWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                sx: { height: '40px' }
              }}
            />
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              sx={{ 
                px: 2,
                height: '40px',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
            }}
              onClick={handleAdd}
            >
              Add Product
            </Button>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter' }}><strong>Name</strong></TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Product ID</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>Category</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}>HSN Code</TableCell>
              <TableCell sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow 
                key={product.id} 
                hover
                sx={{
                  cursor: 'pointer',
                  '&:nth-of-type(odd)': {
                    backgroundColor: 'background.default',
                  },
                  '& td': { py: 1 }
                }}
              >
                <TableCell><strong>{product.name}</strong></TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {product.id}
                  </Box>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{product.hsnCode}</TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No products found matching your search
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}

      <ProductDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingProduct(null);
        }}
        onSave={handleSave}
        product={currentProduct}
      />

      <CustomSnackbar
        open={snackbarOpen}
        message={snackbarMessage}
        onClose={() => setSnackbarOpen(false)}
      />
    </Container>
  );
}

export default ProductList; 