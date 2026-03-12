import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { DashboardTileMove, DashboardTileViewModel } from '../../../../interfaces/fleet-map.interfaces';

@Component({
  selector: 'fleet-summary-tiles',
  standalone: true,
  imports: [CdkDropList, CdkDrag, CdkDragHandle, MatCardModule],
  templateUrl: './fleet-summary-tiles.component.html',
  styleUrl: './fleet-summary-tiles.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Renders the draggable summary KPI tiles at the top of the dashboard. */
export class FleetSummaryTilesComponent {
  /** Ordered summary tile view models. */
  readonly tiles = input.required<readonly DashboardTileViewModel[]>();
  /** Drag start delay tuned separately for touch and mouse input. */
  readonly tileDragStartDelay = input({ touch: 140, mouse: 0 });
  /** Emits tile reorder operations to the container. */
  readonly tileMoved = output<DashboardTileMove>();

  /** Emits the drag-and-drop tile move payload. */
  handleDrop(event: CdkDragDrop<readonly DashboardTileViewModel[]>): void {
    this.tileMoved.emit({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      title: this.tiles()[event.previousIndex]?.title
    });
  }

  /** Supports keyboard-based tile reordering for accessibility. */
  handleTileKeyboardReorder(event: KeyboardEvent, index: number, title: string): void {
    const tileCount = this.tiles().length;
    let nextIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(0, index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(tileCount - 1, index + 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tileCount - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.tileMoved.emit({ previousIndex: index, currentIndex: nextIndex, title });
  }
}
