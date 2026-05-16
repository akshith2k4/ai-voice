import React from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SearchIcon from '@mui/icons-material/Search';

export default function IssueFilters({ filters, setFilters, onSearch, loading }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          overflowX: { xs: 'auto', md: 'visible' },
          pb: 0.5,
        }}
      >
        <Box sx={{ width: 150, minWidth: 130 }}>
          <DatePicker
            label="Start date"
            value={filters.startDate}
            onChange={(val) => setFilters((f) => ({ ...f, startDate: val }))}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Box>
        <Box sx={{ width: 150, minWidth: 130 }}>
          <DatePicker
            label="End date"
            value={filters.endDate}
            onChange={(val) => setFilters((f) => ({ ...f, endDate: val }))}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Box>
        <Box sx={{ width: 150, minWidth: 130 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Source Type</InputLabel>
            <Select
              label="Source Type"
              value={filters.sourceType || ''}
              onChange={(e) => setFilters((f) => ({ ...f, sourceType: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CUSTOMER">CUSTOMER</MenuItem>
              <MenuItem value="LAUNDRY">LAUNDRY</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ width: 150, minWidth: 130 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              value={filters.status || ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="OPEN">OPEN</MenuItem>
              <MenuItem value="IN_PROGRESS">IN_PROGRESS</MenuItem>
              <MenuItem value="RESOLVED">RESOLVED</MenuItem>
              <MenuItem value="CLOSED">CLOSED</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={onSearch}
          disabled={loading}
          sx={{
            height: 40,
            minWidth: 96,
            whiteSpace: 'nowrap',
            textTransform: 'none',
            background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
            boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
          }}
        >
          Search
        </Button>
      </Box>
    </Box>
  );
}
