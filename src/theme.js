import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2196f3",
      light: "#64b5f6",
      lighter: "#bbdefb", // 💡 used in table head
      dark: "#1976d2",
    },
    secondary: {
      main: "#ff9800",
      light: "#ffb74d",
      dark: "#f57c00",
    },
    background: {
      default: "#f5f5f5", // 💡 used in alternating row bg
      paper: "#ffffff",
    },
    success: {
      main: "#4caf50",
      light: "#81c784",
      contrastText: "#fff",
    },
    warning: {
      main: "#ff9800",
      light: "#ffb74d",
    },
    error: {
      main: "#f44336",
      light: "#e57373",
      lighter: "#fff1f0",
    },
    info: {
      main: "#2196f3",
      light: "#64b5f6",
    },
    customGray: {
      main: "#888",
    },
    customLightBlue: {
      main: "#deeffc",
    },
  },
  components: {
    MuiTable: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& th": {
            backgroundColor: "#bbdefb", // from primary.lighter
            fontWeight: 600,
            paddingTop: 12,
            paddingBottom: 12,
            color: "rgba(0, 0, 0, 0.7)",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12,
        },
        head: {
          backgroundColor: "#bbdefb",
          fontWeight: 600,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          cursor: "pointer",
          "&:nth-of-type(odd)": {
            backgroundColor: "#f5f5f5", // palette.background.default
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 4,
        },
      },
    },
    MuiBox: {
      defaultProps: {
        sx: {
          display: "flex",
          alignItems: "center",
        },
      },
    },
    // 👇 Keep your existing overrides intact
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(45deg, #2196f3 30%, #1976d2 90%)",
          boxShadow: "0 3px 5px 2px rgba(33, 150, 243, .3)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "#ffffff",
          color: "#000000",
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: "inherit",
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: "#fff",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
        contained: {
          boxShadow: "0 2px 4px rgba(33, 150, 243, 0.2)",
          background: "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
          "&:hover": {
            background: "linear-gradient(45deg, #43a047 30%, #2e7d32 90%)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          height: "40px",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          lineHeight: "0.8rem",
        },
      },
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
  },
});

export default theme;
