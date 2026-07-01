import type { Router } from 'vue-router'

export interface McpToolAnnotations {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
}

export interface McpToolInputSchema {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
}

export interface McpToolHandlerContext {
    router: Router
}

export interface McpToolDefinition {
    name: string
    description: string
    annotations: McpToolAnnotations
    inputSchema: McpToolInputSchema
    handler: (args: unknown, context: McpToolHandlerContext) => unknown | Promise<unknown>
}

export interface McpToolWireDefinition {
    name: string
    description: string
    annotations: McpToolAnnotations
    inputSchema: McpToolInputSchema
}
