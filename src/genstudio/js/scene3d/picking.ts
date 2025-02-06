export function packID(instanceIdx: number): number {
    return 1 + instanceIdx;
}

// Unpack a 32-bit integer back into component and instance indices
export function unpackID(id: number): number | null {
    if (id === 0) return null;
    return id - 1;
}
