export const TOOL_RECORD_KINDS = ['mcp_tool', 'mcp_resource', 'mcp_resource_template', 'mcp_prompt']

// Event kinds accepted on expert:status-message; tool-record is stored under its record kind.
export const STREAMED_KINDS = ['tool-record', 'reasoning', 'message']

export const ACTIVITY_KINDS = [...TOOL_RECORD_KINDS, 'reasoning', 'message']

export function isToolRecord (item) {
    return TOOL_RECORD_KINDS.includes(item?.kind)
}
