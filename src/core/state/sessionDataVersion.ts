let version = 0;

export function getSessionDataVersion(): number {
    return version;
}

export function advanceSessionDataVersion(): number {
    version += 1;
    return version;
}
