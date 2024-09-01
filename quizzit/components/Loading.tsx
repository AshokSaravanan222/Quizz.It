import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

type LoadingProps = {
    action: string;
};

export default function Loading({ action }: LoadingProps) {
  const loaderStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };

  return (
    <Box sx={loaderStyle}>
      <CircularProgress size={60} />
      <h2>{action}</h2>
    </Box>
  );
}
