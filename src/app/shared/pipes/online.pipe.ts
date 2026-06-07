import { Pipe, PipeTransform } from '@angular/core';
import { NotificationService } from '../services/notification.service';

/**
 * Returns true if the specified user is currently considered to be online.
 *
 * The assessment is based on the last sign of life (uLastSeen): A
 * user is considered online if their last heartbeat is more recent than the
 * presence threshold (NotificationService.ONLINE_THRESHOLD_MS). As a result,
 * even a browser tab that has been closed without logging out is recognised as
 * offline after a short time – in contrast to the uStatus flag alone.
 *
 * Use in the template:
 *   <span [ngClass]="(user | online) ? 'online' : 'offline'"></span>
 */
@Pipe({
  name: 'online',
  standalone: true,
  // Not `pure`, so that the time-based evaluation in Change Detection
  // is recalculated regularly (uLastSeen ages even without a data change).
  pure: false,
})
export class OnlinePipe implements PipeTransform {
  transform(
    user: { uStatus?: unknown; uLastSeen?: unknown } | null | undefined
  ): boolean {
    return NotificationService.isUserOnline(user);
  }
}
