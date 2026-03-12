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

  it('statusColor maps statuses to expected colors', () => {
    expect(component.statusColor('LOADING')).toBe('#f97316');
    expect(component.statusColor('HAULING')).toBe('#10b981');
    expect(component.statusColor('DUMPING')).toBe('#0ea5e9');
    expect(component.statusColor('IDLE')).toBe('#9ca3af');
  });

  it('should initialize with running state', () => {
    expect(component.running()).toBe(true); // sim starts automatically
  });

  it('should toggle simulation', () => {
    const initialState = component.running();
    component.toggleSimulation();
    expect(component.running()).toBe(!initialState);
  });
});
