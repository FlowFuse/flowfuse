import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

// --- ux-navigation mock ---
const mockNavStore = {
    overlay: false,
    mainNavContext: [],
    openOverlay: vi.fn(),
    closeOverlay: vi.fn()
}

vi.mock('@/stores/ux-navigation.js', () => ({
    useUxNavigationStore: vi.fn(() => mockNavStore)
}))

// Stub components for testing
const FakeComponent = { name: 'FakeComponent' }
const AnotherComponent = { name: 'AnotherComponent' }
const MainNavComponent = { name: 'MainNav' }

describe('ux-drawers store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        // Reset nav mock state to defaults
        mockNavStore.overlay = false
        mockNavStore.mainNavContext = []
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // -------------------------------------------------------------------------
    // Initial state
    // -------------------------------------------------------------------------

    it('initializes with both drawers closed', () => {
        const store = useUxDrawersStore()
        expect(store.leftDrawer.state).toBe(false)
        expect(store.leftDrawer.component).toBeNull()
        expect(store.rightDrawer.state).toBe(false)
        expect(store.rightDrawer.component).toBeNull()
        expect(store.rightDrawer.wider).toBe(false)
        expect(store.rightDrawer.fixed).toBe(false)
        expect(store.rightDrawer.pinned).toBe(false)
        expect(store.rightDrawer.closeOnClickOutside).toBe(true)
        expect(store.rightDrawer.closing).toBe(false)
    })

    // -------------------------------------------------------------------------
    // Right drawer — open
    // -------------------------------------------------------------------------

    describe('openRightDrawer', () => {
        it('opens the drawer with component and defaults', () => {
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })
            expect(store.rightDrawer.state).toBe(true)
            expect(store.rightDrawer.component.name).toBe('FakeComponent')
            expect(store.rightDrawer.wider).toBe(false)
            expect(store.rightDrawer.fixed).toBe(false)
            expect(store.rightDrawer.closeOnClickOutside).toBe(true)
            expect(store.rightDrawer.props).toEqual({})
            expect(store.rightDrawer.on).toEqual({})
            expect(store.rightDrawer.bind).toEqual({})
        })

        it('passes through all options', () => {
            const store = useUxDrawersStore()
            const props = { foo: 'bar' }
            store.openRightDrawer({
                component: FakeComponent,
                header: { title: 'Test' },
                wider: true,
                fixed: true,
                closeOnClickOutside: false,
                props,
                on: { close: vi.fn() },
                bind: { class: 'test' }
            })
            expect(store.rightDrawer.header).toEqual({ title: 'Test' })
            expect(store.rightDrawer.wider).toBe(true)
            expect(store.rightDrawer.fixed).toBe(true)
            expect(store.rightDrawer.closeOnClickOutside).toBe(false)
            expect(store.rightDrawer.props).toStrictEqual(props)
        })

        it('does not open while drawer is closing', () => {
            const store = useUxDrawersStore()
            store.rightDrawer.closing = true
            store.openRightDrawer({ component: FakeComponent })
            expect(store.rightDrawer.state).toBe(false)
        })

        it('does not reopen if same component is already open', () => {
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })
            store.rightDrawer.header = { title: 'original' }
            // Try to open the same component again
            store.openRightDrawer({ component: FakeComponent, header: { title: 'new' } })
            // Header should not have changed
            expect(store.rightDrawer.header).toEqual({ title: 'original' })
        })

        it('calls openOverlay when overlay=true and drawer is not pinned', () => {
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent, overlay: true })
            expect(mockNavStore.openOverlay).toHaveBeenCalledOnce()
        })

        it('does not call openOverlay when drawer is pinned', () => {
            const store = useUxDrawersStore()
            store.rightDrawer.pinned = true
            store.openRightDrawer({ component: FakeComponent, overlay: true })
            expect(mockNavStore.openOverlay).not.toHaveBeenCalled()
        })

        it('does not call openOverlay when overlay=false (default)', () => {
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })
            expect(mockNavStore.openOverlay).not.toHaveBeenCalled()
        })

        it('closes then reopens with new component after 300ms delay when already open', () => {
            vi.useFakeTimers()
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })
            expect(store.rightDrawer.state).toBe(true)

            // Open a different component while drawer is open
            store.openRightDrawer({ component: AnotherComponent })

            // Immediately after: drawer is closed (immediate close triggered)
            expect(store.rightDrawer.state).toBe(false)
            expect(store.rightDrawer.component.name).toBe('FakeComponent') // Not yet swapped

            // After 300ms timeout fires
            vi.advanceTimersByTime(300)
            expect(store.rightDrawer.state).toBe(true)
            expect(store.rightDrawer.component.name).toBe('AnotherComponent')
        })
    })

    // -------------------------------------------------------------------------
    // Right drawer — close
    // -------------------------------------------------------------------------

    describe('closeRightDrawer', () => {
        it('sets closing flag and immediately hides the drawer', () => {
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })

            store.closeRightDrawer()

            expect(store.rightDrawer.closing).toBe(true)
            expect(store.rightDrawer.state).toBe(false)
            expect(store.rightDrawer.fixed).toBe(false)
            expect(store.rightDrawer.pinned).toBe(false)
        })

        it('closes the overlay if it is open', () => {
            const store = useUxDrawersStore()
            mockNavStore.overlay = true
            store.openRightDrawer({ component: FakeComponent })

            store.closeRightDrawer()

            expect(mockNavStore.closeOverlay).toHaveBeenCalledOnce()
        })

        it('does not call closeOverlay when overlay is not open', () => {
            const store = useUxDrawersStore()
            mockNavStore.overlay = false
            store.openRightDrawer({ component: FakeComponent })

            store.closeRightDrawer()

            expect(mockNavStore.closeOverlay).not.toHaveBeenCalled()
        })

        it('cleans up drawer state after 300ms', () => {
            vi.useFakeTimers()
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent, header: { title: 'Test' }, wider: true })

            store.closeRightDrawer()
            vi.advanceTimersByTime(300)

            expect(store.rightDrawer.component).toBeNull()
            expect(store.rightDrawer.header).toBeNull()
            expect(store.rightDrawer.wider).toBe(false)
            expect(store.rightDrawer.props).toEqual({})
            expect(store.rightDrawer.on).toEqual({})
            expect(store.rightDrawer.bind).toEqual({})
            expect(store.rightDrawer.closing).toBe(false)
        })

        it('closing guard prevents reopen during close transition', () => {
            vi.useFakeTimers()
            const store = useUxDrawersStore()
            store.openRightDrawer({ component: FakeComponent })
            store.closeRightDrawer()

            // Attempt to open a new component while closing flag is set
            store.openRightDrawer({ component: AnotherComponent })

            // Guard should have blocked the reopen — state stays false
            expect(store.rightDrawer.state).toBe(false)

            // After 300ms cleanup runs — component is nulled out
            vi.advanceTimersByTime(300)
            expect(store.rightDrawer.component).toBeNull()
            expect(store.rightDrawer.closing).toBe(false)
        })
    })

    // -------------------------------------------------------------------------
    // Right drawer header
    // -------------------------------------------------------------------------

    describe('setRightDrawerTitle', () => {
        it('creates a header with title if none exists', () => {
            const store = useUxDrawersStore()
            store.setRightDrawerTitle('My Title')
            expect(store.rightDrawer.header).toEqual({ title: 'My Title' })
        })

        it('updates title on existing header', () => {
            const store = useUxDrawersStore()
            store.rightDrawer.header = { title: 'Old', actions: [] }
            store.setRightDrawerTitle('New Title')
            expect(store.rightDrawer.header.title).toBe('New Title')
            expect(store.rightDrawer.header.actions).toEqual([])
        })
    })

    describe('setRightDrawerActions', () => {
        it('creates a header with actions if none exists', () => {
            const store = useUxDrawersStore()
            const actions = [{ label: 'Save', handler: vi.fn() }]
            store.setRightDrawerActions(actions)
            expect(store.rightDrawer.header).toEqual({ actions })
        })

        it('updates actions on existing header', () => {
            const store = useUxDrawersStore()
            store.rightDrawer.header = { title: 'Drawer', actions: [] }
            const actions = [{ label: 'Delete', handler: vi.fn() }]
            store.setRightDrawerActions(actions)
            expect(store.rightDrawer.header.title).toBe('Drawer')
            expect(store.rightDrawer.header.actions).toStrictEqual(actions)
        })
    })

    describe('setRightDrawerHeader', () => {
        it('sets both title and actions when both are provided', () => {
            const store = useUxDrawersStore()
            const actions = [{ label: 'OK' }]
            store.setRightDrawerHeader({ title: 'Header', actions })
            expect(store.rightDrawer.header.title).toBe('Header')
            expect(store.rightDrawer.header.actions).toStrictEqual(actions)
        })

        it('sets only title when actions are absent', () => {
            const store = useUxDrawersStore()
            store.setRightDrawerHeader({ title: 'Title Only' })
            expect(store.rightDrawer.header.title).toBe('Title Only')
            expect(store.rightDrawer.header.actions).toBeUndefined()
        })

        it('sets only actions when title is absent', () => {
            const store = useUxDrawersStore()
            const actions = [{ label: 'Go' }]
            store.setRightDrawerHeader({ actions })
            expect(store.rightDrawer.header.actions).toStrictEqual(actions)
            expect(store.rightDrawer.header.title).toBeUndefined()
        })
    })

    // -------------------------------------------------------------------------
    // Right drawer — wider / pin
    // -------------------------------------------------------------------------

    it('setRightDrawerWider updates the wider flag', () => {
        const store = useUxDrawersStore()
        store.setRightDrawerWider(true)
        expect(store.rightDrawer.wider).toBe(true)
        store.setRightDrawerWider(false)
        expect(store.rightDrawer.wider).toBe(false)
    })

    describe('togglePinDrawer', () => {
        it('pins the drawer and disables closeOnClickOutside', () => {
            const store = useUxDrawersStore()
            store.togglePinDrawer()
            expect(store.rightDrawer.fixed).toBe(true)
            expect(store.rightDrawer.pinned).toBe(true)
            expect(store.rightDrawer.closeOnClickOutside).toBe(false)
        })

        it('unpins the drawer and re-enables closeOnClickOutside', () => {
            const store = useUxDrawersStore()
            store.rightDrawer.fixed = true
            store.rightDrawer.pinned = true
            store.rightDrawer.closeOnClickOutside = false
            store.togglePinDrawer()
            expect(store.rightDrawer.fixed).toBe(false)
            expect(store.rightDrawer.pinned).toBe(false)
            expect(store.rightDrawer.closeOnClickOutside).toBe(true)
        })

        it('closes overlay when toggling if overlay is open', () => {
            const store = useUxDrawersStore()
            mockNavStore.overlay = true
            store.togglePinDrawer()
            expect(mockNavStore.closeOverlay).toHaveBeenCalledOnce()
        })

        it('does not call closeOverlay when overlay is already closed', () => {
            const store = useUxDrawersStore()
            mockNavStore.overlay = false
            store.togglePinDrawer()
            expect(mockNavStore.closeOverlay).not.toHaveBeenCalled()
        })
    })

    // -------------------------------------------------------------------------
    // Left drawer
    // -------------------------------------------------------------------------

    describe('left drawer actions', () => {
        it('openLeftDrawer sets state to true', () => {
            const store = useUxDrawersStore()
            store.openLeftDrawer()
            expect(store.leftDrawer.state).toBe(true)
        })

        it('closeLeftDrawer sets state to false', () => {
            const store = useUxDrawersStore()
            store.leftDrawer.state = true
            store.closeLeftDrawer()
            expect(store.leftDrawer.state).toBe(false)
        })

        it('toggleLeftDrawer flips state', () => {
            const store = useUxDrawersStore()
            store.toggleLeftDrawer()
            expect(store.leftDrawer.state).toBe(true)
            store.toggleLeftDrawer()
            expect(store.leftDrawer.state).toBe(false)
        })

        it('setLeftDrawer assigns the component', () => {
            const store = useUxDrawersStore()
            store.setLeftDrawer(FakeComponent)
            expect(store.leftDrawer.component.name).toBe('FakeComponent')
        })

        it('setLeftDrawer with null clears the component', () => {
            const store = useUxDrawersStore()
            store.setLeftDrawer(FakeComponent)
            store.setLeftDrawer(null)
            expect(store.leftDrawer.component).toBeNull()
        })
    })

    // -------------------------------------------------------------------------
    // hiddenLeftDrawer getter
    // -------------------------------------------------------------------------

    describe('hiddenLeftDrawer getter', () => {
        it('returns false when component is not MainNav', () => {
            const store = useUxDrawersStore()
            store.setLeftDrawer(FakeComponent)
            mockNavStore.mainNavContext = []
            expect(store.hiddenLeftDrawer).toBe(false)
        })

        it('returns false when component is MainNav but context is non-empty', () => {
            const store = useUxDrawersStore()
            store.setLeftDrawer(MainNavComponent)
            mockNavStore.mainNavContext = [{ entries: [] }]
            expect(store.hiddenLeftDrawer).toBe(false)
        })

        it('returns false when component is null', () => {
            const store = useUxDrawersStore()
            mockNavStore.mainNavContext = []
            expect(store.hiddenLeftDrawer).toBe(false)
        })

        it('returns true when component is MainNav and context is empty', () => {
            const store = useUxDrawersStore()
            store.setLeftDrawer(MainNavComponent)
            mockNavStore.mainNavContext = []
            expect(store.hiddenLeftDrawer).toBe(true)
        })
    })
})
