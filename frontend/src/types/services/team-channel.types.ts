import type { AppService } from '@/types'

export interface TeamRef {
    id: string
}

export interface StatusPayload {
    id?: string
    meta?: Record<string, unknown> | null
    ts?: number
}

export type StatusCallback = (payload: StatusPayload) => void

export interface TeamChannelServiceI extends AppService {
    connect(team: TeamRef | null | undefined): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    isConnected(): boolean
    ready(): Promise<boolean>
    getSessionId(): string
    subscribeInstance(id: string, cb: StatusCallback): () => void
    subscribeDevice(id: string, cb: StatusCallback): () => void
}
