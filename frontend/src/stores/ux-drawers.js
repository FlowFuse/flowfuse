/**
 * @typedef {Object} DrawerAction
 * @property {string} label - Action label.
 * @property {string|'primary'|'secondary'|'tertiary'|'danger'} kind - Button kind
 * @property {Function} handler - Callback to execute when clicked.
 * @property {boolean} disabled - Disabled state
 * @property {Component} iconLeft - A heroicon to display on the left side of the button.
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import { useUxNavigationStore } from './ux-navigation.js'
import { useUxStore } from './ux.js'

export const useUxDrawersStore = defineStore('ux-drawers', {
    state: () => ({
        editorImmersiveDrawer: {
            active: false,
            state: true,
            side: 'right',
            width: 550,
            pinned: true,
            fullscreen: false,
            viewStack: []
        },
        leftDrawer: {
            state: false,
            component: null
        },
        rightDrawer: {
            state: false,
            expertState: {
                pinned: true,
                open: true
            },
            component: null,
            header: null,
            wider: false,
            fixed: false,
            closeOnClickOutside: true,
            pinned: false,
            closing: false,
            props: {},
            on: {},
            bind: {}
        }
    }),

    getters: {
        hiddenLeftDrawer (state) {
            const navStore = useUxNavigationStore()
            return state.leftDrawer.component?.name === 'MainNav' && navStore.mainNavContext.length === 0
        }
    },

    actions: {
        openRightDrawer ({
            component,
            header = null,
            wider = false,
            fixed = false,
            closeOnClickOutside = true,
            props = {},
            on = {},
            bind = {},
            overlay = false
        }) {
            // In immersive editor context, push onto the editor drawer view stack
            if (this.editorImmersiveDrawer.active) {
                if (!this.editorImmersiveDrawer.state) {
                    this.editorImmersiveDrawer.state = true
                }
                this.pushEditorImmersiveView({
                    component: markRaw(component),
                    props,
                    events: on,
                    title: header?.title || ''
                })
                return
            }

            // Don't allow opening while drawer is currently closing
            if (this.rightDrawer.closing) return

            if (this.rightDrawer.state && component.name === this.rightDrawer.component?.name) return

            const openDrawer = () => {
                if (component.name === 'ExpertDrawer') {
                    // save the ExpertDrawer pinned/open state (expertState is persistent)
                    this.rightDrawer.expertState.pinned = fixed
                    this.rightDrawer.expertState.open = true
                }
                this.rightDrawer.state = true
                this.rightDrawer.wider = wider
                this.rightDrawer.fixed = fixed
                this.rightDrawer.closeOnClickOutside = closeOnClickOutside
                this.rightDrawer.component = markRaw(component)
                this.rightDrawer.header = header
                this.rightDrawer.props = props
                this.rightDrawer.on = on
                this.rightDrawer.bind = bind

                // Only show overlay if requested and drawer is not pinned
                if (overlay && !this.rightDrawer.pinned) {
                    useUxStore().openOverlay()
                }
            }

            if (this.rightDrawer.state) {
                this._closeRightDrawerImmediate()
                setTimeout(openDrawer, 300)
            } else {
                openDrawer()
            }
        },

        closeRightDrawer () {
            // In immersive editor context, pop the editor drawer view stack
            if (this.editorImmersiveDrawer.active && this.editorImmersiveDrawer.viewStack.length > 0) {
                this.popEditorImmersiveView()
                return
            }

            if (this.rightDrawer.component?.name === 'ExpertDrawer') {
                // save the ExpertDrawer pinned/open state (expertState is persistent)
                this.rightDrawer.expertState.open = false
                this.rightDrawer.expertState.pinned = this.rightDrawer.fixed
            }
            // Set closing flag to prevent reopens during transition
            this.rightDrawer.closing = true

            // Immediately hide drawer by removing .open class
            this._closeRightDrawerImmediate()

            // Close overlay if present
            const uxStore = useUxStore()
            if (uxStore.overlay) {
                uxStore.closeOverlay()
            }

            // Wait for CSS transition (300ms) before full cleanup
            setTimeout(() => {
                // Only do full cleanup if drawer is still closed
                if (!this.rightDrawer.state) {
                    this.rightDrawer.wider = false
                    this.rightDrawer.fixed = false
                    this.rightDrawer.component = null
                    this.rightDrawer.header = null
                    this.rightDrawer.pinned = false
                    this.rightDrawer.props = {}
                    this.rightDrawer.on = {}
                    this.rightDrawer.bind = {}
                }
                // Clear closing flag
                this.rightDrawer.closing = false
            }, 300)
        },

        /** @private */
        _closeRightDrawerImmediate () {
            // Set state, fixed, and pinned to false immediately to prevent
            // mid-transition class changes that cause width to expand
            this.rightDrawer.state = false
            this.rightDrawer.fixed = false
            this.rightDrawer.pinned = false
        },

        /**
         * Updates the right drawer header.
         *
         * @param {Object} header - The header object containing properties for the right drawer.
         * @param {string} [header.title] - The title to set for the right drawer header.
         * @param {DrawerAction[]} [header.actions] - An array of actions to set for the right drawer header.
         */
        setRightDrawerHeader (header) {
            // In immersive editor context, route into the top of the view stack so
            // the EditorDrawer's stacked header renders title + actions in place.
            if (this.editorImmersiveDrawer.active && this.editorImmersiveDrawer.viewStack.length > 0) {
                const top = this.editorImmersiveDrawer.viewStack[this.editorImmersiveDrawer.viewStack.length - 1]
                if (header.title !== undefined) top.title = header.title
                if (header.actions !== undefined) top.actions = header.actions
                return
            }
            if (header.title) {
                this.setRightDrawerTitle(header.title)
            }
            if (header.actions) {
                this.setRightDrawerActions(header.actions)
            }
        },

        setRightDrawerTitle (title) {
            if (this.rightDrawer.header) {
                this.rightDrawer.header.title = title
            } else {
                this.rightDrawer.header = { title }
            }
        },

        setRightDrawerActions (actions) {
            if (this.rightDrawer.header) {
                this.rightDrawer.header.actions = actions
            } else {
                this.rightDrawer.header = { actions }
            }
        },

        setRightDrawerWider (wider) {
            this.rightDrawer.wider = wider
        },

        /**
         * Toggles the fixed/pinned state of the right drawer.
         * When fixed, the drawer becomes part of the page layout and stays open.
         */
        togglePinDrawer () {
            const newFixedState = !this.rightDrawer.fixed
            this.rightDrawer.fixed = newFixedState
            this.rightDrawer.pinned = newFixedState
            this.rightDrawer.closeOnClickOutside = !newFixedState
            if (this.rightDrawer.component?.name === 'ExpertDrawer') {
                // save the ExpertDrawer pinned/open state (expertState is persistent)
                this.rightDrawer.expertState.open = this.rightDrawer.state
                this.rightDrawer.expertState.pinned = newFixedState
            }

            // Always close overlay when toggling (whether fixing or unfixing)
            const uxStore = useUxStore()
            if (uxStore.overlay) {
                uxStore.closeOverlay()
            }
        },

        // Editor Immersive Drawer actions
        toggleEditorImmersiveDrawer () {
            this.editorImmersiveDrawer.state = !this.editorImmersiveDrawer.state
        },

        openEditorImmersiveDrawer () {
            this.editorImmersiveDrawer.state = true
        },

        closeEditorImmersiveDrawer () {
            this.editorImmersiveDrawer.state = false
        },

        setEditorImmersiveDrawerSide (side) {
            this.editorImmersiveDrawer.side = side
        },

        toggleEditorImmersiveDrawerPin () {
            this.editorImmersiveDrawer.pinned = !this.editorImmersiveDrawer.pinned
        },

        toggleEditorImmersiveFullscreen () {
            this.editorImmersiveDrawer.fullscreen = !this.editorImmersiveDrawer.fullscreen
        },

        setEditorImmersiveDrawerWidth (width) {
            this.editorImmersiveDrawer.width = width
        },

        setEditorImmersiveActive (active) {
            this.editorImmersiveDrawer.active = active
        },

        pushEditorImmersiveView ({ component, props = {}, events = {}, title = '', actions = [] }) {
            this.editorImmersiveDrawer.viewStack.push({ component, props, events, title, actions })
        },

        popEditorImmersiveView () {
            this.editorImmersiveDrawer.viewStack.pop()
        },

        clearEditorImmersiveViewStack () {
            this.editorImmersiveDrawer.viewStack = []
        },

        openLeftDrawer () {
            this.leftDrawer.state = true
        },

        closeLeftDrawer () {
            this.leftDrawer.state = false
        },

        toggleLeftDrawer () {
            this.leftDrawer.state = !this.leftDrawer.state
        },

        setLeftDrawer (component) {
            this.leftDrawer.component = component ? markRaw(component) : null
        }
    },
    persist: {
        pick: [
            'rightDrawer.expertState',
            'editorImmersiveDrawer.state',
            'editorImmersiveDrawer.side',
            'editorImmersiveDrawer.width',
            'editorImmersiveDrawer.pinned',
            'editorImmersiveDrawer.fullscreen'
        ],
        storage: localStorage
    }
})
