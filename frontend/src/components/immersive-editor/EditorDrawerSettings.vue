<template>
    <DropdownMenu
        :options="settingsOptions"
        buttonClass="ff-btn ff-btn--secondary ff-btn-icon"
        data-el="editor-drawer-settings"
    >
        <EyeIcon class="ff-btn--icon" />
    </DropdownMenu>
</template>

<script setup>
import { ArrowsExpandIcon, EyeIcon, LockClosedIcon, LockOpenIcon, SwitchHorizontalIcon } from '@heroicons/vue/outline'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

import DropdownMenu from '../DropdownMenu.vue'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

const drawers = useUxDrawersStore()
const { editorImmersiveDrawer } = storeToRefs(drawers)

const settingsOptions = computed(() => {
    const isLeft = editorImmersiveDrawer.value.side === 'left'
    const isPinned = editorImmersiveDrawer.value.pinned
    const isFullscreen = editorImmersiveDrawer.value.fullscreen

    return [
        {
            name: isLeft ? 'Move to Right' : 'Move to Left',
            icon: SwitchHorizontalIcon,
            action: () => drawers.setEditorImmersiveDrawerSide(isLeft ? 'right' : 'left')
        },
        {
            name: isPinned ? 'Unpin' : 'Pin',
            icon: isPinned ? LockOpenIcon : LockClosedIcon,
            action: () => drawers.toggleEditorImmersiveDrawerPin()
        },
        {
            name: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
            icon: ArrowsExpandIcon,
            action: () => drawers.toggleEditorImmersiveFullscreen()
        }
    ]
})
</script>
