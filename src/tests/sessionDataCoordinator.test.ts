import { describe, expect, it } from 'vitest';
import { createSessionDataCoordinator } from '../core/state/sessionDataCoordinator.js';

describe('session data coordinator', () => {
  it('loads only public data for Guest and clears private stores before loading', async () => {
    let version = 0;
    const calls: string[] = [];
    const coordinator = createSessionDataCoordinator({
      nextVersion: () => ++version,
      getVersion: () => version,
      isCurrent: (candidate) => candidate === version,
      clear: () => calls.push('clear'),
      loadPublic: () => { calls.push('public'); return [Promise.resolve()]; },
      loadPrivate: () => { calls.push('private'); return [Promise.resolve()]; },
    });

    await coordinator.sync(false);
    expect(calls).toEqual(['clear', 'public']);
  });

  it('checks readiness before requesting session data and stops on an unavailable backend', async () => {
    let version = 0;
    const calls: string[] = [];
    const coordinator = createSessionDataCoordinator({
      nextVersion: () => ++version,
      getVersion: () => version,
      isCurrent: (candidate) => candidate === version,
      clear: () => calls.push('clear'),
      checkReady: async () => {
        calls.push('ready');
        throw new Error('backend unavailable');
      },
      loadPublic: () => { calls.push('public'); return [Promise.resolve()]; },
      loadPrivate: () => { calls.push('private'); return [Promise.resolve()]; },
    });

    await expect(coordinator.sync(false)).rejects.toThrow('backend unavailable');
    expect(calls).toEqual(['clear', 'ready']);
  });

  it('loads authorized stores after login and clears old data immediately', async () => {
    let version = 0;
    let privateValue = 'previous user data';
    const calls: string[] = [];
    const coordinator = createSessionDataCoordinator({
      nextVersion: () => ++version,
      getVersion: () => version,
      isCurrent: (candidate) => candidate === version,
      clear: () => { privateValue = ''; calls.push('clear'); },
      loadPublic: () => { calls.push('public'); return [Promise.resolve()]; },
      loadPrivate: () => { calls.push('private'); return [Promise.resolve().then(() => { privateValue = 'new user data'; })]; },
    });

    const pending = coordinator.sync(true);
    expect(privateValue).toBe('');
    await pending;
    expect(calls).toEqual(['clear', 'public', 'private']);
    expect(privateValue).toBe('new user data');
  });

  it('does not allow a request from a previous session to repopulate state', async () => {
    let version = 0;
    let privateValue = '';
    let resolveOld!: (value: string) => void;
    let publicLoadCount = 0;
    const oldResponse = new Promise<string>((resolve) => { resolveOld = resolve; });
    let coordinator: ReturnType<typeof createSessionDataCoordinator>;
    coordinator = createSessionDataCoordinator({
      nextVersion: () => ++version,
      getVersion: () => version,
      isCurrent: (candidate) => candidate === version,
      clear: () => { privateValue = ''; },
      loadPublic: () => {
        publicLoadCount += 1;
        if (publicLoadCount > 1) return [Promise.resolve()];
        const requestVersion = version;
        return [oldResponse.then((value) => {
          if (coordinator.isCurrent(requestVersion)) privateValue = value;
        })];
      },
      loadPrivate: () => [Promise.resolve()],
    });

    const previousSession = coordinator.sync(false);
    const nextSession = coordinator.sync(true);
    resolveOld('sensitive data from old session');
    await Promise.all([previousSession, nextSession]);
    expect(privateValue).toBe('');
  });
});
