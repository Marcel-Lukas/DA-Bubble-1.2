import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthentificationService } from '../services/authentification.service';
import {
  CanComponentDeactivate,
  canDeactivateGuard,
} from './can-deactivate.guard';

describe('canDeactivateGuard', () => {
  let authStub: { isLoggingOut: boolean };

  /** Runs the functional guard inside an injection context. */
  function run(component: CanComponentDeactivate): boolean | Promise<boolean> {
    return TestBed.runInInjectionContext(() =>
      canDeactivateGuard(
        component,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot
      )
    );
  }

  beforeEach(() => {
    authStub = { isLoggingOut: false };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthentificationService, useValue: authStub }],
    });
  });

  it('allows deactivation when the component permits it', () => {
    const component: CanComponentDeactivate = { canDeactivate: () => true };
    expect(run(component)).toBe(true);
  });

  it('blocks deactivation when the component denies it', () => {
    const component: CanComponentDeactivate = { canDeactivate: () => false };
    expect(run(component)).toBe(false);
  });

  it('delegates to the component and supports a Promise result', async () => {
    const component: CanComponentDeactivate = {
      canDeactivate: () => Promise.resolve(false),
    };
    await expectAsync(run(component) as Promise<boolean>).toBeResolvedTo(false);
  });

  it('skips the check (returns true) while a logout is in progress', () => {
    authStub.isLoggingOut = true;
    const component: CanComponentDeactivate = { canDeactivate: () => false };
    // Even though the component would deny it, the logout bypasses the prompt.
    expect(run(component)).toBe(true);
  });

  it('allows deactivation for a component without canDeactivate', () => {
    const component = {} as CanComponentDeactivate;
    expect(run(component)).toBe(true);
  });
});
