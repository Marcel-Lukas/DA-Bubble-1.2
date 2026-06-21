import { NotificationService } from '../services/notification.service';
import { OnlinePipe } from './online.pipe';

describe('OnlinePipe', () => {
  let pipe: OnlinePipe;

  beforeEach(() => {
    pipe = new OnlinePipe();
  });

  it('creates an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('returns true for a recent heartbeat', () => {
    expect(pipe.transform({ uLastSeen: Date.now() })).toBe(true);
  });

  it('returns false for a stale heartbeat', () => {
    const old = Date.now() - (NotificationService.ONLINE_THRESHOLD_MS + 1000);
    expect(pipe.transform({ uLastSeen: old })).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(pipe.transform(null)).toBe(false);
    expect(pipe.transform(undefined)).toBe(false);
  });

  it('delegates to NotificationService.isUserOnline', () => {
    const spy = spyOn(NotificationService, 'isUserOnline').and.returnValue(true);
    const user = { uStatus: true };
    expect(pipe.transform(user)).toBe(true);
    expect(spy).toHaveBeenCalledWith(user);
  });
});
