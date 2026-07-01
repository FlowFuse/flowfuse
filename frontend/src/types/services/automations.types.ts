import { McpToolWireDefinition } from '@/types'

export interface AutomationsServiceI {
    getToolDefinitions(): McpToolWireDefinition[]
    dispatch(toolName: string, args?: unknown): Promise<unknown>
}
