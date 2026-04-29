/**
 * @typedef {Object} DrawerAction
 * @property {string} label - Action label.
 * @property {string|'primary'|'secondary'|'tertiary'|'danger'} kind - Button kind
 * @property {Function} handler - Callback to execute when clicked.
 * @property {boolean} disabled - Disabled state
 * @property {Component} iconLeft - A heroicon to display on the left side of the button.
 */

/**
 * @typedef {Object} DrawerStackEntry
 * @property {Component} component - Vue component rendered for this entry
 * @property {Object} props
 * @property {Object} on - event listeners (handler map)
 * @property {Object} bind
 * @property {{title?: string, actions?: DrawerAction[]}|null} header
 * @property {boolean} closeOnClickOutside
 * @property {boolean} fixed - pinned mode for this entry
 * @property {boolean} wider
 */

import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import { useContextStore } from './context.js'
import { useUxStore } from './ux.js'

const DRAWER_TRANSITION_MS = 300

export const useUxDrawersStore = defineStore('ux-drawers', {
    state: () => ({
        drawer: {
            state: false,
            stack: [],
            side: 'right',
            width: 400,
            pinned: false,
            closing: false,
            // Persisted user preferences for the immersive editor's drawer.
            // `editorSide` lives here (not at the top level) so all drawer
            // user-prefs are in one place. `pinned`/`open` drive ExpertDrawer
            // auto-restore on non-editor pages and the editor drawer's
            // open/closed preference inside the immersive editor.
            expertState: {
                pinned: true,
                open: true,
                fullscreen: false,
                editorSide: 'right'
            }
        }
    }),

    actions: {
        /**
         * Open the drawer.
         * - With options: pushes a view onto the stack and shows the drawer.
         * - Without options: just shows the drawer (used by the immersive
         *   editor on mount, where the drawer's content is slot-driven by
         *   EditorPanel rather than a stack push).
         */
        openDrawer (options = null) {
            const drawer = this.drawer
            if (drawer.closing) return

            if (options) {
                const {
                    component,
                    props = {},
                    on = {},
                    bind = {},
                    header = null,
                    closeOnClickOutside = true,
                    fixed = false,
                    wider = false
                } = options

                drawer.stack.push({
                    component: markRaw(component),
                    props,
                    on,
                    bind,
                    header,
                    closeOnClickOutside,
                    fixed,
                    wider
                })

                if (fixed) drawer.pinned = true
                if (component.name === 'ExpertDrawer') {
                    drawer.expertState.pinned = fixed
                    drawer.expertState.open = true
                }
            }

            drawer.state = true
        },

        /**
         * Close the drawer.
         * - If a stack entry is on top, pops it (revealing the previous entry
         *   or — in the editor — the slot fallback).
         * - If the stack is already empty and the drawer is open, hides it.
         * In immersive editor, also persists `expertState.open = false` so the
         * close survives navigation/refresh.
         */
        closeDrawer () {
            const drawer = this.drawer

            if (drawer.stack.length > 0) {
                const popped = drawer.stack.pop()
                if (popped?.component?.name === 'ExpertDrawer') {
                    drawer.expertState.open = false
                    drawer.expertState.pinned = popped.fixed
                }
                return
            }

            if (!drawer.state) return
            if (useContextStore().isImmersiveEditor) {
                drawer.expertState.open = false
            }
            this._beginCloseTransition(null)
        },

        /**
         * Toggle drawer visibility. In immersive editor, also persists
         * `expertState.open` (the user's open/closed preference) so the choice
         * survives navigation/refresh.
         */
        toggleDrawer () {
            const willOpen = !this.drawer.state
            if (useContextStore().isImmersiveEditor) {
                this.drawer.expertState.open = willOpen
            }
            if (willOpen) this.openDrawer()
            else this.closeDrawer()
        },

        /** Empty the stack and run the close transition. */
        clearDrawer () {
            const drawer = this.drawer
            const top = drawer.stack[drawer.stack.length - 1] || null
            drawer.stack = []
            if (drawer.state) this._beginCloseTransition(top)
        },

        /**
         * Empty the stack without firing the close transition. Used by editor
         * pages on enter to wipe carry-over content (e.g. ExpertDrawer left
         * from a non-editor page) so the editor's slot content can render
         * immediately without a slide-out flash.
         */
        resetDrawerStack () { this.drawer.stack = [] },

        /** Update the top-of-stack entry's header in place. */
        setDrawerHeader ({ header }) {
            const drawer = this.drawer
            if (drawer.stack.length === 0) return
            const top = drawer.stack[drawer.stack.length - 1]
            if (header && header.title !== undefined) {
                top.header = { ...(top.header || {}), title: header.title }
            }
            if (header && header.actions !== undefined) {
                top.header = { ...(top.header || {}), actions: header.actions }
            }
        },

        setDrawerWidth ({ width }) { this.drawer.width = width },

        setDrawerPinned ({ pinned }) { this.drawer.pinned = pinned },

        toggleDrawerPin () { this.drawer.pinned = !this.drawer.pinned },

        /**
         * Set the drawer's rendered side. In immersive editor, also persists
         * the user's editor side preference (`drawer.expertState.editorSide`)
         * so it survives navigation in/out of the editor.
         */
        setDrawerSide (side) {
            if (side !== 'left' && side !== 'right') return
            this.drawer.side = side
            if (useContextStore().isImmersiveEditor) {
                this.drawer.expertState.editorSide = side
            }
        },

        toggleFullscreen () { this.drawer.expertState.fullscreen = !this.drawer.expertState.fullscreen },

        setFullscreen (value) { this.drawer.expertState.fullscreen = !!value },

        /** @private */
        _beginCloseTransition (top) {
            const drawer = this.drawer
            drawer.closing = true
            drawer.state = false

            const uxStore = useUxStore()
            if (uxStore.overlay) uxStore.closeOverlay()

            if (top?.component?.name === 'ExpertDrawer') {
                drawer.expertState.open = false
                drawer.expertState.pinned = top.fixed
            }

            setTimeout(() => { drawer.closing = false }, DRAWER_TRANSITION_MS)
        }
    },

    persist: {
        pick: [
            'drawer.expertState',
            'drawer.width',
            'drawer.pinned'
        ],
        storage: localStorage
    }
})
