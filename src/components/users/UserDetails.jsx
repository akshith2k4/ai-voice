import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as DepartmentIcon,
  Badge as RoleIcon,
  Circle as StatusIcon,
  AccessTime as TimeIcon,
  Event as CreatedAtIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

function UserDetails({ user, onClose }) {
  if (!user) return null;

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '-';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd/MM/yyyy HH:mm');
    } catch (error) {
      return '-';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'primary';
      case 'USER':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
      <Box sx={{ 
        p: 2,
        px: 3, 
        borderBottom: 1, 
        borderColor: '#e0e0e0',
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#1a1a1a'
          }}
        >
          User Details
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{
            color: '#757575',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', backgroundColor: '#ffffff', px: 3, py: 2 }}>
        <List disablePadding>
          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PersonIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Personal Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Name:</strong> {user.name}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Email:</strong> {user.email}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Phone:</strong> {user.phone}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DepartmentIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Department:</strong> {user.department}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <RoleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Role:</strong>{' '}
                      <Chip
                        label={user.role}
                        size="small"
                        color={getRoleColor(user.role)}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StatusIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Status:</strong>{' '}
                      <Chip
                        label={user.status}
                        size="small"
                        color={getStatusColor(user.status)}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </ListItem>
          <Divider />

          <ListItem>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimeIcon sx={{ mr: 1, color: '#2e7d32' }} />
                  <Typography variant="subtitle1" sx={{ color: '#2e7d32', fontWeight: 500 }}>
                    Activity Information
                  </Typography>
                </Box>
              }
              secondary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Last Login:</strong> {formatDate(user.lastLogin)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreatedAtIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.primary">
                      <strong>Created At:</strong> {formatDate(user.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
}

export default UserDetails; 