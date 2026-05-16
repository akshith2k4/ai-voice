import React from "react";
import EmptyState from "./EmptyState";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

export default function ErrorState({ error }) {
  return (
    <EmptyState
      icon={<ErrorOutlineIcon />}
      title="We couldn’t load the dashboard"
      subtitle={error?.message || "Please check network/auth and try again."}
    />
  );
}
