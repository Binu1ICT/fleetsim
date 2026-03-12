# FleetSim

FleetSim is an Angular 21 fleet operations dashboard that simulates haul-truck movement between loading and dumping zones. It combines a live telemetry list, interactive Google map, draggable KPI tiles, and accessible operational controls into a single dispatch-style view.

## Highlights

- Live fleet simulation powered by RxJS and Angular signals
- Interactive Google Maps view with zone overlays, haul roads, truck labels, and telemetry hover cards
- Draggable summary dashboard tiles with keyboard reordering support
- Responsive layout for desktop, tablet, and mobile screens
- Angular Material UI elements for cards, buttons, and expandable legend content
- WCAG-focused improvements including skip links, live announcements, focus states, and color-plus-text status cues
- Unit tests for store and simulation behavior

## Tech Stack

- Angular 21 standalone components
- Angular Signals for reactive state consumption
- Angular CDK drag-and-drop
- Angular Material
- Google Maps JavaScript API
- RxJS
- Karma + Jasmine

## Application Features

### Fleet dashboard

- Fleet size, active units, average speed, and status-mix summary tiles
- Drag-and-drop tile reordering with persisted tile order
- Keyboard tile reordering using arrow keys, `Home`, and `End`

### Operations map

- Google Maps terrain view for the site layout
- Loading and dumping zone overlays
- Truck markers with status-specific styling
- Truck ID overlays and hover telemetry cards
- Haul-road visualization between operating zones

### Truck telemetry panel

- Live fleet list showing status, speed, and coordinates
- Text and color status indicators for accessibility
- Responsive card layout for smaller screens

### Accessibility

- Skip-to-content support
- Live region updates for tile reordering and simulation state
- Expand/collapse legend with keyboard support
- Reduced-motion friendly styling

## Project Structure

    src/
    ├── app/
    │   ├── app.component.*
    │   ├── core/
    │   │   ├── constants/
    │   │   │   ├── simulation.constants.ts
    │   │   │   └── truck-status.constants.ts
    │   │   ├── models/
    │   │   │   └── truck.model.ts
    │   │   ├── services/
    │   │   │   ├── simulation.service.ts
    │   │   │   └── simulation.service.spec.ts
    │   │   └── store/
    │   │       ├── fleet.store.ts
    │   │       └── fleet.store.spec.ts
    │   └── features/
    │       └── fleet-map/
    │           └── components/
    │               ├── fleet-map.component.ts
    │               ├── fleet-map.component.html
    │               ├── fleet-map.component.scss
    │               └── fleet-map.component.spec.ts
    ├── environments/
    │   ├── environment.ts
    │   └── environment.prod.ts
    └── styles.scss

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A Google Maps JavaScript API key

## Setup

1. Install dependencies:

    npm install

2. Configure Google Maps in [src/environments/environment.ts](src/environments/environment.ts) and [src/environments/environment.prod.ts](src/environments/environment.prod.ts):
    - `googleMapsApiKey`: your Google Maps JavaScript API key
    - `googleMapsMapId`: your Google Maps map ID for Advanced Markers

3. Start the development server:

    npm start

4. Open http://localhost:4200/

## Available Scripts

- `npm start` - start the development server
- `npm run start:prod` - start with production configuration
- `npm run build` - create a production build
- `npm run build:prod` - create a production build using the production configuration
- `npm test` - run tests in watch mode
- `npm run test:ci` - run tests once in Chrome Headless
- `npm run lint` - run linting
- `npm run format` - format source files with Prettier

## Simulation Overview

The simulation service manages route progression and status transitions for each truck.

Typical state flow:

`LOADING → HAULING → DUMPING → HAULING/IDLE → LOADING`

Key behaviors:

- Trucks are initialized with seeded positions and statuses
- Active trucks move along configured haul-road waypoints
- Trucks dwell in the dump zone before being routed back to load
- Fleet state updates are pushed through the signal-based store

## Testing

The project uses Karma and Jasmine.

Run the CI-friendly test suite:

    npm run test:ci

Current status: unit tests are passing locally.

## Notes

- The app uses `AdvancedMarkerElement` for Google Maps truck markers, so a valid `googleMapsMapId` should be supplied.
- If the map does not render, verify that the API key, map ID, and Google Maps API permissions are configured correctly.
