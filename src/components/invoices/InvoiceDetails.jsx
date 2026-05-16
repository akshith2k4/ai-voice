import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Divider,
  Box,
  Button,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  AttachMoney as MoneyIcon,
  ListAlt as ListAltIcon,
  Payment as PaymentIcon,
  Info as InfoIcon,
  Receipt as TaxIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { keyframes } from '@mui/system';
import CustomDrawer from "../common/CustomDrawer";
import ConfirmDialog from "../common/ConfirmDialog";
import StatusChip from "../common/StatusChip";
import { formatCustomDate } from '../../utils/dateUtils';
import { invoiceService } from '../../services/invoiceService';

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

function InvoiceDetails({ invoice, onClose, onAddPayment, onInvoiceUpdated }) {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const formatMoney = (value) => {
    try {
      const num = Number(value ?? 0);
      if (Number.isNaN(num)) return '₹ 0.00';
      return `₹ ${num.toFixed(2)}`;
    } catch {
      return '₹ 0.00';
    }
  };

  const handleIssueInvoice = async () => {
    try {
      setIssuing(true);
      await invoiceService.issueInvoice(invoice.id);
      setIssueDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (error) {
      console.error('Error issuing invoice:', error);
    } finally {
      setIssuing(false);
    }
  };

  const handleRefreshInvoice = async () => {
    try {
      setRefreshing(true);
      await invoiceService.refreshInvoiceByBillingCycle(invoice.billingCycleId);
      setRefreshDialogOpen(false);
      onInvoiceUpdated?.();
    } catch (error) {
      console.error('Error refreshing invoice:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isDraftIdx = invoice?.status === 'DRAFT';
  const hasBillingCycle = Boolean(invoice?.billingCycleId);

  const isDraft = invoice?.status === 'DRAFT';

  return (
    <CustomDrawer open={Boolean(invoice)} onClose={onClose} width={600}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ mb: 0 }}>
              Invoice Details
            </Typography>
            {isDraftIdx && hasBillingCycle && (
              <IconButton
                size="small"
                onClick={() => setRefreshDialogOpen(true)}
                disabled={refreshing}
                sx={{
                  animation: refreshing ? `${spin} 1s linear infinite` : 'none',
                  color: 'primary.main',
                }}
                title="Refresh items from billing cycle"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ my: 2 }} />

        {/* ── Basic Details ──────────────────────────────── */}
        <Typography variant="h6" gutterBottom>
          <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Basic Details
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Invoice Number:</strong> {invoice?.invoiceNumber || '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Issue Date:</strong> {formatCustomDate(invoice?.issueDate)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Due Date:</strong> {formatCustomDate(invoice?.dueDate)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Posted At:</strong> {invoice?.postedAt ? formatCustomDate(invoice.postedAt) : '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Status:</strong>{' '}
          <StatusChip status={invoice?.status} />
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Payment Status:</strong>{' '}
          <StatusChip status={invoice?.paymentStatus} />
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Direction:</strong>{' '}
          <Chip
            label={invoice?.invoiceDirection === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
            size="small"
            color={invoice?.invoiceDirection === 'RECEIVABLE' ? 'primary' : 'secondary'}
            variant="outlined"
          />
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Bill To Name:</strong> {invoice?.billToName || '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Bill To ID:</strong> {invoice?.billToId || '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Bill To Type:</strong> {invoice?.billToType || '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Billing Cycle ID:</strong> {invoice?.billingCycleId || '—'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Currency:</strong> {invoice?.currency || '—'}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* ── Amount Details ─────────────────────────────── */}
        <Typography variant="h6" gutterBottom>
          <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Amount Details
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Subtotal:</strong> {formatMoney(invoice?.subtotal)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Tax Total:</strong> {formatMoney(invoice?.taxTotal)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem' }}>
          <strong>Grand Total:</strong> {formatMoney(invoice?.grandTotal)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Amount Paid:</strong> {formatMoney(invoice?.amountPaid)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1, color: invoice?.amountDue > 0 ? 'error.main' : 'success.main' }}>
          <strong>Amount Due:</strong> {formatMoney(invoice?.amountDue)}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* ── Tax Breakdown ──────────────────────────────── */}
        {invoice?.taxes?.length > 0 && (
          <>
            <Typography variant="h6" gutterBottom>
              <TaxIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Tax Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Tax Code</strong></TableCell>
                    <TableCell align="right"><strong>Rate (%)</strong></TableCell>
                    <TableCell align="right"><strong>Amount</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.taxes.map((tax, idx) => (
                    <TableRow key={tax?.id ?? idx}>
                      <TableCell>{tax?.taxCode || '—'}</TableCell>
                      <TableCell align="right">{tax?.taxRate ?? '—'}</TableCell>
                      <TableCell align="right">{formatMoney(tax?.taxAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* ── Invoice Items ──────────────────────────────── */}
        {/* <Typography variant="h6" gutterBottom>
          <ListAltIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Invoice Items
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Item Code</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell align="right"><strong>Qty</strong></TableCell>
                <TableCell align="right"><strong>Unit Price</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoice?.items ?? []).map((item, idx) => (
                <TableRow key={item?.id ?? idx}>
                  <TableCell>{item?.itemCode || '—'}</TableCell>
                  <TableCell>{item?.description || '—'}</TableCell>
                  <TableCell align="right">{item?.quantity ?? '—'}</TableCell>
                  <TableCell align="right">{formatMoney(item?.unitPrice)}</TableCell>
                  <TableCell align="right">{formatMoney(item?.lineAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer> */}

        {/* <Divider sx={{ my: 2 }} /> */}

        {/* ── Payments ───────────────────────────────────── */}
        <Typography variant="h6" gutterBottom>
          <PaymentIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Payments
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell align="right"><strong>Amount</strong></TableCell>
                <TableCell><strong>Mode</strong></TableCell>
                <TableCell><strong>Reference</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(invoice?.payments ?? []).length > 0 ? (
                invoice.payments.map((payment, idx) => (
                  <TableRow key={payment?.id ?? idx}>
                    <TableCell>{formatCustomDate(payment?.paymentDate)}</TableCell>
                    <TableCell align="right">{formatMoney(payment?.amount)}</TableCell>
                    <TableCell>{payment?.mode || '—'}</TableCell>
                    <TableCell>{payment?.referenceNumber || '—'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    No payments recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {isDraft && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setIssueDialogOpen(true)}
            >
              Issue Invoice
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={onAddPayment}
          >
            Add Payment
          </Button>
        </Box>
      </Paper>

      {/* ── Issue Invoice Confirmation Dialog ──────────── */}
      <ConfirmDialog
        open={issueDialogOpen}
        onClose={() => setIssueDialogOpen(false)}
        onConfirm={handleIssueInvoice}
        title="Issue Invoice"
        warning="This action is irreversible."
        message="We will finalise this invoice and it will now be official. We will share this with the customer after this step."
        confirmText="Confirm & Issue"
        loading={issuing}
        loadingText="Issuing..."
      />

      {/* ── Refresh Items Confirmation Dialog ──────────── */}
      <ConfirmDialog
        open={refreshDialogOpen}
        onClose={() => setRefreshDialogOpen(false)}
        onConfirm={handleRefreshInvoice}
        title="Refresh Invoice Items"
        warning="This will clear current items and recalculate them from billable data."
        message="Are you sure you want to refresh the line items for this draft invoice?"
        confirmText="Confirm & Refresh"
        loading={refreshing}
        loadingText="Refreshing..."
      />
    </CustomDrawer>
  );
}

export default InvoiceDetails;