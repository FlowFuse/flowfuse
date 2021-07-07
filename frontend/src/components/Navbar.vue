<template>
    <Disclosure as="nav" class="bg-white shadow" v-slot="{ open }">
      <div class="max-w-screen mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <div class="hidden">
              <div class="flex items-baseline space-x-4">
                <template v-for="(item, itemIdx) in navigation" :key="item.name">
                  <template v-if="(itemIdx === 0)">
                    <!-- Current: "bg-gray-900 text-white", Default: "text-gray-300 hover:bg-gray-700 hover:text-white" -->
                    <router-link :to="item" class="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium">{{ item.name }}</router-link>
                  </template>
                  <router-link :to="item" v-else class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">{{ item.name }}</router-link>
                </template>
              </div>
            </div>
          </div>
          <div class="hidden md:block">
            <div class="ml-4 flex items-center md:ml-6">
              <!-- Profile dropdown -->
              <Menu as="div" class="ml-3 relative">
                <div>
                  <MenuButton class="pl-2 pr-1 py-1 bg-gray-100 text-gray-400 hover:text-gray-600 focus:text-gray-800 rounded-lg flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-600 focus:ring-gray-400">
                    <div class="mr-3">{{user.name}}</div>
                    <span class="sr-only">Open user menu</span>
                    <img :src="user.avatar" class="h-6 v-6 rounded-md"/>
                  </MenuButton>
                </div>
                <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
                  <MenuItems class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <MenuItem v-for="item in profile" :key="item.name" v-slot="{ active }">
                      <router-link :to="item" :class="[active ? 'bg-gray-100' : '', 'block px-4 py-2 text-sm text-gray-700']">{{ item.name }}</router-link>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <!-- Mobile menu button -->
            <DisclosureButton class="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
              <span class="sr-only">Open main menu</span>
              <MenuIcon v-if="!open" class="block h-6 w-6" aria-hidden="true" />
              <XIcon v-else class="block h-6 w-6" aria-hidden="true" />
            </DisclosureButton>
          </div>
        </div>
      </div>
      <DisclosurePanel class="md:hidden">
          <div class="mt-3 px-2 space-y-1">
              <router-link v-for="item in navigation" :to="item"  :key="item.name" class="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">{{ item.name }}</router-link>
              <hr>
              <router-link v-for="item in profile" :to="item"  :key="item.name" class="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700">{{ item.name }}</router-link>
          </div>
      </DisclosurePanel>
    </Disclosure>
</template>

<script>
import { ref } from "vue"
import { mapState } from 'vuex'
import router from "@/routes"

import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { MenuIcon, XIcon } from '@heroicons/vue/outline'

const profile = router.options.routes.filter(r => r.profileLink )
const navigation = router.options.routes.filter(r => r.navigationLink)

export default {
  name: "Navbar",
  computed: mapState('account',['user']),
  components: {
      Disclosure,
      DisclosureButton,
      DisclosurePanel,
      Menu,
      MenuButton,
      MenuItem,
      MenuItems,
      MenuIcon,
      XIcon
  },
  setup() {
      const open = ref(false)

      return {
          open,
          navigation,
          profile
      }
  }
};

</script>
