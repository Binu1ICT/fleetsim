import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FleetMapComponent } from './fleet-map.component';

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

  it('should expose static map view models', () => {
    expect(component.mapZones.length).toBe(2);
    expect(component.mapTrucks().length).toBeGreaterThan(0);
    expect(component.haulRoadPolylinePoints.length).toBeGreaterThan(0);
  });

  it('should initialize with running state', () => {
    expect(component.running()).toBe(true); // sim starts automatically
  });

  it('should toggle simulation', () => {
    const initialState = component.running();
    component.toggleSimulation();
    expect(component.running()).toBe(!initialState);
  });

  it('should update hovered truck state', () => {
    const firstTruck = component.mapTrucks()[0];

    component.showTruckHover(firstTruck.id);
    expect(component.hoveredTruck()?.id).toBe(firstTruck.id);

    component.hideTruckHover(firstTruck.id);
    expect(component.hoveredTruck()).toBeUndefined();
  });
});
