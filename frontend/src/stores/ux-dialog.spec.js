// frontend/src/tests/stores/ux-dialog.spec.js
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

describe('ux-dialog store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('initializes with empty dialog state', () => {
        const store = useUxDialogStore()
        expect(store.dialog.header).toBeNull()
        expect(store.dialog.text).toBeNull()
    })

    it('showDialogHandlers sets dialog properties from object payload', () => {
        const store = useUxDialogStore()
        const onConfirm = vi.fn()
        store.showDialogHandlers({
            payload: { header: 'Delete?', text: 'This cannot be undone.', kind: 'danger' },
            onConfirm
        })
        expect(store.dialog.header).toBe('Delete?')
        expect(store.dialog.kind).toBe('danger')
        expect(store.dialog.onConfirm).toBe(onConfirm)
    })

    it('showDialogHandlers splits text into textLines', () => {
        const store = useUxDialogStore()
        store.showDialogHandlers({ payload: { text: 'Line 1\nLine 2' }, onConfirm: vi.fn() })
        expect(store.dialog.textLines).toEqual(['Line 1', 'Line 2'])
    })

    it('clearDialog resets all dialog state', () => {
        const store = useUxDialogStore()
        store.dialog.header = 'Test'
        store.clearDialog()
        expect(store.dialog.header).toBeNull()
    })

    it('clearDialog(true) calls onCancel before resetting', () => {
        const store = useUxDialogStore()
        const onCancel = vi.fn()
        store.dialog.onCancel = onCancel
        store.clearDialog(true)
        expect(onCancel).toHaveBeenCalledOnce()
        expect(store.dialog.header).toBeNull()
    })

    it('setDisablePrimary updates the flag', () => {
        const store = useUxDialogStore()
        store.setDisablePrimary(true)
        expect(store.dialog.disablePrimary).toBe(true)
    })
})
