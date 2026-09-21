import SemVer from 'semver'
import { nextTick } from 'vue'

import { describeError } from './errors'

import useTimerHelper from '@/composables/TimerHelper.js'
import { MIN_NR_ASSISTANT_VERSION_FOR_AGENT_FLOW_BUILDING } from '@/mcp/constants'
import { useContextStore } from '@/stores/context.js'
import { useProductAssistantStore } from '@/stores/product-assistant.js'
import type { McpToolDefinition } from '@/types'

// The transport this tool's response travels over times out around 10s, so give up
// waiting on the editor well before that and return a normal (not ready) result.
const EDITOR_READY_TIMEOUT_MS = 8000
const EDITOR_READY_POLL_INTERVAL_MS = 100

function isEditorRoute (routeName: string): boolean {
    return routeName === 'instance-editor' || routeName.startsWith('instance-editor-') ||
        routeName === 'device-editor' || routeName.startsWith('device-editor-')
}

// Waits for a fresh 'assistant-ready' signal, not just for `version` to be set: editor-to-editor
// navigation does not unmount the iframe wrapper, so a stale version would otherwise read as ready.
async function waitForFreshAssistantVersion (baselineGeneration: number, deadline: number): Promise<string | null> {
    const assistantStore = useProductAssistantStore()
    const { waitWhile } = useTimerHelper()
    const isReady = () => assistantStore.readyGeneration > baselineGeneration && Boolean(assistantStore.version)
    // waitWhile rejects a non-finite cutoffTries, so give it a backstop above what the deadline allows.
    const cutoffTries = Math.ceil(EDITOR_READY_TIMEOUT_MS / EDITOR_READY_POLL_INTERVAL_MS) + 1
    try {
        await waitWhile(() => !isReady() && Date.now() < deadline, { intervalMs: EDITOR_READY_POLL_INTERVAL_MS, cutoffTries })
    } catch {
        // cutoffTries reached: treated the same as the deadline passing
    }
    return isReady() ? assistantStore.version : null
}

const tools: McpToolDefinition[] = [
    {
        name: 'ui_navigate',
        title: 'Navigate',
        description: `FlowFuse UI automation tool:
            Navigates the user's browser to a specific page.
            Use ui_list_routes to discover valid route names and the parameters they need.
            Before navigating, call ui_get_context to remember what page the user is currently on, so you can go back if something goes wrong.
            The result includes a "context" field with the same payload ui_get_context returns for the page you land on, so you usually do not need a follow-up call.
            { success: true } only confirms the route name matched and the browser navigated. It does not confirm that an id param points to a real entity - if something about "context" looks wrong, call ui_get_context to double-check.
            For editor routes (instance or device), the tool also waits briefly for the Node-RED editor to finish loading before returning, and the result includes "editorReady" and "assistantVersion".
            If "editorReady" is false, wait a few seconds and confirm with ui_get_context before trying to work in the editor - it may still be loading. If a "notice" is included, relay it to the user: it usually means the editor's FlowFuse assistant plugin (nr-assistant) is missing, outdated, or still starting up.
            If the navigation failed, it might be because a newly created entity has not finished setting up yet. Wait a few seconds and try the navigation again.
            If it still does not work after retrying, navigate the user back to the page they were on before and let them know what happened.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: { requiresBrowserSession: true },
        inputSchema: {
            type: 'object',
            properties: {
                route: {
                    type: 'string',
                    description: 'The route name to navigate to (e.g. "instance-overview", "team-home")'
                },
                params: {
                    type: 'object',
                    description: 'Route parameters (e.g. { id: "abc123" } or { team_slug: "my-team" }). Each id must be the entity\'s real id (hashid) as returned by a list/get tool - never its display name.',
                    additionalProperties: { type: 'string' }
                }
            },
            required: ['route']
        },
        async handler (args, { router }) {
            const { route: routeName, params } = args as { route: string, params?: Record<string, string> }

            let resolved
            try {
                resolved = router.resolve({ name: routeName, params })
            } catch {
                // router.resolve throws (rather than returning matched: []) for an unknown route name
                resolved = null
            }
            if (!resolved || !resolved.matched.length) {
                return { success: false, error: `Route "${routeName}" not found - use ui_list_routes to see valid route names` }
            }

            const targetIsEditor = isEditorRoute(routeName)
            const baselineGeneration = targetIsEditor ? useProductAssistantStore().readyGeneration : 0
            // Deadline starts before the route change so a slow transition eats into the
            // wait budget instead of extending the total past the transport window.
            const readyDeadline = Date.now() + EDITOR_READY_TIMEOUT_MS

            try {
                await router.push({ name: routeName, params })
            } catch (err) {
                return { success: false, error: `Navigation to "${routeName}" failed: ${describeError(err)}` }
            }

            // App.vue's $route watcher updates the context store asynchronously.
            await nextTick()

            if (!targetIsEditor) {
                return { success: true, route: routeName, path: resolved.fullPath, context: useContextStore().expert }
            }

            const version = await waitForFreshAssistantVersion(baselineGeneration, readyDeadline)
            const result: Record<string, unknown> = {
                success: true,
                route: routeName,
                path: resolved.fullPath,
                context: useContextStore().expert,
                assistantVersion: version,
                editorReady: false
            }

            if (!version) {
                result.notice = 'The editor has not finished loading, or its FlowFuse assistant plugin (nr-assistant) is missing or outdated and needs to be updated to the latest version to communicate with agents. Wait a few seconds and confirm with ui_get_context.'
                return result
            }

            if (SemVer.valid(version) && SemVer.lt(version, MIN_NR_ASSISTANT_VERSION_FOR_AGENT_FLOW_BUILDING)) {
                result.notice = `The editor's nr-assistant version ${version} is too old for agent flow building and must be updated to at least version ${MIN_NR_ASSISTANT_VERSION_FOR_AGENT_FLOW_BUILDING}.`
                return result
            }

            result.editorReady = true
            return result
        }
    }
]

export default tools
