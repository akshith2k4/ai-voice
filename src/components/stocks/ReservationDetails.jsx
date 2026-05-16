import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Box
} from '@mui/material';

function ReservationDetails({ reservation, onClose }) {
    if (!reservation) return null;

    return (
        <Dialog open={Boolean(reservation)} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ backgroundColor: '#ffffff', color: 'text.primary' }}>Reservation Details</DialogTitle>
            <DialogContent sx={{ backgroundColor: '#ffffff', color: 'text.primary' }}>
                <Typography variant="subtitle1">Customer: {reservation.customerName}</Typography>
                <Typography variant="subtitle1">Reservation Type: {reservation.reservationType}</Typography>
                <Typography variant="subtitle1">Notesss: {reservation.notes}</Typography>
                
                <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Products Reserved</Typography>
                </Box>
                
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ color: 'text.primary' }}>Product Names</TableCell>
                                <TableCell sx={{ color: 'text.primary' }}>Quantity</TableCell>
                                <TableCell sx={{ color: 'text.primary' }}>Notes</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reservation.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.productName || 'N/A'}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.notes || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
            <DialogActions sx={{ backgroundColor: '#ffffff' }}>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ReservationDetails; 