import React from "react";
import { Alert, Box, Button } from "@mui/material";

export class AgentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AgentErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 2, zIndex: 10000, position: "fixed", bottom: 24, right: 24, maxWidth: 350 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={this.handleReset}>
                Retry
              </Button>
            }
          >
            Agent Bridge failed: {this.state.error?.message || "Unknown error"}
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
