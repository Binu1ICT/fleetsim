# FleetSim

FleetSim is a frontend-only Angular 21 fleet operations dashboard that simulates haul-truck movement between a loading zone and a dump zone. The application combines live KPI tiles, a static site map, real-time truck telemetry, accessible controls, and responsive dashboard layouts in a single standalone Angular app.

## Current solution overview

- Angular 21 standalone application with no backend dependency
- Signal-based state management for fleet data and UI view models
- RxJS-driven simulation loop for truck movement and status transitions
- Static site map rendered with HTML, CSS, and SVG overlays
- Angular Material and CDK for dashboard UI and drag-and-drop interactions
- Performance-oriented rendering using `ChangeDetectionStrategy.OnPush`, computed signals, and tracked `@for` loops
- Keyboard-accessible tile reordering and live announcements for assistive technologies

## Key features

### Live fleet dashboard

- Summary tiles for fleet size, active units, average speed, and status mix
- Drag-and-drop tile reordering with persisted browser storage state
- Keyboard reordering with `Arrow` keys, `Home`, and `End`
- Start and pause controls for the simulation loop

### Static operations map

- Loading and dump zone overlays
- Haul-road path rendered as an SVG polyline
- Live truck markers with status-based styling
- Hover and focus telemetry overlays for each truck
- No external map provider or API key required

### Truck telemetry panel

- Live truck list with id, status, speed, and position
- Clear status presentation using text and color together
- Responsive layout for smaller viewport

### Accessibility and UX

- Polite live-region announcements for simulation state and tile movement
- Keyboard-friendly drag handles and reorder interactions
- Expandable truck status legend
- Responsive dashboard layout and reduced-motion-friendly interaction patterns

## Technical architecture

### State and simulation

- `FleetStore` manages the fleet and error state with Angular signals
- `SimulationService` seeds the fleet, runs the timed simulation, manages routes, and updates truck status
- `FleetMapComponent` orchestrates the dashboard UI, map display, accessibility messaging, and tile ordering

### Shared modules

- `src/app/constants` centralizes simulation and UI constants
- `src/app/interfaces` centralizes fleet map view-model contracts
- `fleet-map.utils.ts` contains pure transformation helpers for summaries, tile models, map models, and tile-order persistence

### Performance-oriented Angular patterns

- `ChangeDetectionStrategy.OnPush` in root and feature components
- computed signals for derived UI state such as `truckCount`, `fleetSummary`, and map view models
- tracked Angular `@for` loops for repeated UI blocks
- simulation timer scheduled outside Angular zone and re-entered only for state updates
- event coalescing enabled in `app.config.ts`

## Simulation behavior

The simulation starts automatically when the application loads.

Each truck:

1. starts with seeded position, speed, and status
2. receives a destination of either the loading zone or dump zone
3. follows configured haul-road waypoints
4. transitions through loading, hauling, dumping, and idle states
5. updates the signal store on every simulation tick

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
    │   │   │   └── simulation.service.ts
    │   │   └── store/
    │   │       ├── fleet.store.spec.ts
    │   │       └── fleet.store.ts
    │   ├── features/
    │   │   └── fleet-map/
    │   │       └── components/
    │   │           ├── fleet-map.component.html
    │   │           ├── fleet-map.component.scss
    │   │           ├── fleet-map.component.spec.ts
    │   │           ├── fleet-map.component.ts
    │   │           └── fleet-map.utils.ts
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

1. Install dependencies:

    npm install

2. Start the development server:

    npm start

3. Open the application:

    http://localhost:4200/

## Available scripts

- `npm start` - start the development server
- `npm run start:prod` - start the app with the production configuration
- `npm run build` - create a production build
- `npm run build:prod` - create a production build with the production configuration
- `npm test` - run tests in watch mode
- `npm run test:ci` - run tests once in Chrome Headless
- `npm run lint` - run linting
- `npm run format` - format source files with Prettier
- `npm run analyze` - generate bundle stats and open bundle analysis

## Testing

The project uses Karma and Jasmine for unit testing.

Run the headless test suite:

    npm run test:ci

Build the application:

    npm run build

## Notes

- This repository currently contains the Angular frontend only.
- Dashboard tile order is stored in browser local storage.
- Environment files currently expose only the production flag.
- The current map experience is fully static and does not require any third-party mapping service.
