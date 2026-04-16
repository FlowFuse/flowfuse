import { AppService, BaseService, CreateServiceOptions } from './service.contract'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductExpertStore } from '@/stores/product-expert.js'

const DATA_SOURCE_FLOWFUSE_WEBSITE = 'flowfuse-website'
const DATA_SOURCE_ASSISTANT = 'nr-assistant'
const DATA_TARGET_ASSISTANT = 'flowfuse-expert'

const dataSourceScopes = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: {
        FLOWFUSE_EXPERT: 'flowfuse-expert'
    },
    [DATA_SOURCE_ASSISTANT]: {
        FLOWFUSE_EXPERT: 'flowfuse-expert'
    }
}

const ACTIONS_FLOWFUSE_EXPERT = {
    SET_CONTEXT: 'set-context'
}

type FlowFuseWebsiteSource = typeof DATA_SOURCE_FLOWFUSE_WEBSITE | typeof DATA_SOURCE_ASSISTANT
type FlowFuseExpertScope = typeof dataSourceScopes[typeof DATA_SOURCE_FLOWFUSE_WEBSITE]['FLOWFUSE_EXPERT']
type SetContextAction = typeof ACTIONS_FLOWFUSE_EXPERT.SET_CONTEXT
type DataTargetAssistant = typeof DATA_TARGET_ASSISTANT

type PostMessageBase = {
    source: FlowFuseWebsiteSource
    scope: FlowFuseExpertScope
    target: DataTargetAssistant
}
type PostMessagePayload = PostMessageBase & (
    {
        type: 'onLoad'
        status: 'ready'
        timestamp: number
    } | {
        type: 'flowfuse-expert-response'
        action: 'confirm'
        timestamp: number
    } | {
        action: SetContextAction
        payload: unknown
    }
)

export interface PostMessageServiceI extends AppService {
    init(): void
    setupMessageHandlers(): void
    destroy(): Promise<void>
    handleFlowFuseExpertMessage(event: MessageEvent<any>): Promise<void>
    handleAssistantMessage(event: MessageEvent<any>): Promise<void>
    sendReadyMessage(): void
    setExpertContext(payload: unknown): void
    sendMessage(args: {
        message: unknown
        target?: Window
        targetOrigin?: string
    }): void
    getWindowOrigin(targetWindow: Window): string | null
    isWindowOriginAllowed(origin: string): boolean
}

const sourceActions = {
    [DATA_SOURCE_FLOWFUSE_WEBSITE]: ACTIONS_FLOWFUSE_EXPERT
}

const allowedOrigins = ['https://flowfuse.com', 'https://app.flowfuse.com', 'https://forge.flowfuse.dev', 'http://localhost:8080', 'http://localhost:3000']

type SendMessagePayload = { message: object, target?: WindowProxy, targetOrigin?: string };

/**
 * Messaging Service - Handles postMessage communication
 * @class
 */
class PostMessageService extends BaseService implements PostMessageServiceI {
    protected $onMessage: { (event: any): Promise<void>; (this: Window, ev: MessageEvent<any>): any; (this: Window, ev: MessageEvent<any>): any }

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({ name: 'postMessage', app, router, services })

        this.$onMessage = null

        this.init()
    }

    /**
     * Initialize message handlers
     */
    init () {
        this.$services.bootstrap
            .whenReady()
            .then(() => {
                this.sendReadyMessage()
                this.setupMessageHandlers()
            })
            .catch(e => e)
    }

    setupMessageHandlers () {
        this.$onMessage = async (event: MessageEvent<PostMessagePayload>) => {
            const isSourceWebsite = event.data.source === DATA_SOURCE_FLOWFUSE_WEBSITE
            const isWebsiteExpertScope = event.data.scope === dataSourceScopes[DATA_SOURCE_FLOWFUSE_WEBSITE].FLOWFUSE_EXPERT
            const shouldHandleWebsiteExpertMessages = isSourceWebsite && isWebsiteExpertScope

            const isAssistantTargetingFlowFuseExpert = event.data.target === DATA_TARGET_ASSISTANT
            const isSourceAssistant = event.data.source === DATA_SOURCE_ASSISTANT
            const isAssistantScope = isAssistantTargetingFlowFuseExpert && event.data.scope === dataSourceScopes[DATA_SOURCE_ASSISTANT].FLOWFUSE_EXPERT
            const shouldHandleAssistantMessages = isAssistantTargetingFlowFuseExpert && isSourceAssistant && isAssistantScope

            switch (true) {
            case shouldHandleWebsiteExpertMessages:
                return await this.handleFlowFuseExpertMessage(event)
            case shouldHandleAssistantMessages:
                return await this.handleAssistantMessage(event)
            default:
                // do nothing
            }
        }

        window.addEventListener('message', this.$onMessage)
    }

    async destroy () {
        if (this.$onMessage) {
            window.removeEventListener('message', this.$onMessage)
            this.$onMessage = null
        }
    }

    async handleFlowFuseExpertMessage (event) {
        switch (event.data.action) {
        case sourceActions[DATA_SOURCE_FLOWFUSE_WEBSITE].SET_CONTEXT:
            this.setExpertContext(event.data.payload)
            break
        default:
            console.warn('Unknown message received:', event.data.action)
        }
    }

    async handleAssistantMessage (event) {
        await useProductAssistantStore().handleMessage(event)
    }

    sendReadyMessage () {
        const message = {
            type: 'onLoad',
            status: 'ready',
            timestamp: Date.now()
        }

        this.sendMessage({ message })
    }

    setExpertContext (payload: {data: object, sessionId: string}) {
        useProductExpertStore().setContext(payload)

        const message = {
            type: 'flowfuse-expert-response',
            action: 'confirm',
            timestamp: Date.now()
        }

        this.sendMessage({ message })
    }

    sendMessage ({ message, target, targetOrigin }: SendMessagePayload) {
        // If we have a target, we aim at that target
        if (target) {
            target.postMessage(message, targetOrigin)
            return
        }

        // if we don't have a target, we aim at our opener or parent while checking for the whitelisted target origin
        if (targetOrigin && !allowedOrigins.includes(targetOrigin)) {
            console.warn('Invalid target origin:', targetOrigin)
            return
        }

        // Check parent window
        if (window.parent !== window) {
            const parentOrigin = this.getWindowOrigin(window.parent)

            if (parentOrigin && this.isWindowOriginAllowed(parentOrigin)) {
                window.parent.postMessage(message, parentOrigin)
            } else if (parentOrigin) {
                console.warn(`Parent window origin not whitelisted: ${parentOrigin}`)
            } else {
                console.warn('Cannot determine parent window origin - message not sent')
            }
        }

        // Check opener window
        if (window.opener) {
            const openerOrigin = this.getWindowOrigin(window.opener)

            if (openerOrigin && this.isWindowOriginAllowed(openerOrigin)) {
                window.opener.postMessage(message, openerOrigin)
            } else if (openerOrigin) {
                console.warn(`Opener window origin not whitelisted: ${openerOrigin}`)
            } else {
                console.warn('Cannot determine opener window origin - message not sent')
            }
        }
    }

    /**
     * Get the origin of a window
     * @param {Window} targetWindow - The window to get origin from
     * @returns {string|null} - The origin or null if inaccessible
     */
    getWindowOrigin (targetWindow: WindowProxy): string | null {
        try {
            return targetWindow.location.origin
        } catch {
            // Cross-origin - try to get from document.referrer or other sources
            if (targetWindow === window.parent && document.referrer) {
                try {
                    return new URL(document.referrer).origin
                } catch {
                    return null
                }
            }
            // For opener windows, document.referrer might also contain the opener's URL
            if (targetWindow === window.opener && document.referrer) {
                try {
                    return new URL(document.referrer).origin
                } catch {
                    return null
                }
            }
            return null
        }
    }

    /**
     * Check if an origin is whitelisted
     * @param {string} origin - The origin to check
     * @returns {boolean} - True if the origin is allowed
     */
    isWindowOriginAllowed (origin: string): boolean {
        return allowedOrigins.includes(origin)
    }
}

let MessagingServiceInstance = null

/**
 * Get or create the MessagingService singleton instance
 * @param CreateServiceOptions options - Constructor options
 * @returns {PostMessageService}
 */
export function createMessagingService ({ app, router, services } : CreateServiceOptions): PostMessageService {
    if (!MessagingServiceInstance) {
        MessagingServiceInstance = new PostMessageService({
            app,
            router,
            services
        })
    }

    return MessagingServiceInstance
}

/**
 * @returns {PostMessageService}
 */
export default createMessagingService
