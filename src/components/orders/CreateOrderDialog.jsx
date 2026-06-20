// src/components/orders/CreateOrderDialog.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useCreateOrderAgent } from "../../useagent/useCreateOrderAgent";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Autocomplete,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { debounce } from "lodash";
import { customerService } from "../../services/customerService";
import { orderService } from "../../services/orderService";
import { productService } from "../../services/productService";
import {
  addDays,
  differenceInCalendarDays,
  isValid as isValidDate,
} from "date-fns";
import CustomSnackbar from "../layout/CustomSnackbar";

/**
 * Safely convert a Date (or falsy/invalid value) to ISO date string "YYYY-MM-DD".
 * Returns "" when the value is null, undefined, empty-string, or an Invalid Date.
 */
function safeDateToISO(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

/**
 * Safely convert a Date to a full ISO string for API payloads.
 * Returns null when the value is invalid.
 */
function safeDateToFullISO(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

function CreateOrderDialog({ open, onClose, onSave, order }) {
  const [formData, setFormData] = useState({
    orderReferenceId: "",
    customerId: "",
    orderDate: new Date(),
    orderType: "",
    deliveryType: "",
    pickupDate: null,
    deliveryDate: null,
    pickupItems: [],
    deliveryItems: [],
    items: [],
    isAdjustment: false,
  });

  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [CustomSnackbarOpen, setCustomSnackbarOpen] = useState(false);
  const [copyDeliveryToPickup, setCopyDeliveryToPickup] = useState(false);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // ---------- Quantity UX helpers ----------
  const qtyRefs = useRef({
    deliveryItems: [],
    pickupItems: [],
    items: [],
  });

  const setQtyRef = (type, index, el) => {
    if (!qtyRefs.current[type]) qtyRefs.current[type] = [];
    qtyRefs.current[type][index] = el;
  };

  const focusNextQty = useCallback((type, index) => {
    const list = qtyRefs.current[type] || [];
    const next = list[index + 1];
    if (next && typeof next.focus === "function") {
      next.focus();
      // place caret at end
      const val = next.value || "";
      next.setSelectionRange(val.length, val.length);
    }
  }, []);

  // Keep only digits; allow empty while typing; strip leading zeros (but keep a single "0" if that's all)
  const normalizeQtyInput = (raw) => {
    if (raw === "") return "";
    const digitsOnly = raw.replace(/\D/g, "");
    if (digitsOnly === "") return "";
    return digitsOnly.replace(/^0+(?=\d)/, "");
  };

  // Finalize before submit: convert ""/null to 0; else to Number
  const finalizeQtyForSubmit = (q) => {
    if (q === "" || q == null) return 0;
    const n = Number(q);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const withFinalizedQty = (arr = []) =>
    arr.map(({ quantity, ...rest }) => ({
      ...rest,
      quantity: finalizeQtyForSubmit(quantity),
    }));

  // ---------- Data effects ----------
  // When customer changes in create mode, clear items and reset product list
  const prevCustomerIdRef = useRef();
  useEffect(() => {
    if (!open) return;
    // In edit mode, customer selector is disabled; skip resets
    if (order) {
      prevCustomerIdRef.current = formData.customerId;
      return;
    }

    const prevId = prevCustomerIdRef.current;
    if (prevId && prevId !== formData.customerId) {
      setProducts([]);
      setCopyDeliveryToPickup(false);
      qtyRefs.current = { deliveryItems: [], pickupItems: [], items: [] };
      setFormData((prev) => ({
        ...prev,
        deliveryItems: [],
        pickupItems: [],
        items: [],
      }));
    }
    prevCustomerIdRef.current = formData.customerId;
  }, [formData.customerId, open, order]);

  useEffect(() => {
    const fetchReservedProducts = async () => {
      if (formData.customerId && open) {
        try {
          const reservedProducts =
            await productService.getReservedProductsByCustomerId(
              formData.customerId
            );
          setProducts(reservedProducts);
        } catch (error) {
          console.error("Failed to load reserved products:", error);
        }
      }
    };

    fetchReservedProducts();
  }, [formData.customerId, open]);

  useEffect(() => {
    if (
      formData.customerId &&
      formData.orderType === "LEASING" &&
      ["DELIVERY", "BOTH"].includes(formData.deliveryType) &&
      products.length > 0 &&
      formData.deliveryItems.length === 0
    ) {
      const initialDeliveryItems = products.map((product) => ({
        productId: product.id,
        quantity: "", // keep empty during editing
        remarks: "",
      }));

      setFormData((prev) => ({
        ...prev,
        deliveryItems: initialDeliveryItems,
      }));
    }
  }, [
    formData.customerId,
    formData.deliveryType,
    formData.orderType,
    products,
    formData.deliveryItems.length,
  ]);

  // Keep pickup items mirrored from delivery when copy flag is on
  useEffect(() => {
    if (!open) return;
    if (copyDeliveryToPickup && formData.deliveryType === "BOTH") {
      const copiedItems = (formData.deliveryItems || []).map((item) => ({
        ...item,
        remarks: "",
      }));
      setFormData((prev) => ({ ...prev, pickupItems: copiedItems }));
    }
  }, [copyDeliveryToPickup, formData.deliveryItems, formData.deliveryType, open]);

  useEffect(() => {
    if (order) {
      const commonData = {
        orderReferenceId: order.referenceNumber || order.orderReferenceId || "",
        customerId: order.customerId || "",
        orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
        orderType: order.orderType || "",
      };

      setFormData((prev) => ({ ...prev, ...commonData }));

      if (order.orderType === "LEASING") {
        setFormData((prev) => ({
          ...prev,
          deliveryType: order.leasingOrderDetails?.leasingOrderType || "",
          pickupDate: order.leasingOrderDetails?.pickupDate
            ? new Date(order.leasingOrderDetails.pickupDate)
            : null,
          deliveryDate: order.leasingOrderDetails?.deliveryDate
            ? new Date(order.leasingOrderDetails.deliveryDate)
            : null,
          pickupItems:
            (order.leasingOrderDetails?.pickupItems || []).map((it) => ({
              ...it,
              quantity:
                it.quantity === 0 || it.quantity == null
                  ? ""
                  : String(it.quantity),
            })) || [],
          deliveryItems:
            (order.leasingOrderDetails?.deliveryItems || []).map((it) => ({
              ...it,
              quantity:
                it.quantity === 0 || it.quantity == null
                  ? ""
                  : String(it.quantity),
            })) || [],
        }));
      } else if (order.orderType === "RENTAL") {
        setFormData((prev) => ({
          ...prev,
          deliveryDate: order.rentalOrderDetails?.deliveryDate
            ? new Date(order.rentalOrderDetails.deliveryDate)
            : null,
          items: (order.rentalOrderDetails?.items || []).map((it) => ({
            ...it,
            quantity:
              it.quantity === 0 || it.quantity == null
                ? ""
                : String(it.quantity),
          })),
        }));
      } else if (order.orderType === "WASHING") {
        setFormData((prev) => ({
          ...prev,
          pickupDate: order.washingOrderDetails?.pickupDate
            ? new Date(order.washingOrderDetails.pickupDate)
            : null,
          deliveryDate: order.washingOrderDetails?.deliveryDate
            ? new Date(order.washingOrderDetails.deliveryDate)
            : null,
          items: (order.washingOrderDetails?.items || []).map((it) => ({
            ...it,
            quantity:
              it.quantity === 0 || it.quantity == null
                ? ""
                : String(it.quantity),
          })),
        }));
      }
    } else if (open) {
      const today = new Date();
      const tomorrow = addDays(today, 1);

      setFormData({
        orderReferenceId: "",
        customerId: "",
        orderDate: today,
        orderType: "LEASING",
        deliveryType: "BOTH",
        pickupDate: tomorrow,
        deliveryDate: tomorrow,
        pickupItems: [],
        deliveryItems: [],
        items: [],
        isAdjustment: false,
      });
      setSelectedCustomer(null);
      setCopyDeliveryToPickup(false);
    }
  }, [order, open]);

  const debouncedFetchCustomerOptions = debounce(async (inputValue) => {
    if (inputValue) {
      const customers = await customerService.searchCustomersByName(inputValue);
      setCustomerOptions(customers);
      return customers;
    } else {
      setCustomerOptions([]);
      return [];
    }
  }, 300);

  useEffect(() => {
    if (order) {
      const customer = {
        id: order.customerId,
        name: order.customerName,
      };
      setSelectedCustomer(customer);
      setCustomerOptions([customer]);
    } else if (open) {
      setSelectedCustomer(null);
      setCustomerOptions([]);
    }
  }, [order, open]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOrderDateChange = (newOrderDate) => {
    if (!isValidDate(newOrderDate)) return;

    setFormData((prev) => {
      const prevOrderDate = prev.orderDate;

      const hasPickup = Boolean(prev.pickupDate);
      const hasDelivery = Boolean(prev.deliveryDate);

      const pickupDelta = hasPickup
        ? differenceInCalendarDays(prev.pickupDate, prevOrderDate)
        : null;

      const deliveryDelta = hasDelivery
        ? differenceInCalendarDays(prev.deliveryDate, prevOrderDate)
        : null;

      let nextPickupDate = prev.pickupDate;
      let nextDeliveryDate = prev.deliveryDate;

      if (hasPickup && pickupDelta !== null) {
        nextPickupDate = addDays(newOrderDate, pickupDelta);
      } else if (!hasPickup && ["PICKUP", "BOTH"].includes(prev.deliveryType)) {
        nextPickupDate = addDays(newOrderDate, 1);
      }

      if (hasDelivery && deliveryDelta !== null) {
        nextDeliveryDate = addDays(newOrderDate, deliveryDelta);
      } else if (
        !hasDelivery &&
        ["DELIVERY", "BOTH"].includes(prev.deliveryType)
      ) {
        nextDeliveryDate = addDays(newOrderDate, 1);
      }

      return {
        ...prev,
        orderDate: newOrderDate,
        pickupDate: nextPickupDate,
        deliveryDate: nextDeliveryDate,
      };
    });
  };

  const handleAddItem = (field) => {
    if (field === "pickupItems" && copyDeliveryToPickup) {
      setCopyDeliveryToPickup(false);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: [
        ...prev[field],
        {
          productId: "",
          quantity: "",
          remarks: "",
          rentalDuration: 0,
        },
      ],
    }));
  };

  const handleItemChange = (index, field, value, itemField) => {
    if (itemField === "pickupItems" && copyDeliveryToPickup) {
      setCopyDeliveryToPickup(false);
    }

    const updatedItems = formData[itemField].map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setFormData((prev) => ({
      ...prev,
      [itemField]: updatedItems,
    }));
  };

  const handleDeleteItem = (index, itemField) => {
    if (itemField === "pickupItems" && copyDeliveryToPickup) {
      setCopyDeliveryToPickup(false);
    }

    const updatedItems = formData[itemField].filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      [itemField]: updatedItems,
    }));

    // clean refs
    if (qtyRefs.current[itemField]) {
      qtyRefs.current[itemField].splice(index, 1);
    }
  };

  const handleSubmit = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const branchId = localStorage.getItem("branchId");
      const orderData = {
        orderReferenceId: formData.orderReferenceId,
        customerId: formData.customerId,
        orderType: formData.orderType.toUpperCase(),
        branchId,
        orderDate: safeDateToFullISO(formData.orderDate),
        notes: formData.notes || "",
        isAdjustment: formData.isAdjustment || false,
      };

      if (formData.orderType === "LEASING") {
        const type = formData.deliveryType.toUpperCase();

        // Filter out zero-quantity items for the side that doesn't apply
        const finalDeliveryItems =
          type === "PICKUP"
            ? []
            : withFinalizedQty(formData.deliveryItems).filter(
                (i) => i.quantity > 0,
              );

        const finalPickupItems =
          type === "DELIVERY"
            ? []
            : withFinalizedQty(formData.pickupItems).filter(
                (i) => i.quantity > 0,
              );

        orderData.leasingOrderDetails = {
          leasingOrderType: type,
          pickupDate: safeDateToFullISO(formData.pickupDate),
          deliveryDate: safeDateToFullISO(formData.deliveryDate),
          pickupItems: finalPickupItems,
          deliveryItems: finalDeliveryItems,
        };
      }

      if (formData.orderType === "WASHING") {
        orderData.washingOrderDetails = {
          pickupDate: safeDateToFullISO(formData.pickupDate),
          deliveryDate: safeDateToFullISO(formData.deliveryDate),
          items: withFinalizedQty(formData.items),
        };
      }

      if (formData.orderType === "RENTAL") {
        orderData.rentalOrderDetails = {
          deliveryDate: safeDateToFullISO(formData.deliveryDate),
          items: withFinalizedQty(formData.items),
        };
      }

      let savedOrder;
      if (order) {
        orderData.id = order.id;
        savedOrder = await orderService.updateOrder(orderData);
      } else {
        savedOrder = await orderService.createOrder(orderData);
      }

      onSave(savedOrder);
      onClose();
    } catch (error) {
      const backendMessage =
        error.response?.data?.message ||
        "Failed to save order. Please try again.";
      setErrorMessage(backendMessage);
      setCustomSnackbarOpen(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleCopyDeliveryToPickup = (checked) => {
    setCopyDeliveryToPickup(checked);

    if (checked) {
      const copiedItems = formData.deliveryItems.map((item) => ({
        ...item,
        remarks: "",
      }));

      setFormData((prev) => ({
        ...prev,
        pickupItems: copiedItems,
      }));
    }
  };

  const renderItemRow = (item, index, type, isDisabled = false) => (
    <Box
      key={`${type}-${index}`}
      sx={{
        display: "flex",
        alignItems: "center",
        mb: 2,
        gap: 3,
      }}
    >
      {/* Product */}
      <Box sx={{ flex: "0 0 40%" }}>
        <FormControl fullWidth size="small">
          <InputLabel>Product</InputLabel>
          <Select
            value={item.productId}
            label="Product"
            onChange={(e) =>
              handleItemChange(index, "productId", e.target.value, type)
            }
            disabled={isDisabled}
          >
            {products.map((product) => (
              <MenuItem key={product.id} value={product.id}>
                {product.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Quantity */}
      <Box sx={{ flex: "0 0 15%" }}>
        <TextField
          fullWidth
          label="Quantity"
          type="text"
          value={item.quantity ?? ""}
          onChange={(e) => {
            const next = normalizeQtyInput(e.target.value);
            handleItemChange(index, "quantity", next, type);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              focusNextQty(type, index);
            }
          }}
          size="small"
          disabled={isDisabled}
          inputRef={(el) => setQtyRef(type, index, el)}
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
        />
      </Box>

      {/* Remarks */}
      <Box sx={{ flex: "1" }}>
        <TextField
          fullWidth
          label="Remarks"
          value={item.remarks || ""}
          onChange={(e) =>
            handleItemChange(index, "remarks", e.target.value, type)
          }
          size="small"
          disabled={isDisabled}
        />
      </Box>

      {/* Delete */}
      <Box
        sx={{
          flex: "0 0 40px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <IconButton
          onClick={() => handleDeleteItem(index, type)}
          color="secondary"
          disabled={isDisabled}
          aria-label="delete item"
        >
          <DeleteIcon />
        </IconButton>
      </Box>
    </Box>
  );

  const resetForm = () => {
    setFormData({
      orderReferenceId: "",
      customerId: "",
      orderDate: new Date(),
      orderType: "",
      deliveryType: "",
      pickupDate: null,
      deliveryDate: null,
      pickupItems: [],
      deliveryItems: [],
      items: [],
      isAdjustment: false,
    });
    setSelectedCustomer(null);
    setCopyDeliveryToPickup(false);
    qtyRefs.current = { deliveryItems: [], pickupItems: [], items: [] };
  };

  // ============================================
  // AGENT REGISTRATION — Refactored to separate hook
  // ============================================
  useCreateOrderAgent({
    open,
    products,
    customerOptions,
    handleInputChange,
    handleOrderDateChange,
    setSelectedCustomer,
    debouncedFetchCustomerOptions,
    handleAddItem,
    handleItemChange,
    resetForm,
  });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{order ? "Edit Order" : "Create Order"}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Order Reference ID and Customer */}
          <Box display={"flex"} gap={2} alignItems="center" mb={1}>
            <Box flex={1}>
              <TextField
                fullWidth
                name="orderReferenceId"
                label="Order Reference ID"
                value={formData.orderReferenceId}
                onChange={(e) =>
                  handleInputChange("orderReferenceId", e.target.value)
                }
                variant="outlined"
                margin="dense"
                disabled={!!order}
              />
            </Box>
            <Box flex={1}>
              <Autocomplete
                options={customerOptions}
                getOptionLabel={(option) => option.name}
                value={selectedCustomer}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(event, newInputValue) =>
                  debouncedFetchCustomerOptions(newInputValue)
                }
                onChange={(event, newValue) => {
                  setSelectedCustomer(newValue);
                  handleInputChange("customerId", newValue ? newValue.id : "");
                }}
                disabled={!!order}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    name="customerId"
                    label="Customer"
                    variant="outlined"
                    margin="dense"
                    fullWidth
                    disabled={!!order}
                  />
                )}
              />
            </Box>
          </Box>

          {/* Order Date and Order Type */}
          <Box display={"flex"} gap={2} alignItems="center" mb={1}>
            <Box flex={1}>
              <TextField
                fullWidth
                name="orderDate"
                label="Order Date"
                type="date"
                value={safeDateToISO(formData.orderDate)}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (isValidDate(d)) handleOrderDateChange(d);
                }}
                variant="outlined"
                margin="dense"
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Box>
            <Box flex={1}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Order Type</InputLabel>
                <Select
                  name="orderType"
                  value={formData.orderType}
                  onChange={(e) =>
                    handleInputChange("orderType", e.target.value)
                  }
                >
                  <MenuItem value="LEASING">Leasing</MenuItem>
                  <MenuItem value="RENTAL">Rental</MenuItem>
                  <MenuItem value="WASHING">Washing</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Adjustment Order Toggle */}
            <Box display="flex" alignItems="center" mb={1} mt={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isAdjustment || false}
                    onChange={(e) =>
                      handleInputChange("isAdjustment", e.target.checked)
                    }
                    color="warning"
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    Adjustment Order
                  </Typography>
                }
              />
            </Box>
          </Box>
        </Box>

        {formData.orderType === "LEASING" && (
          <>
            <Box display={"flex"} gap={2} alignItems="center" mb={3}>
              {/* Delivery Type */}
              <Box flex={1}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Delivery Type</InputLabel>
                  <Select
                    name="deliveryType"
                  value={formData.deliveryType}
                    onChange={(e) =>
                      handleInputChange("deliveryType", e.target.value)
                    }
                  >
                    <MenuItem value="DELIVERY">Delivery</MenuItem>
                    <MenuItem value="PICKUP">Pickup</MenuItem>
                    <MenuItem value="BOTH">Both</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Pickup and Delivery Dates */}
              {["PICKUP", "BOTH"].includes(formData.deliveryType) && (
                <Box flex={1}>
                  <TextField
                    fullWidth
                    name="pickupDate"
                    label="Pickup Date"
                    type="date"
                    value={safeDateToISO(formData.pickupDate)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      handleInputChange("pickupDate", isValidDate(d) ? d : null);
                    }}
                    variant="outlined"
                    margin="dense"
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Box>
              )}
              {["DELIVERY", "BOTH"].includes(formData.deliveryType) && (
                <Box flex={1}>
                  <TextField
                    fullWidth
                    name="deliveryDate"
                    label="Delivery Date"
                    type="date"
                    value={safeDateToISO(formData.deliveryDate)}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      handleInputChange("deliveryDate", isValidDate(d) ? d : null);
                    }}
                    variant="outlined"
                    margin="dense"
                    slotProps={{
                      inputLabel: { shrink: true },
                    }}
                  />
                </Box>
              )}
            </Box>

            {["DELIVERY", "BOTH"].includes(formData.deliveryType) && (
              <>
                <Box mb={2}>
                  <Button
                    onClick={() => handleAddItem("deliveryItems")}
                    variant="outlined"
                  >
                    Add Delivery Item
                  </Button>
                </Box>
                {formData.deliveryItems.map((item, index) =>
                  renderItemRow(item, index, "deliveryItems")
                )}
              </>
            )}

            {["PICKUP", "BOTH"].includes(formData.deliveryType) && (
              <>
                <Box
                  mb={2}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    onClick={() => handleAddItem("pickupItems")}
                    variant="outlined"
                    disabled={copyDeliveryToPickup}
                  >
                    Add Pickup Item
                  </Button>
                  {formData.deliveryType === "BOTH" && (
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Checkbox
                          checked={copyDeliveryToPickup}
                          onChange={(e) =>
                            handleCopyDeliveryToPickup(e.target.checked)
                          }
                        />
                      }
                      label="Use same items and quantities as Delivery"
                    />
                  )}
                </Box>
                {formData.pickupItems.map((item, index) =>
                  renderItemRow(item, index, "pickupItems", copyDeliveryToPickup)
                )}
              </>
            )}
          </>
        )}

        {formData.orderType === "RENTAL" && (
          <>
            <Box display={"flex"} gap={2} alignItems="center">
              <Box flex={1}>
                <TextField
                  fullWidth
                  label="Delivery Date"
                  type="date"
                  value={safeDateToISO(formData.deliveryDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    handleInputChange("deliveryDate", isValidDate(d) ? d : null);
                  }}
                  variant="outlined"
                  margin="dense"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button
                onClick={() => handleAddItem("items")}
                variant="outlined"
                color="primary"
              >
                Add Rental Item
              </Button>
            </Box>
            {formData.items.map((item, index) => (
              <Box display={"flex"} gap={2} alignItems="center" key={index}>
                <Box flex={1}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={item.productId}
                      onChange={(e) =>
                        handleItemChange(index, "productId", e.target.value, "items")
                      }
                    >
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="text"
                    value={item.quantity ?? ""}
                    onChange={(e) => {
                      const next = normalizeQtyInput(e.target.value);
                      handleItemChange(index, "quantity", next, "items");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusNextQty("items", index);
                      }
                    }}
                    variant="outlined"
                    margin="dense"
                    inputRef={(el) => setQtyRef("items", index, el)}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Rental Duration (days)"
                    type="text"
                    value={
                      item.rentalDuration === 0 || item.rentalDuration == null
                        ? ""
                        : String(item.rentalDuration)
                    }
                    onChange={(e) => {
                      const next = normalizeQtyInput(e.target.value);
                      handleItemChange(index, "rentalDuration", next, "items");
                    }}
                    variant="outlined"
                    margin="dense"
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                </Box>
                <Box flex={1}>
                  <IconButton
                    onClick={() => handleDeleteItem(index, "items")}
                    color="secondary"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </>
        )}

        {formData.orderType === "WASHING" && (
          <>
            <Box display={"flex"} gap={2} alignItems="center">
              <Box flex={1}>
                <TextField
                  fullWidth
                  label="Pickup Date"
                  type="date"
                  value={safeDateToISO(formData.pickupDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    handleInputChange("pickupDate", isValidDate(d) ? d : null);
                  }}
                  variant="outlined"
                  margin="dense"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Box>
              <Box flex={1}>
                <TextField
                  fullWidth
                  label="Delivery Date"
                  type="date"
                  value={safeDateToISO(formData.deliveryDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    handleInputChange("deliveryDate", isValidDate(d) ? d : null);
                  }}
                  variant="outlined"
                  margin="dense"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button
                onClick={() => handleAddItem("items")}
                variant="outlined"
                color="primary"
              >
                Add Washing Item
              </Button>
            </Box>
            {formData.items.map((item, index) => (
              <Box display={"flex"} gap={2} alignItems="center" key={index}>
                <Box flex={1}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>Product</InputLabel>
                    <Select
                      value={item.productId}
                      onChange={(e) =>
                        handleItemChange(index, "productId", e.target.value, "items")
                      }
                    >
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="text"
                    value={item.quantity ?? ""}
                    onChange={(e) => {
                      const next = normalizeQtyInput(e.target.value);
                      handleItemChange(index, "quantity", next, "items");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusNextQty("items", index);
                      }
                    }}
                    variant="outlined"
                    margin="dense"
                    inputRef={(el) => setQtyRef("items", index, el)}
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                </Box>
                <Box flex={1}>
                  <IconButton
                    onClick={() => handleDeleteItem(index, "items")}
                    color="secondary"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>

      <CustomSnackbar
        open={CustomSnackbarOpen}
        message={errorMessage}
        onClose={() => setCustomSnackbarOpen(false)}
      />
    </Dialog>
  );
}

export default CreateOrderDialog;
