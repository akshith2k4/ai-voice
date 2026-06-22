import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import { ToastContainer } from 'react-toastify';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import 'react-toastify/dist/ReactToastify.css';

import theme from './theme';
import './App.css';

// Layout stays eagerly loaded (always needed)
import Layout from './components/layout/Layout';
import { AgentProvider, AgentErrorBoundary } from './agent/AgentBridge';
import AgentOverlay from './agent/AgentOverlay';
import NavigationHandler from './agent/NavigationHandler';
import WalkthroughHandler from './agent/WalkthroughHandler';

// Lazy-loaded route components
const Login = React.lazy(() => import('./components/auth/Login'));
const HotelList = React.lazy(() => import('./components/hotels/HotelList'));
const ProductList = React.lazy(() => import('./components/products/ProductList'));
const OrderList = React.lazy(() => import('./components/orders/OrderList'));
const PackingJobsPage = React.lazy(() => import('./components/packingJobs/PackingJobsPage'));
const TripManagement = React.lazy(() => import('./components/trips/TripManagement'));
const VendorList = React.lazy(() => import('./components/vendors/VendorList'));
const ProcessingList = React.lazy(() => import('./components/processing/ProcessingList'));
const InvoicesPage = React.lazy(() => import('./components/invoices/InvoicesPage'));
const UserList = React.lazy(() => import('./components/users/UserList'));
const CommunicationList = React.lazy(() => import('./components/communication/CommunicationList'));
const CustomersPage = React.lazy(() => import('./components/customers/CustomersPage'));
const InvoiceGenerator = React.lazy(() => import('./components/invoices/InvoiceGenerator'));
const LaundryVendorsPage = React.lazy(() => import('./components/vendors/LaundryVendorsPage'));
const VehicleManagement = React.lazy(() => import('./components/vehicles/VehicleManagement'));
const WashRequestsPage = React.lazy(() => import('./components/washRequests/WashRequestsPage'));
const InventoryPage = React.lazy(() => import('./components/inventory/InventoryPage'));
const InventorySummaryPage = React.lazy(() => import('./components/inventorySummary/InventorySummaryPage'));
const InventoryItemReservationPage = React.lazy(() => import('./components/inventoryItemReservation/InventoryItemReservtionPage'));
const RouteManagementPage = React.lazy(() => import('./components/RouteManagement/RouteManagementPage'));
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));
const IssueTracker = React.lazy(() => import('./components/issueTracker/IssueTracker'));
const InventoryPoolPage = React.lazy(() => import('./components/inventory-pool/InventoryPoolPage'));
const InventoryPoolTable = React.lazy(() => import('./components/inventory-pool/InventoryPoolTable'));
const InventoryReservation = React.lazy(() => import('./components/InventoryReservation/InventoryReservation'));
const DamageAssessmentDashboard = React.lazy(() => import('./components/damageAssessment/DamageAssessmentDashboard'));
const BillManagementPage = React.lazy(() => import('./components/billing/BillManagementPage'));
const BillingCycle = React.lazy(() => import('./components/billing/BillingCycle'));
const BillingPreference = React.lazy(() => import('./components/billing/BillingPreference'));
const HelpersPage = React.lazy(() => import('./helpers/HelpersPage'));

const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
    <CircularProgress color="primary" />
  </Box>
);

// 🛡️ Auth guard
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

// Redirect root or unknown routes based on auth state
const RootRedirect = () => {
  const token = localStorage.getItem('token');
  return <Navigate to={token ? '/hotels' : '/login'} replace />;
};

// Sync auth between tabs (if logged out elsewhere, redirect this tab)
const AuthSync = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [navigate]);
  return null;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
        <Router>
          <AgentProvider>
            <AuthSync />
            <ToastContainer position="top-right" autoClose={3000} />
            <AgentErrorBoundary>
              <NavigationHandler />
              <WalkthroughHandler />
              <AgentOverlay />
            </AgentErrorBoundary>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/hotels" element={<HotelList />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/packing-jobs" element={<PackingJobsPage />} />
                  <Route path="/trips" element={<TripManagement />} />
                  <Route path="/vendors" element={<VendorList />} />
                  <Route path="/processing" element={<ProcessingList />} />
                  <Route path="/invoices" element={<InvoicesPage />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/communication" element={<CommunicationList />} />
                  <Route path="/vehicles" element={<VehicleManagement />} />
                  <Route path="/billing" element={<BillManagementPage />}>
                    <Route index element={<BillingCycle />} />
                    <Route path="preference" element={<BillingPreference />} />
                  </Route>
                  {/* <Route path="/generate-invoice" element={<InvoiceGenerator />} /> */}
                  <Route path="/laundry-vendors" element={<LaundryVendorsPage />} />
                  <Route path="/wash-requests" element={<WashRequestsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/inventory-summary" element={<InventorySummaryPage />} />
                  {/* <Route path="/inventory-pool" element={<InventoryPoolPage />} /> */}
                  <Route path="/inventory-pool" element={<InventoryPoolPage />}>
                    <Route index element={<InventoryPoolTable />} />
                    <Route path="reservation" element={<InventoryReservation />} />
                  </Route>
                  {/* <Route path="/customer-inventory-reservation" element={<InventoryReservation />} /> */}
                  <Route path="/inventory-item-reservation" element={<InventoryItemReservationPage />} />
                  <Route path="/routes" element={<RouteManagementPage />} />
                  <Route path="/issue-tracker" element={<IssueTracker />}></Route>
                  <Route path="/damage-assessment" element={<DamageAssessmentDashboard />}></Route>
                  <Route path="/helpers" element={<HelpersPage />} />
                  <Route
                    path="/rfid-scan"
                    element={<Navigate to="/helpers?module=rfid-scan" replace />}
                  />
                </Route>
              </Route>

              {/* Special case (Public page not wrapped in layout) */}
              <Route path="/customers" element={<CustomersPage />} />

              {/* Redirects */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </Suspense>
          </AgentProvider>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
