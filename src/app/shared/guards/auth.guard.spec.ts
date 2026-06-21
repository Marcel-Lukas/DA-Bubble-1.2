import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AuthentificationService } from '../services/authentification.service';
import { authGuard, publicOnlyGuard } from './auth.guard';

/**
 * `authState(auth)` from @angular/fire subscribes to the Auth object via
 * `onAuthStateChanged`. We provide a fake Auth that immediately emits the
 * configured user (or null) so the guards can be exercised without Firebase.
 */
function createFakeAuth(user: { uid: string } | null): Partial<Auth> {
  return {
    onAuthStateChanged: ((next: (u: unknown) => void) => {
      next(user);
      return () => {};
    }) as unknown as Auth['onAuthStateChanged'],
  };
}

describe('authGuard', () => {
  let authService: { currentUid: string | null };
  let router: jasmine.SpyObj<Router>;
  let fakeTree: UrlTree;

  function configure(user: { uid: string } | null): void {
    authService = { currentUid: null };
    fakeTree = {} as UrlTree;
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    router.parseUrl.and.returnValue(fakeTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: createFakeAuth(user) },
        { provide: AuthentificationService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  }

  function run(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      (authGuard as () => Promise<boolean | UrlTree>)()
    );
  }

  it('allows access for a signed-in user', async () => {
    configure({ uid: 'abc' });
    await expectAsync(run()).toBeResolvedTo(true);
  });

  it('rehydrates currentUid from the restored session', async () => {
    configure({ uid: 'abc' });
    await run();
    expect(authService.currentUid).toBe('abc');
  });

  it('does not overwrite an existing currentUid', async () => {
    configure({ uid: 'abc' });
    authService.currentUid = 'existing';
    await run();
    expect(authService.currentUid).toBe('existing');
  });

  it('redirects to / when no user is signed in', async () => {
    configure(null);
    const result = await run();
    expect(router.parseUrl).toHaveBeenCalledWith('/');
    expect(result).toBe(fakeTree);
  });
});

describe('publicOnlyGuard', () => {
  let router: jasmine.SpyObj<Router>;
  let fakeTree: UrlTree;

  function configure(user: { uid: string } | null): void {
    fakeTree = {} as UrlTree;
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);
    router.parseUrl.and.returnValue(fakeTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: createFakeAuth(user) },
        { provide: Router, useValue: router },
      ],
    });
  }

  function run(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() =>
      (publicOnlyGuard as () => Promise<boolean | UrlTree>)()
    );
  }

  it('lets visitors without a session see the access screen', async () => {
    configure(null);
    await expectAsync(run()).toBeResolvedTo(true);
  });

  it('bounces a signed-in user to their home route', async () => {
    configure({ uid: 'abc' });
    const result = await run();
    expect(router.parseUrl).toHaveBeenCalledWith('/home/abc');
    expect(result).toBe(fakeTree);
  });
});
