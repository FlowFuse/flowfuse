import type { AppService } from '@/types'

export interface TeamRef {
    id: string
}

export interface TeamChannelServiceI extends AppService {
    connect(team: TeamRef | null | undefined): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    isConnected(): boolean
    getSessionId(): string
}
