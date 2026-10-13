// Answer kinds that render as a tool-call card. 'tool-record' is what a streamed
// record arrives as; the others are what the same record carries in a final answer.
export const TOOL_RECORD_KINDS = ['tool-record', 'mcp_tool', 'mcp_resource', 'mcp_resource_template', 'mcp_prompt']

// Kinds that arrive on expert:status-message and render in seq order ahead of the final reply.
export const STREAMED_KINDS = ['tool-record', 'reasoning', 'message']

export const ACTIVITY_KINDS = [...TOOL_RECORD_KINDS, 'reasoning', 'message']

export function isToolRecord (item) {
    return TOOL_RECORD_KINDS.includes(item?.kind)
}
