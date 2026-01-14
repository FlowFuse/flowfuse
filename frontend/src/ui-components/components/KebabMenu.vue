<template>
    <KebabMenu class="relative ff-kebab-menu" as="div" data-el="kebab-menu">
        <MenuButton
            ref="trigger"
            class="ff-btn ff-btn-icon transition-fade--color"
            :disabled="disabled"
            @click="() => { $nextTick(() => { updateItemsPosition() } ) }"
            @keydown.space="() => { $nextTick(() => { updateItemsPosition() } ) }"
        >
            <DotsVerticalIcon class="ff-icon ff-icon-lg" />
        </MenuButton>
        <teleport to="body">
            <transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
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
            </transition>
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

import TeleportedMenuMixin from '../../mixins/TeleportedMenuMixin.js'

export default {
    name: 'ff-kebab-menu',
    components: {
        DotsVerticalIcon,
        KebabMenu: Menu,
        MenuButton,
        MenuItems
    },
    mixins: [TeleportedMenuMixin],
    props: {
        disabled: {
            default: false,
            required: false,
            type: Boolean
        }
    }
}
</script>
