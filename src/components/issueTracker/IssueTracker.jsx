import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Divider, Drawer, Paper, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import Section from '../dashboard/Section';
import EmptyState from '../dashboard/EmptyState';
import ErrorState from '../dashboard/ErrorState';
import issueService from '../../services/issueService.jsx';
import IssueFilters from './IssueFilters';
import IssuesTable from './IssuesTable';
import CreateIssueDialog from './CreateIssueDialog';
import IssueDetails from './IssueDetails';

export default function IssueTracker() {
  // Filters
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    sourceType: '',
    status: '',
  });

  // Data
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        // Backend expects LocalDateTime; provide ISO strings at day boundaries
        startDate: filters.startDate ? format(filters.startDate, "yyyy-MM-dd'T'00:00:00") : undefined,
        endDate: filters.endDate ? format(filters.endDate, "yyyy-MM-dd'T'23:59:59") : undefined,
        sourceType: filters.sourceType || undefined,
        status: filters.status || undefined,
      };
      const data = await issueService.search(payload);
      setIssues(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to fetch issues', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load with no filters
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleDelete = async (issueId) => {
    if (!issueId) return;
    const confirmed = window.confirm('Delete this issue? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await issueService.delete(issueId);
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
    } catch (e) {
      console.error('Failed to delete issue', e);
      alert('Failed to delete issue.');
      // Optionally set error state
    }
  };

  const openNewIssue = () => setOpenCreate(true);
  const closeNewIssue = () => setOpenCreate(false);

  const handleCreateSubmit = async (payload) => {
    try {
      const created = await issueService.create(payload);
      if (created) setIssues((prev) => [created, ...prev]);
      closeNewIssue();
    } catch (e) {
      console.error('Failed to create issue', e);
      alert('Failed to create issue. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 2,
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Issue Management</Typography>

        {/* Filters aligned like Orders page: left group (filters+search), right group (refresh + new) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            width: '100%',
          }}
        >
          <IssueFilters
            filters={filters}
            setFilters={setFilters}
            onSearch={handleFetch}
            loading={loading}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleFetch}
              disabled={loading}
              sx={{ height: 40, minWidth: 120, whiteSpace: 'nowrap', textTransform: 'none' }}
            >
              Refresh
            </Button> */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNewIssue}
              data-agent-action="new-issue"
              sx={{
                height: 40,
                minWidth: 120,
                whiteSpace: 'nowrap',
                textTransform: 'none',
                background: 'linear-gradient(45deg, #2e7d32 30%, #43a047 90%)',
                boxShadow: '0 2px 4px rgba(46, 125, 50, 0.25)',
              }}
            >
              New Issue
            </Button>
          </Box>
        </Box>
        </Paper>

        {/* <Divider sx={{ my: 2 }} /> */}

        {/* Results */}
        {loading && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            Loading issues...
          </Typography>
        )}
        {error ? (
          <ErrorState error={error} />
        ) : issues.length === 0 ? (
          <EmptyState title="No issues found" subtitle="Try adjusting filters or create a new issue." />
        ) : (
          <IssuesTable issues={issues} onDelete={handleDelete} onRowClick={(iss) => setSelectedIssue(iss)} />
        )}

      <Drawer
        anchor="right"
        open={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
        PaperProps={{
          elevation: 1,
          sx: {
            width: 450,
            backgroundColor: '#ffffff !important',
            boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <IssueDetails
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onResolved={(updated) => {
            if (updated && updated.id) {
              setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
              setSelectedIssue(updated);
            } else {
              // Fallback: refresh list and try to minimally update sidebar
              handleFetch();
              if (updated?.resolution) {
                setSelectedIssue((prev) => (prev ? {
                  ...prev,
                  resolution: updated.resolution,
                  resolvedAt: updated.resolution?.resolvedAt ?? prev.resolvedAt,
                  status: updated.status ?? 'RESOLVED',
                } : prev));
              }
            }
          }}
        />
      </Drawer>

      <CreateIssueDialog open={openCreate} onClose={closeNewIssue} onSubmit={handleCreateSubmit} />
    </Container>
  );
}
