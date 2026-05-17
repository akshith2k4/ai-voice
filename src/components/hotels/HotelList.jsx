import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { useAgentForm } from '../../agent/useAgentForm';

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
    const [agreementFormData, setAgreementFormData] = useState({
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
    const [products, setProducts] = useState([]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");

    // Refs to enable cycling focus across Quantity and Price inputs
    const quantityRefs = useRef([]);
    const priceRefs = useRef([]);

    // Ensure refs arrays always match the number of price items
    useEffect(() => {
        const count = agreementFormData.prices.length;
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
    }, [agreementFormData.prices.length]);

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
            setAgreementFormData({
                startDate: agreementResponse.startDate,
                endDate: agreementResponse.endDate,
                type: agreementResponse.type,
                status: agreementResponse.status,
                linenDeliveryDays:
                    agreementResponse?.rentalDetails?.linenDeliveryDays ??
                    agreementResponse.linenDeliveryDays ??
                    "",
                serviceFrequency:
                    agreementResponse?.rentalDetails?.serviceFrequency ??
                    agreementResponse.serviceFrequency ??
                    "",
                totalRooms: agreementResponse.totalRooms,
                occupancyRate: agreementResponse.occupancyRate,
                depositAmount: agreementResponse.depositAmount,
                billingStartDay: agreementResponse.billingStartDay,
                billingEndDay: agreementResponse.billingEndDay,
                billingCycle: agreementResponse.billingCycle,
                billingType: agreementResponse.billingType,
                fixedMonthlyAmount: agreementResponse.fixedMonthlyAmount,
                creditDays: agreementResponse.creditDays,
                discountPercentage: agreementResponse.discountPercentage,
                creditTermDays: agreementResponse.creditTermDays,
                pickupFrequencyDays: agreementResponse.pickupFrequencyDays,
                deliveryTatDays: agreementResponse.deliveryTatDays,
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
            setAgreementFormData({
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

    const handleAgreementFormChange = (field, value) => {
        setAgreementFormData((prevData) => ({
            ...prevData,
            [field]: value,
        }));
    };

    const handleAddPriceItem = () => {
        setAgreementFormData((prev) => ({
            ...prev,
            prices: [
                ...prev.prices,
                {
                    productId: "",
                    quantity: 0,
                    price: 0,
                    remarks: "",
                    serviceType: "",
                },
            ],
        }));
    };

    const handleRemovePriceItem = async (index) => {
        const itemToRemove = agreementFormData.prices[index];

        if (itemToRemove.id) {
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

        setAgreementFormData((prev) => ({
            ...prev,
            prices: prev.prices.filter((_, i) => i !== index),
        }));
    };

    const handlePriceItemChange = (index, field, value) => {
        const updatedPrices = [...agreementFormData.prices];
        updatedPrices[index][field] = value;
        setAgreementFormData((prev) => ({
            ...prev,
            prices: updatedPrices,
        }));
    };

    const handleAgreementSubmit = async () => {
        try {
            const requestBody = {
                customerId: selectedHotel.id,
                type: agreementFormData.type,
                startDate: agreementFormData.startDate,
                endDate: agreementFormData.endDate,
                prices: agreementFormData.prices.map((price) => ({
                    productId: price.productId,
                    quantity: price.quantity,
                    price: price.price,
                    serviceType: price.serviceType,
                })),
            };

            if (agreementFormData.type === "RENTAL_LAUNDRY") {
                requestBody.rentalDetails = {
                    totalRooms: agreementFormData.totalRooms,
                    occupancyRate: agreementFormData.occupancyRate,
                    depositAmount: agreementFormData.depositAmount,
                    billingStartDay: agreementFormData.billingStartDay,
                    billingEndDay: agreementFormData.billingEndDay,
                    billingCycle: agreementFormData.billingCycle,
                    billingType: agreementFormData.billingType,
                    fixedMonthlyAmount: agreementFormData.fixedMonthlyAmount,
                    creditDays: agreementFormData.creditDays,
                    linenDeliveryDays: agreementFormData.linenDeliveryDays,
                    serviceFrequency: agreementFormData.serviceFrequency,
                };
            } else if (agreementFormData.type === "LAUNDRY") {
                requestBody.laundryDetails = {
                    totalRooms: agreementFormData.totalRooms,
                    occupancyRate: agreementFormData.occupancyRate,
                    creditTermDays: agreementFormData.creditTermDays,
                    billingCycle: agreementFormData.billingCycle,
                    billingStartDay: agreementFormData.billingStartDay,
                    billingEndDay: agreementFormData.billingEndDay,
                    pickupFrequencyDays: agreementFormData.pickupFrequencyDays,
                    deliveryTatDays: agreementFormData.deliveryTatDays,
                    billingType: agreementFormData.billingType,
                    fixedMonthlyAmount: agreementFormData.fixedMonthlyAmount,
                    discountPercentage: agreementFormData.discountPercentage,
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

    const handleAgreementTypeChange = (event) => {
        setAgreementFormData({
            ...agreementFormData,
            type: event.target.value,
        });
    };

    const resetAgreementForm = () => {
        setAgreementFormData({
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

    useAgentForm('createAgreement', {
        fields: [
            { key: 'type', type: 'select', set: v => handleAgreementFormChange('type', v) },
            { key: 'startDate', type: 'date', set: v => handleAgreementFormChange('startDate', v) },
            { key: 'endDate', type: 'date', set: v => handleAgreementFormChange('endDate', v) },
            { key: 'status', type: 'select', set: v => handleAgreementFormChange('status', v) },
            { key: 'totalRooms', type: 'text', set: v => handleAgreementFormChange('totalRooms', v) },
            { key: 'occupancyRate', type: 'text', set: v => handleAgreementFormChange('occupancyRate', v) },
            { key: 'depositAmount', type: 'text', set: v => handleAgreementFormChange('depositAmount', v) },
            { key: 'creditDays', type: 'text', set: v => handleAgreementFormChange('creditDays', v) },
            { key: 'linenDeliveryDays', type: 'text', set: v => handleAgreementFormChange('linenDeliveryDays', v) },
            { key: 'serviceFrequency', type: 'select', set: v => handleAgreementFormChange('serviceFrequency', v) },
            { key: 'creditTermDays', type: 'text', set: v => handleAgreementFormChange('creditTermDays', v) },
            { key: 'pickupFrequencyDays', type: 'text', set: v => handleAgreementFormChange('pickupFrequencyDays', v) },
            { key: 'deliveryTatDays', type: 'text', set: v => handleAgreementFormChange('deliveryTatDays', v) },
            { key: 'discountPercentage', type: 'text', set: v => handleAgreementFormChange('discountPercentage', v) },
            { key: 'billingCycle', type: 'text', set: v => handleAgreementFormChange('billingCycle', v) },
            { key: 'billingStartDay', type: 'text', set: v => handleAgreementFormChange('billingStartDay', v) },
            { key: 'billingEndDay', type: 'text', set: v => handleAgreementFormChange('billingEndDay', v) },
            { key: 'billingType', type: 'select', set: v => handleAgreementFormChange('billingType', v) },
            { key: 'fixedMonthlyAmount', type: 'text', set: v => handleAgreementFormChange('fixedMonthlyAmount', v) },
        ],
        subForms: [
            {
                id: 'priceItem',
                add: handleAddPriceItem,
                fields: [
                    { key: 'productId', type: 'select', setByIndex: (val, idx) => {
                        let productId = val;
                        if (typeof val === 'string') {
                            const prod = products.find(p => p.name.toLowerCase() === val.toLowerCase() || p.id === val);
                            if (prod) productId = prod.id;
                        } else if (val && val.id) {
                            productId = val.id;
                        }
                        handlePriceItemChange(idx, 'productId', productId);
                    }},
                    { key: 'quantity', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'quantity', v) },
                    { key: 'price', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'price', v) },
                    { key: 'serviceType', type: 'select', setByIndex: (v, i) => handlePriceItemChange(i, 'serviceType', v) },
                    { key: 'remarks', type: 'text', setByIndex: (v, i) => handlePriceItemChange(i, 'remarks', v) },
                ],
            },
        ],
        clearAll: resetAgreementForm,
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
                            setAgreementFormData({
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
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Agreement Type"
                                name="type"
                                value={agreementFormData.type}
                                onChange={handleAgreementTypeChange}
                            >
                                <MenuItem value="RENTAL_LAUNDRY">
                                    Rental Laundry
                                </MenuItem>
                                <MenuItem value="LAUNDRY">Laundry</MenuItem>
                            </TextField>
                        </Box>
                        <Box flex={1}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Start Date"
                                type="date"
                                value={agreementFormData.startDate}
                                onChange={(e) =>
                                    handleAgreementFormChange(
                                        "startDate",
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                        <Box flex={1}>
                            <TextField
                                fullWidth
                                size="small"
                                label="End Date"
                                type="date"
                                value={agreementFormData.endDate}
                                onChange={(e) =>
                                    handleAgreementFormChange(
                                        "endDate",
                                        e.target.value
                                    )
                                }
                                InputLabelProps={{ shrink: true }}
                            />
                        </Box>
                    </Box>
                    <Box display={"flex"} sx={{ mt: 2 }}>
                        <Box flex={1}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={agreementFormData.status}
                                    onChange={(e) =>
                                        handleAgreementFormChange(
                                            "status",
                                            e.target.value
                                        )
                                    }
                                >
                                    <MenuItem value="ACTIVE">Active</MenuItem>
                                    <MenuItem value="INACTIVE">
                                        Inactive
                                    </MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                    {/* Linen delivery settings are only applicable to RENTAL_LAUNDRY */}
                    {agreementFormData.type === "RENTAL_LAUNDRY" && (
                        <>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Total Rooms"
                                        type="number"
                                        value={agreementFormData.totalRooms}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "totalRooms",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Occupancy Rate"
                                        type="number"
                                        value={agreementFormData.occupancyRate}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "occupancyRate",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={2}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Deposit Amount"
                                        type="number"
                                        value={agreementFormData.depositAmount}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "depositAmount",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Credit Days"
                                        type="number"
                                        value={agreementFormData.creditDays}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "creditDays",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Linen Delivery Days"
                                        type="number"
                                        value={agreementFormData.linenDeliveryDays}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "linenDeliveryDays",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                                <Box flex={1}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Service Frequency</InputLabel>
                                        <Select
                                            value={agreementFormData.serviceFrequency}
                                            label="Service Frequency"
                                            onChange={(e) =>
                                                handleAgreementFormChange(
                                                    "serviceFrequency",
                                                    e.target.value
                                                )
                                            }
                                        >
                                            {serviceFrequencies.map((freq) => (
                                                <MenuItem key={freq} value={freq}>
                                                    {freq.replace("_", " ")}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                            <Box display={"flex"} gap={2} sx={{ mt: 2 }}>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Billing Cycle"
                                        type="number"
                                        name="billingCycle"
                                        value={agreementFormData.billingCycle}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "billingCycle",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Billing Start Day"
                                        name="billingStartDay"
                                        type="number"
                                        value={agreementFormData.billingStartDay}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "billingStartDay",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                                <Box flex={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Billing End Day"
                                        name="billingEndDay"
                                        type="number"
                                        value={agreementFormData.billingEndDay}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "billingEndDay",
                                                e.target.value
                                            )
                                        }
                                    />
                                </Box>
                            </Box>
                            <Box flex={1} sx={{ mt: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Billing Type</InputLabel>
                                    <Select
                                        value={agreementFormData.billingType}
                                        onChange={(e) =>
                                            handleAgreementFormChange(
                                                "billingType",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <MenuItem value="FLEXIBLE">
                                            Flexible
                                        </MenuItem>
                                        <MenuItem value="FIXED">Fixed</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                            <Box sx={{ mt: 3 }}>

                                <Typography variant="h6" sx={{ mb: 1 }}>
                                    Price List
                                </Typography>
                                {agreementFormData.prices.map((price, index) => (
                                    <Box key={index} display={"flex"} gap={2} sx={{ mb: 2 }} alignItems="center">
                                        <Box flex={3}>
                                            <FormControl fullWidth size="small" sx={{ flex: 2 }}>
                                                <InputLabel>Product</InputLabel>
                                                <Select
                                                    value={price.productId}
                                                    onChange={(e) =>
                                                        handlePriceItemChange(index, "productId", e.target.value)
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
                                                size="small"
                                                label="Quantity"
                                                type="number"
                                                value={price.quantity}
                                                onChange={(e) =>
                                                    handlePriceItemChange(index, "quantity", e.target.value)
                                                }
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
                                        </Box>
                                        <Box flex={1}>
                                            <TextField
                                                size="small"
                                                label="Price"
                                                type="number"
                                                value={price.price}
                                                onChange={(e) =>
                                                    handlePriceItemChange(index, "price", e.target.value)
                                                }
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
                                        </Box>
                                        <Box flex={1}>
                                            <FormControl fullWidth size="small" sx={{ flex: 2 }}>
                                                <InputLabel>Service Type</InputLabel>
                                                <Select
                                                    value={price.serviceType}
                                                    onChange={(e) =>
                                                        handlePriceItemChange(index, "serviceType", e.target.value)
                                                    }
                                                >
                                                    {serviceTypes.map((type) => (
                                                        <MenuItem key={type} value={type}>
                                                            {type.replace("_", " ")}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                        <Box flex={1}>
                                            <TextField
                                                size="small"
                                                label="Remarks"
                                                value={price.remarks}
                                                onChange={(e) =>
                                                    handlePriceItemChange(index, "remarks", e.target.value)
                                                }
                                                sx={{ flex: 2 }}
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
                        onClick={handleAgreementSubmit}
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
