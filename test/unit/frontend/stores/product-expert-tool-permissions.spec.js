import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shared, mutable stand-in for the product-assistant store's permission registry.
// Declared via vi.hoisted so both the mock factory (hoisted above the imports) and
// the test body can reach the same state and reset it between cases.
const permState = vi.hoisted(() => ({ pending: new Map(), session: {}, statuses: {}, catalog: null, catalogHash: null }))

vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: vi.fn(() => ({ featuresCheck: { isExpertAssistantFeatureEnabled: true } }))
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({ team: { id: 't1' }, expert: { teamId: 't1' } }))
}))

// A functional fake of the product-assistant permission API, so the approval
// round-trip (register → resolve) actually resolves promises during the test.
vi.mock('@/stores/product-assistant.js', () => ({
    useProductAssistantStore: vi.fn(() => ({
        isImmersiveInstance: null,
        supportedActions: {},
        get toolCatalogHash () { return permState.catalogHash },
        setToolCatalog: (catalog, hash) => { permState.catalog = catalog; permState.catalogHash = hash },
        sessionOverrideFor: (key) => permState.session[key] || null,
        setSessionToolOverride: (key, policy) => { permState.session[key] = policy },
        clearSessionToolOverrides: () => { permState.session = {} },
        get toolApprovalStatuses () { return permState.statuses },
        setToolApprovalStatus: (id, status) => { permState.statuses[id] = status },
        clearToolApprovalStatuses: () => { permState.statuses = {} },
        registerPendingApproval: (id, resolve, meta = {}) => permState.pending.set(id, { resolve, meta }),
        getPendingApproval: (id) => permState.pending.get(id) || null,
        resolvePendingApproval: (id, approved) => {
            const entry = permState.pending.get(id)
            if (!entry) return false
            permState.pending.delete(id)
            entry.resolve(!!approved)
            return true
        },
        hasPendingApprovals: () => permState.pending.size > 0,
        rejectAllPendingApprovals: () => {
            for (const [id, entry] of permState.pending.entries()) {
                permState.statuses[id] = 'denied'
                entry.resolve(false)
            }
            permState.pending.clear()
        }
    }))
}))

vi.mock('@/api/expert.js', () => ({
    default: { chat: vi.fn(), getToolCatalog: vi.fn() }
}))

vi.mock('@/components/drawers/expert/ExpertDrawer.vue', () => ({
    default: { name: 'ExpertDrawer' }
}))

vi.mock('@/stores/ux-drawers.js', () => ({
    useUxDrawersStore: vi.fn(() => ({
        openRightDrawer: vi.fn(),
        setRightDrawerWider: vi.fn()
    }))
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductExpertStore } = await import('@/stores/product-expert.js')
const { useProductExpertSupportAgentStore } = await import('@/stores/product-expert-support-agent.js')
const { default: expertApi } = await import('@/api/expert.js')

describe('product-expert store — tool permissions (HITL, #421)', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        permState.pending.clear()
        permState.session = {}
        permState.statuses = {}
        permState.catalog = null
        permState.catalogHash = null
    })

    describe('fetchToolCatalog', () => {
        it('fetches the catalog and stores it with its hash', async () => {
            expertApi.getToolCatalog.mockResolvedValueOnce({ catalog: [{ key: 'a' }], hash: 'h1' })
            const store = useProductExpertStore()
            await store.fetchToolCatalog()
            expect(expertApi.getToolCatalog).toHaveBeenCalledWith({ teamId: 't1' })
            expect(permState.catalog).toEqual([{ key: 'a' }])
            expect(permState.catalogHash).toBe('h1')
        })

        it('does nothing when there is no team in context', async () => {
            const { useContextStore } = await import('@/stores/context.js')
            vi.mocked(useContextStore).mockReturnValueOnce({ team: null, expert: {} })
            const store = useProductExpertStore()
            await store.fetchToolCatalog()
            expect(expertApi.getToolCatalog).not.toHaveBeenCalled()
        })

        it('swallows API errors so a missing catalog is non-fatal', async () => {
            expertApi.getToolCatalog.mockRejectedValueOnce(new Error('boom'))
            const store = useProductExpertStore()
            await expect(store.fetchToolCatalog()).resolves.toBeUndefined()
            expect(permState.catalog).toBeNull()
        })
    })

    describe('requestToolApproval', () => {
        it('resolves immediately without a card when the session already allows the tool', async () => {
            permState.session['write-flow'] = 'allow'
            const store = useProductExpertStore()
            await expect(store.requestToolApproval({ tool: 'write-flow' })).resolves.toBe(true)
            expect(useProductExpertSupportAgentStore().messages).toHaveLength(0)
        })

        it('resolves immediately as denied when the session already denies the tool', async () => {
            permState.session['write-flow'] = 'deny'
            const store = useProductExpertStore()
            await expect(store.requestToolApproval({ tool: 'write-flow' })).resolves.toBe(false)
            expect(useProductExpertSupportAgentStore().messages).toHaveLength(0)
        })

        it('shows a pending approval card and returns a pending promise otherwise', () => {
            const store = useProductExpertStore()
            const promise = store.requestToolApproval({ tool: 'write-flow', name: 'Write Flow', toolClass: 'write', params: { a: 1 } })
            const messages = useProductExpertSupportAgentStore().messages
            expect(messages).toHaveLength(1)
            const answer = messages[0].answer[0]
            expect(answer.kind).toBe('tool-approval')
            expect(answer.status).toBe('pending')
            expect(answer.toolKey).toBe('write-flow')
            expect(permState.pending.size).toBe(1)
            // the promise stays pending until resolved
            expect(promise).toBeInstanceOf(Promise)
        })
    })

    describe('resolveToolApproval', () => {
        it('resolves the pending promise and marks the card approved', async () => {
            const store = useProductExpertStore()
            const promise = store.requestToolApproval({ tool: 'write-flow', name: 'Write Flow' })
            const id = useProductExpertSupportAgentStore().messages[0].answer[0].id

            store.resolveToolApproval({ id, approved: true })

            await expect(promise).resolves.toBe(true)
            expect(permState.statuses[id]).toBe('approved')
        })

        it('records a session grant and marks the card always-allowed when always is set', async () => {
            const store = useProductExpertStore()
            const promise = store.requestToolApproval({ tool: 'write-flow', name: 'Write Flow' })
            const id = useProductExpertSupportAgentStore().messages[0].answer[0].id

            store.resolveToolApproval({ id, approved: true, always: true })

            await expect(promise).resolves.toBe(true)
            expect(permState.session['write-flow']).toBe('allow')
            expect(permState.statuses[id]).toBe('always-allowed')
        })

        it('marks the card always-denied and grants a session deny', async () => {
            const store = useProductExpertStore()
            const promise = store.requestToolApproval({ tool: 'write-flow', name: 'Write Flow' })
            const id = useProductExpertSupportAgentStore().messages[0].answer[0].id

            store.resolveToolApproval({ id, approved: false, always: true })

            await expect(promise).resolves.toBe(false)
            expect(permState.session['write-flow']).toBe('deny')
            expect(permState.statuses[id]).toBe('always-denied')
        })

        it('does nothing for an unknown approval id', () => {
            const store = useProductExpertStore()
            expect(() => store.resolveToolApproval({ id: 'nope', approved: true })).not.toThrow()
        })
    })

    describe('cancelPendingToolApprovals', () => {
        it('denies every open approval and flips its card to denied', async () => {
            const store = useProductExpertStore()
            const promise = store.requestToolApproval({ tool: 'write-flow', name: 'Write Flow' })
            const id = useProductExpertSupportAgentStore().messages[0].answer[0].id

            store.cancelPendingToolApprovals()

            await expect(promise).resolves.toBe(false)
            expect(permState.statuses[id]).toBe('denied')
            expect(permState.pending.size).toBe(0)
        })

        it('is a no-op when there are no pending approvals', () => {
            const store = useProductExpertStore()
            expect(() => store.cancelPendingToolApprovals()).not.toThrow()
        })
    })
})
