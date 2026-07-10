export function useUrlHelper () {
    /**
     * Safely extracts the bare origin (scheme://host:port) from a URL string.
     * Returns null if the URL cannot be parsed.
     */
    const safeOrigin = (url: string): string | null => {
        try {
            return new URL(url).origin
        } catch {
            return null
        }
    }

    /**
     * Compares two URLs (or origins) by their normalised origin.
     * Returns false if either URL cannot be parsed.
     */
    const originsMatch = (a: string, b: string): boolean => {
        const originA = safeOrigin(a)
        const originB = safeOrigin(b)
        if (!originA || !originB) {
            return false
        }
        return originA === originB
    }

    return {
        safeOrigin,
        originsMatch
    }
}