export interface SessionDataActions {
    nextVersion: () => number;
    getVersion: () => number;
    clear: () => void;
    checkReady?: () => Promise<void>;
    loadPublic: () => Promise<unknown>[];
    loadPrivate: () => Promise<unknown>[];
    isCurrent: (version: number) => boolean;
}

export function createSessionDataCoordinator(actions: SessionDataActions) {
    let version = actions.getVersion();

    return {
        getVersion: () => version,
        isCurrent: (candidate: number) => candidate === version && actions.isCurrent(candidate),
        sync: async (authenticated: boolean): Promise<void> => {
            version = actions.nextVersion();
            const currentVersion = version;
            actions.clear();
            if (actions.checkReady) await actions.checkReady();
            const requests = [
                ...actions.loadPublic(),
                ...(authenticated ? actions.loadPrivate() : []),
            ];
            const results = await Promise.allSettled(requests);
            const errors = results
                .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
                .map((result) => result.reason);
            if (errors.length && actions.isCurrent(currentVersion)) {
                throw new AggregateError(errors, 'Falha ao sincronizar dados da sessão.');
            }
        },
    };
}
