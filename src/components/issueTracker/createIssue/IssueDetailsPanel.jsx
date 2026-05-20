import React, { useEffect, useMemo, useState } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import Autocomplete from '@mui/material/Autocomplete';
import { orderService } from '../../../services/orderService.jsx';
import { washFulfillmentService } from '../../../services/washFulfillmentService.jsx';
import { format } from 'date-fns';

const SUGGESTED_STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SUGGESTED_SOURCE = ['CUSTOMER', 'LAUNDRY'];
const SUGGESTED_ISSUE_TYPE = ['OTHER', 'HEAVY_SOILED', 'QUALITY', 'MISSING', 'DAMAGE'];

export default function IssueDetailsPanel({
  form,
  setFormField,
  sourceOptions = [],
  sourceLoading = false,
  onChangeSourceType,
  onSelectSourceId,
  entityOptions: propEntityOptions,
  setEntityOptions: propSetEntityOptions,
  entityLoading: propEntityLoading,
  setEntityLoading: propSetSetEntityLoading,
}) {
  const triggerOptions = useMemo(() => {
    if (form.sourceType === 'CUSTOMER') return ['ORDER'];
    if (form.sourceType === 'LAUNDRY') return ['WASH_FULFILLMENT'];
    return [];
  }, [form.sourceType]);

  const getSourceId = (o) => o?.id ?? o?.customerId ?? o?.vendorId;
  const getSourceName = (o) => o?.name || o?.customerName || o?.laundryName || o?.companyName || '';

  // Local state for dependent list (Orders or Wash Fulfillments)
  const [localEntityOptions, localSetEntityOptions] = useState([]);
  const [localEntityLoading, localSetEntityLoading] = useState(false);

  const entityOptions = propEntityOptions !== undefined ? propEntityOptions : localEntityOptions;
  const setEntityOptions = propSetEntityOptions !== undefined ? propSetEntityOptions : localSetEntityOptions;
  const entityLoading = propEntityLoading !== undefined ? propEntityLoading : localEntityLoading;
  const setEntityLoading = propSetSetEntityLoading !== undefined ? propSetSetEntityLoading : localSetEntityLoading;

  // Helpers
  // Format local date without timezone (avoid UTC shift to 'yesterday')
  const toLocalDateTime = (v, endOfDay = false) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      if (endOfDay) {
        d.setHours(23, 59, 59, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      // Example: 2025-10-23T00:00:00 (no Z)
      return format(d, "yyyy-MM-dd'T'HH:mm:ss");
    } catch {
      return null;
    }
  };

  const entityLabel = form.sourceType === 'CUSTOMER' ? 'Orders' : 'Wash Fulfillments';
  const entitySingular = form.sourceType === 'CUSTOMER' ? 'Order' : 'Wash';
  // Helper to set start/end for a given calendar date
  const setDateRangeFor = (dateVal) => {
    if (!dateVal) return;
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0); // 00:00:00
    const end = new Date(d);
    end.setHours(23, 59, 59, 0); // 23:59:59
    setFormField('startDate', start);
    setFormField('endDate', end);
  };

  // Default hidden date range to today if not provided
  useEffect(() => {
    if (!form?.startDate || !form?.endDate) setDateRangeFor(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If exactly one entity is available, auto-select it
  useEffect(() => {
    if (Array.isArray(entityOptions) && entityOptions.length === 1) {
      const only = entityOptions[0];
      if (only?.id && form.triggerEntityId !== only.id) {
        setFormField('triggerEntityId', only.id);
        if (!form.triggerEntityType) {
          setFormField('triggerEntityType', form.sourceType === 'CUSTOMER' ? 'ORDER' : 'WASH_FULFILLMENT');
        }
      }
    }
  }, [entityOptions, form.triggerEntityId, form.triggerEntityType, form.sourceType, setFormField]);

  // Fetch dependent options whenever inputs change
  useEffect(() => {
    const { sourceType, sourceId, startDate, endDate } = form || {};
    setEntityOptions([]);

    if (!sourceType || !sourceId || !startDate || !endDate) return;

  const start = toLocalDateTime(startDate, false);
  const end = toLocalDateTime(endDate, true);
    if (!start || !end) return;

    let cancelled = false;
    const run = async () => {
      setEntityLoading(true);
      try {
        if (sourceType === 'CUSTOMER') {
          const filter = {
            customerId: sourceId,
            startDate: start,
            endDate: end,
          };
          const data = await orderService.searchOrders(filter);
          const list = Array.isArray(data) ? data : (data?.content ?? []);
          if (!cancelled) setEntityOptions(list);
        } else if (sourceType === 'LAUNDRY') {
          const data = await washFulfillmentService.search(start, end);
          const list = Array.isArray(data) ? data : (data?.content ?? []);
          if (!cancelled) setEntityOptions(list);
        }
      } catch {
        // swallow error; optional enhancement: surface via snackbar from parent
      } finally {
        if (!cancelled) setEntityLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sourceType, form.sourceId, form.startDate, form.endDate]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.5,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Issue Details
      </Typography>
      <Stack spacing={{ xs: 1.5, md: 2 }}>
        <DatePicker
          label="Issue Date"
          value={form.recordedDateTime || null}
          onChange={(val) => setFormField('recordedDateTime', val)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />

        <TextField
          select
          fullWidth
          size="small"
          label="Source Type"
          value={form.sourceType}
          onChange={(e) => (onChangeSourceType ? onChangeSourceType(e.target.value) : setFormField('sourceType', e.target.value))}
        >
          {SUGGESTED_SOURCE.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>

        <Autocomplete
          fullWidth
          size="small"
          options={sourceOptions || []}
          getOptionLabel={(opt) => (opt ? getSourceName(opt) : '')}
          isOptionEqualToValue={(opt, val) => getSourceId(opt) === getSourceId(val)}
          value={(sourceOptions || []).find((o) => getSourceId(o) === (form.sourceId ?? null)) || null}
          onChange={(_, val) => (onSelectSourceId ? onSelectSourceId(val ? getSourceId(val) : undefined) : setFormField('sourceId', val ? getSourceId(val) : undefined))}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Source Name"
              placeholder={!form.sourceType ? 'Select Source Type first' : 'Search...'}
              disabled={!form.sourceType || sourceLoading}
              helperText={!form.sourceType ? 'Select Source Type first' : undefined}
            />
          )}
        />

        <TextField
          select
          fullWidth
          size="small"
          label="Trigger Entity"
          value={form.triggerEntityType}
          onChange={(e) => setFormField('triggerEntityType', e.target.value)}
          disabled={!form.sourceType}
          helperText={!form.sourceType ? 'Select Source Type to see options' : undefined}
        >
          {triggerOptions.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>

        {/* Single Date selector controlling start/end (00:00:00 to 23:59:59) */}
        <DatePicker
          label={form.sourceType === 'CUSTOMER' ? 'Order Date' : 'Wash Date'}
          value={form.startDate || null}
          onChange={(val) => setDateRangeFor(val)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />

        {/* Hidden: Start and End Date (defaulted to today). Uncomment to show.
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <DatePicker
            label="Start Date"
            value={form.startDate || null}
            onChange={(val) => setFormField('startDate', val)}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
          <DatePicker
            label="End Date"
            value={form.endDate || null}
            onChange={(val) => setFormField('endDate', val)}
            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
          />
        </Stack>
        */}

        {/* Dependent selection: Orders (CUSTOMER) or Wash Fulfillments (LAUNDRY) for today's date */}
        {entityLoading ? (
          <TextField select fullWidth size="small" label={entityLabel} disabled>
            <MenuItem disabled>Loading…</MenuItem>
          </TextField>
        ) : !form.sourceType || !form.sourceId ? (
          <TextField select fullWidth size="small" label={entityLabel} disabled helperText="Select source to load options" />
        ) : Array.isArray(entityOptions) && entityOptions.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {form.sourceType === 'CUSTOMER' ? 'No orders found' : 'No wash fulfillments found'}
          </Typography>
        ) : Array.isArray(entityOptions) && entityOptions.length === 1 ? (
          <Typography variant="body2">
            {entitySingular} ID: #{entityOptions[0].id}
          </Typography>
        ) : (
          <TextField
            select
            fullWidth
            size="small"
            label={entityLabel}
            value={form.triggerEntityId || ''}
            onChange={(e) => {
              const val = e.target.value || undefined;
              setFormField('triggerEntityId', val);
              if (!form.triggerEntityType) {
                setFormField('triggerEntityType', form.sourceType === 'CUSTOMER' ? 'ORDER' : 'WASH_FULFILLMENT');
              }
            }}
          >
            {entityOptions.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {form.sourceType === 'CUSTOMER' ? `Order #${o.id}` : `Wash #${o.id}`}
              </MenuItem>
            ))}
          </TextField>
        )}

        

        <TextField
          select
          fullWidth
          size="small"
          label="Issue Type"
          value={form.issueType}
          onChange={(e) => setFormField('issueType', e.target.value)}
        >
          {SUGGESTED_ISSUE_TYPE.map((t) => (
            <MenuItem key={t} value={t}>{t}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          fullWidth
          size="small"
          label="Status"
          value={form.status}
          onChange={(e) => setFormField('status', e.target.value)}
        >
          {SUGGESTED_STATUS.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          size="small"
          label="Description"
          value={form.description}
          onChange={(e) => setFormField('description', e.target.value)}
        />
      </Stack>
    </Box>
  );
}
