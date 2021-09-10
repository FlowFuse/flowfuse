<template>
    <Menu as="div" class="relative inline-block text-left">
        <div>
            <MenuButton class="forge-button" :class="buttonClass">
                <slot></slot>
                <span class="sr-only">{{ alt }}</span>
                <ChevronDownIcon class="w-5 h-5 my-1 ml-2 -mr-1 text-violet-200 hover:text-violet-100" aria-hidden="true" />
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
        <MenuItems class="z-50 absolute right-0 w-56 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div class="px-1 py-1">
                <MenuItem v-for="item in options" :key="item.name" v-slot="{ active }">
                    <template v-if="item.path">
                        <router-link :to="item" :class="[active ? 'bg-gray-200' : '', 'block px-4 py-2 text-sm text-gray-700']">{{ item.name }}</router-link>
                    </template>
                    <template v-else>
                        <a @click="item.action" :class="[active ? 'bg-gray-200' : '', 'block px-4 py-2 text-sm text-gray-700']">{{ item.name }}</a>
                    </template>

                </MenuItem>
            </div>
        </MenuItems>
      </transition>
    </Menu>
</template>
<script>
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'

export default {
    name: "DropdownMenu",
    props: [ 'alt' , 'options', 'buttonClass'],
    components: {
        Menu,
        MenuButton,
        MenuItems,
        MenuItem,
        ChevronDownIcon
    },
}
</script>
