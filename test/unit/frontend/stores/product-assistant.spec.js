import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextStore } from '@/stores/context.js'
import { TOOL_GROUPS, classOf, groupOf, useProductAssistantStore } from '@/stores/product-assistant.js'

vi.mock('@/services/post-message.service.js', () => ({
    createMessagingService: () => ({
        sendMessage: vi.fn().mockResolvedValue(undefined)
    }),
    default: () => ({
        sendMessage: vi.fn().mockResolvedValue(undefined)
    })
}))

vi.mock('@/services/app.orchestrator.js', () => ({
    default: () => ({
        $serviceInstances: {
            postMessage: {
                sendMessage: vi.fn().mockResolvedValue(undefined)
            }
        }
    })
}))

// account-auth.js imports routes.js which loads the full Vue component tree
// (including AssetDetailDialog.vue → @flowfuse/flow-renderer CJS/ESM conflict).
// context.js imports account-auth.js, so mock it here to avoid the error.
vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: vi.fn(() => ({ user: null, pending: false }))
}))

// product-expert.js imports ExpertDrawer.vue which pulls in @flowfuse/flow-renderer
// (CJS/ESM conflict). Mock it to keep the test environment clean.
vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: vi.fn(() => ({ isSupportAgent: true }))
}))

describe('product-assistant store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    describe('initial state', () => {
        it('initializes with null version', () => {
            const store = useProductAssistantStore()
            expect(store.version).toBeNull()
        })

        it('initializes nodeRedVersion as null', () => {
            const store = useProductAssistantStore()
            expect(store.nodeRedVersion).toBeNull()
        })

        it('initializes selectedNodes as empty array', () => {
            const store = useProductAssistantStore()
            expect(store.selectedNodes).toEqual([])
        })

        it('initializes supportedActions as empty object', () => {
            const store = useProductAssistantStore()
            expect(store.supportedActions).toEqual({})
        })

        it('initializes palette as empty object', () => {
            const store = useProductAssistantStore()
            expect(store.palette).toEqual({})
        })

        it('initializes debugLogEntries as empty array', () => {
            const store = useProductAssistantStore()
            expect(store.debugLogEntries).toEqual([])
        })

        it('initializes selectedContext with palette option (no onSelectAction items)', () => {
            const store = useProductAssistantStore()
            expect(store.selectedContext.every(opt => !opt.onSelectAction)).toBe(true)
        })

        it('initializes editorState with all boolean properties false', () => {
            const store = useProductAssistantStore()
            expect(store.editorState.editorOpen).toBe(false)
            expect(store.editorState.searchOpen).toBe(false)
            expect(store.editorState.flowsLoaded).toBe(false)
        })
    })

    describe('getters', () => {
        describe('isImmersiveInstance', () => {
            it('returns falsy when context store has no instance', () => {
                const store = useProductAssistantStore()
                expect(store.isImmersiveInstance).toBeFalsy()
            })

            it('returns falsy when instance is set but isImmersive is false', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setInstance({ id: 'inst-1', url: 'http://localhost:1880' })
                expect(store.isImmersiveInstance).toBeFalsy()
            })

            it('returns true when instance is set and isImmersive is true', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setInstance({ id: 'inst-1', url: 'http://localhost:1880' })
                contextStore.setIsImmersive(true)
                expect(store.isImmersiveInstance).toBe(true)
            })
        })

        describe('isImmersiveDevice', () => {
            it('returns falsy when context store has no device', () => {
                const store = useProductAssistantStore()
                expect(store.isImmersiveDevice).toBeFalsy()
            })

            it('returns falsy when device is set but isImmersive is false', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setDevice({ id: 'dev-1', editor: { url: 'http://device.local' } })
                expect(store.isImmersiveDevice).toBeFalsy()
            })

            it('returns true when device is set and isImmersive is true', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setDevice({ id: 'dev-1', editor: { url: 'http://device.local' } })
                contextStore.setIsImmersive(true)
                expect(store.isImmersiveDevice).toBe(true)
            })
        })

        describe('hasUserSelection', () => {
            it('returns false when selectedNodes is empty', () => {
                const store = useProductAssistantStore()
                expect(store.hasUserSelection).toBe(false)
            })

            it('returns true when selectedNodes has entries', () => {
                const store = useProductAssistantStore()
                store.selectedNodes = [{ id: 'node-1' }]
                expect(store.hasUserSelection).toBe(true)
            })
        })

        describe('isFeaturePaletteEnabled', () => {
            it('returns true by default', () => {
                const store = useProductAssistantStore()
                expect(store.isFeaturePaletteEnabled).toBe(true)
            })

            it('returns false when assistantFeatures disables get-palette command', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { commands: { 'get-palette': { enabled: false } } }
                expect(store.isFeaturePaletteEnabled).toBe(false)
            })

            it('returns false when assistantFeatures disables paletteManagement', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { paletteManagement: { enabled: false } }
                expect(store.isFeaturePaletteEnabled).toBe(false)
            })
        })

        describe('isFeatureDebugLogContextEnabled', () => {
            it('returns false when assistantFeatures has no debugLogContext', () => {
                const store = useProductAssistantStore()
                expect(store.isFeatureDebugLogContextEnabled).toBe(false)
            })

            it('returns false when nodeRedVersion is below 4.1.6', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { debugLogContext: { enabled: true } }
                store.nodeRedVersion = '4.1.5'
                expect(store.isFeatureDebugLogContextEnabled).toBe(false)
            })

            it('returns true when debugLogContext enabled and nodeRedVersion >= 4.1.6', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { debugLogContext: { enabled: true } }
                store.nodeRedVersion = '4.1.6'
                expect(store.isFeatureDebugLogContextEnabled).toBe(true)
            })
        })

        describe('debugLog', () => {
            it('returns null when debug log context feature is disabled', () => {
                const store = useProductAssistantStore()
                // feature disabled by default (no assistantFeatures set)
                expect(store.debugLog).toBeNull()
            })

            it('returns entries when feature is enabled', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { debugLogContext: { enabled: true } }
                store.nodeRedVersion = '4.1.6'
                store.debugLogEntries = [{ uuid: 'a', msg: 'test' }]
                expect(store.debugLog).toEqual([{ uuid: 'a', msg: 'test' }])
            })
        })

        describe('paletteContribOnly', () => {
            it('returns palette without node-red key', () => {
                const store = useProductAssistantStore()
                store.palette = { 'node-red': { version: '4.0.0' }, 'my-package': { version: '1.0.0' } }
                expect(store.paletteContribOnly).not.toHaveProperty('node-red')
                expect(store.paletteContribOnly).toHaveProperty('my-package')
            })

            it('returns null when palette feature is disabled', () => {
                const store = useProductAssistantStore()
                store.assistantFeatures = { paletteManagement: { enabled: false } }
                expect(store.paletteContribOnly).toBeNull()
            })
        })

        describe('allowedInboundOrigins', () => {
            it('always includes window.origin', () => {
                const store = useProductAssistantStore()
                expect(store.allowedInboundOrigins).toContain(window.origin)
            })

            it('includes instance url when instance is set', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setInstance({ id: 'inst-1', url: 'http://node-red.local' })
                expect(store.allowedInboundOrigins).toContain('http://node-red.local')
            })

            it('includes device editor url when device is set', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                contextStore.setDevice({ id: 'dev-1', editor: { url: 'http://device.local' } })
                expect(store.allowedInboundOrigins).toContain('http://device.local')
            })
        })

        describe('isEditorRunning', () => {
            it('returns false by default', () => {
                const store = useProductAssistantStore()
                expect(store.isEditorRunning).toBe(false)
            })

            it('returns true when flowsLoaded is true', () => {
                const store = useProductAssistantStore()
                store.editorState.flowsLoaded = true
                expect(store.isEditorRunning).toBe(true)
            })

            it('returns true when runtimeState is start', () => {
                const store = useProductAssistantStore()
                store.editorState.runtimeState = { state: 'start' }
                expect(store.isEditorRunning).toBe(true)
            })
        })
    })

    describe('actions', () => {
        describe('setVersion', () => {
            it('sets the version', () => {
                const store = useProductAssistantStore()
                store.setVersion('1.2.3')
                expect(store.version).toBe('1.2.3')
            })
        })

        describe('setSupportedActions', () => {
            it('sets supportedActions', () => {
                const store = useProductAssistantStore()
                store.setSupportedActions({ 'custom:import-flow': true })
                expect(store.supportedActions).toEqual({ 'custom:import-flow': true })
            })
        })

        describe('setFeatures', () => {
            it('sets assistantFeatures', () => {
                const store = useProductAssistantStore()
                store.setFeatures({ paletteManagement: { enabled: true } })
                expect(store.assistantFeatures).toEqual({ paletteManagement: { enabled: true } })
            })
        })

        describe('setPalette', () => {
            it('sets palette', () => {
                const store = useProductAssistantStore()
                store.setPalette({ 'my-node': { version: '1.0.0' } })
                expect(store.palette).toEqual({ 'my-node': { version: '1.0.0' } })
            })

            it('defaults to empty object when null is passed', () => {
                const store = useProductAssistantStore()
                store.setPalette(null)
                expect(store.palette).toEqual({})
            })
        })

        describe('setSelectedNodes', () => {
            it('sets selectedNodes', async () => {
                const store = useProductAssistantStore()
                await store.setSelectedNodes([{ id: 'n1' }])
                expect(store.selectedNodes).toEqual([{ id: 'n1' }])
            })
        })

        describe('setSelectedContext', () => {
            it('sets selectedContext', async () => {
                const store = useProductAssistantStore()
                await store.setSelectedContext([{ value: 'palette' }])
                expect(store.selectedContext).toEqual([{ value: 'palette' }])
            })

            it('defaults to empty array when null is passed', async () => {
                const store = useProductAssistantStore()
                await store.setSelectedContext(null)
                expect(store.selectedContext).toEqual([])
            })
        })

        describe('addDebugLogContext', () => {
            it('adds a log entry', async () => {
                const store = useProductAssistantStore()
                await store.addDebugLogContext({ uuid: 'a', msg: 'hello' })
                expect(store.debugLogEntries).toHaveLength(1)
                expect(store.debugLogEntries[0].uuid).toBe('a')
            })

            it('does not add duplicate uuids', async () => {
                const store = useProductAssistantStore()
                await store.addDebugLogContext({ uuid: 'a', msg: 'hello' })
                await store.addDebugLogContext({ uuid: 'a', msg: 'hello again' })
                expect(store.debugLogEntries).toHaveLength(1)
            })

            it('accepts an array of entries', async () => {
                const store = useProductAssistantStore()
                await store.addDebugLogContext([{ uuid: 'a' }, { uuid: 'b' }])
                expect(store.debugLogEntries).toHaveLength(2)
            })

            it('does nothing when passed null', async () => {
                const store = useProductAssistantStore()
                await store.addDebugLogContext(null)
                expect(store.debugLogEntries).toHaveLength(0)
            })

            it('caps entries at 100', async () => {
                const store = useProductAssistantStore()
                const entries = Array.from({ length: 105 }, (_, i) => ({ uuid: `entry-${i}` }))
                await store.addDebugLogContext(entries)
                expect(store.debugLogEntries).toHaveLength(100)
                // oldest entries are removed — entry-0 through entry-4 should be gone
                expect(store.debugLogEntries[0].uuid).toBe('entry-5')
            })
        })

        describe('removeDebugLogContext', () => {
            it('removes an entry by uuid', async () => {
                const store = useProductAssistantStore()
                store.debugLogEntries = [{ uuid: 'a' }, { uuid: 'b' }]
                await store.removeDebugLogContext({ uuid: 'a' })
                expect(store.debugLogEntries).toEqual([{ uuid: 'b' }])
            })

            it('does nothing when uuid not found', async () => {
                const store = useProductAssistantStore()
                store.debugLogEntries = [{ uuid: 'a' }]
                await store.removeDebugLogContext({ uuid: 'z' })
                expect(store.debugLogEntries).toHaveLength(1)
            })

            it('does nothing when passed null', async () => {
                const store = useProductAssistantStore()
                store.debugLogEntries = [{ uuid: 'a' }]
                await store.removeDebugLogContext(null)
                expect(store.debugLogEntries).toHaveLength(1)
            })
        })

        describe('resetDebugLogContext', () => {
            it('clears all debug log entries', async () => {
                const store = useProductAssistantStore()
                store.debugLogEntries = [{ uuid: 'a' }, { uuid: 'b' }]
                await store.resetDebugLogContext()
                expect(store.debugLogEntries).toEqual([])
            })
        })

        describe('reset', () => {
            it('resets state back to initial values', () => {
                const store = useProductAssistantStore()
                store.version = '2.0.0'
                store.nodeRedVersion = '4.1.6'
                store.selectedNodes = [{ id: 'n1' }]
                store.reset()
                expect(store.version).toBeNull()
                expect(store.nodeRedVersion).toBeNull()
                expect(store.selectedNodes).toEqual([])
            })
        })

        describe('setRegisteredEventProperty', () => {
            it('sets a boolean editorState property', () => {
                const store = useProductAssistantStore()
                store.setRegisteredEventProperty({
                    registeredEvent: {
                        propertyBag: 'editorState',
                        propertyName: 'editorOpen',
                        propertyValue: true
                    },
                    eventData: null
                })
                expect(store.editorState.editorOpen).toBe(true)
            })

            it('uses eventData when useEventData is true', () => {
                const store = useProductAssistantStore()
                store.setRegisteredEventProperty({
                    registeredEvent: {
                        propertyBag: 'editorState',
                        propertyName: 'runtimeState',
                        propertyValue: null,
                        useEventData: true
                    },
                    eventData: { state: 'start' }
                })
                expect(store.editorState.runtimeState).toEqual({ state: 'start' })
            })

            it('does nothing when propertyBag does not exist on store', () => {
                const store = useProductAssistantStore()
                expect(() => store.setRegisteredEventProperty({
                    registeredEvent: { propertyBag: 'nonExistent', propertyName: 'foo', propertyValue: true },
                    eventData: null
                })).not.toThrow()
            })
        })
    })

    // Human-in-the-loop tool permissions (#421). The permission-resolution engine
    // lives entirely in this store: per-team defaults, per-tool overrides, per-chat
    // session grants, version gating, and the pending-approval registry.
    describe('tool permissions (HITL, #421)', () => {
        const TEAM = 'team-1'
        beforeEach(() => {
            // Every default/preference read is scoped by the current team, so set one.
            useContextStore().setTeam({ id: TEAM })
        })

        describe('classOf helper', () => {
            it('defaults to write when the entry is missing', () => {
                expect(classOf(null)).toBe('write')
            })

            it('maps toolClass read/delete through', () => {
                expect(classOf({ toolClass: 'read' })).toBe('read')
                expect(classOf({ toolClass: 'delete' })).toBe('delete')
            })

            it('treats a destructive tool as delete', () => {
                expect(classOf({ destructive: true })).toBe('delete')
            })

            it('falls back to write for anything else', () => {
                expect(classOf({ toolClass: 'something-else' })).toBe('write')
            })
        })

        describe('groupOf helper', () => {
            it('uses the entry group when present', () => {
                expect(groupOf({ group: TOOL_GROUPS.PLATFORM })).toBe(TOOL_GROUPS.PLATFORM)
            })

            it('defaults to flow-building', () => {
                expect(groupOf({})).toBe(TOOL_GROUPS.FLOW_BUILDING)
                expect(groupOf(null)).toBe(TOOL_GROUPS.FLOW_BUILDING)
            })
        })

        describe('initial state', () => {
            it('starts with an empty catalog and no hash', () => {
                const store = useProductAssistantStore()
                expect(store.toolCatalog).toEqual([])
                expect(store.toolCatalogHash).toBeNull()
            })

            it('starts with no saved defaults, preferences or session grants', () => {
                const store = useProductAssistantStore()
                expect(store.toolDefaultsByTeam).toEqual({})
                expect(store.toolPreferencesByTeam).toEqual({})
                expect(store.sessionToolOverrides).toEqual({})
            })
        })

        describe('teamGroupDefaults / defaultForToolClass', () => {
            it('returns the fail-safe defaults when the team has none saved', () => {
                const store = useProductAssistantStore()
                expect(store.teamGroupDefaults(TOOL_GROUPS.FLOW_BUILDING)).toEqual({ read: 'allow', write: 'ask', delete: 'ask' })
            })

            it('defaultForToolClass reflects a saved class default', () => {
                const store = useProductAssistantStore()
                store.setToolClassDefault(TOOL_GROUPS.FLOW_BUILDING, 'write', 'allow')
                expect(store.defaultForToolClass('write')).toBe('allow')
            })

            it('defaultForToolClass falls back per class when nothing valid is stored', () => {
                const store = useProductAssistantStore()
                expect(store.defaultForToolClass('read')).toBe('allow')
                expect(store.defaultForToolClass('write')).toBe('ask')
                expect(store.defaultForToolClass('delete')).toBe('ask')
            })
        })

        describe('savedToolPolicyFor / toolPolicyFor', () => {
            it('uses the class default when there is no explicit preference', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([{ key: 'read-flow', toolClass: 'read' }])
                expect(store.savedToolPolicyFor('read-flow')).toBe('allow')
            })

            it('an explicit per-tool preference overrides the class default', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([{ key: 'read-flow', toolClass: 'read' }])
                store.setToolPreference('read-flow', 'deny')
                expect(store.savedToolPolicyFor('read-flow')).toBe('deny')
            })

            it('a session grant wins over the saved policy in toolPolicyFor', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([{ key: 'write-flow', toolClass: 'write' }])
                store.setToolPreference('write-flow', 'deny')
                store.setSessionToolOverride('write-flow', 'allow')
                expect(store.savedToolPolicyFor('write-flow')).toBe('deny')
                expect(store.toolPolicyFor('write-flow')).toBe('allow')
            })
        })

        describe('resolvedToolPermissions', () => {
            it('emits flat defaults plus a per-tool policy map', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([
                    { key: 'read-flow', toolClass: 'read' },
                    { key: 'write-flow', toolClass: 'write' },
                    { key: 'delete-flow', toolClass: 'delete' }
                ])
                store.setSessionToolOverride('write-flow', 'allow')
                const resolved = store.resolvedToolPermissions
                expect(resolved.defaults).toEqual({ read: 'allow', write: 'ask', delete: 'ask' })
                expect(resolved.tools).toEqual({
                    'read-flow': 'allow',
                    'write-flow': 'allow', // session grant folded in
                    'delete-flow': 'ask'
                })
            })
        })

        describe('toolAvailabilityFor (version gating)', () => {
            it('treats a tool as available when the instance version is unknown', () => {
                const store = useProductAssistantStore()
                expect(store.toolAvailabilityFor({ minVersion: '1.0.0' }).status).toBe('available')
            })

            it('requires an update when below the tool min version', () => {
                const store = useProductAssistantStore()
                store.version = '0.9.0'
                const availability = store.toolAvailabilityFor({ minVersion: '1.0.0' })
                expect(availability.status).toBe('requires-update')
                expect(availability.requiredVersion).toBe('1.0.0')
            })

            it('marks a tool deprecated when past its max version', () => {
                const store = useProductAssistantStore()
                store.version = '2.0.0'
                expect(store.toolAvailabilityFor({ maxVersion: '1.5.0' }).status).toBe('deprecated')
            })

            it('is available but flagged when in range with a max set', () => {
                const store = useProductAssistantStore()
                store.version = '1.2.0'
                const availability = store.toolAvailabilityFor({ minVersion: '1.0.0', maxVersion: '1.5.0' })
                expect(availability.status).toBe('available')
                expect(availability.deprecated).toBe(true)
            })
        })

        describe('setToolCatalog', () => {
            it('stores a catalog and hash', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([{ key: 'a' }], 'hash-1')
                expect(store.toolCatalog).toHaveLength(1)
                expect(store.toolCatalogHash).toBe('hash-1')
            })

            it('coerces a non-array catalog to an empty array', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog(null, 'hash-1')
                expect(store.toolCatalog).toEqual([])
            })

            it('leaves the hash untouched when hash arg is omitted', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([{ key: 'a' }], 'hash-1')
                store.setToolCatalog([{ key: 'b' }])
                expect(store.toolCatalogHash).toBe('hash-1')
            })
        })

        describe('setToolClassDefault', () => {
            it('is a no-op for an invalid class or policy', () => {
                const store = useProductAssistantStore()
                store.setToolClassDefault(TOOL_GROUPS.FLOW_BUILDING, 'nope', 'allow')
                store.setToolClassDefault(TOOL_GROUPS.FLOW_BUILDING, 'read', 'nope')
                expect(store.toolDefaultsByTeam).toEqual({})
            })

            it('is a no-op when there is no current team', () => {
                const store = useProductAssistantStore()
                useContextStore().setTeam(null)
                store.setToolClassDefault(TOOL_GROUPS.FLOW_BUILDING, 'read', 'deny')
                expect(store.toolDefaultsByTeam).toEqual({})
            })

            it('scopes the default under the current team and group', () => {
                const store = useProductAssistantStore()
                store.setToolClassDefault(TOOL_GROUPS.FLOW_BUILDING, 'delete', 'deny')
                expect(store.toolDefaultsByTeam[TEAM][TOOL_GROUPS.FLOW_BUILDING].delete).toBe('deny')
            })
        })

        describe('setToolPreference / clearToolPreference', () => {
            it('saves a per-tool preference for the current team', () => {
                const store = useProductAssistantStore()
                store.setToolPreference('write-flow', 'allow')
                expect(store.teamToolPreferences['write-flow']).toBe('allow')
            })

            it('clears any session grant for that tool so the saved value takes effect now', () => {
                const store = useProductAssistantStore()
                store.setSessionToolOverride('write-flow', 'deny')
                store.setToolPreference('write-flow', 'allow')
                expect(store.sessionToolOverrides['write-flow']).toBeUndefined()
            })

            it('clearToolPreference removes a saved preference', () => {
                const store = useProductAssistantStore()
                store.setToolPreference('write-flow', 'allow')
                store.clearToolPreference('write-flow')
                expect(store.teamToolPreferences['write-flow']).toBeUndefined()
            })
        })

        describe('resetGroupClassPreferences', () => {
            it('clears only the matching group + class tool preferences, leaving session grants alone', () => {
                const store = useProductAssistantStore()
                store.setToolCatalog([
                    { key: 'read-flow', toolClass: 'read' },
                    { key: 'write-flow', toolClass: 'write' }
                ])
                store.setToolPreference('read-flow', 'deny')
                store.setToolPreference('write-flow', 'deny')
                store.setSessionToolOverride('read-flow', 'allow')

                store.resetGroupClassPreferences(TOOL_GROUPS.FLOW_BUILDING, 'read')

                expect(store.teamToolPreferences['read-flow']).toBeUndefined()
                expect(store.teamToolPreferences['write-flow']).toBe('deny') // different class untouched
                expect(store.sessionToolOverrides['read-flow']).toBe('allow') // session grant untouched
            })
        })

        describe('session overrides', () => {
            it('sets and reads a session grant', () => {
                const store = useProductAssistantStore()
                store.setSessionToolOverride('write-flow', 'allow')
                expect(store.sessionOverrideFor('write-flow')).toBe('allow')
            })

            it('ignores an invalid policy', () => {
                const store = useProductAssistantStore()
                store.setSessionToolOverride('write-flow', 'maybe')
                expect(store.sessionOverrideFor('write-flow')).toBeNull()
            })

            it('clearSessionToolOverrides drops them all', () => {
                const store = useProductAssistantStore()
                store.setSessionToolOverride('a', 'allow')
                store.setSessionToolOverride('b', 'deny')
                store.clearSessionToolOverrides()
                expect(store.sessionToolOverrides).toEqual({})
            })

            it('promoteSessionOverride saves the grant permanently and drops the session entry', () => {
                const store = useProductAssistantStore()
                store.setSessionToolOverride('write-flow', 'allow')
                store.promoteSessionOverride('write-flow')
                expect(store.teamToolPreferences['write-flow']).toBe('allow')
                expect(store.sessionToolOverrides['write-flow']).toBeUndefined()
            })
        })

        describe('pending approvals registry', () => {
            // The pending-approval map is module-scoped (shared across store instances),
            // so clear it before each test to avoid leakage between cases.
            beforeEach(() => {
                useProductAssistantStore().rejectAllPendingApprovals()
            })

            it('resolves a registered approval with the decision', async () => {
                const store = useProductAssistantStore()
                const promise = new Promise((resolve) => {
                    store.registerPendingApproval('id-1', resolve, { toolKey: 'write-flow' })
                })
                expect(store.hasPendingApprovals()).toBe(true)
                expect(store.resolvePendingApproval('id-1', true)).toBe(true)
                await expect(promise).resolves.toBe(true)
                expect(store.hasPendingApprovals()).toBe(false)
            })

            it('resolvePendingApproval returns false for an unknown id', () => {
                const store = useProductAssistantStore()
                expect(store.resolvePendingApproval('missing', true)).toBe(false)
            })

            it('rejectAllPendingApprovals resolves every open approval as denied', async () => {
                const store = useProductAssistantStore()
                const p1 = new Promise((resolve) => store.registerPendingApproval('id-1', resolve))
                const p2 = new Promise((resolve) => store.registerPendingApproval('id-2', resolve))
                store.rejectAllPendingApprovals()
                await expect(p1).resolves.toBe(false)
                await expect(p2).resolves.toBe(false)
                expect(store.hasPendingApprovals()).toBe(false)
            })

            it('rejectAllPendingApprovals records a denied status per approval id', () => {
                const store = useProductAssistantStore()
                store.registerPendingApproval('id-1', () => {})
                store.registerPendingApproval('id-2', () => {})
                store.rejectAllPendingApprovals()
                // The card renders a detached streaming copy, so the outcome lives in this
                // reactive map (read by AnswerWrapper), not on the store message.
                expect(store.toolApprovalStatuses['id-1']).toBe('denied')
                expect(store.toolApprovalStatuses['id-2']).toBe('denied')
            })

            it('setToolApprovalStatus / clearToolApprovalStatuses track resolved outcomes', () => {
                const store = useProductAssistantStore()
                store.setToolApprovalStatus('id-1', 'approved')
                expect(store.toolApprovalStatuses['id-1']).toBe('approved')
                store.clearToolApprovalStatuses()
                expect(store.toolApprovalStatuses).toEqual({})
            })
        })
    })
})
