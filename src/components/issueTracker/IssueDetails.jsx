import React from 'react';
import {
  Box,
  Divider,
  Grid,
  Typography,
  Chip,
  IconButton,
  Button
} from '@mui/material';
import { ReportProblem as IssueIcon, Close as CloseIcon } from '@mui/icons-material';
import VisitImagesDialog from '../trips/VisitImagesDialog.jsx';
import ResolveIssueDialog from './ResolveIssueDialog.jsx';
import { DATE_TIME, formatCustomDate } from '../../utils/dateUtils.js';

// Match date style used elsewhere: '23rd Oct, 2025'
// const fmtDate = (d) => (d ? format(new Date(d), 'do LLL, yyyy') : '—');

export default function IssueDetails({ issue, onClose, onResolved }) {
  // Resolve UI state hooks must be declared before any conditional returns
  const [resolveOpen, setResolveOpen] = React.useState(false);

  if (!issue) return null;

  // const recorded = issue.recordedDateTime ? formatCustomDate(issue.recordedDateTime, DATE_TIME) : null;
  // const created = formatCustomDate(issue.createdAt);

  const images = issue?.item?.images || [];
  const inventoryItemIds = issue?.item?.inventoryItemIds || [];

  // helper to render label/value rows similar to OrderDetails
  const Row = ({ label, children }) => (
    <Box sx={{ mb: 0.5 }}>
      <Typography component="div" variant="body2" sx={{ fontWeight: 700, display: 'inline' }}>
        {label}
      </Typography>
      <Typography component="span" variant="body2" sx={{ ml: 1 }}>
        {children}
      </Typography>
    </Box>
  );

  // status chip color mapping (keeps visual parity with Orders)
  const statusColor = (status) => {
    if (!status) return { bg: '#9e9e9e', fg: '#fff' };
    switch (status) {
      case 'COMPLETED':
      case 'RESOLVED':
        return { bg: '#2e7d32', fg: '#fff' }; // green
      case 'IN_PROGRESS':
      case 'PENDING':
        return { bg: '#ff9800', fg: '#fff' }; // amber
      case 'OPEN':
        return { bg: '#1976d2', fg: '#fff' }; // blue
      case 'CLOSED':
        return { bg: '#616161', fg: '#fff' }; // grey
      default:
        return { bg: '#9e9e9e', fg: '#fff' }; // default grey
    }
  };

  const statusStyle = statusColor(issue.status);

  const handleOpenResolve = () => setResolveOpen(true);

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      // remove background to avoid boxed look
    }}>
      {/* Header */}
      <Box sx={{
        p: 2,
        px: 3,
        borderBottom: 1,
        borderColor: '#e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        // no background to keep flat layout
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IssueIcon sx={{ color: '#2e7d32' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
            Issue Details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Resolve button hidden when Completed or Resolved */}
          {issue.status !== 'COMPLETED' && issue.status !== 'RESOLVED' && (
            <Button
              variant="contained"
              size="small"
              onClick={handleOpenResolve}
            >
              Resolve
            </Button>
          )}
          {onClose && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: '#757575',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 3, py: 2 }}>
        {/* Issue Information */}
        <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
          Issue Information
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Row label="ID:">#{issue.id}</Row>
          <Row label="Source Type:">
            {issue.sourceType || '—'}
          </Row>
          <Row label="Source Id:">
            {issue.sourceId || '—'}
          </Row>
          <Row label="Source Name:">
            {issue.sourceName || '—'}
          </Row>
          <Row label="Trigger:">
            {issue.triggerEntityType || '—'} {issue.triggerEntityId ? ` ( #${issue.triggerEntityId} )` : ''}
          </Row>

          <Row label="Type:">
            {issue.issueType ? (
              <Chip
                size="small"
                label={issue.issueType}
                sx={{ backgroundColor: '#e0e0e0', fontWeight: 600 }}
              />
            ) : '—'}
          </Row>

          <Row label="Status:">
            <Chip
              size="small"
              label={issue.status || '—'}
              sx={{
                fontWeight: 600,
                color: statusStyle.fg,
                backgroundColor: statusStyle.bg,
                ml: 1,
              }}
            />
          </Row>

          {(issue.assignedToName || issue.assignedToType || issue.assignedToId) && (
            <Row label="Assigned To:">
              {issue.assignedToName || '—'}
            </Row>
          )}

          {issue.createdByRole && <Row label="Created By:">{issue.createdByRole}</Row>}
          <Row label="Recorded:">{formatCustomDate(issue.recordedDateTime, DATE_TIME)}</Row>
          <Row label="Created:">{formatCustomDate(issue.createdAt)}</Row>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Description & Resolution in their own section */}
        <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
          Details
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, display: 'inline' }}>Description:</Typography>
            <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>{issue.description || '—'}</Typography>
          </Box>

          {issue.resolutionNotes && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, display: 'inline' }}>Resolution Notes:</Typography>
              <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>{issue.resolutionNotes}</Typography>
            </Box>
          )}
        </Box>

        {(issue.item || (Array.isArray(issue.attachments) && issue.attachments.length > 0)) && (
          <Divider sx={{ mb: 2 }} />
        )}

        {/* Item & Attachments sections */}
        {issue.item && (
          <>
            <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
              Item Information
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Row label="Product:">{issue.item.productName || '—'} {issue.item.productId ? `( #${issue.item.productId} )` : ''}</Row>
              <Row label="Quantity:">{issue.item.quantity ?? '—'}</Row>
              {inventoryItemIds.length > 0 && <Row label="Inventory Items:">{inventoryItemIds.join(', ')}</Row>}
              {images.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <VisitImagesDialog imageUrls={images} title="Item Images" />
                </Box>
              )}
            </Box>
          </>
        )}

        {issue?.resolution && (
          <>
            <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
              Resolution Information
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Row label="Type:">{issue.resolution.resolutionType || '—'}</Row>
              <Row label="Resolved At:">{formatCustomDate(issue.resolution.resolvedAt)}</Row>
              {(issue.resolution.resolvedByName || issue.resolution.resolvedById) && (
                <Row label="Resolved By:">{issue.resolution.resolvedByName || (issue.resolution.resolvedById ? `#${issue.resolution.resolvedById}` : '—')}</Row>
              )}
              {issue.resolution.notes && (
                <Row label="Notes:">{issue.resolution.notes}</Row>
              )}
            </Box>
          </>
        )}



        {Array.isArray(issue.attachments) && issue.attachments.length > 0 && (
          <>
            <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500, mb: 1 }}>
              Attachments
            </Typography>
            <Box sx={{ mb: 2 }}>
              <VisitImagesDialog imageUrls={issue.attachments} title="Attachments" />
            </Box>
          </>
        )}
      </Box>

      <ResolveIssueDialog
        open={resolveOpen}
        issueId={issue.id}
        onClose={() => setResolveOpen(false)}
        onResolved={(updated) => onResolved?.(updated)}
      />
    </Box>
  );
}
