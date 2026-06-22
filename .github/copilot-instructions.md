# Copilot Instructions — LinenGrass Laundry ERP

## Build & Dev Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build (vite build)
npm run lint      # ESLint (flat config, JS/JSX only)
npm run preview   # Preview production build
```

No test framework is configured.

## Architecture

This is a **React 19 SPA** (Vite) for managing industrial laundry operations — inventory, wash cycles, fulfillment, trips, vendors, and hotel orders. The backend is a Spring Boot + MySQL API.

### API Layer

- **Axios instance** in `src/services/apiService.jsx` with request/response interceptors.
- Request interceptor injects `Authorization: Bearer <token>` and `X-Company-ID` from localStorage.
- To inject the current data-center ID (`dcId`) into a request, pass `meta: { includeDcid: true }` in the Axios config. The interceptor appends `dcId` as a query param (GET) or body field (POST/PUT).
- 401/403 responses auto-clear localStorage and redirect to `/login`.
- Base URL comes from `VITE_BASE_URL` env var (e.g. `http://localhost:5000/api`).

### Service Pattern

Each domain has a dedicated service file in `src/services/` that wraps Axios calls:

```js
// src/services/orderService.jsx
import api from "./apiService";
export const orderService = {
  getOrders: (params) => api.get("/orders", { params, meta: { includeDcid: true } }),
};
```

### Data Fetching — React Query

All server state is managed through `@tanstack/react-query`. Custom hooks in `src/hooks/` wrap `useQuery`/`useMutation` and handle cache invalidation:

```js
// src/hooks/useBilling.js
export const useBillingCycles = (params) =>
  useQuery({ queryKey: ["billingCycles", params], queryFn: () => billingService.getCycles(params) });
```

The `QueryClientProvider` wraps the app in `src/main.jsx`.

### State Management

- **No Redux/Zustand.** Global state uses React Context (`src/context/DcidContext.jsx`) for the active data-center ID (`dcId`).
- `src/state/dcidStore.js` is a singleton store backed by localStorage (`linengrass_dcid`), synced across tabs via `storage` events.
- Auth tokens, companyId, branchId, and currentUser are stored directly in localStorage.

### Routing

React Router v7 (`react-router-dom`) configured in `src/App.jsx`. Routes are **not** lazy-loaded. All protected routes are wrapped in `<ProtectedRoute>` (checks for token in localStorage) and nested under `<Layout>`.

### Forms

- **Complex forms**: `react-hook-form` with `Controller` components (e.g. `ItemDamageRequestDialog.jsx`).
- **Simple forms**: plain `useState` (e.g. Login).
- `formik` is in `package.json` but unused — prefer `react-hook-form` for new forms.
- `yup` is available for schema validation.

### Models

Class-based models in `src/models/` with static factory methods:

```js
class Scanner {
  static fromResponse(apiData) { /* maps API response to class instance */ }
  static fromArray(apiArray) { /* maps array of API responses */ }
}
```

Some models also have `static toCreatePayload(formData)` / `static toUpdatePayload(formData)` for outbound transforms.

## Key Conventions

### UI Components

- Built on **MUI v7** with a custom theme (`src/theme.js`): Inter/Roboto font, green-gradient buttons, blue AppBar, alternating table row backgrounds.
- Shared components live in `src/components/common/`: `DataTable`, `ConfirmDialog`, `StatusChip`, `GreenButton`, `CustomDrawer`, `TabsHeader`.
- **Custom `TableCell`** (`src/components/common/TableCell.jsx`) extends MUI's TableCell with a `variant="scan"` mode that renders an inline quantity input with RFID scanner integration.

### Scanner / RFID Integration

- REST APIs in `src/services/scannerService.jsx` manage readers and scan sessions (`/readers/*`, `/rfid/*`).
- Real-time scan events arrive over **WebSocket** (SockJS + STOMP) via `src/services/scannerSocketService.jsx`, subscribing to `/topic/rfid/session/{sessionId}`.
- `ScannerPicker` component (`src/components/Scanner/`) provides a dropdown to select a reader, start/stop sessions, and forward scanned items to the parent component.

### Date Handling

- All date work uses `date-fns` (not Moment/Day.js).
- Utilities in `src/utils/dateUtils.js`:
  - `formatCustomDate(date, options)` with presets: `DATE_ONLY`, `DATE_TIME`, `FULL_FORMAT`.
  - `formatDateForApi(date)` → `"YYYY-MM-DD"` for API calls.
  - `parseDate(dateString, timezone)` respects `DATE_PARSE_MODE` from `src/config.jsx` (default: `"UTC"`).

### ESLint

Flat config (`eslint.config.js`): `no-unused-vars` ignores names starting with uppercase or underscore. React Hooks and React Refresh plugins are active.

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `VITE_BASE_URL` | Backend API base URL | `http://localhost:5000/api` |

The WebSocket URL is derived by stripping `/api` from `VITE_BASE_URL` and appending `/ws`.
