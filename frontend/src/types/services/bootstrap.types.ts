import type { AppService } from '@/types'

export interface BootstrapServiceI extends AppService {
    init(): Promise<void>
    destroy(): Promise<void>
    setupReadyPromise(): void
    waitForAppMount(): Promise<void>
    waitForRouterReady(): Promise<void>
    checkUser(): Promise<void>
    mountApp(): Promise<void>
    markAsReady(): void
    whenReady(): Promise<void>
}
