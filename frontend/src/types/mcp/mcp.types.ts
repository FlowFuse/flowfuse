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

/**
 * Out-of-band facts about a tool, carried alongside the definition rather than buried in
 * the description so a caller can reason about it without parsing prose. Mirrors how the
 * flow-building catalog already ships `assistantMinVersion`.
 */
export interface McpToolMeta {
    /**
     * The tool executes in a browser tab, so it needs one pinned with
     * platform_set_active_browser_session before it can run. Discovery is not gated on this.
     */
    requiresBrowserSession?: boolean,
    requiresImmersiveEditor?: boolean
}

export interface McpToolDefinition {
    name: string
    title: string
    description: string
    annotations: McpToolAnnotations
    inputSchema: McpToolInputSchema
    _meta?: McpToolMeta
    handler: (args: unknown, context: McpToolHandlerContext) => unknown | Promise<unknown>
}

export interface McpToolWireDefinition {
    name: string
    title: string
    description: string
    annotations: McpToolAnnotations
    inputSchema: McpToolInputSchema
    _meta?: McpToolMeta
}
