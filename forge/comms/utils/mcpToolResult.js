/**
 * Unwraps the payload of an MCP tool call result received over MQTT (as returned by
 * mcpGateway.proxyRequest). A tool result carries its JSON payload as text in
 * `result.content[0].text`; some tools use `result.structuredContent` instead. Returns
 * null when neither is present or the text is not valid JSON.
 *
 * @param {object} mcpResponse The MCP response body
 * @returns {object|null}
 */
function parseMcpToolResult (mcpResponse) {
    const result = mcpResponse?.result
    const text = result?.content?.[0]?.text
    if (typeof text === 'string') {
        try {
            return JSON.parse(text)
        } catch (e) {
            return null
        }
    }
    return result?.structuredContent ?? null
}

module.exports = { parseMcpToolResult }
