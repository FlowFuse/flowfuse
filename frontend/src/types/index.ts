/**
 * Single import surface for all domain types.
 *
 * Generated types come from `frontend/src/types/generated.ts`, which is
 * produced by running:
 *   npm run generate:types
 *
 * Hand-written types below cover shapes that are not in the OpenAPI spec:
 * component-internal state, enum constants, and frontend-only unions.
 */

// Re-export all auto-generated OpenAPI types.
// Run `npm run generate:types` to produce this file.
export * from './generated.js'

export * from './services/index.js'

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

/** Numeric role values, mirroring forge/lib/roles.js */
export const Roles = {
    None: 0,
    Dashboard: 5,
    Viewer: 10,
    Member: 30,
    Owner: 50,
    Admin: 99
} as const

export type RoleValue = typeof Roles[keyof typeof Roles]

export const RoleNames: Record<RoleValue, string> = {
    [Roles.None]: 'none',
    [Roles.Dashboard]: 'dashboard',
    [Roles.Viewer]: 'viewer',
    [Roles.Member]: 'member',
    [Roles.Owner]: 'owner',
    [Roles.Admin]: 'admin'
}

export const TeamRoles: RoleValue[] = [
    Roles.Dashboard,
    Roles.Viewer,
    Roles.Member,
    Roles.Owner
]
