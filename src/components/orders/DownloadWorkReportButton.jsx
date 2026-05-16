import React, { useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { format, startOfDay, endOfDay } from 'date-fns';
import { orderService } from '../../services/orderService';
import { downloadWorkReportXLSX } from '../../utils/workReport';

export default function DownloadWorkReportButton({
  startDate,
  endDate,
  selectedCustomer,
  dcId,
  sx
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    setLoading(true);
    try {
      // Build local start-of-day and end-of-day strings WITHOUT timezone ('Z')
      // API expects: "yyyy-MM-dd'T'HH:mm:ss" in local server time.
      const start = format(startOfDay(new Date(startDate)), "yyyy-MM-dd'T'HH:mm:ss");
      const end = format(endOfDay(new Date(endDate)), "yyyy-MM-dd'T'HH:mm:ss");

      const filter = {
        startDate: start,
        endDate: end,
        status: null,
        orderType: null,
        customerId: selectedCustomer ? selectedCustomer.id : null,
        branchId: null,
        dcId: dcId ?? null
      };

      const orders = await orderService.searchOrders(filter);

      if (!Array.isArray(orders) || orders.length === 0) {
        alert('No orders found for the selected range.');
        return;
      }

  // Use the same date parts we send to the API for consistent filenames
  const startStr = start.slice(0, 10).replace(/-/g, '');
  const endStr = end.slice(0, 10).replace(/-/g, '');
      const fileName = `work-report_${startStr}_to_${endStr}.xlsx`;

      downloadWorkReportXLSX(orders, fileName);
    } catch (err) {
      console.error(err);
      alert('Failed to download report. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outlined"
      startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
      onClick={handleDownload}
      disabled={loading}
      sx={{
        height: '40px',
        textTransform: 'none',
        borderColor: '#2e7d32',
        color: '#2e7d32',
        '&:hover': { borderColor: '#1b5e20', backgroundColor: 'rgba(27,94,32,0.06)' },
        ...sx
      }}
    >
      {loading ? 'Building…' : 'Download'}
    </Button>
  );
}
