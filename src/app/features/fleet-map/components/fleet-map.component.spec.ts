import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FleetMapComponent } from './fleet-map.component';

/** Verifies the dashboard container and facade wiring for the fleet feature. */
describe('FleetMapComponent', () => {
  let component: FleetMapComponent;
  let fixture: ComponentFixture<FleetMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FleetMapComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FleetMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose facade-driven map view models', () => {
    expect(component.facade.mapZones.length).toBe(2);
    expect(component.facade.mapTrucks().length).toBeGreaterThan(0);
    expect(component.facade.haulRoadPolylinePoints.length).toBeGreaterThan(0);
  });

  it('should initialize with running state', () => {
    expect(component.facade.running()).toBe(true);
  });

  it('should toggle simulation', () => {
    const initialState = component.facade.running();
    component.facade.toggleSimulation();
    expect(component.facade.running()).toBe(!initialState);
  });

  it('should update hovered truck state', () => {
    const firstTruck = component.facade.mapTrucks()[0];

    component.facade.showTruckHover(firstTruck.id);
    expect(component.facade.hoveredTruck()?.id).toBe(firstTruck.id);

    component.facade.hideTruckHover(firstTruck.id);
    expect(component.facade.hoveredTruck()).toBeUndefined();
  });

  it('should filter trucks by search term', () => {
    const firstTruck = component.facade.trucks()[0];

    component.facade.setSearchTerm(firstTruck.id);

    expect(component.facade.visibleTrucks().length).toBe(1);
    expect(component.facade.visibleTrucks()[0].id).toBe(firstTruck.id);
  });
});
