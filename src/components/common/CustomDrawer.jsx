import { Drawer } from "@mui/material";

export default function CustomDrawer({ 
  anchor = "right", 
  open, 
  onClose, 
  children,
  width = 450,
  elevation = 1,
}) {
  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      PaperProps={{
        elevation,
        sx: {
          width,
          backgroundColor: '#ffffff !important',
          boxShadow: '-4px 0 8px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      {children}
    </Drawer>
  );
}
