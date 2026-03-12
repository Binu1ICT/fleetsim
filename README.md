# FleetSim

FleetSim is a frontend-only Angular 21 fleet operations dashboard that simulates haul-truck movement between a loading zone and a dump zone. The solution focuses on a clean standalone Angular architecture, responsive UX, accessible interactions, and a static operations map with live simulated telemetry.

## Solution overview

- Angular 21 standalone application
- Signal-based state management with computed view models
- RxJS-powered simulation loop for truck movement and status changes
- Static map rendering with HTML, CSS, and SVG overlays
- Angular Material and CDK for UI composition and draggable summary tiles
- Facade-driven feature orchestration for the fleet dashboard
- Browser-persisted theme, density, contrast, and reduced-motion preferences
- Accessible interactions including live announcements, keyboard tile reordering, and skip navigation

## Current feature set

### Dashboard shell

- Header banner with application title and theme toggle
- Responsive layout with a dedicated telemetry column and map workspace
- Summary footer and polished design-token-based styling

### Fleet summary

- KPI tiles for fleet size, active units, average speed, and status mix
- Drag-and-drop tile reordering
- Keyboard reordering support using Arrow keys, `Home`, and `End`
- Tile order persisted in browser storage

### Simulation controls

- Start and pause simulation control with state-based button styling
- Fleet size, tick interval, and dump dwell time tuning
- Reset scenario action
- Search by truck id
- Status filter chips for loading, hauling, dumping, and idle trucks

### Fleet workspace

- Telemetry list showing truck id, status, speed, and position
- Static operations map with loading and dump zone overlays
- SVG haul-road polyline between the two zones
- Live truck markers with hover and focus telemetry details
- Empty-state messaging when filters remove all visible trucks

### Accessibility and UX

- Skip link to jump directly to the main content
- Polite live-region announcements for simulation state and tile movement
- Keyboard-friendly drag handles and filter interactions
- Status presentation using both text and color
- Reduced-motion support through document-level preference tokens

## Architecture

### Core state and services

- `FleetStore` owns fleet telemetry and error state using Angular signals
- `SimulationService` seeds trucks, advances the simulation, and applies runtime settings
- `UiPreferencesService` persists and applies theme and accessibility preferences
- `SIMULATION_SETTINGS` provides injected default runtime settings

### Fleet feature

- `FleetDashboardFacade` composes dashboard state, filtering, hover state, and simulation actions
- `FleetMapComponent` acts as the feature container
- Presentational child components keep rendering responsibilities isolated:
  - `fleet-simulation-toolbar`
  - `fleet-summary-tiles`
  - `fleet-status-legend`
  - `fleet-telemetry-list`
  - `fleet-map-canvas`

### Shared definitions

- `src/app/constants` contains simulation, map, and status constants
- `src/app/interfaces` contains dashboard and map view-model contracts
- `fleet-map.utils.ts` contains pure transformation helpers for summary, filtering, map conversion, and persistence logic

## Technical practices used

- `ChangeDetectionStrategy.OnPush`
- signal inputs and outputs in standalone components
- computed state for filtered lists and derived dashboard metrics
- simulation work scheduled outside Angular zone and re-entered only for state updates
- event coalescing configured in [src/app/app.config.ts](src/app/app.config.ts)
- code comments added across the solution for maintainability and readability

## Simulation flow

The simulation starts automatically when the application loads.

Each truck:

1. is seeded with an id, position, speed, and status
2. gets an active destination of either `dump` or `load`
3. follows haul-road waypoints across the static map
4. transitions between loading, hauling, dumping, and idle states
5. updates the signal-backed fleet store on each simulation tick

Typical state flow:

`LOADING → HAULING → DUMPING → HAULING/IDLE → LOADING`

## Project structure

    src/
    ├── app/
    │   ├── app.component.html
    │   ├── app.component.scss
    │   ├── app.component.ts
    │   ├── app.config.ts
    │   ├── constants/
    │   │   ├── fleet-map.constants.ts
    │   │   ├── simulation.constants.ts
    │   │   └── truck-status.constants.ts
    │   ├── core/
    │   │   ├── models/
    │   │   │   └── truck.model.ts
    │   │   ├── services/
    │   │   │   ├── simulation.service.spec.ts
    │   │   │   ├── simulation.service.ts
    │   │   │   └── ui-preferences.service.ts
    │   │   ├── store/
    │   │   │   ├── fleet.store.spec.ts
    │   │   │   └── fleet.store.ts
    │   │   └── tokens/
    │   │       └── simulation-settings.token.ts
    │   ├── features/
    │   │   └── fleet-map/
    │   │       ├── components/
    │   │       │   ├── fleet-map-canvas/
    │   │       │   ├── fleet-status-legend/
    │   │       │   ├── fleet-summary-tiles/
    │   │       │   ├── fleet-telemetry-list/
    │   │       │   ├── simulation-toolbar/
    │   │       │   ├── fleet-map.component.html
    │   │       │   ├── fleet-map.component.scss
    │   │       │   ├── fleet-map.component.spec.ts
    │   │       │   ├── fleet-map.component.ts
    │   │       │   └── fleet-map.utils.ts
    │   │       └── facades/
    │   │           └── fleet-dashboard.facade.ts
    │   └── interfaces/
    │       └── fleet-map.interfaces.ts
    ├── environments/
    │   ├── environment.prod.ts
    │   └── environment.ts
    ├── index.html
    ├── main.ts
    └── styles.scss

## Prerequisites

- Node.js 20 or later
- npm 10 or later

## Getting started

1. Install dependencies

       npm install

2. Start the development server

       npm start

3. Open the app

       http://localhost:4200/

## Available scripts

- `npm start` - start the development server
- `npm run start:prod` - start the app using the production configuration
- `npm run build` - build the application
- `npm run build:prod` - build the application with the production configuration
- `npm test` - run tests in watch mode
- `npm run test:ci` - run headless tests with `ChromeHeadlessCI`
- `npm run lint` - run ESLint
- `npm run format` - format source files with Prettier
- `npm run analyze` - generate bundle stats and open bundle analysis

## Validation

The current solution is designed to be validated with:

    npm run lint
    npm run build
    npm run test:ci

## Notes

- This repository currently contains the Angular frontend only
- No backend or real-time server integration is implemented yet
- Dashboard tile order is stored in local storage
- UI preferences are stored in local storage
- The map is fully static and does not use Google Maps or any third-party map provider
