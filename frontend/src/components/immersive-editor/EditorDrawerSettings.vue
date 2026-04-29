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
const { drawer } = storeToRefs(drawers)

const settingsOptions = computed(() => {
    const isLeft = drawer.value.side === 'left'
    const isPinned = drawer.value.pinned
    const isFullscreen = drawer.value.expertState.fullscreen

    return [
        {
            name: isLeft ? 'Move to Right' : 'Move to Left',
            icon: SwitchHorizontalIcon,
            action: () => {
                const newSide = isLeft ? 'right' : 'left'
                drawers.setDrawerSide(newSide)
            }
        },
        {
            name: isPinned ? 'Unpin' : 'Pin',
            icon: isPinned ? LockOpenIcon : LockClosedIcon,
            action: () => drawers.toggleDrawerPin()
        },
        {
            name: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
            icon: ArrowsExpandIcon,
            action: () => drawers.toggleFullscreen()
        }
    ]
})
</script>
