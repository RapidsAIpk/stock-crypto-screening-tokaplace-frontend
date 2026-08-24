# Mohsin Code README

Professional technical documentation for the `Frontend_Crypto_project` codebase.

## 1. Project Summary

This repository is a Vite + React + TypeScript frontend for a stock/crypto market screener. It provides:

- Firebase email/password authentication.
- Protected dashboard routes.
- A configurable stock/crypto screener UI.
- Single timeframe and gate/entry scanning workflows.
- Backend API integration for scan execution, scan cancellation, live scan progress, result detail lookup, settings sync, health checks, worker controls, and runtime screening controls.
- User presets and watchlist management through the backend settings API.
- Rich result tables, result exports, detailed explanation panels, and TradingView-style charts using `lightweight-charts`.

Important scope note: this repository does not include the backend server implementation, database migrations, or AI/RAG code. It is a frontend project that expects an external backend API. Backend endpoints, request/response payloads, and data models documented below are inferred from the frontend code and TypeScript interfaces.

## 2. Technology Stack

- Runtime/build: Node.js 20.x, npm >= 9, Vite 5.
- Language: TypeScript with React JSX.
- Frontend framework: React 18.
- Routing: `react-router-dom`.
- Server-state utilities: `@tanstack/react-query` is configured globally, although most current API calls use `fetch` directly.
- Authentication: Firebase Authentication.
- Database client initialized: Firebase Firestore via `getFirestore`, but the current frontend settings/watchlist flow uses backend `/auth/settings` endpoints rather than direct Firestore reads/writes.
- UI system: Tailwind CSS, shadcn-style component structure, Radix UI primitives, `class-variance-authority`, `clsx`, `tailwind-merge`.
- Icons: `lucide-react`.
- Charts: `lightweight-charts`, plus `recharts` in dependencies.
- Notifications: `sonner` and local toast components.
- Forms/validation libraries available: `react-hook-form`, `zod`, `@hookform/resolvers`.
- Testing: Vitest, jsdom, Testing Library, jest-dom.
- Linting/type checking: ESLint 9, TypeScript.
- Deployment config present: Railway `NIXPACKS`.

## 3. Complete Project Structure

```text
.
├── .claude/                         Local assistant/tooling metadata
├── .git/                            Git repository metadata
├── node_modules/                    Installed npm dependencies
├── public/
│   ├── favicon.ico                  Browser favicon
│   ├── placeholder.svg              Placeholder public asset
│   └── robots.txt                   Robots policy
├── src/
│   ├── App.css                      Legacy/global app CSS placeholder
│   ├── App.tsx                      App providers, routing, lazy pages
│   ├── index.css                    Tailwind imports, theme CSS variables, global styles
│   ├── main.tsx                     React root mounting
│   ├── vite-env.d.ts                Vite type declarations
│   ├── components/
│   │   ├── ErrorBoundary.tsx        Top-level React error fallback
│   │   ├── NavLink.tsx              Navigation helper component
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx   Auth gate for protected routes
│   │   ├── layout/
│   │   │   ├── AppClock.tsx         Header clock using saved timezone
│   │   │   └── AppHeader.tsx        Sticky app header/navigation/logout
│   │   ├── screener/
│   │   │   ├── ConnectionStatus.tsx Backend connectivity badge
│   │   │   ├── FilterSidebar.tsx    Main screener filter sidebar composition
│   │   │   ├── PresetBar.tsx        Save/load/delete filter presets
│   │   │   ├── ResultDetailChart.tsx TradingView-style detail chart
│   │   │   ├── ResultDetailPanel.tsx Result explanation/detail panel
│   │   │   ├── ResultsTable.tsx     Searchable/sortable/paged scan results table
│   │   │   ├── RunControls.tsx      Run Gate/Entry/Single/Stop buttons
│   │   │   ├── ScanProgressPanel.tsx Live scan progress display
│   │   │   ├── indicatorColors.ts   Indicator badge color mapping
│   │   │   ├── resultDetailChartData.ts Chart data normalization and derived series
│   │   │   ├── trendChannelChartStyles.ts Trend channel chart styling helpers
│   │   │   ├── dev/                 Developer copy/export buttons
│   │   │   └── filters/             Individual filter controls
│   │   └── ui/                      shadcn/Radix UI primitives
│   ├── config/
│   │   └── env.ts                   Runtime env parsing and validation
│   ├── contexts/
│   │   ├── AuthContext.tsx          Firebase auth provider/hook
│   │   └── ScreenerContext.tsx      Screener state provider/hook
│   ├── hooks/
│   │   ├── useDeferredNumberField.ts Number input helper
│   │   ├── use-mobile.tsx           Mobile breakpoint hook
│   │   ├── use-toast.ts             Toast helper
│   │   ├── useScanProgress.ts       WebSocket scan progress hook
│   │   ├── useScreener.ts           Main screener state/API/business logic
│   │   └── useUserSettings.ts       Backend-backed user settings/presets/watchlist hook
│   ├── lib/
│   │   ├── copyText.ts              Clipboard helper
│   │   ├── dates.ts                 Timezone/date formatting helpers
│   │   ├── firebase.ts              Firebase app/auth/firestore initialization
│   │   └── utils.ts                 `cn` class-name helper
│   ├── pages/
│   │   ├── AuthPage.tsx             Sign in/sign up/password reset screen
│   │   ├── Index.tsx                Main results workspace page
│   │   ├── NotFound.tsx             404 route
│   │   ├── SettingsPage.tsx         Control dashboard/settings page
│   │   └── WatchlistPage.tsx        Watchlist page
│   ├── test/                        Unit/component tests and setup
│   └── types/
│       └── screener.ts              Screener API/domain types, defaults, normalization helpers
├── .env                             Local Vite env values, contains secrets and should not be committed
├── .gitignore
├── .npmrc                           npm config
├── .nvmrc                           Node version hint
├── components.json                  shadcn component configuration
├── eslint.config.js                 ESLint flat config
├── frontend_full_code.docs          Existing generated/project documentation artifact
├── index.html                       Vite HTML entry
├── package-lock.json                Locked dependency tree
├── package.json                     npm scripts/dependencies/engines
├── postcss.config.js                PostCSS/Tailwind setup
├── railway.json                     Railway builder config
├── README.md                        Existing short frontend README
├── tailwind.config.ts               Tailwind theme/content/plugins
├── tsconfig*.json                   TypeScript configs
├── vite.config.ts                   Vite config
└── vitest.config.ts                 Vitest config
```

## 4. Application Architecture

### Frontend entry and providers

`src/main.tsx` mounts `<App />` into `#root`.

`src/App.tsx` composes the main provider tree:

1. `ErrorBoundary`
2. `QueryClientProvider`
3. `TooltipProvider`
4. Toast renderers
5. `AuthProvider`
6. `BrowserRouter`
7. Lazy-loaded routes

Protected routes are nested behind `ProtectedRoute`. After authentication, the protected app wraps pages with `ScreenerProvider` and displays `AppHeader`.

Routes:

- `/auth`: public auth page.
- `/`: protected main screener dashboard.
- `/watchlist`: protected watchlist page.
- `/settings`: protected control/settings dashboard.
- `*`: protected 404 fallback.

### State architecture

The frontend has two main state providers/hooks:

- `AuthContext`: owns Firebase auth state and auth actions.
- `ScreenerContext`: owns screener filters, scan state, results, progress, and backend scan actions through `useScreener`.

`useUserSettings` is used by dashboard, settings, watchlist, and `ScreenerProvider`. It loads and saves user settings through backend `/auth/settings`, keyed by the Firebase user UID.

### Backend architecture from frontend perspective

There is no backend code in this repo. The frontend expects:

- A root backend service for health/connectivity.
- A screener route namespace, usually `/screen`, for screening APIs.
- An auth/settings namespace at backend root `/auth/settings`.
- Operational routes under `/screen/ops/...`.
- A WebSocket route under `/screen/ws/progress`.

The default development screener API base is `http://localhost:8000/screen`.

## 5. Important Files and Purposes

- `src/config/env.ts`: validates required Vite env vars, builds `appEnv`, strips trailing slashes from API base, defaults dev API base to `http://localhost:8000/screen`, and parses `VITE_SHOW_TECHNICAL_DETAILS`.
- `src/lib/firebase.ts`: initializes Firebase app, exports `auth` and `db`.
- `src/contexts/AuthContext.tsx`: wraps Firebase auth functions: sign in, sign up, sign out, password reset, and auth-state subscription.
- `src/components/auth/ProtectedRoute.tsx`: redirects unauthenticated users to `/auth`, shows spinner while auth state is loading.
- `src/pages/AuthPage.tsx`: handles sign in, sign up with invite key, password reset, and backend account registration rollback if invite registration fails.
- `src/hooks/useUserSettings.ts`: loads/saves user settings, presets, and watchlist entries via backend.
- `src/hooks/useScreener.ts`: core business logic for filter state, request building, API calls, retry/timeout/cancel behavior, gate-entry scan orchestration, details fetch, and bulk detail export.
- `src/hooks/useScanProgress.ts`: creates scan IDs, opens progress WebSocket, consumes progress events, and exposes progress state.
- `src/types/screener.ts`: central domain schema for filters, indicators, requests, responses, result details, constants, default configs, and normalization helpers.
- `src/pages/Index.tsx`: main dashboard composition: sidebar filters, connection status, preset bar, run controls, results table.
- `src/pages/SettingsPage.tsx`: backend health/readiness, worker controls, API override/timeout/retry settings, screening max symbols, indicator defaults, account actions.
- `src/pages/WatchlistPage.tsx`: user watchlist management backed by saved settings.
- `src/components/screener/ResultsTable.tsx`: result presentation, searching, sorting, paging, category and price filters, watchlist toggles, compare list, Excel-like export, and detail panel opening.
- `src/components/screener/ResultDetailPanel.tsx`: human-readable result explanation with optional raw developer JSON sections.
- `src/components/screener/ResultDetailChart.tsx`: interactive OHLC/chart panel with channel/confluence/LinReg/ADX visualization.
- `src/components/screener/resultDetailChartData.ts`: normalizes backend market/channel payloads and computes chart-ready derived data.

## 6. Environment Variables

Defined and validated in `src/config/env.ts`.

Required:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Required in production, optional in development:

```env
VITE_API_BASE=
```

If omitted in development, `VITE_API_BASE` defaults to:

```text
http://localhost:8000/screen
```

Optional:

```env
VITE_FIREBASE_MEASUREMENT_ID=
VITE_SHOW_TECHNICAL_DETAILS=false
```

`VITE_SHOW_TECHNICAL_DETAILS` accepts truthy values `1`, `true`, `yes`, or `on`. When enabled, the UI shows developer-only copy/export controls and raw JSON/provider details.

The local `.env` currently contains the expected variable names. Do not expose real Firebase/API values in documentation or commits.

## 7. Authentication and Authorization Flow

Authentication is handled by Firebase Authentication in `AuthContext`.

Supported auth actions:

- `signIn(email, password)` calls `signInWithEmailAndPassword`.
- `signUp(email, password)` calls `createUserWithEmailAndPassword`.
- `logout()` calls `signOut`.
- `resetPassword(email)` calls `sendPasswordResetEmail`.
- `onAuthStateChanged` keeps `user` and `loading` synchronized.

Signup has an extra backend authorization step:

1. User submits email, password, and invite key in `AuthPage`.
2. Firebase account is created.
3. Frontend calls `POST {apiRoot}/auth/register-account` with:

```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "invite_key": "provided-key"
}
```

4. If backend registration fails, the frontend attempts to delete the newly-created Firebase user to avoid a dangling account.
5. On success, Firebase auth state redirects the user to `/`.

Protected app routes require a Firebase user. There is no role/permission model implemented in this frontend beyond authentication and backend invite/account validation.

## 8. Backend API Endpoints Used

`appEnv.apiBase` normally points at the screener namespace, for example:

```text
http://localhost:8000/screen
```

Some auth/health endpoints strip `/screen` to reach the backend root.

### Connectivity and health

- `GET {apiRoot}/`
  - Used by `ConnectionStatus`.
  - Expects any successful HTTP response to mark backend as connected.

- `GET {apiRoot}/healthz`
  - Used by Settings health card.
  - Expected shape includes `status`, `environment`, and optional `worker`.

- `GET {apiRoot}/readyz`
  - Used by Settings readiness card.
  - Expected shape includes `status` and optional `worker.running`.

### Auth/settings

- `POST {apiRoot}/auth/register-account`
  - Registers a Firebase-created account using an invite key.
  - Called only during signup.

- `GET {apiRoot}/auth/settings`
  - Header: `X-User-Id: <firebase uid>`.
  - Loads saved user settings.
  - Expected response: `{ "data": { ...UserSettings } }`.

- `POST {apiRoot}/auth/settings`
  - Header: `Content-Type: application/json`, `X-User-Id`.
  - Body: `{ "data": partialSettings }`.
  - Saves settings, presets, watchlist, disabled indicators, and default overrides.

### Screener options

- `GET {apiBase}/crypto-exchanges`
  - Loads available crypto exchange options.
  - Expected response:

```ts
{
  exchanges: Array<{ exchange: string; coin_count: number }>
}
```

- `GET {apiBase}/stock-filter-options`
  - Loads stock asset categories and sectors.
  - Expected response:

```ts
{
  asset_categories: Array<{ id: string; label: string }>;
  sectors: string[];
}
```

If this endpoint fails or returns no options, the frontend uses local defaults from `src/types/screener.ts`.

### Scan execution

All scan execution calls are `POST` with `Content-Type: application/json`.

- `POST {apiBase}/run`
  - Runs a single-timeframe scan.
  - Body: `ScreenerRequest` with `timeframe_mode: "single"`.
  - Expected response: `{ results?: ScreenerResult[] }`.

- `POST {apiBase}/run-gate`
  - Runs the gate stage of gate/entry workflow.
  - Body: `ScreenerRequest` with `timeframe_mode: "gate_entry"` and only primary/gate indicators.
  - Expected response: `{ results?: ScreenerResult[]; gate_session_id?: string | null }`.

- `POST {apiBase}/run-entry`
  - Runs entry stage after gate completes.
  - Body: `ScreenerRequest` with `gate_session_id` and only secondary/entry indicators.
  - Expected response: `{ results?: ScreenerResult[] }`.

- `POST {apiBase}/details`
  - Fetches detailed explanation and chart data for a selected result.
  - Body: `ScreenerDetailRequest`.
  - Expected response: `{ detail: ScreenerResultDetail | null }`.

- `POST {apiBase}/cancel`
  - Best-effort backend cancellation for an active scan.
  - Body:

```json
{ "scan_id": "uuid" }
```

Scan requests include `X-Scan-Id` when a scan ID is active. This scan ID is also used by the progress WebSocket.

### Live progress

- `WebSocket {apiBase}/ws/progress?scan_id=<uuid>`
  - Created by `useScanProgress`.
  - Converts `http` to `ws` and `https` to `wss`.
  - Expected messages match `ScanProgressEvent`:

```ts
{
  type?: string;
  scan_id?: string;
  timestamp?: number;
  stage?: string;
  message?: string;
  symbol?: string | null;
  current?: number | null;
  total?: number | null;
  detail?: string | null;
}
```

### Operations/settings dashboard

- `GET {apiBase}/ops/worker`
  - Reads worker status.

- `POST {apiBase}/ops/worker/start`
  - Starts backend worker.

- `POST {apiBase}/ops/worker/stop`
  - Stops backend worker.

- `POST {apiBase}/ops/worker/refresh`
  - Triggers backend worker refresh.

- `POST {apiBase}/ops/worker/config`
  - Body:

```json
{
  "poll_interval": 15,
  "batch_size": 50
}
```

- `GET {apiBase}/ops/runtime-settings`
  - Reads live backend runtime settings.

- `POST {apiBase}/ops/screening/config`
  - Body:

```json
{
  "screening_max_symbols": 75
}
```

  - `0` disables the cap and requests entire-universe mode.

## 9. Core Data Models

All important domain interfaces live in `src/types/screener.ts`.

### ScreenerRequest

The main backend scan payload:

```ts
interface ScreenerRequest {
  asset_type: "stocks" | "crypto";
  stock_sources: string[] | null;
  compliance_status: "compliant" | "non-compliant" | "questionable" | null;
  compliance_standards: string[] | null;
  asset_categories: string[] | null;
  sectors: string[] | null;
  exchanges: string[] | null;
  excluded_categories: string[] | null;
  timeframe_mode: "single" | "gate_entry";
  single_timeframe: string | null;
  gate_timeframe: string | null;
  entry_timeframe: string | null;
  gate_session_id?: string | null;
  indicators: IndicatorConfig[];
  channel_respect: ChannelRespect | null;
  confluence: Confluence | null;
  price_range: PriceRange | null;
  dead_assets: DeadAssetsFilter | null;
}
```

### ScreenerResult

Each scan table row:

```ts
interface ScreenerResult {
  symbol: string;
  price: number;
  asset_type: "stocks" | "crypto";
  data_source: string;
  scan_stage?: "single" | "gate" | "entry" | null;
  name?: string | null;
  category?: string | null;
  sector?: string | null;
  asset_categories?: string[] | null;
  cmc_id?: number | null;
  rank?: number | null;
  compliance_status?: string | null;
  compliance_standard?: string | null;
  report_date?: string | null;
  purification_ratio?: number | null;
  candles_count?: number | null;
  last_candle_time?: number | null;
  exchange?: string | null;
  exchange_availability?: string[] | null;
  timeframe: string;
  note?: string | null;
  stickers: string[];
  matched_indicators?: string[] | null;
}
```

### ScreenerResultDetail

Detailed result payload extends `ScreenerResult`:

```ts
interface ScreenerResultDetail extends ScreenerResult {
  asset_metadata: Record<string, unknown>;
  request_filters: Record<string, unknown>;
  indicator_details: IndicatorDetail[];
  filter_details: FilterDetail[];
  market_data: MarketDataDetail;
  channels: Record<string, unknown>;
  confluence_channels: Record<string, unknown>;
}
```

### UserSettings

Defined in `src/hooks/useUserSettings.ts`:

```ts
interface UserSettings {
  apiKey: string;
  apiBaseOverride: string;
  apiTimeoutMs: number;
  apiRetries: number;
  workerPollInterval: number;
  workerBatchSize: number;
  screeningMaxSymbols: number;
  timezone: string;
  indicatorDefaults: Record<string, Record<string, unknown>>;
  presets: FilterPreset[];
  watchlist: WatchlistEntry[];
  disabledIndicators: string[];
  postFilterDefaults: PostFilterDefaults;
}
```

Default settings:

- `apiTimeoutMs`: `600000`.
- `apiRetries`: `0`.
- `workerPollInterval`: `15`.
- `workerBatchSize`: `50`.
- `screeningMaxSymbols`: `75`.
- `timezone`: `UTC`.

## 10. Database Structure

No database schema, migrations, or backend persistence code exist in this repository.

Observed frontend persistence behavior:

- Firebase Authentication stores auth users externally in Firebase.
- Firestore is initialized in `src/lib/firebase.ts`, but current app code does not directly read/write Firestore.
- User settings, presets, watchlist entries, disabled indicators, and indicator defaults are persisted through backend `/auth/settings` endpoints using the Firebase UID in the `X-User-Id` header.

Any actual database collections/tables/models are backend responsibilities and must be verified in the backend repository.

## 11. Core Business Logic

### Filter state and request building

`useScreener` owns the full filter state:

- Asset type: stocks or crypto.
- Stock filters: Zoya source, compliance status, AAOIFI standard, asset categories, sectors.
- Crypto filters: exchanges and excluded ethical categories.
- Price range.
- Dead assets filter.
- Timeframe mode: single or gate/entry.
- Indicator list.
- Channel Respect post-filter.
- Confluence post-filter.

`buildRequestSnapshot()` converts frontend state into `ScreenerRequest`:

- Stocks set `stock_sources: ["zoya"]`.
- Crypto sets `exchanges` to selected exchanges or `null` when all/none are selected.
- Stocks force `compliance_standards: ["AAOIFI"]`.
- Gate/entry mode sends gate and entry timeframes and splits indicators by timeframe scope.
- Confluence is sent only if normalized and configured with at least two sources.
- Dead assets and indicators are normalized before sending.

### Single scan

`runSingle()`:

1. Prevents concurrent scans with `isBusyRef`.
2. Starts progress WebSocket and gets scan ID.
3. Builds request with `timeframe_mode: "single"`.
4. Calls `POST /run`.
5. Stores results and result context.
6. Shows completion or error message.

### Gate/entry scan

The gate/entry workflow is designed for higher-timeframe confirmation followed by lower-timeframe entry:

- `runGate()` sends only `primary` indicators to `/run-gate`.
- `runEntry()` requires `gateCompleted` and `gateSessionId`, then sends only `secondary` indicators to `/run-entry`.
- `runGateEntry()` runs gate then entry in one flow.
- `gate_session_id` links entry scans to the previous gate result set.

Safety rules:

- Gate timeframe must be larger than entry timeframe.
- If a user swaps them accidentally, `normalizeGateEntryPair` keeps the larger timeframe as gate.
- Old presets with `single` indicator scope are migrated to `secondary` in gate/entry mode.
- Any leftover `single`-scoped indicator in gate/entry request throws a clear error.
- Responses are discarded if filters changed while a request was in flight.

### Runtime API controls

`runtimeApiBase()` reads `localStorage.screener.apiBaseOverride` before falling back to `appEnv.apiBase`.

`runtimeTimeoutMs()` reads account settings first, then localStorage, then default. It clamps timeout between 1 second and 600 seconds in `useScreener`.

`runtimeRetries()` reads account settings first, then localStorage, then defaults to `2` for scan requests when no valid value is available in `useScreener`.

Settings page persists controls both to backend settings and localStorage for immediate same-browser runtime use.

### Cancellation

`cancelScan()`:

1. Marks cancellation as user-triggered.
2. Aborts the active `fetch` through `AbortController`.
3. Ends progress socket.
4. Clears loading state.
5. Sends best-effort `POST /cancel` with active scan ID.

Timeout aborts and user aborts are separated using `cancelledRef`, so user cancellation does not retry or show as timeout.

### Result detail and export

`fetchResultDetail(result)` builds a `ScreenerDetailRequest` using the last scan context, calls `/details`, and returns `detail`.

`exportAllResultsDetails()` loads detail payloads in chunks of 4 concurrent requests and returns a `ScreenerResultsBulkExport` containing:

- Export timestamp.
- Scan context.
- Result count.
- Loaded count.
- Failed count.
- Per-result summary/detail/error records.

Developer export buttons are shown only when `VITE_SHOW_TECHNICAL_DETAILS=true`.

## 12. Indicators, Filters, and Domain Rules

Supported indicator names:

- `rsi`
- `wavetrend`
- `aroon`
- `adx`
- `vlr`
- `lrc`
- `regression`
- `trend`
- `linreg_candles`
- `ema`
- `macd`
- `volume`
- `relative_volume`
- `current_volume`
- `float`
- `shares_outstanding`
- `volatility`

Key domain helpers in `src/types/screener.ts`:

- `normalizeIndicatorConfig`
- `getDefaultIndicatorConfig`
- `getAllDefaultIndicatorConfigs`
- `normalizeConfluenceConfig`
- `sanitizeConfluenceUiConfig`
- `normalizeDeadAssetsFilter`
- `describeChannelRespectCandleWindow`
- `resolveChannelRespectChannelLength`
- `getAllowedConfluenceSelections`
- confirmation pattern/type normalization helpers

Default timeframes:

```ts
["1m", "5m", "15m", "30m", "1h", "4h", "1day"]
```

Default crypto excluded categories:

- Memecoins: `meme`
- Gambling: `gambling`
- Interest: `interest`
- Adult: `adult`
- Scam: `scam`

Default stock asset categories include NASDAQ, NYSE, AMEX, ETF, S&P 500, Dow Jones, and Russell 2000.

## 13. Frontend Communication and Data Flow

### Login/signup flow

```text
AuthPage
  -> Firebase Auth
  -> AuthContext user state
  -> ProtectedRoute allows app
  -> ScreenerProvider loads user settings
```

Signup additionally calls backend account registration with invite key.

### Main scan flow

```text
User changes filters in FilterSidebar
  -> useScreener state setters normalize state and reset gate/entry session
  -> RunControls calls runSingle/runGate/runEntry
  -> useScanProgress opens WebSocket with scan_id
  -> useScreener builds ScreenerRequest
  -> fetch POST to backend
  -> backend returns results
  -> ResultsTable renders rows
  -> user clicks row
  -> fetchResultDetail POST /details
  -> ResultDetailPanel + ResultDetailChart render explanation and chart data
```

### Settings flow

```text
SettingsPage
  -> useUserSettings GET /auth/settings with X-User-Id
  -> user edits controls
  -> saveSettings POST /auth/settings
  -> localStorage runtime keys updated
  -> optional ops endpoints update worker/screening config
```

### Progress flow

```text
beginScan()
  -> generate UUID scan_id
  -> open ws(s)://.../screen/ws/progress?scan_id=<id>
  -> include X-Scan-Id in scan POST
  -> backend streams progress messages
  -> ScanProgressPanel displays current stage/symbol/progress/log
```

## 14. Error Handling

Top-level:

- `ErrorBoundary` catches React render errors and prevents full blank screen.

Auth:

- `AuthPage` maps common Firebase auth error codes to user-friendly messages.
- Signup rollback deletes newly-created Firebase users if backend invite/account registration fails.

API:

- `callAPI` parses backend error JSON and prefers `detail` or first validation `detail[0].msg`.
- HTTP failures throw `HttpStatusError`.
- Network failures and timeout aborts are retried according to runtime retry settings.
- Timeout messages tell the user to increase timeout in Settings > API Control.
- User cancellation throws `AbortedByUserError` and suppresses scan failure messaging.
- Option-loading failures for exchange/stock filters log to console and keep local defaults.
- Settings save failures show toast errors.
- Worker/runtime/health errors show toasts or health error text.

Race condition protections:

- `isBusyRef` prevents double-click concurrent scans.
- `filterGenerationRef` discards stale scan responses if filters changed mid-flight.
- Detail panel uses `detailRequestId` so old detail requests cannot overwrite newer selections.

## 15. Charting Implementation

`ResultDetailChart` uses `lightweight-charts` to render:

- Standard completed OHLC candles.
- Volume histogram.
- Optional ADX pane for Trendy ADX.
- LRC channel.
- Regression Channel [DW].
- Trend Channel.
- Channel Confluence source lines/zones.
- LinReg Candles with signal line.
- Highlighted candles for confluence/channel-respect evidence.

`resultDetailChartData.ts` normalizes:

- Market candle payloads with aliases like `t`, `timestamp`, `o`, `h`, `l`, `c`, `v`.
- Millisecond timestamps to seconds.
- Duplicate candle times by latest normalized row in the map.
- Regression/LRC/trend channel series into trailing aligned arrays.
- Confluence chart sources from backend channel payloads and request filters.
- LinReg candles using rolling linear regression and SMA/EMA signal calculations.

The chart shows completed candles only and explicitly skips forming bars where `is_closed === false`.

## 16. RAG/AI Pipeline Details

No RAG, LLM, embedding, vector database, prompt, or AI pipeline implementation exists in this frontend repository.

The app may consume backend-generated explanations/evidence through `/details` fields such as `plain_language`, `summary`, `indicator_details`, and `filter_details`, but generation logic is not present here.

## 17. Configuration Files

- `vite.config.ts`
  - React SWC plugin.
  - Dev server host `::`, port `8080`, strict port enabled.
  - Preview host `::`, port `4173`.
  - HMR overlay disabled.
  - `@` alias maps to `./src`.
  - Builds target `es2020`.
  - Source maps enabled outside production.
  - Uses `lovable-tagger` in development.

- `vitest.config.ts`
  - React SWC plugin.
  - jsdom environment.
  - globals enabled.
  - setup file: `src/test/setup.ts`.
  - includes `src/**/*.{test,spec}.{ts,tsx}`.

- `tailwind.config.ts`
  - Dark mode via class.
  - Scans `src/**/*.{ts,tsx}` and other standard app paths.
  - Extends CSS-variable color tokens.
  - Adds accordion and pulse animations.
  - Uses `tailwindcss-animate`.

- `components.json`
  - shadcn-style config.
  - aliases components/hooks/lib/ui to `@/...`.

- `eslint.config.js`
  - TypeScript ESLint recommended config.
  - React hooks and React refresh plugins.
  - Ignores `dist`.
  - Disables TypeScript unused variable rules.

- `railway.json`
  - Railway build uses `NIXPACKS`.

## 18. Installation and Local Setup

Requirements:

- Node.js 20.x preferred, according to `package.json`.
- npm >= 9.
- A configured Firebase project with email/password auth.
- A running backend API compatible with the endpoints above.

Install dependencies:

```bash
npm install
```

Create/update `.env` in the project root:

```env
VITE_API_BASE=http://localhost:8000/screen
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_SHOW_TECHNICAL_DETAILS=false
```

Start development server:

```bash
npm run dev
```

Vite is configured to run on:

```text
http://localhost:8080
```

The frontend expects the backend by default at:

```text
http://localhost:8000/screen
```

## 19. Important Commands

```bash
npm run dev
```

Starts Vite dev server.

```bash
npm run typecheck
```

Runs TypeScript check with `tsc --noEmit -p tsconfig.app.json`.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run test
```

Runs Vitest once.

```bash
npm run test:watch
```

Runs Vitest in watch mode.

```bash
npm run check
```

Runs typecheck, lint, and tests.

```bash
npm run build
```

Runs typecheck and production Vite build.

```bash
npm run build:dev
```

Runs Vite build in development mode.

```bash
npm run preview
```

Previews built app locally using Vite preview on port `4173`.

```bash
npm start
```

Serves `dist` using `serve -s dist -l $PORT`. This is intended for deployment environments that provide `PORT`.

## 20. Testing

Test framework: Vitest with jsdom and Testing Library.

Run all tests:

```bash
npm run test
```

Run full quality gate:

```bash
npm run check
```

Existing tests cover:

- Confluence config normalization and UI constraints.
- Dead assets normalization and preservation through `useScreener`.
- Gate/entry indicator scope migration and request splitting.
- Indicator default configs and request serialization.
- Volume Spike helper UI behavior.
- Tolerance preservation.
- Results table category filter behavior.
- Result detail chart data normalization, channel alignment, confluence highlights, LinReg candle calculations.
- Trend channel chart style alignment.

Test files live in:

- `src/test/*.test.ts`
- `src/test/*.test.tsx`
- `src/components/screener/*.test.ts`
- `src/components/screener/*.test.tsx`

## 21. Deployment

Build production assets:

```bash
npm run build
```

Build output:

```text
dist/
```

Preview locally:

```bash
npm run preview
```

Serve built assets:

```bash
npm start
```

Deployment environment must provide:

- All required Firebase `VITE_*` variables at build time.
- `VITE_API_BASE` in production.
- `PORT` if using `npm start`.

Railway:

- `railway.json` configures `NIXPACKS`.
- `package.json` has `engines.node: 20.x`.
- Production start command is available as `npm start`, serving `dist`.

## 22. Implementation Decisions and Maintenance Notes

- The frontend treats the backend screener API base as mutable at runtime through Settings and localStorage.
- Saved account settings take priority over localStorage for timeout/retry values in `ScreenerProvider`.
- Gate/entry state is reset whenever filters change, preventing entry scans from using stale gate sessions.
- Filter changes during an in-flight scan invalidate that response using `filterGenerationRef`.
- Scan cancellation is both local and backend-aware: local abort for immediate UI response, best-effort `/cancel` for server cleanup.
- Technical JSON and bulk detail export features are hidden unless `VITE_SHOW_TECHNICAL_DETAILS=true`.
- Firestore is initialized but not actively used by the current frontend business logic.
- `@tanstack/react-query` is configured but current app data fetching is mostly direct `fetch`.
- TypeScript strictness is relaxed in `tsconfig.app.json`; maintainers should not assume strict-null or no-implicit-any enforcement.
- The current `.nvmrc` contains `2`, while `package.json` requires Node `20.x`; maintainers should prefer `package.json` as the accurate runtime requirement and consider fixing `.nvmrc`.
- `vite.config.ts.timestamp-...mjs` appears to be a generated timestamp artifact and is not part of the normal source architecture.

## 23. Known External Dependencies

This frontend depends on external services that must be available/configured:

- Firebase Authentication for login/signup/password reset.
- Backend API compatible with the documented endpoints.
- Backend persistence for `/auth/settings`.
- Backend market data and screener implementation.
- Optional backend worker/ops endpoints for Settings dashboard.
- Google Fonts loaded by `src/index.css`.

## 24. Quick Developer Onboarding Checklist

1. Install Node 20 and npm 9+.
2. Run `npm install`.
3. Configure `.env` with Firebase and `VITE_API_BASE`.
4. Start compatible backend at `VITE_API_BASE`.
5. Run `npm run dev`.
6. Sign up with a valid backend invite key or sign in with an existing Firebase user.
7. Run `npm run check` before shipping changes.
8. Use `VITE_SHOW_TECHNICAL_DETAILS=true` when debugging request payloads, backend evidence, or exports.

