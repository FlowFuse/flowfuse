import { nextTick, reactive, ref } from 'vue'

import { getServiceFactory } from '../services/service.factory.js'

export function useDrawerHelper () {
    const serviceFactory = getServiceFactory()
    const $services = serviceFactory.$serviceInstances

    const drawer = reactive({ open: false })

    const isMouseInDrawer = ref(false)
    let teaseCloseTimeout = null
    const isInitialTease = ref(false)

    let containerEl = null
    let getInstance = null
    let setEditorWidth = null
    let defaultWidth = null

    function bindDrawer ({
        containerEl: getEl,
        getInstance: getInst,
        setEditorWidth: setWidth,
        defaultWidth: width
    } = {}) {
        containerEl = getEl
        getInstance = getInst
        setEditorWidth = setWidth
        defaultWidth = width
    }

    function notifyDrawerState () {
        const instance = getInstance()

        if (!containerEl || !instance) return

        const iframe = window.frames['immersive-editor-iframe']

        if (iframe) {
            const targetOrigin = instance.url || window.location.origin

            $services.messaging.sendMessage({
                message: {
                    type: 'drawer-state',
                    payload: { open: drawer.open }
                },
                target: iframe,
                targetOrigin
            })
        }
    }

    function toggleDrawer () {
        if (drawer.open) {
            drawer.open = false
        } else {
            drawer.open = true
            if (setEditorWidth && defaultWidth != null) {
                setEditorWidth(defaultWidth)
            }
        }
        nextTick(() => {
            notifyDrawerState()
        })
    }

    function handleDrawerMouseEnter () {
        if (isInitialTease.value) {
            isMouseInDrawer.value = true
        }
    }

    function handleDrawerMouseLeave () {
        if (isInitialTease.value) {
            isMouseInDrawer.value = false
            if (teaseCloseTimeout) {
                clearTimeout(teaseCloseTimeout)
                teaseCloseTimeout = setTimeout(() => {
                    if (!isMouseInDrawer.value && drawer.open) {
                        toggleDrawer()
                    }
                    isInitialTease.value = false
                    teaseCloseTimeout = null
                }, 2000)
            }
        }
    }

    function runInitialTease () {
        setTimeout(() => {
            isInitialTease.value = true
            toggleDrawer()
            teaseCloseTimeout = setTimeout(() => {
                if (!isMouseInDrawer.value) {
                    toggleDrawer()
                }
                isInitialTease.value = false
                teaseCloseTimeout = null
            }, 2000)
        }, 1200)
    }

    function cleanup () {
        if (teaseCloseTimeout) {
            clearTimeout(teaseCloseTimeout)
            teaseCloseTimeout = null
        }
    }

    return {
        drawer,
        toggleDrawer,
        notifyDrawerState,
        handleDrawerMouseEnter,
        handleDrawerMouseLeave,
        runInitialTease,
        bindDrawer,
        cleanup
    }
}
