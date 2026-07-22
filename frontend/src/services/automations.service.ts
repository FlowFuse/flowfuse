import { BaseService } from './service.contract'

import allTools from '@/mcp/tools'
import type { AutomationsServiceI, CreateServiceOptions, McpToolDefinition, McpToolWireDefinition } from '@/types'

// Some thrown errors (e.g. vue-router's production-build NavigationFailure) carry
// no message, only extra own properties, so fall back to those instead of losing the reason.
function describeError (err: unknown): string {
    if (err instanceof Error) {
        if (err.message) {
            return err.message
        }
        const details = { ...err }
        return Object.keys(details).length
            ? `${err.name}: ${JSON.stringify(details)}`
            : err.name
    }
    if (typeof err === 'string' && err) {
        return err
    }
    return JSON.stringify(err) ?? 'Unknown error'
}

class AutomationsService extends BaseService implements AutomationsServiceI {
    private $tools: Map<string, McpToolDefinition>

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({
            name: 'automations',
            app,
            router,
            services
        })

        this.$tools = new Map()
        for (const tool of allTools) {
            this.$tools.set(tool.name, tool)
        }
    }

    /**
     * Returns tool definitions without handlers, suitable for
     * sending over MQTT in response to a tool list discovery request.
     */
    getToolDefinitions (): McpToolWireDefinition[] {
        return Array.from(this.$tools.values()).map((tool) => ({
            name: tool.name,
            title: tool.title,
            description: tool.description,
            annotations: tool.annotations,
            inputSchema: tool.inputSchema
        }))
    }

    /**
     * Dispatches a tool call by name. Returns the tool result or an error object.
     */
    async dispatch (toolName: string, args: unknown = {}): Promise<unknown> {
        const tool = this.$tools.get(toolName)
        if (!tool) {
            return { error: `Unknown UI tool: ${toolName}` }
        }

        try {
            return await tool.handler(args, { router: this.$router! })
        } catch (err) {
            return { error: `Tool "${toolName}" failed: ${describeError(err)}` }
        }
    }
}

let AutomationsServiceInstance: AutomationsService | null = null

export function createAutomationsService ({ app, router, services }: CreateServiceOptions): AutomationsService {
    if (!AutomationsServiceInstance) {
        AutomationsServiceInstance = new AutomationsService({
            app,
            router,
            services
        })
    }
    return AutomationsServiceInstance
}

export default createAutomationsService
