<template>
    <DropdownMenu
        :options="settingsOptions"
        buttonClass="ff-btn ff-btn--secondary ff-btn-icon"
        data-el="editor-drawer-settings"
    >
        <EyeIcon class="ff-btn--icon" />
    </DropdownMenu>
</template>

<script>
import { ArrowsExpandIcon, EyeIcon, LockClosedIcon, LockOpenIcon, SwitchHorizontalIcon } from '@heroicons/vue/outline'
import { mapActions, mapState } from 'pinia'

import DropdownMenu from '../DropdownMenu.vue'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'EditorDrawerSettings',
    components: {
        EyeIcon,
        DropdownMenu
    },
    computed: {
        ...mapState(useUxDrawersStore, ['editorImmersiveDrawer']),
        settingsOptions () {
            const isLeft = this.editorImmersiveDrawer.side === 'left'
            const isPinned = this.editorImmersiveDrawer.pinned
            const isFullscreen = this.editorImmersiveDrawer.fullscreen

            return [
                {
                    name: isLeft ? 'Move to Right' : 'Move to Left',
                    icon: SwitchHorizontalIcon,
                    action: () => this.setEditorImmersiveDrawerSide(isLeft ? 'right' : 'left')
                },
                {
                    name: isPinned ? 'Unpin' : 'Pin',
                    icon: isPinned ? LockOpenIcon : LockClosedIcon,
                    action: () => this.toggleEditorImmersiveDrawerPin()
                },
                {
                    name: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen',
                    icon: ArrowsExpandIcon,
                    action: () => this.toggleEditorImmersiveFullscreen()
                }
            ]
        }
    },
    methods: {
        ...mapActions(useUxDrawersStore, [
            'setEditorImmersiveDrawerSide',
            'toggleEditorImmersiveDrawerPin',
            'toggleEditorImmersiveFullscreen'
        ])
    }
}
</script>
