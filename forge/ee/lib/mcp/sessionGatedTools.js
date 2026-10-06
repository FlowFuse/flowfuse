/**
 * Tool groups that can only run against a live browser tab.
 *
 * `platform` tools execute inside the platform, so they work for any MCP caller. The
 * `platform_ui` and `flow_building` groups are dispatched to a browser tab over MQTT, so
 * they need a tab pinned with platform_set_active_browser_session before they can run.
 *
 * Discovery is deliberately NOT gated on a tab being present: definitions are static per
 * platform version and identical for every tab, so a caller must be able to see these tools
 * (and be told they need a tab) without one already being open. Callers typically fetch the
 * tool list once, before any tab is pinned, and never refetch - so a group that only appears
 * after pinning is a group the caller never learns about.
 *
 * The names below mirror frontend/src/mcp/tools/. Keep them in step: the browser owns the
 * handlers, this list only exists so the platform can name what a pinned tab unlocks.
 */

const PLATFORM_UI_TOOL_NAMES = [
    'ui_get_context',
    'ui_list_routes',
    'ui_navigate'
]

const SESSION_GATED_GROUPS = ['platform_ui', 'flow_building']

/**
 * Guidance for a caller that tried a browser-bound tool with no tab pinned.
 * Names the recovery steps rather than just reporting the failure.
 */
function noBrowserSessionGuidance (baseUrl = '') {
    return 'This tool runs inside the user\'s browser tab, and no tab is currently pinned for this MCP session. ' +
        'To fix: call platform_list_browser_sessions, then pass a sessionId from it to platform_set_active_browser_session. ' +
        'If platform_list_browser_sessions returns no sessions, the user has no tab exposed - ask them to ' +
        `open the FlowFuse platform${baseUrl ? ` (${baseUrl})` : ''} and click the MCP toggle ` +
        '(the plug icon next to the Expert button in the header), then retry.'
}

module.exports = {
    PLATFORM_UI_TOOL_NAMES,
    SESSION_GATED_GROUPS,
    noBrowserSessionGuidance
}
