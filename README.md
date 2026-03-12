# FleetSim

FleetSim is an Angular 21 fleet operations dashboard that simulates haul-truck movement between loading and dumping zones. It combines a live telemetry panel, a static site map with truck markers, draggable KPI tiles, and accessible simulation controls in a single dispatch-style view.

## Highlights

- Live fleet simulation powered by RxJS and Angular signals
- Static operations map with stockpile zones, haul-road overlay, truck labels, and hover telemetry cards
- Draggable summary tiles with keyboard reordering support
- Responsive dashboard layout for desktop, tablet, and mobile screens
- Angular Material UI for cards, buttons, and expandable legend content
- Accessibility-focused interactions including live announcements, keyboard drag support, and text-plus-color status cues
- Unit tests for simulation and store behavior

## Tech Stack

- Angular 21 standalone components
- Angular Signals
- Angular CDK drag-and-drop
- Angular Material
- RxJS
- TypeScript
- Karma + Jasmine

## Application Features

### Fleet dashboard

- Fleet size, active units, average speed, and status mix summary tiles
- Drag-and-drop tile reordering with persisted order
- Keyboard reordering using `Arrow` keys, `Home`, and `End`
- Live simulation start/pause controls with status announcements

### Operations map

- Static site map rendered in the UI without external map providers
- Loading and dumping zone overlays
- Haul-road polyline connecting operating areas
- Truck markers with status-based styling
- Hover and focus telemetry cards showing speed and coordinates

### Truck telemetry panel

- Live fleet list with truck ID, status, speed, and coordinates
- Clear status badges using both text and color
- Responsive card layout for narrower screens

### Accessibility

- Screen-reader announcements for simulation state and tile reordering
- Keyboard-accessible drag handles
- Expand/collapse legend support
- Reduced-motion friendly styling patterns

## How It Works

The app seeds an initial fleet, starts the simulation automatically, and updates truck movement on a timed interval. Trucks travel between configured loading and dump zones, follow predefined haul-road waypoints, pause during loading and dumping states, and then continue the cycle.

Typical state flow:

`LOADING → HAULING → DUMPING → HAULING/IDLE → LOADING`

Core responsibilities are split across:

- `SimulationService` for movement, route progression, dwell timing, and status transitions
- `FleetStore` for signal-based truck state management
- `FleetMapComponent` for dashboard presentation, tile reordering, map rendering, and telemetry display

## Project Structure

    src/
    ├── app/
    │   ├── app.component.*
    │   ├── app.config.ts
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
    ├── index.html
    ├── main.ts
    └── styles.scss

## Prerequisites

- Node.js 20 or later
- npm 10 or later

## Setup

1. Install dependencies:

    npm install

2. Start the development server:

    npm start

3. Open http://localhost:4200/

No API keys or third-party map configuration are required.

## Available Scripts

- `npm start` - start the development server
- `npm run start:prod` - start using the production configuration
- `npm run build` - create a production build
- `npm run build:prod` - create a production build with the production configuration
- `npm test` - run tests in watch mode
- `npm run test:ci` - run tests once in Chrome Headless
- `npm run lint` - run linting
- `npm run format` - format source files with Prettier
- `npm run analyze` - build with stats and open bundle analysis

## Testing

The project uses Karma and Jasmine for unit testing.

Run the CI-friendly test suite:

    npm run test:ci

## Notes

- The simulation starts automatically when the application loads.
- Dashboard tile order is persisted in browser storage.
- Environment files currently only expose the production flag and do not require additional runtime configuration.
