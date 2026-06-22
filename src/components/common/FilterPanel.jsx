import { Box, Paper, Typography } from "@mui/material";

export default function FilterPanel({
  title,
  children,
  actions = null,
  sticky = true,
  sx = {},
}) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mb: 2,
        ...(sticky && {
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 1,
        }),
        backgroundColor: "background.paper",
        ...sx,
      }}
    >
      {title && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          {title}
        </Typography>
      )}

      <Box
        sx={(theme) => ({
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          width: "100%",
          [theme.breakpoints.down("md")]: {
            flexDirection: "column",
            alignItems: "stretch",
          },
        })}
      >
        <Box
          sx={(theme) => ({
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "nowrap",
            flexGrow: 1,
            minWidth: 0,
            overflowX: "auto",
            py: 1,
            "& > *": {
              flexShrink: 0,
            },
            [theme.breakpoints.down("md")]: {
              flexDirection: "column",
              alignItems: "stretch",
              flexWrap: "wrap",
              overflowX: "visible",
              "& > *": {
                width: "100% !important",
                minWidth: "100% !important",
                flexShrink: 1,
              },
            },
          })}
        >
          {children}
        </Box>

        {actions && (
          <Box
            sx={(theme) => ({
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              [theme.breakpoints.down("md")]: {
                width: "100%",
                justifyContent: "stretch",
                "& > *": {
                  width: "100% !important",
                },
              },
            })}
          >
            {actions}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
