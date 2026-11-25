export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const escapePointer = (segment: string): string => segment.replace(/~/g, '~0').replace(/\//g, '~1')

export const unescapePointer = (segment: string): string => segment.replace(/~1/g, '/').replace(/~0/g, '~')

// The pointer to a field of the schema at `holder`, which is '' for the root
export const pointerFor = (holder: string, name: string): string => `${holder}/properties/${escapePointer(name)}`
