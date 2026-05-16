import React, { useState } from 'react';
import { Popover, Typography, Box, Chip } from '@mui/material';

const ScannedIdsIndicator = ({ ids = [], children }) => {
    const [anchorEl, setAnchorEl] = useState(null);

    const handleClick = (event) => {
        event.stopPropagation();
        if (ids && ids.length > 0) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleClose = (event) => {
        event.stopPropagation();
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <span
                onClick={handleClick}
                style={{
                    cursor: ids?.length > 0 ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'stretch',
                    alignSelf: 'stretch',
                    height: '100%',
                }}
            >
                {children}
            </span>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                PaperProps={{
                    sx: {
                        p: 0,
                        maxWidth: 320,
                        maxHeight: 340,
                        mt: 1,
                        borderRadius: 2,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                    }
                }}
            >
                <Box sx={{
                    px: 2,
                    py: 1.25,
                    background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>
                        Scanned Inventory IDs
                    </Typography>
                    <Typography
                        variant="caption"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (ids?.length > 0) {
                                window.open(`/inventory?bulkItemIds=${ids.join(',')}`, '_blank');
                            }
                        }}
                        sx={{
                            color: 'rgba(255,255,255,0.85)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        {ids?.length || 0} items
                    </Typography>
                </Box>
                <Box sx={{ p: 1.5, overflowY: 'auto', maxHeight: 260 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ids?.map((id, index) => (
                            <Chip
                                key={`${id}-${index}`}
                                label={id}
                                size="small"
                                variant="outlined"
                                clickable
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/inventory?itemId=${id}`, '_blank');
                                }}
                                sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    borderColor: 'grey.300',
                                    backgroundColor: 'grey.50',
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'grey.100' },
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            </Popover>
        </>
    );
};

export default ScannedIdsIndicator;
