
import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupIcon from '@mui/icons-material/Group';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import RouteIcon from '@mui/icons-material/Route';
import BusinessIcon from '@mui/icons-material/Business';

function RouteDrawer({ open, onClose, route }) {
  if (!route) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '8px 0 0 8px',
          backgroundColor: 'background.paper'
        }
      }}
    >
  <Box sx={{ width: { xs: '100vw', sm: 450 }, height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            px: 3,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RouteIcon sx={{ mr: 1, color: 'success.main', fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Route Details
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: 'background.paper', px: 2, py: 2 }}>
          <Box mb={2}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Route Information
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}>
              Name: {route.name}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', mb: 0.5 }}>
              ID: {route.id}
            </Typography>
            {/* <Chip
              label={`Route ID: ${route.id}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            /> */}
          </Box>

          <Divider />

          <Box mt={2} mb={1}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
              <GroupIcon sx={{ mr: 1, fontSize: 18, color: 'success.main' }} />
              Assigned Points ({route.points?.length || 0})
            </Typography>
          </Box>

          {route.points && route.points.length > 0 ? (
            <List dense sx={{ bgcolor: 'background.paper' }}>
              {route.points.map((point, idx) => (
                <ListItem key={point.partyId ?? idx} divider sx={{ py: 1.25, px: 1 }}>
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    <Avatar sx={{ bgcolor: point.partyType === 'CUSTOMER' ? 'success.main' : 'info.main', width: 32, height: 32 }}>
                      {point.partyType === 'CUSTOMER' ? <GroupIcon fontSize="small" /> : <BusinessIcon fontSize="small" />}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.25, color: 'text.primary' }}>
                        {point.name}
                      </Typography>
                    }
                    secondary={
                      <Box component="span">
                        <Chip 
                          label={point.partyType === 'CUSTOMER' ? 'Customer' : 'Laundry Vendor'} 
                          size="small" 
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.65rem', mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', backgroundColor: 'background.paper' }}>
              <GroupIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No points assigned to this route yet
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}

export default RouteDrawer;
