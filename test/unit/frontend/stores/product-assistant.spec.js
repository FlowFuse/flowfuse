import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextStore } from '@/stores/context.js'
import { useProductAssistantStore } from '@/stores/product-assistant.js'

vi.mock('@/services/messaging.service.js', () => ({
    default: () => ({
        sendMessage: vi.fn().mockResolvedValue(undefined)
    })
}))

// product-expert.js imports ExpertDrawer.vue which pulls in @flowfuse/flow-renderer
// (CJS/ESM conflict). Mock it to keep the test environment clean.
vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: vi.fn(() => ({ isInsightsAgent: true }))
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
        describe('immersiveInstance', () => {
            it('returns null when context store has no instance', () => {
                const store = useProductAssistantStore()
                expect(store.immersiveInstance).toBeNull()
            })

            it('returns the instance from the context store', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                const mockInstance = { id: 'inst-1', url: 'http://localhost:1880' }
                contextStore.setInstance(mockInstance)
                expect(store.immersiveInstance).toEqual(mockInstance)
            })
        })

        describe('immersiveDevice', () => {
            it('returns null when context store has no device', () => {
                const store = useProductAssistantStore()
                expect(store.immersiveDevice).toBeNull()
            })

            it('returns the device from the context store', () => {
                const contextStore = useContextStore()
                const store = useProductAssistantStore()
                const mockDevice = { id: 'dev-1', editor: { url: 'http://device.local' } }
                contextStore.setDevice(mockDevice)
                expect(store.immersiveDevice).toEqual(mockDevice)
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
})
