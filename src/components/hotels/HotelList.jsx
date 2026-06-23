import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import debounce from "lodash.debounce";
import {
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    InputAdornment,
    TextField,
    Box,
    Drawer,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { customerService } from "../../services/customerService";
import { agreementService } from "../../services/agreementService";
import { productService } from "../../services/productService";
import { useDcid } from "../../context/DcidContext";
// removed unused hotelService import
import HotelDialog from "./HotelDialog"; // Import the dialog component
import CustomSnackbar from "../layout/CustomSnackbar"; // Import the CustomSnackbar component
import CustomerUsersTable from "../customers/CustomerUsersTable";
import { formatCustomDate } from "../../utils/dateUtils";
import { useCreateAgreementAgent } from "../../useagent/useCreateAgreementAgent";

const serviceTypes = [
    "WASHING",
    "WASHING_RENTING",
    "RENTING",
    "WASHING_IRONING",
    "DRY_CLEANING",
    "PRESSING",
    "FOLDING",
    "PACKAGING",
];

// Service frequency options for agreements
const serviceFrequencies = [
    "EVERY_DAY",
    "ALTERNATE_DAY",
    "EVERY_SUNDAY",
    "CUSTOM",
];

function HotelList() {
    const { dcid, setRequireWarehouse } = useDcid();
    const [hotels, setHotels] = useState([]);
    const [selectedHotel, setSelectedHotel] = useState(null);
    const [agreementDetails, setAgreementDetails] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    // removed unused pagination/loading/error states
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isAgreementDialogOpen, setIsAgreementDialogOpen] = useState(false);
    const [isNewHotel, setIsNewHotel] = useState(false);
    // removed unused CustomSnackbarOpen and errorMessage states
    // Removed unused hotelFormData local state
    const { control, handleSubmit, reset, setValue, getValues, watch } = useForm({
        defaultValues: {
            startDate: "",
            endDate: "",
            type: "",
            status: "",
            linenDeliveryDays: "",
            serviceFrequency: "",
            totalRooms: "",
            occupancyRate: "",
            depositAmount: "",
            billingStartDay: "",
            billingEndDay: "",
            billingCycle: "",
            billingType: "",
            fixedMonthlyAmount: "",
            creditDays: "",
            discountPercentage: "",
            creditTermDays: "",
            pickupFrequencyDays: "",
            deliveryTatDays: "",
            prices: [],
        }
    });

    const { fields: prices, append, remove } = useFieldArray({
        control,
        name: "prices"
    });

    const watchedAgreementType = watch("type");
    const watchedAgreementPrices = watch("prices") || [];

    const [products, setProducts] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    // Refs to enable cycling focus across Quantity and Price inputs
    const quantityRefs = useRef([]);
    const priceRefs = useRef([]);

    // Ensure refs arrays always match the number of price items
    useEffect(() => {
        const count = watchedAgreementPrices.length;
        if (quantityRefs.current.length !== count) {
            quantityRefs.current = Array(count)
                .fill(null)
                .map((_, i) => quantityRefs.current[i] || null);
        }
        if (priceRefs.current.length !== count) {
            priceRefs.current = Array(count)
                .fill(null)
                .map((_, i) => priceRefs.current[i] || null);
        }
    }, [watchedAgreementPrices.length]);

    const focusNextInRefs = (refsArray, index, backwards = false) => {
        const list = refsArray.current;
        if (!list || list.length === 0) return;
        const len = list.length;
        let nextIndex = backwards ? (index - 1 + len) % len : (index + 1) % len;
        // Find the next focusable element (skip nulls)
        let attempts = 0;
        while ((!list[nextIndex] || typeof list[nextIndex].focus !== "function") && attempts < len) {
            nextIndex = backwards ? (nextIndex - 1 + len) % len : (nextIndex + 1) % len;
            attempts++;
        }
        const el = list[nextIndex];
        if (el && typeof el.focus === "function") {
            el.focus();
            // Select the text for quick overwrite
            if (typeof el.select === "function") el.select();
        }
    };

    // debouncedSearch will be initialized after loadHotels is declared

    const loadHotels = useCallback(async (search = "") => {
        try {
            const response = await customerService.getCustomers({
                name: search,
            });
            console.log("Loaded hotels:", response.content); // Debugging log
            setHotels(response.content || []);
        } catch (error) {
            console.error("Failed to load hotels:", error);
            const backendMessage =
                error.response?.data?.message || "Failed to load hotels.";
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
        }
    }, []);

    const debouncedSearch = useMemo(
        () => debounce((search) => loadHotels(search), 300),
        [loadHotels]
    );

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
    };

    const loadProducts = useCallback(async () => {
        try {
            const productsData = await productService.getAllProducts();
            setProducts(productsData);
        } catch (error) {
            console.error("Error fetching products:", error);
            const backendMessage =
                error.response?.data?.message || "Error fetching products.";
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
        }
    }, []);

    useEffect(() => {
        loadHotels(searchTerm);
        loadProducts();
    }, [searchTerm, loadHotels, loadProducts]);

    // Removed effect that only populated the removed hotelFormData

    const handleRowClick = async (hotel) => {
        setSelectedHotel(hotel);
        try {
            const agreementResponse = await agreementService.getActiveAgreement(
                hotel.id
            );
            console.log("Agreement Response:", agreementResponse); // Debugging log
            setAgreementDetails(agreementResponse);
            reset({
                startDate: agreementResponse.startDate || "",
                endDate: agreementResponse.endDate || "",
                type: agreementResponse.type || "",
                status: agreementResponse.status || "",
                linenDeliveryDays:
                    agreementResponse?.rentalDetails?.linenDeliveryDays ??
                    agreementResponse.linenDeliveryDays ??
                    "",
                serviceFrequency:
                    agreementResponse?.rentalDetails?.serviceFrequency ??
                    agreementResponse.serviceFrequency ??
                    "",
                totalRooms: agreementResponse.totalRooms || "",
                occupancyRate: agreementResponse.occupancyRate || "",
                depositAmount: agreementResponse.depositAmount || "",
                billingStartDay: agreementResponse.billingStartDay || "",
                billingEndDay: agreementResponse.billingEndDay || "",
                billingCycle: agreementResponse.billingCycle || "",
                billingType: agreementResponse.billingType || "",
                fixedMonthlyAmount: agreementResponse.fixedMonthlyAmount || "",
                creditDays: agreementResponse.creditDays || "",
                discountPercentage: agreementResponse.discountPercentage || "",
                creditTermDays: agreementResponse.creditTermDays || "",
                pickupFrequencyDays: agreementResponse.pickupFrequencyDays || "",
                deliveryTatDays: agreementResponse.deliveryTatDays || "",
                prices: agreementResponse.prices || [],
            });
        } catch (error) {
            console.error("Failed to fetch agreement details:", error);
            const backendMessage =
                error.response?.data?.message ||
                "Failed to fetch agreement details.";
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
            setAgreementDetails(null);
            reset({
                startDate: "",
                endDate: "",
                type: "",
                status: "",
                linenDeliveryDays: "",
                serviceFrequency: "",
                totalRooms: "",
                occupancyRate: "",
                depositAmount: "",
                billingStartDay: "",
                billingEndDay: "",
                billingCycle: "",
                billingType: "",
                fixedMonthlyAmount: "",
                creditDays: "",
                discountPercentage: "",
                creditTermDays: "",
                pickupFrequencyDays: "",
                deliveryTatDays: "",
                prices: [],
            });
        } finally {
            setIsSidebarOpen(true); // Ensure the sidebar opens regardless of the outcome
        }
    };

    const handleEditClick = (hotel) => {
        setSelectedHotel(hotel);
        setIsNewHotel(false);
        setIsEditDialogOpen(true);
    };

    const ensureWarehouseSelected = () => {
        if (!dcid) {
            setRequireWarehouse(true);
            return false;
        }
        return true;
    };

    const handleAddClick = () => {
        if (!ensureWarehouseSelected()) return;
        setSelectedHotel(null);
        setIsNewHotel(true);
        setIsEditDialogOpen(true);
    };

    // Removed unused handlers: handleHotelFormChange, handleAddressChange,
    // handleContactPersonChange, handleAddContactPerson, handleDeleteContactPerson

    const handleSave = async (hotelData) => {
        try {
            if (isNewHotel) {
                await customerService.createCustomer(hotelData);
            } else {
                await customerService.updateCustomer(
                    selectedHotel.id,
                    hotelData
                );
            }
            setIsEditDialogOpen(false);
            loadHotels(); // Refresh the hotel list
        } catch (error) {
            const backendMessage =
                error.response?.data?.message ||
                "Failed to save hotel. Please try again.";
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
        }
    };

    // Removed unused handleEditAgreement

    const handleRemovePriceItem = async (index) => {
        const itemToRemove = getValues("prices")[index];

        if (itemToRemove?.id) {
            if (!window.confirm("Are you sure you want to permanently delete this price entry from the agreement?")) {
                return;
            }

            try {
                await agreementService.deleteAgreementPrice(agreementDetails.id, itemToRemove.id);
                setSnackbarMessage("Price entry deleted successfully");
                setSnackbarOpen(true);
            } catch (error) {
                console.error("Failed to delete price entry:", error);
                const backendMessage = error.response?.data?.message || "Failed to delete price entry.";
                setSnackbarMessage(backendMessage);
                setSnackbarOpen(true);
                return; // Don't remove from UI if API call fails
            }
        }

        remove(index);
    };

    const handleAddPriceItem = () => {
        append({
            productId: "",
            quantity: "",
            price: "",
            serviceType: "",
            remarks: "",
        });
    };

    const handleAgreementSubmit = async (data) => {
        try {
            const requestBody = {
                customerId: selectedHotel.id,
                type: data.type,
                startDate: data.startDate,
                endDate: data.endDate,
                prices: (data.prices || []).map((price) => ({
                    productId: price.productId,
                    quantity: price.quantity,
                    price: price.price,
                    serviceType: price.serviceType,
                })),
            };

            if (data.type === "RENTAL_LAUNDRY") {
                requestBody.rentalDetails = {
                    totalRooms: data.totalRooms,
                    occupancyRate: data.occupancyRate,
                    depositAmount: data.depositAmount,
                    billingStartDay: data.billingStartDay,
                    billingEndDay: data.billingEndDay,
                    billingCycle: data.billingCycle,
                    billingType: data.billingType,
                    fixedMonthlyAmount: data.fixedMonthlyAmount,
                    creditDays: data.creditDays,
                    linenDeliveryDays: data.linenDeliveryDays,
                    serviceFrequency: data.serviceFrequency,
                };
            } else if (data.type === "LAUNDRY") {
                requestBody.laundryDetails = {
                    totalRooms: data.totalRooms,
                    occupancyRate: data.occupancyRate,
                    creditTermDays: data.creditTermDays,
                    billingCycle: data.billingCycle,
                    billingStartDay: data.billingStartDay,
                    billingEndDay: data.billingEndDay,
                    pickupFrequencyDays: data.pickupFrequencyDays,
                    deliveryTatDays: data.deliveryTatDays,
                    billingType: data.billingType,
                    fixedMonthlyAmount: data.fixedMonthlyAmount,
                    discountPercentage: data.discountPercentage,
                };
            }

            if (agreementDetails && agreementDetails.id) {
                // Update existing agreement
                await agreementService.updateAgreement(
                    agreementDetails.id,
                    requestBody
                );
                setSnackbarMessage("Agreement updated successfully");
            } else {
                // Create new agreement
                await agreementService.createAgreement(requestBody);
                setSnackbarMessage("Agreement created successfully");
            }

            setSnackbarOpen(true);
            setIsAgreementDialogOpen(false);
        } catch (error) {
            console.error("Failed to save agreement:", error);
            const backendMessage =
                error.response?.data?.message || "Failed to save agreement.";
            setSnackbarMessage(backendMessage);
            setSnackbarOpen(true);
        }
    };

    const resetAgreementForm = () => {
        reset({
            startDate: "",
            endDate: "",
            type: "",
            status: "",
            linenDeliveryDays: "",
            serviceFrequency: "",
            totalRooms: "",
            occupancyRate: "",
            depositAmount: "",
            billingStartDay: "",
            billingEndDay: "",
            billingCycle: "",
            billingType: "",
            fixedMonthlyAmount: "",
            creditDays: "",
            discountPercentage: "",
            creditTermDays: "",
            pickupFrequencyDays: "",
            deliveryTatDays: "",
            prices: [],
        });
    };

    useCreateAgreementAgent({
        isAgreementDialogOpen,
        setValue,
        getValues,
        reset: resetAgreementForm,
        append,
        products,
    });

    // Removed unused renderAgreementFormFields

    const renderAgreementDetails = () => {
        if (!agreementDetails) {
            return (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ color: "#555" }}>
                        No agreement found.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        sx={{ mt: 2 }}
                        data-agent-action="add-agreement"
                        onClick={() => {
                            reset({
                                startDate: "",
                                endDate: "",
                                type: "",
                                status: "",
                                linenDeliveryDays: "",
                                serviceFrequency: "",
                                totalRooms: "",
                                occupancyRate: "",
                                depositAmount: "",
                                billingStartDay: "",
                                billingEndDay: "",
                                billingCycle: "",
                                billingType: "",
                                fixedMonthlyAmount: "",
                                creditDays: "",
                                discountPercentage: "",
                                creditTermDays: "",
                                pickupFrequencyDays: "",
                                deliveryTatDays: "",
                                prices: [],
                            });
                            setIsAgreementDialogOpen(true);
                        }}
                    >
                        Add New Agreement
                    </Button>
                </Box>
            );
        }

        return (
            <>
                <Box container spacing={2}></Box>
                <Typography
                    variant="h6"
                    sx={{
                        mt: 3,
                        mb: 2,
                        color: "#333",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    Agreement Details
                    <Button
                        variant="outlined"
                        size="small"
                        sx={{ ml: 2 }}
                        onClick={() => setIsAgreementDialogOpen(true)}
                    >
                        Edit Agreement
                    </Button>
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box container spacing={2}>
                    <Box item xs={6}>
                        <Typography variant="body2" sx={{ color: "#555" }}>
                            <strong>Agreement Type:</strong>{" "}
                            {agreementDetails.type}
                        </Typography>
                    </Box>
                    <Box item xs={6}>
                        <Typography variant="body2" sx={{ color: "#555" }}>
                            <strong>Start Date:</strong>{" "}
                            {formatCustomDate(agreementDetails.startDate)}
                        </Typography>
                    </Box>
                    <Box item xs={6}>
                        <Typography variant="body2" sx={{ color: "#555" }}>
                            <strong>End Date:</strong>{" "}
                            {formatCustomDate(agreementDetails.endDate)}
                        </Typography>
                    </Box>
                    <Box item xs={6}>
                        <Typography variant="body2" sx={{ color: "#555" }}>
                            <strong>Status:</strong> {agreementDetails.status}
                        </Typography>
                    </Box>
                    {agreementDetails.type === "RENTAL_LAUNDRY" && (
                        <>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Linen Delivery Days:</strong>{" "}
                                    {agreementDetails?.rentalDetails?.linenDeliveryDays ?? agreementDetails.linenDeliveryDays}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Service Frequency:</strong>{" "}
                                    {agreementDetails?.rentalDetails?.serviceFrequency ?? agreementDetails.serviceFrequency}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Total Rooms:</strong>{" "}
                                    {agreementDetails.totalRooms}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Occupancy Rate:</strong>{" "}
                                    {agreementDetails.occupancyRate}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Deposit Amount:</strong>{" "}
                                    {agreementDetails.depositAmount}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Start Day:</strong>{" "}
                                    {agreementDetails.billingStartDay}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing End Day:</strong>{" "}
                                    {agreementDetails.billingEndDay}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Cycle:</strong>{" "}
                                    {agreementDetails.billingCycle}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Discount Percentage:</strong>{" "}
                                    {agreementDetails.discountPercentage}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Credit Days:</strong>{" "}
                                    {agreementDetails.creditDays}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Type:</strong>{" "}
                                    {agreementDetails.billingType}
                                </Typography>
                            </Box>
                            {agreementDetails.billingType === "FLEXIBLE" && (
                                <Box item xs={12}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Prices:</strong>
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        Product Name
                                                    </TableCell>
                                                    <TableCell>
                                                        Quantity
                                                    </TableCell>
                                                    <TableCell>Price</TableCell>
                                                    <TableCell>
                                                        Service Type
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {agreementDetails.prices.map(
                                                    (price, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>
                                                                {
                                                                    price.productName
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {price.quantity}
                                                            </TableCell>
                                                            <TableCell>
                                                                {price.price}
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    price.serviceType
                                                                }
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </>
                    )}
                    {agreementDetails.type === "LAUNDRY" && (
                        <>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Total Rooms:</strong>{" "}
                                    {agreementDetails.totalRooms}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Occupancy Rate:</strong>{" "}
                                    {agreementDetails.occupancyRate}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Credit Term Days:</strong>{" "}
                                    {agreementDetails.creditTermDays}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Cycle:</strong>{" "}
                                    {agreementDetails.billingCycle}
                                </Typography>
                            </Box>

                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Start Day:</strong>{" "}
                                    {agreementDetails.billingStartDay}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing End Day:</strong>{" "}
                                    {agreementDetails.billingEndDay}
                                </Typography>
                            </Box>

                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Delivery Turn Around Time:</strong>{" "}
                                    {agreementDetails.deliveryTatDays}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Pickup Frequency Days:</strong>{" "}
                                    {agreementDetails.pickupFrequencyDays}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Discount Percentage:</strong>{" "}
                                    {agreementDetails.discountPercentage}
                                </Typography>
                            </Box>
                            <Box item xs={6}>
                                <Typography
                                    variant="body2"
                                    sx={{ color: "#555" }}
                                >
                                    <strong>Billing Type:</strong>{" "}
                                    {agreementDetails.billingType}
                                </Typography>
                            </Box>
                            {agreementDetails.billingType === "FLEXIBLE" && (
                                <Box item xs={12}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Prices:</strong>
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>
                                                        Product Name
                                                    </TableCell>
                                                    <TableCell>
                                                        Quantity
                                                    </TableCell>
                                                    <TableCell>Price</TableCell>
                                                    <TableCell>
                                                        Service Type
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {agreementDetails.prices.map(
                                                    (price, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>
                                                                {
                                                                    price.productName
                                                                }
                                                            </TableCell>
                                                            <TableCell>
                                                                {price.quantity}
                                                            </TableCell>
                                                            <TableCell>
                                                                {price.price}
                                                            </TableCell>
                                                            <TableCell>
                                                                {
                                                                    price.serviceType
                                                                }
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </>
        );
    };

    const handleDeleteClick = async (hotelId) => {
        if (window.confirm("Are you sure you want to delete this hotel?")) {
            try {
                await customerService.deleteCustomer(hotelId);
                loadHotels(); // Refresh the hotel list
            } catch (error) {
                console.error("Failed to delete hotel:", error);
                const backendMessage =
                    error.response?.data?.message ||
                    "Failed to delete hotel. Please try again.";
                setSnackbarMessage(backendMessage);
                setSnackbarOpen(true);
            }
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mb: 2 }}>
            <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                    Hotel Management
                </Typography>

                <Box display={'flex'} gap={2} alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
                    <Box item xs={8}>
                        <TextField
                            size="small"
                            placeholder="Search hotels..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            sx={{ width: "100%", maxWidth: 300 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Box>
                    <Box item xs={4} sx={{ textAlign: "right" }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            data-agent-action="add-hotel"
                            sx={{
                                background:
                                    "linear-gradient(45deg, #2e7d32 30%, #43a047 90%)",
                                boxShadow: "0 2px 4px rgba(46, 125, 50, 0.25)",
                                textTransform: "none",
                                zIndex: 2,
                                width: "150px",
                                height: "40px",
                            }}
                            onClick={handleAddClick}
                        >
                            Add Hotel
                        </Button>
                    </Box>
                </Box>
            </Paper>
            <TableContainer component={Paper} elevation={3}>
                 <Table
                size="small"
                sx={{
                    tableLayout: "fixed"
                }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    // fontWeight: 500,
                                }}
                            >
                                <strong>Name</strong>
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                        width: "23%"
                                }}
                            >
                                Email
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                    width:"16%",
                                }}
                            >
                                Phone
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                    width:"5%",
                                }}
                            >
                                Type
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                    width:"5%",
                                }}
                            >
                                Status
                            </TableCell>
                            <TableCell
                                sx={{
                                    py: 1.5,
                                    backgroundColor: "primary.lighter",
                                    fontWeight: 500,
                                    width:"7%",
                                }}
                                align="right"
                            >
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {hotels.map((hotel) => (
                            <TableRow
                                key={hotel.id}
                                hover
                                onClick={() => handleRowClick(hotel)}
                                sx={{
                                    cursor: "pointer",
                                    "&:nth-of-type(odd)": {
                                        backgroundColor:
                                            "background.default",
                                    },
                                    "& td": { py: 1 },
                                }}
                            >
                                <TableCell sx={{ width: "30%" }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                       <strong> {hotel.name} </strong>
                                    </Box>
                                </TableCell>
                                <TableCell>{hotel.email}</TableCell>
                                <TableCell>{hotel.phone}</TableCell>
                                <TableCell>{hotel.type}</TableCell>
                                <TableCell>{hotel.status}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(hotel);
                                        }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(hotel.id);
                                        }}
                                    >
                                        <DeleteIcon
                                            fontSize="small"
                                            color="error"
                                        />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {hotels.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    align="center"
                                    sx={{ py: 3 }}
                                >
                                    No hotels found matching your search
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Drawer
                anchor="right"
                open={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                sx={{ width: 500 }}
            >
                <Box sx={{ p: 3, width: 650, overflowY: "auto", pb: 6 }}>
                    {selectedHotel && (
                        <>
                            <Typography
                                variant="h6"
                                sx={{ mb: 2, color: "#333" }}
                            >
                                Hotel Details
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Box container spacing={2}>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Name:</strong>{" "}
                                        {selectedHotel.name}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Email:</strong>{" "}
                                        {selectedHotel.email}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Phone:</strong>{" "}
                                        {selectedHotel.phone}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Type:</strong>{" "}
                                        {selectedHotel.type}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Status:</strong>{" "}
                                        {selectedHotel.status}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>GSTIN:</strong>{" "}
                                        {selectedHotel.gstin}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>PAN:</strong>{" "}
                                        {selectedHotel.pan}
                                    </Typography>
                                </Box>
                                <Box item xs={6}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>ID:</strong> {selectedHotel.id}
                                    </Typography>
                                </Box>
                                <Box item xs={12}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Billing Address:</strong>{" "}
                                        {
                                            selectedHotel.billingAddress
                                                .addressLine1
                                        }
                                        ,{" "}
                                        {
                                            selectedHotel.billingAddress
                                                .addressLine2
                                        }
                                        , {selectedHotel.billingAddress.state},{" "}
                                        {selectedHotel.billingAddress.country},{" "}
                                        {selectedHotel.billingAddress.pincode}
                                    </Typography>
                                </Box>
                                <Box item xs={12}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Shipping Address:</strong>{" "}
                                        {
                                            selectedHotel.shippingAddress
                                                .addressLine1
                                        }
                                        ,{" "}
                                        {
                                            selectedHotel.shippingAddress
                                                .addressLine2
                                        }
                                        , {selectedHotel.shippingAddress.state},{" "}
                                        {selectedHotel.shippingAddress.country},{" "}
                                        {selectedHotel.shippingAddress.pincode}
                                    </Typography>
                                </Box>
                                <Box item xs={12}>
                                    <Typography
                                        variant="body2"
                                        sx={{ color: "#555" }}
                                    >
                                        <strong>Contact Persons:</strong>
                                    </Typography>
                                    {selectedHotel.contactPersons.map(
                                        (person, index) => (
                                            <Typography
                                                key={index}
                                                variant="body2"
                                                sx={{ color: "#555" }}
                                            >
                                                {person.name}- {person.email},{" "}
                                                {person.phone}
                                            </Typography>
                                        )
                                    )}
                                </Box>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {renderAgreementDetails()}

                            <Divider sx={{ my: 3 }} />

                            <CustomerUsersTable 
                                customerId={selectedHotel?.id}
                                customerName={selectedHotel?.name}
                            />
                        </>
                    )}
                </Box>
            </Drawer>

            <HotelDialog
                open={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                hotel={selectedHotel}
                onSave={handleSave}
            />

            <Dialog
                open={isAgreementDialogOpen}
                onClose={() => setIsAgreementDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Create Agreement</DialogTitle>
                <DialogContent>
                    <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                        <Box flex={1}>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        select
                                        size="small"
                                        label="Agreement Type"
                                    >
                                        <MenuItem value="RENTAL_LAUNDRY">
                                            Rental Laundry
                                        </MenuItem>
                                        <MenuItem value="LAUNDRY">Laundry</MenuItem>
                                    </TextField>
                                )}
                            />
                        </Box>
                        <Box flex={1}>
                            <Controller
                                name="startDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        size="small"
                                        label="Start Date"
                                        type="date"
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Box>
                        <Box flex={1}>
                            <Controller
                                name="endDate"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        fullWidth
                                        size="small"
                                        label="End Date"
                                        type="date"
                                        InputLabelProps={{ shrink: true }}
                                    />
                                )}
                            />
                        </Box>
                    </Box>
                    <Box display={"flex"} sx={{ mt: 2 }}>
                        <Box flex={1}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="agreement-status-label">Status</InputLabel>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            labelId="agreement-status-label"
                                            label="Status"
                                        >
                                            <MenuItem value="ACTIVE">Active</MenuItem>
                                            <MenuItem value="INACTIVE">
                                                Inactive
                                            </MenuItem>
                                        </Select>
                                    )}
                                />
                            </FormControl>
                        </Box>
                    </Box>
                    {/* Linen delivery settings are only applicable to RENTAL_LAUNDRY */}
                    {watchedAgreementType === "RENTAL_LAUNDRY" && (
                        <>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <Controller
                                        name="totalRooms"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Total Rooms"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Controller
                                        name="occupancyRate"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Occupancy Rate"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={2}>
                                    <Controller
                                        name="depositAmount"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Deposit Amount"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Controller
                                        name="creditDays"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Credit Days"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <Controller
                                        name="linenDeliveryDays"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Linen Delivery Days"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="service-frequency-label">Service Frequency</InputLabel>
                                        <Controller
                                            name="serviceFrequency"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    labelId="service-frequency-label"
                                                    label="Service Frequency"
                                                >
                                                    {serviceFrequencies.map((freq) => (
                                                        <MenuItem key={freq} value={freq}>
                                                            {freq.replace("_", " ")}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            )}
                                        />
                                    </FormControl>
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <Controller
                                        name="billingCycle"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Billing Cycle"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Controller
                                        name="billingStartDay"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Billing Start Day"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                                <Box flex={1}>
                                    <Controller
                                        name="billingEndDay"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                fullWidth
                                                size="small"
                                                label="Billing End Day"
                                                type="number"
                                            />
                                        )}
                                    />
                                </Box>
                            </Box>
                            <Box flex={1} sx={{ mt: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="billing-type-label">Billing Type</InputLabel>
                                    <Controller
                                        name="billingType"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                labelId="billing-type-label"
                                                label="Billing Type"
                                            >
                                                <MenuItem value="FLEXIBLE">
                                                    Flexible
                                                </MenuItem>
                                                <MenuItem value="FIXED">Fixed</MenuItem>
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                            </Box>
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Price List
                                </Typography>
                                {prices.map((price, index) => (
                                    <Box key={price.id} display={"flex"} gap={2} sx={{ mb: 2 }} alignItems="center">
                                        <Box flex={3}>
                                            <FormControl fullWidth size="small" sx={{ flex: 2 }}>
                                                <InputLabel id={`price-product-label-${index}`}>Product</InputLabel>
                                                <Controller
                                                    name={`prices.${index}.productId`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            labelId={`price-product-label-${index}`}
                                                            label="Product"
                                                        >
                                                            {products.map((product) => (
                                                                <MenuItem key={product.id} value={product.id}>
                                                                    {product.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    )}
                                                />
                                            </FormControl>
                                        </Box>
                                        <Box flex={1}>
                                            <Controller
                                                name={`prices.${index}.quantity`}
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        size="small"
                                                        label="Quantity"
                                                        type="number"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                focusNextInRefs(quantityRefs, index);
                                                            }
                                                        }}
                                                        inputRef={(el) => (quantityRefs.current[index] = el)}
                                                        sx={{ maxWidth: 80 }}
                                                    />
                                                )}
                                            />
                                        </Box>
                                        <Box flex={1}>
                                            <Controller
                                                name={`prices.${index}.price`}
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        size="small"
                                                        label="Price"
                                                        type="number"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                focusNextInRefs(priceRefs, index);
                                                            }
                                                        }}
                                                        inputRef={(el) => (priceRefs.current[index] = el)}
                                                        sx={{ maxWidth: 100 }}
                                                    />
                                                )}
                                            />
                                        </Box>
                                        <Box flex={1}>
                                            <FormControl fullWidth size="small" sx={{ flex: 2 }}>
                                                <InputLabel id={`price-service-label-${index}`}>Service Type</InputLabel>
                                                <Controller
                                                    name={`prices.${index}.serviceType`}
                                                    control={control}
                                                    render={({ field }) => (
                                                        <Select
                                                            {...field}
                                                            labelId={`price-service-label-${index}`}
                                                            label="Service Type"
                                                        >
                                                            {serviceTypes.map((type) => (
                                                                <MenuItem key={type} value={type}>
                                                                    {type.replace("_", " ")}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                    )}
                                                />
                                            </FormControl>
                                        </Box>
                                        <Box flex={1}>
                                            <Controller
                                                name={`prices.${index}.remarks`}
                                                control={control}
                                                render={({ field }) => (
                                                    <TextField
                                                        {...field}
                                                        size="small"
                                                        label="Remarks"
                                                        sx={{ flex: 2 }}
                                                    />
                                                )}
                                            />
                                        </Box>
                                        <Box flex={1}>
                                            <IconButton onClick={() => handleRemovePriceItem(index)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                ))}
                                <Button
                                    startIcon={<AddIcon />}
                                    onClick={handleAddPriceItem}
                                    variant="outlined"
                                >
                                    Add Price Item
                                </Button>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsAgreementDialogOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit(handleAgreementSubmit)}
                        variant="contained"
                        color="primary"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

            <CustomSnackbar
                open={snackbarOpen}
                message={snackbarMessage}
                onClose={() => setSnackbarOpen(false)}
            />
        </Container>
    );
}

export default HotelList;
