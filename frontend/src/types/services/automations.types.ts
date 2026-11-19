import type { AppService, McpToolWireDefinition } from '@/types'

export interface AutomationsServiceI extends AppService {
    getToolDefinitions(): McpToolWireDefinition[]
    dispatch(toolName: string, args?: unknown): Promise<unknown>
}
