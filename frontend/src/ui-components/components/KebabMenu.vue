<template>
    <KebabMenu class="relative" as="div">
        <MenuButton
            ref="trigger"
            class="ff-btn ff-btn-icon transition-fade--color"
            :disabled="disabled"
            @click="() => { $nextTick(() => { updateItemsPosition() } ) }"
        >
            <DotsVerticalIcon class="ff-icon ff-icon-lg" />
        </MenuButton>
        <teleport to="body">
            <MenuItems
                ref="menu-items"
                as="ul"
                class="ff-kebab-options"
                data-el="kebab-options"
                :style="{
                    position: 'fixed',
                    top: position.top + 'px',
                    left: position.left + 'px'
                }"
            >
                <slot></slot>
            </MenuItems>
        </teleport>
    </KebabMenu>
</template>

<script>
import {
    Menu,
    MenuButton,
    MenuItems
} from '@headlessui/vue'
import { DotsVerticalIcon } from '@heroicons/vue/solid'

import BoxOptionsMixin from '../../mixins/BoxOptionsMixin.js'

export default {
    name: 'ff-kebab-menu',
    components: {
        DotsVerticalIcon,
        KebabMenu: Menu,
        MenuButton,
        MenuItems
    },
    mixins: [BoxOptionsMixin],
    props: {
        disabled: {
            default: false,
            required: false,
            type: Boolean
        }
    }
}
</script>
