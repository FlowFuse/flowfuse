import type { AppService } from '@/types'

export interface PostMessageServiceI extends AppService {
    init(): void
    setupMessageHandlers(): void
    destroy(): Promise<void>
    handleFlowFuseExpertMessage(event: MessageEvent): Promise<void>
    handleAssistantMessage(event: MessageEvent): Promise<void>
    sendReadyMessage(): void
    setExpertContext(payload: { data: object, sessionId: string }): void
    sendMessage(args: {
        message: object
        target?: Window
        targetOrigin?: string
    }): void
    getWindowOrigin(targetWindow: Window): string | null
    isWindowOriginAllowed(origin: string): boolean
}
