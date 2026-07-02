import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shared, mutable stand-in for the product-assistant store's permission registry.
// Declared via vi.hoisted so both the mock factory (hoisted above the imports) and
// the test body can reach the same state and reset it between cases.
const permState = vi.hoisted(() => ({ session: {}, statuses: {}, catalog: null, catalogHash: null }))

vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: vi.fn(() => ({ featuresCheck: { isExpertAssistantFeatureEnabled: true } }))
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({ team: { id: 't1' }, expert: { teamId: 't1' } }))
}))

// A functional fake of the product-assistant permission API. HITL is now stateless:
// the store holds the open approval batch itself, so the permission store only records
// session grants and per-card outcome statuses.
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
        clearToolApprovalStatuses: () => { permState.statuses = {} }
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
const { default: expertApi } = await import('@/api/expert.js')

// Build the approval cards the agent returns on a deferred turn, in the shape
// handleMessageResponse hands to beginApprovalBatch.
const card = (id, toolKey, extra = {}) => ({
    kind: 'tool-approval',
    id,
    toolUseId: id,
    toolKey,
    name: extra.name || toolKey,
    toolClass: extra.toolClass || 'write',
    params: extra.params || {},
    status: 'pending'
})

describe('product-expert store — tool permissions (HITL, #421)', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
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

    describe('beginApprovalBatch', () => {
        it('tracks one entry per card that has an id', () => {
            const store = useProductExpertStore()
            store.beginApprovalBatch([card('u1', 'write-flow'), card('u2', 'delete-flow')])
            expect(store._approvalBatch.remaining).toBe(2)
            expect(store._approvalBatch.toolKeys).toEqual({ u1: 'write-flow', u2: 'delete-flow' })
        })

        it('leaves no batch open for an empty card list', () => {
            const store = useProductExpertStore()
            store.beginApprovalBatch([])
            expect(store._approvalBatch).toBeNull()
        })
    })

    describe('resolveToolApproval', () => {
        it('records the decision, marks the card approved, and resumes once the batch is complete', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow')])

            store.resolveToolApproval({ id: 'u1', approved: true })

            expect(permState.statuses.u1).toBe('approved')
            expect(resume).toHaveBeenCalledWith({ u1: 'approved' })
            // the batch is cleared once resumed
            expect(store._approvalBatch).toBeNull()
        })

        it('records a session grant and marks the card always-allowed when always is set', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow')])

            store.resolveToolApproval({ id: 'u1', approved: true, always: true })

            expect(permState.session['write-flow']).toBe('allow')
            expect(permState.statuses.u1).toBe('always-allowed')
            expect(resume).toHaveBeenCalledWith({ u1: 'approved' })
        })

        it('marks the card always-denied and grants a session deny', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow')])

            store.resolveToolApproval({ id: 'u1', approved: false, always: true })

            expect(permState.session['write-flow']).toBe('deny')
            expect(permState.statuses.u1).toBe('always-denied')
            expect(resume).toHaveBeenCalledWith({ u1: 'denied' })
        })

        it('waits for every card in the batch before resuming, then sends all decisions', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow'), card('u2', 'delete-flow')])

            store.resolveToolApproval({ id: 'u1', approved: true })
            expect(resume).not.toHaveBeenCalled()

            store.resolveToolApproval({ id: 'u2', approved: false })
            expect(resume).toHaveBeenCalledWith({ u1: 'approved', u2: 'denied' })
        })

        it('ignores a second decision for the same card', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow')])

            store.resolveToolApproval({ id: 'u1', approved: true })
            store.resolveToolApproval({ id: 'u1', approved: false })

            expect(resume).toHaveBeenCalledTimes(1)
        })

        it('does nothing for an unknown approval id', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow')])
            expect(() => store.resolveToolApproval({ id: 'nope', approved: true })).not.toThrow()
            expect(resume).not.toHaveBeenCalled()
        })
    })

    describe('cancelPendingToolApprovals', () => {
        it('flips every unanswered card to denied and drops the batch without resuming', () => {
            const store = useProductExpertStore()
            const resume = vi.spyOn(store, 'resumeToolApprovals').mockResolvedValue()
            store.beginApprovalBatch([card('u1', 'write-flow'), card('u2', 'delete-flow')])

            store.cancelPendingToolApprovals()

            expect(permState.statuses.u1).toBe('denied')
            expect(permState.statuses.u2).toBe('denied')
            expect(store._approvalBatch).toBeNull()
            expect(resume).not.toHaveBeenCalled()
        })

        it('is a no-op when there is no open batch', () => {
            const store = useProductExpertStore()
            expect(() => store.cancelPendingToolApprovals()).not.toThrow()
        })
    })
})
