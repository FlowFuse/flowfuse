export default function (counts: Record<string, number> | null | undefined): number {
    return counts ? Object.values(counts).reduce((total, count) => total + count, 0) : 0
}
