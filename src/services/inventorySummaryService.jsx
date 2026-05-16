import api from './apiService.jsx';

export const inventorySummaryService = {
  getInventoryOverview: async () => {
    const branchId = localStorage.getItem('branchId');

    const { data: result } = await api.get('/inventory/current', {
      params: { branchId },
      meta: { includeDcid: true }, 
    });

    return {
      products: (result.products || []).map((product) => ({
        productId: product.productId,
        productName: product.productName,
        productCode: product.productCode,
        totalQuantity: product.totalQuantity,
        availableQuantity: product.availableQuantity,
        soiledQuantity: product.soiledQuantity,
        damagedQuantity: product.damagedQuantity,
        warehouse: {
          warehouseName: product.warehouse?.warehouseName || 'N/A',
        },
      })),
    };
  },

  // GET list (warehouse-scoped)
  getInwardRequests: async () => {
    const branchId = localStorage.getItem('branchId');
    const { data } = await api.get('/inventory/inward-requests', {
      params: { branchId },
      meta: { includeDcid: true }, // <-- injects dcId
    });
    return data;
  },

  // Local mock create (kept intact); when you move this to backend,
  // you can pass { meta: { includeDcid: true } } on that POST.
  createInwardRequest: async (requestData) => {
    const current = getStoredInwardRequests();
    const newRequest = {
      id: current.length + 1,
      referenceNumber: requestData.referenceNumber,
      inwardDate: requestData.inwardDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'RECEIVED',
      notes: requestData.notes || '',
      vendorId: requestData.vendorId,
      vendorName: requestData.vendorName || 'Demo Vendor',
      items: requestData.items.map((item, index) => ({
        id: index + 1,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode || 'PRD-XXX',
        quantity: item.quantity,
        remarks: item.remarks || '',
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 1,
        updatedBy: 1,
      })),
    };
    const updated = [...current, newRequest];
    saveInwardRequests(updated);
    return newRequest;
  },
};

// NOTE: Assuming these helpers already exist in your file.
// If not, bring over your existing implementations.
function getStoredInwardRequests() {
  const raw = localStorage.getItem('inward_requests');
  return raw ? JSON.parse(raw) : [];
}
function saveInwardRequests(list) {
  localStorage.setItem('inward_requests', JSON.stringify(list));
}
