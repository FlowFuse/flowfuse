<template>
    <HeadlessUIMenu as="div" class="relative inline-block text-left">
        <div>
            <MenuButton
                ref="trigger"
                :class="[buttonClass ? buttonClass : 'forge-button', !hasLabel?'px-1':'']" :disabled="disabled"
                @click="() => { $nextTick(() => { updatePosition(); open = true }) }"
            >
                <slot />
                <span class="sr-only">{{ alt }}</span>
                <ChevronDownIcon class="ff-btn--icon ff-btn--icon-right" aria-hidden="true" />
            </MenuButton>
        </div>
        <transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
        >
            <teleport to="body">
                <MenuItems
                    class="z-[1000] absolute w-56 mt-1 bg-white divide-y divide-gray-100 rounded overflow-hidden shadow-lg ring-1 ring-black ring-opacity-10 focus:outline-none"
                    :style="teleportedStyle"
                >
                    <div class="apx-1 apy-1">
                        <MenuItem
                            v-for="(item, $index) in options" v-slot="{ active }"
                            :key="$index"
                            :disabled="!item || item.disabled == true ? true : false"
                        >
                            <template v-if="item == null">
                                <hr>
                            </template>
                            <template v-else-if="item.disabled">
                                <div :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm',...(item.class||[]),'opacity-20']">{{ item.name }}</div>
                            </template>
                            <template v-else>
                                <a :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]" :data-action="`menu-${item.name.toLowerCase()}`" @click="item.action">
                                    <component :is="item.icon" v-if="item.icon" class="w-4 inline" />
                                    <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1">
                                    {{ item.name }}
                                </a>
                            </template>
                        </MenuItem>
                    </div>
                </MenuItems>
            </teleport>
        </transition>
    </HeadlessUIMenu>
</template>

<script>
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'
import { ref } from 'vue'

import BoxOptionsMixin from '../mixins/BoxOptionsMixin.js'

export default {
    name: 'DropdownMenu',
    props: ['alt', 'options', 'buttonClass', 'edge', 'disabled'],
    components: {
        HeadlessUIMenu: Menu,
        MenuButton,
        MenuItems,
        MenuItem,
        ChevronDownIcon
    },
    mixins: [BoxOptionsMixin],
    computed: {
        teleportedStyle () {
            return {
                top: this.position.top + 10 + 'px',
                left: this.position.left + 'px',
                width: 'fit-content'
            }
        }
    },
    setup (props, { slots }) {
        const hasLabel = ref(false)
        if (slots.default) {
            hasLabel.value = true
        }
        return {
            hasLabel
        }
    }
}
</script>
