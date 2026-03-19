// FlowFuse domain types
// Generated from real API response shapes — update if the API changes.

export interface TeamType {
    id: string
    name: string
}

export interface Team {
    id: string
    name: string
    slug: string
    avatar?: string
    suspended?: boolean
    createdAt?: string
    type?: TeamType
    /** Numeric role constant — see utils/roles.js */
    role?: number
    memberCount?: number
    instanceCount?: number
    billing?: {
        active: boolean
        canceled: boolean
        unmanaged: boolean
        trial?: boolean
        trialEnded?: boolean
        trialEndsAt?: string
    }
    links?: Record<string, string>
}



export interface Application {
    id: string
    name: string
    slug?: string
    description?: string
    createdAt?: string
    instanceCount?: number
    deviceCount?: number
    links?: Record<string, string>
}

export interface Instance {
    id: string
    name: string
    slug?: string
    state?: string
    url?: string
    mode?: string
    flowLastUpdatedAt?: string
    flowLastUpdatedSince?: string
    createdAt?: string
    updatedAt?: string
    links?: Record<string, string>
}

export interface Device {
    id: string
    name: string
    type?: string
    mode?: string
    state?: string
    lastSeenAt?: string
    lastSeenSince?: string
    lastSeenMs?: number
    agentVersion?: string
    editorConnected?: boolean
    editorToken?: string
    ownerType?: string
    /** Assigned instance (may also appear as `project` in older API responses) */
    instance?: { id: string; name: string }
    application?: Application
    team?: Team
    links?: Record<string, string>
}
