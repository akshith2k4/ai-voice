import React, { useMemo } from "react";
import { DATE_TIME, formatCustomDate } from "../../utils/dateUtils";
import { Chip, IconButton, TableCell, TableRow } from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalShipping as DeliveryIcon,
  ShoppingBasket as PickupIcon,
} from "@mui/icons-material";

const OrderRow = ({
  order,
  handleRowClick,
  handleEditClick,
  handleDeleteOrder,
}) => {
  const fulfillmentStatus =
  order?.leasingOrderDetails?.orderFulfillment?.status;
  const {fulfillmentRate , rejectedQuantity } = useMemo(() => {
    if (order?.status !== "COMPLETED") return {fulfillmentRate : null , rejectedQuantity : 0};

    const items = order?.leasingOrderDetails?.deliveryItems ?? [];

    let totalOrdered = 0;
    let totalDelivered = 0;
    let totalRejectedQuantity=0;

    for (const item of items) {
      totalOrdered += item.quantity ?? 0;
      totalDelivered += item.actualQuantity ?? 0;
      totalRejectedQuantity += item.rejectedQuantity ?? 0;
    }

     return {
    fulfillmentRate:
      totalOrdered > 0 ? (totalDelivered * 100) / totalOrdered : 0,
    rejectedQuantity: totalRejectedQuantity,
  };
  }, [order]);

  return (
    <TableRow
      key={order.id}
      hover
      onClick={() => handleRowClick(order)}
      sx={{
        cursor: "pointer",
        "&:nth-of-type(odd)": {
          backgroundColor: "background.default",
        },
        "& td": { py: 1 },
      }}
    >
      <TableCell>
        {order.id}
        {order.isAdjustment && (
          <Chip
            label="ADJ"
            size="small"
            sx={{
              ml: 1,
              height: 20,
              fontSize: "0.65rem",
              fontWeight: 700,
              backgroundColor: "rgba(237, 108, 2, 0.15)",
              color: "#ed6c02",
            }}
          />
        )}
      </TableCell>
      {/* <TableCell>{order.referenceNumber}</TableCell> */}
      <TableCell>{order.customerName || "N/A"}</TableCell>
      <TableCell>{formatCustomDate(order?.orderDate, DATE_TIME)}</TableCell>

      <TableCell>
        <Chip
          size="small"
          icon={
            order.orderType === "DELIVERY" ? (
              <DeliveryIcon />
            ) : order.orderType === "PICKUP" ? (
              <PickupIcon />
            ) : undefined
          }
          label={order.orderType}
          sx={{
            backgroundColor:
              order.orderType === "DELIVERY"
                ? "rgba(46, 125, 50, 0.1)"
                : order.orderType === "PICKUP"
                ? "rgba(25, 118, 210, 0.1)"
                : "rgba(156, 39, 176, 0.1)",
            color:
              order.orderType === "DELIVERY"
                ? "#2e7d32"
                : order.orderType === "PICKUP"
                ? "#1976d2"
                : "#9c27b0",
            "& .MuiChip-icon": {
              color: "inherit",
            },
          }}
        />
      </TableCell>

      <TableCell>
         <Chip
          label={fulfillmentStatus}
          size="small"
          color={
            fulfillmentStatus === "COMPLETED"
              ? "success"
              : fulfillmentStatus === "IN_PROGRESS"
              ? "info"
              : fulfillmentStatus === "PENDING"
              ? "warning"
              : fulfillmentStatus === "CANCELLED"
              ? "error"
              : "default"
          }
        />
      </TableCell>

      <TableCell>
        <Chip
          label={order.status}
          size="small"
          color={
            order.status === "COMPLETED"
              ? "success"
              : order.status === "IN_PROGRESS"
              ? "info"
              : order.status === "PENDING"
              ? "warning"
              : order.status === "CANCELLED"
              ? "error"
              : "default"
          }
        />
      </TableCell>

      <TableCell align="right">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleEditClick(order);
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteOrder(order.id);
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
};

export default React.memo(OrderRow);
