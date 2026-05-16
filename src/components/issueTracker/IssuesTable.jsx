import {
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCustomDate } from '../../utils/dateUtils';

// Format like '23rd Oct, 2025'
// const fmtDate = (d) => (d ? format(new Date(d), 'do LLL, yyyy') : '—');

export default function IssuesTable({ issues, onDelete, onRowClick }) {
  return (
    <TableContainer component={Paper} elevation={3}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {[
              'ID',
              'Source Type',
              'Name',
              // 'Trigger Type',
              // 'Trigger ID',
              'Issue Type',
              'Status',
              'Issue Date',
              'Resolved',
              'Actions',
            ].map((h) => (
              <TableCell
                key={h}
                sx={{ py: 1.5, backgroundColor: 'primary.lighter', fontWeight: 500 }}
                {...(h === 'Actions' ? { align: 'right' } : {})}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {issues.map((iss) => (
            <TableRow
              key={iss.id}
              hover
              onClick={() => onRowClick && onRowClick(iss)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:nth-of-type(odd)': { backgroundColor: 'background.default' },
                '& td': { py: 1 },
              }}
            >
              <TableCell>{iss.id}</TableCell>
              <TableCell>{iss.sourceType || '—'}</TableCell>
              <TableCell>{iss.sourceName || '—'}</TableCell>
              {/* <TableCell>{iss.triggerEntityType || '—'}</TableCell> */}
              {/* <TableCell>{iss.triggerEntityId || '—'}</TableCell> */}
              <TableCell>{iss.issueType || '—'}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={iss.status || '—'}
                  color={
                    iss.status === 'OPEN'
                      ? 'warning'
                      : iss.status === 'IN_PROGRESS'
                      ? 'info'
                      : iss.status === 'RESOLVED'
                      ? 'success'
                      : iss.status === 'CLOSED'
                      ? 'default'
                      : 'default'
                  }
                />
              </TableCell>
              <TableCell>{formatCustomDate(iss.recordedDateTime || iss.createdAt)}</TableCell>
              <TableCell>{formatCustomDate(iss?.resolution?.resolvedAt || iss.resolvedAt)}</TableCell>
              <TableCell align="right">
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(iss.id); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
