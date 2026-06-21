import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';

/**
 * Tests for the pure, static presence logic `isUserOnline`. This is the most
 * widely reused business rule (online/offline indicator across member list,
 * direct messages, message area, header) and does not require the full
 * Firebase-backed service instance.
 */
describe('NotificationService.isUserOnline', () => {
  it('returns false for null/undefined', () => {
    expect(NotificationService.isUserOnline(null)).toBe(false);
    expect(NotificationService.isUserOnline(undefined)).toBe(false);
  });

  it('treats a very recent heartbeat as online', () => {
    expect(NotificationService.isUserOnline({ uLastSeen: Date.now() })).toBe(true);
  });

  it('treats a heartbeat older than the threshold as offline', () => {
    const old = Date.now() - (NotificationService.ONLINE_THRESHOLD_MS + 1000);
    expect(NotificationService.isUserOnline({ uLastSeen: old })).toBe(false);
  });

  it('treats a heartbeat exactly at the threshold as offline', () => {
    const atThreshold = Date.now() - NotificationService.ONLINE_THRESHOLD_MS;
    expect(NotificationService.isUserOnline({ uLastSeen: atThreshold })).toBe(false);
  });

  describe('falls back to uStatus when no uLastSeen is present', () => {
    it('online for boolean true', () => {
      expect(NotificationService.isUserOnline({ uStatus: true })).toBe(true);
    });

    it('online for the string "true"', () => {
      expect(NotificationService.isUserOnline({ uStatus: 'true' })).toBe(true);
    });

    it('offline for false', () => {
      expect(NotificationService.isUserOnline({ uStatus: false })).toBe(false);
    });

    it('offline when neither uLastSeen nor uStatus is set', () => {
      expect(NotificationService.isUserOnline({})).toBe(false);
    });
  });

  it('prefers uLastSeen over uStatus when both are present', () => {
    const old = Date.now() - (NotificationService.ONLINE_THRESHOLD_MS + 1000);
    // Stale heartbeat must win over a stale uStatus=true flag.
    expect(NotificationService.isUserOnline({ uLastSeen: old, uStatus: true })).toBe(false);
  });
});

/**
 * Tests for the in-memory notification routing logic. These methods are pure
 * with respect to the service's own state (no Firestore reads/writes), so we
 * inject the service with a stub Firestore, set the relevant private fields
 * and stub the audio side effects.
 */
describe('NotificationService - notification routing', () => {
  let service: NotificationService;
  /** Loosely typed view to set private fields / call private methods. */
  let internals: {
    activeUserId: string | null;
    activeChatId: string | null;
    memberChannelIds: Set<string>;
    onlineStates: Map<string, boolean>;
    usersInitialized: boolean;
    handleNewMessage: (data: unknown) => void;
    resolveChatId: (data: unknown) => string | null;
    handleUserPresence: (uid: string, data: unknown) => void;
    persistLastSeen: () => void;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(NotificationService);
    internals = service as unknown as typeof internals;

    // Never touch the real Audio API in tests.
    spyOn(service as unknown as { playSound: () => void }, 'playSound');
    spyOn(
      service as unknown as { playOnlineSound: () => void },
      'playOnlineSound'
    );
    // setActiveChat() calls persistLastSeen() which writes to Firestore.
    spyOn(internals, 'persistLastSeen');

    internals.activeUserId = 'me';
    internals.activeChatId = null;
    internals.memberChannelIds = new Set<string>();
  });

  /** Reads the current set of unread chat ids. */
  function unread(): Promise<Set<string>> {
    return firstValueFrom(service.unread$);
  }

  describe('resolveChatId', () => {
    it('ignores thread replies', () => {
      expect(internals.resolveChatId({ mThreadId: 't1', mChannelId: 'c1' })).toBeNull();
    });

    it('returns the channel id for a message in a member channel', () => {
      internals.memberChannelIds = new Set(['c1']);
      expect(internals.resolveChatId({ mChannelId: 'c1' })).toBe('c1');
    });

    it('ignores channel messages for channels the user is not in', () => {
      internals.memberChannelIds = new Set(['c1']);
      expect(internals.resolveChatId({ mChannelId: 'other' })).toBeNull();
    });

    it('returns the sender id for a DM addressed to me', () => {
      expect(
        internals.resolveChatId({ mUserId: 'me', mSenderId: 'partner' })
      ).toBe('partner');
    });

    it('ignores a DM addressed to someone else', () => {
      expect(
        internals.resolveChatId({ mUserId: 'someone-else', mSenderId: 'partner' })
      ).toBeNull();
    });
  });

  describe('handleNewMessage', () => {
    it('ignores own messages', async () => {
      internals.handleNewMessage({ mSenderId: 'me', mChannelId: 'c1' });
      expect((await unread()).size).toBe(0);
      expect(
        (service as unknown as { playSound: jasmine.Spy }).playSound
      ).not.toHaveBeenCalled();
    });

    it('ignores messages without a sender', async () => {
      internals.handleNewMessage({ mChannelId: 'c1' });
      expect((await unread()).size).toBe(0);
    });

    it('marks a channel message as unread and plays a sound', async () => {
      internals.memberChannelIds = new Set(['c1']);
      internals.handleNewMessage({ mSenderId: 'partner', mChannelId: 'c1' });
      expect((await unread()).has('c1')).toBe(true);
      expect(
        (service as unknown as { playSound: jasmine.Spy }).playSound
      ).toHaveBeenCalled();
    });

    it('does not notify for the currently open chat', async () => {
      internals.memberChannelIds = new Set(['c1']);
      internals.activeChatId = 'c1';
      internals.handleNewMessage({ mSenderId: 'partner', mChannelId: 'c1' });
      expect((await unread()).size).toBe(0);
      expect(
        (service as unknown as { playSound: jasmine.Spy }).playSound
      ).not.toHaveBeenCalled();
    });

    it('marks a DM to me as unread under the sender id', async () => {
      internals.handleNewMessage({ mSenderId: 'partner', mUserId: 'me' });
      expect((await unread()).has('partner')).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('removes a chat from the unread set', async () => {
      internals.memberChannelIds = new Set(['c1']);
      internals.handleNewMessage({ mSenderId: 'partner', mChannelId: 'c1' });
      expect((await unread()).has('c1')).toBe(true);

      service.markAsRead('c1');
      expect((await unread()).has('c1')).toBe(false);
    });

    it('is a no-op for a chat that was not unread', async () => {
      service.markAsRead('unknown');
      expect((await unread()).size).toBe(0);
    });
  });

  describe('setActiveChat', () => {
    it('marks the now-active chat as read', async () => {
      internals.memberChannelIds = new Set(['c1']);
      internals.handleNewMessage({ mSenderId: 'partner', mChannelId: 'c1' });

      service.setActiveChat('channel', 'c1');
      expect((await unread()).has('c1')).toBe(false);
    });

    it('clears the active chat id for the "new" chat type', () => {
      service.setActiveChat('new', 'ignored');
      expect(internals.activeChatId).toBeNull();
    });
  });

  describe('handleUserPresence', () => {
    beforeEach(() => {
      internals.usersInitialized = true;
      internals.onlineStates = new Map<string, boolean>();
    });

    function onlineUser() {
      return { uLastSeen: Date.now() };
    }
    function offlineUser() {
      return {
        uLastSeen: Date.now() - (NotificationService.ONLINE_THRESHOLD_MS + 1000),
      };
    }

    it('plays the knock sound on an offline -> online transition', () => {
      internals.onlineStates.set('other', false);
      internals.handleUserPresence('other', onlineUser());
      expect(
        (service as unknown as { playOnlineSound: jasmine.Spy }).playOnlineSound
      ).toHaveBeenCalled();
    });

    it('does not replay the sound for an already-online user', () => {
      internals.onlineStates.set('other', true);
      internals.handleUserPresence('other', onlineUser());
      expect(
        (service as unknown as { playOnlineSound: jasmine.Spy }).playOnlineSound
      ).not.toHaveBeenCalled();
    });

    it('never plays a sound for the active user themselves', () => {
      internals.onlineStates.set('me', false);
      internals.handleUserPresence('me', onlineUser());
      expect(
        (service as unknown as { playOnlineSound: jasmine.Spy }).playOnlineSound
      ).not.toHaveBeenCalled();
    });

    it('stays silent before the first snapshot has initialized states', () => {
      internals.usersInitialized = false;
      internals.handleUserPresence('other', onlineUser());
      expect(
        (service as unknown as { playOnlineSound: jasmine.Spy }).playOnlineSound
      ).not.toHaveBeenCalled();
    });

    it('does not play a sound on an online -> offline transition', () => {
      internals.onlineStates.set('other', true);
      internals.handleUserPresence('other', offlineUser());
      expect(
        (service as unknown as { playOnlineSound: jasmine.Spy }).playOnlineSound
      ).not.toHaveBeenCalled();
    });
  });
});
