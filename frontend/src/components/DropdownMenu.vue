<template>
    <HeadlessUIMenu v-slot="{ open }" as="div" class="relative inline-block text-left">
        <span v-if="syncOpenState(open)" class="hidden" />
        <div>
            <MenuButton
                ref="trigger"
                :class="[buttonClass ? buttonClass : 'forge-button', !hasLabel?'px-1':'']" :disabled="disabled"
                @click="() => { $nextTick(() => { updateItemsPosition() }) }"
            >
                <slot />
                <span class="sr-only">{{ alt }}</span>
                <ChevronDownIcon class="ff-btn--icon ff-btn--icon-right" aria-hidden="true" />
            </MenuButton>
        </div>

        <teleport to="body">
            <transition
                name="fade"
            >
                <MenuItems
                    v-if="open"
                    ref="menu-items"
                    class="z-[1000] fixed bg-white rounded overflow-hidden shadow-lg ring-1 ring-black ring-opacity-10 focus:outline-none"
                    :style="teleportedStyle"
                >
                    <div class="apx-1 apy-1">
                        <MenuItem
                            v-for="(item, $index) in options" v-slot="{ active }"
                            :key="$index"
                            :disabled="!item || item.disabled === true"
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
            </transition>
        </teleport>
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
                'min-width': this.position.width + 'px'
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
