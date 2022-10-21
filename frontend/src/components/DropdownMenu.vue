<template>
    <HeadlessUIMenu as="div" class="relative inline-block text-left">
        <div>
            <MenuButton :class="[buttonClass ? buttonClass : 'forge-button', !hasLabel?'px-1':'']">
                <slot></slot>
                <span class="sr-only">{{ alt }}</span>
                <ChevronDownIcon :class="[hasLabel?'ml-2 -mr-1 ':'','w-5 h-5 my-1 text-gray-400']" aria-hidden="true" />
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
            <MenuItems :class="[edge === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right','z-50 absolute w-56 mt-1 bg-white divide-y divide-gray-100 rounded overflow-hidden shadow-lg ring-1 ring-black ring-opacity-10 focus:outline-none']">
                <div class="apx-1 apy-1">
                    <MenuItem v-for="(item, $index) in options" v-slot="{ active }" :key="$index" :disabled="!item || item.disabled == true ? true : false">
                        <template v-if="item == null">
                            <hr/>
                        </template>
                        <template v-else-if="item.disabled">
                            <div :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm',...(item.class||[]),'opacity-20']">{{ item.name }}</div>
                        </template>
                        <template v-else-if="item.external">
                            <a :href="item.link" target="_blank" :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]">
                                <component v-if="item.icon" class="w-4 inline" :is="item.icon"></component>
                                <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                                {{ item.name }}
                            </a>
                        </template>
                        <template v-else-if="item.link || item.path">
                            <router-link :to="item.link || item" :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]">
                                <component v-if="item.icon" class="w-4 inline" :is="item.icon"></component>
                                <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                                {{ item.name }}
                            </router-link>
                        </template>
                        <template v-else>
                            <a @click="item.action" :class="[active ? 'bg-gray-200' : '', item.selected? 'bg-gray-100':'', 'block px-4 py-2 text-sm text-gray-700',...(item.class||[])]">
                                <component v-if="item.icon" class="w-4 inline" :is="item.icon"></component>
                                <img v-if="item.imgUrl" :src="item.imgUrl" class="h-4 v-4 inline rounded mr-1"/>
                                {{ item.name }}
                            </a>
                        </template>

                    </MenuItem>
                </div>
            </MenuItems>
        </transition>
    </HeadlessUIMenu>
</template>
<script>

import { ref } from 'vue'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: 'DropdownMenu',
    props: ['alt', 'options', 'buttonClass', 'edge'],
    components: {
        HeadlessUIMenu: Menu,
        MenuButton,
        MenuItems,
        MenuItem,
        ChevronDownIcon
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
