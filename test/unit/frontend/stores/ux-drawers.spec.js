import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

// ux-drawers calls useUxStore inside its close-transition logic to clear the
// platform overlay backdrop. Mocked here so the close path doesn't blow up.
const mockUxStore = {
    overlay: false,
    openOverlay: vi.fn(),
    closeOverlay: vi.fn()
}

vi.mock('@/stores/ux.js', () => ({
    useUxStore: vi.fn(() => mockUxStore)
}))

// useContextStore.isImmersiveEditor gates the editor-aware branches in
// toggleDrawer / closeDrawer / setDrawerSide. Tests that need to exercise the
// editor branch toggle this flag before calling the action.
const mockContextStore = { isImmersiveEditor: false }

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => mockContextStore)
}))

const FakeComponent = { name: 'FakeComponent' }
const AnotherComponent = { name: 'AnotherComponent' }
const ExpertDrawerComponent = { name: 'ExpertDrawer' }

describe('ux-drawers store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockUxStore.overlay = false
        mockContextStore.isImmersiveEditor = false
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // -------------------------------------------------------------------------
    // Initial state
    // -------------------------------------------------------------------------

    describe('initial state', () => {
        it('initializes a single drawer slot, closed, with empty stack', () => {
            const store = useUxDrawersStore()
            expect(store.drawer.state).toBe(false)
            expect(store.drawer.stack).toEqual([])
            expect(store.drawer.side).toBe('right')
            expect(store.drawer.pinned).toBe(false)
            expect(store.drawer.closing).toBe(false)
        })

        it('has expertState bundling all persisted user preferences', () => {
            const store = useUxDrawersStore()
            expect(store.drawer.expertState).toEqual({
                pinned: true,
                open: true,
                fullscreen: false,
                editorSide: 'right'
            })
        })
    })

    // -------------------------------------------------------------------------
    // openDrawer (polymorphic: push view, or just show)
    // -------------------------------------------------------------------------

    describe('openDrawer', () => {
        it('with options pushes a view and shows the drawer', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent })
            expect(store.drawer.stack).toHaveLength(1)
            expect(store.drawer.stack[0].component.name).toBe('FakeComponent')
            expect(store.drawer.state).toBe(true)
        })

        it('with no args just shows the drawer (slot-driven editor case)', () => {
            const store = useUxDrawersStore()
            store.openDrawer()
            expect(store.drawer.state).toBe(true)
            expect(store.drawer.stack).toHaveLength(0)
        })

        it('preserves props, on, header for the entry', () => {
            const store = useUxDrawersStore()
            const handler = vi.fn()
            store.openDrawer({
                component: FakeComponent,
                props: { id: 1 },
                on: { close: handler },
                header: { title: 'Hello' }
            })
            const entry = store.drawer.stack[0]
            expect(entry.props).toEqual({ id: 1 })
            expect(entry.on.close).toBe(handler)
            expect(entry.header.title).toBe('Hello')
        })

        it('stacks views without replacing previous', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent })
            store.openDrawer({ component: AnotherComponent })
            expect(store.drawer.stack).toHaveLength(2)
            expect(store.drawer.stack[1].component.name).toBe('AnotherComponent')
        })

        it('updates expertState and pins drawer when opening ExpertDrawer with fixed:true', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: ExpertDrawerComponent, fixed: true })
            expect(store.drawer.expertState.open).toBe(true)
            expect(store.drawer.expertState.pinned).toBe(true)
            expect(store.drawer.pinned).toBe(true)
        })

        it('does not push while drawer is mid-close transition', () => {
            const store = useUxDrawersStore()
            store.drawer.closing = true
            store.openDrawer({ component: FakeComponent })
            expect(store.drawer.stack).toHaveLength(0)
        })
    })

    // -------------------------------------------------------------------------
    // closeDrawer (polymorphic: pop top, or hide)
    // -------------------------------------------------------------------------

    describe('closeDrawer', () => {
        it('pops the top stack entry when stack is non-empty', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent })
            store.openDrawer({ component: AnotherComponent })
            store.closeDrawer()
            expect(store.drawer.stack).toHaveLength(1)
            expect(store.drawer.stack[0].component.name).toBe('FakeComponent')
            expect(store.drawer.state).toBe(true)
        })

        it('clears expertState.open when ExpertDrawer is popped', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: ExpertDrawerComponent, fixed: true })
            expect(store.drawer.expertState.open).toBe(true)
            store.closeDrawer()
            expect(store.drawer.expertState.open).toBe(false)
        })

        it('hides the drawer and starts the close transition when stack is empty', () => {
            const store = useUxDrawersStore()
            store.openDrawer()
            store.closeDrawer()
            expect(store.drawer.state).toBe(false)
            expect(store.drawer.closing).toBe(true)
            vi.advanceTimersByTime(300)
            expect(store.drawer.closing).toBe(false)
        })

        it('persists expertState.open=false when hiding from immersive editor', () => {
            mockContextStore.isImmersiveEditor = true
            const store = useUxDrawersStore()
            store.openDrawer()
            store.drawer.expertState.open = true
            store.closeDrawer()
            expect(store.drawer.expertState.open).toBe(false)
            expect(store.drawer.state).toBe(false)
        })

        it('does NOT touch expertState.open when hiding outside the editor', () => {
            const store = useUxDrawersStore()
            store.openDrawer()
            store.drawer.expertState.open = true
            store.closeDrawer()
            expect(store.drawer.expertState.open).toBe(true)
        })

        it('is a no-op when stack is empty and drawer already closed', () => {
            const store = useUxDrawersStore()
            store.closeDrawer()
            expect(store.drawer.closing).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // toggleDrawer
    // -------------------------------------------------------------------------

    describe('toggleDrawer', () => {
        it('flips drawer state', () => {
            const store = useUxDrawersStore()
            store.toggleDrawer()
            expect(store.drawer.state).toBe(true)
            store.toggleDrawer()
            expect(store.drawer.state).toBe(false)
        })

        it('persists expertState.open in immersive editor', () => {
            mockContextStore.isImmersiveEditor = true
            const store = useUxDrawersStore()
            store.drawer.expertState.open = false
            store.toggleDrawer()
            expect(store.drawer.state).toBe(true)
            expect(store.drawer.expertState.open).toBe(true)
            store.toggleDrawer()
            expect(store.drawer.state).toBe(false)
            expect(store.drawer.expertState.open).toBe(false)
        })

        it('does NOT touch expertState.open outside the editor', () => {
            const store = useUxDrawersStore()
            store.drawer.expertState.open = true
            store.toggleDrawer()
            expect(store.drawer.state).toBe(true)
            expect(store.drawer.expertState.open).toBe(true)
        })
    })

    // -------------------------------------------------------------------------
    // clearDrawer / resetDrawerStack
    // -------------------------------------------------------------------------

    describe('clearDrawer', () => {
        it('empties the stack and hides the drawer', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent })
            store.openDrawer({ component: AnotherComponent })
            store.clearDrawer()
            expect(store.drawer.stack).toEqual([])
            expect(store.drawer.state).toBe(false)
        })
    })

    describe('resetDrawerStack', () => {
        it('empties the stack without changing visibility', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent })
            const stateBefore = store.drawer.state
            store.resetDrawerStack()
            expect(store.drawer.stack).toEqual([])
            expect(store.drawer.state).toBe(stateBefore)
            expect(store.drawer.closing).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // Header config
    // -------------------------------------------------------------------------

    describe('setDrawerHeader', () => {
        it('updates top-of-stack title', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent, header: { title: 'Old' } })
            store.setDrawerHeader({ header: { title: 'New' } })
            expect(store.drawer.stack[0].header.title).toBe('New')
        })

        it('updates top-of-stack actions independently of title', () => {
            const store = useUxDrawersStore()
            store.openDrawer({ component: FakeComponent, header: { title: 'Hello' } })
            const actions = [{ label: 'Action' }]
            store.setDrawerHeader({ header: { actions } })
            expect(store.drawer.stack[0].header.title).toBe('Hello')
            expect(store.drawer.stack[0].header.actions).toEqual(actions)
        })

        it('is a no-op on empty stack', () => {
            const store = useUxDrawersStore()
            expect(() => store.setDrawerHeader({ header: { title: 'X' } })).not.toThrow()
        })
    })

    // -------------------------------------------------------------------------
    // Width / pin / side
    // -------------------------------------------------------------------------

    describe('drawer width and pin actions', () => {
        it('setDrawerWidth updates the width', () => {
            const store = useUxDrawersStore()
            store.setDrawerWidth({ width: 600 })
            expect(store.drawer.width).toBe(600)
        })

        it('toggleDrawerPin flips pinned state', () => {
            const store = useUxDrawersStore()
            const before = store.drawer.pinned
            store.toggleDrawerPin()
            expect(store.drawer.pinned).toBe(!before)
        })

        it('setDrawerSide validates and updates drawer.side', () => {
            const store = useUxDrawersStore()
            store.setDrawerSide('left')
            expect(store.drawer.side).toBe('left')
            store.setDrawerSide('garbage')
            // Invalid values are ignored
            expect(store.drawer.side).toBe('left')
        })

        it('setDrawerSide also persists expertState.editorSide in immersive editor', () => {
            mockContextStore.isImmersiveEditor = true
            const store = useUxDrawersStore()
            store.setDrawerSide('left')
            expect(store.drawer.side).toBe('left')
            expect(store.drawer.expertState.editorSide).toBe('left')
        })

        it('setDrawerSide does NOT touch expertState.editorSide outside the editor', () => {
            const store = useUxDrawersStore()
            store.drawer.expertState.editorSide = 'right'
            store.setDrawerSide('left')
            expect(store.drawer.side).toBe('left')
            expect(store.drawer.expertState.editorSide).toBe('right')
        })
    })

    // -------------------------------------------------------------------------
    // Fullscreen
    // -------------------------------------------------------------------------

    describe('fullscreen', () => {
        it('toggleFullscreen flips drawer.expertState.fullscreen', () => {
            const store = useUxDrawersStore()
            expect(store.drawer.expertState.fullscreen).toBe(false)
            store.toggleFullscreen()
            expect(store.drawer.expertState.fullscreen).toBe(true)
            store.toggleFullscreen()
            expect(store.drawer.expertState.fullscreen).toBe(false)
        })

        it('setFullscreen coerces to boolean', () => {
            const store = useUxDrawersStore()
            store.setFullscreen(1)
            expect(store.drawer.expertState.fullscreen).toBe(true)
            store.setFullscreen(0)
            expect(store.drawer.expertState.fullscreen).toBe(false)
        })
    })
})
